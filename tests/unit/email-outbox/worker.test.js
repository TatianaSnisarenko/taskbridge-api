import { jest } from '@jest/globals';

const sendEmailMock = jest.fn();
const getRedisClientMock = jest.fn();

const prismaMock = {
  $transaction: jest.fn(),
  emailOutbox: {
    findMany: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
  },
};

function envMock(overrides = {}) {
  return {
    emailOutboxEnabled: true,
    redisEnabled: true,
    emailOutboxProcessingTimeoutMs: 60_000,
    emailOutboxBatchSize: 20,
    emailOutboxWorkerLockTtlMs: 60_000,
    emailOutboxBaseDelayMs: 5000,
    emailOutboxMaxDelayMs: 900_000,
    emailOutboxJitterRatio: 0,
    emailOutboxThrottleBatchPauseMs: 5000,
    ...overrides,
  };
}

function createTx(rows = []) {
  return {
    emailOutbox: {
      updateMany: jest.fn().mockResolvedValue({ count: 0 }),
    },
    $queryRaw: jest.fn().mockResolvedValue(rows.map((id) => ({ id }))),
  };
}

function createRedisClient({ throttleUntil = null, lockAcquired = true } = {}) {
  const getMock = jest.fn();
  // 1) getGlobalThrottlePauseMs reads THROTTLE_UNTIL_KEY
  getMock.mockResolvedValueOnce(throttleUntil == null ? null : String(throttleUntil));
  // 2) releaseWorkerLock reads WORKER_LOCK_KEY token
  getMock.mockResolvedValue('lock-token');

  return {
    isOpen: true,
    get: getMock,
    set: jest
      .fn()
      .mockResolvedValueOnce(lockAcquired ? 'OK' : null)
      .mockResolvedValue('OK'),
    del: jest.fn().mockResolvedValue(1),
  };
}

async function importWorker(overrides = {}) {
  jest.resetModules();

  jest.unstable_mockModule('../../src/services/email/index.js', () => ({
    sendEmail: sendEmailMock,
  }));

  jest.unstable_mockModule('../../src/cache/redis.js', () => ({
    getRedisClient: getRedisClientMock,
  }));

  jest.unstable_mockModule('../../src/db/prisma.js', () => ({
    prisma: prismaMock,
  }));

  jest.unstable_mockModule('../../src/config/env.js', () => ({
    env: envMock(overrides),
  }));

  return import('../../../src/services/email-outbox/worker.js');
}

