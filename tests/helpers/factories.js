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

  // Clean up developerProfile to only include valid Prisma fields
  let cleanDeveloperProfile = developerProfile;
  if (developerProfile) {
    // eslint-disable-next-line no-unused-vars
    const { avatarUrl, avatarPublicId, ...rest } = developerProfile;
    cleanDeveloperProfile = rest;
  }

  const user = await prisma.user.create({
    data: {
      email,
      passwordHash,
      emailVerified,
      developerProfile: cleanDeveloperProfile ? { create: cleanDeveloperProfile } : undefined,
      companyProfile: companyProfile ? { create: companyProfile } : undefined,
    },
    include: {
      developerProfile: true,
      companyProfile: true,
    },
  });

  // Update avatar fields if provided
  if (developerProfile?.avatarUrl || developerProfile?.avatarPublicId) {
    await prisma.developerProfile.update({
      where: { userId: user.id },
      data: {
        avatarUrl: developerProfile.avatarUrl,
        avatarPublicId: developerProfile.avatarPublicId,
      },
    });

    // Reload user with updated profile
    return prisma.user.findUnique({
      where: { id: user.id },
      include: {
        developerProfile: true,
        companyProfile: true,
      },
    });
  }

  return user;
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
