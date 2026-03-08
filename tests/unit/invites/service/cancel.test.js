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

describe('invites.service - cancel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('cancelInvite', () => {
    test('throws error when invite not found', async () => {
      prismaMock.$transaction.mockImplementation(async (callback) => {
        const tx = {
          taskInvite: {
            findUnique: jest.fn().mockResolvedValue(null),
          },
        };
        return callback(tx);
      });

      await expect(
        invitesService.cancelInvite({
          userId: 'c1',
          inviteId: 'inv1',
        })
      ).rejects.toMatchObject({
        status: 404,
        code: 'INVITE_NOT_FOUND',
      });
    });

    test('throws error when user is not company owner', async () => {
      prismaMock.$transaction.mockImplementation(async (callback) => {
        const tx = {
          taskInvite: {
            findUnique: jest.fn().mockResolvedValue({
              id: 'inv1',
              companyUserId: 'c2', // Different company
              status: 'PENDING',
              task: {
                id: 't1',
                ownerUserId: 'c2',
              },
            }),
          },
        };
        return callback(tx);
      });

      await expect(
        invitesService.cancelInvite({
          userId: 'c1',
          inviteId: 'inv1',
        })
      ).rejects.toMatchObject({
        status: 403,
        code: 'NOT_OWNER',
      });
    });

    test('cancels invite successfully', async () => {
      const updatedAt = new Date('2026-03-07T12:00:00Z');
      const cancelledAt = new Date('2026-03-07T12:00:00Z');

      prismaMock.$transaction.mockImplementation(async (callback) => {
        const tx = {
          taskInvite: {
            findUnique: jest.fn().mockResolvedValue({
              id: 'inv1',
              taskId: 't1',
              companyUserId: 'c1',
              developerUserId: 'd1',
              status: 'PENDING',
              task: {
                id: 't1',
                ownerUserId: 'c1',
              },
            }),
            update: jest.fn().mockResolvedValue({
              id: 'inv1',
              status: 'CANCELLED',
              cancelledAt,
              updatedAt,
            }),
          },
        };
        return callback(tx);
      });

      const result = await invitesService.cancelInvite({
        userId: 'c1',
        inviteId: 'inv1',
      });

      expect(result.status).toBe('CANCELLED');
      expect(result.cancelled_at).toBe(cancelledAt.toISOString());
      expect(notificationsServiceMock.createNotification).toHaveBeenCalled();
    });

    test('throws error when invite is not PENDING', async () => {
      prismaMock.$transaction.mockImplementation(async (callback) => {
        const tx = {
          taskInvite: {
            findUnique: jest.fn().mockResolvedValue({
              id: 'inv1',
              taskId: 't1',
              companyUserId: 'c1',
              developerUserId: 'd1',
              status: 'DECLINED',
              task: {
                id: 't1',
                ownerUserId: 'c1',
              },
            }),
          },
        };
        return callback(tx);
      });

      await expect(
        invitesService.cancelInvite({
          userId: 'c1',
          inviteId: 'inv1',
        })
      ).rejects.toMatchObject({
        status: 409,
        code: 'INVALID_STATE',
      });
    });

    test('cancels invite and skips email when developer user is missing', async () => {
      const cancelledAt = new Date('2026-03-07T12:00:00Z');

      prismaMock.$transaction.mockImplementation(async (callback) => {
        const tx = {
          taskInvite: {
            findUnique: jest.fn().mockResolvedValue({
              id: 'inv1',
              taskId: 't1',
              companyUserId: 'c1',
              developerUserId: 'd1',
              status: 'PENDING',
              task: {
                id: 't1',
                ownerUserId: 'c1',
              },
            }),
            update: jest.fn().mockResolvedValue({
              id: 'inv1',
              status: 'CANCELLED',
              cancelledAt,
            }),
          },
        };
        return callback(tx);
      });

      prismaMock.user.findUnique.mockResolvedValue(null);
      prismaMock.task.findUnique.mockResolvedValue({ id: 't1', title: 'Backend Task' });

      await invitesService.cancelInvite({
        userId: 'c1',
        inviteId: 'inv1',
      });

      expect(emailServiceMock.sendImportantNotificationEmail).not.toHaveBeenCalled();
    });
  });
});
