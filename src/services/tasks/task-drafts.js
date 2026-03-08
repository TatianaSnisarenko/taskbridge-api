import { prisma } from '../../db/prisma.js';
import { ApiError } from '../../utils/ApiError.js';
import { validateTechnologyIds, incrementTechnologyPopularity } from '../technologies/index.js';
import { findTaskForOwnership, findProjectForOwnership } from '../../db/queries/tasks.queries.js';
import { mapTaskInput } from './helpers.js';

export async function createTaskDraft({ userId, task }) {
  const projectId = task.project_id ?? null;
  const technologyIds = await validateTechnologyIds(task.technology_ids || []);

  if (projectId) {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { id: true, ownerUserId: true, deletedAt: true },
    });

    if (!project || project.deletedAt) {
      throw new ApiError(404, 'PROJECT_NOT_FOUND', 'Project not found');
    }

    if (project.ownerUserId !== userId) {
      throw new ApiError(403, 'NOT_OWNER', 'Project does not belong to user');
    }
  }

  const created = await prisma.$transaction(async (tx) => {
    const createdTask = await tx.task.create({
      data: {
        ownerUserId: userId,
        projectId,
        status: 'DRAFT',
        ...mapTaskInput(task),
      },
      select: { id: true, status: true, createdAt: true },
    });

    if (technologyIds.length > 0) {
      await tx.taskTechnology.createMany({
        data: technologyIds.map((technologyId) => ({
          taskId: createdTask.id,
          technologyId,
          isRequired: true,
        })),
        skipDuplicates: true,
      });
    }

    return createdTask;
  });

  if (technologyIds.length > 0) {
    await incrementTechnologyPopularity(technologyIds);
  }

  return { taskId: created.id, status: created.status, createdAt: created.createdAt };
}

export async function updateTaskDraft({ userId, taskId, task }) {
  const existingTask = await findTaskForOwnership(taskId, userId);

  if (existingTask.status !== 'DRAFT' && existingTask.status !== 'PUBLISHED') {
    throw new ApiError(409, 'INVALID_STATE', 'Task cannot be updated in current state');
  }

  const projectId = task.project_id ?? null;

  if (projectId) {
    await findProjectForOwnership(projectId, userId);
  }

  const hasTechnologyIds = Array.isArray(task.technology_ids);
  const technologyIds = hasTechnologyIds
    ? await validateTechnologyIds(task.technology_ids || [])
    : null;

  const updated = await prisma.$transaction(async (tx) => {
    const updatedTask = await tx.task.update({
      where: { id: taskId },
      data: {
        projectId,
        ...mapTaskInput(task),
      },
      select: { id: true, updatedAt: true },
    });

    if (hasTechnologyIds) {
      await tx.taskTechnology.deleteMany({ where: { taskId } });

      if (technologyIds.length > 0) {
        await tx.taskTechnology.createMany({
          data: technologyIds.map((technologyId) => ({
            taskId,
            technologyId,
            isRequired: true,
          })),
          skipDuplicates: true,
        });
      }
    }

    return updatedTask;
  });

  if (hasTechnologyIds && technologyIds.length > 0) {
    await incrementTechnologyPopularity(technologyIds);
  }

  return { taskId: updated.id, updated: true, updatedAt: updated.updatedAt };
}

export async function publishTask({ userId, taskId }) {
  const existingTask = await findTaskForOwnership(taskId, userId, {
    select: { projectId: true },
  });

  if (existingTask.status !== 'DRAFT') {
    throw new ApiError(409, 'INVALID_STATE', 'Only DRAFT tasks can be published');
  }

  if (existingTask.projectId) {
    const project = await prisma.project.findUnique({
      where: { id: existingTask.projectId },
      select: {
        id: true,
        maxTalents: true,
        publishedTasksCount: true,
      },
    });

    if (!project) {
      throw new ApiError(404, 'PROJECT_NOT_FOUND', 'Project not found');
    }

    if (project.publishedTasksCount >= project.maxTalents) {
      throw new ApiError(
        409,
        'MAX_TALENTS_REACHED',
        `Project has reached maximum published tasks limit (${project.maxTalents})`
      );
    }
  }

  const updateData = {
    status: 'PUBLISHED',
    publishedAt: new Date(),
  };

  if (existingTask.projectId) {
    const result = await prisma.$transaction(async (tx) => {
      const published = await tx.task.update({
        where: { id: taskId },
        data: updateData,
        select: { id: true, status: true, publishedAt: true },
      });

      await tx.project.update({
        where: { id: existingTask.projectId },
        data: { publishedTasksCount: { increment: 1 } },
      });

      return published;
    });

    return { taskId: result.id, status: result.status, publishedAt: result.publishedAt };
  }

  const published = await prisma.task.update({
    where: { id: taskId },
    data: updateData,
    select: { id: true, status: true, publishedAt: true },
  });

  return { taskId: published.id, status: published.status, publishedAt: published.publishedAt };
}

export async function deleteTask({ userId, taskId }) {
  const existingTask = await findTaskForOwnership(taskId, userId, {
    select: { projectId: true },
  });

  const allowedStatuses = ['DRAFT', 'PUBLISHED', 'CLOSED'];
  if (!allowedStatuses.includes(existingTask.status)) {
    throw new ApiError(409, 'INVALID_STATE', 'Task cannot be deleted in current state');
  }

  const deleted = await prisma.task.update({
    where: { id: taskId },
    data: {
      status: 'DELETED',
      deletedAt: new Date(),
    },
    select: { id: true, status: true, deletedAt: true },
  });

  return { taskId: deleted.id, status: deleted.status, deletedAt: deleted.deletedAt };
}
