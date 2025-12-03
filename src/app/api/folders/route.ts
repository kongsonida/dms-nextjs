import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions, canManageDocuments } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { createFolderSchema, validate } from '@/lib/validation';
import { generateUniqueSlug } from '@/lib/utils';

// GET /api/folders - List folders
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const parentId = searchParams.get('parentId');
    const flat = searchParams.get('flat') === 'true';

    if (flat) {
      // Return flat list of all folders
      const folders = await prisma.folder.findMany({
        include: {
          _count: {
            select: { documents: true, children: true },
          },
        },
        orderBy: { name: 'asc' },
      });

      return NextResponse.json({
        success: true,
        data: folders.map((f) => ({
          id: f.id,
          name: f.name,
          slug: f.slug,
          description: f.description,
          parentId: f.parentId,
          documentsCount: f._count.documents,
          childrenCount: f._count.children,
          createdAt: f.createdAt,
        })),
      });
    }

    // Return hierarchical folders
    const folders = await prisma.folder.findMany({
      where: {
        parentId: parentId === 'null' ? null : parentId || null,
      },
      include: {
        children: {
          select: { id: true, name: true, slug: true },
        },
        _count: {
          select: { documents: true, children: true },
        },
      },
      orderBy: { name: 'asc' },
    });

    return NextResponse.json({
      success: true,
      data: folders.map((f) => ({
        id: f.id,
        name: f.name,
        slug: f.slug,
        description: f.description,
        parentId: f.parentId,
        children: f.children,
        documentsCount: f._count.documents,
        childrenCount: f._count.children,
        createdAt: f.createdAt,
      })),
    });
  } catch (error) {
    console.error('List folders error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to list folders' },
      { status: 500 }
    );
  }
}

// POST /api/folders - Create folder
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

    const body = await request.json();

    const validation = validate(createFolderSchema, body);
    if (!validation.success) {
      return NextResponse.json(
        { success: false, errors: validation.errors },
        { status: 400 }
      );
    }

    const { name, description, parentId } = validation.data!;
    const slug = generateUniqueSlug(name);

    // Verify parent exists if provided
    if (parentId) {
      const parent = await prisma.folder.findUnique({
        where: { id: parentId },
      });

      if (!parent) {
        return NextResponse.json(
          { success: false, error: 'Parent folder not found' },
          { status: 404 }
        );
      }
    }

    const folder = await prisma.folder.create({
      data: {
        name,
        slug,
        description,
        parentId: parentId || null,
      },
    });

    return NextResponse.json(
      {
        success: true,
        data: {
          id: folder.id,
          name: folder.name,
          slug: folder.slug,
          description: folder.description,
          parentId: folder.parentId,
          createdAt: folder.createdAt,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Create folder error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create folder' },
      { status: 500 }
    );
  }
}
