import { jest } from '@jest/globals';

const prismaMock = {
  chatThread: {
    findMany: jest.fn(),
    count: jest.fn(),
  },
  developerProfile: {
    findMany: jest.fn(),
  },
  companyProfile: {
    findMany: jest.fn(),
  },
};

const threadsCacheMock = {
  getCachedMyThreadsCatalog: jest.fn(),
  setCachedMyThreadsCatalog: jest.fn(),
  invalidateCachedMyThreadsCatalog: jest.fn(),
};

jest.unstable_mockModule('../../src/db/prisma.js', () => ({ prisma: prismaMock }));
jest.unstable_mockModule('../../src/cache/threads-catalog.js', () => threadsCacheMock);

const { getMyThreads } = await import('../../../../src/services/me/threads-read.js');

describe('me.service - threads cache', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    threadsCacheMock.getCachedMyThreadsCatalog.mockResolvedValue(null);
    threadsCacheMock.setCachedMyThreadsCatalog.mockResolvedValue(true);
    threadsCacheMock.invalidateCachedMyThreadsCatalog.mockResolvedValue(true);
  });

  test('returns cached threads list when cache hit is available', async () => {
    const cached = {
      items: [{ thread_id: 'th1' }],
      page: 1,
      size: 20,
      total: 1,
    };

    threadsCacheMock.getCachedMyThreadsCatalog.mockResolvedValue(cached);

    const result = await getMyThreads({
      userId: 'u1',
      persona: 'developer',
      page: 1,
      size: 20,
      search: '',
      importantOnly: false,
    });

    expect(result).toEqual(cached);
    expect(prismaMock.chatThread.findMany).not.toHaveBeenCalled();
    expect(prismaMock.chatThread.count).not.toHaveBeenCalled();
    expect(threadsCacheMock.setCachedMyThreadsCatalog).not.toHaveBeenCalled();
  });

  test('loads threads from db and stores cache on miss', async () => {
    const createdAt = new Date('2026-03-01T10:00:00Z');

    prismaMock.chatThread.findMany.mockResolvedValue([
      {
        id: 'th1',
        taskId: 't1',
        companyUserId: 'c1',
        developerUserId: 'u1',
        createdAt,
        lastMessageAt: null,
        task: { id: 't1', title: 'Backend API', status: 'IN_PROGRESS' },
        messages: [],
        reads: [],
      },
    ]);
    prismaMock.chatThread.count.mockResolvedValue(1);
    prismaMock.developerProfile.findMany.mockResolvedValue([]);
    prismaMock.companyProfile.findMany.mockResolvedValue([
      {
        userId: 'c1',
        companyName: 'Tech Corp',
        logoUrl: null,
      },
    ]);

    const result = await getMyThreads({
      userId: 'u1',
      persona: 'developer',
      page: 1,
      size: 20,
      search: '',
      importantOnly: false,
    });

    expect(result.total).toBe(1);
    expect(result.items[0].thread_id).toBe('th1');
    expect(threadsCacheMock.setCachedMyThreadsCatalog).toHaveBeenCalledTimes(1);
  });

  test('returns db result when cache write fails (redis unavailable fallback)', async () => {
    const createdAt = new Date('2026-03-01T10:00:00Z');

    threadsCacheMock.setCachedMyThreadsCatalog.mockResolvedValue(false);
    prismaMock.chatThread.findMany.mockResolvedValue([
      {
        id: 'th2',
        taskId: 't2',
        companyUserId: 'c2',
        developerUserId: 'u1',
        createdAt,
        lastMessageAt: null,
        task: { id: 't2', title: 'Platform task', status: 'DISPUTE' },
        messages: [],
        reads: [],
      },
    ]);
    prismaMock.chatThread.count.mockResolvedValue(1);
    prismaMock.developerProfile.findMany.mockResolvedValue([]);
    prismaMock.companyProfile.findMany.mockResolvedValue([
      {
        userId: 'c2',
        companyName: 'Fallback Inc',
        logoUrl: null,
      },
    ]);

    const result = await getMyThreads({
      userId: 'u1',
      persona: 'developer',
      page: 1,
      size: 20,
    });

    expect(result.total).toBe(1);
    expect(result.items[0].task.status).toBe('DISPUTE');
  });
});
