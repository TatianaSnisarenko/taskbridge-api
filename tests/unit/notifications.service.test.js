import { jest } from '@jest/globals';

const prismaMock = {
  notification: {
    create: jest.fn(),
  },
};

jest.unstable_mockModule('../../src/db/prisma.js', () => ({ prisma: prismaMock }));

const notificationsService = await import('../../src/services/notifications/index.js');

describe('notifications.service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
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
        taskId: 't1',
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
