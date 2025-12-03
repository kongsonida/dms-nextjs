import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { updateWorkflowStepSchema, validate } from '@/lib/validation';
import { notifyWorkflowAssigned, notifyWorkflowCompleted, notifyDocumentApproved, notifyDocumentRejected } from '@/lib/notifications';
import { logWorkflowApproved, logWorkflowRejected } from '@/lib/audit';
import { onWorkflowCompleted } from '@/lib/webhooks';

// PATCH /api/workflows/[id]/steps/[stepId] - Update workflow step
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; stepId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    const { id, stepId } = await params;

    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();

    const validation = validate(updateWorkflowStepSchema, body);
    if (!validation.success) {
      return NextResponse.json(
        { success: false, errors: validation.errors },
        { status: 400 }
      );
    }

    const { status, comment } = validation.data!;

    // Get step with workflow info
    const step = await prisma.workflowStep.findUnique({
      where: { id: stepId },
      include: {
        workflow: {
          include: {
            document: true,
            createdBy: {
              select: { id: true, name: true, email: true },
            },
            steps: {
              orderBy: { order: 'asc' },
            },
          },
        },
      },
    });

    if (!step || step.workflowId !== id) {
      return NextResponse.json(
        { success: false, error: 'Step not found' },
        { status: 404 }
      );
    }

    // Check if user is assigned to this step or is admin
    if (step.assignedToId !== session.user.id && session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, error: 'You are not assigned to this step' },
        { status: 403 }
      );
    }

    // Check workflow status
    if (step.workflow.status !== 'ACTIVE') {
      return NextResponse.json(
        { success: false, error: 'Workflow is not active' },
        { status: 400 }
      );
    }

    // Update step
    const updatedStep = await prisma.workflowStep.update({
      where: { id: stepId },
      data: {
        status,
        comment,
        completedAt: ['COMPLETED', 'REJECTED', 'SKIPPED'].includes(status) ? new Date() : null,
      },
    });

    // Log audit
    if (status === 'COMPLETED') {
      logWorkflowApproved(id, step.workflow.documentId, session.user.id, comment);
    } else if (status === 'REJECTED') {
      logWorkflowRejected(id, step.workflow.documentId, session.user.id, comment);
    }

    // Handle workflow progression
    const allSteps = step.workflow.steps;
    const currentStepIndex = allSteps.findIndex((s) => s.id === stepId);
    const nextStep = allSteps[currentStepIndex + 1];

    if (status === 'COMPLETED' && nextStep) {
      // Notify next step assignee
      notifyWorkflowAssigned(
        nextStep.assignedToId,
        step.workflow.name,
        step.workflow.document.title,
        session.user.name || session.user.email,
        `${process.env.APP_URL}/workflows/${id}`
      ).catch(console.error);
    } else if (status === 'COMPLETED' && !nextStep) {
      // All steps completed - complete workflow
      await prisma.workflow.update({
        where: { id },
        data: {
          status: 'COMPLETED',
          completedAt: new Date(),
        },
      });

      // Update document status
      await prisma.document.update({
        where: { id: step.workflow.documentId },
        data: { status: 'APPROVED' },
      });

      // Notify workflow creator
      notifyWorkflowCompleted(
        step.workflow.createdById,
        step.workflow.name,
        step.workflow.document.title
      ).catch(console.error);

      // Notify document owner
      notifyDocumentApproved(
        step.workflow.document.ownerId,
        step.workflow.document.title,
        session.user.name || session.user.email,
        `${process.env.APP_URL}/documents/${step.workflow.document.slug}`
      ).catch(console.error);

      onWorkflowCompleted({
        id: step.workflow.id,
        name: step.workflow.name,
        documentId: step.workflow.documentId,
        documentTitle: step.workflow.document.title,
        completedBy: session.user.id,
        status: 'COMPLETED',
      }).catch(console.error);
    } else if (status === 'REJECTED') {
      // Reject workflow
      await prisma.workflow.update({
        where: { id },
        data: {
          status: 'CANCELLED',
        },
      });

      // Update document status
      await prisma.document.update({
        where: { id: step.workflow.documentId },
        data: { status: 'REJECTED' },
      });

      // Notify document owner
      notifyDocumentRejected(
        step.workflow.document.ownerId,
        step.workflow.document.title,
        session.user.name || session.user.email,
        comment || 'No reason provided',
        `${process.env.APP_URL}/documents/${step.workflow.document.slug}`
      ).catch(console.error);
    }

    return NextResponse.json({
      success: true,
      data: {
        id: updatedStep.id,
        status: updatedStep.status,
        comment: updatedStep.comment,
        completedAt: updatedStep.completedAt,
      },
    });
  } catch (error) {
    console.error('Update workflow step error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update workflow step' },
      { status: 500 }
    );
  }
}
