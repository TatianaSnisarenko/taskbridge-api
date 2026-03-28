import { jest } from '@jest/globals';

const prismaMock = {
  $transaction: jest.fn(),
  $queryRaw: jest.fn(),
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

const candidatesCacheMock = {
  getCachedCandidateCount: jest.fn(),
  setCachedCandidateCount: jest.fn(async () => true),
  invalidateCachedCandidateCount: jest.fn(async () => true),
  invalidateCachedCandidateCounts: jest.fn(async () => true),
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
jest.unstable_mockModule('../../src/cache/candidates.js', () => candidatesCacheMock);

const tasksService = await import('../../../src/services/tasks/index.js');

describe('tasks.catalog-candidates.service - applications mapping', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    prismaMock.$transaction.mockImplementation(async (callback) => callback(prismaMock));
    prismaMock.taskTechnology.createMany.mockResolvedValue({ count: 0 });
    prismaMock.taskTechnology.deleteMany.mockResolvedValue({ count: 0 });
    candidatesCacheMock.getCachedCandidateCount.mockResolvedValue(null);
  });

  test('getTaskApplications returns mapped paginated payload', async () => {
    prismaMock.task.findUnique.mockResolvedValue({
      id: 't1',
      ownerUserId: 'u1',
      status: 'PUBLISHED',
      deletedAt: null,
    });

    prismaMock.application.findMany.mockResolvedValue([
      {
        id: 'app1',
        status: 'APPLIED',
        message: 'Hello',
        proposedPlan: 'Plan',
        availabilityNote: 'FT',
        createdAt: new Date('2026-03-01T10:00:00.000Z'),
        developer: {
          id: 'dev1',
          developerProfile: {
            displayName: 'Dev One',
            jobTitle: 'Backend',
            avatarUrl: null,
            avgRating: 4.5,
            reviewsCount: 12,
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
          application_id: 'app1',
          status: 'APPLIED',
          message: 'Hello',
          proposed_plan: 'Plan',
          availability_note: 'FT',
          created_at: '2026-03-01T10:00:00.000Z',
          developer: {
            user_id: 'dev1',
            display_name: 'Dev One',
            primary_role: 'Backend',
            avatar_url: null,
            avg_rating: 4.5,
            reviews_count: 12,
          },
        },
      ],
      page: 1,
      size: 20,
      total: 1,
    });
  });

  test('getTaskApplications maps avg_rating to null when profile rating is missing', async () => {
    prismaMock.task.findUnique.mockResolvedValue({
      id: 't1',
      ownerUserId: 'u1',
      status: 'PUBLISHED',
      deletedAt: null,
    });

    prismaMock.application.findMany.mockResolvedValue([
      {
        id: 'app2',
        status: 'APPLIED',
        message: null,
        proposedPlan: null,
        availabilityNote: null,
        createdAt: new Date('2026-03-02T10:00:00.000Z'),
        developer: {
          id: 'dev2',
          developerProfile: {
            displayName: 'Dev Two',
            jobTitle: 'Frontend',
            avatarUrl: null,
            avgRating: null,
            reviewsCount: 0,
          },
        },
      },
    ]);
    prismaMock.application.count.mockResolvedValue(1);

    const result = await tasksService.getTaskApplications({ userId: 'u1', taskId: 't1' });

    expect(result.items[0].developer.avg_rating).toBeNull();
  });
});
