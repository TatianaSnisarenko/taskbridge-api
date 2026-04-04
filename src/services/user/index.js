import { prisma } from '../../db/prisma.js';
import { hashPassword, verifyPassword } from '../../utils/password.js';
import { ApiError } from '../../utils/ApiError.js';
import { incrementTechnologyPopularity, validateTechnologyIds } from '../technologies/index.js';
import { createNotification } from '../notifications/index.js';

const USER_ROLE = 'USER';
const MODERATOR_ROLE = 'MODERATOR';
const MODERATOR_ROLE_GRANTED_TYPE = 'MODERATOR_ROLE_GRANTED';
const MODERATOR_ROLE_REVOKED_TYPE = 'MODERATOR_ROLE_REVOKED';
const DEFAULT_ONBOARDING_ROLE_STATE = {
  status: 'not_started',
  version: 1,
  completed_at: null,
  skipped_at: null,
};

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

function mapOnboardingRoleState(state) {
  if (!state) {
    return { ...DEFAULT_ONBOARDING_ROLE_STATE };
  }

  return {
    status: state.status,
    version: state.version,
    completed_at: state.completedAt ? state.completedAt.toISOString() : null,
    skipped_at: state.skippedAt ? state.skippedAt.toISOString() : null,
  };
}

function mapUserCatalogItem(user) {
  const onboardingByRole = (user.onboardingStates || []).reduce((acc, state) => {
    acc[state.role] = state;
    return acc;
  }, {});

  return {
    user_id: user.id,
    email: user.email,
    roles: Array.isArray(user.roles) ? user.roles : [],
    created_at: user.createdAt,
    hasDeveloperProfile: !!user.developerProfile,
    hasCompanyProfile: !!user.companyProfile,
    onboarding: {
      developer: mapOnboardingRoleState(onboardingByRole.developer),
      company: mapOnboardingRoleState(onboardingByRole.company),
    },
  };
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

export async function setUserModeratorRole({ userId, enabled, actorUserId = null }) {
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

  const hadModeratorRole = currentRoles.includes(MODERATOR_ROLE);
  const hasModeratorRole = nextRoles.includes(MODERATOR_ROLE);
  const moderatorRoleChanged = hadModeratorRole !== hasModeratorRole;

  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: { roles: nextRoles },
    select: { id: true, roles: true },
  });

  if (moderatorRoleChanged) {
    const type = hasModeratorRole ? MODERATOR_ROLE_GRANTED_TYPE : MODERATOR_ROLE_REVOKED_TYPE;
    const message = hasModeratorRole
      ? 'Your moderator role was granted by an administrator.'
      : 'Your moderator role was revoked by an administrator.';

    await createNotification({
      userId,
      actorUserId,
      type,
      payload: {
        message,
        moderator_enabled: hasModeratorRole,
      },
    });
  }

  return updatedUser;
}

export async function getUsersCatalog({ page = 1, size = 20, q = '' }) {
  const resolvedPage = Number(page) || 1;
  const resolvedSize = Number(size) || 20;
  const searchQuery = String(q || '').trim();

  const whereClause = {
    deletedAt: null,
    ...(searchQuery ? { email: { contains: searchQuery, mode: 'insensitive' } } : {}),
  };

  const [users, total] = await prisma.$transaction([
    prisma.user.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
      skip: (resolvedPage - 1) * resolvedSize,
      take: resolvedSize,
      select: {
        id: true,
        email: true,
        roles: true,
        createdAt: true,
        developerProfile: {
          select: { userId: true },
        },
        companyProfile: {
          select: { userId: true },
        },
        onboardingStates: {
          where: {
            role: {
              in: ['developer', 'company'],
            },
          },
          select: {
            role: true,
            status: true,
            version: true,
            completedAt: true,
            skippedAt: true,
          },
        },
      },
    }),
    prisma.user.count({ where: whereClause }),
  ]);

  return {
    items: users.map(mapUserCatalogItem),
    page: resolvedPage,
    size: resolvedSize,
    total,
  };
}
