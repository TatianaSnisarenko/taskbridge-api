import { prisma } from '../db/prisma.js';
import { ApiError } from '../utils/ApiError.js';
import { validateTechnologyIds, incrementTechnologyPopularity } from './technologies.service.js';

function mapProjectInput(input) {
  return {
    title: input.title,
    shortDescription: input.short_description,
    description: input.description,
    visibility: input.visibility,
    status: input.status,
    maxTalents: input.max_talents,
  };
}

export async function createProject({ userId, project }) {
  const existing = await prisma.project.findFirst({
    where: { ownerUserId: userId, title: project.title },
    select: { id: true },
  });
  if (existing) {
    throw new ApiError(409, 'PROJECT_TITLE_EXISTS', 'Project title already exists');
  }

  const technologyIds = await validateTechnologyIds(project.technology_ids || []);

  const created = await prisma.$transaction(async (tx) => {
    const createdProject = await tx.project.create({
      data: {
        ownerUserId: userId,
        ...mapProjectInput(project),
      },
      select: { id: true, createdAt: true },
    });

    if (technologyIds.length > 0) {
      await tx.projectTechnology.createMany({
        data: technologyIds.map((technologyId) => ({
          projectId: createdProject.id,
          technologyId,
          isRequired: false,
        })),
        skipDuplicates: true,
      });
    }

    return createdProject;
  });

  // Increment popularity
  if (technologyIds.length > 0) {
    await incrementTechnologyPopularity(technologyIds);
  }

  return { projectId: created.id, createdAt: created.createdAt };
}

export async function updateProject({ userId, projectId, project }) {
  const existing = await prisma.project.findUnique({
    where: { id: projectId },
    select: { id: true, ownerUserId: true },
  });
  if (!existing) {
    throw new ApiError(404, 'NOT_FOUND', 'Project not found');
  }
  if (existing.ownerUserId !== userId) {
    throw new ApiError(403, 'NOT_OWNER', 'Project does not belong to user');
  }

  const duplicate = await prisma.project.findFirst({
    where: {
      ownerUserId: userId,
      title: project.title,
      id: { not: projectId },
    },
    select: { id: true },
  });
  if (duplicate) {
    throw new ApiError(409, 'PROJECT_TITLE_EXISTS', 'Project title already exists');
  }

  const hasTechnologyIds = Array.isArray(project.technology_ids);
  const technologyIds = hasTechnologyIds
    ? await validateTechnologyIds(project.technology_ids || [])
    : null;

  const updated = await prisma.$transaction(async (tx) => {
    const updatedProject = await tx.project.update({
      where: { id: projectId },
      data: mapProjectInput(project),
      select: { id: true, updatedAt: true },
    });

    if (hasTechnologyIds) {
      await tx.projectTechnology.deleteMany({ where: { projectId } });

      if (technologyIds.length > 0) {
        await tx.projectTechnology.createMany({
          data: technologyIds.map((technologyId) => ({
            projectId,
            technologyId,
            isRequired: false,
          })),
          skipDuplicates: true,
        });
      }
    }

    return updatedProject;
  });

  // Increment popularity
  if (hasTechnologyIds && technologyIds.length > 0) {
    await incrementTechnologyPopularity(technologyIds);
  }

  return { projectId: updated.id, updated: true, updatedAt: updated.updatedAt };
}

export async function deleteProject({ userId, projectId }) {
  const existing = await prisma.project.findUnique({
    where: { id: projectId },
    select: { id: true, ownerUserId: true },
  });
  if (!existing) {
    throw new ApiError(404, 'NOT_FOUND', 'Project not found');
  }
  if (existing.ownerUserId !== userId) {
    throw new ApiError(403, 'NOT_OWNER', 'Project does not belong to user');
  }

  const deletedAt = new Date();
  const [updated] = await prisma.$transaction([
    prisma.project.update({
      where: { id: projectId },
      data: { deletedAt, status: 'ARCHIVED' },
      select: { id: true, deletedAt: true },
    }),
    prisma.task.updateMany({
      where: { projectId, deletedAt: null },
      data: { deletedAt, status: 'DELETED' },
    }),
  ]);

  return { projectId: updated.id, deletedAt: updated.deletedAt };
}

function mapProjectOutput(project) {
  return {
    project_id: project.id,
    title: project.title,
    short_description: project.shortDescription,
    technologies: project.technologies
      ? project.technologies.map((pt) => ({
          id: pt.technology.id,
          slug: pt.technology.slug,
          name: pt.technology.name,
          type: pt.technology.type,
          is_required: pt.isRequired,
        }))
      : undefined,
    visibility: project.visibility,
    status: project.status,
    max_talents: project.maxTalents,
    created_at: project.createdAt.toISOString(),
    company: {
      user_id: project.owner.id,
      company_name: project.owner.companyProfile.companyName,
      verified: project.owner.companyProfile.verified,
      avg_rating: Number(project.owner.companyProfile.avgRating),
      reviews_count: project.owner.companyProfile.reviewsCount,
    },
  };
}

