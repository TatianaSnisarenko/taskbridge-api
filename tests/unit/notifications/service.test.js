import { jest } from '@jest/globals';

const prismaMock = {
  notification: {
    create: jest.fn(),
  },
};

const notificationsCacheMock = {
  invalidateCachedUnreadNotificationCount: jest.fn(),
};

jest.unstable_mockModule('../../src/db/prisma.js', () => ({ prisma: prismaMock }));
jest.unstable_mockModule('../../src/cache/notifications.js', () => notificationsCacheMock);

const notificationsService = await import('../../../src/services/notifications/index.js');

describe('notifications.service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    notificationsCacheMock.invalidateCachedUnreadNotificationCount.mockResolvedValue(true);
  });

  test('buildTaskNotificationPayload builds consistent shape', () => {
    const payload = notificationsService.buildTaskNotificationPayload({
      taskId: 't1',
      applicationId: 'a1',
      reviewId: 'r1',
    });

    expect(payload).toEqual({
      task_id: 't1',
      application_id: 'a1',
      review_id: 'r1',
      invite_id: null,
    });
  });

  test('buildTaskNotificationPayload uses null defaults for optional fields', () => {
    const payload = notificationsService.buildTaskNotificationPayload({
      taskId: 't2',
    });

    expect(payload).toEqual({
      task_id: 't2',
      application_id: null,
      review_id: null,
      invite_id: null,
    });
  });

  test('createNotification uses prisma default client when not provided', async () => {
    prismaMock.notification.create.mockResolvedValue({ id: 'n-default' });

    const result = await notificationsService.createNotification({
      userId: 'owner2',
      actorUserId: 'actor2',
      taskId: 't2',
      type: 'CHAT_MESSAGE',
      payload: { task_id: 't2', thread_id: 'th-1' },
    });

    expect(prismaMock.notification.create).toHaveBeenCalledWith({
      data: {
        userId: 'owner2',
        actorUserId: 'actor2',
        projectId: null,
        taskId: 't2',
        threadId: null,
        type: 'CHAT_MESSAGE',
        payload: { task_id: 't2', thread_id: 'th-1' },
      },
    });
    expect(notificationsCacheMock.invalidateCachedUnreadNotificationCount).toHaveBeenCalledWith(
      'owner2'
    );
    expect(result).toEqual({ id: 'n-default' });
  });

  test('createApplicationCreatedNotification creates notification with payload', async () => {
    prismaMock.notification.create.mockResolvedValue({ id: 'n1' });

    const result = await notificationsService.createApplicationCreatedNotification({
      userId: 'owner1',
      actorUserId: 'dev1',
      taskId: 't1',
      applicationId: 'a1',
    });

    expect(prismaMock.notification.create).toHaveBeenCalledWith({
      data: {
        userId: 'owner1',
        actorUserId: 'dev1',
        projectId: null,
        taskId: 't1',
        threadId: null,
        type: 'APPLICATION_CREATED',
        payload: {
          task_id: 't1',
          application_id: 'a1',
          review_id: null,
          invite_id: null,
        },
      },
    });

    expect(result).toEqual({ id: 'n1' });
  });
});
