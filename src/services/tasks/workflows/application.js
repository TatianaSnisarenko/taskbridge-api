import { prisma } from '../../../db/prisma.js';
import { ApiError } from '../../../utils/ApiError.js';
import {
  createApplicationCreatedNotification,
  createNotification,
  buildTaskNotificationPayload,
} from '../../notifications/index.js';
import { getOrCreateChatThread } from '../../chat/index.js';
import { sendImportantNotificationEmail } from '../../notification-email/index.js';
import { findTaskForApplication, findTaskForOwnership } from '../../../db/queries/tasks.queries.js';

export async function applyToTask({ userId, taskId, application }) {
  const task = await findTaskForApplication(taskId);

  const existingApplication = await prisma.application.findFirst({
    where: { taskId, developerUserId: userId },
    select: { id: true },
  });

  if (existingApplication) {
    throw new ApiError(409, 'ALREADY_APPLIED', 'Application already exists');
  }

  const created = await prisma.$transaction(async (tx) => {
    const applicationRecord = await tx.application.create({
      data: {
        taskId,
        developerUserId: userId,
        status: 'APPLIED',
        message: application.message,
        proposedPlan: application.proposed_plan,
        availabilityNote: application.availability_note,
      },
      select: {
        id: true,
        taskId: true,
        developerUserId: true,
        status: true,
        createdAt: true,
      },
    });

    await createApplicationCreatedNotification({
      client: tx,
      userId: task.ownerUserId,
      actorUserId: userId,
      taskId: task.id,
      applicationId: applicationRecord.id,
    });

    return applicationRecord;
  });

  return {
    applicationId: created.id,
    taskId: created.taskId,
    developerUserId: created.developerUserId,
    status: created.status,
    createdAt: created.createdAt,
  };
}

export async function closeTask({ userId, taskId }) {
  const existingTask = await findTaskForOwnership(taskId, userId);

  if (existingTask.status !== 'DRAFT' && existingTask.status !== 'PUBLISHED') {
    throw new ApiError(409, 'INVALID_STATE', 'Only DRAFT or PUBLISHED tasks can be closed');
  }

  const closed = await prisma.task.update({
    where: { id: taskId },
    data: {
      status: 'CLOSED',
      closedAt: new Date(),
    },
    select: { id: true, status: true, closedAt: true },
  });

  return { taskId: closed.id, status: closed.status, closedAt: closed.closedAt };
}

export async function acceptApplication({ userId, applicationId }) {
  const result = await prisma.$transaction(async (tx) => {
    const application = await tx.application.findUnique({
      where: { id: applicationId },
      include: {
        task: {
          select: {
            id: true,
            status: true,
            ownerUserId: true,
            acceptedApplicationId: true,
          },
        },
      },
    });

    if (!application) {
      throw new ApiError(404, 'NOT_FOUND', 'Application not found');
    }

    const task = application.task;

    if (task.ownerUserId !== userId) {
      throw new ApiError(403, 'NOT_OWNER', 'User is not the task owner');
    }

    return await startTaskWithDeveloper({
      tx,
      taskId: task.id,
      developerUserId: application.developerUserId,
      companyUserId: userId,
      source: 'application',
      applicationId,
    });
  });

  const thread = await getOrCreateChatThread({
    taskId: result.task_id,
    companyUserId: result.company_user_id,
    developerUserId: result.accepted_developer_user_id,
  });

  const developedUser = await prisma.user.findUnique({
    where: { id: result.accepted_developer_user_id },
    select: {
      id: true,
      email: true,
      emailVerified: true,
      developerProfile: {
        select: { displayName: true },
      },
    },
  });

  const task = await prisma.task.findUnique({
    where: { id: result.task_id },
    select: { id: true, title: true },
  });

  if (developedUser && task) {
    await sendImportantNotificationEmail({
      type: 'APPLICATION_ACCEPTED',
      recipient: {
        email: developedUser.email,
        name: developedUser.developerProfile?.displayName || 'Developer',
        email_verified: developedUser.emailVerified,
      },
      task: {
        id: task.id,
        title: task.title,
      },
    });
  }

  return {
    ...result,
    thread_id: thread?.id ?? null,
  };
}

