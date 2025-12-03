import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions, canViewDocuments, canEditDocuments, canDeleteDocuments } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { updateDocumentSchema, validate } from '@/lib/validation';
import { logDocumentRead, logDocumentUpdated, logDocumentDeleted } from '@/lib/audit';
import { addIndexJob } from '@/lib/queue';
import { onDocumentUpdated, onDocumentDeleted } from '@/lib/webhooks';
import { deleteFile } from '@/lib/storage';

// GET /api/documents/[id] - Get document details
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
      include: {
        owner: {
          select: { id: true, name: true, email: true, image: true },
        },
        folder: {
          select: { id: true, name: true, slug: true, parentId: true },
        },
        tags: {
          include: {
            tag: {
              select: { id: true, name: true, slug: true, color: true },
            },
          },
        },
        metadata: {
          select: { key: true, value: true },
        },
        versions: {
          include: {
            createdBy: {
              select: { id: true, name: true, email: true },
            },
          },
          orderBy: { version: 'desc' },
          take: 10,
        },
        locks: {
          include: {
            user: {
              select: { id: true, name: true, email: true },
            },
          },
        },
        _count: {
          select: { versions: true, comments: true, shares: true },
        },
      },
    });

    if (!document) {
      return NextResponse.json(
        { success: false, error: 'Document not found' },
        { status: 404 }
      );
    }

    // Check access permissions
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

    // Log document read
    logDocumentRead(document.id, session.user.id);

    // Get current lock status
    const currentLock = document.locks[0];
    const isLocked = currentLock && new Date(currentLock.expiresAt) > new Date();

    // Get current version number
    const currentVersion = document.versions.length > 0 ? document.versions[0].version : 1;

    return NextResponse.json({
      success: true,
      data: {
        id: document.id,
        title: document.title,
        slug: document.slug,
        description: document.description,
        fileName: document.fileName,
        originalName: document.originalName,
        mimeType: document.mimeType,
        fileSize: document.fileSize.toString(),
        documentNumber: document.documentNumber,
        documentType: document.documentType,
        direction: document.direction,
        confidentiality: document.confidentiality,
        status: document.status,
        thumbnailPath: document.thumbnailPath,
        ocrStatus: document.ocrStatus,
        virusScanStatus: document.virusScanStatus,
        virusScanResult: document.virusScanResult,
        isDeleted: document.isDeleted,
        deletedAt: document.deletedAt,
        retentionPolicy: document.retentionPolicy,
        retentionDate: document.retentionDate,
        owner: document.owner,
        folder: document.folder,
        tags: document.tags.map((t) => t.tag),
        metadata: document.metadata.reduce(
          (acc, m) => ({ ...acc, [m.key]: m.value }),
          {}
        ),
        versions: document.versions.map((v) => ({
          id: v.id,
          version: v.version,
          fileName: v.fileName,
          fileSize: v.fileSize.toString(),
          changeNote: v.changeNote,
          createdBy: v.createdBy,
          createdAt: v.createdAt,
        })),
        currentVersion,
        isLocked,
        lockedBy: isLocked ? currentLock.user : null,
        lockReason: isLocked ? currentLock.reason : null,
        lockExpiresAt: isLocked ? currentLock.expiresAt : null,
        versionsCount: document._count.versions,
        commentsCount: document._count.comments,
        sharesCount: document._count.shares,
        createdAt: document.createdAt,
        updatedAt: document.updatedAt,
      },
    });
  } catch (error) {
    console.error('Get document error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to get document' },
      { status: 500 }
    );
  }
}

