import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions, canViewDocuments, canManageDocuments } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { saveFile } from '@/lib/storage';
import { createDocumentSchema, validate } from '@/lib/validation';
import { logDocumentCreated, logDocumentUploaded } from '@/lib/audit';
import { addOcrJob, addVirusScanJob, addThumbnailJob, addIndexJob } from '@/lib/queue';
import { onDocumentCreated } from '@/lib/webhooks';
import { generateUniqueSlug, hashFile } from '@/lib/utils';

// GET /api/documents - List documents with pagination and filters
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    if (!canViewDocuments(session.user.role)) {
      return NextResponse.json(
        { success: false, error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = Math.min(parseInt(searchParams.get('limit') || '20', 10), 100);
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status');
    const documentType = searchParams.get('type');
    const folderId = searchParams.get('folderId');
    const sortBy = searchParams.get('sortBy') || 'createdAt';
    const sortOrder = searchParams.get('sortOrder') || 'desc';
    const includeDeleted = searchParams.get('includeDeleted') === 'true';

    // Build where clause
    const where: Record<string, unknown> = {
      isDeleted: includeDeleted ? undefined : false,
    };

    // Non-admins can only see their own documents or shared documents
    if (session.user.role !== 'ADMIN' && session.user.role !== 'MANAGER') {
      where.ownerId = session.user.id;
    }

    if (search) {
      where.OR = [
        { title: { contains: search } },
        { description: { contains: search } },
        { documentNumber: { contains: search } },
      ];
    }

    if (status) {
      where.status = status;
    }

    if (documentType) {
      where.documentType = documentType;
    }

    if (folderId) {
      where.folderId = folderId === 'null' ? null : folderId;
    }

    const [documents, total] = await Promise.all([
      prisma.document.findMany({
        where,
        include: {
          owner: {
            select: { id: true, name: true, email: true, image: true },
          },
          folder: {
            select: { id: true, name: true, slug: true },
          },
          tags: {
            include: {
              tag: {
                select: { id: true, name: true, slug: true, color: true },
              },
            },
          },
          _count: {
            select: { versions: true, comments: true },
          },
        },
        orderBy: { [sortBy]: sortOrder },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.document.count({ where }),
    ]);

    // Transform response
    const transformedDocuments = documents.map((doc) => ({
      id: doc.id,
      title: doc.title,
      slug: doc.slug,
      description: doc.description,
      fileName: doc.fileName,
      mimeType: doc.mimeType,
      fileSize: doc.fileSize.toString(),
      documentNumber: doc.documentNumber,
      documentType: doc.documentType,
      direction: doc.direction,
      confidentiality: doc.confidentiality,
      status: doc.status,
      thumbnailPath: doc.thumbnailPath,
      ocrStatus: doc.ocrStatus,
      virusScanStatus: doc.virusScanStatus,
      owner: doc.owner,
      folder: doc.folder,
      tags: doc.tags.map((t) => t.tag),
      versionsCount: doc._count.versions,
      commentsCount: doc._count.comments,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    }));

    return NextResponse.json({
      success: true,
      data: transformedDocuments,
      total,
      page,
      pageSize: limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error('List documents error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to list documents' },
      { status: 500 }
    );
  }
}

// POST /api/documents - Upload new document
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    if (!canManageDocuments(session.user.role)) {
      return NextResponse.json(
        { success: false, error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'No file provided' },
        { status: 400 }
      );
    }

    // Parse metadata from form data
    const metadataString = formData.get('metadata') as string;
    let metadata: Record<string, string> = {};
    try {
      metadata = metadataString ? JSON.parse(metadataString) : {};
    } catch {
      // Ignore parse errors
    }

    // Validate document data
    const documentData = {
      title: (formData.get('title') as string) || file.name,
      description: formData.get('description') as string,
      documentNumber: formData.get('documentNumber') as string,
      documentType: formData.get('documentType') as string,
      direction: formData.get('direction') as string,
      confidentiality: formData.get('confidentiality') as string,
      folderId: formData.get('folderId') as string,
      tags: formData.getAll('tags') as string[],
      metadata,
    };

    const validation = validate(createDocumentSchema, documentData);
    if (!validation.success) {
      return NextResponse.json(
        { success: false, errors: validation.errors },
        { status: 400 }
      );
    }

    // Check storage quota
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { storageQuota: true, storageUsed: true },
    });

    if (user && user.storageUsed + BigInt(file.size) > user.storageQuota) {
      return NextResponse.json(
        { success: false, error: 'Storage quota exceeded' },
        { status: 400 }
      );
    }

    // Save file
    const buffer = Buffer.from(await file.arrayBuffer());
    const storedFile = await saveFile(buffer, file.name, file.type, {
      userId: session.user.id,
    });

    // Create document
    const slug = generateUniqueSlug(documentData.title);

    const document = await prisma.document.create({
      data: {
        title: documentData.title,
        slug,
        description: documentData.description,
        fileName: storedFile.fileName,
        originalName: storedFile.originalName,
        mimeType: storedFile.mimeType,
        fileSize: BigInt(storedFile.fileSize),
        filePath: storedFile.filePath,
        fileHash: storedFile.fileHash,
        documentNumber: documentData.documentNumber,
        documentType: (documentData.documentType as any) || 'GENERAL',
        direction: (documentData.direction as any) || 'INTERNAL',
        confidentiality: (documentData.confidentiality as any) || 'INTERNAL',
        ownerId: session.user.id,
        folderId: documentData.folderId || null,
      },
      include: {
        owner: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    // Create tags
    if (documentData.tags && documentData.tags.length > 0) {
      for (const tagId of documentData.tags) {
        await prisma.documentTag.create({
          data: {
            documentId: document.id,
            tagId,
          },
        }).catch(() => {
          // Ignore if tag doesn't exist
        });
      }
    }

    // Create metadata entries
    if (documentData.metadata && Object.keys(documentData.metadata).length > 0) {
      for (const [key, value] of Object.entries(documentData.metadata)) {
        await prisma.documentMetadata.create({
          data: {
            documentId: document.id,
            key,
            value,
          },
        });
      }
    }

    // Update user storage usage
    await prisma.user.update({
      where: { id: session.user.id },
      data: {
        storageUsed: {
          increment: BigInt(storedFile.fileSize),
        },
      },
    });

    // Create initial version
    await prisma.documentVersion.create({
      data: {
        documentId: document.id,
        version: 1,
        fileName: storedFile.fileName,
        filePath: storedFile.filePath,
        fileSize: BigInt(storedFile.fileSize),
        fileHash: storedFile.fileHash,
        changeNote: 'Initial upload',
        createdById: session.user.id,
      },
    });

    // Log audit
    logDocumentCreated(document.id, session.user.id, { title: document.title });
    logDocumentUploaded(document.id, session.user.id, {
      fileName: storedFile.fileName,
      fileSize: storedFile.fileSize,
      mimeType: storedFile.mimeType,
    });

    // Queue background jobs (non-blocking - upload succeeds even if Redis is unavailable)
    Promise.allSettled([
      addVirusScanJob({
        documentId: document.id,
        filePath: storedFile.filePath,
      }),
      addOcrJob({
        documentId: document.id,
        filePath: storedFile.filePath,
        mimeType: storedFile.mimeType,
      }),
      addThumbnailJob({
        documentId: document.id,
        filePath: storedFile.filePath,
        mimeType: storedFile.mimeType,
      }),
      addIndexJob({
        documentId: document.id,
        action: 'add',
      }),
    ]).then((results) => {
      results.forEach((result, index) => {
        if (result.status === 'rejected') {
          const jobNames = ['virus scan', 'OCR', 'thumbnail', 'index'];
          console.warn(`${jobNames[index]} job not queued:`, result.reason?.message || result.reason);
        }
      });
    });

    // Dispatch webhook (non-blocking)
    onDocumentCreated({
      id: document.id,
      title: document.title,
      fileName: document.fileName,
      ownerId: document.ownerId,
      ownerName: document.owner.name || undefined,
    }).catch((e) => console.warn('Webhook not dispatched:', e?.message || e));

    return NextResponse.json(
      {
        success: true,
        data: {
          id: document.id,
          title: document.title,
          slug: document.slug,
          fileName: document.fileName,
          mimeType: document.mimeType,
          fileSize: document.fileSize.toString(),
          status: document.status,
          createdAt: document.createdAt,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Upload document error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to upload document';
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}
