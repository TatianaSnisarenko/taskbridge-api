import { prisma } from '../prisma.js';
import { ApiError } from '../../utils/ApiError.js';

export async function findDeveloperProfileForOwnership(userId, requesterId, options = {}) {
  const profile = await prisma.developerProfile.findUnique({
    where: { userId },
    ...buildProfileQueryOptions(options),
  });

  if (!profile) {
    throw new ApiError(404, 'PROFILE_NOT_FOUND', 'Developer profile not found');
  }

  if (requesterId && userId !== requesterId) {
    throw new ApiError(403, 'NOT_OWNER', 'Profile does not belong to user');
  }

  return profile;
}

export async function findCompanyProfileForOwnership(userId, requesterId, options = {}) {
  const profile = await prisma.companyProfile.findUnique({
    where: { userId },
    ...buildProfileQueryOptions(options),
  });

  if (!profile) {
    throw new ApiError(404, 'PROFILE_NOT_FOUND', 'Company profile not found');
  }

  if (requesterId && userId !== requesterId) {
    throw new ApiError(403, 'NOT_OWNER', 'Profile does not belong to user');
  }

  return profile;
}

export async function findProfileWithReviews(userId, isCompany = false) {
  return isCompany
    ? prisma.companyProfile.findUnique({ where: { userId } })
    : prisma.developerProfile.findUnique({
        where: { userId },
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
}

export async function ensureUserExists(userId) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true },
  });

  if (!user) {
    throw new ApiError(404, 'USER_NOT_FOUND', 'User not found');
  }

  return user;
}

export function calculateAverageRating(totalRating, reviewsCount) {
  if (!reviewsCount) {
    return 0;
  }

  return Number((totalRating / reviewsCount).toFixed(1));
}

function buildProfileQueryOptions(options) {
  const queryOptions = {};

  if (options.select) {
    queryOptions.select = options.select;
  }

  if (options.include) {
    queryOptions.include = options.include;
  }

  return queryOptions;
}
