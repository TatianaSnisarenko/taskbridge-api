import { jest } from '@jest/globals';

// ============================================================================
// BATCH 5: Branch Coverage Tests - Focus on Lowest-Coverage Services
// Targets: invites/creation.js, me/catalog.js, tasks/candidates.js
// ============================================================================

// ============================================================================
// INVITES/CREATION.JS - Missing Developer Validation Branches
// ============================================================================

const invitesPrismaMock = {
  $transaction: jest.fn(),
  user: {
    findUnique: jest.fn(),
  },
  task: {
    findUnique: jest.fn(),
  },
};

const invitesNotificationsMock = {
  createNotification: jest.fn(),
  buildTaskNotificationPayload: jest.fn((payload) => payload),
};

const invitesEmailMock = {
  sendImportantNotificationEmail: jest.fn(),
};

jest.unstable_mockModule('../../src/db/prisma.js', () => ({ prisma: invitesPrismaMock }));
jest.unstable_mockModule(
  '../../src/services/notifications/index.js',
  () => invitesNotificationsMock
);
jest.unstable_mockModule('../../src/services/notification-email/index.js', () => invitesEmailMock);

const invitesService = await import('../../../src/services/invites/creation.js');

describe('invites.creation branch coverage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Developer not found branch
  test('createTaskInvite throws when developer does not exist', async () => {
    invitesPrismaMock.$transaction.mockImplementation(async (callback) => {
      const tx = {
        task: {
          findUnique: jest.fn().mockResolvedValue({
            id: 't1',
            status: 'PUBLISHED',
            ownerUserId: 'c1',
            acceptedApplicationId: null,
            deletedAt: null,
          }),
        },
        user: {
          findUnique: jest.fn().mockResolvedValue(null), // Developer not found
        },
      };
      return callback(tx);
    });

    await expect(
      invitesService.createTaskInvite({
        userId: 'c1',
        taskId: 't1',
        developerId: 'd-notfound',
        message: 'Join us',
      })
    ).rejects.toMatchObject({
      status: 404,
      code: 'DEVELOPER_NOT_FOUND',
    });
  });

  // Developer has no profile branch
  test('createTaskInvite throws when developer has no profile', async () => {
    invitesPrismaMock.$transaction.mockImplementation(async (callback) => {
      const tx = {
        task: {
          findUnique: jest.fn().mockResolvedValue({
            id: 't1',
            status: 'PUBLISHED',
            ownerUserId: 'c1',
            acceptedApplicationId: null,
            deletedAt: null,
          }),
        },
        user: {
          findUnique: jest.fn().mockResolvedValue({
            id: 'd1',
            developerProfile: null, // No profile
          }),
        },
      };
      return callback(tx);
    });

    await expect(
      invitesService.createTaskInvite({
        userId: 'c1',
        taskId: 't1',
        developerId: 'd1',
        message: 'Join us',
      })
    ).rejects.toMatchObject({
      status: 404,
      code: 'DEVELOPER_NOT_FOUND',
    });
  });

  // Developer already accepted branch
  test('createTaskInvite throws when developer already accepted this task', async () => {
    invitesPrismaMock.$transaction.mockImplementation(async (callback) => {
      const tx = {
        task: {
          findUnique: jest.fn().mockResolvedValue({
            id: 't1',
            status: 'PUBLISHED',
            ownerUserId: 'c1',
            acceptedApplicationId: null,
            deletedAt: null,
          }),
        },
        user: {
          findUnique: jest.fn().mockResolvedValue({
            id: 'd1',
            developerProfile: { userId: 'd1' },
          }),
        },
        application: {
          findFirst: jest.fn().mockResolvedValue({
            id: 'app1',
          }), // Accepted application exists
        },
      };
      return callback(tx);
    });

    await expect(
      invitesService.createTaskInvite({
        userId: 'c1',
        taskId: 't1',
        developerId: 'd1',
        message: 'Join us',
      })
    ).rejects.toMatchObject({
      status: 409,
      code: 'DEVELOPER_ALREADY_ACCEPTED',
    });
  });

  // Invite already exists (PENDING) branch
  test('createTaskInvite throws when pending invite already exists', async () => {
    invitesPrismaMock.$transaction.mockImplementation(async (callback) => {
      const tx = {
        task: {
          findUnique: jest.fn().mockResolvedValue({
            id: 't1',
            status: 'PUBLISHED',
            ownerUserId: 'c1',
            acceptedApplicationId: null,
            deletedAt: null,
          }),
        },
        user: {
          findUnique: jest.fn().mockResolvedValue({
            id: 'd1',
            developerProfile: { userId: 'd1' },
          }),
        },
        application: {
          findFirst: jest.fn().mockResolvedValue(null),
          findUnique: jest.fn().mockResolvedValue(null),
        },
        taskInvite: {
          findUnique: jest.fn().mockResolvedValue({
            id: 'inv1',
            status: 'PENDING', // Pending invite exists
          }),
        },
      };
      return callback(tx);
    });

    await expect(
      invitesService.createTaskInvite({
        userId: 'c1',
        taskId: 't1',
        developerId: 'd1',
        message: 'Join us',
      })
    ).rejects.toMatchObject({
      status: 409,
      code: 'INVITE_ALREADY_EXISTS',
    });
  });

  // Developer already applied branch
  test('createTaskInvite throws when developer already applied to task', async () => {
    invitesPrismaMock.$transaction.mockImplementation(async (callback) => {
      const tx = {
        task: {
          findUnique: jest.fn().mockResolvedValue({
            id: 't1',
            status: 'PUBLISHED',
            ownerUserId: 'c1',
            acceptedApplicationId: null,
            deletedAt: null,
          }),
        },
        user: {
          findUnique: jest.fn().mockResolvedValue({
            id: 'd1',
            developerProfile: { userId: 'd1' },
          }),
        },
        application: {
          findFirst: jest.fn().mockResolvedValue(null),
          findUnique: jest.fn().mockResolvedValue({
            id: 'app1',
            status: 'APPLIED', // Developer applied
          }),
        },
        taskInvite: {
          findUnique: jest.fn().mockResolvedValue(null),
        },
      };
      return callback(tx);
    });

    await expect(
      invitesService.createTaskInvite({
        userId: 'c1',
        taskId: 't1',
        developerId: 'd1',
        message: 'Join us',
      })
    ).rejects.toMatchObject({
      status: 409,
      code: 'INVITE_NOT_ALLOWED',
    });
  });
});
