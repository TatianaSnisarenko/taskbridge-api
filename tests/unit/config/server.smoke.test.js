import { jest } from '@jest/globals';
import { setImmediate } from 'node:timers';

async function loadServer({ connectImpl, listenImpl, runOnceImpl, connectRedisImpl }) {
  jest.resetModules();

  const connectMock = jest.fn(connectImpl ?? (() => Promise.resolve()));
  const queryRawMock = jest.fn().mockResolvedValue([{ '?column?': 1 }]);
  const disconnectMock = jest.fn().mockResolvedValue(undefined);
  const connectRedisMock = jest.fn(connectRedisImpl ?? (() => Promise.resolve(null)));
  const disconnectRedisMock = jest.fn().mockResolvedValue(undefined);
  const closeMock = jest.fn((cb) => cb());

  const cleanupTask = { stop: jest.fn() };
  const runOnceMock = jest.fn(runOnceImpl ?? (() => Promise.resolve(undefined)));
  const emailOutboxWorkerTask = { stop: jest.fn() };
  const emailOutboxCleanupTask = { stop: jest.fn() };
  const emailOutboxWorkerRunOnceMock = jest.fn(() => Promise.resolve(undefined));
  const emailOutboxCleanupRunOnceMock = jest.fn(() => Promise.resolve(undefined));

  const listenMock = jest.fn((port, cb) => {
    if (listenImpl) return listenImpl(port, cb);
    cb();
    return { close: closeMock };
  });

  jest.unstable_mockModule('../../src/app.js', () => ({
    createApp: () => ({
      listen: listenMock,
    }),
  }));

  jest.unstable_mockModule('../../src/config/env.js', () => ({
    env: {
      port: 3000,
      nodeEnv: 'test',
      appBaseUrl: 'http://localhost:3000',
      frontendBaseUrl: 'http://localhost:5173',
    },
  }));

  jest.unstable_mockModule('../../src/db/prisma.js', () => ({
    prisma: {
      $connect: connectMock,
      $queryRaw: queryRawMock,
      $disconnect: disconnectMock,
    },
  }));

  jest.unstable_mockModule('../../src/jobs/verification-token-cleanup.js', () => ({
    startVerificationTokenCleanup: () => ({ task: cleanupTask, runOnce: runOnceMock }),
  }));

  jest.unstable_mockModule('../../src/jobs/email-outbox-worker.js', () => ({
    startEmailOutboxWorker: () => ({
      task: emailOutboxWorkerTask,
      runOnce: emailOutboxWorkerRunOnceMock,
    }),
  }));

  jest.unstable_mockModule('../../src/jobs/email-outbox-cleanup.js', () => ({
    startEmailOutboxCleanup: () => ({
      task: emailOutboxCleanupTask,
      runOnce: emailOutboxCleanupRunOnceMock,
    }),
  }));

  jest.unstable_mockModule('../../src/cache/redis.js', () => ({
    connectRedis: connectRedisMock,
    disconnectRedis: disconnectRedisMock,
    getRedisClient: jest.fn(() => null),
  }));

  const handlers = {};
  const onSpy = jest.spyOn(process, 'on').mockImplementation((event, handler) => {
    handlers[event] = handler;
    return process;
  });
  const exitSpy = jest.spyOn(process, 'exit').mockImplementation(() => undefined);

  const cacheBust = `?test=${Math.random().toString(36).slice(2)}`;
  await import(`../../../src/server.js${cacheBust}`);

  return {
    connectMock,
    queryRawMock,
    disconnectMock,
    connectRedisMock,
    disconnectRedisMock,
    runOnceMock,
    listenMock,
    closeMock,
    cleanupTask,
    handlers,
    onSpy,
    exitSpy,
  };
}

describe('server smoke', () => {
  let logSpy;

  beforeEach(() => {
    logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    logSpy.mockRestore();
  });

  test('starts server, connects prisma, and schedules cleanup', async () => {
    const {
      connectMock,
      queryRawMock,
      connectRedisMock,
      runOnceMock,
      listenMock,
      handlers,
      onSpy,
    } = await loadServer({});

    await new Promise((resolve) => setImmediate(resolve));

    expect(connectMock).toHaveBeenCalled();
    expect(queryRawMock).toHaveBeenCalled();
    expect(connectRedisMock).toHaveBeenCalled();
    expect(runOnceMock).toHaveBeenCalled();
    expect(listenMock).toHaveBeenCalledWith(3000, expect.any(Function));
    expect(handlers.SIGINT).toEqual(expect.any(Function));
    expect(handlers.SIGTERM).toEqual(expect.any(Function));

    onSpy.mockRestore();
  });

  test('shutdown closes server and disconnects', async () => {
    const {
      handlers,
      closeMock,
      disconnectMock,
      disconnectRedisMock,
      cleanupTask,
      exitSpy,
      onSpy,
    } = await loadServer({});

    await new Promise((resolve) => setImmediate(resolve));
    await handlers.SIGINT();
    await new Promise((resolve) => setImmediate(resolve));

    expect(closeMock).toHaveBeenCalled();
    expect(cleanupTask.stop).toHaveBeenCalled();
    expect(disconnectRedisMock).toHaveBeenCalled();
    expect(disconnectMock).toHaveBeenCalled();
    expect(exitSpy).toHaveBeenCalledWith(0);

    onSpy.mockRestore();
    exitSpy.mockRestore();
  });

  test('exits when startup fails', async () => {
    const connectImpl = () => Promise.reject(new Error('DB down'));
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const { exitSpy, onSpy } = await loadServer({ connectImpl });

    await new Promise((resolve) => setImmediate(resolve));

    expect(exitSpy).toHaveBeenCalledWith(1);

    onSpy.mockRestore();
    exitSpy.mockRestore();
    errorSpy.mockRestore();
  });

  test('exits when redis is required and redis startup fails', async () => {
    const connectRedisImpl = () => Promise.reject(new Error('Redis required and down'));
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const { exitSpy, onSpy } = await loadServer({ connectRedisImpl });

    await new Promise((resolve) => setImmediate(resolve));

    expect(exitSpy).toHaveBeenCalledWith(1);

    onSpy.mockRestore();
    exitSpy.mockRestore();
    errorSpy.mockRestore();
  });
});
