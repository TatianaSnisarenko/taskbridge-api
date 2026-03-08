import { jest } from '@jest/globals';
import { ApiError } from '../../src/utils/ApiError.js';

const prismaMock = {
  verificationToken: {
    create: jest.fn(),
    findFirst: jest.fn(),
    update: jest.fn(),
  },
  refreshToken: {
    create: jest.fn(),
    findFirst: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
  },
  user: {
    update: jest.fn(),
  },
};

const findUserByEmailMock = jest.fn();
const createUserMock = jest.fn();
const verifyPasswordMock = jest.fn();
const hashPasswordMock = jest.fn();
const generateRefreshTokenMock = jest.fn();
const signAccessTokenMock = jest.fn();
const sendVerificationEmailMock = jest.fn();
const sendResetPasswordEmailMock = jest.fn();

jest.unstable_mockModule('../../src/db/prisma.js', () => ({ prisma: prismaMock }));
jest.unstable_mockModule('../../src/services/user/index.js', () => ({
  createUser: createUserMock,
  findUserByEmail: findUserByEmailMock,
}));
jest.unstable_mockModule('../../src/utils/password.js', () => ({
  verifyPassword: verifyPasswordMock,
  hashPassword: hashPasswordMock,
}));
jest.unstable_mockModule('../../src/services/token/index.js', () => ({
  generateRefreshToken: generateRefreshTokenMock,
  signAccessToken: signAccessTokenMock,
}));
jest.unstable_mockModule('../../src/services/email/index.js', () => ({
  sendVerificationEmail: sendVerificationEmailMock,
  sendResetPasswordEmail: sendResetPasswordEmailMock,
}));

const authService = await import('../../src/services/auth/index.js');

