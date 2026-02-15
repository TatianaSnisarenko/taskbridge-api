import { prisma } from '../db/prisma.js';
import { ApiError } from '../utils/ApiError.js';

function mapTaskInput(input) {
  return {
    title: input.title,
    description: input.description,
    category: input.category,
    type: input.type,
    difficulty: input.difficulty,
    requiredSkills: input.required_skills,
    estimatedEffortHours: input.estimated_effort_hours,
    expectedDuration: input.expected_duration,
    communicationLanguage: input.communication_language,
    timezonePreference: input.timezone_preference,
    applicationDeadline: input.application_deadline,
    visibility: input.visibility,
    deliverables: input.deliverables,
    requirements: input.requirements,
    niceToHave: input.nice_to_have,
  };
}

export async function createTaskDraft({ userId, task }) {
  const projectId = task.project_id ?? null;

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

  const created = await prisma.task.create({
    data: {
      ownerUserId: userId,
      projectId,
      status: 'DRAFT',
      ...mapTaskInput(task),
    },
    select: { id: true, status: true, createdAt: true },
  });

  return { taskId: created.id, status: created.status, createdAt: created.createdAt };
}

export async function updateTaskDraft({ userId, taskId, task }) {
  const existingTask = await prisma.task.findUnique({
    where: { id: taskId },
    select: { id: true, ownerUserId: true, status: true, deletedAt: true },
  });

  if (!existingTask || existingTask.deletedAt) {
    throw new ApiError(404, 'NOT_FOUND', 'Task not found');
  }

  if (existingTask.ownerUserId !== userId) {
    throw new ApiError(403, 'NOT_OWNER', 'Task does not belong to user');
  }

  if (existingTask.status !== 'DRAFT' && existingTask.status !== 'PUBLISHED') {
    throw new ApiError(409, 'INVALID_STATE', 'Task cannot be updated in current state');
  }

  const projectId = task.project_id ?? null;

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

  const updated = await prisma.task.update({
    where: { id: taskId },
    data: {
      projectId,
      ...mapTaskInput(task),
    },
    select: { id: true, updatedAt: true },
  });

  return { taskId: updated.id, updated: true, updatedAt: updated.updatedAt };
}

export async function publishTask({ userId, taskId }) {
  const existingTask = await prisma.task.findUnique({
    where: { id: taskId },
    select: { id: true, ownerUserId: true, status: true, deletedAt: true },
  });

  if (!existingTask || existingTask.deletedAt) {
    throw new ApiError(404, 'NOT_FOUND', 'Task not found');
  }

  if (existingTask.ownerUserId !== userId) {
    throw new ApiError(403, 'NOT_OWNER', 'Task does not belong to user');
  }

  if (existingTask.status !== 'DRAFT') {
    throw new ApiError(409, 'INVALID_STATE', 'Only DRAFT tasks can be published');
  }

  const published = await prisma.task.update({
    where: { id: taskId },
    data: {
      status: 'PUBLISHED',
      publishedAt: new Date(),
    },
    select: { id: true, status: true, publishedAt: true },
  });

  return { taskId: published.id, status: published.status, publishedAt: published.publishedAt };
}

export async function closeTask({ userId, taskId }) {
  const existingTask = await prisma.task.findUnique({
    where: { id: taskId },
    select: { id: true, ownerUserId: true, status: true, deletedAt: true },
  });

  if (!existingTask || existingTask.deletedAt) {
    throw new ApiError(404, 'NOT_FOUND', 'Task not found');
  }

  if (existingTask.ownerUserId !== userId) {
    throw new ApiError(403, 'NOT_OWNER', 'Task does not belong to user');
  }

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
