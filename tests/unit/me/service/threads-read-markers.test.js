import { jest } from '@jest/globals';

const createNotificationMock = jest.fn();

const prismaMock = {
  $transaction: jest.fn(),
  chatThread: {
    findMany: jest.fn(),
    count: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
  },
  chatMessage: {
    findMany: jest.fn(),
    count: jest.fn(),
    create: jest.fn(),
  },
  chatThreadRead: {
    upsert: jest.fn(),
    updateMany: jest.fn(),
  },
  developerProfile: {
    findUnique: jest.fn(),
  },
  companyProfile: {
    findUnique: jest.fn(),
  },
};

jest.unstable_mockModule('../../src/db/prisma.js', () => ({ prisma: prismaMock }));
jest.unstable_mockModule('../../src/services/notifications/index.js', () => ({
  createNotification: createNotificationMock,
}));

const meService = await import('../../../../src/services/me/index.js');

describe('me.service threads - markThreadAsRead', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('rejects missing thread', async () => {
    prismaMock.chatThread.findUnique.mockResolvedValue(null);

    await expect(
      meService.markThreadAsRead({ userId: 'd1', persona: 'developer', threadId: 'th1' })
    ).rejects.toMatchObject({ status: 404, code: 'NOT_FOUND' });
  });

  test('rejects deleted task thread', async () => {
    prismaMock.chatThread.findUnique.mockResolvedValue({
      id: 'th1',
      taskId: 't1',
      companyUserId: 'c1',
      developerUserId: 'd1',
      task: { id: 't1', status: 'IN_PROGRESS', deletedAt: new Date() },
    });

    await expect(
      meService.markThreadAsRead({ userId: 'd1', persona: 'developer', threadId: 'th1' })
    ).rejects.toMatchObject({ status: 404, code: 'NOT_FOUND' });
  });

  test('rejects company persona when user is not company participant', async () => {
    prismaMock.chatThread.findUnique.mockResolvedValue({
      id: 'th1',
      taskId: 't1',
      companyUserId: 'c2',
      developerUserId: 'd1',
      task: { id: 't1', status: 'COMPLETED', deletedAt: null },
    });

    await expect(
      meService.markThreadAsRead({ userId: 'c1', persona: 'company', threadId: 'th1' })
    ).rejects.toMatchObject({ status: 403, code: 'FORBIDDEN' });
  });

  test('rejects unsupported task status', async () => {
    prismaMock.chatThread.findUnique.mockResolvedValue({
      id: 'th1',
      taskId: 't1',
      companyUserId: 'c1',
      developerUserId: 'd1',
      task: { id: 't1', status: 'PUBLISHED', deletedAt: null },
    });

    await expect(
      meService.markThreadAsRead({ userId: 'd1', persona: 'developer', threadId: 'th1' })
    ).rejects.toMatchObject({ status: 403, code: 'FORBIDDEN' });
  });

  test('upserts read marker for participant', async () => {
    const readAt = new Date('2026-03-01T12:30:00Z');
    const RealDate = Date;
    globalThis.Date = class extends Date {
      constructor(...args) {
        if (args.length === 0) {
          return readAt;
        }
        return new RealDate(...args);
      }
      static now() {
        return readAt.getTime();
      }
    };

    prismaMock.chatThread.findUnique.mockResolvedValue({
      id: 'th1',
      taskId: 't1',
      companyUserId: 'c1',
      developerUserId: 'd1',
      task: { id: 't1', status: 'COMPLETED', deletedAt: null },
    });
    prismaMock.chatThreadRead.upsert.mockResolvedValue({
      threadId: 'th1',
      userId: 'd1',
      lastReadAt: readAt,
    });

    const result = await meService.markThreadAsRead({
      userId: 'd1',
      persona: 'developer',
      threadId: 'th1',
    });

    expect(prismaMock.chatThreadRead.upsert).toHaveBeenCalledWith({
      where: {
        threadId_userId: {
          threadId: 'th1',
          userId: 'd1',
        },
      },
      create: {
        threadId: 'th1',
        userId: 'd1',
        lastReadAt: readAt,
      },
      update: {
        lastReadAt: readAt,
      },
    });

    expect(result).toEqual({
      thread_id: 'th1',
      read_at: readAt.toISOString(),
    });

    globalThis.Date = RealDate;
  });

  test('allows FAILED status when marking thread as read', async () => {
    const readAt = new Date('2026-03-01T16:00:00Z');
    const RealDate = Date;
    globalThis.Date = class extends Date {
      constructor(...args) {
        if (args.length === 0) {
          return readAt;
        }
        return new RealDate(...args);
      }
      static now() {
        return readAt.getTime();
      }
    };

    prismaMock.chatThread.findUnique.mockResolvedValue({
      id: 'th2',
      taskId: 't2',
      companyUserId: 'c1',
      developerUserId: 'd1',
      task: { id: 't2', status: 'FAILED', deletedAt: null },
    });
    prismaMock.chatThreadRead.upsert.mockResolvedValue({
      threadId: 'th2',
      userId: 'd1',
      lastReadAt: readAt,
    });

    const result = await meService.markThreadAsRead({
      userId: 'd1',
      persona: 'developer',
      threadId: 'th2',
    });

    expect(result).toEqual({
      thread_id: 'th2',
      read_at: readAt.toISOString(),
    });

    globalThis.Date = RealDate;
  });
});

