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

describe('tasks.catalog-candidates.service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    prismaMock.$transaction.mockImplementation(async (callback) => {
      return await callback(prismaMock);
    });
    prismaMock.taskTechnology.createMany.mockResolvedValue({ count: 0 });
    prismaMock.taskTechnology.deleteMany.mockResolvedValue({ count: 0 });
  });

  describe('task candidates catalog', () => {
    test('getRecommendedDevelopers returns only invitable candidates and respects limit', async () => {
      prismaMock.task.findUnique.mockResolvedValue({
        id: 't1',
        ownerUserId: 'u1',
        status: 'PUBLISHED',
        deletedAt: null,
        technologies: [{ technologyId: 'tech1' }],
        acceptedApplication: null,
      });
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
        {
          userId: 'dev2',
          displayName: 'Dev Two',
          jobTitle: 'Backend',
          avatarUrl: null,
          experienceLevel: 'MIDDLE',
          availability: 'PART_TIME',
          avgRating: 4.1,
          reviewsCount: 2,
          technologies: [
            { technology: { id: 'tech1', slug: 'nodejs', name: 'Node.js', type: 'BACKEND' } },
          ],
        },
      ]);
      prismaMock.application.findMany.mockResolvedValue([{ developerUserId: 'dev2' }]);
      prismaMock.taskInvite.findMany.mockResolvedValue([]);

      const result = await tasksService.getRecommendedDevelopers({
        userId: 'u1',
        taskId: 't1',
        limit: 1,
      });

      expect(result.total).toBe(1);
      expect(result.items).toHaveLength(1);
      expect(result.items[0].user_id).toBe('dev1');
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
        {
          userId: 'dev2',
          displayName: 'Bob',
          jobTitle: 'Node Dev',
          avatarUrl: null,
          experienceLevel: 'SENIOR',
          availability: 'FULL_TIME',
          avgRating: 4.0,
          reviewsCount: 1,
          technologies: [
            { technology: { id: 'tech1', slug: 'nodejs', name: 'Node.js', type: 'BACKEND' } },
          ],
        },
      ]);
      prismaMock.application.findMany.mockResolvedValue([{ developerUserId: 'dev2' }]);
      prismaMock.taskInvite.findMany.mockResolvedValue([{ developerUserId: 'dev1' }]);

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

      expect(prismaMock.developerProfile.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            availability: 'FULL_TIME',
            experienceLevel: 'SENIOR',
            avgRating: { gte: 4 },
            userId: { not: 'acceptedDev' },
          }),
        })
      );

      expect(result.total).toBe(1);
      expect(result.items[0].user_id).toBe('dev1');
      expect(result.items[0].already_invited).toBe(true);
      expect(result.items[0].already_applied).toBe(false);
    });
  });
});
