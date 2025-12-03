import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions, canViewDocuments, canEditDocuments } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { saveVersion } from '@/lib/storage';
import { hashFile } from '@/lib/utils';
import { addOcrJob, addVirusScanJob, addIndexJob } from '@/lib/queue';

// GET /api/documents/[id]/versions - List document versions
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    const { id } = await params;

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

    const document = await prisma.document.findUnique({
      where: { id },
      select: { id: true, ownerId: true },
    });

    if (!document) {
      return NextResponse.json(
        { success: false, error: 'Document not found' },
        { status: 404 }
      );
    }

    // Check access
    if (
      session.user.role !== 'ADMIN' &&
      session.user.role !== 'MANAGER' &&
      document.ownerId !== session.user.id
    ) {
      return NextResponse.json(
        { success: false, error: 'Access denied' },
        { status: 403 }
      );
    }

    const versions = await prisma.documentVersion.findMany({
      where: { documentId: id },
      include: {
        createdBy: {
          select: { id: true, name: true, email: true, image: true },
        },
      },
      orderBy: { version: 'desc' },
    });

    return NextResponse.json({
      success: true,
      data: versions.map((v) => ({
        id: v.id,
        version: v.version,
        fileName: v.fileName,
        fileSize: v.fileSize.toString(),
        fileHash: v.fileHash,
        changeNote: v.changeNote,
        createdBy: v.createdBy,
        createdAt: v.createdAt,
      })),
    });
  } catch (error) {
    console.error('List versions error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to list versions' },
      { status: 500 }
    );
  }
}

// POST /api/documents/[id]/versions - Upload new version
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    const { id } = await params;

    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    if (!canEditDocuments(session.user.role)) {
      return NextResponse.json(
        { success: false, error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    const document = await prisma.document.findUnique({
      where: { id },
      include: {
        locks: true,
        versions: {
          orderBy: { version: 'desc' },
          take: 1,
        },
      },
    });

    if (!document) {
      return NextResponse.json(
        { success: false, error: 'Document not found' },
        { status: 404 }
      );
    }

    // Check access
    if (
      session.user.role !== 'ADMIN' &&
      session.user.role !== 'MANAGER' &&
      document.ownerId !== session.user.id
    ) {
      return NextResponse.json(
        { success: false, error: 'Access denied' },
        { status: 403 }
      );
    }

    // Check lock
    const currentLock = document.locks[0];
    if (
      currentLock &&
      new Date(currentLock.expiresAt) > new Date() &&
      currentLock.userId !== session.user.id
    ) {
      return NextResponse.json(
        { success: false, error: 'Document is locked by another user' },
        { status: 409 }
      );
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const changeNote = formData.get('changeNote') as string;

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'No file provided' },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const fileHash = hashFile(buffer);

    // Get next version number
    const currentVersion = document.versions[0]?.version || 0;
    const newVersion = currentVersion + 1;

    // Save version file
    const filePath = await saveVersion(buffer, id, newVersion, file.name);

    // Create version record
    const version = await prisma.documentVersion.create({
      data: {
        documentId: id,
        version: newVersion,
        fileName: file.name,
        filePath,
        fileSize: BigInt(buffer.length),
        fileHash,
        changeNote: changeNote || `Version ${newVersion}`,
        createdById: session.user.id,
      },
      include: {
        createdBy: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    // Update document's main file to point to new version
    await prisma.document.update({
      where: { id },
      data: {
        fileName: file.name,
        filePath,
        fileSize: BigInt(buffer.length),
        fileHash,
        mimeType: file.type,
        ocrStatus: 'PENDING',
        virusScanStatus: 'PENDING',
      },
    });

    // Queue background jobs for new version
    addVirusScanJob({
      documentId: id,
      filePath,
    }).catch(console.error);

    addOcrJob({
      documentId: id,
      filePath,
      mimeType: file.type,
    }).catch(console.error);

    addIndexJob({
      documentId: id,
      action: 'update',
    }).catch(console.error);

    return NextResponse.json(
      {
        success: true,
        data: {
          id: version.id,
          version: version.version,
          fileName: version.fileName,
          fileSize: version.fileSize.toString(),
          changeNote: version.changeNote,
          createdBy: version.createdBy,
          createdAt: version.createdAt,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Create version error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create version' },
      { status: 500 }
    );
  }
}
