import { jest } from '@jest/globals';

const prismaMock = {
  notification: {
    findMany: jest.fn(),
    count: jest.fn(),
  },
};

jest.unstable_mockModule('../../src/db/prisma.js', () => ({ prisma: prismaMock }));

const meService = await import('../../../../src/services/me/index.js');

describe('me.service - project archive notifications', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('maps project archive notification types for frontend display', async () => {
    const createdAt = new Date('2026-03-17T10:00:00Z');

    prismaMock.notification.findMany.mockResolvedValue([
      {
        id: 'n1',
        type: 'PROJECT_ARCHIVED_LIMIT_REACHED',
        actorUserId: null,
        projectId: 'p2',
        taskId: null,
        threadId: null,
        payload: {
          max_talents: 3,
          completed_count: 2,
          failed_count: 1,
        },
        createdAt,
        readAt: null,
        importantAt: null,
        task: null,
        project: { title: 'Growth Sprint' },
        actor: {
          developerProfile: null,
          companyProfile: null,
        },
      },
      {
        id: 'n2',
        type: 'PROJECT_ARCHIVED_MODERATION',
        actorUserId: 'm1',
        projectId: 'p3',
        taskId: null,
        threadId: null,
        payload: {
          reason: 'SPAM',
          resolution_action: 'DELETE',
          resolution_note: 'Violation confirmed',
        },
        createdAt,
        readAt: null,
        importantAt: null,
        task: null,
        project: { title: 'Suspicious Project' },
        actor: {
          developerProfile: null,
          companyProfile: null,
        },
      },
    ]);
    prismaMock.notification.count.mockResolvedValueOnce(2).mockResolvedValueOnce(2);

    const result = await meService.getMyNotifications({
      userId: 'u1',
      persona: 'developer',
      page: 1,
      size: 20,
    });

    expect(result.items.map((item) => item.message)).toEqual([
      'Project archived after reaching max talents: Growth Sprint',
      'Project archived by moderation: Suspicious Project',
    ]);
    expect(result.items[0].target).toEqual({
      type: 'project',
      id: 'p2',
      url: '/projects/p2',
    });
    expect(result.items[1].target).toEqual({
      type: 'project',
      id: 'p3',
      url: '/projects/p3',
    });
    expect(result.items[0].category).toBe('projects');
    expect(result.items[1].category).toBe('projects');
  });
});
