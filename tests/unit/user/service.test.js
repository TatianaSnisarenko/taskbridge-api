import { jest } from '@jest/globals';

const prismaMock = {
  user: {
    create: jest.fn(),
    findUnique: jest.fn(),
  },
};
const hashPasswordMock = jest.fn();
const verifyPasswordMock = jest.fn();

jest.unstable_mockModule('../../src/db/prisma.js', () => ({ prisma: prismaMock }));
jest.unstable_mockModule('../../src/utils/password.js', () => ({
  hashPassword: hashPasswordMock,
  verifyPassword: verifyPasswordMock,
}));

const userService = await import('../../../src/services/user/index.js');

describe('user.service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('createUser hashes password and creates profiles', async () => {
    hashPasswordMock.mockResolvedValue('hash');
    prismaMock.user.create.mockResolvedValue({ id: 'u1' });

    await userService.createUser({
      email: 'a@example.com',
      password: 'Passw0rd!',
      developerProfile: { displayName: 'Dev' },
      companyProfile: { companyName: 'Company' },
    });

    expect(prismaMock.user.create).toHaveBeenCalledWith({
      data: {
        email: 'a@example.com',
        passwordHash: 'hash',
        developerProfile: { create: { displayName: 'Dev' } },
        companyProfile: { create: { companyName: 'Company' } },
      },
      include: {
        developerProfile: true,
        companyProfile: true,
      },
    });
  });

  test('createUser allows missing profiles', async () => {
    hashPasswordMock.mockResolvedValue('hash');
    prismaMock.user.create.mockResolvedValue({ id: 'u1' });

    await userService.createUser({
      email: 'a@example.com',
      password: 'Passw0rd!',
    });

    expect(prismaMock.user.create).toHaveBeenCalledWith({
      data: {
        email: 'a@example.com',
        passwordHash: 'hash',
        developerProfile: undefined,
        companyProfile: undefined,
      },
      include: {
        developerProfile: true,
        companyProfile: true,
      },
    });
  });

  test('findUserByEmail queries prisma', async () => {
    prismaMock.user.findUnique.mockResolvedValue({ id: 'u1' });

    const user = await userService.findUserByEmail('a@example.com');

    expect(prismaMock.user.findUnique).toHaveBeenCalledWith({
      where: { email: 'a@example.com' },
    });
    expect(user).toEqual({ id: 'u1' });
  });

  test('verifyUserPassword delegates to verifyPassword', async () => {
    verifyPasswordMock.mockResolvedValue(true);

    const result = await userService.verifyUserPassword({
      user: { passwordHash: 'hash' },
      password: 'Passw0rd!',
    });

    expect(verifyPasswordMock).toHaveBeenCalledWith('Passw0rd!', 'hash');
    expect(result).toBe(true);
  });
});
