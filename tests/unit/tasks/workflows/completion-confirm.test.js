import { jest } from '@jest/globals';

const prismaMock = {
  $transaction: jest.fn(),
  task: {
    create: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
  },
  taskDispute: {
    findFirst: jest.fn(),
    update: jest.fn(),
  },
  taskTechnology: {
    createMany: jest.fn(),
    deleteMany: jest.fn(),
  },
  user: {
    findUnique: jest.fn(),
  },
  developerProfile: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
  },
  taskInvite: {
    findMany: jest.fn(),
  },
  application: {
    findFirst: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    findUnique: jest.fn(),
  },
  chatThread: {
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  chatMessage: {
    create: jest.fn(),
  },
  chatThreadRead: {
    upsert: jest.fn(),
  },
  review: {},
};

const notificationsServiceMock = {
  createApplicationCreatedNotification: jest.fn(),
  buildTaskNotificationPayload: jest.fn(),
  createNotification: jest.fn(),
};

const technologiesServiceMock = {
  validateTechnologyIds: jest.fn(async (ids) => ids),
  incrementTechnologyPopularity: jest.fn(async () => {}),
};

const notificationEmailServiceMock = {
  sendImportantNotificationEmail: jest.fn(async () => {}),
};

jest.unstable_mockModule('../../src/db/prisma.js', () => ({ prisma: prismaMock }));
jest.unstable_mockModule(
  '../../src/services/notifications/index.js',
  () => notificationsServiceMock
);
jest.unstable_mockModule('../../src/services/technologies/index.js', () => technologiesServiceMock);
jest.unstable_mockModule(
  '../../src/services/notification-email/index.js',
  () => notificationEmailServiceMock
);

const tasksService = await import('../../../../src/services/tasks/index.js');

