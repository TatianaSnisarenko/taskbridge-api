import { prisma } from '../prisma.js';

export async function findThreadIdByTaskId(taskId) {
  return prisma.chatThread.findUnique({
    where: { taskId },
    select: { id: true },
  });
}

export async function findTaskForThreadResolution(taskId) {
  return prisma.task.findUnique({
    where: { id: taskId },
    select: {
      id: true,
      status: true,
      deletedAt: true,
      ownerUserId: true,
      acceptedApplication: {
        select: {
          developerUserId: true,
        },
      },
    },
  });
}

export async function upsertThreadByTaskId({ taskId, companyUserId, developerUserId }) {
  return prisma.chatThread.upsert({
    where: { taskId },
    update: {},
    create: {
      taskId,
      companyUserId,
      developerUserId,
      createdAt: new Date(),
    },
    select: {
      id: true,
    },
  });
}
