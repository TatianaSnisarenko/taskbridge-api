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
