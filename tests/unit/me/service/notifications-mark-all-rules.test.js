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

describe('me.service - notifications markAll rules', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('handles COMPLETION_REQUESTED notifications (developer)', async () => {
    prismaMock.notification.findMany.mockResolvedValue([
      {
        id: 'n1',
        type: 'COMPLETION_REQUESTED',
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
        id: { in: ['n1'] },
      },
      data: {
        readAt: expect.any(Date),
      },
    });
  });

  test('filters out COMPLETION_REQUESTED for company persona', async () => {
    prismaMock.notification.findMany.mockResolvedValue([
      {
        id: 'n1',
        type: 'COMPLETION_REQUESTED',
        task: null,
        actor: {
          developerProfile: null,
          companyProfile: { userId: 'c1' },
        },
      },
    ]);

    prismaMock.notification.updateMany.mockResolvedValue({ count: 0 });

    await meService.markAllNotificationsAsRead({
      userId: 'c1',
      persona: 'company',
    });

    expect(prismaMock.notification.updateMany).not.toHaveBeenCalled();
  });

  test('handles TASK_INVITE_CREATED notifications (developer)', async () => {
    prismaMock.notification.findMany.mockResolvedValue([
      {
        id: 'n1',
        type: 'TASK_INVITE_CREATED',
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
        id: { in: ['n1'] },
      },
      data: {
        readAt: expect.any(Date),
      },
    });
  });

  test('handles TASK_INVITE_ACCEPTED notifications (company)', async () => {
    prismaMock.notification.findMany.mockResolvedValue([
      {
        id: 'n1',
        type: 'TASK_INVITE_ACCEPTED',
        task: {
          ownerUserId: 'c1',
        },
        actor: {
          developerProfile: { userId: 'u1' },
          companyProfile: null,
        },
      },
    ]);

    prismaMock.notification.updateMany.mockResolvedValue({ count: 1 });

    await meService.markAllNotificationsAsRead({
      userId: 'c1',
      persona: 'company',
    });

    expect(prismaMock.notification.updateMany).toHaveBeenCalledWith({
      where: {
        id: { in: ['n1'] },
      },
      data: {
        readAt: expect.any(Date),
      },
    });
  });

  test('handles TASK_INVITE_DECLINED notifications (company)', async () => {
    prismaMock.notification.findMany.mockResolvedValue([
      {
        id: 'n1',
        type: 'TASK_INVITE_DECLINED',
        task: {
          ownerUserId: 'c1',
        },
        actor: {
          developerProfile: { userId: 'u1' },
          companyProfile: null,
        },
      },
    ]);

    prismaMock.notification.updateMany.mockResolvedValue({ count: 1 });

    await meService.markAllNotificationsAsRead({
      userId: 'c1',
      persona: 'company',
    });

    expect(prismaMock.notification.updateMany).toHaveBeenCalledWith({
      where: {
        id: { in: ['n1'] },
      },
      data: {
        readAt: expect.any(Date),
      },
    });
  });

  test('handles TASK_INVITE_CANCELLED notifications (developer)', async () => {
    prismaMock.notification.findMany.mockResolvedValue([
      {
        id: 'n1',
        type: 'TASK_INVITE_CANCELLED',
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
        id: { in: ['n1'] },
      },
      data: {
        readAt: expect.any(Date),
      },
    });
  });

  test('handles REVIEW_CREATED for user who is actor developer and task owner (edge case)', async () => {
    prismaMock.notification.findMany.mockResolvedValue([
      {
        id: 'n1',
        type: 'REVIEW_CREATED',
        task: {
          ownerUserId: 'u1', // Same user owns task
        },
        actor: {
          developerProfile: { userId: 'u1' }, // Same user is actor
          companyProfile: null,
        },
      },
    ]);

    prismaMock.notification.updateMany.mockResolvedValue({ count: 1 });

    await meService.markAllNotificationsAsRead({
      userId: 'u1',
      persona: 'company', // Viewing as company
    });

    expect(prismaMock.notification.updateMany).toHaveBeenCalledWith({
      where: {
        id: { in: ['n1'] },
      },
      data: {
        readAt: expect.any(Date),
      },
    });
  });

  test('handles REVIEW_CREATED for task owner viewing as developer', async () => {
    prismaMock.notification.findMany.mockResolvedValue([
      {
        id: 'n1',
        type: 'REVIEW_CREATED',
        task: {
          ownerUserId: 'c1',
        },
        actor: {
          developerProfile: { userId: 'u1' }, // Different user
          companyProfile: null,
        },
      },
    ]);

    prismaMock.notification.updateMany.mockResolvedValue({ count: 1 });

    await meService.markAllNotificationsAsRead({
      userId: 'c1', // Task owner
      persona: 'developer', // Viewing as developer
    });

    expect(prismaMock.notification.updateMany).toHaveBeenCalledWith({
      where: {
        id: { in: ['n1'] },
      },
      data: {
        readAt: expect.any(Date),
      },
    });
  });

  test('filters out REVIEW_CREATED when persona does not match actor/task owner', async () => {
    prismaMock.notification.findMany.mockResolvedValue([
      {
        id: 'n1',
        type: 'REVIEW_CREATED',
        task: {
          ownerUserId: 'c1',
        },
        actor: {
          developerProfile: { userId: 'u2' }, // Different developer
          companyProfile: null,
        },
      },
    ]);

    prismaMock.notification.updateMany.mockResolvedValue({ count: 0 });

    await meService.markAllNotificationsAsRead({
      userId: 'u1', // Not the actor, not the task owner
      persona: 'developer',
    });

    expect(prismaMock.notification.updateMany).not.toHaveBeenCalled();
  });

  test('handles unknown notification type (default case)', async () => {
    prismaMock.notification.findMany.mockResolvedValue([
      {
        id: 'n1',
        type: 'UNKNOWN_TYPE',
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

    // Default case returns true for unknown types
    expect(prismaMock.notification.updateMany).toHaveBeenCalledWith({
      where: {
        id: { in: ['n1'] },
      },
      data: {
        readAt: expect.any(Date),
      },
    });
  });
});