export async function rejectApplication({ userId, applicationId }) {
  const result = await prisma.$transaction(async (tx) => {
    const application = await tx.application.findUnique({
      where: { id: applicationId },
      include: {
        task: {
          select: {
            id: true,
            ownerUserId: true,
          },
        },
      },
    });

    if (!application) {
      throw new ApiError(404, 'NOT_FOUND', 'Application not found');
    }

    if (application.task.ownerUserId !== userId) {
      throw new ApiError(403, 'NOT_OWNER', 'User is not the task owner');
    }

    if (application.status !== 'APPLIED') {
      throw new ApiError(409, 'INVALID_STATE', 'Application already processed');
    }

    const updatedApplication = await tx.application.update({
      where: { id: applicationId },
      data: {
        status: 'REJECTED',
      },
    });

    await createNotification({
      client: tx,
      userId: application.developerUserId,
      actorUserId: userId,
      taskId: application.task.id,
      type: 'APPLICATION_REJECTED',
      payload: buildTaskNotificationPayload({
        taskId: application.task.id,
        applicationId: applicationId,
      }),
    });

    return {
      application_id: updatedApplication.id,
      status: updatedApplication.status,
      updated_at: updatedApplication.updatedAt.toISOString(),
    };
  });

  return result;
}

export async function startTaskWithDeveloper({
  tx,
  taskId,
  developerUserId,
  companyUserId,
  source,
  applicationId = null,
}) {
  const task = await tx.task.findUnique({
    where: { id: taskId },
    select: {
      id: true,
      status: true,
      ownerUserId: true,
      acceptedApplicationId: true,
    },
  });

  if (!task) {
    throw new ApiError(404, 'TASK_NOT_FOUND', 'Task not found');
  }

  if (task.status !== 'PUBLISHED') {
    throw new ApiError(409, 'INVALID_STATE', 'Task is not in PUBLISHED status');
  }

  if (task.acceptedApplicationId) {
    throw new ApiError(409, 'INVALID_STATE', 'Task already has an accepted application');
  }

  let finalApplicationId = applicationId;
  let application = null;

  if (source === 'application' && applicationId) {
    application = await tx.application.findUnique({
      where: { id: applicationId },
      select: {
        id: true,
        taskId: true,
        developerUserId: true,
        status: true,
      },
    });

    if (!application) {
      throw new ApiError(404, 'APPLICATION_NOT_FOUND', 'Application not found');
    }

    if (application.status !== 'APPLIED') {
      throw new ApiError(409, 'INVALID_STATE', 'Application is not in APPLIED status');
    }

    finalApplicationId = application.id;
  } else if (source === 'invite') {
    application = await tx.application.findUnique({
      where: {
        taskId_developerUserId: {
          taskId,
          developerUserId,
        },
      },
      select: {
        id: true,
        taskId: true,
        developerUserId: true,
        status: true,
      },
    });

    if (application) {
      finalApplicationId = application.id;
    } else {
      const newApplication = await tx.application.create({
        data: {
          taskId,
          developerUserId,
          status: 'ACCEPTED',
        },
        select: {
          id: true,
        },
      });
      finalApplicationId = newApplication.id;
    }
  }

  if (application && application.status !== 'ACCEPTED') {
    await tx.application.update({
      where: { id: finalApplicationId },
      data: { status: 'ACCEPTED' },
    });
  }

  await tx.task.update({
    where: { id: taskId },
    data: {
      acceptedApplicationId: finalApplicationId,
      status: 'IN_PROGRESS',
    },
  });

  const otherApplications = await tx.application.findMany({
    where: {
      taskId,
      id: { not: finalApplicationId },
      status: 'APPLIED',
    },
    select: {
      id: true,
      developerUserId: true,
    },
  });

  if (otherApplications.length > 0) {
    await tx.application.updateMany({
      where: {
        taskId,
        id: { not: finalApplicationId },
        status: 'APPLIED',
      },
      data: {
        status: 'REJECTED',
      },
    });
  }

  await createNotification({
    client: tx,
    userId: developerUserId,
    actorUserId: companyUserId,
    taskId,
    type: 'APPLICATION_ACCEPTED',
    payload: buildTaskNotificationPayload({
      taskId,
      applicationId: finalApplicationId,
    }),
  });

  for (const otherApp of otherApplications) {
    await createNotification({
      client: tx,
      userId: otherApp.developerUserId,
      actorUserId: companyUserId,
      taskId,
      type: 'APPLICATION_REJECTED',
      payload: buildTaskNotificationPayload({
        taskId,
        applicationId: otherApp.id,
      }),
    });
  }

  return {
    task_id: taskId,
    accepted_application_id: finalApplicationId,
    task_status: 'IN_PROGRESS',
    accepted_developer_user_id: developerUserId,
    company_user_id: companyUserId,
  };
}
