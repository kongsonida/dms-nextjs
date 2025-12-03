import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions, canViewDocuments } from '@/lib/auth';
import { searchDocuments, getSearchClient } from '@/lib/search';
import prisma from '@/lib/prisma';

// GET /api/search - Full-text search
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
    const query = searchParams.get('q') || '';
    const documentType = searchParams.get('type');
    const status = searchParams.get('status');
    const folderId = searchParams.get('folderId');
    const tags = searchParams.getAll('tags');
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');
    const sort = searchParams.get('sort') || 'relevance';
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = Math.min(parseInt(searchParams.get('limit') || '20', 10), 100);

    // Build filters
    const filters: string[] = [];

    if (documentType) {
      filters.push(`documentType = "${documentType}"`);
    }

    if (status) {
      filters.push(`status = "${status}"`);
    }

    if (folderId) {
      filters.push(`folderId = "${folderId}"`);
    }

    if (tags.length > 0) {
      const tagFilters = tags.map((t) => `tags = "${t}"`).join(' OR ');
      filters.push(`(${tagFilters})`);
    }

    if (dateFrom) {
      filters.push(`createdAt >= ${new Date(dateFrom).getTime()}`);
    }

    if (dateTo) {
      filters.push(`createdAt <= ${new Date(dateTo).getTime()}`);
    }

    // Non-admins can only search their own documents
    if (session.user.role !== 'ADMIN' && session.user.role !== 'MANAGER') {
      filters.push(`ownerId = "${session.user.id}"`);
    }

    try {
      // Try Meilisearch first
      const sortOptions: string[] = [];
      if (sort === 'title') sortOptions.push('title:asc');
      else if (sort === 'createdAt') sortOptions.push('createdAt:desc');
      else if (sort === 'updatedAt') sortOptions.push('updatedAt:desc');

      const results = await searchDocuments(query, {
        filters: filters.length > 0 ? filters.join(' AND ') : undefined,
        sort: sortOptions,
        limit,
        offset: (page - 1) * limit,
        facets: ['documentType', 'status', 'tags'],
      });

      return NextResponse.json({
        success: true,
        data: results.hits,
        total: results.totalHits,
        page,
        pageSize: limit,
        totalPages: Math.ceil(results.totalHits / limit),
        facets: results.facetDistribution,
      });
    } catch {
      // Fallback to database search
      console.log('Meilisearch not available, falling back to database search');

      const where: Record<string, unknown> = {
        isDeleted: false,
      };

      if (query) {
        where.OR = [
          { title: { contains: query } },
          { description: { contains: query } },
          { documentNumber: { contains: query } },
          { ocrText: { contains: query } },
        ];
      }

      if (documentType) where.documentType = documentType;
      if (status) where.status = status;
      if (folderId) where.folderId = folderId;

      if (session.user.role !== 'ADMIN' && session.user.role !== 'MANAGER') {
        where.ownerId = session.user.id;
      }

      const [documents, total] = await Promise.all([
        prisma.document.findMany({
          where,
          include: {
            owner: {
              select: { id: true, name: true, email: true },
            },
            tags: {
              include: {
                tag: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
          skip: (page - 1) * limit,
          take: limit,
        }),
        prisma.document.count({ where }),
      ]);

      return NextResponse.json({
        success: true,
        data: documents.map((d) => ({
          id: d.id,
          title: d.title,
          description: d.description,
          fileName: d.fileName,
          documentType: d.documentType,
          status: d.status,
          ownerName: d.owner.name || d.owner.email,
          tags: d.tags.map((t) => t.tag.name),
          createdAt: d.createdAt.getTime(),
        })),
        total,
        page,
        pageSize: limit,
        totalPages: Math.ceil(total / limit),
        fallback: true,
      });
    }
  } catch (error) {
    console.error('Search error:', error);
    return NextResponse.json(
      { success: false, error: 'Search failed' },
      { status: 500 }
    );
  }
}
