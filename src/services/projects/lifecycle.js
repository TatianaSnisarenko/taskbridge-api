import { prisma } from '../../db/prisma.js';
import { ApiError } from '../../utils/ApiError.js';
import { findProjectForOwnership } from '../../db/queries/projects.queries.js';
import { validateTechnologyIds, incrementTechnologyPopularity } from '../technologies/index.js';
import { mapProjectInput } from './helpers.js';

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
  await findProjectForOwnership(projectId, userId);

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
  await findProjectForOwnership(projectId, userId);

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
