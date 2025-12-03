import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions, canEditDocuments } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { logDocumentLocked, logDocumentUnlocked } from '@/lib/audit';

// POST /api/documents/[id]/lock - Lock document
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

    const body = await request.json();
    const { reason, duration = 3600 } = body; // Default 1 hour lock

    const document = await prisma.document.findUnique({
      where: { id },
      include: {
        locks: true,
      },
    });

    if (!document) {
      return NextResponse.json(
        { success: false, error: 'Document not found' },
        { status: 404 }
      );
    }

    // Check if already locked
    const existingLock = document.locks[0];
    if (existingLock && new Date(existingLock.expiresAt) > new Date()) {
      if (existingLock.userId === session.user.id) {
        // Extend lock
        const newExpiry = new Date(Date.now() + duration * 1000);
        await prisma.documentLock.update({
          where: { id: existingLock.id },
          data: {
            expiresAt: newExpiry,
            reason: reason || existingLock.reason,
          },
        });

        return NextResponse.json({
          success: true,
          data: {
            documentId: id,
            locked: true,
            expiresAt: newExpiry,
            message: 'Lock extended',
          },
        });
      } else {
        return NextResponse.json(
          { success: false, error: 'Document is already locked by another user' },
          { status: 409 }
        );
      }
    }

    // Remove expired lock if exists
    if (existingLock) {
      await prisma.documentLock.delete({
        where: { id: existingLock.id },
      });
    }

    // Create new lock
    const expiresAt = new Date(Date.now() + duration * 1000);
    const lock = await prisma.documentLock.create({
      data: {
        documentId: id,
        userId: session.user.id,
        reason,
        expiresAt,
      },
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    // Log audit
    logDocumentLocked(id, session.user.id, reason);

    return NextResponse.json({
      success: true,
      data: {
        documentId: id,
        locked: true,
        lockedBy: lock.user,
        reason: lock.reason,
        lockedAt: lock.lockedAt,
        expiresAt: lock.expiresAt,
      },
    });
  } catch (error) {
    console.error('Lock document error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to lock document' },
      { status: 500 }
    );
  }
}

// DELETE /api/documents/[id]/lock - Unlock document
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

    const document = await prisma.document.findUnique({
      where: { id },
      include: {
        locks: true,
      },
    });

    if (!document) {
      return NextResponse.json(
        { success: false, error: 'Document not found' },
        { status: 404 }
      );
    }

    const existingLock = document.locks[0];
    if (!existingLock || new Date(existingLock.expiresAt) < new Date()) {
      return NextResponse.json({
        success: true,
        data: {
          documentId: id,
          locked: false,
          message: 'Document was not locked',
        },
      });
    }

    // Only lock owner or admin can unlock
    if (
      existingLock.userId !== session.user.id &&
      session.user.role !== 'ADMIN'
    ) {
      return NextResponse.json(
        { success: false, error: 'Only lock owner or admin can unlock' },
        { status: 403 }
      );
    }

    await prisma.documentLock.delete({
      where: { id: existingLock.id },
    });

    // Log audit
    logDocumentUnlocked(id, session.user.id);

    return NextResponse.json({
      success: true,
      data: {
        documentId: id,
        locked: false,
      },
    });
  } catch (error) {
    console.error('Unlock document error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to unlock document' },
      { status: 500 }
    );
  }
}
