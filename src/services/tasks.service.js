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

export async function deleteTask({ userId, taskId }) {
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

export async function getTasksCatalog(query) {
  const {
    userId,
    page = 1,
    size = 20,
    search,
    category,
    difficulty,
    type,
    skills = [],
    projectId,
    owner = false,
    includeDeleted = false,
  } = query;

  const skip = (page - 1) * size;

  // Build where clause
  const where = {};

  // Handle owner/public logic
  if (owner) {
    if (!userId) {
      throw new ApiError(401, 'AUTH_REQUIRED', 'Authorization required');
    }
    // Owner's tasks - can see any status except deleted by default
    where.ownerUserId = userId;
    if (!includeDeleted) {
      where.deletedAt = null;
    }
  } else {
    // Public catalog - only published, public, not deleted
    where.status = 'PUBLISHED';
    where.visibility = 'PUBLIC';
    where.deletedAt = null;
  }

  // Optional filters
  if (search) {
    where.OR = [
      { title: { contains: search, mode: 'insensitive' } },
      { description: { contains: search, mode: 'insensitive' } },
    ];
  }

  if (category) {
    where.category = category;
  }

  if (difficulty) {
    where.difficulty = difficulty;
  }

  if (type) {
    where.type = type;
  }

  if (skills.length > 0) {
    where.requiredSkills = { hasSome: skills };
  }

  if (projectId) {
    where.projectId = projectId;
  }

  // Fetch tasks with pagination
  const [items, total] = await Promise.all([
    prisma.task.findMany({
      where,
      select: {
        id: true,
        title: true,
        status: true,
        category: true,
        type: true,
        difficulty: true,
        requiredSkills: true,
        publishedAt: true,
        projectId: true,
        project: {
          select: {
            id: true,
            title: true,
          },
        },
        ownerUserId: true,
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
      skip,
      take: size,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.task.count({ where }),
  ]);

  return {
    items: items.map((task) => ({
      task_id: task.id,
      title: task.title,
      status: task.status,
      category: task.category,
      type: task.type,
      difficulty: task.difficulty,
      required_skills: task.requiredSkills,
      published_at: task.publishedAt,
      project: task.projectId ? { project_id: task.project.id, title: task.project.title } : null,
      company: {
        user_id: task.ownerUserId,
        company_name: task.owner.companyProfile?.companyName,
        verified: task.owner.companyProfile?.verified,
        avg_rating: task.owner.companyProfile?.avgRating,
        reviews_count: task.owner.companyProfile?.reviewsCount,
      },
    })),
    page,
    size,
    total,
  };
}