describe('email-outbox worker', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('returns disabled when outbox is off', async () => {
    const { processEmailOutboxBatch } = await importWorker({ emailOutboxEnabled: false });

    const result = await processEmailOutboxBatch();

    expect(result).toEqual({
      skipped: 'disabled',
      processed: 0,
      queuedForRetry: 0,
      failed: 0,
      sent: 0,
    });
  });

  test('returns throttled when global pause exists', async () => {
    const { processEmailOutboxBatch } = await importWorker();
    const redis = createRedisClient({ throttleUntil: Date.now() + 10_000 });
    getRedisClientMock.mockReturnValue(redis);

    const result = await processEmailOutboxBatch();

    expect(result.skipped).toBe('throttled');
    expect(result.pauseMs).toBeGreaterThan(0);
  });

  test('returns locked when worker lock is busy', async () => {
    const { processEmailOutboxBatch } = await importWorker();
    const redis = createRedisClient({ lockAcquired: false });
    getRedisClientMock.mockReturnValue(redis);

    const result = await processEmailOutboxBatch();

    expect(result).toEqual({
      skipped: 'locked',
      processed: 0,
      queuedForRetry: 0,
      failed: 0,
      sent: 0,
    });
  });

  test('returns empty when there are no due messages', async () => {
    const { processEmailOutboxBatch } = await importWorker();
    getRedisClientMock.mockReturnValue(createRedisClient());

    prismaMock.$transaction.mockImplementationOnce(async (callback) => callback(createTx([])));

    const result = await processEmailOutboxBatch();

    expect(result).toEqual({
      skipped: 'empty',
      processed: 0,
      queuedForRetry: 0,
      failed: 0,
      sent: 0,
    });
  });

  test('marks message SENT on successful delivery', async () => {
    const { processEmailOutboxBatch } = await importWorker();
    getRedisClientMock.mockReturnValue(createRedisClient());

    prismaMock.$transaction.mockImplementationOnce(async (callback) => callback(createTx(['m1'])));
    prismaMock.emailOutbox.findMany.mockResolvedValueOnce([
      {
        id: 'm1',
        to: 'a@example.com',
        subject: 'S',
        text: 'T',
        html: '<p>H</p>',
        attempts: 0,
        maxAttempts: 8,
        expiresAt: new Date(Date.now() + 60_000),
        nextAttemptAt: new Date(),
      },
    ]);
    sendEmailMock.mockResolvedValueOnce(undefined);
    prismaMock.emailOutbox.update.mockResolvedValueOnce({ id: 'm1', status: 'SENT' });

    const result = await processEmailOutboxBatch();

    expect(result).toEqual({
      processed: 1,
      sent: 1,
      queuedForRetry: 0,
      failed: 0,
      deferredTail: false,
    });
    expect(prismaMock.emailOutbox.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'm1' },
        data: expect.objectContaining({ status: 'SENT' }),
      })
    );
  });

  test('moves recoverable failure to RETRYING', async () => {
    const { processEmailOutboxBatch } = await importWorker();
    getRedisClientMock.mockReturnValue(createRedisClient());

    prismaMock.$transaction.mockImplementationOnce(async (callback) => callback(createTx(['m1'])));
    prismaMock.emailOutbox.findMany.mockResolvedValueOnce([
      {
        id: 'm1',
        to: 'a@example.com',
        subject: 'S',
        text: 'T',
        html: '<p>H</p>',
        attempts: 0,
        maxAttempts: 8,
        expiresAt: new Date(Date.now() + 60_000),
        nextAttemptAt: new Date(),
      },
    ]);
    sendEmailMock.mockRejectedValueOnce({ code: 'ETIMEDOUT', message: 'timeout' });
    prismaMock.emailOutbox.update.mockResolvedValueOnce({ id: 'm1', status: 'RETRYING' });

    const result = await processEmailOutboxBatch();

    expect(result.queuedForRetry).toBe(1);
    expect(prismaMock.emailOutbox.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'm1' },
        data: expect.objectContaining({ status: 'RETRYING' }),
      })
    );
  });

  test('marks non-recoverable failure as FAILED', async () => {
    const { processEmailOutboxBatch } = await importWorker();
    getRedisClientMock.mockReturnValue(createRedisClient());

    prismaMock.$transaction.mockImplementationOnce(async (callback) => callback(createTx(['m1'])));
    prismaMock.emailOutbox.findMany.mockResolvedValueOnce([
      {
        id: 'm1',
        to: 'a@example.com',
        subject: 'S',
        text: 'T',
        html: '<p>H</p>',
        attempts: 7,
        maxAttempts: 8,
        expiresAt: new Date(Date.now() + 60_000),
        nextAttemptAt: new Date(),
      },
    ]);
    sendEmailMock.mockRejectedValueOnce({ responseCode: 550, message: 'mailbox unavailable' });
    prismaMock.emailOutbox.update.mockResolvedValueOnce({ id: 'm1', status: 'FAILED' });

    const result = await processEmailOutboxBatch();

    expect(result.failed).toBe(1);
    expect(prismaMock.emailOutbox.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'm1' },
        data: expect.objectContaining({ status: 'FAILED' }),
      })
    );
  });

  test('continues processing when redis is disabled', async () => {
    const { processEmailOutboxBatch } = await importWorker({ redisEnabled: false });

    prismaMock.$transaction.mockImplementationOnce(async (callback) => callback(createTx([])));

    const result = await processEmailOutboxBatch();

    expect(result).toEqual({
      skipped: 'empty',
      processed: 0,
      queuedForRetry: 0,
      failed: 0,
      sent: 0,
    });
    expect(getRedisClientMock).not.toHaveBeenCalled();
  });

  test('clears stale throttle key and continues normal flow', async () => {
    const { processEmailOutboxBatch } = await importWorker();
    const redis = createRedisClient({ throttleUntil: Date.now() - 10_000 });
    getRedisClientMock.mockReturnValue(redis);

    prismaMock.$transaction.mockImplementationOnce(async (callback) => callback(createTx([])));

    const result = await processEmailOutboxBatch();

    expect(result.skipped).toBe('empty');
    expect(redis.del).toHaveBeenCalled();
  });

  test('defers remaining batch on throttling error', async () => {
    const { processEmailOutboxBatch } = await importWorker();
    const redis = createRedisClient();
    getRedisClientMock.mockReturnValue(redis);

    prismaMock.$transaction.mockImplementationOnce(async (callback) =>
      callback(createTx(['m1', 'm2']))
    );
    prismaMock.emailOutbox.findMany.mockResolvedValueOnce([
      {
        id: 'm1',
        to: 'a@example.com',
        subject: 'S1',
        text: 'T1',
        html: '<p>H1</p>',
        attempts: 0,
        maxAttempts: 8,
        expiresAt: new Date(Date.now() + 60_000),
        nextAttemptAt: new Date(),
      },
      {
        id: 'm2',
        to: 'b@example.com',
        subject: 'S2',
        text: 'T2',
        html: '<p>H2</p>',
        attempts: 0,
        maxAttempts: 8,
        expiresAt: new Date(Date.now() + 60_000),
        nextAttemptAt: new Date(),
      },
    ]);

    sendEmailMock.mockRejectedValueOnce({
      statusCode: 429,
      message: 'rate limit',
      retryAfterSeconds: 30,
    });

    prismaMock.emailOutbox.update.mockResolvedValueOnce({ id: 'm1', status: 'RETRYING' });
    prismaMock.emailOutbox.updateMany.mockResolvedValueOnce({ count: 1 });

    const result = await processEmailOutboxBatch();

    expect(result.deferredTail).toBe(true);
    expect(result.queuedForRetry).toBe(1);
    expect(prismaMock.emailOutbox.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: { in: ['m2'] } } })
    );
  });

  test('treats closed redis client as unavailable', async () => {
    const { processEmailOutboxBatch } = await importWorker();
    getRedisClientMock.mockReturnValue({ isOpen: false });

    prismaMock.$transaction.mockImplementationOnce(async (callback) => callback(createTx([])));

    const result = await processEmailOutboxBatch();

    expect(result.skipped).toBe('empty');
  });

  test('releases redis lock when token matches', async () => {
    const { processEmailOutboxBatch } = await importWorker();

    const redis = {
      isOpen: true,
      get: jest
        .fn()
        .mockResolvedValueOnce(null)
        .mockImplementation(async () => redis.set.mock.calls[0]?.[1] ?? null),
      set: jest.fn().mockResolvedValue('OK'),
      del: jest.fn().mockResolvedValue(1),
    };

    getRedisClientMock.mockReturnValue(redis);
    prismaMock.$transaction.mockImplementationOnce(async (callback) => callback(createTx([])));

    await processEmailOutboxBatch();

    expect(redis.del).toHaveBeenCalled();
  });

  test('continues throttled retry flow when redis is unavailable', async () => {
    const { processEmailOutboxBatch } = await importWorker();
    getRedisClientMock.mockReturnValue(null);

    prismaMock.$transaction.mockImplementationOnce(async (callback) =>
      callback(createTx(['m1', 'm2']))
    );
    prismaMock.emailOutbox.findMany.mockResolvedValueOnce([
      {
        id: 'm1',
        to: 'a@example.com',
        subject: 'S1',
        text: 'T1',
        html: '<p>H1</p>',
        attempts: 0,
        maxAttempts: 8,
        expiresAt: new Date(Date.now() + 60_000),
        nextAttemptAt: new Date(),
      },
      {
        id: 'm2',
        to: 'b@example.com',
        subject: 'S2',
        text: 'T2',
        html: '<p>H2</p>',
        attempts: 0,
        maxAttempts: 8,
        expiresAt: new Date(Date.now() + 60_000),
        nextAttemptAt: new Date(),
      },
    ]);

    sendEmailMock.mockRejectedValueOnce({
      statusCode: 429,
      message: 'rate limit',
      retryAfterSeconds: 30,
    });

    prismaMock.emailOutbox.update.mockResolvedValueOnce({ id: 'm1', status: 'RETRYING' });
    prismaMock.emailOutbox.updateMany.mockResolvedValueOnce({ count: 1 });

    const result = await processEmailOutboxBatch();

    expect(result.deferredTail).toBe(true);
    expect(result.queuedForRetry).toBe(1);
  });
});
