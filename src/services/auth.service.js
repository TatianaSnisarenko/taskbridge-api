import crypto from 'crypto';
import { prisma } from '../db/prisma.js';
import { env } from '../config/env.js';
import { ApiError } from '../utils/ApiError.js';
import { createUser, findUserByEmail } from './user.service.js';
import { verifyPassword } from '../utils/password.js';
import { generateRefreshToken, signAccessToken } from './token.service.js';

function hashRefresh(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export async function signup({ email, password, developerProfile, companyProfile }) {
  const existing = await findUserByEmail(email);
  if (existing) {
    throw new ApiError(409, 'EMAIL_ALREADY_EXISTS', 'Email already in use');
  }

  const user = await createUser({ email, password, developerProfile, companyProfile });

  return {
    userId: user.id,
    email: user.email,
    hasDeveloperProfile: Boolean(user.developerProfile),
    hasCompanyProfile: Boolean(user.companyProfile),
  };
}

export async function login({ email, password }) {
  const user = await findUserByEmail(email);
  if (!user) {
    throw new ApiError(401, 'INVALID_CREDENTIALS', 'Invalid email or password');
  }

  const ok = await verifyPassword(password, user.passwordHash);
  if (!ok) {
    throw new ApiError(401, 'INVALID_CREDENTIALS', 'Invalid email or password');
  }

  const accessToken = signAccessToken({ userId: user.id, email: user.email });

  const refresh = generateRefreshToken();
  await prisma.refreshToken.create({
    data: {
      userId: user.id,
      tokenHash: refresh.tokenHash,
      expiresAt: refresh.expiresAt,
    },
  });

  return {
    accessToken,
    expiresIn: env.accessTokenTtlSeconds,
    refreshToken: refresh.token,
  };
}

export async function refresh({ refreshToken }) {
  if (!refreshToken) {
    throw new ApiError(401, 'REFRESH_TOKEN_MISSING', 'Refresh token is missing');
  }

  const tokenHash = hashRefresh(refreshToken);

  const record = await prisma.refreshToken.findFirst({
    where: {
      tokenHash,
      revokedAt: null,
      expiresAt: { gt: new Date() },
    },
    include: { user: true },
  });

  if (!record) {
    throw new ApiError(401, 'REFRESH_TOKEN_INVALID', 'Refresh token is invalid or expired');
  }

  // rotation: revoke current token, issue a new one
  await prisma.refreshToken.update({
    where: { id: record.id },
    data: { revokedAt: new Date() },
  });

  const next = generateRefreshToken();
  await prisma.refreshToken.create({
    data: {
      userId: record.userId,
      tokenHash: next.tokenHash,
      expiresAt: next.expiresAt,
    },
  });

  const accessToken = signAccessToken({ userId: record.user.id, email: record.user.email });

  return {
    accessToken,
    expiresIn: env.accessTokenTtlSeconds,
    refreshToken: next.token,
  };
}

export async function logout({ refreshToken }) {
  if (!refreshToken) return;

  const tokenHash = hashRefresh(refreshToken);
  await prisma.refreshToken.updateMany({
    where: { tokenHash, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}
