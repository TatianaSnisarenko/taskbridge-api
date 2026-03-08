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

describe('tasks.service - update draft', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    prismaMock.$transaction.mockImplementation(async (callback) => {
      return await callback(prismaMock);
    });
    prismaMock.taskTechnology.createMany.mockResolvedValue({ count: 0 });
    prismaMock.taskTechnology.deleteMany.mockResolvedValue({ count: 0 });
  });

  test('updateTaskDraft rejects task not found', async () => {
    prismaMock.task.findUnique.mockResolvedValue(null);

    await expect(
      tasksService.updateTaskDraft({
        userId: 'u1',
        taskId: 't1',
        task: { title: 'Updated', description: 'Updated description' },
      })
    ).rejects.toMatchObject({
      status: 404,
      code: 'NOT_FOUND',
    });
  });

  test('updateTaskDraft rejects deleted task', async () => {
    prismaMock.task.findUnique.mockResolvedValue({
      id: 't1',
      ownerUserId: 'u1',
      status: 'DRAFT',
      deletedAt: new Date(),
    });

    await expect(
      tasksService.updateTaskDraft({
        userId: 'u1',
        taskId: 't1',
        task: { title: 'Updated', description: 'Updated description' },
      })
    ).rejects.toMatchObject({
      status: 404,
      code: 'NOT_FOUND',
    });
  });

  test('updateTaskDraft rejects non-owner task', async () => {
    prismaMock.task.findUnique.mockResolvedValue({
      id: 't1',
      ownerUserId: 'u2',
      status: 'DRAFT',
      deletedAt: null,
    });

    await expect(
      tasksService.updateTaskDraft({
        userId: 'u1',
        taskId: 't1',
        task: { title: 'Updated', description: 'Updated description' },
      })
    ).rejects.toMatchObject({
      status: 403,
      code: 'NOT_OWNER',
    });
  });

  test('updateTaskDraft rejects invalid state', async () => {
    prismaMock.task.findUnique.mockResolvedValue({
      id: 't1',
      ownerUserId: 'u1',
      status: 'IN_PROGRESS',
      deletedAt: null,
    });

    await expect(
      tasksService.updateTaskDraft({
        userId: 'u1',
        taskId: 't1',
        task: { title: 'Updated', description: 'Updated description' },
      })
    ).rejects.toMatchObject({
      status: 409,
      code: 'INVALID_STATE',
    });
  });

  test('updateTaskDraft rejects missing project', async () => {
    prismaMock.task.findUnique.mockResolvedValue({
      id: 't1',
      ownerUserId: 'u1',
      status: 'DRAFT',
      deletedAt: null,
    });
    prismaMock.project.findUnique.mockResolvedValue(null);

    await expect(
      tasksService.updateTaskDraft({
        userId: 'u1',
        taskId: 't1',
        task: { project_id: 'p1', title: 'Updated', description: 'Updated description' },
      })
    ).rejects.toMatchObject({
      status: 404,
      code: 'PROJECT_NOT_FOUND',
    });
  });

  test('updateTaskDraft rejects deleted project', async () => {
    prismaMock.task.findUnique.mockResolvedValue({
      id: 't1',
      ownerUserId: 'u1',
      status: 'DRAFT',
      deletedAt: null,
    });
    prismaMock.project.findUnique.mockResolvedValue({
      id: 'p1',
      ownerUserId: 'u1',
      deletedAt: new Date(),
    });

    await expect(
      tasksService.updateTaskDraft({
        userId: 'u1',
        taskId: 't1',
        task: { project_id: 'p1', title: 'Updated', description: 'Updated description' },
      })
    ).rejects.toMatchObject({
      status: 404,
      code: 'PROJECT_NOT_FOUND',
    });
  });

  test('updateTaskDraft rejects non-owner project', async () => {
    prismaMock.task.findUnique.mockResolvedValue({
      id: 't1',
      ownerUserId: 'u1',
      status: 'DRAFT',
      deletedAt: null,
    });
    prismaMock.project.findUnique.mockResolvedValue({
      id: 'p1',
      ownerUserId: 'u2',
      deletedAt: null,
    });

    await expect(
      tasksService.updateTaskDraft({
        userId: 'u1',
        taskId: 't1',
        task: { project_id: 'p1', title: 'Updated', description: 'Updated description' },
      })
    ).rejects.toMatchObject({
      status: 403,
      code: 'NOT_OWNER',
    });
  });

  test('updateTaskDraft updates task without project', async () => {
    const updatedAt = new Date('2026-02-14T12:00:00Z');
    prismaMock.task.findUnique.mockResolvedValue({
      id: 't1',
      ownerUserId: 'u1',
      status: 'DRAFT',
      deletedAt: null,
    });
    prismaMock.task.update.mockResolvedValue({ id: 't1', updatedAt });

    const task = {
      project_id: null,
      title: 'Updated title',
      description: 'Updated description',
      category: 'FRONTEND',
      type: 'PAID',
      difficulty: 'MIDDLE',
      estimated_effort_hours: 10,
      expected_duration: 'DAYS_15_30',
      communication_language: 'UA',
      timezone_preference: 'Europe/Kyiv',
      application_deadline: new Date('2026-03-01'),
      visibility: 'UNLISTED',
      deliverables: 'Updated deliverables',
      requirements: 'Updated requirements',
      nice_to_have: 'Updated nice to have',
    };

    const result = await tasksService.updateTaskDraft({ userId: 'u1', taskId: 't1', task });

    expect(prismaMock.task.update).toHaveBeenCalledWith({
      where: { id: 't1' },
      data: {
        projectId: null,
        title: 'Updated title',
        description: 'Updated description',
        category: 'FRONTEND',
        type: 'PAID',
        difficulty: 'MIDDLE',
        estimatedEffortHours: 10,
        expectedDuration: 'DAYS_15_30',
        communicationLanguage: 'UA',
        timezonePreference: 'Europe/Kyiv',
        applicationDeadline: task.application_deadline,
        visibility: 'UNLISTED',
        deliverables: 'Updated deliverables',
        requirements: 'Updated requirements',
        niceToHave: 'Updated nice to have',
      },
      select: { id: true, updatedAt: true },
    });

    expect(result).toEqual({ taskId: 't1', updated: true, updatedAt });
  });

  test('updateTaskDraft updates task with owned project', async () => {
    const updatedAt = new Date('2026-02-14T13:00:00Z');
    prismaMock.task.findUnique.mockResolvedValue({
      id: 't1',
      ownerUserId: 'u1',
      status: 'PUBLISHED',
      deletedAt: null,
    });
    prismaMock.project.findUnique.mockResolvedValue({
      id: 'p1',
      ownerUserId: 'u1',
      deletedAt: null,
    });
    prismaMock.task.update.mockResolvedValue({ id: 't1', updatedAt });

    const task = {
      project_id: 'p1',
      title: 'Updated title',
      description: 'Updated description',
      category: 'FRONTEND',
      type: 'PAID',
      difficulty: 'MIDDLE',
      estimated_effort_hours: 10,
      expected_duration: 'DAYS_15_30',
      communication_language: 'UA',
      timezone_preference: 'Europe/Kyiv',
      application_deadline: new Date('2026-03-01'),
      visibility: 'UNLISTED',
      deliverables: 'Updated deliverables',
      requirements: 'Updated requirements',
      nice_to_have: 'Updated nice to have',
    };

    const result = await tasksService.updateTaskDraft({ userId: 'u1', taskId: 't1', task });

    expect(prismaMock.project.findUnique).toHaveBeenCalledWith({
      where: { id: 'p1' },
      select: { id: true, ownerUserId: true, deletedAt: true },
    });

    expect(prismaMock.task.update).toHaveBeenCalledWith({
      where: { id: 't1' },
      data: {
        projectId: 'p1',
        title: 'Updated title',
        description: 'Updated description',
        category: 'FRONTEND',
        type: 'PAID',
        difficulty: 'MIDDLE',
        estimatedEffortHours: 10,
        expectedDuration: 'DAYS_15_30',
        communicationLanguage: 'UA',
        timezonePreference: 'Europe/Kyiv',
        applicationDeadline: task.application_deadline,
        visibility: 'UNLISTED',
        deliverables: 'Updated deliverables',
        requirements: 'Updated requirements',
        niceToHave: 'Updated nice to have',
      },
      select: { id: true, updatedAt: true },
    });

    expect(result).toEqual({ taskId: 't1', updated: true, updatedAt });
  });
});