describe('me.service threads - mark thread important flags', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('markThreadAsImportant rejects missing thread', async () => {
    prismaMock.chatThread.findUnique.mockResolvedValue(null);

    await expect(
      meService.markThreadAsImportant({ userId: 'd1', persona: 'developer', threadId: 'th1' })
    ).rejects.toMatchObject({ status: 404, code: 'NOT_FOUND' });
  });

  test('markThreadAsUnimportant rejects missing thread', async () => {
    prismaMock.chatThread.findUnique.mockResolvedValue(null);

    await expect(
      meService.markThreadAsUnimportant({ userId: 'd1', persona: 'developer', threadId: 'th1' })
    ).rejects.toMatchObject({ status: 404, code: 'NOT_FOUND' });
  });

  test('markThreadAsImportant upserts important_at for user', async () => {
    const createdAt = new Date('2026-03-01T10:00:00Z');
    const importantAt = new Date('2026-03-18T12:40:00Z');
    const RealDate = Date;
    globalThis.Date = class extends Date {
      constructor(...args) {
        if (args.length === 0) {
          return importantAt;
        }
        return new RealDate(...args);
      }
      static now() {
        return importantAt.getTime();
      }
    };

    prismaMock.chatThread.findUnique.mockResolvedValue({
      id: 'th1',
      createdAt,
      taskId: 't1',
      companyUserId: 'c1',
      developerUserId: 'd1',
      task: { id: 't1', status: 'IN_PROGRESS', deletedAt: null },
    });
    prismaMock.chatThreadRead.upsert.mockResolvedValue({
      threadId: 'th1',
      importantAt,
    });

    const result = await meService.markThreadAsImportant({
      userId: 'd1',
      persona: 'developer',
      threadId: 'th1',
    });

    expect(prismaMock.chatThreadRead.upsert).toHaveBeenCalledWith({
      where: {
        threadId_userId: {
          threadId: 'th1',
          userId: 'd1',
        },
      },
      create: {
        threadId: 'th1',
        userId: 'd1',
        lastReadAt: createdAt,
        importantAt,
      },
      update: {
        importantAt,
      },
      select: {
        threadId: true,
        importantAt: true,
      },
    });

    expect(result).toEqual({
      thread_id: 'th1',
      important_at: importantAt.toISOString(),
    });

    globalThis.Date = RealDate;
  });

  test('markThreadAsUnimportant clears thread important flag', async () => {
    prismaMock.chatThread.findUnique.mockResolvedValue({
      id: 'th1',
      createdAt: new Date('2026-03-01T10:00:00Z'),
      taskId: 't1',
      companyUserId: 'c1',
      developerUserId: 'd1',
      task: { id: 't1', status: 'IN_PROGRESS', deletedAt: null },
    });
    prismaMock.chatThreadRead.updateMany.mockResolvedValue({ count: 1 });

    const result = await meService.markThreadAsUnimportant({
      userId: 'd1',
      persona: 'developer',
      threadId: 'th1',
    });

    expect(prismaMock.chatThreadRead.updateMany).toHaveBeenCalledWith({
      where: {
        threadId: 'th1',
        userId: 'd1',
      },
      data: {
        importantAt: null,
      },
    });

    expect(result).toEqual({
      thread_id: 'th1',
      important_at: null,
    });
  });

  test('markThreadAsImportant allows FAILED task status', async () => {
    const createdAt = new Date('2026-03-01T10:00:00Z');
    const importantAt = new Date('2026-03-18T12:41:00Z');
    const RealDate = Date;
    globalThis.Date = class extends Date {
      constructor(...args) {
        if (args.length === 0) {
          return importantAt;
        }
        return new RealDate(...args);
      }
      static now() {
        return importantAt.getTime();
      }
    };

    prismaMock.chatThread.findUnique.mockResolvedValue({
      id: 'th2',
      createdAt,
      taskId: 't2',
      companyUserId: 'c1',
      developerUserId: 'd1',
      task: { id: 't2', status: 'FAILED', deletedAt: null },
    });
    prismaMock.chatThreadRead.upsert.mockResolvedValue({
      threadId: 'th2',
      importantAt,
    });

    const result = await meService.markThreadAsImportant({
      userId: 'd1',
      persona: 'developer',
      threadId: 'th2',
    });

    expect(result).toEqual({
      thread_id: 'th2',
      important_at: importantAt.toISOString(),
    });

    globalThis.Date = RealDate;
  });
});
