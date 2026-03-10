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

describe('me.service threads - getThreadMessages', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('rejects deleted task thread', async () => {
    prismaMock.chatThread.findUnique.mockResolvedValue({
      id: 'th1',
      companyUserId: 'c1',
      developerUserId: 'd1',
      taskId: 't1',
      createdAt: new Date('2026-03-01T10:00:00Z'),
      task: { id: 't1', status: 'IN_PROGRESS', deletedAt: new Date() },
      reads: [],
    });

    await expect(
      meService.getThreadMessages({
        userId: 'd1',
        persona: 'developer',
        threadId: 'th1',
        page: 1,
        size: 20,
      })
    ).rejects.toMatchObject({ status: 404, code: 'NOT_FOUND' });
  });

  test('rejects company persona when user is not company participant', async () => {
    prismaMock.chatThread.findUnique.mockResolvedValue({
      id: 'th1',
      companyUserId: 'c2',
      developerUserId: 'd1',
      taskId: 't1',
      createdAt: new Date('2026-03-01T10:00:00Z'),
      task: { id: 't1', status: 'IN_PROGRESS', deletedAt: null },
      reads: [],
    });

    await expect(
      meService.getThreadMessages({
        userId: 'c1',
        persona: 'company',
        threadId: 'th1',
        page: 1,
        size: 20,
      })
    ).rejects.toMatchObject({ status: 403, code: 'FORBIDDEN' });
  });

  test('rejects forbidden status', async () => {
    prismaMock.chatThread.findUnique.mockResolvedValue({
      id: 'th1',
      companyUserId: 'c1',
      developerUserId: 'd1',
      taskId: 't1',
      createdAt: new Date('2026-03-01T10:00:00Z'),
      task: { id: 't1', status: 'PUBLISHED', deletedAt: null },
      reads: [],
    });

    await expect(
      meService.getThreadMessages({
        userId: 'd1',
        persona: 'developer',
        threadId: 'th1',
        page: 1,
        size: 20,
      })
    ).rejects.toMatchObject({ status: 403, code: 'FORBIDDEN' });
  });

  test('returns messages with read_at markers', async () => {
    const createdAt = new Date('2026-03-01T10:00:00Z');
    const readAt = new Date('2026-03-01T11:30:00Z');
    const m1At = new Date('2026-03-01T11:00:00Z');
    const m2At = new Date('2026-03-01T12:00:00Z');

    prismaMock.chatThread.findUnique.mockResolvedValue({
      id: 'th1',
      companyUserId: 'c1',
      developerUserId: 'd1',
      taskId: 't1',
      createdAt,
      task: { id: 't1', status: 'IN_PROGRESS', deletedAt: null },
      reads: [{ lastReadAt: readAt }],
    });
    prismaMock.chatMessage.findMany.mockResolvedValue([
      { id: 'm1', senderUserId: 'd1', senderPersona: 'developer', text: 'old', sentAt: m1At },
      { id: 'm2', senderUserId: 'c1', senderPersona: 'company', text: 'new', sentAt: m2At },
    ]);
    prismaMock.chatMessage.count.mockResolvedValue(2);

    const result = await meService.getThreadMessages({
      userId: 'd1',
      persona: 'developer',
      threadId: 'th1',
      page: 1,
      size: 20,
    });

    expect(result.total).toBe(2);
    expect(result.items[0].read_at).toBe(readAt.toISOString());
    expect(result.items[1].read_at).toBeNull();
  });

  test('allows DISPUTE status and falls back to thread creation time when read marker is absent', async () => {
    const createdAt = new Date('2026-03-01T10:00:00Z');
    const m1At = new Date('2026-03-01T09:00:00Z');
    const m2At = new Date('2026-03-01T12:00:00Z');

    prismaMock.chatThread.findUnique.mockResolvedValue({
      id: 'th2',
      companyUserId: 'c1',
      developerUserId: 'd1',
      taskId: 't2',
      createdAt,
      task: { id: 't2', status: 'DISPUTE', deletedAt: null },
      reads: [],
    });
    prismaMock.chatMessage.findMany.mockResolvedValue([
      { id: 'm1', senderUserId: 'd1', senderPersona: 'developer', text: 'old', sentAt: m1At },
      { id: 'm2', senderUserId: 'c1', senderPersona: 'company', text: 'new', sentAt: m2At },
    ]);
    prismaMock.chatMessage.count.mockResolvedValue(2);

    const result = await meService.getThreadMessages({
      userId: 'd1',
      persona: 'developer',
      threadId: 'th2',
      page: 1,
      size: 20,
    });

    expect(result.items[0].read_at).toBe(createdAt.toISOString());
    expect(result.items[1].read_at).toBeNull();
  });
});
