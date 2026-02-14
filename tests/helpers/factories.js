import crypto from 'node:crypto';
import { prisma } from '../../src/db/prisma.js';
import { hashPassword } from '../../src/utils/password.js';
import { createRng, randomString } from './seed.js';

const rng = createRng(Number(process.env.TEST_SEED ?? 12345));
const defaultPassword = 'Passw0rd!';

export function buildEmail() {
  return `user_${Math.floor(rng() * 1e9)}@example.com`;
}

export function buildPassword() {
  return defaultPassword;
}

export function buildSignupPayload(overrides = {}) {
  return {
    email: buildEmail(),
    password: buildPassword(),
    developerProfile: { displayName: `Dev ${randomString(rng, 6)}` },
    ...overrides,
  };
}

export async function createUser({
  email = buildEmail(),
  password = buildPassword(),
  emailVerified = false,
  developerProfile,
  companyProfile,
} = {}) {
  const passwordHash = await hashPassword(password);
  return prisma.user.create({
    data: {
      email,
      passwordHash,
      emailVerified,
      developerProfile: developerProfile ? { create: developerProfile } : undefined,
      companyProfile: companyProfile ? { create: companyProfile } : undefined,
    },
    include: {
      developerProfile: true,
      companyProfile: true,
    },
  });
}

export async function createVerificationToken({
  userId,
  token = crypto.randomBytes(32).toString('base64url'),
  expiresAt = new Date(Date.now() + 60 * 60 * 1000),
  usedAt = null,
  createdAt,
} = {}) {
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  const record = await prisma.verificationToken.create({
    data: {
      userId,
      type: 'EMAIL_VERIFY',
      tokenHash,
      expiresAt,
      usedAt,
      createdAt,
    },
  });
  return { token, record };
}

export async function createRefreshToken({
  userId,
  token = crypto.randomBytes(64).toString('base64url'),
  expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
  revokedAt = null,
} = {}) {
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  const record = await prisma.refreshToken.create({
    data: {
      userId,
      tokenHash,
      expiresAt,
      revokedAt,
    },
  });
  return { token, record };
}
