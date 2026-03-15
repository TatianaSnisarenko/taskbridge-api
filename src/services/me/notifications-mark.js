import { prisma } from '../../db/prisma.js';
import { ApiError } from '../../utils/ApiError.js';
import { isNotificationRelevantForPersona } from './notifications-helpers.js';

const notificationOwnerSelect = {
  id: true,
  userId: true,
  type: true,
  task: {
    select: { ownerUserId: true },
  },
  actor: {
    select: {
      developerProfile: { select: { userId: true } },
      companyProfile: { select: { userId: true } },
    },
  },
};

async function findAndAuthorize({ notificationId, userId, persona }) {
  const notification = await prisma.notification.findUnique({
    where: { id: notificationId },
    select: notificationOwnerSelect,
  });

  if (!notification || notification.userId !== userId) {
    throw new ApiError(404, 'NOT_FOUND', 'Notification not found');
  }

  if (!isNotificationRelevantForPersona(notification, userId, persona)) {
    throw new ApiError(404, 'NOT_FOUND', 'Notification not found');
  }

  return notification;
}

/**
 * Mark a notification as read for the current user (persona-aware)
 */
export async function markNotificationAsRead({ userId, notificationId, persona }) {
  await findAndAuthorize({ notificationId, userId, persona });

  const updated = await prisma.notification.update({
    where: { id: notificationId },
    data: { readAt: new Date() },
    select: { id: true, readAt: true },
  });

  return {
    id: updated.id,
    read_at: updated.readAt.toISOString(),
  };
}

/**
 * Mark a notification as unread for the current user (persona-aware)
 */
export async function markNotificationAsUnread({ userId, notificationId, persona }) {
  await findAndAuthorize({ notificationId, userId, persona });

  const updated = await prisma.notification.update({
    where: { id: notificationId },
    data: { readAt: null },
    select: { id: true, readAt: true },
  });

  return {
    id: updated.id,
    read_at: updated.readAt?.toISOString() || null,
  };
}

/**
 * Mark a notification as important for the current user (persona-aware)
 */
export async function markNotificationAsImportant({ userId, notificationId, persona }) {
  await findAndAuthorize({ notificationId, userId, persona });

  const updated = await prisma.notification.update({
    where: { id: notificationId },
    data: { importantAt: new Date() },
    select: { id: true, importantAt: true },
  });

  return {
    id: updated.id,
    important_at: updated.importantAt.toISOString(),
  };
}

/**
 * Remove important mark from a notification for the current user (persona-aware)
 */
export async function markNotificationAsUnimportant({ userId, notificationId, persona }) {
  await findAndAuthorize({ notificationId, userId, persona });

  const updated = await prisma.notification.update({
    where: { id: notificationId },
    data: { importantAt: null },
    select: { id: true, importantAt: true },
  });

  return {
    id: updated.id,
    important_at: updated.importantAt?.toISOString() || null,
  };
}
