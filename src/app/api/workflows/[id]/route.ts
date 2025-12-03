import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions, canManageWorkflows } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { notifyWorkflowCompleted, notifyWorkflowAssigned } from '@/lib/notifications';
import { logWorkflowApproved, logWorkflowRejected } from '@/lib/audit';
import { onWorkflowCompleted } from '@/lib/webhooks';

// GET /api/workflows/[id] - Get workflow details
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

    const workflow = await prisma.workflow.findUnique({
      where: { id },
      include: {
        document: {
          select: { id: true, title: true, slug: true, status: true },
        },
        createdBy: {
          select: { id: true, name: true, email: true, image: true },
        },
        steps: {
          include: {
            assignedTo: {
              select: { id: true, name: true, email: true, image: true },
            },
          },
          orderBy: { order: 'asc' },
        },
      },
    });

    if (!workflow) {
      return NextResponse.json(
        { success: false, error: 'Workflow not found' },
        { status: 404 }
      );
    }

    // Check access
    const isParticipant = workflow.steps.some((s) => s.assignedToId === session.user.id);
    if (
      session.user.role !== 'ADMIN' &&
      session.user.role !== 'MANAGER' &&
      workflow.createdById !== session.user.id &&
      !isParticipant
    ) {
      return NextResponse.json(
        { success: false, error: 'Access denied' },
        { status: 403 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        id: workflow.id,
        name: workflow.name,
        description: workflow.description,
        status: workflow.status,
        priority: workflow.priority,
        dueDate: workflow.dueDate,
        document: workflow.document,
        createdBy: workflow.createdBy,
        steps: workflow.steps.map((s) => ({
          id: s.id,
          order: s.order,
          name: s.name,
          description: s.description,
          assignedTo: s.assignedTo,
          status: s.status,
          action: s.action,
          dueDate: s.dueDate,
          completedAt: s.completedAt,
          comment: s.comment,
          createdAt: s.createdAt,
          updatedAt: s.updatedAt,
        })),
        createdAt: workflow.createdAt,
        updatedAt: workflow.updatedAt,
        completedAt: workflow.completedAt,
      },
    });
  } catch (error) {
    console.error('Get workflow error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to get workflow' },
      { status: 500 }
    );
  }
}

// PATCH /api/workflows/[id] - Update workflow status
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

    if (!canManageWorkflows(session.user.role)) {
      return NextResponse.json(
        { success: false, error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { status, priority } = body;

    const workflow = await prisma.workflow.findUnique({
      where: { id },
      include: {
        document: true,
        createdBy: {
          select: { id: true, email: true },
        },
      },
    });

    if (!workflow) {
      return NextResponse.json(
        { success: false, error: 'Workflow not found' },
        { status: 404 }
      );
    }

    const updatedWorkflow = await prisma.workflow.update({
      where: { id },
      data: {
        ...(status && { status }),
        ...(priority && { priority }),
        ...(status === 'COMPLETED' && { completedAt: new Date() }),
      },
    });

    // Notify creator if completed
    if (status === 'COMPLETED') {
      notifyWorkflowCompleted(
        workflow.createdById,
        workflow.name,
        workflow.document.title
      ).catch(console.error);

      onWorkflowCompleted({
        id: workflow.id,
        name: workflow.name,
        documentId: workflow.documentId,
        documentTitle: workflow.document.title,
        completedBy: session.user.id,
        status: 'COMPLETED',
      }).catch(console.error);
    }

    return NextResponse.json({
      success: true,
      data: {
        id: updatedWorkflow.id,
        status: updatedWorkflow.status,
        completedAt: updatedWorkflow.completedAt,
      },
    });
  } catch (error) {
    console.error('Update workflow error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update workflow' },
      { status: 500 }
    );
  }
}

// DELETE /api/workflows/[id] - Cancel workflow
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

    if (!canManageWorkflows(session.user.role)) {
      return NextResponse.json(
        { success: false, error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    const workflow = await prisma.workflow.findUnique({
      where: { id },
    });

    if (!workflow) {
      return NextResponse.json(
        { success: false, error: 'Workflow not found' },
        { status: 404 }
      );
    }

    // Only cancel, don't delete
    await prisma.workflow.update({
      where: { id },
      data: {
        status: 'CANCELLED',
      },
    });

    return NextResponse.json({
      success: true,
      data: { id, status: 'CANCELLED' },
    });
  } catch (error) {
    console.error('Cancel workflow error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to cancel workflow' },
      { status: 500 }
    );
  }
}