// PATCH /api/documents/[id] - Update document
export async function PATCH(
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

    const body = await request.json();

    // Validate input
    const validation = validate(updateDocumentSchema, body);
    if (!validation.success) {
      return NextResponse.json(
        { success: false, errors: validation.errors },
        { status: 400 }
      );
    }

    // Check document exists and user has access
    const existingDocument = await prisma.document.findUnique({
      where: { id },
      include: {
        locks: true,
      },
    });

    if (!existingDocument) {
      return NextResponse.json(
        { success: false, error: 'Document not found' },
        { status: 404 }
      );
    }

    // Check ownership or admin status
    if (
      session.user.role !== 'ADMIN' &&
      session.user.role !== 'MANAGER' &&
      existingDocument.ownerId !== session.user.id
    ) {
      return NextResponse.json(
        { success: false, error: 'Access denied' },
        { status: 403 }
      );
    }

    // Check if document is locked by another user
    const currentLock = existingDocument.locks[0];
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

    const { tags, metadata, ...updateData } = validation.data!;

    // Update document
    const document = await prisma.document.update({
      where: { id },
      data: updateData,
      include: {
        owner: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    // Update tags if provided
    if (tags !== undefined) {
      // Remove existing tags
      await prisma.documentTag.deleteMany({
        where: { documentId: id },
      });

      // Add new tags
      for (const tagId of tags) {
        await prisma.documentTag.create({
          data: {
            documentId: id,
            tagId,
          },
        }).catch(() => {
          // Ignore if tag doesn't exist
        });
      }
    }

    // Update metadata if provided
    if (metadata !== undefined) {
      // Remove existing metadata
      await prisma.documentMetadata.deleteMany({
        where: { documentId: id },
      });

      // Add new metadata
      for (const [key, value] of Object.entries(metadata)) {
        await prisma.documentMetadata.create({
          data: {
            documentId: id,
            key,
            value,
          },
        });
      }
    }

    // Log audit
    logDocumentUpdated(document.id, session.user.id, updateData);

    // Re-index document
    addIndexJob({
      documentId: document.id,
      action: 'update',
    }).catch(console.error);

    // Dispatch webhook
    onDocumentUpdated({
      id: document.id,
      title: document.title,
      changes: updateData,
      updatedBy: session.user.id,
    }).catch(console.error);

    return NextResponse.json({
      success: true,
      data: {
        id: document.id,
        title: document.title,
        status: document.status,
        updatedAt: document.updatedAt,
      },
    });
  } catch (error) {
    console.error('Update document error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update document' },
      { status: 500 }
    );
  }
}

// DELETE /api/documents/[id] - Delete document (soft delete by default)
export async function DELETE(
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

    if (!canDeleteDocuments(session.user.role)) {
      return NextResponse.json(
        { success: false, error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const permanent = searchParams.get('permanent') === 'true';

    // Check document exists
    const document = await prisma.document.findUnique({
      where: { id },
      include: {
        versions: true,
      },
    });

    if (!document) {
      return NextResponse.json(
        { success: false, error: 'Document not found' },
        { status: 404 }
      );
    }

    // Check ownership or admin status
    if (
      session.user.role !== 'ADMIN' &&
      document.ownerId !== session.user.id
    ) {
      return NextResponse.json(
        { success: false, error: 'Access denied' },
        { status: 403 }
      );
    }

    if (permanent) {
      // Permanent deletion - requires admin
      if (session.user.role !== 'ADMIN') {
        return NextResponse.json(
          { success: false, error: 'Only admins can permanently delete documents' },
          { status: 403 }
        );
      }

      // Delete files from storage
      await deleteFile(document.filePath);
      for (const version of document.versions) {
        await deleteFile(version.filePath);
      }
      if (document.thumbnailPath) {
        await deleteFile(document.thumbnailPath);
      }

      // Update user storage
      await prisma.user.update({
        where: { id: document.ownerId },
        data: {
          storageUsed: {
            decrement: document.fileSize,
          },
        },
      });

      // Delete document and related records
      await prisma.document.delete({
        where: { id },
      });

      // Remove from search index
      addIndexJob({
        documentId: id,
        action: 'remove',
      }).catch(console.error);
    } else {
      // Soft delete
      await prisma.document.update({
        where: { id },
        data: {
          isDeleted: true,
          deletedAt: new Date(),
        },
      });

      // Remove from search index
      addIndexJob({
        documentId: id,
        action: 'remove',
      }).catch(console.error);
    }

    // Log audit
    logDocumentDeleted(document.id, session.user.id, permanent);

    // Dispatch webhook
    onDocumentDeleted({
      id: document.id,
      title: document.title,
      deletedBy: session.user.id,
      permanent,
    }).catch(console.error);

    return NextResponse.json({
      success: true,
      data: {
        id: document.id,
        permanent,
      },
    });
  } catch (error) {
    console.error('Delete document error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete document' },
      { status: 500 }
    );
  }
}
