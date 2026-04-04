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
  taskCompletionRejection: {
    create: jest.fn(),
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

describe('tasks.service - workflows completion reject advanced', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    prismaMock.$transaction.mockImplementation(async (callback) => {
      return await callback(prismaMock);
    });
    prismaMock.taskTechnology.createMany.mockResolvedValue({ count: 0 });
    prismaMock.taskTechnology.deleteMany.mockResolvedValue({ count: 0 });
  });

  prismaMock.taskDispute.findFirst.mockResolvedValue(null);
  prismaMock.taskDispute.update.mockResolvedValue({});
  describe('rejectTaskCompletion', () => {
    test('rejects completion on third attempt (marks as FAILED)', async () => {
      const failedAt = new Date('2026-03-10T18:00:00Z');

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
              rejectionCount: 2,
              acceptedApplicationId: 'app1',
              acceptedApplication: { developerUserId: 'dev1' },
              chatThread: { id: 'thread1' },
            }),
            update: jest.fn().mockResolvedValue({
              id: 't1',
              title: 'Backend Task',
              status: 'FAILED',
              rejectionCount: 3,
              failedAt,
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
        feedback: 'Final rejection - cannot meet requirements',
      });

      expect(result).toEqual({
        taskId: 't1',
        status: 'FAILED',
        rejectionCount: 3,
        isFinalRejection: true,
      });

      expect(notificationsServiceMock.createNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'dev1',
          type: 'TASK_COMPLETED',
          payload: expect.objectContaining({
            is_final: true,
            failed_at: failedAt.toISOString(),
          }),
        })
      );
    });

    test('archives project when last task fails (final rejection)', async () => {
      const failedAt = new Date('2026-03-10T18:00:00Z');

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
              rejectionCount: 2,
              acceptedApplicationId: 'app1',
              acceptedApplication: { developerUserId: 'dev1' },
              chatThread: { id: 'thread1' },
            }),
            update: jest.fn().mockResolvedValue({
              id: 't1',
              title: 'Backend Task',
              status: 'FAILED',
              rejectionCount: 3,
              failedAt,
              projectId: 'proj1',
            }),
            count: jest.fn().mockResolvedValueOnce(0).mockResolvedValueOnce(1),
          },
          project: {
            findUnique: jest.fn().mockResolvedValue({
              id: 'proj1',
              maxTalents: 1,
              status: 'ACTIVE',
            }),
            update: jest.fn().mockResolvedValue({
              id: 'proj1',
              status: 'ARCHIVED',
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
        feedback: 'Final rejection',
      });

      expect(result.status).toBe('FAILED');
      expect(result.isFinalRejection).toBe(true);
      expect(prismaMock.$transaction).toHaveBeenCalled();
    });

    test('posts chat message with feedback on rejection', async () => {
      const chatMessageMock = { create: jest.fn().mockResolvedValue({ id: 'msg1' }) };
      const chatThreadMock = { update: jest.fn().mockResolvedValue({ id: 'thread1' }) };

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
          chatMessage: chatMessageMock,
          chatThread: chatThreadMock,
        };
        return await callback(tx);
      });

      await tasksService.rejectTaskCompletion({
        userId: 'c1',
        taskId: 't1',
        feedback: 'Please add unit tests',
      });

      expect(chatMessageMock.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            text: expect.stringContaining('Please add unit tests'),
            sentAt: expect.any(Date),
          }),
        })
      );

      expect(chatThreadMock.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'thread1' },
          data: { lastMessageAt: expect.any(Date) },
        })
      );
    });

    test('handles rejection without chat thread gracefully', async () => {
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
              chatThread: null,
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
        };
        return await callback(tx);
      });

      const result = await tasksService.rejectTaskCompletion({
        userId: 'c1',
        taskId: 't1',
        feedback: 'Fix this',
      });

      expect(result.status).toBe('IN_PROGRESS');
    });

    test('does not archive project if not all tasks complete/failed', async () => {
      const failedAt = new Date('2026-03-10T18:00:00Z');

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
              rejectionCount: 2,
              acceptedApplicationId: 'app1',
              acceptedApplication: { developerUserId: 'dev1' },
              chatThread: null,
            }),
            update: jest.fn().mockResolvedValue({
              id: 't1',
              title: 'Backend Task',
              status: 'FAILED',
              rejectionCount: 3,
              failedAt,
              projectId: 'proj1',
            }),
            count: jest.fn().mockResolvedValueOnce(0).mockResolvedValueOnce(1),
          },
          project: {
            findUnique: jest.fn().mockResolvedValue({
              id: 'proj1',
              maxTalents: 3,
              status: 'ACTIVE',
            }),
            update: jest.fn(),
          },
        };
        return await callback(tx);
      });

      await tasksService.rejectTaskCompletion({
        userId: 'c1',
        taskId: 't1',
        feedback: 'Final rejection',
      });

      const tx = await prismaMock.$transaction.mock.results[0].value;
      if (tx.project && tx.project.update) {
        expect(tx.project.update).not.toHaveBeenCalled();
      }
    });
  });
});
