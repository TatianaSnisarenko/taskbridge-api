import { prisma } from '../db/prisma.js';
import { ApiError } from '../utils/ApiError.js';
import sharp from 'sharp';
import { uploadImage, deleteImage } from '../utils/cloudinary.js';

function mapDeveloperProfileInput(input) {
  return {
    displayName: input.display_name,
    jobTitle: input.primary_role,
    bio: input.bio,
    experienceLevel: input.experience_level,
    location: input.location,
    timezone: input.timezone,
    skills: input.skills,
    techStack: input.tech_stack,
    availability: input.availability,
    preferredTaskCategories: input.preferred_task_categories,
    portfolioUrl: input.portfolio_url,
    githubUrl: input.github_url,
    linkedinUrl: input.linkedin_url,
  };
}

function mapCompanyProfileInput(input) {
  return {
    companyName: input.company_name,
    companyType: input.company_type,
    description: input.description,
    teamSize: input.team_size,
    country: input.country,
    timezone: input.timezone,
    contactEmail: input.contact_email,
    websiteUrl: input.website_url,
    links: input.links,
  };
}

function toNumber(value) {
  if (value === null || value === undefined) return null;
  if (typeof value === 'number') return value;
  if (typeof value?.toNumber === 'function') return value.toNumber();
  return Number(value);
}

function mapDeveloperProfileOutput(profile) {
  return {
    user_id: profile.userId,
    display_name: profile.displayName,
    primary_role: profile.jobTitle,
    bio: profile.bio,
    experience_level: profile.experienceLevel,
    location: profile.location,
    timezone: profile.timezone,
    skills: profile.skills,
    tech_stack: profile.techStack,
    portfolio_url: profile.portfolioUrl,
    github_url: profile.githubUrl,
    linkedin_url: profile.linkedinUrl,
    avatar_url: profile.avatarUrl,
    avg_rating: toNumber(profile.avgRating),
    reviews_count: profile.reviewsCount,
  };
}

function mapCompanyProfileOutput(profile) {
  return {
    user_id: profile.userId,
    company_name: profile.companyName,
    company_type: profile.companyType,
    description: profile.description,
    team_size: profile.teamSize,
    country: profile.country,
    timezone: profile.timezone,
    website_url: profile.websiteUrl,
    links: profile.links,
    verified: profile.verified,
    avg_rating: toNumber(profile.avgRating),
    reviews_count: profile.reviewsCount,
  };
}

export async function createDeveloperProfile({ userId, profile }) {
  const existing = await prisma.developerProfile.findUnique({ where: { userId } });
  if (existing) {
    throw new ApiError(409, 'PROFILE_ALREADY_EXISTS', 'Developer profile already exists');
  }

  await prisma.developerProfile.create({
    data: {
      userId,
      ...mapDeveloperProfileInput(profile),
    },
  });

  return { userId, created: true };
}

export async function updateDeveloperProfile({ userId, profile }) {
  const existing = await prisma.developerProfile.findUnique({ where: { userId } });
  if (!existing) {
    throw new ApiError(404, 'PROFILE_NOT_FOUND', 'Developer profile not found');
  }

  const updated = await prisma.developerProfile.update({
    where: { userId },
    data: mapDeveloperProfileInput(profile),
    select: { userId: true, updatedAt: true },
  });

  return { userId: updated.userId, updated: true, updatedAt: updated.updatedAt };
}

export async function getDeveloperProfileByUserId({ userId }) {
  const profile = await prisma.developerProfile.findUnique({ where: { userId } });
  if (!profile) {
    throw new ApiError(404, 'PROFILE_NOT_FOUND', 'Developer profile not found');
  }

  return mapDeveloperProfileOutput(profile);
}

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
  const existing = await prisma.companyProfile.findUnique({ where: { userId } });
  if (!existing) {
    throw new ApiError(404, 'PROFILE_NOT_FOUND', 'Company profile not found');
  }

  const updated = await prisma.companyProfile.update({
    where: { userId },
    data: mapCompanyProfileInput(profile),
    select: { userId: true, updatedAt: true },
  });

  return { userId: updated.userId, updated: true, updatedAt: updated.updatedAt };
}

export async function getCompanyProfileByUserId({ userId }) {
  const profile = await prisma.companyProfile.findUnique({ where: { userId } });
  if (!profile) {
    throw new ApiError(404, 'PROFILE_NOT_FOUND', 'Company profile not found');
  }

  return mapCompanyProfileOutput(profile);
}

export async function getUserReviews({ userId, page = 1, size = 20 }) {
  // Validate user exists
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true },
  });

  if (!user) {
    throw new ApiError(404, 'USER_NOT_FOUND', 'User not found');
  }

  const skip = (page - 1) * size;

  const [reviews, total] = await Promise.all([
    prisma.review.findMany({
      where: { targetUserId: userId },
      select: {
        id: true,
        taskId: true,
        rating: true,
        text: true,
        createdAt: true,
        author: {
          select: {
            id: true,
            developerProfile: {
              select: {
                displayName: true,
              },
            },
            companyProfile: {
              select: {
                companyName: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: size,
    }),
    prisma.review.count({ where: { targetUserId: userId } }),
  ]);

  const items = reviews.map((review) => ({
    review_id: review.id,
    task_id: review.taskId,
    rating: review.rating,
    text: review.text,
    created_at: review.createdAt.toISOString(),
    author: {
      user_id: review.author.id,
      display_name:
        review.author.developerProfile?.displayName || review.author.companyProfile?.companyName,
      company_name: review.author.companyProfile?.companyName || null,
    },
  }));

  return {
    items,
    page,
    size,
    total,
  };
}

export async function uploadDeveloperAvatar({ userId, file }) {
  // Check profile exists
  const profile = await prisma.developerProfile.findUnique({ where: { userId } });
  if (!profile) {
    throw new ApiError(404, 'PROFILE_NOT_FOUND', 'Developer profile not found');
  }

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
  // Check profile exists
  const profile = await prisma.developerProfile.findUnique({ where: { userId } });
  if (!profile) {
    throw new ApiError(404, 'PROFILE_NOT_FOUND', 'Developer profile not found');
  }

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
