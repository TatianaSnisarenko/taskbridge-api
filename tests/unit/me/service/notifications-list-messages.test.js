import { meService, prismaMock, resetMeServiceMocks } from './notifications-test-setup.js';

describe('me.service - notifications list/read', () => {
  beforeEach(() => {
    resetMeServiceMocks();
  });

  describe('getMyNotifications (messages and targets)', () => {
    test('maps company-facing notification messages, categories, and targets', async () => {
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
            developerProfile: { userId: 'u2', displayName: 'Tetiana' },
            companyProfile: null,
          },
        },
        {
          id: 'n2',
          type: 'REVIEW_CREATED',
          actorUserId: 'u2',
          projectId: null,
          taskId: null,
          threadId: null,
          payload: {},
          createdAt,
          readAt: null,
          task: { ownerUserId: 'c1', title: 'Build API endpoint' },
          project: null,
          actor: {
            developerProfile: { userId: 'u2', displayName: 'Tetiana' },
            companyProfile: null,
          },
        },
        {
          id: 'n3',
          type: 'TASK_INVITE_ACCEPTED',
          actorUserId: 'u2',
          projectId: null,
          taskId: 't2',
          threadId: null,
          payload: {},
          createdAt,
          readAt: null,
          task: { ownerUserId: 'c1', title: 'New Landing Page' },
          project: null,
          actor: {
            developerProfile: { userId: 'u2', displayName: 'Tetiana' },
            companyProfile: null,
          },
        },
        {
          id: 'n4',
          type: 'TASK_INVITE_DECLINED',
          actorUserId: 'u2',
          projectId: 'p1',
          taskId: 't3',
          threadId: null,
          payload: {},
          createdAt,
          readAt: null,
          task: { ownerUserId: 'c1', title: 'Mobile App' },
          project: { title: 'TeamUp Platform' },
          actor: {
            developerProfile: { userId: 'u2', displayName: 'Tetiana' },
            companyProfile: null,
          },
        },
      ]);
      prismaMock.notification.count.mockResolvedValueOnce(4).mockResolvedValueOnce(4);

      const result = await meService.getMyNotifications({
        userId: 'c1',
        persona: 'company',
        page: 1,
        size: 20,
      });

      expect(result.items.map((item) => item.message)).toEqual([
        'New application received: Build API endpoint',
        'New review received',
        'Task invite accepted: New Landing Page',
        'Task invite declined: Mobile App',
      ]);
      expect(result.items[1].category).toBe('reviews');
      expect(result.items[1].target).toBeNull();
      expect(result.items[2].target).toEqual({
        type: 'task',
        id: 't2',
        url: '/tasks/t2',
      });
    });

    test('maps developer-facing fallback messages and project targets', async () => {
      const createdAt = new Date('2026-02-20T10:00:00Z');

      prismaMock.notification.findMany.mockResolvedValue([
        {
          id: 'n1',
          type: 'APPLICATION_REJECTED',
          actorUserId: 'c1',
          projectId: null,
          taskId: 't1',
          threadId: null,
          payload: {},
          createdAt,
          readAt: null,
          task: { ownerUserId: 'c1', title: 'Backend API' },
          project: null,
          actor: {
            developerProfile: null,
            companyProfile: { userId: 'c1', companyName: 'NovaTech Labs' },
          },
        },
        {
          id: 'n2',
          type: 'COMPLETION_REQUESTED',
          actorUserId: 'c1',
          projectId: null,
          taskId: 't2',
          threadId: null,
          payload: {},
          createdAt,
          readAt: null,
          task: { ownerUserId: 'c1', title: 'Finalize release' },
          project: null,
          actor: {
            developerProfile: null,
            companyProfile: { userId: 'c1', companyName: 'NovaTech Labs' },
          },
        },
        {
          id: 'n3',
          type: 'TASK_DISPUTE_OPENED',
          actorUserId: 'c1',
          projectId: null,
          taskId: 't3',
          threadId: null,
          payload: {},
          createdAt,
          readAt: null,
          task: { ownerUserId: 'c1', title: 'Bug fixing' },
          project: null,
          actor: {
            developerProfile: null,
            companyProfile: { userId: 'c1', companyName: 'NovaTech Labs' },
          },
        },
        {
          id: 'n4',
          type: 'TASK_COMPLETED',
          actorUserId: 'c1',
          projectId: null,
          taskId: 't4',
          threadId: null,
          payload: {},
          createdAt,
          readAt: null,
          task: { ownerUserId: 'c1', title: 'Deploy API' },
          project: null,
          actor: {
            developerProfile: null,
            companyProfile: { userId: 'c1', companyName: 'NovaTech Labs' },
          },
        },
        {
          id: 'n5',
          type: 'TASK_INVITE_CREATED',
          actorUserId: 'c1',
          projectId: null,
          taskId: 't5',
          threadId: null,
          payload: {},
          createdAt,
          readAt: null,
          task: { ownerUserId: 'c1', title: 'Design system' },
          project: null,
          actor: {
            developerProfile: null,
            companyProfile: { userId: 'c1', companyName: 'NovaTech Labs' },
          },
        },
        {
          id: 'n6',
          type: 'TASK_INVITE_CANCELLED',
          actorUserId: 'c1',
          projectId: null,
          taskId: 't6',
          threadId: null,
          payload: {},
          createdAt,
          readAt: null,
          task: { ownerUserId: 'c1', title: 'Analytics dashboard' },
          project: null,
          actor: {
            developerProfile: null,
            companyProfile: { userId: 'c1', companyName: 'NovaTech Labs' },
          },
        },
        {
          id: 'n7',
          type: 'UNKNOWN_TYPE',
          actorUserId: 'c1',
          projectId: 'p1',
          taskId: null,
          threadId: null,
          payload: {},
          createdAt,
          readAt: null,
          task: null,
          project: { title: 'TeamUp Platform' },
          actor: {
            developerProfile: null,
            companyProfile: { userId: 'c1', companyName: 'NovaTech Labs' },
          },
        },
      ]);
      prismaMock.notification.count.mockResolvedValueOnce(7).mockResolvedValueOnce(7);

      const result = await meService.getMyNotifications({
        userId: 'u1',
        persona: 'developer',
        page: 1,
        size: 20,
      });

      expect(result.items.map((item) => item.message)).toEqual([
        'Your application was rejected: Backend API',
        'Task completion update: Finalize release',
        'Task dispute opened: Bug fixing',
        'Task status updated: Deploy API',
        'New task invite: Design system',
        'Task invite cancelled: Analytics dashboard',
        'Notification: TeamUp Platform',
      ]);
      expect(result.items[6].target).toEqual({
        type: 'project',
        id: 'p1',
        url: '/projects/p1',
      });
      expect(result.items[6].category).toBe('projects');
    });
  });
});
