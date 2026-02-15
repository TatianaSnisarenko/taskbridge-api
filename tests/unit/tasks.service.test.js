import { jest } from '@jest/globals';

const prismaMock = {
  project: {
    findUnique: jest.fn(),
  },
  task: {
    create: jest.fn(),
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
});
