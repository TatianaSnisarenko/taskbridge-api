import { jest } from '@jest/globals';

const prismaMock = {
  notification: {
    findUnique: jest.fn(),
    update: jest.fn(),
  },
};

jest.unstable_mockModule('../../src/db/prisma.js', () => ({ prisma: prismaMock }));

const meService = await import('../../../../src/services/me/index.js');

describe('me.service - mark notification read/unread', () => {
  beforeEach(() => {
    jest.clearAllMocks();
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

  describe('markNotificationAsUnread', () => {
    test('rejects notification not found', async () => {
      prismaMock.notification.findUnique.mockResolvedValue(null);

      await expect(
        meService.markNotificationAsUnread({
          userId: 'u1',
          notificationId: 'n1',
          persona: 'developer',
        })
      ).rejects.toMatchObject({
        status: 404,
        code: 'NOT_FOUND',
      });
    });

    test('marks notification as unread and returns null read_at', async () => {
      prismaMock.notification.findUnique.mockResolvedValue({
        id: 'n1',
        userId: 'u1',
        type: 'APPLICATION_ACCEPTED',
        readAt: new Date('2026-02-20T12:00:00Z'),
        createdAt: new Date('2026-02-20T10:00:00Z'),
        task: null,
        actor: {
          developerProfile: null,
          companyProfile: { userId: 'u2' },
        },
      });

      prismaMock.notification.update.mockResolvedValue({
        id: 'n1',
        readAt: null,
      });

      const result = await meService.markNotificationAsUnread({
        userId: 'u1',
        notificationId: 'n1',
        persona: 'developer',
      });

      expect(prismaMock.notification.update).toHaveBeenCalledWith({
        where: { id: 'n1' },
        data: { readAt: null },
        select: {
          id: true,
          readAt: true,
        },
      });

      expect(result).toEqual({
        id: 'n1',
        read_at: null,
      });
    });
  });
});
