import { prisma } from '../../db/prisma.js';
import { ApiError } from '../../utils/ApiError.js';
import { findProjectWithDetails, findProjectsCatalog } from '../../db/queries/projects.queries.js';
import { mapProjectOutput, buildTaskSummary, mapProjectDetailsOutput } from './helpers.js';

export async function getProjects({ userId, query }) {
  // eslint-disable-next-line no-unused-vars
  const { page = 1, size = 20, search, technology, visibility, owner, include_deleted } = query;

  const isOwnerQuery = owner === true || owner === 'true';
  const includeDeleted = include_deleted === true || include_deleted === 'true';

  // Only owner can see deleted and filter by owner
  if (includeDeleted && !isOwnerQuery) {
    throw new ApiError(403, 'FORBIDDEN', 'Only owner can include deleted projects');
  }

  const skip = (page - 1) * size;

  const { projects: items, total } = await findProjectsCatalog(
    {
      userId,
      search,
      visibility,
      owner,
      includeDeleted,
      status: 'ACTIVE',
    },
    { skip, take: Number(size) }
  );

  return {
    items: items.map(mapProjectOutput),
    page,
    size: Number(size),
    total,
  };
}

export async function getProjectById({ userId, projectId, includeDeleted, previewLimit }) {
  const project = await findProjectWithDetails(projectId);

  if (!project) {
    throw new ApiError(404, 'NOT_FOUND', 'Project not found');
  }

  const isOwner = userId && project.ownerUserId === userId;

  if (project.deletedAt) {
    if (!includeDeleted || !isOwner) {
      throw new ApiError(404, 'NOT_FOUND', 'Project not found');
    }
  }

  // For ARCHIVED projects: allow access to owner or developer who worked on a task in this project
  if (project.status === 'ARCHIVED' && !isOwner) {
    // Check if user has an accepted application for any task in this project
    const userApplication = await prisma.application.findFirst({
      where: {
        developerUserId: userId,
        status: 'ACCEPTED',
        task: {
          projectId: projectId,
          deletedAt: null,
        },
      },
      select: { id: true },
    });

    if (!userApplication) {
      throw new ApiError(404, 'NOT_FOUND', 'Project not found');
    }
  }

  if (!project.deletedAt && project.visibility !== 'PUBLIC' && !isOwner) {
    throw new ApiError(404, 'NOT_FOUND', 'Project not found');
  }

  const taskWhere = { projectId };
  if (!(includeDeleted && isOwner)) {
    taskWhere.deletedAt = null;
  }

  const taskGroups = await prisma.task.groupBy({
    by: ['status'],
    where: taskWhere,
    _count: { _all: true },
  });

  const taskSummary = buildTaskSummary(taskGroups);

  // Fetch tasks preview
  const limit = previewLimit ? parseInt(previewLimit, 10) : 3;
  const previewWhere = {
    projectId,
  };

  // For non-owners, only show PUBLISHED + PUBLIC tasks
  if (!isOwner) {
    previewWhere.status = 'PUBLISHED';
    previewWhere.visibility = 'PUBLIC';
  }

  if (!(includeDeleted && isOwner)) {
    previewWhere.deletedAt = null;
  }

  const tasksPreview = await prisma.task.findMany({
    where: previewWhere,
    select: {
      id: true,
      title: true,
      description: true,
      status: true,
    },
    orderBy: {
      publishedAt: 'desc',
    },
    take: limit,
  });

  return mapProjectDetailsOutput(project, taskSummary, tasksPreview);
}
