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

describe('invites.service - decline', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('declineInvite', () => {
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
        invitesService.declineInvite({
          userId: 'd1',
          inviteId: 'inv1',
        })
      ).rejects.toMatchObject({
        status: 404,
        code: 'INVITE_NOT_FOUND',
      });
    });

    test('declines invite successfully', async () => {
      const updatedAt = new Date('2026-03-07T11:00:00Z');
      const declinedAt = new Date('2026-03-07T11:00:00Z');
      const respondedAt = new Date('2026-03-07T11:00:00Z');

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
                status: 'PUBLISHED',
                ownerUserId: 'c1',
              },
            }),
            update: jest.fn().mockResolvedValue({
              id: 'inv1',
              status: 'DECLINED',
              declinedAt,
              respondedAt,
              updatedAt,
            }),
          },
        };
        return callback(tx);
      });

      const result = await invitesService.declineInvite({
        userId: 'd1',
        inviteId: 'inv1',
      });

      expect(result.status).toBe('DECLINED');
      expect(result.responded_at).toBe(respondedAt.toISOString());
      expect(notificationsServiceMock.createNotification).toHaveBeenCalled();
    });

    test('throws error when user is not invite recipient', async () => {
      prismaMock.$transaction.mockImplementation(async (callback) => {
        const tx = {
          taskInvite: {
            findUnique: jest.fn().mockResolvedValue({
              id: 'inv1',
              taskId: 't1',
              companyUserId: 'c1',
              developerUserId: 'd2',
              status: 'PENDING',
            }),
          },
        };
        return callback(tx);
      });

      await expect(
        invitesService.declineInvite({
          userId: 'd1',
          inviteId: 'inv1',
        })
      ).rejects.toMatchObject({
        status: 403,
        code: 'NOT_INVITE_RECIPIENT',
      });
    });

    test('throws error when invite already processed', async () => {
      prismaMock.$transaction.mockImplementation(async (callback) => {
        const tx = {
          taskInvite: {
            findUnique: jest.fn().mockResolvedValue({
              id: 'inv1',
              taskId: 't1',
              companyUserId: 'c1',
              developerUserId: 'd1',
              status: 'ACCEPTED',
            }),
          },
        };
        return callback(tx);
      });

      await expect(
        invitesService.declineInvite({
          userId: 'd1',
          inviteId: 'inv1',
        })
      ).rejects.toMatchObject({
        status: 409,
        code: 'INVALID_STATE',
      });
    });

    test('declines invite and skips email when task is missing', async () => {
      const respondedAt = new Date('2026-03-07T11:00:00Z');

      prismaMock.$transaction.mockImplementation(async (callback) => {
        const tx = {
          taskInvite: {
            findUnique: jest.fn().mockResolvedValue({
              id: 'inv1',
              taskId: 't1',
              companyUserId: 'c1',
              developerUserId: 'd1',
              status: 'PENDING',
            }),
            update: jest.fn().mockResolvedValue({
              id: 'inv1',
              status: 'DECLINED',
              respondedAt,
            }),
          },
        };
        return callback(tx);
      });

      prismaMock.user.findUnique.mockResolvedValue({
        id: 'c1',
        email: 'company@example.com',
        emailVerified: true,
        companyProfile: { companyName: 'Acme' },
      });
      prismaMock.task.findUnique.mockResolvedValue(null);

      await invitesService.declineInvite({
        userId: 'd1',
        inviteId: 'inv1',
      });

      expect(emailServiceMock.sendImportantNotificationEmail).not.toHaveBeenCalled();
    });
  });
});
