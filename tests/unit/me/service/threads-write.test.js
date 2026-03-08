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
