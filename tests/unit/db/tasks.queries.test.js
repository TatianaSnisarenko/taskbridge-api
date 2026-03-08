import { jest } from '@jest/globals';

const prismaMock = {
  task: {
    findUnique: jest.fn(),
  },
  project: {
    findUnique: jest.fn(),
  },
};

jest.unstable_mockModule('../../src/db/prisma.js', () => ({ prisma: prismaMock }));

const { findProjectForOwnership, findTaskForApplication, findTaskForApplications } =
  await import('../../../src/db/queries/tasks.queries.js');

describe('tasks.queries', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('findProjectForOwnership returns project for owner', async () => {
    prismaMock.project.findUnique.mockResolvedValue({
      id: 'p1',
      ownerUserId: 'u1',
      deletedAt: null,
    });

    const result = await findProjectForOwnership('p1', 'u1');

    expect(prismaMock.project.findUnique).toHaveBeenCalledWith({
      where: { id: 'p1' },
      select: { id: true, ownerUserId: true, deletedAt: true },
    });
    expect(result).toEqual({ id: 'p1', ownerUserId: 'u1', deletedAt: null });
  });

  test('findProjectForOwnership throws when project missing', async () => {
    prismaMock.project.findUnique.mockResolvedValue(null);

    await expect(findProjectForOwnership('p1', 'u1')).rejects.toMatchObject({
      status: 404,
      code: 'PROJECT_NOT_FOUND',
    });
  });

  test('findProjectForOwnership throws when project is deleted', async () => {
    prismaMock.project.findUnique.mockResolvedValue({
      id: 'p1',
      ownerUserId: 'u1',
      deletedAt: new Date(),
    });

    await expect(findProjectForOwnership('p1', 'u1')).rejects.toMatchObject({
      status: 404,
      code: 'PROJECT_NOT_FOUND',
    });
  });

  test('findProjectForOwnership throws when not owner', async () => {
    prismaMock.project.findUnique.mockResolvedValue({
      id: 'p1',
      ownerUserId: 'u2',
      deletedAt: null,
    });

    await expect(findProjectForOwnership('p1', 'u1')).rejects.toMatchObject({
      status: 403,
      code: 'NOT_OWNER',
    });
  });

  test('findTaskForApplication returns task when published', async () => {
    prismaMock.task.findUnique.mockResolvedValue({
      id: 't1',
      ownerUserId: 'u1',
      status: 'PUBLISHED',
      deletedAt: null,
      acceptedApplicationId: null,
    });

    const result = await findTaskForApplication('t1');

    expect(result.status).toBe('PUBLISHED');
  });

  test('findTaskForApplication throws when task missing', async () => {
    prismaMock.task.findUnique.mockResolvedValue(null);

    await expect(findTaskForApplication('t1')).rejects.toMatchObject({
      status: 404,
      code: 'TASK_NOT_FOUND',
    });
  });

  test('findTaskForApplication throws when task not published', async () => {
    prismaMock.task.findUnique.mockResolvedValue({
      id: 't1',
      ownerUserId: 'u1',
      status: 'IN_PROGRESS',
      deletedAt: null,
      acceptedApplicationId: 'a1',
    });

    await expect(findTaskForApplication('t1')).rejects.toMatchObject({
      status: 409,
      code: 'TASK_NOT_OPEN',
    });
  });

  test('findTaskForApplications returns task for owner', async () => {
    prismaMock.task.findUnique.mockResolvedValue({
      id: 't1',
      ownerUserId: 'u1',
      status: 'PUBLISHED',
      deletedAt: null,
      title: 'Task',
      owner: { companyProfile: { companyName: 'ACME' } },
    });

    const result = await findTaskForApplications('t1', 'u1');

    expect(result.title).toBe('Task');
  });

  test('findTaskForApplications throws when task missing', async () => {
    prismaMock.task.findUnique.mockResolvedValue(null);

    await expect(findTaskForApplications('t1', 'u1')).rejects.toMatchObject({
      status: 404,
      code: 'NOT_FOUND',
    });
  });

  test('findTaskForApplications throws when not owner', async () => {
    prismaMock.task.findUnique.mockResolvedValue({
      id: 't1',
      ownerUserId: 'u2',
      status: 'PUBLISHED',
      deletedAt: null,
      title: 'Task',
      owner: { companyProfile: { companyName: 'ACME' } },
    });

    await expect(findTaskForApplications('t1', 'u1')).rejects.toMatchObject({
      status: 403,
      code: 'NOT_OWNER',
    });
  });
});
