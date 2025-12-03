import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions, canViewDocuments } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { getFile } from '@/lib/storage';
import { logDocumentDownloaded } from '@/lib/audit';

// GET /api/documents/[id]/download - Download document
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

    const { searchParams } = new URL(request.url);
    const version = searchParams.get('version');

    const document = await prisma.document.findUnique({
      where: { id },
      include: {
        versions: version
          ? {
              where: { version: parseInt(version, 10) },
            }
          : false,
      },
    });

    if (!document) {
      return NextResponse.json(
        { success: false, error: 'Document not found' },
        { status: 404 }
      );
    }

    if (document.isDeleted) {
      return NextResponse.json(
        { success: false, error: 'Document has been deleted' },
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

    // Get file path
    let filePath = document.filePath;
    let fileName = document.originalName;

    if (version && document.versions && document.versions.length > 0) {
      const versionDoc = document.versions[0];
      filePath = versionDoc.filePath;
      fileName = versionDoc.fileName;
    }

    // Read file
    const fileBuffer = await getFile(filePath);

    // Log download
    logDocumentDownloaded(document.id, session.user.id);

    // Return file
    return new NextResponse(new Uint8Array(fileBuffer), {
      headers: {
        'Content-Type': document.mimeType,
        'Content-Disposition': `attachment; filename="${fileName}"`,
        'Content-Length': fileBuffer.length.toString(),
      },
    });
  } catch (error) {
    console.error('Download document error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to download document' },
      { status: 500 }
    );
  }
}
