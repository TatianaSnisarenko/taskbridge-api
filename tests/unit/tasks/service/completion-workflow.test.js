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
  },
  chatMessage: {
    create: jest.fn(),
  },
  chatThreadRead: {
    upsert: jest.fn(),
  },
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

describe('tasks.service - completion workflow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    prismaMock.$transaction.mockImplementation(async (callback) => {
      return await callback(prismaMock);
    });
    prismaMock.taskTechnology.createMany.mockResolvedValue({ count: 0 });
    prismaMock.taskTechnology.deleteMany.mockResolvedValue({ count: 0 });
  });

  describe('requestTaskCompletion', () => {
    test('rejects missing task', async () => {
      prismaMock.$transaction.mockImplementation(async (cb) => cb(prismaMock));
      prismaMock.task.findUnique.mockResolvedValue(null);

      await expect(
        tasksService.requestTaskCompletion({
          userId: 'dev1',
          taskId: 't1',
        })
      ).rejects.toMatchObject({
        status: 404,
        code: 'NOT_FOUND',
      });
    });

    test('rejects deleted task', async () => {
      prismaMock.$transaction.mockImplementation(async (cb) => cb(prismaMock));
      prismaMock.task.findUnique.mockResolvedValue({
        id: 't1',
        deletedAt: new Date(),
        status: 'IN_PROGRESS',
      });

      await expect(
        tasksService.requestTaskCompletion({
          userId: 'dev1',
          taskId: 't1',
        })
      ).rejects.toMatchObject({
        status: 404,
        code: 'NOT_FOUND',
      });
    });

    test('rejects invalid state', async () => {
      prismaMock.$transaction.mockImplementation(async (cb) => cb(prismaMock));
      prismaMock.task.findUnique.mockResolvedValue({
        id: 't1',
        ownerUserId: 'owner1',
        status: 'PUBLISHED',
        deletedAt: null,
        acceptedApplicationId: 'a1',
        acceptedApplication: { developerUserId: 'dev1' },
      });

      await expect(
        tasksService.requestTaskCompletion({
          userId: 'dev1',
          taskId: 't1',
        })
      ).rejects.toMatchObject({
        status: 409,
        code: 'INVALID_STATE',
      });
    });

    test('rejects non-accepted developer', async () => {
      prismaMock.$transaction.mockImplementation(async (cb) => cb(prismaMock));
      prismaMock.task.findUnique.mockResolvedValue({
        id: 't1',
        ownerUserId: 'owner1',
        status: 'IN_PROGRESS',
        deletedAt: null,
        acceptedApplicationId: 'a1',
        acceptedApplication: { developerUserId: 'dev2' },
      });

      await expect(
        tasksService.requestTaskCompletion({
          userId: 'dev1',
          taskId: 't1',
        })
      ).rejects.toMatchObject({
        status: 403,
        code: 'FORBIDDEN',
      });
    });

    test('updates task status and creates notification', async () => {
      prismaMock.$transaction.mockImplementation(async (cb) => cb(prismaMock));
      prismaMock.task.findUnique.mockResolvedValue({
        id: 't1',
        ownerUserId: 'owner1',
        status: 'IN_PROGRESS',
        deletedAt: null,
        acceptedApplicationId: 'a1',
        acceptedApplication: { developerUserId: 'dev1' },
      });
      prismaMock.task.update.mockResolvedValue({
        id: 't1',
        title: 'Test Task',
        status: 'COMPLETION_REQUESTED',
      });
      prismaMock.user.findUnique.mockResolvedValue({
        id: 'owner1',
        email: 'owner@example.com',
        emailVerified: true,
        companyProfile: { companyName: 'Test Company' },
      });

      const result = await tasksService.requestTaskCompletion({
        userId: 'dev1',
        taskId: 't1',
      });

      expect(prismaMock.task.update).toHaveBeenCalledWith({
        where: { id: 't1' },
        data: {
          status: 'COMPLETION_REQUESTED',
        },
        select: { id: true, title: true, status: true },
      });

      expect(notificationsServiceMock.createNotification).toHaveBeenCalledWith({
        client: prismaMock,
        userId: 'owner1',
        actorUserId: 'dev1',
        taskId: 't1',
        type: 'COMPLETION_REQUESTED',
        payload: {
          task_id: 't1',
        },
      });

      expect(result).toEqual({
        taskId: 't1',
        status: 'COMPLETION_REQUESTED',
      });
    });
  });

  describe('confirmTaskCompletion', () => {
    test('rejects missing task', async () => {
      prismaMock.$transaction.mockImplementation(async (cb) => cb(prismaMock));
      prismaMock.task.findUnique.mockResolvedValue(null);

      await expect(
        tasksService.confirmTaskCompletion({
          userId: 'owner1',
          taskId: 't1',
        })
      ).rejects.toMatchObject({
        status: 404,
        code: 'NOT_FOUND',
      });
    });

    test('rejects deleted task', async () => {
      prismaMock.$transaction.mockImplementation(async (cb) => cb(prismaMock));
      prismaMock.task.findUnique.mockResolvedValue({
        id: 't1',
        deletedAt: new Date(),
        status: 'COMPLETION_REQUESTED',
      });

      await expect(
        tasksService.confirmTaskCompletion({
          userId: 'owner1',
          taskId: 't1',
        })
      ).rejects.toMatchObject({
        status: 404,
        code: 'NOT_FOUND',
      });
    });

    test('rejects non-owner', async () => {
      prismaMock.$transaction.mockImplementation(async (cb) => cb(prismaMock));
      prismaMock.task.findUnique.mockResolvedValue({
        id: 't1',
        ownerUserId: 'owner2',
        status: 'COMPLETION_REQUESTED',
        deletedAt: null,
        acceptedApplicationId: 'a1',
        acceptedApplication: { developerUserId: 'dev1' },
      });

      await expect(
        tasksService.confirmTaskCompletion({
          userId: 'owner1',
          taskId: 't1',
        })
      ).rejects.toMatchObject({
        status: 403,
        code: 'NOT_OWNER',
      });
    });

    test('rejects invalid state', async () => {
      prismaMock.$transaction.mockImplementation(async (cb) => cb(prismaMock));
      prismaMock.task.findUnique.mockResolvedValue({
        id: 't1',
        ownerUserId: 'owner1',
        status: 'IN_PROGRESS',
        deletedAt: null,
        acceptedApplicationId: 'a1',
        acceptedApplication: { developerUserId: 'dev1' },
      });

      await expect(
        tasksService.confirmTaskCompletion({
          userId: 'owner1',
          taskId: 't1',
        })
      ).rejects.toMatchObject({
        status: 409,
        code: 'INVALID_STATE',
      });
    });

    test('rejects missing accepted developer', async () => {
      prismaMock.$transaction.mockImplementation(async (cb) => cb(prismaMock));
      prismaMock.task.findUnique.mockResolvedValue({
        id: 't1',
        ownerUserId: 'owner1',
        status: 'COMPLETION_REQUESTED',
        deletedAt: null,
        acceptedApplicationId: null,
        acceptedApplication: null,
      });

      await expect(
        tasksService.confirmTaskCompletion({
          userId: 'owner1',
          taskId: 't1',
        })
      ).rejects.toMatchObject({
        status: 409,
        code: 'INVALID_STATE',
      });
    });

    test('updates task status and creates notification', async () => {
      const completedAt = new Date('2026-02-14T15:00:00Z');
      prismaMock.$transaction.mockImplementation(async (cb) => cb(prismaMock));
      prismaMock.task.findUnique.mockResolvedValue({
        id: 't1',
        ownerUserId: 'owner1',
        status: 'COMPLETION_REQUESTED',
        deletedAt: null,
        acceptedApplicationId: 'a1',
        acceptedApplication: { developerUserId: 'dev1' },
      });
      prismaMock.task.update.mockResolvedValue({
        id: 't1',
        title: 'Test Task',
        status: 'COMPLETED',
        completedAt,
      });
      prismaMock.user.findUnique.mockResolvedValue({
        id: 'dev1',
        email: 'dev@example.com',
        emailVerified: true,
        developerProfile: { displayName: 'Test Developer' },
      });

      const result = await tasksService.confirmTaskCompletion({
        userId: 'owner1',
        taskId: 't1',
      });

      expect(prismaMock.task.update).toHaveBeenCalledWith({
        where: { id: 't1' },
        data: {
          status: 'COMPLETED',
          completedAt: expect.any(Date),
        },
        select: { id: true, title: true, status: true, completedAt: true, projectId: true },
      });

      expect(notificationsServiceMock.createNotification).toHaveBeenCalledWith({
        client: prismaMock,
        userId: 'dev1',
        actorUserId: 'owner1',
        taskId: 't1',
        type: 'TASK_COMPLETED',
        payload: {
          task_id: 't1',
          completed_at: completedAt.toISOString(),
        },
      });

      expect(result).toEqual({
        taskId: 't1',
        status: 'COMPLETED',
        completedAt,
      });
    });
  });
});
