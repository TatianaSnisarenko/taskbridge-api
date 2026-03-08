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

describe('tasks.service - workflows reviews', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    prismaMock.$transaction.mockImplementation(async (callback) => {
      return await callback(prismaMock);
    });
    prismaMock.taskTechnology.createMany.mockResolvedValue({ count: 0 });
    prismaMock.taskTechnology.deleteMany.mockResolvedValue({ count: 0 });
  });

  describe('createReview', () => {
    test('createReview rejects missing task', async () => {
      prismaMock.$transaction.mockImplementation((callback) => callback(prismaMock));
      prismaMock.task.findUnique.mockResolvedValue(null);

      await expect(
        tasksService.createReview({
          userId: 'u1',
          taskId: 't1',
          review: { rating: 5, text: 'Great work' },
        })
      ).rejects.toMatchObject({
        status: 404,
        code: 'NOT_FOUND',
      });
    });

    test('createReview rejects deleted task', async () => {
      prismaMock.$transaction.mockImplementation((callback) => callback(prismaMock));
      prismaMock.task.findUnique.mockResolvedValue({
        id: 't1',
        ownerUserId: 'u1',
        status: 'COMPLETED',
        deletedAt: new Date(),
        acceptedApplicationId: 'a1',
        acceptedApplication: { developerUserId: 'u2' },
      });

      await expect(
        tasksService.createReview({
          userId: 'u1',
          taskId: 't1',
          review: { rating: 5, text: 'Great work' },
        })
      ).rejects.toMatchObject({
        status: 404,
        code: 'NOT_FOUND',
      });
    });

    test('createReview rejects non-completed task', async () => {
      prismaMock.$transaction.mockImplementation((callback) => callback(prismaMock));
      prismaMock.task.findUnique.mockResolvedValue({
        id: 't1',
        ownerUserId: 'u1',
        status: 'IN_PROGRESS',
        deletedAt: null,
        acceptedApplicationId: 'a1',
        acceptedApplication: { developerUserId: 'u2' },
      });

      await expect(
        tasksService.createReview({
          userId: 'u1',
          taskId: 't1',
          review: { rating: 5, text: 'Great work' },
        })
      ).rejects.toMatchObject({
        status: 409,
        code: 'INVALID_STATE',
      });
    });

    test('createReview rejects non-participant', async () => {
      prismaMock.$transaction.mockImplementation((callback) => callback(prismaMock));
      prismaMock.task.findUnique.mockResolvedValue({
        id: 't1',
        ownerUserId: 'u1',
        status: 'COMPLETED',
        deletedAt: null,
        acceptedApplicationId: 'a1',
        acceptedApplication: { developerUserId: 'u2' },
      });

      await expect(
        tasksService.createReview({
          userId: 'u3',
          taskId: 't1',
          review: { rating: 5, text: 'Great work' },
        })
      ).rejects.toMatchObject({
        status: 403,
        code: 'FORBIDDEN',
      });
    });

    test('createReview rejects missing developer', async () => {
      prismaMock.$transaction.mockImplementation((callback) => callback(prismaMock));
      prismaMock.task.findUnique.mockResolvedValue({
        id: 't1',
        ownerUserId: 'u1',
        status: 'COMPLETED',
        deletedAt: null,
        acceptedApplicationId: null,
        acceptedApplication: null,
      });

      await expect(
        tasksService.createReview({
          userId: 'u1',
          taskId: 't1',
          review: { rating: 5, text: 'Great work' },
        })
      ).rejects.toMatchObject({
        status: 409,
        code: 'INVALID_STATE',
      });
    });

    test('createReview rejects duplicate review', async () => {
      prismaMock.$transaction.mockImplementation((callback) => callback(prismaMock));
      prismaMock.task.findUnique.mockResolvedValue({
        id: 't1',
        ownerUserId: 'u1',
        status: 'COMPLETED',
        deletedAt: null,
        acceptedApplicationId: 'a1',
        acceptedApplication: { developerUserId: 'u2' },
      });
      prismaMock.review = {
        findUnique: jest.fn().mockResolvedValue({ id: 'r1' }),
      };

      await expect(
        tasksService.createReview({
          userId: 'u1',
          taskId: 't1',
          review: { rating: 5, text: 'Great work' },
        })
      ).rejects.toMatchObject({
        status: 409,
        code: 'ALREADY_REVIEWED',
      });
    });

    test('createReview creates review from owner', async () => {
      const createdAt = new Date('2026-02-14T10:00:00Z');
      prismaMock.$transaction.mockImplementation((callback) => callback(prismaMock));
      prismaMock.task.findUnique.mockResolvedValue({
        id: 't1',
        ownerUserId: 'u1',
        status: 'COMPLETED',
        deletedAt: null,
        acceptedApplicationId: 'a1',
        acceptedApplication: { developerUserId: 'u2' },
      });
      prismaMock.review = {
        findUnique: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({
          id: 'r1',
          taskId: 't1',
          authorUserId: 'u1',
          targetUserId: 'u2',
          rating: 5,
          text: 'Great work',
          createdAt,
        }),
      };
      notificationsServiceMock.createNotification.mockResolvedValue(null);

      const result = await tasksService.createReview({
        userId: 'u1',
        taskId: 't1',
        review: { rating: 5, text: 'Great work' },
      });

      expect(result).toEqual({
        reviewId: 'r1',
        taskId: 't1',
        authorUserId: 'u1',
        targetUserId: 'u2',
        rating: 5,
        text: 'Great work',
        createdAt,
      });

      expect(notificationsServiceMock.createNotification).toHaveBeenCalledWith({
        client: prismaMock,
        userId: 'u2',
        actorUserId: 'u1',
        taskId: 't1',
        type: 'REVIEW_CREATED',
        payload: {
          review_id: 'r1',
          task_id: 't1',
          rating: 5,
        },
      });
    });

    test('createReview creates review from developer', async () => {
      const createdAt = new Date('2026-02-14T10:00:00Z');
      prismaMock.$transaction.mockImplementation((callback) => callback(prismaMock));
      prismaMock.task.findUnique.mockResolvedValue({
        id: 't1',
        ownerUserId: 'u1',
        status: 'COMPLETED',
        deletedAt: null,
        acceptedApplicationId: 'a1',
        acceptedApplication: { developerUserId: 'u2' },
      });
      prismaMock.review = {
        findUnique: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({
          id: 'r2',
          taskId: 't1',
          authorUserId: 'u2',
          targetUserId: 'u1',
          rating: 4,
          text: 'Professional company',
          createdAt,
        }),
      };
      notificationsServiceMock.createNotification.mockResolvedValue(null);

      const result = await tasksService.createReview({
        userId: 'u2',
        taskId: 't1',
        review: { rating: 4, text: 'Professional company' },
      });

      expect(result).toEqual({
        reviewId: 'r2',
        taskId: 't1',
        authorUserId: 'u2',
        targetUserId: 'u1',
        rating: 4,
        text: 'Professional company',
        createdAt,
      });

      expect(notificationsServiceMock.createNotification).toHaveBeenCalledWith({
        client: prismaMock,
        userId: 'u1',
        actorUserId: 'u2',
        taskId: 't1',
        type: 'REVIEW_CREATED',
        payload: {
          review_id: 'r2',
          task_id: 't1',
          rating: 4,
        },
      });
    });
  });
});
