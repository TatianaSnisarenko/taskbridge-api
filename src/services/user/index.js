import { prisma } from '../../db/prisma.js';
import { hashPassword, verifyPassword } from '../../utils/password.js';
import { ApiError } from '../../utils/ApiError.js';

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
  const passwordHash = await hashPassword(password);
  return prisma.user.create({
    data: {
      email,
      passwordHash,
      roles: [USER_ROLE],
      developerProfile: developerProfile ? { create: developerProfile } : undefined,
      companyProfile: companyProfile ? { create: companyProfile } : undefined,
    },
    include: {
      developerProfile: true,
      companyProfile: true,
    },
  });
}

export async function findUserByEmail(email) {
  return prisma.user.findFirst({
    where: {
      email,
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
