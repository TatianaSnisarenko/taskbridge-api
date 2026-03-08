import { prisma } from '../../db/prisma.js';
import { ApiError } from '../../utils/ApiError.js';
import {
  findDeveloperProfileForOwnership,
  findProfileWithReviews,
} from '../../db/queries/profiles.queries.js';
import sharp from 'sharp';
import { uploadImage, deleteImage } from '../../utils/cloudinary.js';
import { validateTechnologyIds, incrementTechnologyPopularity } from '../technologies/index.js';
import { mapDeveloperProfileInput, mapDeveloperProfileOutput } from './helpers.js';

export async function createDeveloperProfile({ userId, profile }) {
  const existing = await prisma.developerProfile.findUnique({ where: { userId } });
  if (existing) {
    throw new ApiError(409, 'PROFILE_ALREADY_EXISTS', 'Developer profile already exists');
  }

  const technologyIds = await validateTechnologyIds(profile.technology_ids || []);

  await prisma.$transaction(async (tx) => {
    await tx.developerProfile.create({
      data: {
        userId,
        ...mapDeveloperProfileInput(profile),
      },
    });

    if (technologyIds.length > 0) {
      await tx.developerTechnology.createMany({
        data: technologyIds.map((technologyId) => ({
          developerUserId: userId,
          technologyId,
          proficiencyYears: 0,
        })),
        skipDuplicates: true,
      });
    }
  });

  return { userId, created: true };
}

export async function updateDeveloperProfile({ userId, profile }) {
  await findDeveloperProfileForOwnership(userId, userId);

  const hasTechnologyIds = Array.isArray(profile.technology_ids);
  const technologyIds = hasTechnologyIds
    ? await validateTechnologyIds(profile.technology_ids || [])
    : null;

  const updated = await prisma.$transaction(async (tx) => {
    const updatedProfile = await tx.developerProfile.update({
      where: { userId },
      data: mapDeveloperProfileInput(profile),
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
      },
    });

    if (hasTechnologyIds) {
      await tx.developerTechnology.deleteMany({ where: { developerUserId: userId } });

      if (technologyIds.length > 0) {
        await tx.developerTechnology.createMany({
          data: technologyIds.map((technologyId) => ({
            developerUserId: userId,
            technologyId,
            proficiencyYears: 0,
          })),
          skipDuplicates: true,
        });

        // Fetch the updated technologies for response
        const updatedTechnologies = await tx.developerTechnology.findMany({
          where: { developerUserId: userId },
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
        });

        updatedProfile.technologies = updatedTechnologies;
      } else {
        updatedProfile.technologies = [];
      }
    }

    return updatedProfile;
  });

  // Increment popularity
  if (hasTechnologyIds && technologyIds.length > 0) {
    await incrementTechnologyPopularity(technologyIds);
  }

  return {
    user_id: updated.userId,
    updated: true,
    updated_at: updated.updatedAt.toISOString(),
    technologies: updated.technologies
      ? updated.technologies.map((dt) => ({
          id: dt.technology.id,
          slug: dt.technology.slug,
          name: dt.technology.name,
          type: dt.technology.type,
          proficiency_years: dt.proficiencyYears,
        }))
      : undefined,
  };
}

export async function getDeveloperProfileByUserId({ userId }) {
  const profile = await findProfileWithReviews(userId, false);
  if (!profile) {
    throw new ApiError(404, 'PROFILE_NOT_FOUND', 'Developer profile not found');
  }

  // Calculate projects_completed: count of COMPLETED tasks where this developer was accepted
  const projectsCompleted = await prisma.task.count({
    where: {
      status: 'COMPLETED',
      acceptedApplication: {
        developerUserId: userId,
      },
    },
  });

  // Count FAILED tasks where this developer was accepted
  const projectsFailed = await prisma.task.count({
    where: {
      status: 'FAILED',
      acceptedApplication: {
        developerUserId: userId,
      },
    },
  });

  // Calculate success_rate = completed / (completed + failed)
  const totalProjects = projectsCompleted + projectsFailed;
  const successRate = totalProjects > 0 ? projectsCompleted / totalProjects : null;

  return {
    ...mapDeveloperProfileOutput(profile),
    projects_completed: projectsCompleted,
    success_rate: successRate,
  };
}

export async function uploadDeveloperAvatar({ userId, file }) {
  const profile = await findDeveloperProfileForOwnership(userId, userId);

  // Validate image dimensions using sharp
  let metadata;
  try {
    metadata = await sharp(file.buffer).metadata();
  } catch {
    throw new ApiError(400, 'INVALID_FILE_TYPE', 'Invalid image file');
  }

  if (!metadata.width || !metadata.height) {
    throw new ApiError(400, 'INVALID_FILE_TYPE', 'Unable to determine image dimensions');
  }

  if (metadata.width < 512 || metadata.height < 512) {
    throw new ApiError(400, 'IMAGE_TOO_SMALL', 'Image resolution must be at least 512x512 pixels');
  }

  // Upload to Cloudinary
  const uploadResult = await uploadImage(file.buffer, {
    folder: 'teamup/dev-avatars',
    width: 512,
    height: 512,
    crop: 'fill',
    gravity: 'center',
    quality: 'auto',
    fetch_format: 'auto',
  });

  // Delete old avatar if exists
  if (profile.avatarPublicId) {
    await deleteImage(profile.avatarPublicId);
  }

  // Update database
  const updated = await prisma.developerProfile.update({
    where: { userId },
    data: {
      avatarUrl: uploadResult.secure_url,
      avatarPublicId: uploadResult.public_id,
    },
    select: { userId: true, avatarUrl: true, updatedAt: true },
  });

  return {
    userId: updated.userId,
    avatarUrl: updated.avatarUrl,
    updatedAt: updated.updatedAt,
  };
}

export async function deleteDeveloperAvatar({ userId }) {
  const profile = await findDeveloperProfileForOwnership(userId, userId);

  // Check avatar exists
  if (!profile.avatarUrl) {
    throw new ApiError(404, 'AVATAR_NOT_FOUND', 'Avatar not found');
  }

  // Delete from Cloudinary if exists
  if (profile.avatarPublicId) {
    await deleteImage(profile.avatarPublicId);
  }

  // Update database - set avatar fields to null
  const updated = await prisma.developerProfile.update({
    where: { userId },
    data: {
      avatarUrl: null,
      avatarPublicId: null,
    },
    select: { userId: true, avatarUrl: true, updatedAt: true },
  });

  return {
    userId: updated.userId,
    avatarUrl: updated.avatarUrl,
    updatedAt: updated.updatedAt,
  };
}
