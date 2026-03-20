import { meService, prismaMock, resetMeServiceMocks } from './notifications-test-setup.js';

describe('me.service - notifications list/read', () => {
  beforeEach(() => {
    resetMeServiceMocks();
  });

  describe('getMyNotifications (actor role/name)', () => {
    test('uses developer actor_name for APPLICATION_CREATED even when actor has both profiles', async () => {
      const createdAt = new Date('2026-02-20T10:00:00Z');

      prismaMock.notification.findMany.mockResolvedValue([
        {
          id: 'n1',
          type: 'APPLICATION_CREATED',
          actorUserId: 'u2',
          projectId: null,
          taskId: 't1',
          threadId: null,
          payload: {},
          createdAt,
          readAt: null,
          task: { ownerUserId: 'c1', title: 'Build API endpoint' },
          project: null,
          actor: {
            developerProfile: { userId: 'u2', displayName: 'Tetiana Dev' },
            companyProfile: { userId: 'u2', companyName: 'Tetiana Studio' },
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

      expect(result.items[0].actor_role).toBe('developer');
      expect(result.items[0].actor_name).toBe('Tetiana Dev');
      expect(result.items[0].developer_name).toBe('Tetiana Dev');
      expect(result.items[0].company_name).toBe('Tetiana Studio');
    });

    test('handles CHAT_MESSAGE without task context (fallback branch)', async () => {
      const createdAt = new Date('2026-02-20T10:00:00Z');

      prismaMock.notification.findMany.mockResolvedValue([
        {
          id: 'n1',
          type: 'CHAT_MESSAGE',
          actorUserId: 'u1',
          projectId: null,
          taskId: null,
          threadId: 'th1',
          payload: { thread_id: 'th1' },
          createdAt,
          readAt: null,
          importantAt: null,
          task: null,
          project: null,
          actor: {
            developerProfile: {
              userId: 'u1',
              displayName: 'John Dev',
            },
            companyProfile: null,
          },
        },
      ]);

      prismaMock.notification.count.mockResolvedValue(1);

      const result = await meService.getMyNotifications({
        userId: 'u2',
        persona: 'developer',
        page: 1,
        size: 20,
      });

      expect(result.items[0].actor_role).toBe('developer');
      expect(result.items[0].actor_name).toBe('John Dev');
    });

    test('handles COMPLETION_REQUESTED from company (developer as recipient)', async () => {
      const createdAt = new Date('2026-02-20T10:00:00Z');

      prismaMock.notification.findMany.mockResolvedValue([
        {
          id: 'n1',
          type: 'COMPLETION_REQUESTED',
          actorUserId: 'c1',
          projectId: 'p1',
          taskId: 't1',
          threadId: null,
          payload: {},
          createdAt,
          readAt: null,
          importantAt: null,
          task: {
            ownerUserId: 'c1',
            title: 'Build API',
          },
          project: null,
          actor: {
            developerProfile: null,
            companyProfile: {
              userId: 'c1',
              companyName: 'Tech Corp',
            },
          },
        },
      ]);

      prismaMock.notification.count.mockResolvedValue(1);

      const result = await meService.getMyNotifications({
        userId: 'd1',
        persona: 'developer',
        page: 1,
        size: 20,
      });

      expect(result.items[0].actor_role).toBe('company');
      expect(result.items[0].actor_name).toBe('Tech Corp');
    });

    test('handles COMPLETION_REQUESTED from developer (company as recipient)', async () => {
      const createdAt = new Date('2026-02-20T10:00:00Z');

      prismaMock.notification.findMany.mockResolvedValue([
        {
          id: 'n1',
          type: 'COMPLETION_REQUESTED',
          actorUserId: 'd1',
          projectId: 'p1',
          taskId: 't1',
          threadId: null,
          payload: {},
          createdAt,
          readAt: null,
          importantAt: null,
          task: {
            ownerUserId: 'c1',
            title: 'Build API',
          },
          project: null,
          actor: {
            developerProfile: {
              userId: 'd1',
              displayName: 'Alice Dev',
            },
            companyProfile: null,
          },
        },
      ]);

      prismaMock.notification.count.mockResolvedValue(1);

      const result = await meService.getMyNotifications({
        userId: 'c1',
        persona: 'company',
        page: 1,
        size: 20,
      });

      expect(result.items[0].actor_role).toBe('developer');
      expect(result.items[0].actor_name).toBe('Alice Dev');
    });

    test('handles TASK_DISPUTE_OPENED when company escalates', async () => {
      const createdAt = new Date('2026-02-20T10:00:00Z');

      prismaMock.notification.findMany.mockResolvedValue([
        {
          id: 'n1',
          type: 'TASK_DISPUTE_OPENED',
          actorUserId: 'c1',
          projectId: 'p1',
          taskId: 't1',
          threadId: null,
          payload: {},
          createdAt,
          readAt: null,
          importantAt: null,
          task: {
            ownerUserId: 'c1',
            title: 'Build API',
          },
          project: null,
          actor: {
            developerProfile: null,
            companyProfile: {
              userId: 'c1',
              companyName: 'Tech Corp',
            },
          },
        },
      ]);

      prismaMock.notification.count.mockResolvedValue(1);

      const result = await meService.getMyNotifications({
        userId: 'd1',
        persona: 'developer',
        page: 1,
        size: 20,
      });

      expect(result.items[0].actor_role).toBe('company');
      expect(result.items[0].message).toBe('Task dispute opened: Build API');
    });

    test('handles TASK_DISPUTE_OPENED when developer escalates', async () => {
      const createdAt = new Date('2026-02-20T10:00:00Z');

      prismaMock.notification.findMany.mockResolvedValue([
        {
          id: 'n1',
          type: 'TASK_DISPUTE_OPENED',
          actorUserId: 'd1',
          projectId: 'p1',
          taskId: 't1',
          threadId: null,
          payload: {},
          createdAt,
          readAt: null,
          importantAt: null,
          task: {
            ownerUserId: 'c1',
            title: 'Build API',
          },
          project: null,
          actor: {
            developerProfile: {
              userId: 'd1',
              displayName: 'Alice Dev',
            },
            companyProfile: null,
          },
        },
      ]);

      prismaMock.notification.count.mockResolvedValue(1);

      const result = await meService.getMyNotifications({
        userId: 'c1',
        persona: 'company',
        page: 1,
        size: 20,
      });

      expect(result.items[0].actor_role).toBe('developer');
      expect(result.items[0].actor_name).toBe('Alice Dev');
    });

    test('handles unknown type with actor fallback profile', async () => {
      const createdAt = new Date('2026-02-20T10:00:00Z');

      prismaMock.notification.findMany.mockResolvedValue([
        {
          id: 'n1',
          type: 'UNKNOWN_TYPE',
          actorUserId: 'd1',
          projectId: null,
          taskId: null,
          threadId: null,
          payload: {},
          createdAt,
          readAt: null,
          importantAt: null,
          task: null,
          project: null,
          actor: {
            developerProfile: {
              userId: 'd1',
              displayName: 'Fallback Dev',
            },
            companyProfile: null,
          },
        },
      ]);

      prismaMock.notification.count.mockResolvedValue(1);

      const result = await meService.getMyNotifications({
        userId: 'd2',
        persona: 'developer',
        page: 1,
        size: 20,
      });

      expect(result.items[0].actor_role).toBe('developer');
      expect(result.items[0].actor_name).toBe('Fallback Dev');
      expect(result.items[0].message).toBe('Notification');
    });

    test('handles PROJECT_ARCHIVED_LIMIT_REACHED (system notification)', async () => {
      const createdAt = new Date('2026-02-20T10:00:00Z');

      prismaMock.notification.findMany.mockResolvedValue([
        {
          id: 'n1',
          type: 'PROJECT_ARCHIVED_LIMIT_REACHED',
          actorUserId: null,
          projectId: 'p1',
          taskId: null,
          threadId: null,
          payload: {
            project_id: 'p1',
            project_title: 'Web Platform',
            max_talents: 5,
            completed_count: 5,
          },
          createdAt,
          readAt: null,
          importantAt: null,
          task: null,
          project: {
            title: 'Web Platform',
          },
          actor: null,
        },
      ]);

      prismaMock.notification.count.mockResolvedValue(1);

      const result = await meService.getMyNotifications({
        userId: 'c1',
        persona: 'company',
        page: 1,
        size: 20,
      });

      expect(result.items[0].actor_role).toBeNull();
      expect(result.items[0].actor_name).toBe('Unknown');
      expect(result.items[0].message).toBe(
        'Project archived after reaching max talents: Web Platform'
      );
    });

    test('handles REVIEW_CREATED with actor without profiles (edge case)', async () => {
      const createdAt = new Date('2026-02-20T10:00:00Z');

      prismaMock.notification.findMany.mockResolvedValue([
        {
          id: 'n1',
          type: 'REVIEW_CREATED',
          actorUserId: 'u2',
          projectId: null,
          taskId: 't1',
          threadId: null,
          payload: {},
          createdAt,
          readAt: null,
          importantAt: null,
          task: {
            ownerUserId: 'c1',
            title: 'Code Review',
          },
          project: null,
          actor: {
            developerProfile: null,
            companyProfile: null,
          },
        },
      ]);

      prismaMock.notification.count.mockResolvedValue(1);

      const result = await meService.getMyNotifications({
        userId: 'd1',
        persona: 'developer',
        page: 1,
        size: 20,
      });

      expect(result.items[0].actor_role).toBeNull();
      expect(result.items[0].actor_name).toBe('Unknown');
      expect(result.items[0].message).toBe('New review received');
    });
  });
});
