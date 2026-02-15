import { jest } from '@jest/globals';

const prismaMock = {
  project: {
    findUnique: jest.fn(),
  },
  task: {
    create: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
  },
};

jest.unstable_mockModule('../../src/db/prisma.js', () => ({ prisma: prismaMock }));

const tasksService = await import('../../src/services/tasks.service.js');

describe('tasks.service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
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
      required_skills: ['Node.js'],
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
        requiredSkills: ['Node.js'],
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
      required_skills: ['Node.js'],
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
        requiredSkills: ['Node.js'],
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
      required_skills: ['React'],
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
        requiredSkills: ['React'],
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
      required_skills: ['React'],
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
        requiredSkills: ['React'],
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
});
