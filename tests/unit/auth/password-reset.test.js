import { jest } from '@jest/globals';

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

const authService = await import('../../../src/services/auth/index.js');

describe('auth.service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
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
