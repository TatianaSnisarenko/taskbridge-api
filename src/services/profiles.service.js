import { prisma } from '../db/prisma.js';
import { ApiError } from '../utils/ApiError.js';

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
