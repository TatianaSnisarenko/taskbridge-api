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

const tasksService = await import('../../src/services/tasks/index.js');

describe('tasks.service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Configure $transaction to actually call the callback function
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

  test('publishTask rejects task not found', async () => {
    prismaMock.task.findUnique.mockResolvedValue(null);

    await expect(
      tasksService.publishTask({
        userId: 'u1',
        taskId: 't1',
      })
    ).rejects.toMatchObject({
      status: 404,
      code: 'NOT_FOUND',
    });
  });

  test('publishTask rejects deleted task', async () => {
    prismaMock.task.findUnique.mockResolvedValue({
      id: 't1',
      ownerUserId: 'u1',
      status: 'DRAFT',
      deletedAt: new Date(),
    });

    await expect(
      tasksService.publishTask({
        userId: 'u1',
        taskId: 't1',
      })
    ).rejects.toMatchObject({
      status: 404,
      code: 'NOT_FOUND',
    });
  });

  test('publishTask rejects non-owner task', async () => {
    prismaMock.task.findUnique.mockResolvedValue({
      id: 't1',
      ownerUserId: 'u2',
      status: 'DRAFT',
      deletedAt: null,
    });

    await expect(
      tasksService.publishTask({
        userId: 'u1',
        taskId: 't1',
      })
    ).rejects.toMatchObject({
      status: 403,
      code: 'NOT_OWNER',
    });
  });

  test('publishTask rejects invalid state (PUBLISHED)', async () => {
    prismaMock.task.findUnique.mockResolvedValue({
      id: 't1',
      ownerUserId: 'u1',
      status: 'PUBLISHED',
      deletedAt: null,
    });

    await expect(
      tasksService.publishTask({
        userId: 'u1',
        taskId: 't1',
      })
    ).rejects.toMatchObject({
      status: 409,
      code: 'INVALID_STATE',
    });
  });

  test('publishTask rejects invalid state (IN_PROGRESS)', async () => {
    prismaMock.task.findUnique.mockResolvedValue({
      id: 't1',
      ownerUserId: 'u1',
      status: 'IN_PROGRESS',
      deletedAt: null,
    });

    await expect(
      tasksService.publishTask({
        userId: 'u1',
        taskId: 't1',
      })
    ).rejects.toMatchObject({
      status: 409,
      code: 'INVALID_STATE',
    });
  });

  test('publishTask publishes DRAFT task', async () => {
    const publishedAt = new Date('2026-02-14T13:20:00Z');
    prismaMock.task.findUnique.mockResolvedValue({
      id: 't1',
      ownerUserId: 'u1',
      status: 'DRAFT',
      deletedAt: null,
    });
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

    expect(result).toEqual({
      taskId: 't1',
      status: 'PUBLISHED',
      publishedAt,
    });
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

  test('closeTask rejects task not found', async () => {
    prismaMock.task.findUnique.mockResolvedValue(null);

    await expect(
      tasksService.closeTask({
        userId: 'u1',
        taskId: 't1',
      })
    ).rejects.toMatchObject({
      status: 404,
      code: 'NOT_FOUND',
    });
  });

  test('closeTask rejects deleted task', async () => {
    prismaMock.task.findUnique.mockResolvedValue({
      id: 't1',
      ownerUserId: 'u1',
      status: 'DRAFT',
      deletedAt: new Date(),
    });

    await expect(
      tasksService.closeTask({
        userId: 'u1',
        taskId: 't1',
      })
    ).rejects.toMatchObject({
      status: 404,
      code: 'NOT_FOUND',
    });
  });

  test('closeTask rejects non-owner task', async () => {
    prismaMock.task.findUnique.mockResolvedValue({
      id: 't1',
      ownerUserId: 'u2',
      status: 'DRAFT',
      deletedAt: null,
    });

    await expect(
      tasksService.closeTask({
        userId: 'u1',
        taskId: 't1',
      })
    ).rejects.toMatchObject({
      status: 403,
      code: 'NOT_OWNER',
    });
  });

  test('closeTask rejects invalid state (IN_PROGRESS)', async () => {
    prismaMock.task.findUnique.mockResolvedValue({
      id: 't1',
      ownerUserId: 'u1',
      status: 'IN_PROGRESS',
      deletedAt: null,
    });

    await expect(
      tasksService.closeTask({
        userId: 'u1',
        taskId: 't1',
      })
    ).rejects.toMatchObject({
      status: 409,
      code: 'INVALID_STATE',
    });
  });

  test('closeTask rejects invalid state (COMPLETED)', async () => {
    prismaMock.task.findUnique.mockResolvedValue({
      id: 't1',
      ownerUserId: 'u1',
      status: 'COMPLETED',
      deletedAt: null,
    });

    await expect(
      tasksService.closeTask({
        userId: 'u1',
        taskId: 't1',
      })
    ).rejects.toMatchObject({
      status: 409,
      code: 'INVALID_STATE',
    });
  });

  test('closeTask rejects invalid state (CLOSED)', async () => {
    prismaMock.task.findUnique.mockResolvedValue({
      id: 't1',
      ownerUserId: 'u1',
      status: 'CLOSED',
      deletedAt: null,
    });

    await expect(
      tasksService.closeTask({
        userId: 'u1',
        taskId: 't1',
      })
    ).rejects.toMatchObject({
      status: 409,
      code: 'INVALID_STATE',
    });
  });

  test('closeTask closes DRAFT task', async () => {
    const closedAt = new Date('2026-02-14T13:30:00Z');
    prismaMock.task.findUnique.mockResolvedValue({
      id: 't1',
      ownerUserId: 'u1',
      status: 'DRAFT',
      deletedAt: null,
    });
    prismaMock.task.update.mockResolvedValue({
      id: 't1',
      status: 'CLOSED',
      closedAt,
    });

    const result = await tasksService.closeTask({ userId: 'u1', taskId: 't1' });

    expect(prismaMock.task.update).toHaveBeenCalledWith({
      where: { id: 't1' },
      data: {
        status: 'CLOSED',
        closedAt: expect.any(Date),
      },
      select: { id: true, status: true, closedAt: true },
    });

    expect(result).toEqual({
      taskId: 't1',
      status: 'CLOSED',
      closedAt,
    });
  });

  test('closeTask closes PUBLISHED task', async () => {
    const closedAt = new Date('2026-02-14T13:35:00Z');
    prismaMock.task.findUnique.mockResolvedValue({
      id: 't1',
      ownerUserId: 'u1',
      status: 'PUBLISHED',
      deletedAt: null,
    });
    prismaMock.task.update.mockResolvedValue({
      id: 't1',
      status: 'CLOSED',
      closedAt,
    });

    const result = await tasksService.closeTask({ userId: 'u1', taskId: 't1' });

    expect(prismaMock.task.update).toHaveBeenCalledWith({
      where: { id: 't1' },
      data: {
        status: 'CLOSED',
        closedAt: expect.any(Date),
      },
      select: { id: true, status: true, closedAt: true },
    });

    expect(result).toEqual({
      taskId: 't1',
      status: 'CLOSED',
      closedAt,
    });
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

  describe('requestTaskCompletion', () => {
    test('rejects missing task', async () => {
      prismaMock.$transaction.mockImplementation(async (cb) => cb(prismaMock));
      prismaMock.task.findUnique.mockResolvedValue(null);

      await expect(
        tasksService.requestTaskCompletion({
          userId: 'dev1',
          taskId: 't1',
        })
      ).rejects.toMatchObject({
        status: 404,
        code: 'NOT_FOUND',
      });
    });

    test('rejects deleted task', async () => {
      prismaMock.$transaction.mockImplementation(async (cb) => cb(prismaMock));
      prismaMock.task.findUnique.mockResolvedValue({
        id: 't1',
        deletedAt: new Date(),
        status: 'IN_PROGRESS',
      });

      await expect(
        tasksService.requestTaskCompletion({
          userId: 'dev1',
          taskId: 't1',
        })
      ).rejects.toMatchObject({
        status: 404,
        code: 'NOT_FOUND',
      });
    });

    test('rejects invalid state', async () => {
      prismaMock.$transaction.mockImplementation(async (cb) => cb(prismaMock));
      prismaMock.task.findUnique.mockResolvedValue({
        id: 't1',
        ownerUserId: 'owner1',
        status: 'PUBLISHED',
        deletedAt: null,
        acceptedApplicationId: 'a1',
        acceptedApplication: { developerUserId: 'dev1' },
      });

      await expect(
        tasksService.requestTaskCompletion({
          userId: 'dev1',
          taskId: 't1',
        })
      ).rejects.toMatchObject({
        status: 409,
        code: 'INVALID_STATE',
      });
    });

    test('rejects non-accepted developer', async () => {
      prismaMock.$transaction.mockImplementation(async (cb) => cb(prismaMock));
      prismaMock.task.findUnique.mockResolvedValue({
        id: 't1',
        ownerUserId: 'owner1',
        status: 'IN_PROGRESS',
        deletedAt: null,
        acceptedApplicationId: 'a1',
        acceptedApplication: { developerUserId: 'dev2' },
      });

      await expect(
        tasksService.requestTaskCompletion({
          userId: 'dev1',
          taskId: 't1',
        })
      ).rejects.toMatchObject({
        status: 403,
        code: 'FORBIDDEN',
      });
    });

    test('updates task status and creates notification', async () => {
      prismaMock.$transaction.mockImplementation(async (cb) => cb(prismaMock));
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

      expect(prismaMock.task.update).toHaveBeenCalledWith({
        where: { id: 't1' },
        data: {
          status: 'COMPLETION_REQUESTED',
        },
        select: { id: true, title: true, status: true },
      });

      expect(notificationsServiceMock.createNotification).toHaveBeenCalledWith({
        client: prismaMock,
        userId: 'owner1',
        actorUserId: 'dev1',
        taskId: 't1',
        type: 'COMPLETION_REQUESTED',
        payload: {
          task_id: 't1',
        },
      });

      expect(result).toEqual({
        taskId: 't1',
        status: 'COMPLETION_REQUESTED',
      });
    });
  });

  describe('confirmTaskCompletion', () => {
    test('rejects missing task', async () => {
      prismaMock.$transaction.mockImplementation(async (cb) => cb(prismaMock));
      prismaMock.task.findUnique.mockResolvedValue(null);

      await expect(
        tasksService.confirmTaskCompletion({
          userId: 'owner1',
          taskId: 't1',
        })
      ).rejects.toMatchObject({
        status: 404,
        code: 'NOT_FOUND',
      });
    });

    test('rejects deleted task', async () => {
      prismaMock.$transaction.mockImplementation(async (cb) => cb(prismaMock));
      prismaMock.task.findUnique.mockResolvedValue({
        id: 't1',
        deletedAt: new Date(),
        status: 'COMPLETION_REQUESTED',
      });

      await expect(
        tasksService.confirmTaskCompletion({
          userId: 'owner1',
          taskId: 't1',
        })
      ).rejects.toMatchObject({
        status: 404,
        code: 'NOT_FOUND',
      });
    });

    test('rejects non-owner', async () => {
      prismaMock.$transaction.mockImplementation(async (cb) => cb(prismaMock));
      prismaMock.task.findUnique.mockResolvedValue({
        id: 't1',
        ownerUserId: 'owner2',
        status: 'COMPLETION_REQUESTED',
        deletedAt: null,
        acceptedApplicationId: 'a1',
        acceptedApplication: { developerUserId: 'dev1' },
      });

      await expect(
        tasksService.confirmTaskCompletion({
          userId: 'owner1',
          taskId: 't1',
        })
      ).rejects.toMatchObject({
        status: 403,
        code: 'NOT_OWNER',
      });
    });

    test('rejects invalid state', async () => {
      prismaMock.$transaction.mockImplementation(async (cb) => cb(prismaMock));
      prismaMock.task.findUnique.mockResolvedValue({
        id: 't1',
        ownerUserId: 'owner1',
        status: 'IN_PROGRESS',
        deletedAt: null,
        acceptedApplicationId: 'a1',
        acceptedApplication: { developerUserId: 'dev1' },
      });

      await expect(
        tasksService.confirmTaskCompletion({
          userId: 'owner1',
          taskId: 't1',
        })
      ).rejects.toMatchObject({
        status: 409,
        code: 'INVALID_STATE',
      });
    });

    test('rejects missing accepted developer', async () => {
      prismaMock.$transaction.mockImplementation(async (cb) => cb(prismaMock));
      prismaMock.task.findUnique.mockResolvedValue({
        id: 't1',
        ownerUserId: 'owner1',
        status: 'COMPLETION_REQUESTED',
        deletedAt: null,
        acceptedApplicationId: null,
        acceptedApplication: null,
      });

      await expect(
        tasksService.confirmTaskCompletion({
          userId: 'owner1',
          taskId: 't1',
        })
      ).rejects.toMatchObject({
        status: 409,
        code: 'INVALID_STATE',
      });
    });

    test('updates task status and creates notification', async () => {
      const completedAt = new Date('2026-02-14T15:00:00Z');
      prismaMock.$transaction.mockImplementation(async (cb) => cb(prismaMock));
      prismaMock.task.findUnique.mockResolvedValue({
        id: 't1',
        ownerUserId: 'owner1',
        status: 'COMPLETION_REQUESTED',
        deletedAt: null,
        acceptedApplicationId: 'a1',
        acceptedApplication: { developerUserId: 'dev1' },
      });
      prismaMock.task.update.mockResolvedValue({
        id: 't1',
        title: 'Test Task',
        status: 'COMPLETED',
        completedAt,
      });
      prismaMock.user.findUnique.mockResolvedValue({
        id: 'dev1',
        email: 'dev@example.com',
        emailVerified: true,
        developerProfile: { displayName: 'Test Developer' },
      });

      const result = await tasksService.confirmTaskCompletion({
        userId: 'owner1',
        taskId: 't1',
      });

      expect(prismaMock.task.update).toHaveBeenCalledWith({
        where: { id: 't1' },
        data: {
          status: 'COMPLETED',
          completedAt: expect.any(Date),
        },
        select: { id: true, title: true, status: true, completedAt: true, projectId: true },
      });

      expect(notificationsServiceMock.createNotification).toHaveBeenCalledWith({
        client: prismaMock,
        userId: 'dev1',
        actorUserId: 'owner1',
        taskId: 't1',
        type: 'TASK_COMPLETED',
        payload: {
          task_id: 't1',
          completed_at: completedAt.toISOString(),
        },
      });

      expect(result).toEqual({
        taskId: 't1',
        status: 'COMPLETED',
        completedAt,
      });
    });
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
  });

  // ========================================================================
  // BATCH 5 BRANCH COVERAGE: getTaskCandidates filter branches
  // ========================================================================

  describe('getTaskCandidates - branch coverage', () => {
    // Setup helpers for candidates tests
    function setupCandidatesBaseMocks() {
      prismaMock.task.findUnique.mockResolvedValue({
        id: 't1',
        ownerUserId: 'u1',
        deletedAt: null,
        status: 'PUBLISHED',
        technologies: [{ technologyId: 'tech-1' }, { technologyId: 'tech-2' }],
        acceptedApplication: null,
      });

      prismaMock.developerProfile.findMany.mockResolvedValue([
        {
          userId: 'd1',
          displayName: 'Dev 1',
          jobTitle: 'Senior Engineer',
          avatarUrl: null,
          experienceLevel: 'SENIOR',
          availability: 'AVAILABLE',
          avgRating: 4.8,
          reviewsCount: 15,
          technologies: [],
        },
        {
          userId: 'd2',
          displayName: 'Dev 2',
          jobTitle: 'Junior Engineer',
          avatarUrl: null,
          experienceLevel: 'JUNIOR',
          availability: 'PARTIALLY_AVAILABLE',
          avgRating: 3.5,
          reviewsCount: 3,
          technologies: [],
        },
      ]);
    }

    test('getTaskCandidates applies availability filter', async () => {
      setupCandidatesBaseMocks();
      prismaMock.application.findMany.mockResolvedValue([]);
      prismaMock.taskInvite.findMany.mockResolvedValue([]);

      await tasksService.getTaskCandidates({
        userId: 'u1',
        taskId: 't1',
        availability: 'AVAILABLE',
      });

      expect(prismaMock.developerProfile.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            availability: 'AVAILABLE',
          }),
        })
      );
    });

    test('getTaskCandidates applies experienceLevel filter', async () => {
      setupCandidatesBaseMocks();
      prismaMock.application.findMany.mockResolvedValue([]);
      prismaMock.taskInvite.findMany.mockResolvedValue([]);

      await tasksService.getTaskCandidates({
        userId: 'u1',
        taskId: 't1',
        experienceLevel: 'SENIOR',
      });

      expect(prismaMock.developerProfile.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            experienceLevel: 'SENIOR',
          }),
        })
      );
    });

    test('getTaskCandidates applies minRating filter', async () => {
      setupCandidatesBaseMocks();
      prismaMock.application.findMany.mockResolvedValue([]);
      prismaMock.taskInvite.findMany.mockResolvedValue([]);

      await tasksService.getTaskCandidates({
        userId: 'u1',
        taskId: 't1',
        minRating: 4.0,
      });

      expect(prismaMock.developerProfile.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            avgRating: { gte: 4.0 },
          }),
        })
      );
    });

    test('getTaskCandidates with excludeInvited flag filters invited candidates', async () => {
      setupCandidatesBaseMocks();
      prismaMock.application.findMany.mockResolvedValue([]);
      // d1 is invited
      prismaMock.taskInvite.findMany.mockResolvedValue([{ developerUserId: 'd1' }]);

      const result = await tasksService.getTaskCandidates({
        userId: 'u1',
        taskId: 't1',
        excludeInvited: true,
      });

      // d1 should be marked as invited (already_invited = true)
      // With excludeInvited flag, it should be filtered out
      const candidateIds = result.items.map((c) => c.user_id);
      expect(candidateIds).not.toContain('d1');
    });

    test('getTaskCandidates with excludeApplied flag filters applied candidates', async () => {
      setupCandidatesBaseMocks();
      // d2 has applied
      prismaMock.application.findMany.mockResolvedValue([{ developerUserId: 'd2' }]);
      prismaMock.taskInvite.findMany.mockResolvedValue([]);

      const result = await tasksService.getTaskCandidates({
        userId: 'u1',
        taskId: 't1',
        excludeApplied: true,
      });

      // d2 should be marked as applied (already_applied = true)
      // With excludeApplied flag, it should be filtered out
      const candidateIds = result.items.map((c) => c.user_id);
      expect(candidateIds).not.toContain('d2');
    });

    test('getTaskCandidates handles combined exclude filters', async () => {
      setupCandidatesBaseMocks();
      prismaMock.application.findMany.mockResolvedValue([{ developerUserId: 'd2' }]);
      prismaMock.taskInvite.findMany.mockResolvedValue([{ developerUserId: 'd1' }]);

      const result = await tasksService.getTaskCandidates({
        userId: 'u1',
        taskId: 't1',
        excludeInvited: true,
        excludeApplied: true,
      });

      // Both d1 and d2 should be filtered out
      expect(result.items.length).toBe(0);
    });
  });
});
