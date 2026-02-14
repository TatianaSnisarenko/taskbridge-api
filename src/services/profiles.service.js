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
