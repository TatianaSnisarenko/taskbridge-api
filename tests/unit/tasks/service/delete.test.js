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

describe('tasks.service - delete', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    prismaMock.$transaction.mockImplementation(async (callback) => {
      return await callback(prismaMock);
    });
    prismaMock.taskTechnology.createMany.mockResolvedValue({ count: 0 });
    prismaMock.taskTechnology.deleteMany.mockResolvedValue({ count: 0 });
    prismaMock.application.findMany.mockResolvedValue([]);
  });

  test('deleteTask rejects task not found', async () => {
    prismaMock.task.findUnique.mockResolvedValue(null);

    await expect(
      tasksService.deleteTask({
        userId: 'u1',
        taskId: 't1',
      })
    ).rejects.toMatchObject({
      status: 404,
      code: 'NOT_FOUND',
    });
  });

  test('deleteTask rejects deleted task', async () => {
    prismaMock.task.findUnique.mockResolvedValue({
      id: 't1',
      ownerUserId: 'u1',
      status: 'DRAFT',
      deletedAt: new Date(),
    });

    await expect(
      tasksService.deleteTask({
        userId: 'u1',
        taskId: 't1',
      })
    ).rejects.toMatchObject({
      status: 404,
      code: 'NOT_FOUND',
    });
  });

  test('deleteTask rejects non-owner task', async () => {
    prismaMock.task.findUnique.mockResolvedValue({
      id: 't1',
      ownerUserId: 'u2',
      status: 'DRAFT',
      deletedAt: null,
    });

    await expect(
      tasksService.deleteTask({
        userId: 'u1',
        taskId: 't1',
      })
    ).rejects.toMatchObject({
      status: 403,
      code: 'NOT_OWNER',
    });
  });

  test('deleteTask rejects invalid state (IN_PROGRESS)', async () => {
    prismaMock.task.findUnique.mockResolvedValue({
      id: 't1',
      ownerUserId: 'u1',
      status: 'IN_PROGRESS',
      deletedAt: null,
    });

    await expect(
      tasksService.deleteTask({
        userId: 'u1',
        taskId: 't1',
      })
    ).rejects.toMatchObject({
      status: 409,
      code: 'INVALID_STATE',
    });
  });

  test('deleteTask rejects invalid state (COMPLETED)', async () => {
    prismaMock.task.findUnique.mockResolvedValue({
      id: 't1',
      ownerUserId: 'u1',
      status: 'COMPLETED',
      deletedAt: null,
    });

    await expect(
      tasksService.deleteTask({
        userId: 'u1',
        taskId: 't1',
      })
    ).rejects.toMatchObject({
      status: 409,
      code: 'INVALID_STATE',
    });
  });

  test('deleteTask rejects invalid state (DELETED)', async () => {
    prismaMock.task.findUnique.mockResolvedValue({
      id: 't1',
      ownerUserId: 'u1',
      status: 'DELETED',
      deletedAt: null,
    });

    await expect(
      tasksService.deleteTask({
        userId: 'u1',
        taskId: 't1',
      })
    ).rejects.toMatchObject({
      status: 409,
      code: 'INVALID_STATE',
    });
  });

  test('deleteTask deletes DRAFT task', async () => {
    const deletedAt = new Date('2026-02-14T13:35:00Z');
    prismaMock.task.findUnique.mockResolvedValue({
      id: 't1',
      ownerUserId: 'u1',
      status: 'DRAFT',
      deletedAt: null,
    });
    prismaMock.task.update.mockResolvedValue({
      id: 't1',
      status: 'DELETED',
      deletedAt,
    });

    const result = await tasksService.deleteTask({ userId: 'u1', taskId: 't1' });

    expect(prismaMock.task.update).toHaveBeenCalledWith({
      where: { id: 't1' },
      data: {
        status: 'DELETED',
        deletedAt: expect.any(Date),
      },
      select: { id: true, status: true, deletedAt: true },
    });

    expect(result).toEqual({
      taskId: 't1',
      status: 'DELETED',
      deletedAt,
    });
  });

  test('deleteTask deletes PUBLISHED task', async () => {
    const deletedAt = new Date('2026-02-14T13:40:00Z');
    prismaMock.task.findUnique.mockResolvedValue({
      id: 't1',
      ownerUserId: 'u1',
      status: 'PUBLISHED',
      deletedAt: null,
    });
    prismaMock.task.update.mockResolvedValue({
      id: 't1',
      status: 'DELETED',
      deletedAt,
    });

    const result = await tasksService.deleteTask({ userId: 'u1', taskId: 't1' });

    expect(prismaMock.task.update).toHaveBeenCalledWith({
      where: { id: 't1' },
      data: {
        status: 'DELETED',
        deletedAt: expect.any(Date),
      },
      select: { id: true, status: true, deletedAt: true },
    });

    expect(result).toEqual({
      taskId: 't1',
      status: 'DELETED',
      deletedAt,
    });
  });

  test('deleteTask deletes CLOSED task', async () => {
    const deletedAt = new Date('2026-02-14T13:45:00Z');
    prismaMock.task.findUnique.mockResolvedValue({
      id: 't1',
      ownerUserId: 'u1',
      status: 'CLOSED',
      deletedAt: null,
    });
    prismaMock.task.update.mockResolvedValue({
      id: 't1',
      status: 'DELETED',
      deletedAt,
    });

    const result = await tasksService.deleteTask({ userId: 'u1', taskId: 't1' });

    expect(prismaMock.task.update).toHaveBeenCalledWith({
      where: { id: 't1' },
      data: {
        status: 'DELETED',
        deletedAt: expect.any(Date),
      },
      select: { id: true, status: true, deletedAt: true },
    });

    expect(result).toEqual({
      taskId: 't1',
      status: 'DELETED',
      deletedAt,
    });
  });

  test('deleteTask notifies developers who applied to task', async () => {
    const deletedAt = new Date('2026-02-14T14:00:00Z');
    prismaMock.task.findUnique.mockResolvedValue({
      id: 't1',
      ownerUserId: 'u1',
      status: 'PUBLISHED',
      deletedAt: null,
      title: 'Task to remove',
      projectId: 'p1',
    });
    prismaMock.task.update.mockResolvedValue({
      id: 't1',
      status: 'DELETED',
      deletedAt,
    });
    prismaMock.application.findMany.mockResolvedValue([
      { developerUserId: 'd1' },
      { developerUserId: 'd2' },
    ]);

    await tasksService.deleteTask({ userId: 'u1', taskId: 't1' });

    expect(prismaMock.application.findMany).toHaveBeenCalledWith({
      where: { taskId: 't1' },
      select: { developerUserId: true },
      distinct: ['developerUserId'],
    });

    expect(notificationsServiceMock.createNotification).toHaveBeenCalledTimes(2);
    expect(notificationsServiceMock.createNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'd1',
        actorUserId: 'u1',
        projectId: 'p1',
        taskId: 't1',
        type: 'TASK_DELETED',
      })
    );
    expect(notificationsServiceMock.createNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'd2',
        actorUserId: 'u1',
        projectId: 'p1',
        taskId: 't1',
        type: 'TASK_DELETED',
      })
    );
  });
});
