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
    findMany: jest.fn(),
  },
  companyProfile: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
  },
};

jest.unstable_mockModule('../../src/db/prisma.js', () => ({ prisma: prismaMock }));
jest.unstable_mockModule('../../src/services/notifications/index.js', () => ({
  createNotification: createNotificationMock,
}));

const meService = await import('../../../../src/services/me/index.js');

describe('me.service threads - getMyThreads', () => {
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
      prismaMock.developerProfile.findMany.mockResolvedValue([]);
      prismaMock.companyProfile.findMany.mockResolvedValue([
        {
          userId: 'c1',
          companyName: 'Tech Corp',
          logoUrl: 'https://cdn.example.com/logo.png',
        },
      ]);

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
      expect(prismaMock.developerProfile.findMany).toHaveBeenCalled();
      expect(prismaMock.companyProfile.findMany).toHaveBeenCalled();
      expect(prismaMock.developerProfile.findUnique).not.toHaveBeenCalled();
      expect(prismaMock.companyProfile.findUnique).not.toHaveBeenCalled();
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

    test('filters threads by important_only marker for current user', async () => {
      prismaMock.chatThread.findMany.mockResolvedValue([]);
      prismaMock.chatThread.count.mockResolvedValue(0);

      await meService.getMyThreads({
        userId: 'd1',
        persona: 'developer',
        page: 1,
        size: 20,
        importantOnly: true,
      });

      expect(prismaMock.chatThread.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            developerUserId: 'd1',
            reads: {
              some: {
                userId: 'd1',
                importantAt: { not: null },
              },
            },
          }),
        })
      );

      expect(prismaMock.chatThread.count).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            developerUserId: 'd1',
            reads: {
              some: {
                userId: 'd1',
                importantAt: { not: null },
              },
            },
          }),
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
      prismaMock.developerProfile.findMany.mockResolvedValue([]);
      prismaMock.companyProfile.findMany.mockResolvedValue([
        {
          userId: 'c2',
          companyName: 'Fallback Corp',
          logoUrl: null,
        },
      ]);

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
        important_at: null,
        created_at: createdAt.toISOString(),
      });
    });

    test('returns company thread list item using developer profile data', async () => {
      const createdAt = new Date('2026-03-01T10:00:00Z');

      prismaMock.chatThread.findMany.mockResolvedValue([
        {
          id: 'th3',
          taskId: 't3',
          companyUserId: 'c1',
          developerUserId: 'd9',
          createdAt,
          lastMessageAt: null,
          task: { id: 't3', title: 'Frontend polish', status: 'COMPLETED' },
          messages: [],
          reads: [],
        },
      ]);
      prismaMock.chatThread.count.mockResolvedValue(1);
      prismaMock.developerProfile.findMany.mockResolvedValue([
        {
          userId: 'd9',
          displayName: 'Dev Nine',
          avatarUrl: 'https://cdn.example.com/dev-nine.png',
        },
      ]);
      prismaMock.companyProfile.findMany.mockResolvedValue([]);

      const result = await meService.getMyThreads({
        userId: 'c1',
        persona: 'company',
        page: 1,
        size: 20,
      });

      expect(result.items[0].other_participant).toEqual({
        user_id: 'd9',
        display_name: 'Dev Nine',
        company_name: null,
        avatar_url: 'https://cdn.example.com/dev-nine.png',
      });
    });
  });
});
