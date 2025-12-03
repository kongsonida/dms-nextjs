import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions, canManageWorkflows, canViewDocuments } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { createWorkflowSchema, validate } from '@/lib/validation';
import { notifyWorkflowAssigned } from '@/lib/notifications';
import { onWorkflowCreated } from '@/lib/webhooks';

// GET /api/workflows - List workflows
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
    const status = searchParams.get('status');
    const assignedToMe = searchParams.get('assignedToMe') === 'true';
    const createdByMe = searchParams.get('createdByMe') === 'true';
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = Math.min(parseInt(searchParams.get('limit') || '20', 10), 100);

    const where: Record<string, unknown> = {};

    if (status) {
      where.status = status;
    }

    if (createdByMe) {
      where.createdById = session.user.id;
    }

    if (assignedToMe) {
      where.steps = {
        some: {
          assignedToId: session.user.id,
          status: { in: ['PENDING', 'IN_PROGRESS'] },
        },
      };
    }

    // Non-admins can only see workflows they created or are assigned to
    if (session.user.role !== 'ADMIN' && session.user.role !== 'MANAGER') {
      where.OR = [
        { createdById: session.user.id },
        {
          steps: {
            some: {
              assignedToId: session.user.id,
            },
          },
        },
      ];
    }

    const [workflows, total] = await Promise.all([
      prisma.workflow.findMany({
        where,
        include: {
          document: {
            select: { id: true, title: true, slug: true },
          },
          createdBy: {
            select: { id: true, name: true, email: true },
          },
          steps: {
            include: {
              assignedTo: {
                select: { id: true, name: true, email: true },
              },
            },
            orderBy: { order: 'asc' },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.workflow.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      data: workflows.map((w) => ({
        id: w.id,
        name: w.name,
        description: w.description,
        status: w.status,
        priority: w.priority,
        dueDate: w.dueDate,
        document: w.document,
        createdBy: w.createdBy,
        steps: w.steps.map((s) => ({
          id: s.id,
          order: s.order,
          name: s.name,
          description: s.description,
          assignedTo: s.assignedTo,
          status: s.status,
          action: s.action,
          dueDate: s.dueDate,
          completedAt: s.completedAt,
        })),
        currentStep: w.steps.find((s) => s.status === 'PENDING' || s.status === 'IN_PROGRESS')?.order || null,
        createdAt: w.createdAt,
        completedAt: w.completedAt,
      })),
      total,
      page,
      pageSize: limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error('List workflows error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to list workflows' },
      { status: 500 }
    );
  }
}

// POST /api/workflows - Create workflow
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    if (!canManageWorkflows(session.user.role)) {
      return NextResponse.json(
        { success: false, error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    const body = await request.json();

    const validation = validate(createWorkflowSchema, body);
    if (!validation.success) {
      return NextResponse.json(
        { success: false, errors: validation.errors },
        { status: 400 }
      );
    }

    const { name, description, documentId, priority, dueDate, steps } = validation.data!;

    // Check document exists
    const document = await prisma.document.findUnique({
      where: { id: documentId },
    });

    if (!document) {
      return NextResponse.json(
        { success: false, error: 'Document not found' },
        { status: 404 }
      );
    }

    // Create workflow with steps
    const workflow = await prisma.workflow.create({
      data: {
        name,
        description,
        documentId,
        priority: (priority as any) || 'MEDIUM',
        dueDate: dueDate ? new Date(dueDate) : null,
        createdById: session.user.id,
        steps: {
          create: steps.map((step, index) => ({
            order: index + 1,
            name: step.name,
            description: step.description,
            assignedToId: step.assignedToId,
            action: step.action,
            dueDate: step.dueDate ? new Date(step.dueDate) : null,
          })),
        },
      },
      include: {
        document: {
          select: { id: true, title: true },
        },
        createdBy: {
          select: { id: true, name: true, email: true },
        },
        steps: {
          include: {
            assignedTo: {
              select: { id: true, name: true, email: true },
            },
          },
          orderBy: { order: 'asc' },
        },
      },
    });

    // Notify first step assignee
    const firstStep = workflow.steps[0];
    if (firstStep) {
      notifyWorkflowAssigned(
        firstStep.assignedToId,
        workflow.name,
        document.title,
        session.user.name || session.user.email,
        `${process.env.APP_URL}/workflows/${workflow.id}`
      ).catch(console.error);
    }

    // Dispatch webhook
    onWorkflowCreated({
      id: workflow.id,
      name: workflow.name,
      documentId,
      documentTitle: document.title,
      createdBy: session.user.id,
    }).catch(console.error);

    return NextResponse.json(
      {
        success: true,
        data: {
          id: workflow.id,
          name: workflow.name,
          status: workflow.status,
          steps: workflow.steps.length,
          createdAt: workflow.createdAt,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Create workflow error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create workflow' },
      { status: 500 }
    );
  }
}