describe('tasks.service - workflows completion confirm', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    prismaMock.$transaction.mockImplementation(async (callback) => {
      return await callback(prismaMock);
    });
    prismaMock.taskTechnology.createMany.mockResolvedValue({ count: 0 });
    prismaMock.taskTechnology.deleteMany.mockResolvedValue({ count: 0 });
    prismaMock.taskDispute.findFirst.mockResolvedValue(null);
    prismaMock.taskDispute.update.mockResolvedValue({});
  });

  describe('confirmTaskCompletion', () => {
    test('rejects missing task', async () => {
      prismaMock.$transaction.mockImplementation(async (callback) => {
        const tx = { ...prismaMock };
        tx.task.findUnique.mockResolvedValue(null);
        return await callback(tx);
      });

      await expect(
        tasksService.confirmTaskCompletion({ userId: 'c1', taskId: 't1' })
      ).rejects.toMatchObject({
        status: 404,
        code: 'NOT_FOUND',
      });
    });

    test('rejects deleted task', async () => {
      prismaMock.$transaction.mockImplementation(async (callback) => {
        const tx = { ...prismaMock };
        tx.task.findUnique.mockResolvedValue({
          id: 't1',
          ownerUserId: 'c1',
          status: 'COMPLETION_REQUESTED',
          deletedAt: new Date(),
          acceptedApplicationId: 'app1',
          acceptedApplication: {
            developerUserId: 'dev1',
          },
        });
        return await callback(tx);
      });

      await expect(
        tasksService.confirmTaskCompletion({ userId: 'c1', taskId: 't1' })
      ).rejects.toMatchObject({
        status: 404,
        code: 'NOT_FOUND',
      });
    });

    test('rejects non-owner confirming completion', async () => {
      prismaMock.$transaction.mockImplementation(async (callback) => {
        const tx = { ...prismaMock };
        tx.task.findUnique.mockResolvedValue({
          id: 't1',
          ownerUserId: 'c2',
          status: 'COMPLETION_REQUESTED',
          deletedAt: null,
          acceptedApplicationId: 'app1',
          acceptedApplication: {
            developerUserId: 'dev1',
          },
        });
        return await callback(tx);
      });

      await expect(
        tasksService.confirmTaskCompletion({ userId: 'c1', taskId: 't1' })
      ).rejects.toMatchObject({
        status: 403,
        code: 'NOT_OWNER',
      });
    });

    test('rejects task not in COMPLETION_REQUESTED status', async () => {
      prismaMock.$transaction.mockImplementation(async (callback) => {
        const tx = { ...prismaMock };
        tx.task.findUnique.mockResolvedValue({
          id: 't1',
          ownerUserId: 'c1',
          status: 'IN_PROGRESS',
          deletedAt: null,
          acceptedApplicationId: 'app1',
          acceptedApplication: {
            developerUserId: 'dev1',
          },
        });
        return await callback(tx);
      });

      await expect(
        tasksService.confirmTaskCompletion({ userId: 'c1', taskId: 't1' })
      ).rejects.toMatchObject({
        status: 409,
        code: 'INVALID_STATE',
      });
    });

    test('rejects task with missing accepted developer', async () => {
      prismaMock.$transaction.mockImplementation(async (callback) => {
        const tx = { ...prismaMock };
        tx.task.findUnique.mockResolvedValue({
          id: 't1',
          ownerUserId: 'c1',
          status: 'COMPLETION_REQUESTED',
          deletedAt: null,
          acceptedApplicationId: null,
          acceptedApplication: null,
        });
        return await callback(tx);
      });

      await expect(
        tasksService.confirmTaskCompletion({ userId: 'c1', taskId: 't1' })
      ).rejects.toMatchObject({
        status: 409,
        code: 'INVALID_STATE',
      });
    });

    test('confirms task completion successfully without project', async () => {
      const completedAt = new Date('2026-03-10T16:00:00Z');

      prismaMock.$transaction.mockImplementation(async (callback) => {
        const tx = {
          ...prismaMock,
          task: {
            findUnique: jest.fn().mockResolvedValue({
              id: 't1',
              ownerUserId: 'c1',
              status: 'COMPLETION_REQUESTED',
              deletedAt: null,
              acceptedApplicationId: 'app1',
              acceptedApplication: {
                developerUserId: 'dev1',
              },
            }),
            update: jest.fn().mockResolvedValue({
              id: 't1',
              title: 'Backend Task',
              status: 'COMPLETED',
              completedAt,
              projectId: null,
            }),
          },
        };
        return await callback(tx);
      });

      prismaMock.user.findUnique.mockResolvedValue({
        id: 'dev1',
        email: 'dev@example.com',
        emailVerified: true,
        developerProfile: { displayName: 'Developer' },
      });

      const result = await tasksService.confirmTaskCompletion({
        userId: 'c1',
        taskId: 't1',
      });

      expect(result.taskId).toBe('t1');
      expect(result.status).toBe('COMPLETED');
      expect(result.completedAt).toEqual(completedAt);
    });

    test('confirms completion without auto-archiving project at max_talents', async () => {
      const completedAt = new Date('2026-03-10T16:00:00Z');

      prismaMock.$transaction.mockImplementation(async (callback) => {
        const tx = {
          ...prismaMock,
          task: {
            findUnique: jest.fn().mockResolvedValue({
              id: 't1',
              ownerUserId: 'c1',
              status: 'COMPLETION_REQUESTED',
              deletedAt: null,
              acceptedApplicationId: 'app1',
              acceptedApplication: {
                developerUserId: 'dev1',
              },
            }),
            update: jest.fn().mockResolvedValue({
              id: 't1',
              title: 'Backend Task',
              status: 'COMPLETED',
              completedAt,
              projectId: 'p1',
            }),
          },
        };
        return await callback(tx);
      });

      prismaMock.user.findUnique.mockResolvedValue({
        id: 'dev1',
        email: 'dev@example.com',
        emailVerified: true,
        developerProfile: { displayName: 'Developer' },
      });

      const result = await tasksService.confirmTaskCompletion({
        userId: 'c1',
        taskId: 't1',
      });

      expect(result.status).toBe('COMPLETED');
      expect(prismaMock.$transaction).toHaveBeenCalled();
      expect(notificationsServiceMock.createNotification).not.toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'PROJECT_ARCHIVED_LIMIT_REACHED',
        })
      );
    });
  });
});
