import { prisma } from '../db/prisma.js';
import { ApiError } from '../utils/ApiError.js';
import { createApplicationCreatedNotification } from './notifications.service.js';

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

function mapTaskDetailsOutput(task) {
  const companyProfile = task.owner.companyProfile;
  const avgRating = companyProfile?.avgRating;

  return {
    task_id: task.id,
    owner_user_id: task.ownerUserId,
    status: task.status,
    project: task.project ? { project_id: task.project.id, title: task.project.title } : null,
    title: task.title,
    description: task.description,
    category: task.category,
    type: task.type,
    difficulty: task.difficulty,
    required_skills: task.requiredSkills,
    estimated_effort_hours: task.estimatedEffortHours,
    expected_duration: task.expectedDuration,
    communication_language: task.communicationLanguage,
    timezone_preference: task.timezonePreference,
    application_deadline: task.applicationDeadline
      ? task.applicationDeadline.toISOString().slice(0, 10)
      : null,
    visibility: task.visibility,
    deliverables: task.deliverables,
    requirements: task.requirements,
    nice_to_have: task.niceToHave,
    created_at: task.createdAt.toISOString(),
    published_at: task.publishedAt ? task.publishedAt.toISOString() : null,
    accepted_application_id: task.acceptedApplicationId,
    deleted_at: task.deletedAt ? task.deletedAt.toISOString() : null,
    company: {
      user_id: task.ownerUserId,
      company_name: companyProfile?.companyName,
      verified: companyProfile?.verified,
      avg_rating: avgRating === null || avgRating === undefined ? null : Number(avgRating),
      reviews_count: companyProfile?.reviewsCount,
    },
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
    select: {
      id: true,
      ownerUserId: true,
      status: true,
      deletedAt: true,
      projectId: true,
    },
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

  // Check max_talents if task belongs to a project
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

  // Update task status and increment project counter if applicable
  const updateData = {
    status: 'PUBLISHED',
    publishedAt: new Date(),
  };

  if (existingTask.projectId) {
    // Use transaction to ensure atomicity
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

export async function applyToTask({ userId, taskId, application }) {
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    select: { id: true, ownerUserId: true, status: true, deletedAt: true },
  });

  if (!task || task.deletedAt) {
    throw new ApiError(404, 'TASK_NOT_FOUND', 'Task not found');
  }

  if (task.status !== 'PUBLISHED') {
    throw new ApiError(409, 'TASK_NOT_OPEN', 'Task is not open for applications');
  }

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
  const existingTask = await prisma.task.findUnique({
    where: { id: taskId },
    select: {
      id: true,
      ownerUserId: true,
      status: true,
      deletedAt: true,
      projectId: true,
    },
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
    select: {
      id: true,
      ownerUserId: true,
      status: true,
      deletedAt: true,
      projectId: true,
    },
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

export async function getTaskById({ userId, taskId, persona }) {
  const task = await prisma.task.findUnique({
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
      requiredSkills: true,
      estimatedEffortHours: true,
      expectedDuration: true,
      communicationLanguage: true,
      timezonePreference: true,
      applicationDeadline: true,
      visibility: true,
      deliverables: true,
      requirements: true,
      niceToHave: true,
      acceptedApplicationId: true,
      createdAt: true,
      publishedAt: true,
      deletedAt: true,
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

  if (!task) {
    throw new ApiError(404, 'NOT_FOUND', 'Task not found');
  }

  if (task.deletedAt || task.status === 'DELETED') {
    throw new ApiError(404, 'NOT_FOUND', 'Task not found');
  }

  const isPublicVisible = task.status === 'PUBLISHED' && task.visibility === 'PUBLIC';

  if (!isPublicVisible) {
    if (!userId) {
      throw new ApiError(401, 'AUTH_REQUIRED', 'Authorization required');
    }

    if (task.ownerUserId !== userId) {
      throw new ApiError(403, 'NOT_OWNER', 'Task does not belong to user');
    }

    if (!persona) {
      throw new ApiError(400, 'PERSONA_REQUIRED', 'X-Persona header is required');
    }

    if (persona !== 'developer' && persona !== 'company') {
      throw new ApiError(400, 'PERSONA_INVALID', 'X-Persona must be developer or company');
    }

    if (persona !== 'company') {
      throw new ApiError(403, 'PERSONA_NOT_AVAILABLE', 'Company profile does not exist');
    }

    if (!task.owner.companyProfile) {
      throw new ApiError(403, 'PERSONA_NOT_AVAILABLE', 'Company profile does not exist');
    }
  }

  return mapTaskDetailsOutput(task);
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
