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

describe('tasks.catalog-candidates.service - ranked queries', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    prismaMock.$transaction.mockImplementation(async (callback) => callback(prismaMock));
    prismaMock.taskTechnology.createMany.mockResolvedValue({ count: 0 });
    prismaMock.taskTechnology.deleteMany.mockResolvedValue({ count: 0 });
    candidatesCacheMock.getCachedCandidateCount.mockResolvedValue(null);
  });

  test('getRecommendedDevelopers returns only invitable candidates and respects limit', async () => {
    prismaMock.task.findUnique.mockResolvedValue({
      id: 't1',
      ownerUserId: 'u1',
      status: 'PUBLISHED',
      deletedAt: null,
      technologies: [{ technologyId: 'tech1' }],
      acceptedApplication: null,
    });

    prismaMock.$queryRaw
      .mockResolvedValueOnce([
        {
          userId: 'dev1',
          alreadyApplied: false,
          alreadyInvited: false,
          score: 65.0,
        },
      ])
      .mockResolvedValueOnce([{ total: 1 }]);

    prismaMock.developerProfile.findMany.mockResolvedValue([
      {
        userId: 'dev1',
        displayName: 'Dev One',
        jobTitle: 'Backend',
        avatarUrl: null,
        experienceLevel: 'MIDDLE',
        availability: 'PART_TIME',
        avgRating: 4.5,
        reviewsCount: 10,
        technologies: [
          { technology: { id: 'tech1', slug: 'nodejs', name: 'Node.js', type: 'BACKEND' } },
        ],
      },
    ]);

    const result = await tasksService.getRecommendedDevelopers({
      userId: 'u1',
      taskId: 't1',
      limit: 1,
    });

    expect(prismaMock.$queryRaw).toHaveBeenCalledTimes(2);
    expect(result.total).toBe(1);
    expect(result.items).toHaveLength(1);
    expect(result.items[0].user_id).toBe('dev1');
    expect(result.items[0].can_invite).toBe(true);
  });

  test('getRecommendedDevelopers falls back to total=0 when count query returns empty', async () => {
    prismaMock.task.findUnique.mockResolvedValue({
      id: 't1',
      ownerUserId: 'u1',
      status: 'PUBLISHED',
      deletedAt: null,
      technologies: [{ technologyId: 'tech1' }],
      acceptedApplication: null,
    });

    prismaMock.$queryRaw.mockResolvedValueOnce([]).mockResolvedValueOnce([]);
    prismaMock.developerProfile.findMany.mockResolvedValue([]);

    const result = await tasksService.getRecommendedDevelopers({ userId: 'u1', taskId: 't1' });

    expect(result).toEqual({ items: [], total: 0 });
  });

  test('getRecommendedDevelopers drops ranked rows that have no matching profile', async () => {
    prismaMock.task.findUnique.mockResolvedValue({
      id: 't1',
      ownerUserId: 'u1',
      status: 'PUBLISHED',
      deletedAt: null,
      technologies: [{ technologyId: 'tech1' }],
      acceptedApplication: null,
    });

    prismaMock.$queryRaw
      .mockResolvedValueOnce([
        {
          userId: 'missing-profile',
          alreadyApplied: false,
          alreadyInvited: false,
          score: 99.9,
        },
      ])
      .mockResolvedValueOnce([{ total: 1 }]);
    prismaMock.developerProfile.findMany.mockResolvedValue([]);

    const result = await tasksService.getRecommendedDevelopers({ userId: 'u1', taskId: 't1' });

    expect(result).toEqual({ items: [], total: 1 });
  });

  test('getTaskCandidates applies filters and pagination', async () => {
    prismaMock.task.findUnique.mockResolvedValue({
      id: 't1',
      ownerUserId: 'u1',
      status: 'PUBLISHED',
      deletedAt: null,
      technologies: [{ technologyId: 'tech1' }],
      acceptedApplication: { developerUserId: 'acceptedDev' },
    });

    prismaMock.$queryRaw
      .mockResolvedValueOnce([
        {
          userId: 'dev1',
          alreadyApplied: false,
          alreadyInvited: true,
          score: 58.8,
        },
      ])
      .mockResolvedValueOnce([{ total: 1 }]);

    prismaMock.developerProfile.findMany.mockResolvedValue([
      {
        userId: 'dev1',
        displayName: 'Alice',
        jobTitle: 'Node Dev',
        avatarUrl: null,
        experienceLevel: 'SENIOR',
        availability: 'FULL_TIME',
        avgRating: 4.7,
        reviewsCount: 7,
        technologies: [
          { technology: { id: 'tech1', slug: 'nodejs', name: 'Node.js', type: 'BACKEND' } },
        ],
      },
    ]);

    const result = await tasksService.getTaskCandidates({
      userId: 'u1',
      taskId: 't1',
      page: 1,
      size: 10,
      search: 'Node',
      availability: 'FULL_TIME',
      experienceLevel: 'SENIOR',
      minRating: 4,
      excludeInvited: false,
      excludeApplied: true,
    });

    expect(prismaMock.$queryRaw).toHaveBeenCalledTimes(2);
    expect(prismaMock.developerProfile.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: { in: ['dev1'] } } })
    );

    expect(result.total).toBe(1);
    expect(result.items[0].user_id).toBe('dev1');
    expect(result.items[0].already_invited).toBe(true);
    expect(result.items[0].already_applied).toBe(false);
  });

  test('getTaskCandidates stores total in cache for default listing when cache is empty', async () => {
    prismaMock.task.findUnique.mockResolvedValue({
      id: 't1',
      ownerUserId: 'u1',
      status: 'PUBLISHED',
      deletedAt: null,
      technologies: [{ technologyId: 'tech1' }],
      acceptedApplication: null,
    });

    prismaMock.$queryRaw
      .mockResolvedValueOnce([
        {
          userId: 'dev1',
          alreadyApplied: false,
          alreadyInvited: false,
          score: 60.0,
        },
      ])
      .mockResolvedValueOnce([{ total: 1 }]);

    prismaMock.developerProfile.findMany.mockResolvedValue([
      {
        userId: 'dev1',
        displayName: 'Dev One',
        jobTitle: 'Backend',
        avatarUrl: null,
        experienceLevel: 'MIDDLE',
        availability: 'PART_TIME',
        avgRating: 4.5,
        reviewsCount: 10,
        technologies: [
          { technology: { id: 'tech1', slug: 'nodejs', name: 'Node.js', type: 'BACKEND' } },
        ],
      },
    ]);

    candidatesCacheMock.getCachedCandidateCount.mockResolvedValue(null);

    await tasksService.getTaskCandidates({ userId: 'u1', taskId: 't1' });

    expect(candidatesCacheMock.getCachedCandidateCount).toHaveBeenCalledWith('t1');
    expect(candidatesCacheMock.setCachedCandidateCount).toHaveBeenCalledWith('t1', 1);
  });

  test('getTaskCandidates does not rewrite cache when total has not changed', async () => {
    prismaMock.task.findUnique.mockResolvedValue({
      id: 't1',
      ownerUserId: 'u1',
      status: 'PUBLISHED',
      deletedAt: null,
      technologies: [{ technologyId: 'tech1' }],
      acceptedApplication: null,
    });

    prismaMock.$queryRaw
      .mockResolvedValueOnce([
        {
          userId: 'dev1',
          alreadyApplied: false,
          alreadyInvited: false,
          score: 60.0,
        },
      ])
      .mockResolvedValueOnce([{ total: 1 }]);

    prismaMock.developerProfile.findMany.mockResolvedValue([
      {
        userId: 'dev1',
        displayName: 'Dev One',
        jobTitle: 'Backend',
        avatarUrl: null,
        experienceLevel: 'MIDDLE',
        availability: 'PART_TIME',
        avgRating: 4.5,
        reviewsCount: 10,
        technologies: [
          { technology: { id: 'tech1', slug: 'nodejs', name: 'Node.js', type: 'BACKEND' } },
        ],
      },
    ]);

    candidatesCacheMock.getCachedCandidateCount.mockResolvedValue(1);

    await tasksService.getTaskCandidates({ userId: 'u1', taskId: 't1' });

    expect(candidatesCacheMock.getCachedCandidateCount).toHaveBeenCalledWith('t1');
    expect(candidatesCacheMock.setCachedCandidateCount).not.toHaveBeenCalled();
  });

  test('getTaskCandidates falls back to total=0 when count query returns empty', async () => {
    prismaMock.task.findUnique.mockResolvedValue({
      id: 't1',
      ownerUserId: 'u1',
      status: 'PUBLISHED',
      deletedAt: null,
      technologies: [{ technologyId: 'tech1' }],
      acceptedApplication: null,
    });

    prismaMock.$queryRaw.mockResolvedValueOnce([]).mockResolvedValueOnce([]);
    prismaMock.developerProfile.findMany.mockResolvedValue([]);
    candidatesCacheMock.getCachedCandidateCount.mockResolvedValue(null);

    const result = await tasksService.getTaskCandidates({ userId: 'u1', taskId: 't1' });

    expect(result).toEqual({ items: [], page: 1, size: 20, total: 0 });
    expect(candidatesCacheMock.setCachedCandidateCount).toHaveBeenCalledWith('t1', 0);
  });
});
