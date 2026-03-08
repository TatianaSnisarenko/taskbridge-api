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

const tasksService = await import('../../../src/services/tasks/index.js');

describe('tasks.service - Task Details & Applications', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    prismaMock.$transaction.mockImplementation(async (callback) => {
      return await callback(prismaMock);
    });
    prismaMock.taskTechnology.createMany.mockResolvedValue({ count: 0 });
    prismaMock.taskTechnology.deleteMany.mockResolvedValue({ count: 0 });
  });

  describe('getTaskApplications', () => {
    test('returns applications with developer avatar', async () => {
      prismaMock.task.findUnique.mockResolvedValue({
        id: 't1',
        ownerUserId: 'u1',
        deletedAt: null,
      });

      prismaMock.application.findMany.mockResolvedValue([
        {
          id: 'a1',
          status: 'APPLIED',
          message: 'Message',
          proposedPlan: 'Plan',
          availabilityNote: 'Evenings',
          createdAt: new Date('2026-02-14T12:00:00Z'),
          developer: {
            id: 'dev1',
            developerProfile: {
              displayName: 'Tetiana',
              jobTitle: 'Java Backend Engineer',
              avatarUrl: 'https://cdn.example.com/dev-avatar.webp',
              avgRating: 4.6,
              reviewsCount: 3,
            },
          },
        },
      ]);
      prismaMock.application.count.mockResolvedValue(1);

      const result = await tasksService.getTaskApplications({
        userId: 'u1',
        taskId: 't1',
        page: 1,
        size: 20,
      });

      expect(result).toEqual({
        items: [
          {
            application_id: 'a1',
            status: 'APPLIED',
            message: 'Message',
            proposed_plan: 'Plan',
            availability_note: 'Evenings',
            created_at: new Date('2026-02-14T12:00:00Z').toISOString(),
            developer: {
              user_id: 'dev1',
              display_name: 'Tetiana',
              primary_role: 'Java Backend Engineer',
              avatar_url: 'https://cdn.example.com/dev-avatar.webp',
              avg_rating: 4.6,
              reviews_count: 3,
            },
          },
        ],
        page: 1,
        size: 20,
        total: 1,
      });
    });
  });
});
