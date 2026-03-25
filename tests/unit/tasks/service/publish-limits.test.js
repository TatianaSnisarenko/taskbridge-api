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

describe('tasks.service - publish limits', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    prismaMock.$transaction.mockImplementation(async (callback) => {
      return await callback(prismaMock);
    });
    prismaMock.taskTechnology.createMany.mockResolvedValue({ count: 0 });
    prismaMock.taskTechnology.deleteMany.mockResolvedValue({ count: 0 });
  });

  describe('publishTask with max_talents check', () => {
    test('rejects if project reached max_talents', async () => {
      prismaMock.task.findUnique.mockResolvedValue({
        id: 't1',
        ownerUserId: 'u1',
        status: 'DRAFT',
        deletedAt: null,
        projectId: 'p1',
      });

      prismaMock.project.findUnique.mockResolvedValue({
        id: 'p1',
        maxTalents: 2,
        publishedTasksCount: 2,
      });

      await expect(tasksService.publishTask({ userId: 'u1', taskId: 't1' })).rejects.toMatchObject({
        status: 409,
        code: 'MAX_TALENTS_REACHED',
      });
    });

    test('increments project publishedTasksCount on publish', async () => {
      const publishedAt = new Date('2026-02-14T13:20:00Z');
      prismaMock.task.findUnique.mockResolvedValue({
        id: 't1',
        ownerUserId: 'u1',
        status: 'DRAFT',
        deletedAt: null,
        projectId: 'p1',
      });

      prismaMock.project.findUnique.mockResolvedValue({
        id: 'p1',
        maxTalents: 3,
        publishedTasksCount: 1,
      });

      prismaMock.$transaction.mockImplementation((cb) => cb(prismaMock));

      prismaMock.task.update.mockResolvedValue({
        id: 't1',
        status: 'PUBLISHED',
        publishedAt,
      });

      const result = await tasksService.publishTask({ userId: 'u1', taskId: 't1' });

      expect(prismaMock.task.update).toHaveBeenCalledWith({
        where: { id: 't1' },
        data: {
          status: 'PUBLISHED',
          publishedAt: expect.any(Date),
        },
        select: { id: true, status: true, publishedAt: true },
      });

      expect(prismaMock.project.update).toHaveBeenCalledWith({
        where: { id: 'p1' },
        data: { publishedTasksCount: { increment: 1 } },
      });

      expect(result).toEqual({
        taskId: 't1',
        status: 'PUBLISHED',
        publishedAt,
      });
    });

    test('allows publish after increasing project max_talents', async () => {
      const publishedAt = new Date('2026-03-25T12:00:00Z');

      prismaMock.task.findUnique.mockResolvedValue({
        id: 't2',
        ownerUserId: 'u1',
        status: 'DRAFT',
        deletedAt: null,
        projectId: 'p1',
      });

      prismaMock.project.findUnique.mockResolvedValue({
        id: 'p1',
        maxTalents: 3,
        publishedTasksCount: 2,
      });

      prismaMock.$transaction.mockImplementation((cb) => cb(prismaMock));

      prismaMock.task.update.mockResolvedValue({
        id: 't2',
        status: 'PUBLISHED',
        publishedAt,
      });

      const result = await tasksService.publishTask({ userId: 'u1', taskId: 't2' });

      expect(prismaMock.project.findUnique).toHaveBeenCalledWith({
        where: { id: 'p1' },
        select: {
          id: true,
          maxTalents: true,
          publishedTasksCount: true,
        },
      });
      expect(prismaMock.project.update).toHaveBeenCalledWith({
        where: { id: 'p1' },
        data: { publishedTasksCount: { increment: 1 } },
      });
      expect(result).toEqual({
        taskId: 't2',
        status: 'PUBLISHED',
        publishedAt,
      });
    });
  });
});
