import { jest } from '@jest/globals';

const prismaMock = {
  notification: {
    findMany: jest.fn(),
    count: jest.fn(),
  },
};

jest.unstable_mockModule('../../src/db/prisma.js', () => ({ prisma: prismaMock }));

const meService = await import('../../../../src/services/me/index.js');

describe('me.service - deletion notifications', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('maps task and project deletion notifications for developers', async () => {
    const createdAt = new Date('2026-03-18T10:00:00Z');

    prismaMock.notification.findMany.mockResolvedValue([
      {
        id: 'n1',
        type: 'TASK_DELETED',
        actorUserId: 'c1',
        projectId: 'p1',
        taskId: 't1',
        threadId: null,
        payload: {
          task_id: 't1',
          project_id: 'p1',
        },
        createdAt,
        readAt: null,
        importantAt: null,
        task: { ownerUserId: 'c1', title: 'Legacy API' },
        project: { title: 'Platform' },
        actor: {
          developerProfile: null,
          companyProfile: { userId: 'c1', companyName: 'NovaTech Labs' },
        },
      },
      {
        id: 'n2',
        type: 'PROJECT_DELETED',
        actorUserId: 'c1',
        projectId: 'p2',
        taskId: null,
        threadId: null,
        payload: {
          project_id: 'p2',
        },
        createdAt,
        readAt: null,
        importantAt: null,
        task: null,
        project: { title: 'Deprecated Platform' },
        actor: {
          developerProfile: null,
          companyProfile: { userId: 'c1', companyName: 'NovaTech Labs' },
        },
      },
    ]);
    prismaMock.notification.count.mockResolvedValueOnce(2).mockResolvedValueOnce(2);

    const result = await meService.getMyNotifications({
      userId: 'd1',
      persona: 'developer',
      page: 1,
      size: 20,
    });

    expect(result.items.map((item) => item.message)).toEqual([
      'Task was deleted: Legacy API',
      'Project was deleted: Deprecated Platform',
    ]);

    expect(result.items[0].target).toEqual({
      type: 'task',
      id: 't1',
      url: '/tasks/t1',
    });
    expect(result.items[1].target).toEqual({
      type: 'project',
      id: 'p2',
      url: '/projects/p2',
    });
    expect(result.items[0].category).toBe('projects');
    expect(result.items[1].category).toBe('projects');
  });

  test('hides deletion notifications for company persona', async () => {
    const createdAt = new Date('2026-03-18T10:00:00Z');

    prismaMock.notification.findMany.mockResolvedValue([
      {
        id: 'n1',
        type: 'TASK_DELETED',
        actorUserId: 'c1',
        projectId: null,
        taskId: 't1',
        threadId: null,
        payload: {},
        createdAt,
        readAt: null,
        importantAt: null,
        task: { ownerUserId: 'c1', title: 'Legacy API' },
        project: null,
        actor: {
          developerProfile: null,
          companyProfile: { userId: 'c1', companyName: 'NovaTech Labs' },
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

    expect(result.items).toHaveLength(0);
  });
});
