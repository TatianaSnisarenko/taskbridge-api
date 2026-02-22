import { jest } from '@jest/globals';
import { setImmediate } from 'node:timers';

async function loadServer({ connectImpl, listenImpl }) {
  jest.resetModules();

  const connectMock = jest.fn(connectImpl ?? (() => Promise.resolve()));
  const disconnectMock = jest.fn().mockResolvedValue(undefined);
  const closeMock = jest.fn((cb) => cb());

  const cleanupTask = { stop: jest.fn() };
  const runOnceMock = jest.fn().mockResolvedValue(undefined);

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
      $disconnect: disconnectMock,
    },
  }));

  jest.unstable_mockModule('../../src/jobs/verification-token-cleanup.js', () => ({
    startVerificationTokenCleanup: () => ({ task: cleanupTask, runOnce: runOnceMock }),
  }));

  const handlers = {};
  const onSpy = jest.spyOn(process, 'on').mockImplementation((event, handler) => {
    handlers[event] = handler;
    return process;
  });
  const exitSpy = jest.spyOn(process, 'exit').mockImplementation(() => undefined);

  const cacheBust = `?test=${Math.random().toString(36).slice(2)}`;
  await import(`../../src/server.js${cacheBust}`);

  return {
    connectMock,
    disconnectMock,
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
    const { connectMock, runOnceMock, listenMock, handlers, onSpy } = await loadServer({});

    await new Promise((resolve) => setImmediate(resolve));

    expect(connectMock).toHaveBeenCalled();
    expect(runOnceMock).toHaveBeenCalled();
    expect(listenMock).toHaveBeenCalledWith(3000, expect.any(Function));
    expect(handlers.SIGINT).toEqual(expect.any(Function));
    expect(handlers.SIGTERM).toEqual(expect.any(Function));

    onSpy.mockRestore();
  });

  test('shutdown closes server and disconnects', async () => {
    const { handlers, closeMock, disconnectMock, cleanupTask, exitSpy, onSpy } = await loadServer(
      {}
    );

    await new Promise((resolve) => setImmediate(resolve));
    await handlers.SIGINT();

    expect(closeMock).toHaveBeenCalled();
    expect(cleanupTask.stop).toHaveBeenCalled();
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
});
