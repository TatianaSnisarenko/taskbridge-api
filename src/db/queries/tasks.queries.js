import { prisma } from '../prisma.js';
import { ApiError } from '../../utils/ApiError.js';

/**
 * Query helpers for tasks domain
 * Centralizes common Prisma query patterns to reduce duplication
 */

/**
 * Find task and verify ownership
 * Throws ApiError if task not found, deleted, or not owned by user
 *
 * @param {string} taskId - Task ID to find
 * @param {string} userId - Expected owner user ID
 * @param {Object} options - Additional select fields
 * @returns {Promise<Object>} Task object
 * @throws {ApiError} 404 if not found/deleted, 403 if not owner
 */
export async function findTaskForOwnership(taskId, userId, options = {}) {
  const defaultSelect = {
    id: true,
    ownerUserId: true,
    status: true,
    deletedAt: true,
  };

  const task = await prisma.task.findUnique({
    where: { id: taskId },
    select: { ...defaultSelect, ...options.select },
  });

  if (!task || task.deletedAt) {
    throw new ApiError(404, 'NOT_FOUND', 'Task not found');
  }

  if (task.ownerUserId !== userId) {
    throw new ApiError(403, 'NOT_OWNER', 'Task does not belong to user');
  }

  return task;
}

/**
 * Find task with full details including all relations
 * Used by getTaskById to retrieve complete task information
 *
 * @param {string} taskId - Task ID to find
 * @returns {Promise<Object|null>} Task with relations or null
 */
export async function findTaskWithDetails(taskId) {
  return prisma.task.findUnique({
    where: { id: taskId },
    select: {
      id: true,
      ownerUserId: true,
      status: true,
      projectId: true,
      title: true,
      description: true,
      category: true,
      type: true,
      difficulty: true,
      technologies: {
        include: {
          technology: {
            select: {
              id: true,
              slug: true,
              name: true,
              type: true,
            },
          },
        },
      },
      estimatedEffortHours: true,
      expectedDuration: true,
      communicationLanguage: true,
      timezonePreference: true,
      applicationDeadline: true,
      deadline: true,
      visibility: true,
      deliverables: true,
      requirements: true,
      niceToHave: true,
      acceptedApplicationId: true,
      createdAt: true,
      publishedAt: true,
      deletedAt: true,
      acceptedApplication: {
        select: {
          developerUserId: true,
        },
      },
      project: {
        select: {
          id: true,
          title: true,
        },
      },
      owner: {
        select: {
          companyProfile: {
            select: {
              companyName: true,
              verified: true,
              avgRating: true,
              reviewsCount: true,
            },
          },
        },
      },
    },
  });
}

export async function findTaskForReport(taskId) {
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    select: { id: true, deletedAt: true, status: true },
  });

  if (!task || task.deletedAt || task.status === 'DELETED') {
    throw new ApiError(404, 'NOT_FOUND', 'Task not found');
  }

  return task;
}

/**
 * Find task for candidate retrieval operations
 * Includes technologies and accepted application info
 *
 * @param {string} taskId - Task ID to find
 * @param {string} userId - Expected owner user ID
 * @returns {Promise<Object>} Task with candidate-specific relations
 * @throws {ApiError} 404 if not found/deleted, 403 if not owner
 */
export async function findTaskForCandidates(taskId, userId) {
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    select: {
      id: true,
      ownerUserId: true,
      status: true,
      deletedAt: true,
      technologies: {
        select: {
          technologyId: true,
        },
      },
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

  return task;
}

/**
 * Find project and verify ownership
 * Similar to task ownership pattern but for projects
 *
 * @param {string} projectId - Project ID to find
 * @param {string} userId - Expected owner user ID
 * @returns {Promise<Object>} Project object
 * @throws {ApiError} 404 if not found/deleted, 403 if not owner
 */
export async function findProjectForOwnership(projectId, userId) {
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

  return project;
}

/**
 * Find task by ID for application operations
 * Verifies task exists, is not deleted, and is in PUBLISHED state
 *
 * @param {string} taskId - Task ID to find
 * @returns {Promise<Object>} Task object
 * @throws {ApiError} 404 if not found/deleted, 409 if not published
 */
export async function findTaskForApplication(taskId) {
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    select: {
      id: true,
      ownerUserId: true,
      status: true,
      deletedAt: true,
      acceptedApplicationId: true,
    },
  });

  if (!task || task.deletedAt) {
    throw new ApiError(404, 'TASK_NOT_FOUND', 'Task not found');
  }

  if (task.status !== 'PUBLISHED') {
    throw new ApiError(409, 'TASK_NOT_OPEN', 'Task is not open for applications');
  }

  return task;
}

/**
 * Find task for application list/detail operations
 * Includes owner company profile information
 *
 * @param {string} taskId - Task ID to find
 * @param {string} userId - Expected owner user ID
 * @returns {Promise<Object>} Task with owner info
 * @throws {ApiError} 404 if not found/deleted, 403 if not owner
 */
export async function findTaskForApplications(taskId, userId) {
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    select: {
      id: true,
      ownerUserId: true,
      status: true,
      deletedAt: true,
      title: true,
      owner: {
        select: {
          companyProfile: {
            select: {
              companyName: true,
            },
          },
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

  return task;
}
