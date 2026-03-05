import { prisma } from '../db/prisma.js';
import { ApiError } from '../utils/ApiError.js';
import {
  createApplicationCreatedNotification,
  createNotification,
  buildTaskNotificationPayload,
} from './notifications.service.js';
import { getOrCreateChatThread } from './chat.service.js';
import { sendImportantNotificationEmail } from './notification-email.service.js';
import { validateTechnologyIds, incrementTechnologyPopularity } from './technologies.service.js';

function mapTaskInput(input) {
  return {
    title: input.title,
    description: input.description,
    category: input.category,
    type: input.type,
    difficulty: input.difficulty,
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

function mapTaskDetailsOutput(task, computed) {
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
    technologies: task.technologies
      ? task.technologies.map((tt) => ({
          id: tt.technology.id,
          slug: tt.technology.slug,
          name: tt.technology.name,
          type: tt.technology.type,
          is_required: tt.isRequired,
        }))
      : undefined,
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
    applications_count: computed.applicationsCount,
    can_apply: computed.canApply,
    is_owner: computed.isOwner,
    is_accepted_developer: computed.isAcceptedDeveloper,
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

  const applicationsCount = await prisma.application.count({
    where: { taskId: task.id },
  });

  const isOwner = !!userId && task.ownerUserId === userId;
  const isAcceptedDeveloper = !!userId && task.acceptedApplication?.developerUserId === userId;

  let canApply = false;
  if (userId && persona === 'developer' && task.status === 'PUBLISHED' && !isOwner) {
    const [developerProfile, existingApplication] = await Promise.all([
      prisma.developerProfile.findUnique({ where: { userId }, select: { userId: true } }),
      prisma.application.findFirst({ where: { taskId: task.id, developerUserId: userId } }),
    ]);

    if (developerProfile && !existingApplication) {
      canApply = true;
    }
  }

  return mapTaskDetailsOutput(task, {
    applicationsCount,
    canApply,
    isOwner,
    isAcceptedDeveloper,
  });
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
    technology_ids = [],
    tech_match = 'ANY',
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

  // Technology filter
  if (technology_ids.length > 0) {
    if (tech_match === 'ALL') {
      // Task must have ALL technologies
      where.technologies = {
        every: {
          technologyId: { in: technology_ids },
        },
      };
    } else {
      // Task must have AT LEAST ONE technology (ANY - default)
      where.technologies = {
        some: {
          technologyId: { in: technology_ids },
        },
      };
    }
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
        publishedAt: true,
        projectId: true,
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
      technologies: task.technologies?.map((tt) => ({
        id: tt.technology.id,
        slug: tt.technology.slug,
        name: tt.technology.name,
        type: tt.technology.type,
        is_required: tt.isRequired,
      })),
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

export async function getTaskApplications({ userId, taskId, page = 1, size = 20 }) {
  // Verify task exists and user is the owner
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    select: { id: true, ownerUserId: true, deletedAt: true },
  });

  if (!task || task.deletedAt) {
    throw new ApiError(404, 'NOT_FOUND', 'Task not found');
  }

  if (task.ownerUserId !== userId) {
    throw new ApiError(403, 'NOT_OWNER', 'Task does not belong to user');
  }

  const skip = (page - 1) * size;

  // Fetch applications with developer info
  const [items, total] = await Promise.all([
    prisma.application.findMany({
      where: {
        taskId,
      },
      select: {
        id: true,
        status: true,
        message: true,
        proposedPlan: true,
        availabilityNote: true,
        createdAt: true,
        developer: {
          select: {
            id: true,
            developerProfile: {
              select: {
                displayName: true,
                jobTitle: true,
                avatarUrl: true,
                avgRating: true,
                reviewsCount: true,
              },
            },
          },
        },
      },
      skip,
      take: size,
      orderBy: {
        createdAt: 'desc',
      },
    }),
    prisma.application.count({
      where: {
        taskId,
      },
    }),
  ]);

  return {
    items: items.map((app) => ({
      application_id: app.id,
      status: app.status,
      message: app.message,
      proposed_plan: app.proposedPlan,
      availability_note: app.availabilityNote,
      created_at: app.createdAt.toISOString(),
      developer: {
        user_id: app.developer.id,
        display_name: app.developer.developerProfile?.displayName,
        primary_role: app.developer.developerProfile?.jobTitle,
        avatar_url: app.developer.developerProfile?.avatarUrl ?? null,
        avg_rating: app.developer.developerProfile?.avgRating
          ? Number(app.developer.developerProfile.avgRating)
          : null,
        reviews_count: app.developer.developerProfile?.reviewsCount,
      },
    })),
    page,
    size,
    total,
  };
}

export async function acceptApplication({ userId, applicationId }) {
  // Use transaction for atomicity
  const result = await prisma.$transaction(async (tx) => {
    // Fetch application with task info
    const application = await tx.application.findUnique({
      where: { id: applicationId },
      include: {
        task: {
          select: {
            id: true,
            status: true,
            ownerUserId: true,
            acceptedApplicationId: true,
          },
        },
      },
    });

    if (!application) {
      throw new ApiError(404, 'NOT_FOUND', 'Application not found');
    }

    const task = application.task;

    // Verify user is task owner (company)
    if (task.ownerUserId !== userId) {
      throw new ApiError(403, 'NOT_OWNER', 'User is not the task owner');
    }

    // Verify task is in PUBLISHED status and doesn't have an accepted application
    if (task.status !== 'PUBLISHED') {
      throw new ApiError(409, 'INVALID_STATE', 'Task is not in PUBLISHED status');
    }

    if (task.acceptedApplicationId) {
      throw new ApiError(409, 'INVALID_STATE', 'Task already has an accepted application');
    }

    // Verify application is in APPLIED status
    if (application.status !== 'APPLIED') {
      throw new ApiError(409, 'INVALID_STATE', 'Application is not in APPLIED status');
    }

    // Update the accepted application
    await tx.application.update({
      where: { id: applicationId },
      data: {
        status: 'ACCEPTED',
      },
    });

    // Update task: set accepted application and status to IN_PROGRESS
    await tx.task.update({
      where: { id: task.id },
      data: {
        acceptedApplicationId: applicationId,
        status: 'IN_PROGRESS',
      },
    });

    // Get all other applications for this task that are in APPLIED status
    const otherApplications = await tx.application.findMany({
      where: {
        taskId: task.id,
        id: { not: applicationId },
        status: 'APPLIED',
      },
      select: {
        id: true,
        developerUserId: true,
      },
    });

    // Update other applications to REJECTED
    if (otherApplications.length > 0) {
      await tx.application.updateMany({
        where: {
          taskId: task.id,
          id: { not: applicationId },
          status: 'APPLIED',
        },
        data: {
          status: 'REJECTED',
        },
      });
    }

    // Create APPLICATION_ACCEPTED notification for accepted developer
    await createNotification({
      client: tx,
      userId: application.developerUserId,
      actorUserId: userId,
      taskId: task.id,
      type: 'APPLICATION_ACCEPTED',
      payload: buildTaskNotificationPayload({
        taskId: task.id,
        applicationId: applicationId,
      }),
    });

    // Create APPLICATION_REJECTED notifications for other developers
    for (const otherApp of otherApplications) {
      await createNotification({
        client: tx,
        userId: otherApp.developerUserId,
        actorUserId: userId,
        taskId: task.id,
        type: 'APPLICATION_REJECTED',
        payload: buildTaskNotificationPayload({
          taskId: task.id,
          applicationId: otherApp.id,
        }),
      });
    }

    return {
      task_id: task.id,
      accepted_application_id: applicationId,
      task_status: 'IN_PROGRESS',
      accepted_developer_user_id: application.developerUserId,
      company_user_id: task.ownerUserId,
    };
  });

  // Create chat thread after transaction (outside transaction scope)
  // Failure to create thread should not break the accept transaction
  const thread = await getOrCreateChatThread({
    taskId: result.task_id,
    companyUserId: result.company_user_id,
    developerUserId: result.accepted_developer_user_id,
  });

  // Send email notification to accepted developer
  const developedUser = await prisma.user.findUnique({
    where: { id: result.accepted_developer_user_id },
    select: {
      id: true,
      email: true,
      emailVerified: true,
      developerProfile: {
        select: { displayName: true },
      },
    },
  });

  const task = await prisma.task.findUnique({
    where: { id: result.task_id },
    select: { id: true, title: true },
  });

  if (developedUser && task) {
    await sendImportantNotificationEmail({
      type: 'APPLICATION_ACCEPTED',
      recipient: {
        email: developedUser.email,
        name: developedUser.developerProfile?.displayName || 'Developer',
        email_verified: developedUser.emailVerified,
      },
      task: {
        id: task.id,
        title: task.title,
      },
    });
  }

  return {
    ...result,
    thread_id: thread?.id ?? null,
  };
}

export async function rejectApplication({ userId, applicationId }) {
  const result = await prisma.$transaction(async (tx) => {
    const application = await tx.application.findUnique({
      where: { id: applicationId },
      include: {
        task: {
          select: {
            id: true,
            ownerUserId: true,
          },
        },
      },
    });

    if (!application) {
      throw new ApiError(404, 'NOT_FOUND', 'Application not found');
    }

    if (application.task.ownerUserId !== userId) {
      throw new ApiError(403, 'NOT_OWNER', 'User is not the task owner');
    }

    if (application.status !== 'APPLIED') {
      throw new ApiError(409, 'INVALID_STATE', 'Application already processed');
    }

    const updatedApplication = await tx.application.update({
      where: { id: applicationId },
      data: {
        status: 'REJECTED',
      },
    });

    await createNotification({
      client: tx,
      userId: application.developerUserId,
      actorUserId: userId,
      taskId: application.task.id,
      type: 'APPLICATION_REJECTED',
      payload: buildTaskNotificationPayload({
        taskId: application.task.id,
        applicationId: applicationId,
      }),
    });

    return {
      application_id: updatedApplication.id,
      status: updatedApplication.status,
      updated_at: updatedApplication.updatedAt.toISOString(),
    };
  });

  return result;
}

export async function requestTaskCompletion({ userId, taskId }) {
  const result = await prisma.$transaction(async (tx) => {
    const task = await tx.task.findUnique({
      where: { id: taskId },
      select: {
        id: true,
        ownerUserId: true,
        status: true,
        deletedAt: true,
        acceptedApplicationId: true,
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

    if (task.status !== 'IN_PROGRESS') {
      throw new ApiError(409, 'INVALID_STATE', 'Task is not in IN_PROGRESS status');
    }

    if (!task.acceptedApplicationId || task.acceptedApplication?.developerUserId !== userId) {
      throw new ApiError(403, 'FORBIDDEN', 'Only accepted developer can request completion');
    }

    const updated = await tx.task.update({
      where: { id: taskId },
      data: {
        status: 'COMPLETION_REQUESTED',
      },
      select: { id: true, title: true, status: true },
    });

    await createNotification({
      client: tx,
      userId: task.ownerUserId,
      actorUserId: userId,
      taskId: task.id,
      type: 'COMPLETION_REQUESTED',
      payload: {
        task_id: task.id,
      },
    });

    return {
      taskId: updated.id,
      taskTitle: updated.title,
      status: updated.status,
      companyUserId: task.ownerUserId,
    };
  });

  // Send email notification to company owner after transaction
  const companyUser = await prisma.user.findUnique({
    where: { id: result.companyUserId },
    select: {
      id: true,
      email: true,
      emailVerified: true,
      companyProfile: {
        select: { companyName: true },
      },
    },
  });

  if (companyUser) {
    await sendImportantNotificationEmail({
      type: 'COMPLETION_REQUESTED',
      recipient: {
        email: companyUser.email,
        name: companyUser.companyProfile?.companyName || 'Company',
        email_verified: companyUser.emailVerified,
      },
      task: {
        id: result.taskId,
        title: result.taskTitle,
      },
    });
  }

  return { taskId: result.taskId, status: result.status };
}

export async function rejectTaskCompletion({ userId, taskId, feedback }) {
  const result = await prisma.$transaction(async (tx) => {
    const task = await tx.task.findUnique({
      where: { id: taskId },
      select: {
        id: true,
        title: true,
        ownerUserId: true,
        status: true,
        deletedAt: true,
        rejectionCount: true,
        acceptedApplicationId: true,
        acceptedApplication: {
          select: {
            developerUserId: true,
          },
        },
        chatThread: {
          select: {
            id: true,
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

    if (task.status !== 'COMPLETION_REQUESTED') {
      throw new ApiError(409, 'INVALID_STATE', 'Task is not awaiting completion confirmation');
    }

    if (!task.acceptedApplicationId || !task.acceptedApplication?.developerUserId) {
      throw new ApiError(409, 'INVALID_STATE', 'Accepted developer not found');
    }

    const newRejectionCount = task.rejectionCount + 1;
    const maxRejections = 3;
    const isFinalRejection = newRejectionCount >= maxRejections;

    // Update task status based on rejection count
    const updateData = {
      rejectionCount: newRejectionCount,
    };

    if (isFinalRejection) {
      updateData.status = 'FAILED';
      updateData.failedAt = new Date();
    } else {
      updateData.status = 'IN_PROGRESS';
    }

    const updated = await tx.task.update({
      where: { id: taskId },
      data: updateData,
      select: {
        id: true,
        title: true,
        status: true,
        rejectionCount: true,
        failedAt: true,
        projectId: true,
      },
    });

    // Check if all talents are now used when task fails (completed + failed == max_talents)
    if (isFinalRejection && updated.projectId) {
      const project = await tx.project.findUnique({
        where: { id: updated.projectId },
        select: { id: true, maxTalents: true, status: true },
      });

      if (project && project.status === 'ACTIVE') {
        const completedCount = await tx.task.count({
          where: {
            projectId: updated.projectId,
            status: 'COMPLETED',
            deletedAt: null,
          },
        });

        const failedCount = await tx.task.count({
          where: {
            projectId: updated.projectId,
            status: 'FAILED',
            deletedAt: null,
          },
        });

        // Archive project if all talents used
        if (completedCount + failedCount >= project.maxTalents) {
          await tx.project.update({
            where: { id: updated.projectId },
            data: { status: 'ARCHIVED' },
          });
        }
      }
    }

    // Send feedback message to chat thread
    if (task.chatThread?.id) {
      const messageText = isFinalRejection
        ? `❌ **Completion Rejected (Final)**: After ${maxRejections} attempts, this task has been marked as FAILED.\n\n${feedback || 'No additional feedback provided.'}`
        : `⚠️ **Completion Rejected (Attempt ${newRejectionCount}/${maxRejections})**: Please review the feedback and resubmit.\n\n${feedback || 'No additional feedback provided.'}`;

      await tx.chatMessage.create({
        data: {
          thread: {
            connect: { id: task.chatThread.id },
          },
          sender: {
            connect: { id: userId },
          },
          text: messageText,
          sentAt: new Date(),
        },
      });

      // Update thread's lastMessageAt
      await tx.chatThread.update({
        where: { id: task.chatThread.id },
        data: { lastMessageAt: new Date() },
      });
    }

    // Create notification for developer
    const notificationType = isFinalRejection ? 'TASK_COMPLETED' : 'COMPLETION_REQUESTED';
    await createNotification({
      client: tx,
      userId: task.acceptedApplication.developerUserId,
      actorUserId: userId,
      taskId: task.id,
      type: notificationType,
      payload: {
        task_id: task.id,
        status: updated.status,
        rejection_count: updated.rejectionCount,
        is_final: isFinalRejection,
        ...(isFinalRejection && { failed_at: updated.failedAt.toISOString() }),
      },
    });

    return {
      taskId: updated.id,
      taskTitle: updated.title,
      status: updated.status,
      rejectionCount: updated.rejectionCount,
      isFinalRejection,
      failedAt: updated.failedAt,
      developerUserId: task.acceptedApplication.developerUserId,
    };
  });

  return {
    taskId: result.taskId,
    status: result.status,
    rejectionCount: result.rejectionCount,
    isFinalRejection: result.isFinalRejection,
  };
}

export async function confirmTaskCompletion({ userId, taskId }) {
  const result = await prisma.$transaction(async (tx) => {
    const task = await tx.task.findUnique({
      where: { id: taskId },
      select: {
        id: true,
        ownerUserId: true,
        status: true,
        deletedAt: true,
        acceptedApplicationId: true,
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

    if (task.status !== 'COMPLETION_REQUESTED') {
      throw new ApiError(409, 'INVALID_STATE', 'Task is not awaiting completion confirmation');
    }

    if (!task.acceptedApplicationId || !task.acceptedApplication?.developerUserId) {
      throw new ApiError(409, 'INVALID_STATE', 'Accepted developer not found');
    }

    const completedAt = new Date();

    const updated = await tx.task.update({
      where: { id: taskId },
      data: {
        status: 'COMPLETED',
        completedAt,
      },
      select: { id: true, title: true, status: true, completedAt: true, projectId: true },
    });

    // Check if all talents are now used (completed + failed == max_talents)
    if (updated.projectId) {
      const project = await tx.project.findUnique({
        where: { id: updated.projectId },
        select: { id: true, maxTalents: true, status: true },
      });

      if (project && project.status === 'ACTIVE') {
        const completedCount = await tx.task.count({
          where: {
            projectId: updated.projectId,
            status: 'COMPLETED',
            deletedAt: null,
          },
        });

        const failedCount = await tx.task.count({
          where: {
            projectId: updated.projectId,
            status: 'FAILED',
            deletedAt: null,
          },
        });

        // Archive project if all talents used
        if (completedCount + failedCount >= project.maxTalents) {
          await tx.project.update({
            where: { id: updated.projectId },
            data: { status: 'ARCHIVED' },
          });
        }
      }
    }

    await createNotification({
      client: tx,
      userId: task.acceptedApplication.developerUserId,
      actorUserId: userId,
      taskId: task.id,
      type: 'TASK_COMPLETED',
      payload: {
        task_id: task.id,
        completed_at: updated.completedAt.toISOString(),
      },
    });

    return {
      taskId: updated.id,
      taskTitle: updated.title,
      status: updated.status,
      completedAt: updated.completedAt,
      developerUserId: task.acceptedApplication.developerUserId,
    };
  });

  // Send email notification to developer after transaction
  const developerUser = await prisma.user.findUnique({
    where: { id: result.developerUserId },
    select: {
      id: true,
      email: true,
      emailVerified: true,
      developerProfile: {
        select: { displayName: true },
      },
    },
  });

  if (developerUser) {
    await sendImportantNotificationEmail({
      type: 'TASK_COMPLETED',
      recipient: {
        email: developerUser.email,
        name: developerUser.developerProfile?.displayName || 'Developer',
        email_verified: developerUser.emailVerified,
      },
      task: {
        id: result.taskId,
        title: result.taskTitle,
      },
    });
  }

  return {
    taskId: result.taskId,
    status: result.status,
    completedAt: result.completedAt,
  };
}

export async function createReview({ userId, taskId, review }) {
  const result = await prisma.$transaction(async (tx) => {
    const task = await tx.task.findUnique({
      where: { id: taskId },
      select: {
        id: true,
        ownerUserId: true,
        status: true,
        deletedAt: true,
        acceptedApplicationId: true,
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

    if (task.status !== 'COMPLETED' && task.status !== 'FAILED') {
      throw new ApiError(409, 'INVALID_STATE', 'Task is not completed or failed');
    }

    // Check if author is a task participant
    const isOwner = task.ownerUserId === userId;
    const isDeveloper = task.acceptedApplication?.developerUserId === userId;

    if (!isOwner && !isDeveloper) {
      throw new ApiError(403, 'FORBIDDEN', 'User is not a participant in this task');
    }

    if (!task.acceptedApplicationId || !task.acceptedApplication?.developerUserId) {
      throw new ApiError(409, 'INVALID_STATE', 'Accepted developer not found');
    }

    // Determine target user (the other participant)
    const targetUserId = isOwner ? task.acceptedApplication.developerUserId : task.ownerUserId;

    // Check if review already exists from this author
    const existingReview = await tx.review.findUnique({
      where: {
        taskId_authorUserId: {
          taskId: task.id,
          authorUserId: userId,
        },
      },
    });

    if (existingReview) {
      throw new ApiError(409, 'ALREADY_REVIEWED', 'User has already reviewed this task');
    }

    const created = await tx.review.create({
      data: {
        taskId: task.id,
        authorUserId: userId,
        targetUserId,
        rating: review.rating,
        text: review.text || null,
      },
      select: {
        id: true,
        taskId: true,
        authorUserId: true,
        targetUserId: true,
        rating: true,
        text: true,
        createdAt: true,
      },
    });

    await createNotification({
      client: tx,
      userId: targetUserId,
      actorUserId: userId,
      taskId: task.id,
      type: 'REVIEW_CREATED',
      payload: {
        review_id: created.id,
        task_id: created.taskId,
        rating: created.rating,
      },
    });

    return {
      reviewId: created.id,
      taskId: created.taskId,
      authorUserId: created.authorUserId,
      targetUserId: created.targetUserId,
      rating: created.rating,
      text: created.text,
      createdAt: created.createdAt,
    };
  });

  return result;
}

/**
 * Get tasks for a specific project with pagination and filtering
 */
export async function getProjectTasks({
  projectId,
  userId,
  page = 1,
  size = 20,
  status,
  includeDeleted = false,
}) {
  const skip = (page - 1) * size;

  // Check if project exists
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { id: true, ownerUserId: true, visibility: true, deletedAt: true },
  });

  if (!project || project.deletedAt) {
    throw new ApiError(404, 'NOT_FOUND', 'Project not found');
  }

  // Determine if user is owner
  const isOwner = userId && project.ownerUserId === userId;

  // Check if include_deleted was requested by non-owner
  if (includeDeleted && !isOwner) {
    throw new ApiError(403, 'NOT_OWNER', 'Only project owner can view deleted tasks');
  }

  // Build where clause
  const where = { projectId };

  if (isOwner) {
    // Owner can see all tasks (optionally including deleted)
    if (!includeDeleted) {
      where.deletedAt = null;
    }
  } else {
    // Public view: only PUBLISHED + PUBLIC + not deleted
    where.status = 'PUBLISHED';
    where.visibility = 'PUBLIC';
    where.deletedAt = null;
  }

  // Optional status filter
  if (status) {
    where.status = status;
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
