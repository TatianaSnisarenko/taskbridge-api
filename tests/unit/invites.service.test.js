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

const invitesService = await import('../../src/services/invites/index.js');

describe('invites.service', () => {
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
