import { jest } from '@jest/globals';

const prismaMock = {
  $transaction: jest.fn(),
  task: {
    findUnique: jest.fn(),
  },
  user: {
    findUnique: jest.fn(),
  },
  application: {
    findFirst: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
  },
  taskInvite: {
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
};

const notificationsServiceMock = {
  createNotification: jest.fn(),
  buildTaskNotificationPayload: jest.fn((payload) => payload),
  createApplicationCreatedNotification: jest.fn(),
  createApplicationAcceptedNotification: jest.fn(),
  createApplicationRejectedNotification: jest.fn(),
};

const chatServiceMock = {
  getOrCreateChatThread: jest.fn(),
};

const emailServiceMock = {
  sendImportantNotificationEmail: jest.fn(),
};

const tasksServiceMock = {
  startTaskWithDeveloper: jest.fn(),
};

jest.unstable_mockModule('../../src/db/prisma.js', () => ({ prisma: prismaMock }));
jest.unstable_mockModule(
  '../../src/services/notifications/index.js',
  () => notificationsServiceMock
);
jest.unstable_mockModule('../../src/services/chat/index.js', () => chatServiceMock);
jest.unstable_mockModule('../../src/services/notification-email/index.js', () => emailServiceMock);
jest.unstable_mockModule('../../src/services/tasks/index.js', () => tasksServiceMock);

const invitesService = await import('../../../../src/services/invites/index.js');

describe('invites.service - create', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createTaskInvite', () => {
    test('throws error when task not found', async () => {
      prismaMock.$transaction.mockImplementation(async (callback) => {
        const tx = {
          task: {
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
        status: 404,
        code: 'TASK_NOT_FOUND',
      });
    });

    test('throws error when user is not task owner', async () => {
      prismaMock.$transaction.mockImplementation(async (callback) => {
        const tx = {
          task: {
            findUnique: jest.fn().mockResolvedValue({
              id: 't1',
              status: 'PUBLISHED',
              ownerUserId: 'c2', // Different owner
              acceptedApplicationId: null,
              deletedAt: null,
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
        status: 403,
        code: 'NOT_OWNER',
      });
    });

    test('throws error when task is not PUBLISHED', async () => {
      prismaMock.$transaction.mockImplementation(async (callback) => {
        const tx = {
          task: {
            findUnique: jest.fn().mockResolvedValue({
              id: 't1',
              status: 'DRAFT',
              ownerUserId: 'c1',
              acceptedApplicationId: null,
              deletedAt: null,
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
        code: 'TASK_NOT_PUBLISHED',
      });
    });

    test('throws error when task already has accepted application', async () => {
      prismaMock.$transaction.mockImplementation(async (callback) => {
        const tx = {
          task: {
            findUnique: jest.fn().mockResolvedValue({
              id: 't1',
              status: 'PUBLISHED',
              ownerUserId: 'c1',
              acceptedApplicationId: 'app1',
              deletedAt: null,
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
        code: 'TASK_ALREADY_MATCHED',
      });
    });

    test('creates invite successfully with notification', async () => {
      const createdAt = new Date('2026-03-07T10:00:00Z');

      prismaMock.$transaction.mockImplementation(async (callback) => {
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
            findUnique: jest.fn().mockResolvedValue(null),
            create: jest.fn().mockResolvedValue({
              id: 'inv1',
              taskId: 't1',
              developerUserId: 'd1',
              status: 'PENDING',
              createdAt,
            }),
          },
        };
        return callback(tx);
      });

      const result = await invitesService.createTaskInvite({
        userId: 'c1',
        taskId: 't1',
        developerId: 'd1',
        message: 'Join us',
      });

      expect(result).toEqual({
        invite_id: 'inv1',
        task_id: 't1',
        developer_user_id: 'd1',
        status: 'PENDING',
        created_at: createdAt.toISOString(),
      });

      expect(notificationsServiceMock.createNotification).toHaveBeenCalled();
    });
  });
});
