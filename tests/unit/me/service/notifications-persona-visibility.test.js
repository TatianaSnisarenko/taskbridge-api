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

describe('me.service - notification persona visibility', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getMyNotifications', () => {
    test('keeps developer-authored REVIEW_CREATED for company persona', async () => {
      prismaMock.notification.findMany.mockResolvedValue([
        {
          id: 'n1',
          type: 'REVIEW_CREATED',
          actorUserId: 'u1',
          projectId: null,
          taskId: 't1',
          threadId: null,
          payload: { review_id: 'r1' },
          createdAt: new Date('2026-03-15T10:00:00Z'),
          readAt: null,
          task: { ownerUserId: 'c1', title: 'Task 1' },
          project: null,
          actor: {
            developerProfile: { userId: 'u1', displayName: 'Dev User' },
            companyProfile: null,
          },
        },
      ]);
      prismaMock.notification.count.mockResolvedValueOnce(1).mockResolvedValueOnce(1);

      const result = await meService.getMyNotifications({
        userId: 'c1',
        persona: 'company',
        page: 1,
        size: 20,
      });

      expect(result.items).toHaveLength(1);
      expect(result.items[0].type).toBe('REVIEW_CREATED');
    });

    test('filters developer-authored REVIEW_CREATED for task owner using developer persona', async () => {
      prismaMock.notification.findMany.mockResolvedValue([
        {
          id: 'n1',
          type: 'REVIEW_CREATED',
          actorUserId: 'u1',
          projectId: null,
          taskId: 't1',
          threadId: null,
          payload: { review_id: 'r1' },
          createdAt: new Date('2026-03-15T10:00:00Z'),
          readAt: null,
          task: { ownerUserId: 'c1', title: 'Task 1' },
          project: null,
          actor: {
            developerProfile: { userId: 'u1', displayName: 'Dev User' },
            companyProfile: null,
          },
        },
      ]);
      prismaMock.notification.count.mockResolvedValueOnce(1).mockResolvedValueOnce(1);

      const result = await meService.getMyNotifications({
        userId: 'c1',
        persona: 'developer',
        page: 1,
        size: 20,
      });

      expect(result.items).toHaveLength(0);
    });

    test('keeps company-authored REVIEW_CREATED for developer persona', async () => {
      prismaMock.notification.findMany.mockResolvedValue([
        {
          id: 'n1',
          type: 'REVIEW_CREATED',
          actorUserId: 'c1',
          projectId: null,
          taskId: 't1',
          threadId: null,
          payload: { review_id: 'r1' },
          createdAt: new Date('2026-03-15T10:00:00Z'),
          readAt: null,
          task: { ownerUserId: 'c1', title: 'Task 1' },
          project: null,
          actor: {
            developerProfile: null,
            companyProfile: { userId: 'c1', companyName: 'Acme' },
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

      expect(result.items).toHaveLength(1);
      expect(result.items[0].actor_name).toBe('Acme');
    });

    test('keeps COMPLETION_REQUESTED for company when current user owns the task', async () => {
      prismaMock.notification.findMany.mockResolvedValue([
        {
          id: 'n1',
          type: 'COMPLETION_REQUESTED',
          actorUserId: 'u1',
          projectId: null,
          taskId: 't1',
          threadId: null,
          payload: { task_id: 't1' },
          createdAt: new Date('2026-03-15T10:00:00Z'),
          readAt: null,
          task: { ownerUserId: 'c1', title: 'Task 1' },
          project: null,
          actor: {
            developerProfile: { userId: 'u1', displayName: 'Dev User' },
            companyProfile: null,
          },
        },
      ]);
      prismaMock.notification.count.mockResolvedValueOnce(1).mockResolvedValueOnce(1);

      const result = await meService.getMyNotifications({
        userId: 'c1',
        persona: 'company',
        page: 1,
        size: 20,
      });

      expect(result.items).toHaveLength(1);
      expect(result.items[0].type).toBe('COMPLETION_REQUESTED');
    });

    test('keeps TASK_COMPLETED for developer persona', async () => {
      prismaMock.notification.findMany.mockResolvedValue([
        {
          id: 'n1',
          type: 'TASK_COMPLETED',
          actorUserId: 'c1',
          projectId: null,
          taskId: 't1',
          threadId: null,
          payload: { task_id: 't1' },
          createdAt: new Date('2026-03-15T10:00:00Z'),
          readAt: null,
          task: { ownerUserId: 'c1', title: 'Task 1' },
          project: null,
          actor: {
            developerProfile: null,
            companyProfile: { userId: 'c1', companyName: 'Acme' },
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

      expect(result.items).toHaveLength(1);
      expect(result.items[0].type).toBe('TASK_COMPLETED');
    });
  });

  describe('markNotificationAsRead', () => {
    test('rejects developer-authored REVIEW_CREATED for task owner using developer persona', async () => {
      prismaMock.notification.findUnique.mockResolvedValue({
        id: 'n1',
        userId: 'c1',
        type: 'REVIEW_CREATED',
        readAt: null,
        createdAt: new Date('2026-03-15T10:00:00Z'),
        task: {
          ownerUserId: 'c1',
        },
        actor: {
          developerProfile: { userId: 'u1' },
          companyProfile: null,
        },
      });

      await expect(
        meService.markNotificationAsRead({
          userId: 'c1',
          notificationId: 'n1',
          persona: 'developer',
        })
      ).rejects.toMatchObject({
        status: 404,
        code: 'NOT_FOUND',
      });
    });

    test('marks TASK_COMPLETED as read for developer persona', async () => {
      const readAt = new Date('2026-03-15T12:00:00Z');

      prismaMock.notification.findUnique.mockResolvedValue({
        id: 'n2',
        userId: 'u1',
        type: 'TASK_COMPLETED',
        readAt: null,
        createdAt: new Date('2026-03-15T10:00:00Z'),
        task: {
          ownerUserId: 'c1',
        },
        actor: {
          developerProfile: null,
          companyProfile: { userId: 'c1' },
        },
      });

      prismaMock.notification.update.mockResolvedValue({
        id: 'n2',
        readAt,
      });

      const result = await meService.markNotificationAsRead({
        userId: 'u1',
        notificationId: 'n2',
        persona: 'developer',
      });

      expect(result).toEqual({
        id: 'n2',
        read_at: readAt.toISOString(),
      });
    });
  });
});
