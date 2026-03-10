import { jest } from '@jest/globals';

const prismaMock = {
  $transaction: jest.fn(),
  task: {
    findUnique: jest.fn(),
    update: jest.fn(),
    count: jest.fn(),
  },
  project: {
    findUnique: jest.fn(),
    update: jest.fn(),
  },
  user: {
    findUnique: jest.fn(),
  },
};

const notificationsServiceMock = {
  createApplicationCreatedNotification: jest.fn(),
  buildTaskNotificationPayload: jest.fn(),
  createNotification: jest.fn(),
};

const notificationEmailServiceMock = {
  sendImportantNotificationEmail: jest.fn(async () => {}),
};

jest.unstable_mockModule('../../src/db/prisma.js', () => ({ prisma: prismaMock }));
jest.unstable_mockModule(
  '../../src/services/notifications/index.js',
  () => notificationsServiceMock
);
jest.unstable_mockModule(
  '../../src/services/notification-email/index.js',
  () => notificationEmailServiceMock
);

const tasksService = await import('../../../../src/services/tasks/index.js');

describe('tasks.service - dispute workflow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    prismaMock.$transaction.mockImplementation(async (callback) => callback(prismaMock));
  });

  test('requestTaskCompletion works from DISPUTE status', async () => {
    prismaMock.task.findUnique.mockResolvedValue({
      id: 't1',
      ownerUserId: 'owner1',
      status: 'DISPUTE',
      deletedAt: null,
      acceptedApplicationId: 'a1',
      acceptedApplication: { developerUserId: 'dev1' },
    });
    prismaMock.task.update.mockResolvedValue({
      id: 't1',
      title: 'Test Task',
      status: 'COMPLETION_REQUESTED',
    });
    prismaMock.user.findUnique.mockResolvedValue({
      id: 'owner1',
      email: 'owner@example.com',
      emailVerified: true,
      companyProfile: { companyName: 'Test Company' },
    });

    const result = await tasksService.requestTaskCompletion({
      userId: 'dev1',
      taskId: 't1',
    });

    expect(result).toEqual({
      taskId: 't1',
      status: 'COMPLETION_REQUESTED',
    });
  });

  test('openTaskDispute rejects invalid status transition', async () => {
    prismaMock.task.findUnique.mockResolvedValue({
      id: 't1',
      ownerUserId: 'owner1',
      status: 'PUBLISHED',
      deletedAt: null,
      acceptedApplicationId: 'a1',
      acceptedApplication: { developerUserId: 'dev1' },
    });

    await expect(
      tasksService.openTaskDispute({
        userId: 'owner1',
        taskId: 't1',
        reason: 'Developer is inactive for several days',
      })
    ).rejects.toMatchObject({
      status: 409,
      code: 'INVALID_STATE',
    });
  });

  test('openTaskDispute moves task to DISPUTE', async () => {
    prismaMock.task.findUnique.mockResolvedValue({
      id: 't1',
      ownerUserId: 'owner1',
      status: 'IN_PROGRESS',
      deletedAt: null,
      acceptedApplicationId: 'a1',
      acceptedApplication: { developerUserId: 'dev1' },
    });
    prismaMock.task.update.mockResolvedValue({
      id: 't1',
      status: 'DISPUTE',
    });

    const result = await tasksService.openTaskDispute({
      userId: 'owner1',
      taskId: 't1',
      reason: 'Developer is inactive for several days',
    });

    expect(prismaMock.task.update).toHaveBeenCalledWith({
      where: { id: 't1' },
      data: { status: 'DISPUTE' },
      select: { id: true, status: true },
    });

    expect(result).toEqual({
      taskId: 't1',
      status: 'DISPUTE',
    });
  });

  test('resolveTaskDispute rejects invalid status', async () => {
    prismaMock.task.findUnique.mockResolvedValue({
      id: 't1',
      status: 'IN_PROGRESS',
      deletedAt: null,
      projectId: null,
    });

    await expect(
      tasksService.resolveTaskDispute({
        userId: 'admin1',
        taskId: 't1',
        action: 'MARK_FAILED',
        reason: 'Admin decision',
      })
    ).rejects.toMatchObject({
      status: 409,
      code: 'INVALID_STATE',
    });
  });

  test('resolveTaskDispute returns task to IN_PROGRESS', async () => {
    prismaMock.task.findUnique.mockResolvedValue({
      id: 't1',
      status: 'DISPUTE',
      deletedAt: null,
      projectId: null,
    });
    prismaMock.task.update.mockResolvedValue({
      id: 't1',
      status: 'IN_PROGRESS',
      projectId: null,
    });

    const result = await tasksService.resolveTaskDispute({
      userId: 'admin1',
      taskId: 't1',
      action: 'RETURN_TO_PROGRESS',
      reason: 'Admin returned task to progress',
    });

    expect(result).toMatchObject({
      taskId: 't1',
      status: 'IN_PROGRESS',
      action: 'RETURN_TO_PROGRESS',
      resolvedBy: 'admin1',
    });
  });

  test('resolveTaskDispute marks FAILED and archives project when max talents reached', async () => {
    prismaMock.task.findUnique.mockResolvedValue({
      id: 't1',
      status: 'DISPUTE',
      deletedAt: null,
      projectId: 'p1',
    });
    prismaMock.task.update.mockResolvedValue({
      id: 't1',
      status: 'FAILED',
      projectId: 'p1',
    });
    prismaMock.project.findUnique.mockResolvedValue({
      id: 'p1',
      maxTalents: 2,
      status: 'ACTIVE',
    });
    prismaMock.task.count.mockResolvedValueOnce(1).mockResolvedValueOnce(1);

    const result = await tasksService.resolveTaskDispute({
      userId: 'admin1',
      taskId: 't1',
      action: 'MARK_FAILED',
      reason: 'Admin marked failed after evidence review',
    });

    expect(prismaMock.project.update).toHaveBeenCalledWith({
      where: { id: 'p1' },
      data: { status: 'ARCHIVED' },
    });

    expect(result).toMatchObject({
      taskId: 't1',
      status: 'FAILED',
      action: 'MARK_FAILED',
      resolvedBy: 'admin1',
    });
  });
});
