import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { createTagSchema, validate } from '@/lib/validation';
import { generateSlug } from '@/lib/utils';

// GET /api/tags - List all tags
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const tags = await prisma.tag.findMany({
      include: {
        _count: {
          select: { documents: true },
        },
      },
      orderBy: { name: 'asc' },
    });

    return NextResponse.json({
      success: true,
      data: tags.map((t) => ({
        id: t.id,
        name: t.name,
        slug: t.slug,
        color: t.color,
        documentsCount: t._count.documents,
        createdAt: t.createdAt,
      })),
    });
  } catch (error) {
    console.error('List tags error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to list tags' },
      { status: 500 }
    );
  }
}

// POST /api/tags - Create new tag
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();

    const validation = validate(createTagSchema, body);
    if (!validation.success) {
      return NextResponse.json(
        { success: false, errors: validation.errors },
        { status: 400 }
      );
    }

    const { name, color } = validation.data!;
    const slug = generateSlug(name);

    // Check if tag already exists
    const existing = await prisma.tag.findFirst({
      where: {
        OR: [{ name }, { slug }],
      },
    });

    if (existing) {
      return NextResponse.json(
        { success: false, error: 'Tag already exists' },
        { status: 400 }
      );
    }

    const tag = await prisma.tag.create({
      data: {
        name,
        slug,
        color: color || '#6366f1',
        createdById: session.user.id,
      },
    });

    return NextResponse.json(
      {
        success: true,
        data: {
          id: tag.id,
          name: tag.name,
          slug: tag.slug,
          color: tag.color,
          createdAt: tag.createdAt,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Create tag error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create tag' },
      { status: 500 }
    );
  }
}
