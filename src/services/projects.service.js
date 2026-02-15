import { prisma } from '../db/prisma.js';
import { ApiError } from '../utils/ApiError.js';

function mapProjectInput(input) {
  return {
    title: input.title,
    shortDescription: input.short_description,
    description: input.description,
    technologies: input.technologies,
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

  const created = await prisma.project.create({
    data: {
      ownerUserId: userId,
      ...mapProjectInput(project),
    },
    select: { id: true, createdAt: true },
  });

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

  const updated = await prisma.project.update({
    where: { id: projectId },
    data: mapProjectInput(project),
    select: { id: true, updatedAt: true },
  });

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
      data: { deletedAt, status: 'CLOSED' },
    }),
  ]);

  return { projectId: updated.id, deletedAt: updated.deletedAt };
}

function mapProjectOutput(project) {
  return {
    project_id: project.id,
    title: project.title,
    short_description: project.shortDescription,
    technologies: project.technologies,
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

export async function getProjects({ userId, query }) {
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

  // Technology filter
  if (technology) {
    const techs = Array.isArray(technology) ? technology : [technology];
    where.technologies = { hasSome: techs };
  }

  const skip = (page - 1) * size;

  const [items, total] = await prisma.$transaction([
    prisma.project.findMany({
      where,
      skip,
      take: size,
      orderBy: { createdAt: 'desc' },
      include: {
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
