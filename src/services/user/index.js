import { prisma } from '../../db/prisma.js';
import { hashPassword, verifyPassword } from '../../utils/password.js';
import { ApiError } from '../../utils/ApiError.js';
import { incrementTechnologyPopularity, validateTechnologyIds } from '../technologies/index.js';

const USER_ROLE = 'USER';
const MODERATOR_ROLE = 'MODERATOR';

function normalizeRoles(roles) {
  const roleOrder = [USER_ROLE, MODERATOR_ROLE, 'ADMIN'];
  const uniqueRoles = [...new Set(roles)];

  return uniqueRoles.sort((a, b) => {
    const indexA = roleOrder.indexOf(a);
    const indexB = roleOrder.indexOf(b);
    if (indexA === -1 && indexB === -1) return a.localeCompare(b);
    if (indexA === -1) return 1;
    if (indexB === -1) return -1;
    return indexA - indexB;
  });
}

export async function createUser({ email, password, developerProfile, companyProfile }) {
  const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : email;
  const passwordHash = await hashPassword(password);

  const { technologyIds, technologies, ...developerProfileData } = developerProfile || {};
  const technologyIdsFromObjects = Array.isArray(technologies)
    ? technologies
        .map((technology) => technology?.id)
        .filter((technologyId) => typeof technologyId === 'string')
    : [];
  const rawTechnologyIds = [
    ...(Array.isArray(technologyIds) ? technologyIds : []),
    ...technologyIdsFromObjects,
  ];
  const validTechnologyIds = await validateTechnologyIds(rawTechnologyIds);

  const user = await prisma.user.create({
    data: {
      email: normalizedEmail,
      passwordHash,
      roles: [USER_ROLE],
      developerProfile: developerProfile
        ? {
            create: {
              ...developerProfileData,
              ...(validTechnologyIds.length > 0
                ? {
                    technologies: {
                      createMany: {
                        data: validTechnologyIds.map((technologyId) => ({
                          technologyId,
                          proficiencyYears: 0,
                        })),
                        skipDuplicates: true,
                      },
                    },
                  }
                : {}),
            },
          }
        : undefined,
      companyProfile: companyProfile ? { create: companyProfile } : undefined,
    },
    include: {
      developerProfile: true,
      companyProfile: true,
    },
  });

  if (validTechnologyIds.length > 0) {
    await incrementTechnologyPopularity(validTechnologyIds);
  }

  return user;
}

export async function findUserByEmail(email) {
  if (!email) return null;
  const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : email;
  return prisma.user.findFirst({
    where: {
      email: normalizedEmail,
      deletedAt: null,
    },
  });
}

export async function verifyUserPassword({ user, password }) {
  return verifyPassword(password, user.passwordHash);
}

export async function setUserModeratorRole({ userId, enabled }) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, roles: true },
  });

  if (!user) {
    throw new ApiError(404, 'USER_NOT_FOUND', 'User not found');
  }

  const currentRoles = Array.isArray(user.roles) ? user.roles : [];
  let nextRoles = currentRoles;

  if (enabled) {
    nextRoles = normalizeRoles([...currentRoles, MODERATOR_ROLE]);
  } else {
    nextRoles = normalizeRoles(currentRoles.filter((role) => role !== MODERATOR_ROLE));
  }

  if (!nextRoles.includes(USER_ROLE)) {
    nextRoles = normalizeRoles([...nextRoles, USER_ROLE]);
  }

  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: { roles: nextRoles },
    select: { id: true, roles: true },
  });

  return updatedUser;
}
