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

describe('invites.service - accept', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('acceptInvite', () => {
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
        invitesService.acceptInvite({
          userId: 'd1',
          inviteId: 'inv1',
        })
      ).rejects.toMatchObject({
        status: 404,
        code: 'INVITE_NOT_FOUND',
      });
    });

    test('throws error when user is not the invited developer', async () => {
      prismaMock.$transaction.mockImplementation(async (callback) => {
        const tx = {
          taskInvite: {
            findUnique: jest.fn().mockResolvedValue({
              id: 'inv1',
              developerUserId: 'd2', // Different developer
              status: 'PENDING',
              task: {
                status: 'PUBLISHED',
                acceptedApplicationId: null,
                deletedAt: null,
              },
            }),
          },
        };
        return callback(tx);
      });

      await expect(
        invitesService.acceptInvite({
          userId: 'd1',
          inviteId: 'inv1',
        })
      ).rejects.toMatchObject({
        status: 403,
        code: 'NOT_INVITE_RECIPIENT',
      });
    });

    test('throws error when invite is not PENDING', async () => {
      prismaMock.$transaction.mockImplementation(async (callback) => {
        const tx = {
          taskInvite: {
            findUnique: jest.fn().mockResolvedValue({
              id: 'inv1',
              developerUserId: 'd1',
              status: 'ACCEPTED',
              task: {
                status: 'PUBLISHED',
                acceptedApplicationId: null,
                deletedAt: null,
              },
            }),
          },
        };
        return callback(tx);
      });

      await expect(
        invitesService.acceptInvite({
          userId: 'd1',
          inviteId: 'inv1',
        })
      ).rejects.toMatchObject({
        status: 409,
        code: 'INVALID_STATE',
      });
    });

    test('accepts invite successfully and sends company email', async () => {
      const respondedAt = new Date('2026-03-07T10:00:00Z');

      tasksServiceMock.startTaskWithDeveloper.mockResolvedValue({
        task_id: 't1',
        accepted_application_id: 'app1',
        task_status: 'IN_PROGRESS',
        accepted_developer_user_id: 'd1',
        company_user_id: 'c1',
      });

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
                status: 'PUBLISHED',
                ownerUserId: 'c1',
                acceptedApplicationId: null,
              },
            }),
            update: jest.fn().mockResolvedValue({
              id: 'inv1',
              status: 'ACCEPTED',
              respondedAt,
            }),
            updateMany: jest.fn().mockResolvedValue({ count: 1 }),
          },
        };
        return callback(tx);
      });

      chatServiceMock.getOrCreateChatThread.mockResolvedValue({ id: 'th1' });
      prismaMock.user.findUnique.mockResolvedValue({
        id: 'c1',
        email: 'company@example.com',
        emailVerified: true,
        companyProfile: { companyName: 'Acme' },
      });
      prismaMock.task.findUnique.mockResolvedValue({ id: 't1', title: 'Backend Task' });

      const result = await invitesService.acceptInvite({ userId: 'd1', inviteId: 'inv1' });

      expect(result).toEqual({
        invite_id: 'inv1',
        task_id: 't1',
        task_status: 'IN_PROGRESS',
        application_id: 'app1',
        accepted_developer_user_id: 'd1',
        thread_id: 'th1',
      });
      expect(chatServiceMock.getOrCreateChatThread).toHaveBeenCalled();
      expect(emailServiceMock.sendImportantNotificationEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'TASK_INVITE_ACCEPTED',
          recipient: expect.objectContaining({ email: 'company@example.com' }),
        })
      );
    });

    test('accepts invite and skips email when company user is missing', async () => {
      tasksServiceMock.startTaskWithDeveloper.mockResolvedValue({
        task_id: 't1',
        accepted_application_id: 'app1',
        task_status: 'IN_PROGRESS',
        accepted_developer_user_id: 'd1',
        company_user_id: 'c1',
      });

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
                status: 'PUBLISHED',
                ownerUserId: 'c1',
                acceptedApplicationId: null,
              },
            }),
            update: jest.fn().mockResolvedValue({ id: 'inv1', status: 'ACCEPTED' }),
            updateMany: jest.fn().mockResolvedValue({ count: 0 }),
          },
        };
        return callback(tx);
      });

      chatServiceMock.getOrCreateChatThread.mockResolvedValue(null);
      prismaMock.user.findUnique.mockResolvedValue(null);
      prismaMock.task.findUnique.mockResolvedValue({ id: 't1', title: 'Backend Task' });

      const result = await invitesService.acceptInvite({ userId: 'd1', inviteId: 'inv1' });

      expect(result.thread_id).toBeNull();
      expect(emailServiceMock.sendImportantNotificationEmail).not.toHaveBeenCalled();
    });
  });
});
