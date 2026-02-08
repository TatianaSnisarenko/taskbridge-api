import { prisma } from '../db/prisma.js';
import { hashPassword, verifyPassword } from '../utils/password.js';

export async function createUser({ email, password }) {
  const passwordHash = await hashPassword(password);
  return prisma.user.create({
    data: { email, passwordHash },
  });
}

export async function findUserByEmail(email) {
  return prisma.user.findUnique({ where: { email } });
}

export async function verifyUserPassword({ user, password }) {
  return verifyPassword(password, user.passwordHash);
}
