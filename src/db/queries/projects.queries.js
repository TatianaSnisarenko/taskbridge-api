import { prisma } from '../prisma.js';
import { ApiError } from '../../utils/ApiError.js';

export async function findProjectForOwnership(projectId, userId, options = {}) {
  const defaultSelect = {
    id: true,
    ownerUserId: true,
    deletedAt: true,
  };

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { ...defaultSelect, ...options.select },
  });

  if (!project || project.deletedAt) {
    throw new ApiError(404, 'NOT_FOUND', 'Project not found');
  }

  if (project.ownerUserId !== userId) {
    throw new ApiError(403, 'NOT_OWNER', 'Project does not belong to user');
  }

  return project;
}

export async function findProjectWithDetails(projectId) {
  return prisma.project.findUnique({
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
}

export async function findProjectForReport(projectId) {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { id: true, deletedAt: true },
  });

  if (!project || project.deletedAt) {
    throw new ApiError(404, 'NOT_FOUND', 'Project not found');
  }

  return project;
}

export async function findProjectsCatalog(filters, pagination) {
  const { where, orderBy } = buildProjectCatalogQuery(filters);
  const { skip, take } = pagination;

  const [projects, total] = await prisma.$transaction([
    prisma.project.findMany({
      where,
      skip,
      take,
      orderBy,
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

  return { projects, total };
}

function buildProjectCatalogQuery(filters = {}) {
  const { userId, search, visibility, owner, includeDeleted, status = 'ACTIVE' } = filters;

  const isOwnerQuery = owner === true || owner === 'true';

  const where = {};

  if (isOwnerQuery) {
    where.ownerUserId = userId;
  }

  if (!includeDeleted) {
    where.deletedAt = null;
  }

  if (visibility) {
    where.visibility = visibility;
  } else if (!isOwnerQuery) {
    where.visibility = 'PUBLIC';
  }

  if (search) {
    where.OR = [
      { title: { contains: search, mode: 'insensitive' } },
      { shortDescription: { contains: search, mode: 'insensitive' } },
    ];
  }

  if (!isOwnerQuery && status) {
    where.status = status;
  }

  return { where, orderBy: { createdAt: 'desc' } };
}
