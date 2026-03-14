import { jest } from '@jest/globals';

const prismaMock = {
  developerProfile: {
    findUnique: jest.fn(),
  },
  task: {
    findMany: jest.fn(),
    count: jest.fn(),
  },
  project: {
    findMany: jest.fn(),
    count: jest.fn(),
  },
  application: {
    findMany: jest.fn(),
    count: jest.fn(),
  },
  notification: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    count: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
  },
};

jest.unstable_mockModule('../../src/db/prisma.js', () => ({ prisma: prismaMock }));

const meService = await import('../../../../src/services/me/index.js');

describe('me.service - notifications list/read', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getMyNotifications', () => {
    test('returns paginated notifications', async () => {
      const createdAt = new Date('2026-02-20T10:00:00Z');
      const readAt = new Date('2026-02-20T12:00:00Z');

      prismaMock.notification.findMany.mockResolvedValue([
        {
          id: 'n1',
          type: 'APPLICATION_ACCEPTED',
          actorUserId: 'u2',
          projectId: 'p1',
          taskId: 't1',
          threadId: null,
          payload: { message: 'Application accepted' },
          createdAt,
          readAt,
          task: { ownerUserId: 'c1', title: 'Build API endpoint' },
          project: { title: 'TeamUp Platform' },
          actor: {
            developerProfile: null,
            companyProfile: { userId: 'u2', companyName: 'NovaTech Labs' },
          },
        },
      ]);
      prismaMock.notification.count
        .mockResolvedValueOnce(1) // total count
        .mockResolvedValueOnce(3); // unread count

      const result = await meService.getMyNotifications({
        userId: 'u1',
        persona: 'developer',
        page: 1,
        size: 20,
      });

      expect(result.items).toHaveLength(1);
      expect(result.page).toBe(1);
      expect(result.size).toBe(20);
      expect(result.unread_total).toBe(3);
      expect(result.items[0]).toEqual({
        id: 'n1',
        type: 'APPLICATION_ACCEPTED',
        actor_user_id: 'u2',
        actor_name: 'NovaTech Labs',
        company_name: 'NovaTech Labs',
        project_id: 'p1',
        project_title: 'TeamUp Platform',
        task_id: 't1',
        task_title: 'Build API endpoint',
        thread_id: null,
        message: 'Application accepted',
        category: 'projects',
        target: {
          type: 'task',
          id: 't1',
          url: '/tasks/t1',
        },
        payload: { message: 'Application accepted' },
        created_at: createdAt.toISOString(),
        read_at: readAt.toISOString(),
      });
    });

    test('filters unread notifications when unreadOnly is true', async () => {
      prismaMock.notification.findMany.mockResolvedValue([]);
      prismaMock.notification.count.mockResolvedValueOnce(0).mockResolvedValueOnce(5);

      await meService.getMyNotifications({
        userId: 'u1',
        persona: 'developer',
        page: 1,
        size: 20,
        unreadOnly: true,
      });

      expect(prismaMock.notification.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            readAt: null,
          }),
        })
      );
    });

    test('handles null readAt correctly', async () => {
      const createdAt = new Date('2026-02-20T10:00:00Z');

      prismaMock.notification.findMany.mockResolvedValue([
        {
          id: 'n1',
          type: 'CHAT_MESSAGE',
          actorUserId: 'u2',
          projectId: null,
          taskId: null,
          threadId: 'th1',
          payload: {},
          createdAt,
          readAt: null,
          task: null,
          project: null,
          actor: {
            developerProfile: { userId: 'u2', displayName: 'Tetiana' },
            companyProfile: null,
          },
        },
      ]);
      prismaMock.notification.count.mockResolvedValueOnce(1).mockResolvedValueOnce(1);

      const result = await meService.getMyNotifications({
        userId: 'u1',
        persona: 'developer',
        page: 1,
        size: 20,
      });

      expect(result.items[0].read_at).toBeNull();
      expect(result.items[0].actor_name).toBe('Tetiana');
      expect(result.items[0].category).toBe('chat');
      expect(result.items[0].target).toEqual({
        type: 'thread',
        id: 'th1',
        url: '/chat/threads/th1',
      });
      expect(result.items[0].message).toBe('New chat message');
    });
  });

  describe('markNotificationAsRead', () => {
    test('rejects notification not found', async () => {
      prismaMock.notification.findUnique.mockResolvedValue(null);

      await expect(
        meService.markNotificationAsRead({
          userId: 'u1',
          notificationId: 'n1',
          persona: 'developer',
        })
      ).rejects.toMatchObject({
        status: 404,
        code: 'NOT_FOUND',
      });
    });

    test('rejects notification belonging to different user', async () => {
      prismaMock.notification.findUnique.mockResolvedValue({
        id: 'n1',
        userId: 'u2', // Different user
        type: 'APPLICATION_ACCEPTED',
        readAt: null,
        createdAt: new Date(),
        task: null,
        actor: {
          developerProfile: null,
          companyProfile: { userId: 'u2' },
        },
      });

      await expect(
        meService.markNotificationAsRead({
          userId: 'u1',
          notificationId: 'n1',
          persona: 'developer',
        })
      ).rejects.toMatchObject({
        status: 404,
        code: 'NOT_FOUND',
      });
    });

    test('rejects notification not relevant for persona (developer viewing company notification)', async () => {
      prismaMock.notification.findUnique.mockResolvedValue({
        id: 'n1',
        userId: 'u1',
        type: 'APPLICATION_CREATED', // Company notification
        readAt: null,
        createdAt: new Date(),
        task: {
          ownerUserId: 'u1',
        },
        actor: {
          developerProfile: { userId: 'u2' },
          companyProfile: null,
        },
      });

      await expect(
        meService.markNotificationAsRead({
          userId: 'u1',
          notificationId: 'n1',
          persona: 'developer', // Wrong persona
        })
      ).rejects.toMatchObject({
        status: 404,
        code: 'NOT_FOUND',
      });
    });

    test('marks notification as read for developer persona', async () => {
      const createdAt = new Date('2026-02-20T10:00:00Z');
      const readAt = new Date('2026-02-20T12:00:00Z');

      prismaMock.notification.findUnique.mockResolvedValue({
        id: 'n1',
        userId: 'u1',
        type: 'APPLICATION_ACCEPTED',
        readAt: null,
        createdAt,
        task: null,
        actor: {
          developerProfile: null,
          companyProfile: { userId: 'u2' },
        },
      });

      prismaMock.notification.update.mockResolvedValue({
        id: 'n1',
        readAt,
      });

      const result = await meService.markNotificationAsRead({
        userId: 'u1',
        notificationId: 'n1',
        persona: 'developer',
      });

      expect(prismaMock.notification.update).toHaveBeenCalledWith({
        where: { id: 'n1' },
        data: { readAt: expect.any(Date) },
        select: {
          id: true,
          readAt: true,
        },
      });

      expect(result).toEqual({
        id: 'n1',
        read_at: readAt.toISOString(),
      });
    });

    test('marks notification as read for company persona', async () => {
      const createdAt = new Date('2026-02-20T10:00:00Z');
      const readAt = new Date('2026-02-20T12:00:00Z');

      prismaMock.notification.findUnique.mockResolvedValue({
        id: 'n2',
        userId: 'c1',
        type: 'APPLICATION_CREATED',
        readAt: null,
        createdAt,
        task: {
          ownerUserId: 'c1',
        },
        actor: {
          developerProfile: { userId: 'u1' },
          companyProfile: null,
        },
      });

      prismaMock.notification.update.mockResolvedValue({
        id: 'n2',
        readAt,
      });

      const result = await meService.markNotificationAsRead({
        userId: 'c1',
        notificationId: 'n2',
        persona: 'company',
      });

      expect(result).toEqual({
        id: 'n2',
        read_at: readAt.toISOString(),
      });
    });
  });
});
