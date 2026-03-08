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

describe('tasks.service - candidates', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    prismaMock.$transaction.mockImplementation(async (callback) => {
      return await callback(prismaMock);
    });
    prismaMock.taskTechnology.createMany.mockResolvedValue({ count: 0 });
    prismaMock.taskTechnology.deleteMany.mockResolvedValue({ count: 0 });
  });

  function setupCandidatesBaseMocks() {
    prismaMock.task.findUnique.mockResolvedValue({
      id: 't1',
      ownerUserId: 'u1',
      deletedAt: null,
      status: 'PUBLISHED',
      technologies: [{ technologyId: 'tech-1' }, { technologyId: 'tech-2' }],
      acceptedApplication: null,
    });

    prismaMock.developerProfile.findMany.mockResolvedValue([
      {
        userId: 'd1',
        displayName: 'Dev 1',
        jobTitle: 'Senior Engineer',
        avatarUrl: null,
        experienceLevel: 'SENIOR',
        availability: 'AVAILABLE',
        avgRating: 4.8,
        reviewsCount: 15,
        technologies: [],
      },
      {
        userId: 'd2',
        displayName: 'Dev 2',
        jobTitle: 'Junior Engineer',
        avatarUrl: null,
        experienceLevel: 'JUNIOR',
        availability: 'PARTIALLY_AVAILABLE',
        avgRating: 3.5,
        reviewsCount: 3,
        technologies: [],
      },
    ]);
  }

  test('getTaskCandidates applies availability filter', async () => {
    setupCandidatesBaseMocks();
    prismaMock.application.findMany.mockResolvedValue([]);
    prismaMock.taskInvite.findMany.mockResolvedValue([]);

    await tasksService.getTaskCandidates({
      userId: 'u1',
      taskId: 't1',
      availability: 'AVAILABLE',
    });

    expect(prismaMock.developerProfile.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          availability: 'AVAILABLE',
        }),
      })
    );
  });

  test('getTaskCandidates applies experienceLevel filter', async () => {
    setupCandidatesBaseMocks();
    prismaMock.application.findMany.mockResolvedValue([]);
    prismaMock.taskInvite.findMany.mockResolvedValue([]);

    await tasksService.getTaskCandidates({
      userId: 'u1',
      taskId: 't1',
      experienceLevel: 'SENIOR',
    });

    expect(prismaMock.developerProfile.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          experienceLevel: 'SENIOR',
        }),
      })
    );
  });

  test('getTaskCandidates applies minRating filter', async () => {
    setupCandidatesBaseMocks();
    prismaMock.application.findMany.mockResolvedValue([]);
    prismaMock.taskInvite.findMany.mockResolvedValue([]);

    await tasksService.getTaskCandidates({
      userId: 'u1',
      taskId: 't1',
      minRating: 4.0,
    });

    expect(prismaMock.developerProfile.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          avgRating: { gte: 4.0 },
        }),
      })
    );
  });

  test('getTaskCandidates with excludeInvited flag filters invited candidates', async () => {
    setupCandidatesBaseMocks();
    prismaMock.application.findMany.mockResolvedValue([]);
    prismaMock.taskInvite.findMany.mockResolvedValue([{ developerUserId: 'd1' }]);

    const result = await tasksService.getTaskCandidates({
      userId: 'u1',
      taskId: 't1',
      excludeInvited: true,
    });

    const candidateIds = result.items.map((c) => c.user_id);
    expect(candidateIds).not.toContain('d1');
  });

  test('getTaskCandidates with excludeApplied flag filters applied candidates', async () => {
    setupCandidatesBaseMocks();
    prismaMock.application.findMany.mockResolvedValue([{ developerUserId: 'd2' }]);
    prismaMock.taskInvite.findMany.mockResolvedValue([]);

    const result = await tasksService.getTaskCandidates({
      userId: 'u1',
      taskId: 't1',
      excludeApplied: true,
    });

    const candidateIds = result.items.map((c) => c.user_id);
    expect(candidateIds).not.toContain('d2');
  });

  test('getTaskCandidates handles combined exclude filters', async () => {
    setupCandidatesBaseMocks();
    prismaMock.application.findMany.mockResolvedValue([{ developerUserId: 'd2' }]);
    prismaMock.taskInvite.findMany.mockResolvedValue([{ developerUserId: 'd1' }]);

    const result = await tasksService.getTaskCandidates({
      userId: 'u1',
      taskId: 't1',
      excludeInvited: true,
      excludeApplied: true,
    });

    expect(result.items.length).toBe(0);
  });
});
