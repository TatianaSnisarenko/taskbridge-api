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

const meService = await import('../../src/services/me/index.js');

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
  });

  describe('getThreadMessages', () => {
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
  });

  describe('createMessage', () => {
    test('rejects missing thread', async () => {
      prismaMock.chatThread.findUnique.mockResolvedValue(null);

      await expect(
        meService.createMessage({
          userId: 'd1',
          persona: 'developer',
          threadId: 'th1',
          text: ' Hello ',
        })
      ).rejects.toMatchObject({ status: 404, code: 'NOT_FOUND' });
    });

    test('creates message, updates thread and sends notification', async () => {
      const sentAt = new Date('2026-03-01T12:00:00Z');
      const realDate = Date;
      globalThis.Date = class extends Date {
        constructor(...args) {
          if (args.length === 0) {
            return sentAt;
          }
          return new realDate(...args);
        }
        static now() {
          return sentAt.getTime();
        }
      };

      prismaMock.chatThread.findUnique.mockResolvedValue({
        id: 'th1',
        taskId: 't1',
        companyUserId: 'c1',
        developerUserId: 'd1',
        task: { id: 't1', status: 'IN_PROGRESS', deletedAt: null },
      });

      prismaMock.$transaction.mockImplementation(async (callback) => {
        const tx = {
          chatMessage: {
            create: jest.fn().mockResolvedValue({
              id: 'm1',
              threadId: 'th1',
              senderUserId: 'd1',
              senderPersona: 'developer',
              text: 'Hello',
              sentAt,
            }),
          },
          chatThread: {
            update: jest.fn().mockResolvedValue({ id: 'th1' }),
          },
        };
        const result = await callback(tx);
        expect(tx.chatMessage.create).toHaveBeenCalled();
        expect(tx.chatThread.update).toHaveBeenCalledWith({
          where: { id: 'th1' },
          data: { lastMessageAt: sentAt },
        });
        return result;
      });

      const result = await meService.createMessage({
        userId: 'd1',
        persona: 'developer',
        threadId: 'th1',
        text: ' Hello ',
      });

      expect(createNotificationMock).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'c1',
          actorUserId: 'd1',
          taskId: 't1',
          type: 'CHAT_MESSAGE',
          payload: { thread_id: 'th1', task_id: 't1' },
        })
      );

      expect(result).toEqual({
        id: 'm1',
        thread_id: 'th1',
        sender_user_id: 'd1',
        sender_persona: 'developer',
        text: 'Hello',
        sent_at: sentAt.toISOString(),
        read_at: null,
      });

      globalThis.Date = realDate;
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
        meService.createMessage({
          userId: 'd1',
          persona: 'developer',
          threadId: 'th1',
          text: 'Hello',
        })
      ).rejects.toMatchObject({ status: 404, code: 'NOT_FOUND' });
    });

    test('rejects company persona when user is not company participant', async () => {
      prismaMock.chatThread.findUnique.mockResolvedValue({
        id: 'th1',
        taskId: 't1',
        companyUserId: 'c2',
        developerUserId: 'd1',
        task: { id: 't1', status: 'IN_PROGRESS', deletedAt: null },
      });

      await expect(
        meService.createMessage({
          userId: 'c1',
          persona: 'company',
          threadId: 'th1',
          text: 'Hello',
        })
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
        meService.createMessage({
          userId: 'd1',
          persona: 'developer',
          threadId: 'th1',
          text: 'Hello',
        })
      ).rejects.toMatchObject({ status: 403, code: 'FORBIDDEN' });
    });
  });

  describe('markThreadAsRead', () => {
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
      const realDate = Date;
      globalThis.Date = class extends Date {
        constructor(...args) {
          if (args.length === 0) {
            return readAt;
          }
          return new realDate(...args);
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

      globalThis.Date = realDate;
    });
  });
});
