import { jest } from '@jest/globals';

async function loadCleanup({ prismaMock }) {
  jest.resetModules();

  jest.unstable_mockModule('../../src/db/prisma.js', () => ({ prisma: prismaMock }));
  jest.unstable_mockModule('../../src/config/env.js', () => ({
    env: {
      verificationTokenRetentionDays: 7,
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

  const cleanupJob = await import('../../../src/jobs/verification-token-cleanup.js');
  return { cleanupJob, scheduleMock };
}

describe('verification-token-cleanup job', () => {
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

  test('runOnce deletes expired and used tokens', async () => {
    const deleteManyMock = jest.fn().mockResolvedValue({ count: 2 });
    const prismaMock = {
      verificationToken: {
        deleteMany: deleteManyMock,
      },
    };

    const { cleanupJob } = await loadCleanup({ prismaMock });
    const cleanup = cleanupJob.startVerificationTokenCleanup();
    await cleanup.runOnce();

    expect(deleteManyMock).toHaveBeenCalledWith({
      where: {
        OR: [
          { expiresAt: { lt: expect.any(Date) } },
          { usedAt: { not: null } },
          { createdAt: { lt: expect.any(Date) } },
        ],
      },
    });
  });

  test('skips cleanup when model missing', async () => {
    const { cleanupJob } = await loadCleanup({ prismaMock: {} });
    const cleanup = cleanupJob.startVerificationTokenCleanup();
    await cleanup.runOnce();
  });

  test('scheduled cleanup logs errors without throwing', async () => {
    const deleteManyMock = jest.fn().mockRejectedValue(new Error('DB down'));
    const prismaMock = {
      verificationToken: {
        deleteMany: deleteManyMock,
      },
    };
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    const { cleanupJob, scheduleMock } = await loadCleanup({ prismaMock });
    cleanupJob.startVerificationTokenCleanup();

    const scheduledFn = scheduleMock.mock.calls[0][1];
    await scheduledFn();

    expect(errorSpy).toHaveBeenCalled();
    errorSpy.mockRestore();
  });
});
