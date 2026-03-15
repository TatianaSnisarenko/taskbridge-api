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

describe('me.service threads', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getThreadById', () => {
    test('rejects missing thread', async () => {
      prismaMock.chatThread.findUnique.mockResolvedValue(null);

      await expect(
        meService.getThreadById({ userId: 'u1', persona: 'developer', threadId: 'th1' })
      ).rejects.toMatchObject({ status: 404, code: 'NOT_FOUND' });
    });

    test('rejects when persona participant does not match', async () => {
      prismaMock.chatThread.findUnique.mockResolvedValue({
        id: 'th1',
        taskId: 't1',
        companyUserId: 'c1',
        developerUserId: 'd2',
        createdAt: new Date('2026-03-01T10:00:00Z'),
        task: { id: 't1', title: 'Task', status: 'IN_PROGRESS', deletedAt: null },
        messages: [],
        reads: [],
      });

      await expect(
        meService.getThreadById({ userId: 'd1', persona: 'developer', threadId: 'th1' })
      ).rejects.toMatchObject({ status: 403, code: 'FORBIDDEN' });
    });

    test('rejects deleted task thread', async () => {
      prismaMock.chatThread.findUnique.mockResolvedValue({
        id: 'th1',
        taskId: 't1',
        companyUserId: 'c1',
        developerUserId: 'd1',
        createdAt: new Date('2026-03-01T10:00:00Z'),
        task: { id: 't1', title: 'Task', status: 'IN_PROGRESS', deletedAt: new Date() },
        messages: [],
        reads: [],
      });

      await expect(
        meService.getThreadById({ userId: 'c1', persona: 'company', threadId: 'th1' })
      ).rejects.toMatchObject({ status: 404, code: 'NOT_FOUND' });
    });

    test('rejects company persona when user is not company participant', async () => {
      prismaMock.chatThread.findUnique.mockResolvedValue({
        id: 'th1',
        taskId: 't1',
        companyUserId: 'c2',
        developerUserId: 'd1',
        createdAt: new Date('2026-03-01T10:00:00Z'),
        task: { id: 't1', title: 'Task', status: 'IN_PROGRESS', deletedAt: null },
        messages: [],
        reads: [],
      });

      await expect(
        meService.getThreadById({ userId: 'c1', persona: 'company', threadId: 'th1' })
      ).rejects.toMatchObject({ status: 403, code: 'FORBIDDEN' });
    });

    test('rejects unsupported task status', async () => {
      prismaMock.chatThread.findUnique.mockResolvedValue({
        id: 'th1',
        taskId: 't1',
        companyUserId: 'c1',
        developerUserId: 'd1',
        createdAt: new Date('2026-03-01T10:00:00Z'),
        task: { id: 't1', title: 'Task', status: 'PUBLISHED', deletedAt: null },
        messages: [],
        reads: [],
      });

      await expect(
        meService.getThreadById({ userId: 'd1', persona: 'developer', threadId: 'th1' })
      ).rejects.toMatchObject({ status: 403, code: 'FORBIDDEN' });
    });

    test('returns thread details for company persona', async () => {
      const createdAt = new Date('2026-03-01T10:00:00Z');
      const sentAt = new Date('2026-03-01T12:00:00Z');

      prismaMock.chatThread.findUnique.mockResolvedValue({
        id: 'th1',
        taskId: 't1',
        companyUserId: 'c1',
        developerUserId: 'd1',
        createdAt,
        lastMessageAt: sentAt,
        task: { id: 't1', title: 'Task', status: 'COMPLETED', deletedAt: null },
        messages: [
          {
            id: 'm1',
            text: 'done',
            senderUserId: 'd1',
            senderPersona: 'developer',
            sentAt,
          },
        ],
        reads: [{ userId: 'c1', lastReadAt: new Date('2026-03-01T11:00:00Z') }],
      });
      prismaMock.developerProfile.findUnique.mockResolvedValue({
        userId: 'd1',
        displayName: 'Dev One',
        avatarUrl: 'https://cdn.example.com/dev.png',
      });
      prismaMock.companyProfile.findUnique.mockResolvedValue(null);

      const result = await meService.getThreadById({
        userId: 'c1',
        persona: 'company',
        threadId: 'th1',
      });

      expect(result.thread_id).toBe('th1');
      expect(result.other_participant).toEqual({
        user_id: 'd1',
        display_name: 'Dev One',
        company_name: null,
        avatar_url: 'https://cdn.example.com/dev.png',
      });
      expect(result.unread_count).toBe(1);
    });

    test('returns thread details for FAILED task status', async () => {
      const createdAt = new Date('2026-03-01T10:00:00Z');

      prismaMock.chatThread.findUnique.mockResolvedValue({
        id: 'th2',
        taskId: 't2',
        companyUserId: 'c1',
        developerUserId: 'd1',
        createdAt,
        lastMessageAt: null,
        task: { id: 't2', title: 'Failed Task', status: 'FAILED', deletedAt: null },
        messages: [],
        reads: [],
      });
      prismaMock.developerProfile.findUnique.mockResolvedValue({
        userId: 'd1',
        displayName: 'Dev One',
        avatarUrl: null,
      });
      prismaMock.companyProfile.findUnique.mockResolvedValue(null);

      const result = await meService.getThreadById({
        userId: 'c1',
        persona: 'company',
        threadId: 'th2',
      });

      expect(result.task.status).toBe('FAILED');
      expect(result.last_message).toBeNull();
      expect(result.unread_count).toBe(0);
    });
  });

  test('returns thread details for developer persona with company fallback and no messages', async () => {
    const createdAt = new Date('2026-03-01T10:00:00Z');

    prismaMock.chatThread.findUnique.mockResolvedValue({
      id: 'th2',
      taskId: 't2',
      companyUserId: 'c1',
      developerUserId: 'd1',
      createdAt,
      lastMessageAt: null,
      task: { id: 't2', title: 'QA pass', status: 'FAILED', deletedAt: null },
      messages: [],
      reads: [],
    });
    prismaMock.developerProfile.findUnique.mockResolvedValue(null);
    prismaMock.companyProfile.findUnique.mockResolvedValue({
      userId: 'c1',
      companyName: 'Fallback Corp',
      logoUrl: null,
    });

    const result = await meService.getThreadById({
      userId: 'd1',
      persona: 'developer',
      threadId: 'th2',
    });

    expect(result.other_participant).toEqual({
      user_id: 'c1',
      display_name: 'Fallback Corp',
      company_name: 'Fallback Corp',
      avatar_url: null,
    });
    expect(result.last_message).toBeNull();
    expect(result.unread_count).toBe(0);
  });
});
