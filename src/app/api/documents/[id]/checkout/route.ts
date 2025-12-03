import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions, canEditDocuments } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { getFile } from '@/lib/storage';
import { logDocumentCheckedOut, logDocumentCheckedIn } from '@/lib/audit';

// POST /api/documents/[id]/checkout - Check out document
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

    const body = await request.json().catch(() => ({}));
    const { note } = body;

    const document = await prisma.document.findUnique({
      where: { id },
      include: {
        locks: true,
        versions: {
          orderBy: { version: 'desc' },
          take: 1,
        },
        checkouts: {
          where: { checkedInAt: null },
        },
      },
    });

    if (!document) {
      return NextResponse.json(
        { success: false, error: 'Document not found' },
        { status: 404 }
      );
    }

    // Check if already checked out
    const existingCheckout = document.checkouts[0];
    if (existingCheckout) {
      if (existingCheckout.userId === session.user.id) {
        return NextResponse.json(
          { success: false, error: 'You already have this document checked out' },
          { status: 400 }
        );
      } else {
        return NextResponse.json(
          { success: false, error: 'Document is already checked out by another user' },
          { status: 409 }
        );
      }
    }

    // Check if locked by another user
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

    // Get current version
    const currentVersion = document.versions[0]?.version || 1;

    // Create checkout record
    const checkout = await prisma.documentCheckout.create({
      data: {
        documentId: id,
        userId: session.user.id,
        version: currentVersion,
        note,
      },
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    // Auto-lock document
    await prisma.documentLock.upsert({
      where: { documentId: id },
      create: {
        documentId: id,
        userId: session.user.id,
        reason: 'Checked out for editing',
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
      },
      update: {
        userId: session.user.id,
        reason: 'Checked out for editing',
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
    });

    // Log audit
    logDocumentCheckedOut(id, session.user.id, currentVersion);

    // Return file for download
    const fileBuffer = await getFile(document.filePath);

    return new NextResponse(fileBuffer, {
      headers: {
        'Content-Type': document.mimeType,
        'Content-Disposition': `attachment; filename="${document.originalName}"`,
        'Content-Length': fileBuffer.length.toString(),
        'X-Checkout-Id': checkout.id,
        'X-Checkout-Version': currentVersion.toString(),
      },
    });
  } catch (error) {
    console.error('Checkout document error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to check out document' },
      { status: 500 }
    );
  }
}

// PUT /api/documents/[id]/checkout - Check in document
export async function PUT(
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
        checkouts: {
          where: { checkedInAt: null },
          include: {
            user: {
              select: { id: true, name: true, email: true },
            },
          },
        },
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

    const checkout = document.checkouts[0];
    if (!checkout) {
      return NextResponse.json(
        { success: false, error: 'Document is not checked out' },
        { status: 400 }
      );
    }

    if (checkout.userId !== session.user.id && session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, error: 'Document is checked out by another user' },
        { status: 403 }
      );
    }

    // Mark as checked in
    await prisma.documentCheckout.update({
      where: { id: checkout.id },
      data: {
        checkedInAt: new Date(),
      },
    });

    // Release lock
    await prisma.documentLock.deleteMany({
      where: { documentId: id },
    });

    // Get current version
    const currentVersion = document.versions[0]?.version || 1;

    // Log audit
    logDocumentCheckedIn(id, session.user.id, currentVersion);

    return NextResponse.json({
      success: true,
      data: {
        documentId: id,
        checkedIn: true,
        version: currentVersion,
      },
    });
  } catch (error) {
    console.error('Checkin document error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to check in document' },
      { status: 500 }
    );
  }
}

// GET /api/documents/[id]/checkout - Get checkout status
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

    const checkout = await prisma.documentCheckout.findFirst({
      where: {
        documentId: id,
        checkedInAt: null,
      },
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        isCheckedOut: !!checkout,
        checkout: checkout
          ? {
              id: checkout.id,
              user: checkout.user,
              version: checkout.version,
              note: checkout.note,
              checkedOutAt: checkout.checkedOutAt,
            }
          : null,
      },
    });
  } catch (error) {
    console.error('Get checkout status error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to get checkout status' },
      { status: 500 }
    );
  }
}
