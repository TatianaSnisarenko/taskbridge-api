import { prisma } from '../../db/prisma.js';
import { ApiError } from '../../utils/ApiError.js';
import {
  findCompanyProfileForOwnership,
  findProfileWithReviews,
} from '../../db/queries/profiles.queries.js';
import sharp from 'sharp';
import { uploadImage, deleteImage } from '../../utils/cloudinary.js';
import { mapCompanyProfileInput, mapCompanyProfileOutput } from './helpers.js';

export async function createCompanyProfile({ userId, profile }) {
  const existing = await prisma.companyProfile.findUnique({ where: { userId } });
  if (existing) {
    throw new ApiError(409, 'PROFILE_ALREADY_EXISTS', 'Company profile already exists');
  }

  await prisma.companyProfile.create({
    data: {
      userId,
      ...mapCompanyProfileInput(profile),
    },
  });

  return { userId, created: true };
}

export async function updateCompanyProfile({ userId, profile }) {
  await findCompanyProfileForOwnership(userId, userId);

  const updated = await prisma.companyProfile.update({
    where: { userId },
    data: mapCompanyProfileInput(profile),
    select: { userId: true, updatedAt: true },
  });

  return { userId: updated.userId, updated: true, updatedAt: updated.updatedAt };
}

export async function getCompanyProfileByUserId({ userId }) {
  const profile = await findProfileWithReviews(userId, true);
  if (!profile) {
    throw new ApiError(404, 'PROFILE_NOT_FOUND', 'Company profile not found');
  }

  // Calculate active_projects: count of projects with status=ACTIVE
  const activeProjects = await prisma.project.count({
    where: {
      ownerUserId: userId,
      status: 'ACTIVE',
      deletedAt: null,
    },
  });

  // Calculate projects_completed: count of unique projects with at least one COMPLETED task
  const completedProjectsData = await prisma.task.findMany({
    where: {
      ownerUserId: userId,
      status: 'COMPLETED',
      deletedAt: null,
      projectId: { not: null },
    },
    select: {
      projectId: true,
    },
    distinct: ['projectId'],
  });

  const projectsCompleted = completedProjectsData.length;

  return {
    ...mapCompanyProfileOutput(profile),
    projects_completed: projectsCompleted,
    active_projects: activeProjects,
  };
}

export async function uploadCompanyLogo({ userId, file }) {
  const profile = await findCompanyProfileForOwnership(userId, userId);

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
    folder: 'teamup/company-logos',
    width: 512,
    height: 512,
    crop: 'fill',
    gravity: 'center',
    quality: 'auto',
    fetch_format: 'auto',
  });

  // Delete old logo if exists
  if (profile.logoPublicId) {
    await deleteImage(profile.logoPublicId);
  }

  // Update database
  const updated = await prisma.companyProfile.update({
    where: { userId },
    data: {
      logoUrl: uploadResult.secure_url,
      logoPublicId: uploadResult.public_id,
    },
    select: { userId: true, logoUrl: true, updatedAt: true },
  });

  return {
    userId: updated.userId,
    logoUrl: updated.logoUrl,
    updatedAt: updated.updatedAt,
  };
}

export async function deleteCompanyLogo({ userId }) {
  const profile = await findCompanyProfileForOwnership(userId, userId);

  // Check logo exists
  if (!profile.logoUrl) {
    throw new ApiError(404, 'LOGO_NOT_FOUND', 'Logo not found');
  }

  // Delete from Cloudinary if exists
  if (profile.logoPublicId) {
    await deleteImage(profile.logoPublicId);
  }

  // Update database - set logo fields to null
  const updated = await prisma.companyProfile.update({
    where: { userId },
    data: {
      logoUrl: null,
      logoPublicId: null,
    },
    select: { userId: true, logoUrl: true, updatedAt: true },
  });

  return {
    userId: updated.userId,
    logoUrl: updated.logoUrl,
    updatedAt: updated.updatedAt,
  };
}