describe('auth.service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('signup throws when email exists', async () => {
    findUserByEmailMock.mockResolvedValue({ id: 'u1' });

    await expect(
      authService.signup({ email: 'a@example.com', password: 'Passw0rd!' })
    ).rejects.toMatchObject({
      status: 409,
      code: 'EMAIL_ALREADY_EXISTS',
    });
  });

  test('signup creates user, token, and email', async () => {
    findUserByEmailMock.mockResolvedValue(null);
    createUserMock.mockResolvedValue({
      id: 'u1',
      email: 'a@example.com',
      developerProfile: { id: 'd1' },
      companyProfile: null,
    });

    const result = await authService.signup({
      email: 'a@example.com',
      password: 'Passw0rd!',
      developerProfile: { displayName: 'Dev' },
    });

    expect(createUserMock).toHaveBeenCalledWith({
      email: 'a@example.com',
      password: 'Passw0rd!',
      developerProfile: { displayName: 'Dev' },
      companyProfile: undefined,
    });
    expect(prismaMock.verificationToken.create).toHaveBeenCalled();
    expect(sendVerificationEmailMock).toHaveBeenCalledWith({
      to: 'a@example.com',
      token: expect.any(String),
    });
    expect(result).toEqual({
      userId: 'u1',
      email: 'a@example.com',
      hasDeveloperProfile: true,
      hasCompanyProfile: false,
    });
  });

  test('login rejects missing user', async () => {
    findUserByEmailMock.mockResolvedValue(null);

    await expect(
      authService.login({ email: 'a@example.com', password: 'Passw0rd!' })
    ).rejects.toMatchObject({ status: 401, code: 'INVALID_CREDENTIALS' });
  });

  test('login rejects bad password', async () => {
    findUserByEmailMock.mockResolvedValue({
      id: 'u1',
      email: 'a@example.com',
      passwordHash: 'hash',
      emailVerified: true,
    });
    verifyPasswordMock.mockResolvedValue(false);

    await expect(
      authService.login({ email: 'a@example.com', password: 'Passw0rd!' })
    ).rejects.toMatchObject({ status: 401, code: 'INVALID_CREDENTIALS' });
  });

  test('login rejects unverified email', async () => {
    findUserByEmailMock.mockResolvedValue({
      id: 'u1',
      email: 'a@example.com',
      passwordHash: 'hash',
      emailVerified: false,
    });
    verifyPasswordMock.mockResolvedValue(true);

    await expect(
      authService.login({ email: 'a@example.com', password: 'Passw0rd!' })
    ).rejects.toMatchObject({ status: 403, code: 'EMAIL_NOT_VERIFIED' });
  });

  test('login returns access and refresh tokens', async () => {
    findUserByEmailMock.mockResolvedValue({
      id: 'u1',
      email: 'a@example.com',
      passwordHash: 'hash',
      emailVerified: true,
    });
    verifyPasswordMock.mockResolvedValue(true);
    signAccessTokenMock.mockReturnValue('access-token');
    generateRefreshTokenMock.mockReturnValue({
      token: 'refresh-token',
      tokenHash: 'refresh-hash',
      expiresAt: new Date('2026-02-20T00:00:00Z'),
    });

    const result = await authService.login({
      email: 'a@example.com',
      password: 'Passw0rd!',
    });

    expect(prismaMock.refreshToken.create).toHaveBeenCalledWith({
      data: {
        userId: 'u1',
        tokenHash: 'refresh-hash',
        expiresAt: new Date('2026-02-20T00:00:00Z'),
      },
    });
    expect(result).toEqual({
      accessToken: 'access-token',
      expiresIn: expect.any(Number),
      refreshToken: 'refresh-token',
    });
  });

  test('refresh rejects missing token', async () => {
    await expect(authService.refresh({ refreshToken: null })).rejects.toMatchObject({
      status: 401,
      code: 'REFRESH_TOKEN_MISSING',
    });
  });

  test('refresh rejects invalid token', async () => {
    prismaMock.refreshToken.findFirst.mockResolvedValue(null);

    await expect(authService.refresh({ refreshToken: 'bad' })).rejects.toMatchObject({
      status: 401,
      code: 'REFRESH_TOKEN_INVALID',
    });
  });

  test('refresh rotates token and returns new access token', async () => {
    prismaMock.refreshToken.findFirst.mockResolvedValue({
      id: 'rt1',
      userId: 'u1',
      user: { id: 'u1', email: 'a@example.com' },
    });
    signAccessTokenMock.mockReturnValue('next-access');
    generateRefreshTokenMock.mockReturnValue({
      token: 'next-refresh',
      tokenHash: 'next-hash',
      expiresAt: new Date('2026-02-21T00:00:00Z'),
    });

    const result = await authService.refresh({ refreshToken: 'old-refresh' });

    expect(prismaMock.refreshToken.update).toHaveBeenCalledWith({
      where: { id: 'rt1' },
      data: { revokedAt: expect.any(Date) },
    });
    expect(prismaMock.refreshToken.create).toHaveBeenCalledWith({
      data: {
        userId: 'u1',
        tokenHash: 'next-hash',
        expiresAt: new Date('2026-02-21T00:00:00Z'),
      },
    });
    expect(result).toEqual({
      accessToken: 'next-access',
      expiresIn: expect.any(Number),
      refreshToken: 'next-refresh',
    });
  });

  test('logout revokes token when provided', async () => {
    await authService.logout({ refreshToken: 'refresh-token' });
    expect(prismaMock.refreshToken.updateMany).toHaveBeenCalled();
  });

  test('logout ignores missing token', async () => {
    await authService.logout({ refreshToken: null });
    expect(prismaMock.refreshToken.updateMany).not.toHaveBeenCalled();
  });

  test('verifyEmail rejects missing token', async () => {
    await expect(authService.verifyEmail({ token: '' })).rejects.toBeInstanceOf(ApiError);
  });

  test('verifyEmail rejects invalid token', async () => {
    prismaMock.verificationToken.findFirst.mockResolvedValue(null);

    await expect(authService.verifyEmail({ token: 'bad' })).rejects.toMatchObject({
      status: 400,
      code: 'EMAIL_VERIFICATION_INVALID',
    });
  });

  test('verifyEmail rejects expired token', async () => {
    prismaMock.verificationToken.findFirst.mockResolvedValue({
      id: 'vt1',
      userId: 'u1',
      user: { email: 'a@example.com' },
      expiresAt: new Date('2020-01-01T00:00:00Z'),
    });

    await expect(authService.verifyEmail({ token: 'expired' })).rejects.toMatchObject({
      status: 400,
      code: 'EMAIL_VERIFICATION_EXPIRED',
    });
  });

  test('verifyEmail marks token used and user verified', async () => {
    prismaMock.verificationToken.findFirst.mockResolvedValue({
      id: 'vt1',
      userId: 'u1',
      user: { email: 'a@example.com' },
      expiresAt: new Date(Date.now() + 10_000),
    });

    const result = await authService.verifyEmail({ token: 'valid' });

    expect(prismaMock.user.update).toHaveBeenCalledWith({
      where: { id: 'u1' },
      data: { emailVerified: true },
    });
    expect(prismaMock.verificationToken.update).toHaveBeenCalledWith({
      where: { id: 'vt1' },
      data: { usedAt: expect.any(Date) },
    });
    expect(result).toEqual({ email: 'a@example.com' });
  });

  test('resendVerificationEmail rejects unknown user', async () => {
    findUserByEmailMock.mockResolvedValue(null);

    await expect(
      authService.resendVerificationEmail({ email: 'missing@example.com' })
    ).rejects.toMatchObject({ status: 404, code: 'USER_NOT_FOUND' });
  });

  test('resendVerificationEmail rejects already verified user', async () => {
    findUserByEmailMock.mockResolvedValue({
      id: 'u1',
      email: 'a@example.com',
      emailVerified: true,
    });

    await expect(
      authService.resendVerificationEmail({ email: 'a@example.com' })
    ).rejects.toMatchObject({ status: 400, code: 'EMAIL_ALREADY_VERIFIED' });
  });

  test('resendVerificationEmail throttles recent token', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-02-14T00:00:00Z'));

    findUserByEmailMock.mockResolvedValue({
      id: 'u1',
      email: 'a@example.com',
      emailVerified: false,
    });
    prismaMock.verificationToken.findFirst.mockResolvedValue({
      createdAt: new Date('2026-02-13T23:58:00Z'),
    });

    await expect(
      authService.resendVerificationEmail({ email: 'a@example.com' })
    ).rejects.toMatchObject({ status: 429, code: 'EMAIL_VERIFICATION_THROTTLED' });

    jest.useRealTimers();
  });

  test('resendVerificationEmail issues a new token', async () => {
    findUserByEmailMock.mockResolvedValue({
      id: 'u1',
      email: 'a@example.com',
      emailVerified: false,
    });
    prismaMock.verificationToken.findFirst.mockResolvedValue(null);

    const result = await authService.resendVerificationEmail({ email: 'a@example.com' });

    expect(prismaMock.verificationToken.create).toHaveBeenCalled();
    expect(sendVerificationEmailMock).toHaveBeenCalledWith({
      to: 'a@example.com',
      token: expect.any(String),
    });
    expect(result).toEqual({ email: 'a@example.com' });
  });

  test('resendVerificationEmail allows when last token is old', async () => {
    findUserByEmailMock.mockResolvedValue({
      id: 'u1',
      email: 'a@example.com',
      emailVerified: false,
    });
    prismaMock.verificationToken.findFirst.mockResolvedValue({
      createdAt: new Date(Date.now() - 10 * 60 * 1000),
    });

    await authService.resendVerificationEmail({ email: 'a@example.com' });

    expect(prismaMock.verificationToken.create).toHaveBeenCalled();
    expect(sendVerificationEmailMock).toHaveBeenCalled();
  });

  test('setPassword updates user password hash', async () => {
    hashPasswordMock.mockResolvedValue('next-password-hash');
    prismaMock.user.update.mockResolvedValue({
      id: 'u1',
      updatedAt: new Date('2026-03-06T10:00:00Z'),
    });

    const result = await authService.setPassword({
      userId: 'u1',
      password: 'NewStrongPassword123!',
    });

    expect(hashPasswordMock).toHaveBeenCalledWith('NewStrongPassword123!');
    expect(prismaMock.user.update).toHaveBeenCalledWith({
      where: { id: 'u1' },
      data: { passwordHash: 'next-password-hash' },
      select: {
        id: true,
        updatedAt: true,
      },
    });
    expect(result).toEqual({
      userId: 'u1',
      passwordSet: true,
      updatedAt: new Date('2026-03-06T10:00:00Z'),
    });
  });

  test('forgotPassword sends reset email for verified user', async () => {
    findUserByEmailMock.mockResolvedValue({
      id: 'u1',
      email: 'a@example.com',
      emailVerified: true,
    });

    await authService.forgotPassword({ email: 'a@example.com' });

    expect(prismaMock.verificationToken.create).toHaveBeenCalledWith({
      data: {
        userId: 'u1',
        type: 'PASSWORD_RESET',
        tokenHash: expect.any(String),
        expiresAt: expect.any(Date),
      },
    });
    expect(sendResetPasswordEmailMock).toHaveBeenCalledWith({
      to: 'a@example.com',
      token: expect.any(String),
    });
  });

  test('forgotPassword does nothing for non-existent user', async () => {
    findUserByEmailMock.mockResolvedValue(null);

    await authService.forgotPassword({ email: 'missing@example.com' });

    expect(prismaMock.verificationToken.create).not.toHaveBeenCalled();
    expect(sendResetPasswordEmailMock).not.toHaveBeenCalled();
  });

  test('forgotPassword does nothing for unverified user', async () => {
    findUserByEmailMock.mockResolvedValue({
      id: 'u1',
      email: 'a@example.com',
      emailVerified: false,
    });

    await authService.forgotPassword({ email: 'a@example.com' });

    expect(prismaMock.verificationToken.create).not.toHaveBeenCalled();
    expect(sendResetPasswordEmailMock).not.toHaveBeenCalled();
  });

  test('resetPassword resets password with valid token', async () => {
    const tokenHash = 'hashed-token';
    prismaMock.verificationToken.findFirst.mockResolvedValue({
      id: 't1',
      userId: 'u1',
      tokenHash,
      expiresAt: new Date(Date.now() + 30 * 60 * 1000),
      usedAt: null,
      user: { id: 'u1', email: 'a@example.com' },
    });
    hashPasswordMock.mockResolvedValue('new-password-hash');

    await authService.resetPassword({ token: 'valid-token', newPassword: 'NewPassword123!' });

    expect(hashPasswordMock).toHaveBeenCalledWith('NewPassword123!');
    expect(prismaMock.user.update).toHaveBeenCalledWith({
      where: { id: 'u1' },
      data: { passwordHash: 'new-password-hash' },
    });
    expect(prismaMock.verificationToken.update).toHaveBeenCalledWith({
      where: { id: 't1' },
      data: { usedAt: expect.any(Date) },
    });
    expect(prismaMock.refreshToken.updateMany).toHaveBeenCalledWith({
      where: { userId: 'u1', revokedAt: null },
      data: { revokedAt: expect.any(Date) },
    });
  });

  test('resetPassword throws for invalid token', async () => {
    prismaMock.verificationToken.findFirst.mockResolvedValue(null);

    await expect(
      authService.resetPassword({ token: 'invalid-token', newPassword: 'NewPassword123!' })
    ).rejects.toMatchObject({
      status: 401,
      code: 'INVALID_OR_EXPIRED_TOKEN',
    });
  });

  test('resetPassword throws for expired token', async () => {
    prismaMock.verificationToken.findFirst.mockResolvedValue({
      id: 't1',
      userId: 'u1',
      tokenHash: 'hashed-token',
      expiresAt: new Date(Date.now() - 5 * 60 * 1000),
      usedAt: null,
      user: { id: 'u1', email: 'a@example.com' },
    });

    await expect(
      authService.resetPassword({ token: 'expired-token', newPassword: 'NewPassword123!' })
    ).rejects.toMatchObject({
      status: 401,
      code: 'INVALID_OR_EXPIRED_TOKEN',
    });
  });

  test('resetPassword throws for missing token', async () => {
    await expect(
      authService.resetPassword({ token: '', newPassword: 'NewPassword123!' })
    ).rejects.toMatchObject({
      status: 401,
      code: 'INVALID_OR_EXPIRED_TOKEN',
    });
  });
});
