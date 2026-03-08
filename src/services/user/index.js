import { prisma } from '../../db/prisma.js';
import { hashPassword, verifyPassword } from '../../utils/password.js';

export async function createUser({ email, password, developerProfile, companyProfile }) {
  const passwordHash = await hashPassword(password);
  return prisma.user.create({
    data: {
      email,
      passwordHash,
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
  return prisma.user.findUnique({ where: { email } });
}

export async function verifyUserPassword({ user, password }) {
  return verifyPassword(password, user.passwordHash);
}
