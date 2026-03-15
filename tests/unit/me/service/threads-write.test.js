import { jest } from '@jest/globals';
const createNotificationMock = jest.fn();
const cloudinaryMock = {
  uploadImage: jest.fn(),
  deleteImage: jest.fn(),
  uploadFile: jest.fn(),
  deleteFile: jest.fn(),
};

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
jest.unstable_mockModule('../../src/utils/cloudinary.js', () => cloudinaryMock);

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
              attachments: [],
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
        attachments: [],
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

    test('allows DISPUTE status for company participant', async () => {
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
        id: 'th2',
        taskId: 't2',
        companyUserId: 'c1',
        developerUserId: 'd1',
        task: { id: 't2', status: 'DISPUTE', deletedAt: null },
      });

      prismaMock.$transaction.mockImplementation(async (callback) => {
        const tx = {
          chatMessage: {
            create: jest.fn().mockResolvedValue({
              id: 'm2',
              threadId: 'th2',
              senderUserId: 'c1',
              senderPersona: 'company',
              text: 'Need to discuss',
              sentAt,
              attachments: [],
            }),
          },
          chatThread: {
            update: jest.fn().mockResolvedValue({ id: 'th2' }),
          },
        };

        return callback(tx);
      });

      const result = await meService.createMessage({
        userId: 'c1',
        persona: 'company',
        threadId: 'th2',
        text: ' Need to discuss ',
      });

      expect(createNotificationMock).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'd1',
          actorUserId: 'c1',
          taskId: 't2',
        })
      );
      expect(result.sender_persona).toBe('company');
      expect(result.text).toBe('Need to discuss');

      globalThis.Date = realDate;
    });

    test('allows FAILED status for developer participant', async () => {
      const sentAt = new Date('2026-03-01T15:00:00Z');
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
        id: 'th3',
        taskId: 't3',
        companyUserId: 'c1',
        developerUserId: 'd1',
        task: { id: 't3', status: 'FAILED', deletedAt: null },
      });

      prismaMock.$transaction.mockImplementation(async (callback) => {
        const tx = {
          chatMessage: {
            create: jest.fn().mockResolvedValue({
              id: 'm3',
              threadId: 'th3',
              senderUserId: 'd1',
              senderPersona: 'developer',
              text: 'Final note',
              sentAt,
              attachments: [],
            }),
          },
          chatThread: {
            update: jest.fn().mockResolvedValue({ id: 'th3' }),
          },
        };

        return callback(tx);
      });

      const result = await meService.createMessage({
        userId: 'd1',
        persona: 'developer',
        threadId: 'th3',
        text: ' Final note ',
      });

      expect(result.thread_id).toBe('th3');
      expect(result.text).toBe('Final note');

      globalThis.Date = realDate;
    });
  });
});
