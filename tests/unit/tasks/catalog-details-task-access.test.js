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

  describe('getTaskById', () => {
    test('rejects missing task', async () => {
      prismaMock.task.findUnique.mockResolvedValue(null);

      await expect(tasksService.getTaskById({ taskId: 't1' })).rejects.toMatchObject({
        status: 404,
        code: 'NOT_FOUND',
      });
    });

    test('rejects deleted task', async () => {
      prismaMock.task.findUnique.mockResolvedValue({
        id: 't1',
        deletedAt: new Date(),
        status: 'DELETED',
      });

      await expect(tasksService.getTaskById({ taskId: 't1' })).rejects.toMatchObject({
        status: 404,
        code: 'NOT_FOUND',
      });
    });

    test('rejects non-public task without auth', async () => {
      prismaMock.task.findUnique.mockResolvedValue({
        id: 't1',
        ownerUserId: 'u1',
        status: 'DRAFT',
        visibility: 'PUBLIC',
        deletedAt: null,
        owner: { companyProfile: { companyName: 'TeamUp', verified: false } },
      });

      await expect(tasksService.getTaskById({ taskId: 't1' })).rejects.toMatchObject({
        status: 401,
        code: 'AUTH_REQUIRED',
      });
    });

    test('rejects non-owner access to non-public task', async () => {
      prismaMock.task.findUnique.mockResolvedValue({
        id: 't1',
        ownerUserId: 'u1',
        status: 'DRAFT',
        visibility: 'UNLISTED',
        deletedAt: null,
        acceptedApplication: null,
        owner: { companyProfile: { companyName: 'TeamUp', verified: false } },
      });

      await expect(
        tasksService.getTaskById({ taskId: 't1', userId: 'u2', persona: 'company' })
      ).rejects.toMatchObject({
        status: 403,
        code: 'FORBIDDEN',
      });
    });

    test('allows accepted developer to access non-public task with developer persona', async () => {
      prismaMock.task.findUnique.mockResolvedValue({
        id: 't1',
        ownerUserId: 'u1',
        status: 'IN_PROGRESS',
        visibility: 'UNLISTED',
        deletedAt: null,
        acceptedApplicationId: 'app1',
        acceptedApplication: {
          developerUserId: 'u2',
        },
        publishedAt: new Date(),
        createdAt: new Date(),
        title: 'Test Task',
        description: 'Test Description',
        category: 'WEB',
        type: 'FEATURE',
        difficulty: 'INTERMEDIATE',
        estimatedEffortHours: 40,
        expectedDuration: '1 week',
        communicationLanguage: 'ENGLISH',
        timezonePreference: 'UTC',
        applicationDeadline: new Date(),
        deadline: new Date(),
        deliverables: ['Feature implementation'],
        requirements: ['Node.js'],
        niceToHave: ['TypeScript'],
        technologies: [],
        project: null,
        owner: {
          companyProfile: {
            companyName: 'TeamUp',
            verified: false,
            avgRating: null,
            reviewsCount: 0,
          },
        },
      });
      prismaMock.application.count.mockResolvedValue(1);

      const result = await tasksService.getTaskById({
        taskId: 't1',
        userId: 'u2',
        persona: 'developer',
      });
      expect(result).toBeDefined();
      expect(result.task_id).toBe('t1');
      expect(result.is_accepted_developer).toBe(true);
    });

    test('rejects accepted developer access with company persona', async () => {
      prismaMock.task.findUnique.mockResolvedValue({
        id: 't1',
        ownerUserId: 'u1',
        status: 'IN_PROGRESS',
        visibility: 'UNLISTED',
        deletedAt: null,
        acceptedApplicationId: 'app1',
        acceptedApplication: {
          developerUserId: 'u2',
        },
        owner: { companyProfile: { companyName: 'TeamUp', verified: false } },
      });

      await expect(
        tasksService.getTaskById({ taskId: 't1', userId: 'u2', persona: 'company' })
      ).rejects.toMatchObject({
        status: 403,
        code: 'PERSONA_NOT_AVAILABLE',
      });
    });

    test('rejects owner access without persona', async () => {
      prismaMock.task.findUnique.mockResolvedValue({
        id: 't1',
        ownerUserId: 'u1',
        status: 'DRAFT',
        visibility: 'UNLISTED',
        deletedAt: null,
        owner: { companyProfile: { companyName: 'TeamUp', verified: false } },
      });

      await expect(tasksService.getTaskById({ taskId: 't1', userId: 'u1' })).rejects.toMatchObject({
        status: 400,
        code: 'PERSONA_REQUIRED',
      });
    });

    test('rejects owner access with invalid persona', async () => {
      prismaMock.task.findUnique.mockResolvedValue({
        id: 't1',
        ownerUserId: 'u1',
        status: 'DRAFT',
        visibility: 'UNLISTED',
        deletedAt: null,
        owner: { companyProfile: { companyName: 'TeamUp', verified: false } },
      });

      await expect(
        tasksService.getTaskById({ taskId: 't1', userId: 'u1', persona: 'admin' })
      ).rejects.toMatchObject({
        status: 400,
        code: 'PERSONA_INVALID',
      });
    });

    test('rejects owner access with developer persona for non-public task', async () => {
      prismaMock.task.findUnique.mockResolvedValue({
        id: 't1',
        ownerUserId: 'u1',
        status: 'DRAFT',
        visibility: 'UNLISTED',
        deletedAt: null,
        acceptedApplication: null,
        owner: { companyProfile: { companyName: 'TeamUp', verified: false } },
      });

      await expect(
        tasksService.getTaskById({ taskId: 't1', userId: 'u1', persona: 'developer' })
      ).rejects.toMatchObject({
        status: 403,
        code: 'PERSONA_NOT_AVAILABLE',
      });
    });

    test('allows owner to access non-public task with company persona', async () => {
      prismaMock.task.findUnique.mockResolvedValue({
        id: 't1',
        ownerUserId: 'u1',
        status: 'DRAFT',
        visibility: 'UNLISTED',
        deletedAt: null,
        acceptedApplicationId: null,
        publishedAt: null,
        createdAt: new Date(),
        title: 'My Draft Task',
        description: 'Task description',
        category: 'BACKEND',
        type: 'PAID',
        difficulty: 'MIDDLE',
        estimatedEffortHours: 20,
        expectedDuration: '1 week',
        communicationLanguage: 'ENGLISH',
        timezonePreference: 'UTC',
        applicationDeadline: new Date(),
        deadline: new Date(),
        deliverables: ['Code'],
        requirements: ['Node.js'],
        niceToHave: [],
        technologies: [],
        project: null,
        owner: {
          companyProfile: {
            companyName: 'My Company',
            verified: true,
            avgRating: 4.5,
            reviewsCount: 10,
          },
        },
      });
      prismaMock.application.count.mockResolvedValue(0);

      const result = await tasksService.getTaskById({
        taskId: 't1',
        userId: 'u1',
        persona: 'company',
      });
      expect(result).toBeDefined();
      expect(result.task_id).toBe('t1');
      expect(result.is_owner).toBe(true);
      expect(result.is_accepted_developer).toBe(false);
    });

    test('rejects owner access when company profile is missing for non-public task', async () => {
      prismaMock.task.findUnique.mockResolvedValue({
        id: 't1',
        ownerUserId: 'u1',
        status: 'DRAFT',
        visibility: 'UNLISTED',
        deletedAt: null,
        owner: { companyProfile: null },
      });

      await expect(
        tasksService.getTaskById({ taskId: 't1', userId: 'u1', persona: 'company' })
      ).rejects.toMatchObject({
        status: 403,
        code: 'PERSONA_NOT_AVAILABLE',
      });
    });
  });
});
