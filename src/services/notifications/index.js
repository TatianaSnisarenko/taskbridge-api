import { prisma } from '../../db/prisma.js';

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
  taskId,
  type,
  payload,
}) {
  return client.notification.create({
    data: {
      userId,
      actorUserId,
      taskId,
      type,
      payload,
    },
  });
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
