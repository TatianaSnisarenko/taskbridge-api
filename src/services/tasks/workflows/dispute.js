import { prisma } from '../../../db/prisma.js';
import { ApiError } from '../../../utils/ApiError.js';
import { createNotification } from '../../notifications/index.js';
import { mapDisputeListItem } from './dispute-list.js';

const OPEN_DISPUTE_STATUS = 'OPEN';
const RESOLVED_DISPUTE_STATUS = 'RESOLVED';

export async function openTaskDispute({ userId, taskId, reason }) {
  const updated = await prisma.$transaction(async (tx) => {
    const task = await tx.task.findUnique({
      where: { id: taskId },
      select: {
        id: true,
        ownerUserId: true,
        status: true,
        deletedAt: true,
        acceptedApplicationId: true,
        acceptedApplication: {
          select: {
            developerUserId: true,
          },
        },
      },
    });

    if (!task || task.deletedAt) {
      throw new ApiError(404, 'NOT_FOUND', 'Task not found');
    }

    if (task.ownerUserId !== userId) {
      throw new ApiError(403, 'NOT_OWNER', 'Task does not belong to user');
    }

    if (task.status !== 'IN_PROGRESS') {
      throw new ApiError(409, 'INVALID_STATE', 'Only IN_PROGRESS tasks can be moved to DISPUTE');
    }

    if (!task.acceptedApplicationId || !task.acceptedApplication?.developerUserId) {
      throw new ApiError(409, 'INVALID_STATE', 'Accepted developer not found');
    }

    const existingOpenDispute = await tx.taskDispute.findFirst({
      where: {
        taskId: task.id,
        status: OPEN_DISPUTE_STATUS,
      },
      select: { id: true },
    });

    if (existingOpenDispute) {
      throw new ApiError(409, 'DISPUTE_ALREADY_OPEN', 'Task already has an open dispute');
    }

    const updatedTask = await tx.task.update({
      where: { id: taskId },
      data: {
        status: 'DISPUTE',
      },
      select: {
        id: true,
        status: true,
      },
    });

    const dispute = await tx.taskDispute.create({
      data: {
        taskId: task.id,
        initiatorUserId: userId,
        initiatorPersona: 'company',
        sourceStatus: task.status,
        reasonType: 'DEVELOPER_UNRESPONSIVE',
        reasonText: reason,
      },
      select: { id: true },
    });

    await createNotification({
      client: tx,
      userId: task.acceptedApplication.developerUserId,
      actorUserId: userId,
      taskId: task.id,
      type: 'TASK_DISPUTE_OPENED',
      payload: {
        task_id: task.id,
        status: updatedTask.status,
        reason,
      },
    });

    return {
      ...updatedTask,
      disputeId: dispute.id,
    };
  });

  return {
    taskId: updated.id,
    status: updated.status,
    disputeId: updated.disputeId,
  };
}

export async function escalateTaskCompletionDispute({ userId, taskId, reason }) {
  const updated = await prisma.$transaction(async (tx) => {
    const task = await tx.task.findUnique({
      where: { id: taskId },
      select: {
        id: true,
        ownerUserId: true,
        status: true,
        deletedAt: true,
        completionRequestExpiresAt: true,
        acceptedApplicationId: true,
        acceptedApplication: {
          select: {
            developerUserId: true,
          },
        },
      },
    });

    if (!task || task.deletedAt) {
      throw new ApiError(404, 'NOT_FOUND', 'Task not found');
    }

    if (task.status !== 'COMPLETION_REQUESTED') {
      throw new ApiError(
        409,
        'INVALID_STATE',
        'Only COMPLETION_REQUESTED tasks can be escalated to dispute'
      );
    }

    if (!task.acceptedApplicationId || task.acceptedApplication?.developerUserId !== userId) {
      throw new ApiError(403, 'FORBIDDEN', 'Only accepted developer can escalate this dispute');
    }

    if (!task.completionRequestExpiresAt || task.completionRequestExpiresAt >= new Date()) {
      throw new ApiError(
        409,
        'COMPLETION_RESPONSE_PENDING',
        'Company response deadline has not passed yet'
      );
    }

    const existingOpenDispute = await tx.taskDispute.findFirst({
      where: {
        taskId: task.id,
        status: OPEN_DISPUTE_STATUS,
      },
      select: { id: true },
    });

    if (existingOpenDispute) {
      throw new ApiError(409, 'DISPUTE_ALREADY_OPEN', 'Task already has an open dispute');
    }

    const updatedTask = await tx.task.update({
      where: { id: task.id },
      data: {
        status: 'DISPUTE',
      },
      select: {
        id: true,
        status: true,
      },
    });

    const dispute = await tx.taskDispute.create({
      data: {
        taskId: task.id,
        initiatorUserId: userId,
        initiatorPersona: 'developer',
        sourceStatus: 'COMPLETION_REQUESTED',
        reasonType: 'COMPLETION_NOT_CONFIRMED',
        reasonText: reason,
      },
      select: { id: true },
    });

    await createNotification({
      client: tx,
      userId: task.ownerUserId,
      actorUserId: userId,
      taskId: task.id,
      type: 'TASK_DISPUTE_OPENED',
      payload: {
        task_id: task.id,
        status: updatedTask.status,
        reason,
      },
    });

    return {
      ...updatedTask,
      disputeId: dispute.id,
    };
  });

  return {
    taskId: updated.id,
    status: updated.status,
    disputeId: updated.disputeId,
  };
}

