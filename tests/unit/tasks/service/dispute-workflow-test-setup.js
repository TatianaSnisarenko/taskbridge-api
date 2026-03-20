import { jest } from '@jest/globals';

export const prismaMock = {
  $transaction: jest.fn(),
  task: {
    findUnique: jest.fn(),
    update: jest.fn(),
    count: jest.fn(),
  },
  taskDispute: {
    findFirst: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    count: jest.fn(),
    findMany: jest.fn(),
  },
  project: {
    findUnique: jest.fn(),
    update: jest.fn(),
  },
  user: {
    findUnique: jest.fn(),
  },
};

export const notificationsServiceMock = {
  createApplicationCreatedNotification: jest.fn(),
  buildTaskNotificationPayload: jest.fn(),
  createNotification: jest.fn(),
};

export const notificationEmailServiceMock = {
  sendImportantNotificationEmail: jest.fn(async () => {}),
};

jest.unstable_mockModule('../../src/db/prisma.js', () => ({ prisma: prismaMock }));
jest.unstable_mockModule(
  '../../src/services/notifications/index.js',
  () => notificationsServiceMock
);
jest.unstable_mockModule(
  '../../src/services/notification-email/index.js',
  () => notificationEmailServiceMock
);

export const tasksService = await import('../../../../src/services/tasks/index.js');

export function resetDisputeMocks() {
  jest.clearAllMocks();
  prismaMock.$transaction.mockImplementation(async (callback) => callback(prismaMock));
  prismaMock.taskDispute.findFirst.mockResolvedValue(null);
  prismaMock.taskDispute.create.mockResolvedValue({ id: 'd1' });
  prismaMock.taskDispute.update.mockResolvedValue({});
}
