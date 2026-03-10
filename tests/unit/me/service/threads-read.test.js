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

  describe('getMyThreads', () => {
    test('returns paginated threads with participant and unread count', async () => {
      const createdAt = new Date('2026-03-01T10:00:00Z');
      const sentAtNew = new Date('2026-03-01T12:00:00Z');
      const sentAtOld = new Date('2026-03-01T09:00:00Z');
      const readAt = new Date('2026-03-01T11:00:00Z');

      prismaMock.chatThread.findMany.mockResolvedValue([
        {
          id: 'th1',
          taskId: 't1',
          companyUserId: 'c1',
          developerUserId: 'd1',
          createdAt,
          lastMessageAt: sentAtNew,
          task: { id: 't1', title: 'Backend API', status: 'IN_PROGRESS' },
          messages: [
            {
              id: 'm2',
              text: 'Latest',
              senderUserId: 'c1',
              senderPersona: 'company',
              sentAt: sentAtNew,
            },
            {
              id: 'm1',
              text: 'Old',
              senderUserId: 'd1',
              senderPersona: 'developer',
              sentAt: sentAtOld,
            },
          ],
          reads: [{ userId: 'd1', lastReadAt: readAt }],
        },
      ]);
      prismaMock.chatThread.count.mockResolvedValue(1);
      prismaMock.developerProfile.findUnique.mockResolvedValue(null);
      prismaMock.companyProfile.findUnique.mockResolvedValue({
        userId: 'c1',
        companyName: 'Tech Corp',
        logoUrl: 'https://cdn.example.com/logo.png',
      });

      const result = await meService.getMyThreads({
        userId: 'd1',
        persona: 'developer',
        page: 1,
        size: 20,
      });

      expect(result.total).toBe(1);
      expect(result.items[0].thread_id).toBe('th1');
      expect(result.items[0].other_participant).toEqual({
        user_id: 'c1',
        display_name: 'Tech Corp',
        company_name: 'Tech Corp',
        avatar_url: 'https://cdn.example.com/logo.png',
      });
      expect(result.items[0].unread_count).toBe(1);
      expect(result.items[0].last_message.id).toBe('m2');
    });

    test('applies search filter to task title', async () => {
      prismaMock.chatThread.findMany.mockResolvedValue([]);
      prismaMock.chatThread.count.mockResolvedValue(0);

      await meService.getMyThreads({
        userId: 'c1',
        persona: 'company',
        page: 2,
        size: 10,
        search: '  API  ',
      });

      expect(prismaMock.chatThread.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            companyUserId: 'c1',
            task: expect.objectContaining({
              title: { contains: 'API', mode: 'insensitive' },
            }),
          }),
          skip: 10,
          take: 10,
        })
      );
    });

    test('uses allowed DISPUTE and FAILED statuses in thread list filters', async () => {
      prismaMock.chatThread.findMany.mockResolvedValue([]);
      prismaMock.chatThread.count.mockResolvedValue(0);

      await meService.getMyThreads({
        userId: 'd1',
        persona: 'developer',
        page: 1,
        size: 20,
      });

      expect(prismaMock.chatThread.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            developerUserId: 'd1',
            task: expect.objectContaining({
              status: {
                in: ['IN_PROGRESS', 'DISPUTE', 'COMPLETED', 'FAILED'],
              },
            }),
          }),
        })
      );

      expect(prismaMock.chatThread.count).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            developerUserId: 'd1',
            task: expect.objectContaining({
              status: {
                in: ['IN_PROGRESS', 'DISPUTE', 'COMPLETED', 'FAILED'],
              },
            }),
          }),
        })
      );
    });

    test('returns thread list item for FAILED task without messages using company fallback data', async () => {
      const createdAt = new Date('2026-03-01T10:00:00Z');

      prismaMock.chatThread.findMany.mockResolvedValue([
        {
          id: 'th2',
          taskId: 't2',
          companyUserId: 'c2',
          developerUserId: 'd1',
          createdAt,
          lastMessageAt: null,
          task: { id: 't2', title: 'Crashed Task', status: 'FAILED' },
          messages: [],
          reads: [],
        },
      ]);
      prismaMock.chatThread.count.mockResolvedValue(1);
      prismaMock.developerProfile.findUnique.mockResolvedValue(null);
      prismaMock.companyProfile.findUnique.mockResolvedValue({
        userId: 'c2',
        companyName: 'Fallback Corp',
        logoUrl: null,
      });

      const result = await meService.getMyThreads({
        userId: 'd1',
        persona: 'developer',
        page: 1,
        size: 20,
      });

      expect(result.items[0]).toEqual({
        thread_id: 'th2',
        task: {
          task_id: 't2',
          title: 'Crashed Task',
          status: 'FAILED',
        },
        other_participant: {
          user_id: 'c2',
          display_name: 'Fallback Corp',
          company_name: 'Fallback Corp',
          avatar_url: null,
        },
        last_message: null,
        unread_count: 0,
        created_at: createdAt.toISOString(),
      });
    });
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
});
