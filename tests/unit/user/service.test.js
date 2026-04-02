import { jest } from '@jest/globals';

const prismaMock = {
  user: {
    create: jest.fn(),
    findFirst: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
    update: jest.fn(),
  },
  $transaction: jest.fn(),
};
const hashPasswordMock = jest.fn();
const verifyPasswordMock = jest.fn();
const validateTechnologyIdsMock = jest.fn();
const incrementTechnologyPopularityMock = jest.fn();
const createNotificationMock = jest.fn();

jest.unstable_mockModule('../../src/db/prisma.js', () => ({ prisma: prismaMock }));
jest.unstable_mockModule('../../src/utils/password.js', () => ({
  hashPassword: hashPasswordMock,
  verifyPassword: verifyPasswordMock,
}));
jest.unstable_mockModule('../../src/services/technologies/index.js', () => ({
  validateTechnologyIds: validateTechnologyIdsMock,
  incrementTechnologyPopularity: incrementTechnologyPopularityMock,
}));
jest.unstable_mockModule('../../src/services/notifications/index.js', () => ({
  createNotification: createNotificationMock,
}));

const userService = await import('../../../src/services/user/index.js');

describe('user.service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    validateTechnologyIdsMock.mockResolvedValue([]);
    incrementTechnologyPopularityMock.mockResolvedValue(undefined);
    createNotificationMock.mockResolvedValue({ id: 'n1' });
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

  test('createUser stores developer technologies from object list', async () => {
    hashPasswordMock.mockResolvedValue('hash');
    validateTechnologyIdsMock.mockResolvedValue(['tech-1', 'tech-2']);
    prismaMock.user.create.mockResolvedValue({ id: 'u1' });

    await userService.createUser({
      email: 'a@example.com',
      password: 'Passw0rd!',
      developerProfile: {
        displayName: 'Dev',
        technologies: [{ id: 'tech-1' }, { id: 'tech-2', name: 'Node.js' }],
      },
    });

    expect(validateTechnologyIdsMock).toHaveBeenCalledWith(['tech-1', 'tech-2']);
    expect(prismaMock.user.create).toHaveBeenCalledWith({
      data: {
        email: 'a@example.com',
        passwordHash: 'hash',
        roles: ['USER'],
        developerProfile: {
          create: {
            displayName: 'Dev',
            technologies: {
              createMany: {
                data: [
                  { technologyId: 'tech-1', proficiencyYears: 0 },
                  { technologyId: 'tech-2', proficiencyYears: 0 },
                ],
                skipDuplicates: true,
              },
            },
          },
        },
        companyProfile: undefined,
      },
      include: {
        developerProfile: true,
        companyProfile: true,
      },
    });
    expect(incrementTechnologyPopularityMock).toHaveBeenCalledWith(['tech-1', 'tech-2']);
  });

  test('createUser merges technologyIds and technologies object ids', async () => {
    hashPasswordMock.mockResolvedValue('hash');
    validateTechnologyIdsMock.mockResolvedValue(['tech-1', 'tech-2']);
    prismaMock.user.create.mockResolvedValue({ id: 'u1' });

    await userService.createUser({
      email: 'a@example.com',
      password: 'Passw0rd!',
      developerProfile: {
        displayName: 'Dev',
        technologyIds: ['tech-1'],
        technologies: [{ id: 'tech-2' }],
      },
    });

    expect(validateTechnologyIdsMock).toHaveBeenCalledWith(['tech-1', 'tech-2']);
  });

  test('createUser skips popularity increment when no technologies', async () => {
    hashPasswordMock.mockResolvedValue('hash');
    validateTechnologyIdsMock.mockResolvedValue([]);
    prismaMock.user.create.mockResolvedValue({ id: 'u1' });

    await userService.createUser({
      email: 'a@example.com',
      password: 'Passw0rd!',
      developerProfile: { displayName: 'Dev', technologies: [] },
    });

    expect(incrementTechnologyPopularityMock).not.toHaveBeenCalled();
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
    prismaMock.user.findFirst.mockResolvedValue({ id: 'u1' });

    const user = await userService.findUserByEmail('a@example.com');

    expect(prismaMock.user.findFirst).toHaveBeenCalledWith({
      where: {
        email: 'a@example.com',
        deletedAt: null,
      },
    });
    expect(user).toEqual({ id: 'u1' });
  });

  test('createUser normalizes email with trim and lowercase', async () => {
    hashPasswordMock.mockResolvedValue('hash');
    prismaMock.user.create.mockResolvedValue({ id: 'u1' });

    await userService.createUser({
      email: '  User@Example.COM  ',
      password: 'Passw0rd!',
    });

    expect(prismaMock.user.create).toHaveBeenCalledWith({
      data: {
        email: 'user@example.com',
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

  test('findUserByEmail normalizes email with trim and lowercase', async () => {
    prismaMock.user.findFirst.mockResolvedValue({ id: 'u1' });

    await userService.findUserByEmail('  User@Example.COM  ');

    expect(prismaMock.user.findFirst).toHaveBeenCalledWith({
      where: {
        email: 'user@example.com',
        deletedAt: null,
      },
    });
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
      actorUserId: 'admin-1',
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

    expect(createNotificationMock).toHaveBeenCalledWith({
      userId: 'u1',
      actorUserId: 'admin-1',
      type: 'MODERATOR_ROLE_GRANTED',
      payload: {
        message: 'Your moderator role was granted by an administrator.',
        moderator_enabled: true,
      },
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
      actorUserId: 'admin-1',
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

    expect(createNotificationMock).toHaveBeenCalledWith({
      userId: 'u1',
      actorUserId: 'admin-1',
      type: 'MODERATOR_ROLE_REVOKED',
      payload: {
        message: 'Your moderator role was revoked by an administrator.',
        moderator_enabled: false,
      },
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
    expect(createNotificationMock).toHaveBeenCalledTimes(1);
  });

  test('setUserModeratorRole throws error when user not found', async () => {
    prismaMock.user.findUnique.mockResolvedValue(null);

    await expect(
      userService.setUserModeratorRole({
        userId: 'nonexistent',
        enabled: true,
      })
    ).rejects.toThrow();

    expect(createNotificationMock).not.toHaveBeenCalled();
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
    expect(createNotificationMock).not.toHaveBeenCalled();
  });
});
