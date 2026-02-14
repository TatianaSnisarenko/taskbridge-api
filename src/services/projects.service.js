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
