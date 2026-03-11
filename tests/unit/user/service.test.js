import { jest } from '@jest/globals';

const prismaMock = {
  user: {
    create: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
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
        roles: ['USER'],
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
        roles: ['USER'],
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

  test('setUserModeratorRole grants MODERATOR role when enabled is true', async () => {
    prismaMock.user.findUnique.mockResolvedValue({
      id: 'u1',
      roles: ['USER'],
    });
    prismaMock.user.update.mockResolvedValue({
      id: 'u1',
      roles: ['USER', 'MODERATOR'],
    });

    const result = await userService.setUserModeratorRole({
      userId: 'u1',
      enabled: true,
    });

    expect(prismaMock.user.findUnique).toHaveBeenCalledWith({
      where: { id: 'u1' },
      select: { id: true, roles: true },
    });

    expect(prismaMock.user.update).toHaveBeenCalledWith({
      where: { id: 'u1' },
      data: { roles: ['USER', 'MODERATOR'] },
      select: { id: true, roles: true },
    });

    expect(result).toEqual({
      id: 'u1',
      roles: ['USER', 'MODERATOR'],
    });
  });

  test('setUserModeratorRole revokes MODERATOR role when enabled is false', async () => {
    prismaMock.user.findUnique.mockResolvedValue({
      id: 'u1',
      roles: ['USER', 'MODERATOR'],
    });
    prismaMock.user.update.mockResolvedValue({
      id: 'u1',
      roles: ['USER'],
    });

    const result = await userService.setUserModeratorRole({
      userId: 'u1',
      enabled: false,
    });

    expect(prismaMock.user.findUnique).toHaveBeenCalledWith({
      where: { id: 'u1' },
      select: { id: true, roles: true },
    });

    expect(prismaMock.user.update).toHaveBeenCalledWith({
      where: { id: 'u1' },
      data: { roles: ['USER'] },
      select: { id: true, roles: true },
    });

    expect(result).toEqual({
      id: 'u1',
      roles: ['USER'],
    });
  });

  test('setUserModeratorRole keeps USER role when revoking MODERATOR', async () => {
    // Test that USER role is always preserved
    prismaMock.user.findUnique.mockResolvedValue({
      id: 'u1',
      roles: ['USER', 'MODERATOR', 'ADMIN'],
    });
    prismaMock.user.update.mockResolvedValue({
      id: 'u1',
      roles: ['ADMIN', 'USER'],
    });

    await userService.setUserModeratorRole({
      userId: 'u1',
      enabled: false,
    });

    // Verify USER is kept and MODERATOR is removed
    const callArgs = prismaMock.user.update.mock.calls[0][0];
    expect(callArgs.data.roles).toContain('USER');
    expect(callArgs.data.roles).not.toContain('MODERATOR');
  });

  test('setUserModeratorRole throws error when user not found', async () => {
    prismaMock.user.findUnique.mockResolvedValue(null);

    await expect(
      userService.setUserModeratorRole({
        userId: 'nonexistent',
        enabled: true,
      })
    ).rejects.toThrow();
  });

  test('setUserModeratorRole does not duplicate MODERATOR role', async () => {
    prismaMock.user.findUnique.mockResolvedValue({
      id: 'u1',
      roles: ['USER', 'MODERATOR'],
    });
    prismaMock.user.update.mockResolvedValue({
      id: 'u1',
      roles: ['USER', 'MODERATOR'],
    });

    await userService.setUserModeratorRole({
      userId: 'u1',
      enabled: true,
    });

    // Verify no duplicate MODERATOR added
    const callArgs = prismaMock.user.update.mock.calls[0][0];
    const moderatorCount = callArgs.data.roles.filter((r) => r === 'MODERATOR').length;
    expect(moderatorCount).toBe(1);
  });
});
