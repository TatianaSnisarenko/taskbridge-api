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

describe('me.service - notifications markAll persona edge cases', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('handles REVIEW_CREATED when the same user is both actor and task owner', async () => {
    prismaMock.notification.findMany.mockResolvedValue([
      {
        id: 'n1',
        type: 'REVIEW_CREATED',
        task: {
          ownerUserId: 'u1',
        },
        actor: {
          developerProfile: { userId: 'u1' },
          companyProfile: null,
        },
      },
    ]);

    prismaMock.notification.updateMany.mockResolvedValue({ count: 1 });

    await meService.markAllNotificationsAsRead({
      userId: 'u1',
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

  test('filters out REVIEW_CREATED for task owner using developer persona', async () => {
    prismaMock.notification.findMany.mockResolvedValue([
      {
        id: 'n1',
        type: 'REVIEW_CREATED',
        task: {
          ownerUserId: 'c1',
        },
        actor: {
          developerProfile: { userId: 'u1' },
          companyProfile: null,
        },
      },
    ]);

    prismaMock.notification.updateMany.mockResolvedValue({ count: 0 });

    await meService.markAllNotificationsAsRead({
      userId: 'c1',
      persona: 'developer',
    });

    expect(prismaMock.notification.updateMany).not.toHaveBeenCalled();
  });

  test('handles REVIEW_CREATED for task owner using company persona', async () => {
    prismaMock.notification.findMany.mockResolvedValue([
      {
        id: 'n1',
        type: 'REVIEW_CREATED',
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

  test('handles REVIEW_CREATED for developer when company is actor', async () => {
    prismaMock.notification.findMany.mockResolvedValue([
      {
        id: 'n1',
        type: 'REVIEW_CREATED',
        task: {
          ownerUserId: 'c1',
        },
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

  test('filters out REVIEW_CREATED when user is not the recipient', async () => {
    prismaMock.notification.findMany.mockResolvedValue([
      {
        id: 'n1',
        type: 'REVIEW_CREATED',
        task: {
          ownerUserId: 'c1',
        },
        actor: {
          developerProfile: { userId: 'u2' },
          companyProfile: null,
        },
      },
    ]);

    prismaMock.notification.updateMany.mockResolvedValue({ count: 0 });

    await meService.markAllNotificationsAsRead({
      userId: 'u1',
      persona: 'developer',
    });

    expect(prismaMock.notification.updateMany).not.toHaveBeenCalled();
  });

  test('keeps unknown notification types visible by default', async () => {
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

    expect(prismaMock.notification.updateMany).toHaveBeenCalledWith({
      where: {
        id: { in: ['n1'] },
      },
      data: {
        readAt: expect.any(Date),
      },
    });
  });

  test('handles COMPLETION_REQUESTED for task owner using company persona', async () => {
    prismaMock.notification.findMany.mockResolvedValue([
      {
        id: 'n1',
        type: 'COMPLETION_REQUESTED',
        task: { ownerUserId: 'c1' },
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

  test('handles TASK_COMPLETED for developer using developer persona', async () => {
    prismaMock.notification.findMany.mockResolvedValue([
      {
        id: 'n1',
        type: 'TASK_COMPLETED',
        task: { ownerUserId: 'c1' },
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

  test('filters out TASK_COMPLETED for company persona', async () => {
    prismaMock.notification.findMany.mockResolvedValue([
      {
        id: 'n1',
        type: 'TASK_COMPLETED',
        task: { ownerUserId: 'c1' },
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
});
