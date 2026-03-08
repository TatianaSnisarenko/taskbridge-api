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

describe('me.service - notifications markAll core', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('markAllNotificationsAsRead', () => {
    test('marks all relevant notifications as read for developer', async () => {
      prismaMock.notification.findMany.mockResolvedValue([
        {
          id: 'n1',
          type: 'APPLICATION_ACCEPTED',
          task: null,
          actor: {
            developerProfile: null,
            companyProfile: { userId: 'c1' },
          },
        },
        {
          id: 'n2',
          type: 'APPLICATION_REJECTED',
          task: null,
          actor: {
            developerProfile: null,
            companyProfile: { userId: 'c1' },
          },
        },
        {
          id: 'n3',
          type: 'APPLICATION_CREATED', // Company notification - should be filtered out
          task: {
            ownerUserId: 'c1',
          },
          actor: {
            developerProfile: { userId: 'u1' },
            companyProfile: null,
          },
        },
      ]);

      prismaMock.notification.updateMany.mockResolvedValue({ count: 2 });

      const result = await meService.markAllNotificationsAsRead({
        userId: 'u1',
        persona: 'developer',
      });

      expect(prismaMock.notification.findMany).toHaveBeenCalledWith({
        where: {
          userId: 'u1',
          readAt: null,
        },
        select: {
          id: true,
          type: true,
          task: {
            select: {
              ownerUserId: true,
            },
          },
          actor: {
            select: {
              developerProfile: { select: { userId: true } },
              companyProfile: { select: { userId: true } },
            },
          },
        },
      });

      expect(prismaMock.notification.updateMany).toHaveBeenCalledWith({
        where: {
          id: { in: ['n1', 'n2'] }, // Only developer-relevant notifications
        },
        data: {
          readAt: expect.any(Date),
        },
      });

      expect(result.updated).toBe(true);
      expect(result.read_at).toBeDefined();
    });

    test('marks all relevant notifications as read for company', async () => {
      prismaMock.notification.findMany.mockResolvedValue([
        {
          id: 'n1',
          type: 'APPLICATION_CREATED',
          task: {
            ownerUserId: 'c1',
          },
          actor: {
            developerProfile: { userId: 'u1' },
            companyProfile: null,
          },
        },
        {
          id: 'n2',
          type: 'TASK_COMPLETED',
          task: {
            ownerUserId: 'c1',
          },
          actor: {
            developerProfile: { userId: 'u1' },
            companyProfile: null,
          },
        },
        {
          id: 'n3',
          type: 'APPLICATION_ACCEPTED', // Developer notification - should be filtered out
          task: null,
          actor: {
            developerProfile: null,
            companyProfile: { userId: 'c1' },
          },
        },
      ]);

      prismaMock.notification.updateMany.mockResolvedValue({ count: 2 });

      await meService.markAllNotificationsAsRead({
        userId: 'c1',
        persona: 'company',
      });

      expect(prismaMock.notification.updateMany).toHaveBeenCalledWith({
        where: {
          id: { in: ['n1', 'n2'] }, // Only company-relevant notifications
        },
        data: {
          readAt: expect.any(Date),
        },
      });
    });

    test('handles no unread notifications', async () => {
      prismaMock.notification.findMany.mockResolvedValue([]);
      prismaMock.notification.updateMany.mockResolvedValue({ count: 0 });

      const result = await meService.markAllNotificationsAsRead({
        userId: 'u1',
        persona: 'developer',
      });

      expect(prismaMock.notification.updateMany).not.toHaveBeenCalled();
      expect(result.updated).toBe(true);
    });

    test('handles CHAT_MESSAGE notifications (visible to both personas)', async () => {
      prismaMock.notification.findMany.mockResolvedValue([
        {
          id: 'n1',
          type: 'CHAT_MESSAGE',
          task: null,
          actor: {
            developerProfile: null,
            companyProfile: { userId: 'c1' },
          },
        },
      ]);

      prismaMock.notification.updateMany.mockResolvedValue({ count: 1 });

      await meService.markAllNotificationsAsRead({
        userId: 'u1',
        persona: 'developer',
      });

      expect(prismaMock.notification.updateMany).toHaveBeenCalledWith({
        where: {
          id: { in: ['n1'] }, // CHAT_MESSAGE is relevant for both personas
        },
        data: {
          readAt: expect.any(Date),
        },
      });
    });
  });
});
