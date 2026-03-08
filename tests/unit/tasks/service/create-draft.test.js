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

describe('tasks.service - create draft', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    prismaMock.$transaction.mockImplementation(async (callback) => {
      return await callback(prismaMock);
    });
    prismaMock.taskTechnology.createMany.mockResolvedValue({ count: 0 });
    prismaMock.taskTechnology.deleteMany.mockResolvedValue({ count: 0 });
  });

  test('createTaskDraft rejects missing project', async () => {
    prismaMock.project.findUnique.mockResolvedValue(null);

    await expect(
      tasksService.createTaskDraft({
        userId: 'u1',
        task: { project_id: 'p1', title: 'Task', description: 'Long description' },
      })
    ).rejects.toMatchObject({
      status: 404,
      code: 'PROJECT_NOT_FOUND',
    });
  });

  test('createTaskDraft rejects deleted project', async () => {
    prismaMock.project.findUnique.mockResolvedValue({
      id: 'p1',
      ownerUserId: 'u1',
      deletedAt: new Date(),
    });

    await expect(
      tasksService.createTaskDraft({
        userId: 'u1',
        task: { project_id: 'p1', title: 'Task', description: 'Long description' },
      })
    ).rejects.toMatchObject({
      status: 404,
      code: 'PROJECT_NOT_FOUND',
    });
  });

  test('createTaskDraft rejects non-owner project', async () => {
    prismaMock.project.findUnique.mockResolvedValue({
      id: 'p1',
      ownerUserId: 'u2',
      deletedAt: null,
    });

    await expect(
      tasksService.createTaskDraft({
        userId: 'u1',
        task: { project_id: 'p1', title: 'Task', description: 'Long description' },
      })
    ).rejects.toMatchObject({
      status: 403,
      code: 'NOT_OWNER',
    });
  });

  test('createTaskDraft creates task draft without project', async () => {
    const createdAt = new Date('2026-02-14T10:00:00Z');
    prismaMock.task.create.mockResolvedValue({ id: 't1', status: 'DRAFT', createdAt });

    const task = {
      project_id: null,
      title: 'Task title',
      description: 'Task description',
      category: 'BACKEND',
      type: 'EXPERIENCE',
      difficulty: 'JUNIOR',
      estimated_effort_hours: 6,
      expected_duration: 'DAYS_8_14',
      communication_language: 'EN',
      timezone_preference: 'Europe/Any',
      application_deadline: new Date('2026-02-20'),
      visibility: 'PUBLIC',
      deliverables: 'PR with code + tests',
      requirements: 'REST + pagination',
      nice_to_have: 'OpenAPI',
    };

    const result = await tasksService.createTaskDraft({ userId: 'u1', task });

    expect(prismaMock.task.create).toHaveBeenCalledWith({
      data: {
        ownerUserId: 'u1',
        projectId: null,
        status: 'DRAFT',
        title: 'Task title',
        description: 'Task description',
        category: 'BACKEND',
        type: 'EXPERIENCE',
        difficulty: 'JUNIOR',
        estimatedEffortHours: 6,
        expectedDuration: 'DAYS_8_14',
        communicationLanguage: 'EN',
        timezonePreference: 'Europe/Any',
        applicationDeadline: task.application_deadline,
        visibility: 'PUBLIC',
        deliverables: 'PR with code + tests',
        requirements: 'REST + pagination',
        niceToHave: 'OpenAPI',
      },
      select: { id: true, status: true, createdAt: true },
    });

    expect(result).toEqual({ taskId: 't1', status: 'DRAFT', createdAt });
  });

  test('createTaskDraft creates task draft for owned project', async () => {
    const createdAt = new Date('2026-02-14T11:00:00Z');
    prismaMock.project.findUnique.mockResolvedValue({
      id: 'p1',
      ownerUserId: 'u1',
      deletedAt: null,
    });
    prismaMock.task.create.mockResolvedValue({ id: 't2', status: 'DRAFT', createdAt });

    const task = {
      project_id: 'p1',
      title: 'Task title',
      description: 'Task description',
      category: 'BACKEND',
      type: 'EXPERIENCE',
      difficulty: 'JUNIOR',
      estimated_effort_hours: 6,
      expected_duration: 'DAYS_8_14',
      communication_language: 'EN',
      timezone_preference: 'Europe/Any',
      application_deadline: new Date('2026-02-20'),
      visibility: 'PUBLIC',
      deliverables: 'PR with code + tests',
      requirements: 'REST + pagination',
      nice_to_have: 'OpenAPI',
    };

    const result = await tasksService.createTaskDraft({ userId: 'u1', task });

    expect(prismaMock.project.findUnique).toHaveBeenCalledWith({
      where: { id: 'p1' },
      select: { id: true, ownerUserId: true, deletedAt: true },
    });

    expect(prismaMock.task.create).toHaveBeenCalledWith({
      data: {
        ownerUserId: 'u1',
        projectId: 'p1',
        status: 'DRAFT',
        title: 'Task title',
        description: 'Task description',
        category: 'BACKEND',
        type: 'EXPERIENCE',
        difficulty: 'JUNIOR',
        estimatedEffortHours: 6,
        expectedDuration: 'DAYS_8_14',
        communicationLanguage: 'EN',
        timezonePreference: 'Europe/Any',
        applicationDeadline: task.application_deadline,
        visibility: 'PUBLIC',
        deliverables: 'PR with code + tests',
        requirements: 'REST + pagination',
        niceToHave: 'OpenAPI',
      },
      select: { id: true, status: true, createdAt: true },
    });

    expect(result).toEqual({ taskId: 't2', status: 'DRAFT', createdAt });
  });
});
