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
        owner: { companyProfile: { companyName: 'TeamUp', verified: false } },
      });

      await expect(
        tasksService.getTaskById({ taskId: 't1', userId: 'u2', persona: 'company' })
      ).rejects.toMatchObject({
        status: 403,
        code: 'NOT_OWNER',
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
        owner: { companyProfile: { companyName: 'TeamUp', verified: false } },
      });

      await expect(
        tasksService.getTaskById({ taskId: 't1', userId: 'u1', persona: 'developer' })
      ).rejects.toMatchObject({
        status: 403,
        code: 'PERSONA_NOT_AVAILABLE',
      });
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
