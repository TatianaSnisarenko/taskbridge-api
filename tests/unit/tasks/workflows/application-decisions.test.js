import { jest } from '@jest/globals';

const prismaMock = {
  $transaction: jest.fn(),
  project: {
    findUnique: jest.fn(),
    update: jest.fn(),
  },
  task: {
    create: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
    count: jest.fn(),
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

describe('tasks.service - workflows application decisions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    prismaMock.$transaction.mockImplementation(async (callback) => {
      return await callback(prismaMock);
    });
    prismaMock.taskTechnology.createMany.mockResolvedValue({ count: 0 });
    prismaMock.taskTechnology.deleteMany.mockResolvedValue({ count: 0 });
  });

  describe('acceptApplication', () => {
    test('rejects missing application', async () => {
      prismaMock.$transaction.mockImplementation(async (callback) => {
        const tx = { ...prismaMock };
        tx.application.findUnique.mockResolvedValue(null);
        return await callback(tx);
      });

      await expect(
        tasksService.acceptApplication({ userId: 'c1', applicationId: 'app1' })
      ).rejects.toMatchObject({
        status: 404,
        code: 'NOT_FOUND',
      });
    });

    test('rejects non-owner accepting application', async () => {
      prismaMock.$transaction.mockImplementation(async (callback) => {
        const tx = { ...prismaMock };
        tx.application.findUnique.mockResolvedValue({
          id: 'app1',
          taskId: 't1',
          developerUserId: 'dev1',
          task: {
            id: 't1',
            ownerUserId: 'c2',
            status: 'PUBLISHED',
            acceptedApplicationId: null,
          },
        });
        return await callback(tx);
      });

      await expect(
        tasksService.acceptApplication({ userId: 'c1', applicationId: 'app1' })
      ).rejects.toMatchObject({
        status: 403,
        code: 'NOT_OWNER',
      });
    });

    test('accepts application and starts task', async () => {
      const completedAt = new Date('2026-03-10T15:00:00Z');

      prismaMock.$transaction.mockImplementation(async (callback) => {
        const tx = {
          ...prismaMock,
          application: {
            findUnique: jest.fn().mockResolvedValue({
              id: 'app1',
              taskId: 't1',
              developerUserId: 'dev1',
              status: 'APPLIED',
              task: {
                id: 't1',
                ownerUserId: 'c1',
                status: 'PUBLISHED',
                acceptedApplicationId: null,
              },
            }),
            findMany: jest.fn().mockResolvedValue([]),
            update: jest.fn().mockResolvedValue({
              id: 'app1',
              status: 'ACCEPTED',
              updatedAt: completedAt,
            }),
            updateMany: jest.fn().mockResolvedValue({ count: 0 }),
          },
          task: {
            findUnique: jest.fn().mockResolvedValue({
              id: 't1',
              ownerUserId: 'c1',
              status: 'PUBLISHED',
              acceptedApplicationId: null,
            }),
            update: jest.fn().mockResolvedValue({
              id: 't1',
              status: 'IN_PROGRESS',
              acceptedApplicationId: 'app1',
            }),
          },
        };
        return await callback(tx);
      });

      prismaMock.chatThread.findUnique.mockResolvedValue(null);
      prismaMock.chatThread.create.mockResolvedValue({
        id: 'thread1',
        taskId: 't1',
      });
      prismaMock.user.findUnique.mockResolvedValue({
        id: 'dev1',
        email: 'dev@example.com',
        emailVerified: true,
        developerProfile: { displayName: 'Developer' },
      });
      prismaMock.task.findUnique.mockResolvedValue({
        id: 't1',
        title: 'Backend Task',
        owner: {
          companyProfile: { companyName: 'Tech Corp' },
        },
      });

      const result = await tasksService.acceptApplication({
        userId: 'c1',
        applicationId: 'app1',
      });

      expect(result.task_id).toBe('t1');
      expect(result.company_user_id).toBe('c1');
      expect(result.accepted_developer_user_id).toBe('dev1');
    });
  });

  describe('rejectApplication', () => {
    test('rejects missing application', async () => {
      prismaMock.$transaction.mockImplementation(async (callback) => {
        const tx = { ...prismaMock };
        tx.application.findUnique.mockResolvedValue(null);
        return await callback(tx);
      });

      await expect(
        tasksService.rejectApplication({ userId: 'c1', applicationId: 'app1' })
      ).rejects.toMatchObject({
        status: 404,
        code: 'NOT_FOUND',
      });
    });

    test('rejects non-owner rejecting application', async () => {
      prismaMock.$transaction.mockImplementation(async (callback) => {
        const tx = { ...prismaMock };
        tx.application.findUnique.mockResolvedValue({
          id: 'app1',
          taskId: 't1',
          developerUserId: 'dev1',
          status: 'APPLIED',
          task: {
            id: 't1',
            ownerUserId: 'c2',
          },
        });
        return await callback(tx);
      });

      await expect(
        tasksService.rejectApplication({ userId: 'c1', applicationId: 'app1' })
      ).rejects.toMatchObject({
        status: 403,
        code: 'NOT_OWNER',
      });
    });

    test('rejects already processed application', async () => {
      prismaMock.$transaction.mockImplementation(async (callback) => {
        const tx = { ...prismaMock };
        tx.application.findUnique.mockResolvedValue({
          id: 'app1',
          taskId: 't1',
          developerUserId: 'dev1',
          status: 'ACCEPTED',
          task: {
            id: 't1',
            ownerUserId: 'c1',
          },
        });
        return await callback(tx);
      });

      await expect(
        tasksService.rejectApplication({ userId: 'c1', applicationId: 'app1' })
      ).rejects.toMatchObject({
        status: 409,
        code: 'INVALID_STATE',
      });
    });

    test('rejects application successfully', async () => {
      const updatedAt = new Date('2026-03-10T15:00:00Z');

      prismaMock.$transaction.mockImplementation(async (callback) => {
        const tx = {
          ...prismaMock,
          application: {
            findUnique: jest.fn().mockResolvedValue({
              id: 'app1',
              taskId: 't1',
              developerUserId: 'dev1',
              status: 'APPLIED',
              task: {
                id: 't1',
                ownerUserId: 'c1',
              },
            }),
            update: jest.fn().mockResolvedValue({
              id: 'app1',
              status: 'REJECTED',
              updatedAt,
            }),
          },
        };
        return await callback(tx);
      });

      const result = await tasksService.rejectApplication({
        userId: 'c1',
        applicationId: 'app1',
      });

      expect(result.application_id).toBe('app1');
      expect(result.status).toBe('REJECTED');
      expect(result.updated_at).toBe(updatedAt.toISOString());
    });
  });
});
