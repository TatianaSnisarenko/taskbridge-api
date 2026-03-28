import { prisma } from '../../db/prisma.js';
import { invalidateCachedUnreadNotificationCount } from '../../cache/notifications.js';

export function buildTaskNotificationPayload({
  taskId,
  applicationId = null,
  reviewId = null,
  inviteId = null,
}) {
  return {
    task_id: taskId,
    application_id: applicationId,
    review_id: reviewId,
    invite_id: inviteId,
  };
}

export async function createNotification({
  client = prisma,
  userId,
  actorUserId,
  projectId = null,
  taskId = null,
  threadId = null,
  type,
  payload,
}) {
  const created = await client.notification.create({
    data: {
      userId,
      actorUserId,
      projectId,
      taskId,
      threadId,
      type,
      payload,
    },
  });

  await invalidateCachedUnreadNotificationCount(userId);

  return created;
}

export async function createApplicationCreatedNotification({
  client = prisma,
  userId,
  actorUserId,
  taskId,
  applicationId,
}) {
  return createNotification({
    client,
    userId,
    actorUserId,
    taskId,
    type: 'APPLICATION_CREATED',
    payload: buildTaskNotificationPayload({
      taskId,
      applicationId,
      reviewId: null,
    }),
  });
}
