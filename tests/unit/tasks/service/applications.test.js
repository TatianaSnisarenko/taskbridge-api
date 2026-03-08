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

describe('tasks.service - applications', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    prismaMock.$transaction.mockImplementation(async (callback) => {
      return await callback(prismaMock);
    });
    prismaMock.taskTechnology.createMany.mockResolvedValue({ count: 0 });
    prismaMock.taskTechnology.deleteMany.mockResolvedValue({ count: 0 });
  });

  test('applyToTask rejects task not found', async () => {
    prismaMock.task.findUnique.mockResolvedValue(null);

    await expect(
      tasksService.applyToTask({
        userId: 'u1',
        taskId: 't1',
        application: { message: 'I can do it this week.' },
      })
    ).rejects.toMatchObject({
      status: 404,
      code: 'TASK_NOT_FOUND',
    });
  });

  test('applyToTask rejects deleted task', async () => {
    prismaMock.task.findUnique.mockResolvedValue({
      id: 't1',
      status: 'PUBLISHED',
      deletedAt: new Date(),
    });

    await expect(
      tasksService.applyToTask({
        userId: 'u1',
        taskId: 't1',
        application: { message: 'I can do it this week.' },
      })
    ).rejects.toMatchObject({
      status: 404,
      code: 'TASK_NOT_FOUND',
    });
  });

  test('applyToTask rejects non-published task', async () => {
    prismaMock.task.findUnique.mockResolvedValue({
      id: 't1',
      status: 'DRAFT',
      deletedAt: null,
    });

    await expect(
      tasksService.applyToTask({
        userId: 'u1',
        taskId: 't1',
        application: { message: 'I can do it this week.' },
      })
    ).rejects.toMatchObject({
      status: 409,
      code: 'TASK_NOT_OPEN',
    });
  });

  test('applyToTask rejects duplicate application', async () => {
    prismaMock.task.findUnique.mockResolvedValue({
      id: 't1',
      status: 'PUBLISHED',
      deletedAt: null,
    });
    prismaMock.application.findFirst.mockResolvedValue({ id: 'a1' });

    await expect(
      tasksService.applyToTask({
        userId: 'u1',
        taskId: 't1',
        application: { message: 'I can do it this week.' },
      })
    ).rejects.toMatchObject({
      status: 409,
      code: 'ALREADY_APPLIED',
    });
  });

  test('applyToTask creates application', async () => {
    const createdAt = new Date('2026-02-14T14:00:00Z');
    prismaMock.task.findUnique.mockResolvedValue({
      id: 't1',
      ownerUserId: 'owner1',
      status: 'PUBLISHED',
      deletedAt: null,
    });
    prismaMock.application.findFirst.mockResolvedValue(null);
    prismaMock.application.create.mockResolvedValue({
      id: 'a1',
      taskId: 't1',
      developerUserId: 'u1',
      status: 'APPLIED',
      createdAt,
    });
    prismaMock.$transaction.mockImplementation(async (cb) => cb(prismaMock));

    const result = await tasksService.applyToTask({
      userId: 'u1',
      taskId: 't1',
      application: {
        message: 'I can do it this week.',
        proposed_plan: 'Day 1 plan, day 2 tests.',
        availability_note: 'Evenings',
      },
    });

    expect(prismaMock.application.create).toHaveBeenCalledWith({
      data: {
        taskId: 't1',
        developerUserId: 'u1',
        status: 'APPLIED',
        message: 'I can do it this week.',
        proposedPlan: 'Day 1 plan, day 2 tests.',
        availabilityNote: 'Evenings',
      },
      select: {
        id: true,
        taskId: true,
        developerUserId: true,
        status: true,
        createdAt: true,
      },
    });

    expect(notificationsServiceMock.createApplicationCreatedNotification).toHaveBeenCalledWith({
      client: prismaMock,
      userId: 'owner1',
      actorUserId: 'u1',
      taskId: 't1',
      applicationId: 'a1',
    });

    expect(result).toEqual({
      applicationId: 'a1',
      taskId: 't1',
      developerUserId: 'u1',
      status: 'APPLIED',
      createdAt,
    });
  });
});
