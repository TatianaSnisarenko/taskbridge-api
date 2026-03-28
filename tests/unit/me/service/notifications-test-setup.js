import { jest } from '@jest/globals';

export const prismaMock = {
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

export const notificationsCacheMock = {
  getCachedUnreadNotificationCount: jest.fn(),
  setCachedUnreadNotificationCount: jest.fn(),
  invalidateCachedUnreadNotificationCount: jest.fn(),
};

jest.unstable_mockModule('../../src/db/prisma.js', () => ({ prisma: prismaMock }));
jest.unstable_mockModule('../../src/cache/notifications.js', () => notificationsCacheMock);

export const meService = await import('../../../../src/services/me/index.js');

export function resetMeServiceMocks() {
  jest.clearAllMocks();
  notificationsCacheMock.getCachedUnreadNotificationCount.mockResolvedValue(null);
  notificationsCacheMock.setCachedUnreadNotificationCount.mockResolvedValue(true);
  notificationsCacheMock.invalidateCachedUnreadNotificationCount.mockResolvedValue(true);
}
