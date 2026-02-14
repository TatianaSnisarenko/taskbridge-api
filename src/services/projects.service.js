import { prisma } from '../db/prisma.js';

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
  const created = await prisma.project.create({
    data: {
      ownerUserId: userId,
      ...mapProjectInput(project),
    },
    select: { id: true, createdAt: true },
  });

  return { projectId: created.id, createdAt: created.createdAt };
}
