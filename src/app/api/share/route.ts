import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions, canShareDocuments } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { createShareLinkSchema, validate } from '@/lib/validation';
import { generateToken, hashPassword } from '@/lib/utils';
import { logDocumentShared } from '@/lib/audit';
import { onDocumentShared } from '@/lib/webhooks';

// GET /api/share - List share links for user's documents
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const shares = await prisma.shareLink.findMany({
      where: {
        createdById: session.user.id,
      },
      include: {
        document: {
          select: { id: true, title: true, slug: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({
      success: true,
      data: shares.map((s) => ({
        id: s.id,
        token: s.token,
        document: s.document,
        expiresAt: s.expiresAt,
        maxDownloads: s.maxDownloads,
        downloads: s.downloads,
        allowPreview: s.allowPreview,
        allowDownload: s.allowDownload,
        hasPassword: !!s.password,
        createdAt: s.createdAt,
        lastAccessedAt: s.lastAccessedAt,
      })),
    });
  } catch (error) {
    console.error('List shares error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to list shares' },
      { status: 500 }
    );
  }
}

// POST /api/share - Create share link
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    if (!canShareDocuments(session.user.role)) {
      return NextResponse.json(
        { success: false, error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    const body = await request.json();

    const validation = validate(createShareLinkSchema, body);
    if (!validation.success) {
      return NextResponse.json(
        { success: false, errors: validation.errors },
        { status: 400 }
      );
    }

    const { documentId, password, expiresAt, maxDownloads, allowPreview, allowDownload } = validation.data!;

    // Check document exists and user has access
    const document = await prisma.document.findUnique({
      where: { id: documentId },
    });

    if (!document) {
      return NextResponse.json(
        { success: false, error: 'Document not found' },
        { status: 404 }
      );
    }

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

    // Generate token
    const token = generateToken(32);

    // Hash password if provided
    let hashedPassword = null;
    if (password) {
      const bcrypt = await import('bcryptjs');
      hashedPassword = await bcrypt.hash(password, 10);
    }

    const share = await prisma.shareLink.create({
      data: {
        documentId,
        token,
        password: hashedPassword,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        maxDownloads: maxDownloads || null,
        allowPreview: allowPreview ?? true,
        allowDownload: allowDownload ?? true,
        createdById: session.user.id,
      },
      include: {
        document: {
          select: { id: true, title: true },
        },
      },
    });

    // Log audit
    logDocumentShared(documentId, session.user.id, {
      shareId: share.id,
      expiresAt: share.expiresAt || undefined,
      maxDownloads: share.maxDownloads || undefined,
    });

    // Dispatch webhook
    onDocumentShared({
      documentId,
      documentTitle: document.title,
      sharedBy: session.user.id,
      shareToken: token,
      expiresAt: share.expiresAt || undefined,
    }).catch(console.error);

    const shareUrl = `${process.env.APP_URL || 'http://localhost:3000'}/share/${token}`;

    return NextResponse.json(
      {
        success: true,
        data: {
          id: share.id,
          token: share.token,
          url: shareUrl,
          document: share.document,
          expiresAt: share.expiresAt,
          maxDownloads: share.maxDownloads,
          allowPreview: share.allowPreview,
          allowDownload: share.allowDownload,
          hasPassword: !!share.password,
          createdAt: share.createdAt,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Create share error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create share link' },
      { status: 500 }
    );
  }
}
