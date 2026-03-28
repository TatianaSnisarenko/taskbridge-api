import { jest } from '@jest/globals';

async function loadCleanup({ prismaMock }) {
  jest.resetModules();

  jest.unstable_mockModule('../../src/db/prisma.js', () => ({ prisma: prismaMock }));
  jest.unstable_mockModule('../../src/config/env.js', () => ({
    env: {
      unverifiedUserDeletionAfterDays: 7,
      unverifiedUserCleanupCron: '43 3 * * *',
    },
  }));

  const scheduleMock = jest.fn((expression, fn) => ({
    stop: jest.fn(),
    expression,
    fn,
  }));

  jest.unstable_mockModule('node-cron', () => ({
    default: { schedule: scheduleMock },
  }));

  const cleanupJob = await import('../../../src/jobs/unverified-user-cleanup.js');
  return { cleanupJob, scheduleMock };
}

describe('unverified-user-cleanup job', () => {
  let logSpy;
  let warnSpy;

  beforeEach(() => {
    logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    logSpy.mockRestore();
    warnSpy.mockRestore();
  });

  test('runOnce deletes unverified users older than cutoff', async () => {
    const deleteManyMock = jest.fn().mockResolvedValue({ count: 3 });
    const prismaMock = {
      user: {
        deleteMany: deleteManyMock,
      },
    };

    const { cleanupJob } = await loadCleanup({ prismaMock });
    const cleanup = cleanupJob.startUnverifiedUserCleanup();
    await cleanup.runOnce();

    expect(deleteManyMock).toHaveBeenCalledWith({
      where: {
        emailVerified: false,
        deletedAt: null,
        createdAt: { lt: expect.any(Date) },
      },
    });
  });

  test('skips cleanup when user model missing', async () => {
    const { cleanupJob } = await loadCleanup({ prismaMock: {} });
    const cleanup = cleanupJob.startUnverifiedUserCleanup();
    await cleanup.runOnce();

    expect(warnSpy).toHaveBeenCalled();
  });

  test('scheduled cleanup logs errors without throwing', async () => {
    const deleteManyMock = jest.fn().mockRejectedValue(new Error('DB down'));
    const prismaMock = {
      user: {
        deleteMany: deleteManyMock,
      },
    };
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    const { cleanupJob, scheduleMock } = await loadCleanup({ prismaMock });
    cleanupJob.startUnverifiedUserCleanup();

    const scheduledFn = scheduleMock.mock.calls[0][1];
    await scheduledFn();

    expect(errorSpy).toHaveBeenCalled();
    errorSpy.mockRestore();
  });
});
