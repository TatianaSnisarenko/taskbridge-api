import { prisma } from '../../db/prisma.js';
import { ApiError } from '../../utils/ApiError.js';
import { findTaskWithDetails } from '../../db/queries/tasks.queries.js';
import { mapTaskDetailsOutput } from './helpers.js';
import {
  getCachedPublicTasksCatalog,
  setCachedPublicTasksCatalog,
} from '../../cache/tasks-catalog.js';

export async function getTaskById({ userId, taskId, persona }) {
  const task = await findTaskWithDetails(taskId);

  if (!task) {
    throw new ApiError(404, 'NOT_FOUND', 'Task not found');
  }

  if (task.deletedAt || task.status === 'DELETED') {
    throw new ApiError(404, 'NOT_FOUND', 'Task not found');
  }

  const isPublicVisible = task.status === 'PUBLISHED' && task.visibility === 'PUBLIC';
  const isOwner = !!userId && task.ownerUserId === userId;
  const isAcceptedDeveloper = !!userId && task.acceptedApplication?.developerUserId === userId;

  if (!isPublicVisible) {
    if (!userId) {
      throw new ApiError(401, 'AUTH_REQUIRED', 'Authorization required');
    }

    // Allow access if user is owner or accepted developer
    if (!isOwner && !isAcceptedDeveloper) {
      throw new ApiError(403, 'FORBIDDEN', 'Access denied');
    }

    if (!persona) {
      throw new ApiError(400, 'PERSONA_REQUIRED', 'X-Persona header is required');
    }

    if (persona !== 'developer' && persona !== 'company') {
      throw new ApiError(400, 'PERSONA_INVALID', 'X-Persona must be developer or company');
    }

    // Check persona requirements: owner needs company, developer needs developer persona
    if (isOwner) {
      if (persona !== 'company') {
        throw new ApiError(
          403,
          'PERSONA_NOT_AVAILABLE',
          'Only company persona allowed for task owner'
        );
      }

      if (!task.owner.companyProfile) {
        throw new ApiError(403, 'PERSONA_NOT_AVAILABLE', 'Company profile does not exist');
      }
    }

    if (isAcceptedDeveloper) {
      if (persona !== 'developer') {
        throw new ApiError(
          403,
          'PERSONA_NOT_AVAILABLE',
          'Only developer persona allowed for accepted developers'
        );
      }
    }
  }

  const applicationsCount = await prisma.application.count({
    where: { taskId: task.id },
  });

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
  const isPublicCatalog = !owner && !includeDeleted;

  if (isPublicCatalog) {
    const cached = await getCachedPublicTasksCatalog({
      page,
      size,
      search,
      category,
      difficulty,
      type,
      technology_ids,
      tech_match,
      projectId,
    });
    if (cached) {
      return cached;
    }
  }

  const where = {};

  if (owner) {
    if (!userId) {
      throw new ApiError(401, 'AUTH_REQUIRED', 'Authorization required');
    }
    where.ownerUserId = userId;
    if (!includeDeleted) {
      where.deletedAt = null;
    }
  } else {
    where.status = 'PUBLISHED';
    where.visibility = 'PUBLIC';
    where.deletedAt = null;
  }

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

  if (technology_ids.length > 0) {
    if (tech_match === 'ALL') {
      where.technologies = {
        every: {
          technologyId: { in: technology_ids },
        },
      };
    } else {
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
        deadline: true,
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

  const result = {
    items: items.map((task) => ({
      task_id: task.id,
      title: task.title,
      status: task.status,
      category: task.category,
      type: task.type,
      difficulty: task.difficulty,
      deadline: task.deadline ? task.deadline.toISOString().slice(0, 10) : null,
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

  if (isPublicCatalog) {
    await setCachedPublicTasksCatalog(
      {
        page,
        size,
        search,
        category,
        difficulty,
        type,
        technology_ids,
        tech_match,
        projectId,
      },
      result
    );
  }

  return result;
}

export async function getProjectTasks({
  projectId,
  userId,
  page = 1,
  size = 20,
  status,
  includeDeleted = false,
}) {
  const skip = (page - 1) * size;

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { id: true, ownerUserId: true, visibility: true, deletedAt: true },
  });

  if (!project || project.deletedAt) {
    throw new ApiError(404, 'NOT_FOUND', 'Project not found');
  }

  const isOwner = userId && project.ownerUserId === userId;

  if (includeDeleted && !isOwner) {
    throw new ApiError(403, 'NOT_OWNER', 'Only project owner can view deleted tasks');
  }

  const where = { projectId };

  if (isOwner) {
    if (!includeDeleted) {
      where.deletedAt = null;
    }
  } else {
    where.status = 'PUBLISHED';
    where.visibility = 'PUBLIC';
    where.deletedAt = null;
  }

  if (status) {
    where.status = status;
  }

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
        deadline: true,
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
      deadline: task.deadline ? task.deadline.toISOString().slice(0, 10) : null,
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
