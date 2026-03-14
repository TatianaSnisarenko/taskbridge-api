import crypto from 'crypto';
import { prisma } from '../../db/prisma.js';
import { env } from '../../config/env.js';
import { ApiError } from '../../utils/ApiError.js';
import { createUser, findUserByEmail } from '../user/index.js';
import { hashPassword, verifyPassword } from '../../utils/password.js';
import { generateRefreshToken, signAccessToken } from '../token/index.js';
import { sendVerificationEmail, sendResetPasswordEmail } from '../email/index.js';

function hashRefresh(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function hashVerification(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function generateEmailVerificationToken() {
  const token = crypto.randomBytes(32).toString('base64url');
  const tokenHash = hashVerification(token);
  const expiresAt = new Date(Date.now() + env.emailVerificationTtlHours * 60 * 60 * 1000);
  return { token, tokenHash, expiresAt };
}

export async function signup({ email, password, developerProfile, companyProfile }) {
  const existing = await findUserByEmail(email);
  if (existing) {
    throw new ApiError(409, 'EMAIL_ALREADY_EXISTS', 'Email already in use');
  }

  const verification = generateEmailVerificationToken();
  const user = await createUser({
    email,
    password,
    developerProfile,
    companyProfile,
  });

  await prisma.verificationToken.create({
    data: {
      userId: user.id,
      type: 'EMAIL_VERIFY',
      tokenHash: verification.tokenHash,
      expiresAt: verification.expiresAt,
    },
  });

  await sendVerificationEmail({ to: user.email, token: verification.token });

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

  if (!user.emailVerified) {
    throw new ApiError(403, 'EMAIL_NOT_VERIFIED', 'Email is not verified');
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

  if (record.user.deletedAt) {
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

export async function verifyEmail({ token }) {
  if (!token) {
    throw new ApiError(400, 'EMAIL_VERIFICATION_MISSING', 'Verification token is missing');
  }

  const tokenHash = hashVerification(token);
  const tokenRecord = await prisma.verificationToken.findFirst({
    where: {
      tokenHash,
      type: 'EMAIL_VERIFY',
      usedAt: null,
    },
    include: { user: true },
  });

  if (!tokenRecord) {
    throw new ApiError(400, 'EMAIL_VERIFICATION_INVALID', 'Verification link is invalid');
  }

  if (tokenRecord.expiresAt < new Date()) {
    throw new ApiError(400, 'EMAIL_VERIFICATION_EXPIRED', 'Verification link has expired');
  }

  await prisma.user.update({
    where: { id: tokenRecord.userId },
    data: { emailVerified: true },
  });

  await prisma.verificationToken.update({
    where: { id: tokenRecord.id },
    data: { usedAt: new Date() },
  });

  return { email: tokenRecord.user.email };
}

export async function resendVerificationEmail({ email }) {
  const user = await findUserByEmail(email);
  if (!user) {
    throw new ApiError(404, 'USER_NOT_FOUND', 'User not found');
  }

  if (user.emailVerified) {
    throw new ApiError(400, 'EMAIL_ALREADY_VERIFIED', 'Email is already verified');
  }

  const lastToken = await prisma.verificationToken.findFirst({
    where: {
      userId: user.id,
      type: 'EMAIL_VERIFY',
    },
    orderBy: { createdAt: 'desc' },
  });

  if (lastToken) {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    if (lastToken.createdAt > fiveMinutesAgo) {
      throw new ApiError(
        429,
        'EMAIL_VERIFICATION_THROTTLED',
        'Please wait before requesting another verification email'
      );
    }
  }

  const verification = generateEmailVerificationToken();
  await prisma.verificationToken.create({
    data: {
      userId: user.id,
      type: 'EMAIL_VERIFY',
      tokenHash: verification.tokenHash,
      expiresAt: verification.expiresAt,
    },
  });

  await sendVerificationEmail({ to: user.email, token: verification.token });

  return { email: user.email };
}

export async function setPassword({ userId, password }) {
  const passwordHash = await hashPassword(password);
  const user = await prisma.user.update({
    where: { id: userId },
    data: { passwordHash },
    select: {
      id: true,
      updatedAt: true,
    },
  });

  return {
    userId: user.id,
    passwordSet: true,
    updatedAt: user.updatedAt,
  };
}

function generatePasswordResetToken() {
  const token = crypto.randomBytes(32).toString('base64url');
  const tokenHash = hashVerification(token);
  const passwordResetTtlMinutes = env.passwordResetTokenTtlMinutes || 30;
  const expiresAt = new Date(Date.now() + passwordResetTtlMinutes * 60 * 1000);
  return { token, tokenHash, expiresAt };
}

export async function forgotPassword({ email }) {
  const user = await findUserByEmail(email);

  // Always return 200 OK (do not reveal if email exists or if verified)
  if (!user || !user.emailVerified) {
    return;
  }

  const resetToken = generatePasswordResetToken();

  await prisma.verificationToken.create({
    data: {
      userId: user.id,
      type: 'PASSWORD_RESET',
      tokenHash: resetToken.tokenHash,
      expiresAt: resetToken.expiresAt,
    },
  });

  await sendResetPasswordEmail({ to: user.email, token: resetToken.token });
}

export async function resetPassword({ token, newPassword }) {
  if (!token) {
    throw new ApiError(401, 'INVALID_OR_EXPIRED_TOKEN', 'Reset token is missing');
  }

  const tokenHash = hashVerification(token);

  const tokenRecord = await prisma.verificationToken.findFirst({
    where: {
      tokenHash,
      type: 'PASSWORD_RESET',
      usedAt: null,
    },
    include: { user: true },
  });

  if (!tokenRecord) {
    throw new ApiError(401, 'INVALID_OR_EXPIRED_TOKEN', 'Reset token is invalid or expired');
  }

  if (tokenRecord.expiresAt < new Date()) {
    throw new ApiError(401, 'INVALID_OR_EXPIRED_TOKEN', 'Reset token has expired');
  }

  // Update password
  const passwordHash = await hashPassword(newPassword);
  await prisma.user.update({
    where: { id: tokenRecord.userId },
    data: { passwordHash },
  });

  // Mark token as used
  await prisma.verificationToken.update({
    where: { id: tokenRecord.id },
    data: { usedAt: new Date() },
  });

  // Revoke all refresh tokens for this user
  await prisma.refreshToken.updateMany({
    where: { userId: tokenRecord.userId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}