function buildTaskSummary(groups) {
  const summary = {
    total: 0,
    draft: 0,
    published: 0,
    in_progress: 0,
    completed: 0,
    closed: 0,
  };

  for (const group of groups) {
    const count = group._count?._all ?? 0;
    summary.total += count;
    switch (group.status) {
      case 'DRAFT':
        summary.draft += count;
        break;
      case 'PUBLISHED':
        summary.published += count;
        break;
      case 'IN_PROGRESS':
      case 'COMPLETION_REQUESTED':
        summary.in_progress += count;
        break;
      case 'COMPLETED':
        summary.completed += count;
        break;
      case 'CLOSED':
        summary.closed += count;
        break;
      default:
        break;
    }
  }

  return summary;
}

function mapProjectDetailsOutput(project, taskSummary, tasksPreview) {
  return {
    project_id: project.id,
    owner_user_id: project.ownerUserId,
    title: project.title,
    short_description: project.shortDescription,
    description: project.description,
    technologies: project.technologies
      ? project.technologies.map((pt) => ({
          id: pt.technology.id,
          slug: pt.technology.slug,
          name: pt.technology.name,
          type: pt.technology.type,
          is_required: pt.isRequired,
        }))
      : undefined,
    visibility: project.visibility,
    status: project.status,
    max_talents: project.maxTalents,
    created_at: project.createdAt.toISOString(),
    updated_at: project.updatedAt.toISOString(),
    deleted_at: project.deletedAt ? project.deletedAt.toISOString() : null,
    company: {
      user_id: project.owner.id,
      company_name: project.owner.companyProfile.companyName,
      verified: project.owner.companyProfile.verified,
      avg_rating: Number(project.owner.companyProfile.avgRating),
      reviews_count: project.owner.companyProfile.reviewsCount,
    },
    tasks_summary: taskSummary,
    tasks_preview: tasksPreview,
  };
}

export async function getProjects({ userId, query }) {
  // eslint-disable-next-line no-unused-vars
  const { page = 1, size = 20, search, technology, visibility, owner, include_deleted } = query;

  const isOwnerQuery = owner === true || owner === 'true';
  const includeDeleted = include_deleted === true || include_deleted === 'true';

  // Only owner can see deleted and filter by owner
  if (includeDeleted && !isOwnerQuery) {
    throw new ApiError(403, 'FORBIDDEN', 'Only owner can include deleted projects');
  }

  const where = {};

  // Owner filter
  if (isOwnerQuery) {
    where.ownerUserId = userId;
  }

  // Deleted filter
  if (!includeDeleted) {
    where.deletedAt = null;
  }

  // Visibility filter
  if (visibility) {
    where.visibility = visibility;
  } else if (!isOwnerQuery) {
    // Default to PUBLIC for public catalog
    where.visibility = 'PUBLIC';
  }

  // Search filter
  if (search) {
    where.OR = [
      { title: { contains: search, mode: 'insensitive' } },
      { shortDescription: { contains: search, mode: 'insensitive' } },
    ];
  }

  // Status filter: public catalog shows only ACTIVE projects
  // Owner queries show all projects regardless of status
  if (!isOwnerQuery) {
    where.status = 'ACTIVE';
  }

  const skip = (page - 1) * size;

  const [items, total] = await prisma.$transaction([
    prisma.project.findMany({
      where,
      skip,
      take: size,
      orderBy: { createdAt: 'desc' },
      include: {
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
        owner: {
          select: {
            id: true,
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
    }),
    prisma.project.count({ where }),
  ]);

  return {
    items: items.map(mapProjectOutput),
    page,
    size: Number(size),
    total,
  };
}

export async function getProjectById({ userId, projectId, includeDeleted, previewLimit }) {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
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
      owner: {
        select: {
          id: true,
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

export async function reportProject({ userId, persona, projectId, report }) {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { id: true, deletedAt: true },
  });

  if (!project || project.deletedAt) {
    throw new ApiError(404, 'NOT_FOUND', 'Project not found');
  }

  try {
    const created = await prisma.projectReport.create({
      data: {
        projectId,
        reporterUserId: userId,
        reporterPersona: persona,
        reason: report.reason,
        comment: report.comment || '',
      },
      select: { id: true, createdAt: true },
    });

    return { reportId: created.id, createdAt: created.createdAt };
  } catch (error) {
    if (error.code === 'P2002') {
      throw new ApiError(409, 'ALREADY_REPORTED', 'You have already reported this project');
    }
    throw error;
  }
}
