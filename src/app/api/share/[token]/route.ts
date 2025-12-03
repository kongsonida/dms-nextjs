import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getFile } from '@/lib/storage';
import { logDocumentDownloaded } from '@/lib/audit';
import { isExpired } from '@/lib/utils';

// GET /api/share/[token] - Access shared document
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    const { searchParams } = new URL(request.url);
    const download = searchParams.get('download') === 'true';
    const password = searchParams.get('password');

    const share = await prisma.shareLink.findUnique({
      where: { token },
      include: {
        document: {
          include: {
            owner: {
              select: { id: true, name: true },
            },
          },
        },
      },
    });

    if (!share) {
      return NextResponse.json(
        { success: false, error: 'Share link not found' },
        { status: 404 }
      );
    }

    // Check expiration
    if (share.expiresAt && isExpired(share.expiresAt)) {
      return NextResponse.json(
        { success: false, error: 'Share link has expired' },
        { status: 410 }
      );
    }

    // Check max downloads
    if (share.maxDownloads && share.downloads >= share.maxDownloads) {
      return NextResponse.json(
        { success: false, error: 'Download limit reached' },
        { status: 410 }
      );
    }

    // Check password
    if (share.password) {
      if (!password) {
        return NextResponse.json(
          {
            success: false,
            error: 'Password required',
            requiresPassword: true,
          },
          { status: 401 }
        );
      }

      const bcrypt = await import('bcryptjs');
      const isValid = await bcrypt.compare(password, share.password);
      if (!isValid) {
        return NextResponse.json(
          { success: false, error: 'Invalid password' },
          { status: 401 }
        );
      }
    }

    // Check document
    if (!share.document || share.document.isDeleted) {
      return NextResponse.json(
        { success: false, error: 'Document not available' },
        { status: 404 }
      );
    }

    // Update access stats
    await prisma.shareLink.update({
      where: { id: share.id },
      data: {
        lastAccessedAt: new Date(),
      },
    });

    // If download requested
    if (download) {
      if (!share.allowDownload) {
        return NextResponse.json(
          { success: false, error: 'Download not allowed for this share' },
          { status: 403 }
        );
      }

      // Increment download counter
      await prisma.shareLink.update({
        where: { id: share.id },
        data: {
          downloads: { increment: 1 },
        },
      });

      // Log download
      logDocumentDownloaded(share.document.id, undefined, token);

      // Return file
      const fileBuffer = await getFile(share.document.filePath);

      return new NextResponse(new Uint8Array(fileBuffer), {
        headers: {
          'Content-Type': share.document.mimeType,
          'Content-Disposition': `attachment; filename="${share.document.originalName}"`,
          'Content-Length': fileBuffer.length.toString(),
        },
      });
    }

    // Return document info for preview
    return NextResponse.json({
      success: true,
      data: {
        document: {
          id: share.document.id,
          title: share.document.title,
          fileName: share.document.originalName,
          mimeType: share.document.mimeType,
          fileSize: share.document.fileSize.toString(),
          owner: share.document.owner.name || 'Unknown',
        },
        allowPreview: share.allowPreview,
        allowDownload: share.allowDownload,
        expiresAt: share.expiresAt,
        downloadsRemaining: share.maxDownloads
          ? share.maxDownloads - share.downloads
          : null,
      },
    });
  } catch (error) {
    console.error('Access share error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to access share' },
      { status: 500 }
    );
  }
}

// DELETE /api/share/[token] - Revoke share link
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    const { getServerSession } = await import('next-auth');
    const { authOptions } = await import('@/lib/auth');

    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const share = await prisma.shareLink.findUnique({
      where: { token },
    });

    if (!share) {
      return NextResponse.json(
        { success: false, error: 'Share link not found' },
        { status: 404 }
      );
    }

    if (share.createdById !== session.user.id && session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, error: 'Access denied' },
        { status: 403 }
      );
    }

    await prisma.shareLink.delete({
      where: { id: share.id },
    });

    return NextResponse.json({
      success: true,
      data: { id: share.id },
    });
  } catch (error) {
    console.error('Revoke share error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to revoke share' },
      { status: 500 }
    );
  }
}
