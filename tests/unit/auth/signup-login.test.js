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
});