export async function resolveTaskDispute({ userId, taskId, action, reason }) {
  const result = await prisma.$transaction(async (tx) => {
    const task = await tx.task.findUnique({
      where: { id: taskId },
      select: {
        id: true,
        ownerUserId: true,
        status: true,
        deletedAt: true,
        projectId: true,
        acceptedApplicationId: true,
        acceptedApplication: {
          select: {
            developerUserId: true,
          },
        },
      },
    });

    if (!task || task.deletedAt) {
      throw new ApiError(404, 'NOT_FOUND', 'Task not found');
    }

    const openDispute = await tx.taskDispute.findFirst({
      where: {
        taskId: task.id,
        status: OPEN_DISPUTE_STATUS,
      },
      select: {
        id: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!openDispute) {
      throw new ApiError(409, 'INVALID_STATE', 'Task does not have an open dispute');
    }

    const now = new Date();
    const updateData = {
      completionRequestedAt: null,
      completionRequestExpiresAt: null,
    };

    if (action === 'MARK_FAILED') {
      updateData.status = 'FAILED';
      updateData.failedAt = now;
    } else if (action === 'MARK_COMPLETED') {
      updateData.status = 'COMPLETED';
      updateData.completedAt = now;
    } else {
      updateData.status = 'IN_PROGRESS';
    }

    const updated = await tx.task.update({
      where: { id: taskId },
      data: updateData,
      select: {
        id: true,
        status: true,
        projectId: true,
      },
    });

    await tx.taskDispute.update({
      where: { id: openDispute.id },
      data: {
        status: RESOLVED_DISPUTE_STATUS,
        resolutionAction: action,
        resolutionReason: reason,
        resolvedByUserId: userId,
        resolvedAt: now,
      },
    });

    return updated;
  });

  return {
    taskId: result.id,
    status: result.status,
    action,
    reason,
    resolvedBy: userId,
  };
}

export async function getTaskDisputes({ page = 1, size = 20, status, reasonType }) {
  const skip = (page - 1) * size;

  const where = {};
  if (status) {
    where.status = status;
  }
  if (reasonType) {
    where.reasonType = reasonType;
  }

  const [items, total] = await Promise.all([
    prisma.taskDispute.findMany({
      where,
      skip,
      take: size,
      orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
      select: {
        id: true,
        taskId: true,
        initiatorUserId: true,
        initiatorPersona: true,
        sourceStatus: true,
        reasonType: true,
        reasonText: true,
        status: true,
        resolutionAction: true,
        resolutionReason: true,
        resolvedByUserId: true,
        createdAt: true,
        updatedAt: true,
        resolvedAt: true,
        task: {
          select: {
            id: true,
            title: true,
            status: true,
            projectId: true,
            ownerUserId: true,
            completionRequestedAt: true,
            completionRequestExpiresAt: true,
            owner: {
              select: {
                companyProfile: {
                  select: { companyName: true },
                },
              },
            },
            acceptedApplication: {
              select: {
                developerUserId: true,
                developer: {
                  select: {
                    developerProfile: {
                      select: { displayName: true },
                    },
                  },
                },
              },
            },
          },
        },
      },
    }),
    prisma.taskDispute.count({ where }),
  ]);

  return {
    items: items.map((item) => {
      const mapped = mapDisputeListItem(item);
      return {
        dispute_id: mapped.disputeId,
        task_id: mapped.taskId,
        task_title: mapped.taskTitle,
        task_status: mapped.taskStatus,
        project_id: mapped.projectId,
        company_user_id: mapped.companyUserId,
        company_name: mapped.companyName,
        developer_user_id: mapped.developerUserId,
        developer_display_name: mapped.developerDisplayName,
        initiator_user_id: mapped.initiatorUserId,
        initiator_persona: mapped.initiatorPersona,
        source_status: mapped.sourceStatus,
        reason_type: mapped.reasonType,
        reason_text: mapped.reasonText,
        status: mapped.status,
        created_at: mapped.createdAt.toISOString(),
        updated_at: mapped.updatedAt.toISOString(),
        resolved_at: mapped.resolvedAt?.toISOString() || null,
        resolved_by_user_id: mapped.resolvedByUserId,
        resolution_action: mapped.resolutionAction,
        resolution_reason: mapped.resolutionReason,
        completion_requested_at: mapped.completionRequestedAt?.toISOString() || null,
        completion_request_expires_at: mapped.completionRequestExpiresAt?.toISOString() || null,
        available_actions: mapped.availableActions,
      };
    }),
    page,
    size,
    total,
  };
}
