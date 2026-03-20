import { meService, prismaMock, resetMeServiceMocks } from './notifications-test-setup.js';

describe('me.service - notifications list/read', () => {
  beforeEach(() => {
    resetMeServiceMocks();
  });

  describe('getMyNotifications (core)', () => {
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
      prismaMock.notification.count.mockResolvedValueOnce(1).mockResolvedValueOnce(3);

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
        actor_role: 'company',
        actor_name: 'NovaTech Labs',
        developer_name: null,
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
        important_at: null,
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
      expect(result.items[0].actor_role).toBe('developer');
      expect(result.items[0].developer_name).toBe('Tetiana');
      expect(result.items[0].category).toBe('chat');
      expect(result.items[0].target).toEqual({
        type: 'thread',
        id: 'th1',
        url: '/chat/threads/th1',
      });
      expect(result.items[0].message).toBe('New chat message');
    });
  });
});
