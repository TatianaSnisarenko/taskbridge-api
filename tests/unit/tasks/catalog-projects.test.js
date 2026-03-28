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

const tasksCatalogCacheMock = {
  getCachedPublicTasksCatalog: jest.fn(),
  setCachedPublicTasksCatalog: jest.fn(),
  invalidateCachedPublicTasksCatalog: jest.fn(),
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
jest.unstable_mockModule('../../src/cache/tasks-catalog.js', () => tasksCatalogCacheMock);

const tasksService = await import('../../../src/services/tasks/index.js');

describe('tasks.catalog-candidates.service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    tasksCatalogCacheMock.getCachedPublicTasksCatalog.mockResolvedValue(null);
    tasksCatalogCacheMock.setCachedPublicTasksCatalog.mockResolvedValue(true);
    tasksCatalogCacheMock.invalidateCachedPublicTasksCatalog.mockResolvedValue(true);
    prismaMock.$transaction.mockImplementation(async (callback) => {
      return await callback(prismaMock);
    });
    prismaMock.taskTechnology.createMany.mockResolvedValue({ count: 0 });
    prismaMock.taskTechnology.deleteMany.mockResolvedValue({ count: 0 });
  });

  describe('getTasksCatalog', () => {
    test('rejects owner catalog request without auth', async () => {
      await expect(tasksService.getTasksCatalog({ owner: true })).rejects.toMatchObject({
        status: 401,
        code: 'AUTH_REQUIRED',
      });
    });

    test('returns owner catalog with ALL technology match filter', async () => {
      prismaMock.task.findMany.mockResolvedValue([
        {
          id: 't1',
          title: 'Owner Task',
          status: 'DRAFT',
          category: 'BACKEND',
          type: 'BUG_FIX',
          difficulty: 'MIDDLE',
          deadline: new Date('2026-08-20'),
          publishedAt: null,
          projectId: 'p1',
          project: { id: 'p1', title: 'Proj' },
          ownerUserId: 'u1',
          technologies: [
            {
              isRequired: true,
              technology: { id: 'tech1', slug: 'nodejs', name: 'Node.js', type: 'BACKEND' },
            },
          ],
          owner: {
            companyProfile: {
              companyName: 'Owner Co',
              verified: true,
              avgRating: 4.8,
              reviewsCount: 10,
            },
          },
        },
      ]);
      prismaMock.task.count.mockResolvedValue(1);

      const result = await tasksService.getTasksCatalog({
        userId: 'u1',
        owner: true,
        includeDeleted: false,
        technology_ids: ['tech1', 'tech2'],
        tech_match: 'ALL',
        page: 1,
        size: 20,
      });

      expect(prismaMock.task.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            ownerUserId: 'u1',
            deletedAt: null,
            technologies: {
              every: {
                technologyId: { in: ['tech1', 'tech2'] },
              },
            },
          }),
        })
      );

      expect(result.total).toBe(1);
      expect(result.items[0]).toMatchObject({
        task_id: 't1',
        deadline: '2026-08-20',
        company: { user_id: 'u1', company_name: 'Owner Co' },
      });
    });

    test('returns public catalog with ANY technology match and search filters', async () => {
      prismaMock.task.findMany.mockResolvedValue([
        {
          id: 't2',
          title: 'Public Task',
          status: 'PUBLISHED',
          category: 'FRONTEND',
          type: 'FEATURE_IMPLEMENTATION',
          difficulty: 'SENIOR',
          deadline: null,
          publishedAt: new Date('2026-02-01T00:00:00Z'),
          projectId: null,
          project: null,
          ownerUserId: 'c1',
          technologies: [
            {
              isRequired: false,
              technology: { id: 'tech3', slug: 'react', name: 'React', type: 'FRONTEND' },
            },
          ],
          owner: { companyProfile: null },
        },
      ]);
      prismaMock.task.count.mockResolvedValue(1);

      const result = await tasksService.getTasksCatalog({
        search: 'react',
        category: 'FRONTEND',
        difficulty: 'SENIOR',
        type: 'FEATURE_IMPLEMENTATION',
        technology_ids: ['tech3'],
        tech_match: 'ANY',
        projectId: 'p-filter',
      });

      expect(prismaMock.task.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: 'PUBLISHED',
            visibility: 'PUBLIC',
            deletedAt: null,
            category: 'FRONTEND',
            difficulty: 'SENIOR',
            type: 'FEATURE_IMPLEMENTATION',
            projectId: 'p-filter',
            technologies: {
              some: {
                technologyId: { in: ['tech3'] },
              },
            },
            OR: [
              { title: { contains: 'react', mode: 'insensitive' } },
              { description: { contains: 'react', mode: 'insensitive' } },
            ],
          }),
        })
      );

      expect(result.items[0].project).toBeNull();
      expect(result.items[0].deadline).toBeNull();
      expect(result.items[0].company.company_name).toBeUndefined();
      expect(tasksCatalogCacheMock.setCachedPublicTasksCatalog).toHaveBeenCalled();
    });

    test('returns cached public catalog without hitting database', async () => {
      tasksCatalogCacheMock.getCachedPublicTasksCatalog.mockResolvedValue({
        items: [{ task_id: 'cached-task' }],
        page: 1,
        size: 20,
        total: 1,
      });

      const result = await tasksService.getTasksCatalog({
        page: 1,
        size: 20,
      });

      expect(prismaMock.task.findMany).not.toHaveBeenCalled();
      expect(prismaMock.task.count).not.toHaveBeenCalled();
      expect(result.items[0].task_id).toBe('cached-task');
    });
  });

  describe('getProjectTasks', () => {
    test('rejects missing project', async () => {
      prismaMock.project.findUnique.mockResolvedValue(null);

      await expect(
        tasksService.getProjectTasks({ projectId: 'p1', userId: 'u1', includeDeleted: false })
      ).rejects.toMatchObject({
        status: 404,
        code: 'NOT_FOUND',
      });
    });

    test('rejects includeDeleted for non-owner', async () => {
      prismaMock.project.findUnique.mockResolvedValue({
        id: 'p1',
        ownerUserId: 'owner1',
        visibility: 'PUBLIC',
        deletedAt: null,
      });

      await expect(
        tasksService.getProjectTasks({ projectId: 'p1', userId: 'u2', includeDeleted: true })
      ).rejects.toMatchObject({
        status: 403,
        code: 'NOT_OWNER',
      });
    });

    test('returns public published tasks for non-owner and applies status filter', async () => {
      prismaMock.project.findUnique.mockResolvedValue({
        id: 'p1',
        ownerUserId: 'owner1',
        visibility: 'PUBLIC',
        deletedAt: null,
      });
      prismaMock.task.findMany.mockResolvedValue([]);
      prismaMock.task.count.mockResolvedValue(0);

      const result = await tasksService.getProjectTasks({
        projectId: 'p1',
        userId: 'u2',
        status: 'PUBLISHED',
      });

      expect(prismaMock.task.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            projectId: 'p1',
            status: 'PUBLISHED',
            visibility: 'PUBLIC',
            deletedAt: null,
          },
        })
      );
      expect(result).toEqual({ items: [], page: 1, size: 20, total: 0 });
    });

    test('returns owner project tasks with includeDeleted and null project mapping', async () => {
      prismaMock.project.findUnique.mockResolvedValue({
        id: 'p1',
        ownerUserId: 'owner1',
        visibility: 'PRIVATE',
        deletedAt: null,
      });
      prismaMock.task.findMany.mockResolvedValue([
        {
          id: 't3',
          title: 'Archived candidate task',
          status: 'DELETED',
          category: 'BACKEND',
          type: 'BUG_FIX',
          difficulty: 'JUNIOR',
          deadline: new Date('2026-09-10'),
          publishedAt: null,
          projectId: null,
          project: null,
          ownerUserId: 'owner1',
          owner: { companyProfile: null },
        },
      ]);
      prismaMock.task.count.mockResolvedValue(1);

      const result = await tasksService.getProjectTasks({
        projectId: 'p1',
        userId: 'owner1',
        includeDeleted: true,
      });

      expect(prismaMock.task.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { projectId: 'p1' },
        })
      );
      expect(result.items[0].project).toBeNull();
      expect(result.items[0].deadline).toBe('2026-09-10');
      expect(result.items[0].company.company_name).toBeUndefined();
    });
  });
});
