import { jest } from '@jest/globals';

const prismaMock = {
  chatThread: {
    findUnique: jest.fn(),
    upsert: jest.fn(),
  },
  task: {
    findUnique: jest.fn(),
  },
};

jest.unstable_mockModule('../../src/db/prisma.js', () => ({ prisma: prismaMock }));

const { findThreadIdByTaskId, findTaskForThreadResolution, upsertThreadByTaskId } =
  await import('../../../src/db/queries/chat.queries.js');

describe('chat.queries', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('findThreadIdByTaskId requests minimal id projection', async () => {
    prismaMock.chatThread.findUnique.mockResolvedValue({ id: 'thread-1' });

    const result = await findThreadIdByTaskId('task-1');

    expect(prismaMock.chatThread.findUnique).toHaveBeenCalledWith({
      where: { taskId: 'task-1' },
      select: { id: true },
    });
    expect(result).toEqual({ id: 'thread-1' });
  });

  test('findTaskForThreadResolution requests required ownership and acceptance fields', async () => {
    prismaMock.task.findUnique.mockResolvedValue({
      id: 'task-1',
      status: 'IN_PROGRESS',
      deletedAt: null,
      ownerUserId: 'owner-1',
      acceptedApplication: { developerUserId: 'dev-1' },
    });

    const result = await findTaskForThreadResolution('task-1');

    expect(prismaMock.task.findUnique).toHaveBeenCalledWith({
      where: { id: 'task-1' },
      select: {
        id: true,
        status: true,
        deletedAt: true,
        ownerUserId: true,
        acceptedApplication: {
          select: {
            developerUserId: true,
          },
        },
      },
    });
    expect(result.ownerUserId).toBe('owner-1');
  });

  test('upsertThreadByTaskId creates thread with required payload and returns id', async () => {
    prismaMock.chatThread.upsert.mockResolvedValue({ id: 'thread-2' });

    const result = await upsertThreadByTaskId({
      taskId: 'task-1',
      companyUserId: 'company-1',
      developerUserId: 'dev-1',
    });

    expect(prismaMock.chatThread.upsert).toHaveBeenCalledWith({
      where: { taskId: 'task-1' },
      update: {},
      create: {
        taskId: 'task-1',
        companyUserId: 'company-1',
        developerUserId: 'dev-1',
        createdAt: expect.any(Date),
      },
      select: {
        id: true,
      },
    });
    expect(result).toEqual({ id: 'thread-2' });
  });
});
