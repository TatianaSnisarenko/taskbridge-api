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

describe('tasks.service - workflows completion reject core', () => {
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

  describe('rejectTaskCompletion', () => {
    test('rejects missing task', async () => {
      prismaMock.$transaction.mockImplementation(async (callback) => {
        const tx = { ...prismaMock };
        tx.task = { findUnique: jest.fn().mockResolvedValue(null) };
        return await callback(tx);
      });

      await expect(
        tasksService.rejectTaskCompletion({ userId: 'c1', taskId: 't1', feedback: 'Fix this' })
      ).rejects.toMatchObject({
        status: 404,
        code: 'NOT_FOUND',
      });
    });

    test('rejects deleted task', async () => {
      prismaMock.$transaction.mockImplementation(async (callback) => {
        const tx = { ...prismaMock };
        tx.task = {
          findUnique: jest.fn().mockResolvedValue({
            id: 't1',
            deletedAt: new Date(),
            status: 'COMPLETION_REQUESTED',
          }),
        };
        return await callback(tx);
      });

      await expect(
        tasksService.rejectTaskCompletion({ userId: 'c1', taskId: 't1', feedback: 'Fix this' })
      ).rejects.toMatchObject({
        status: 404,
        code: 'NOT_FOUND',
      });
    });

    test('rejects non-owner rejecting completion', async () => {
      prismaMock.$transaction.mockImplementation(async (callback) => {
        const tx = { ...prismaMock };
        tx.task = {
          findUnique: jest.fn().mockResolvedValue({
            id: 't1',
            ownerUserId: 'c2',
            status: 'COMPLETION_REQUESTED',
            deletedAt: null,
            rejectionCount: 0,
            acceptedApplicationId: 'app1',
            acceptedApplication: { developerUserId: 'dev1' },
            chatThread: null,
          }),
        };
        return await callback(tx);
      });

      await expect(
        tasksService.rejectTaskCompletion({ userId: 'c1', taskId: 't1', feedback: 'Fix this' })
      ).rejects.toMatchObject({
        status: 403,
        code: 'NOT_OWNER',
      });
    });

    test('rejects task not in COMPLETION_REQUESTED status', async () => {
      prismaMock.$transaction.mockImplementation(async (callback) => {
        const tx = { ...prismaMock };
        tx.task = {
          findUnique: jest.fn().mockResolvedValue({
            id: 't1',
            ownerUserId: 'c1',
            status: 'IN_PROGRESS',
            deletedAt: null,
            rejectionCount: 0,
            acceptedApplicationId: 'app1',
            acceptedApplication: { developerUserId: 'dev1' },
            chatThread: null,
          }),
        };
        return await callback(tx);
      });

      await expect(
        tasksService.rejectTaskCompletion({ userId: 'c1', taskId: 't1', feedback: 'Fix this' })
      ).rejects.toMatchObject({
        status: 409,
        code: 'INVALID_STATE',
      });
    });

    test('rejects task without accepted developer', async () => {
      prismaMock.$transaction.mockImplementation(async (callback) => {
        const tx = { ...prismaMock };
        tx.task = {
          findUnique: jest.fn().mockResolvedValue({
            id: 't1',
            ownerUserId: 'c1',
            status: 'COMPLETION_REQUESTED',
            deletedAt: null,
            rejectionCount: 0,
            acceptedApplicationId: null,
            acceptedApplication: null,
            chatThread: null,
          }),
        };
        return await callback(tx);
      });

      await expect(
        tasksService.rejectTaskCompletion({ userId: 'c1', taskId: 't1', feedback: 'Fix this' })
      ).rejects.toMatchObject({
        status: 409,
        code: 'INVALID_STATE',
      });
    });

    test('rejects completion on first attempt (returns to IN_PROGRESS)', async () => {
      prismaMock.$transaction.mockImplementation(async (callback) => {
        const tx = {
          ...prismaMock,
          task: {
            findUnique: jest.fn().mockResolvedValue({
              id: 't1',
              title: 'Backend Task',
              ownerUserId: 'c1',
              status: 'COMPLETION_REQUESTED',
              deletedAt: null,
              rejectionCount: 0,
              acceptedApplicationId: 'app1',
              acceptedApplication: { developerUserId: 'dev1' },
              chatThread: { id: 'thread1' },
            }),
            update: jest.fn().mockResolvedValue({
              id: 't1',
              title: 'Backend Task',
              status: 'IN_PROGRESS',
              rejectionCount: 1,
              failedAt: null,
              projectId: null,
            }),
          },
          chatMessage: {
            create: jest.fn().mockResolvedValue({ id: 'msg1' }),
          },
          chatThread: {
            update: jest.fn().mockResolvedValue({ id: 'thread1' }),
          },
        };
        return await callback(tx);
      });

      const result = await tasksService.rejectTaskCompletion({
        userId: 'c1',
        taskId: 't1',
        feedback: 'Please add more tests',
      });

      expect(result).toEqual({
        taskId: 't1',
        status: 'IN_PROGRESS',
        rejectionCount: 1,
        isFinalRejection: false,
      });

      expect(notificationsServiceMock.createNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'dev1',
          actorUserId: 'c1',
          taskId: 't1',
          type: 'COMPLETION_REQUESTED',
          payload: expect.objectContaining({
            task_id: 't1',
            status: 'IN_PROGRESS',
            rejection_count: 1,
            is_final: false,
          }),
        })
      );
    });

    test('rejects completion on second attempt (returns to IN_PROGRESS)', async () => {
      prismaMock.$transaction.mockImplementation(async (callback) => {
        const tx = {
          ...prismaMock,
          task: {
            findUnique: jest.fn().mockResolvedValue({
              id: 't1',
              title: 'Backend Task',
              ownerUserId: 'c1',
              status: 'COMPLETION_REQUESTED',
              deletedAt: null,
              rejectionCount: 1,
              acceptedApplicationId: 'app1',
              acceptedApplication: { developerUserId: 'dev1' },
              chatThread: { id: 'thread1' },
            }),
            update: jest.fn().mockResolvedValue({
              id: 't1',
              title: 'Backend Task',
              status: 'IN_PROGRESS',
              rejectionCount: 2,
              failedAt: null,
              projectId: null,
            }),
          },
          chatMessage: {
            create: jest.fn().mockResolvedValue({ id: 'msg1' }),
          },
          chatThread: {
            update: jest.fn().mockResolvedValue({ id: 'thread1' }),
          },
        };
        return await callback(tx);
      });

      const result = await tasksService.rejectTaskCompletion({
        userId: 'c1',
        taskId: 't1',
        feedback: 'Still needs work',
      });

      expect(result).toEqual({
        taskId: 't1',
        status: 'IN_PROGRESS',
        rejectionCount: 2,
        isFinalRejection: false,
      });
    });
  });
});
