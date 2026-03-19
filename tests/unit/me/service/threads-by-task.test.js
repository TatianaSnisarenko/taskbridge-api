import { jest } from '@jest/globals';

const findThreadIdByTaskIdMock = jest.fn();
const findTaskForThreadResolutionMock = jest.fn();
const upsertThreadByTaskIdMock = jest.fn();
const getThreadByIdMock = jest.fn();

jest.unstable_mockModule('../../src/db/queries/chat.queries.js', () => ({
  findThreadIdByTaskId: findThreadIdByTaskIdMock,
  findTaskForThreadResolution: findTaskForThreadResolutionMock,
  upsertThreadByTaskId: upsertThreadByTaskIdMock,
}));

jest.unstable_mockModule('../../src/services/me/threads-read.js', () => ({
  getThreadById: getThreadByIdMock,
}));

const { getThreadByTaskId } = await import('../../../../src/services/me/threads-by-task.js');

describe('threads-by-task.service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('returns existing thread details when thread already exists', async () => {
    findThreadIdByTaskIdMock.mockResolvedValue({ id: 'th-1' });
    getThreadByIdMock.mockResolvedValue({ thread_id: 'th-1' });

    const result = await getThreadByTaskId({
      userId: 'u-company',
      persona: 'company',
      taskId: 'task-1',
    });

    expect(findThreadIdByTaskIdMock).toHaveBeenCalledWith('task-1');
    expect(findTaskForThreadResolutionMock).not.toHaveBeenCalled();
    expect(upsertThreadByTaskIdMock).not.toHaveBeenCalled();
    expect(getThreadByIdMock).toHaveBeenCalledWith({
      userId: 'u-company',
      persona: 'company',
      threadId: 'th-1',
    });
    expect(result).toEqual({ thread_id: 'th-1' });
  });

  test('creates thread when missing and task is IN_PROGRESS', async () => {
    findThreadIdByTaskIdMock.mockResolvedValue(null);
    findTaskForThreadResolutionMock.mockResolvedValue({
      id: 'task-2',
      status: 'IN_PROGRESS',
      deletedAt: null,
      ownerUserId: 'u-company',
      acceptedApplication: {
        developerUserId: 'u-dev',
      },
    });
    upsertThreadByTaskIdMock.mockResolvedValue({ id: 'th-created' });
    getThreadByIdMock.mockResolvedValue({ thread_id: 'th-created' });

    const result = await getThreadByTaskId({
      userId: 'u-company',
      persona: 'company',
      taskId: 'task-2',
    });

    expect(upsertThreadByTaskIdMock).toHaveBeenCalledWith({
      taskId: 'task-2',
      companyUserId: 'u-company',
      developerUserId: 'u-dev',
    });
    expect(getThreadByIdMock).toHaveBeenCalledWith({
      userId: 'u-company',
      persona: 'company',
      threadId: 'th-created',
    });
    expect(result).toEqual({ thread_id: 'th-created' });
  });

  test('throws 404 when task is missing while thread is missing', async () => {
    findThreadIdByTaskIdMock.mockResolvedValue(null);
    findTaskForThreadResolutionMock.mockResolvedValue(null);

    await expect(
      getThreadByTaskId({
        userId: 'u-company',
        persona: 'company',
        taskId: 'task-3',
      })
    ).rejects.toMatchObject({ status: 404, code: 'NOT_FOUND' });
  });

  test('throws 403 when developer is not accepted participant', async () => {
    findThreadIdByTaskIdMock.mockResolvedValue(null);
    findTaskForThreadResolutionMock.mockResolvedValue({
      id: 'task-4',
      status: 'IN_PROGRESS',
      deletedAt: null,
      ownerUserId: 'u-company',
      acceptedApplication: {
        developerUserId: 'u-dev',
      },
    });

    await expect(
      getThreadByTaskId({
        userId: 'u-other-dev',
        persona: 'developer',
        taskId: 'task-4',
      })
    ).rejects.toMatchObject({ status: 403, code: 'FORBIDDEN' });
  });

  test('throws 403 when company is not task owner', async () => {
    findThreadIdByTaskIdMock.mockResolvedValue(null);
    findTaskForThreadResolutionMock.mockResolvedValue({
      id: 'task-4b',
      status: 'IN_PROGRESS',
      deletedAt: null,
      ownerUserId: 'u-company-owner',
      acceptedApplication: {
        developerUserId: 'u-dev',
      },
    });

    await expect(
      getThreadByTaskId({
        userId: 'u-company-other',
        persona: 'company',
        taskId: 'task-4b',
      })
    ).rejects.toMatchObject({ status: 403, code: 'FORBIDDEN' });
  });

  test('throws 404 when accepted developer is missing', async () => {
    findThreadIdByTaskIdMock.mockResolvedValue(null);
    findTaskForThreadResolutionMock.mockResolvedValue({
      id: 'task-4c',
      status: 'IN_PROGRESS',
      deletedAt: null,
      ownerUserId: 'u-company',
      acceptedApplication: null,
    });

    await expect(
      getThreadByTaskId({
        userId: 'u-company',
        persona: 'company',
        taskId: 'task-4c',
      })
    ).rejects.toMatchObject({ status: 404, code: 'NOT_FOUND' });
  });

  test('throws 404 when task is soft deleted', async () => {
    findThreadIdByTaskIdMock.mockResolvedValue(null);
    findTaskForThreadResolutionMock.mockResolvedValue({
      id: 'task-4d',
      status: 'IN_PROGRESS',
      deletedAt: new Date('2026-03-19T10:00:00Z'),
      ownerUserId: 'u-company',
      acceptedApplication: {
        developerUserId: 'u-dev',
      },
    });

    await expect(
      getThreadByTaskId({
        userId: 'u-company',
        persona: 'company',
        taskId: 'task-4d',
      })
    ).rejects.toMatchObject({ status: 404, code: 'NOT_FOUND' });
  });

  test('creates thread for developer persona when accepted developer matches', async () => {
    findThreadIdByTaskIdMock.mockResolvedValue(null);
    findTaskForThreadResolutionMock.mockResolvedValue({
      id: 'task-4e',
      status: 'IN_PROGRESS',
      deletedAt: null,
      ownerUserId: 'u-company',
      acceptedApplication: {
        developerUserId: 'u-dev',
      },
    });
    upsertThreadByTaskIdMock.mockResolvedValue({ id: 'th-created-dev' });
    getThreadByIdMock.mockResolvedValue({ thread_id: 'th-created-dev' });

    const result = await getThreadByTaskId({
      userId: 'u-dev',
      persona: 'developer',
      taskId: 'task-4e',
    });

    expect(result).toEqual({ thread_id: 'th-created-dev' });
    expect(upsertThreadByTaskIdMock).toHaveBeenCalledWith({
      taskId: 'task-4e',
      companyUserId: 'u-company',
      developerUserId: 'u-dev',
    });
  });

  test('throws 404 when task is not IN_PROGRESS and thread is missing', async () => {
    findThreadIdByTaskIdMock.mockResolvedValue(null);
    findTaskForThreadResolutionMock.mockResolvedValue({
      id: 'task-5',
      status: 'COMPLETED',
      deletedAt: null,
      ownerUserId: 'u-company',
      acceptedApplication: {
        developerUserId: 'u-dev',
      },
    });

    await expect(
      getThreadByTaskId({
        userId: 'u-company',
        persona: 'company',
        taskId: 'task-5',
      })
    ).rejects.toMatchObject({ status: 404, code: 'NOT_FOUND' });
  });
});
