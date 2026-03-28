import { jest } from '@jest/globals';

const createClientMock = jest.fn();

const envMock = {
  redisEnabled: true,
  redisRequired: false,
  redisUrl: 'redis://localhost:6379',
  redisConnectTimeoutMs: 3000,
  redisStartupRetries: 3,
  redisRetryDelayMs: 0,
};

jest.unstable_mockModule('redis', () => ({
  createClient: createClientMock,
}));

jest.unstable_mockModule('../../src/config/env.js', () => ({
  env: envMock,
}));

const { connectRedis, getRedisClient, disconnectRedis } =
  await import('../../../src/cache/redis.js');

describe('cache/redis client', () => {
  const originalLog = console.log;
  const originalError = console.error;
  const originalWarn = console.warn;

  beforeEach(() => {
    jest.clearAllMocks();
    console.log = jest.fn();
    console.error = jest.fn();
    console.warn = jest.fn();

    envMock.redisEnabled = true;
    envMock.redisRequired = false;
    envMock.redisUrl = 'redis://localhost:6379';
    envMock.redisConnectTimeoutMs = 3000;
    envMock.redisStartupRetries = 3;
    envMock.redisRetryDelayMs = 0;
  });

  afterEach(async () => {
    await disconnectRedis();
    console.log = originalLog;
    console.error = originalError;
    console.warn = originalWarn;
  });

  function makeClient({ isOpen = false } = {}) {
    const handlers = {};
    return {
      isOpen,
      connect: jest.fn(async () => {
        client.isOpen = true;
      }),
      ping: jest.fn(async () => 'PONG'),
      quit: jest.fn(async () => {
        client.isOpen = false;
      }),
      on: jest.fn((event, handler) => {
        handlers[event] = handler;
      }),
      handlers,
    };
  }

  let client;

  test('returns null when redis is disabled', async () => {
    envMock.redisEnabled = false;

    const result = await connectRedis();

    expect(result).toBeNull();
    expect(createClientMock).not.toHaveBeenCalled();
  });

  test('connects and pings redis when enabled', async () => {
    client = makeClient();
    createClientMock.mockReturnValue(client);

    const result = await connectRedis();

    expect(createClientMock).toHaveBeenCalledWith({
      url: 'redis://localhost:6379',
      socket: {
        connectTimeout: 3000,
        reconnectStrategy: expect.any(Function),
      },
    });
    expect(client.connect).toHaveBeenCalled();
    expect(client.ping).toHaveBeenCalled();
    expect(result).toBe(client);
    expect(getRedisClient()).toBe(client);
  });

  test('uses reconnectStrategy that disables auto-reconnect', async () => {
    client = makeClient();
    createClientMock.mockReturnValue(client);

    await connectRedis();

    const options = createClientMock.mock.calls[0][0];
    expect(options.socket.reconnectStrategy()).toBe(false);
  });

  test('reuses already-open client', async () => {
    client = makeClient();
    createClientMock.mockReturnValue(client);

    await connectRedis();

    const result = await connectRedis();

    expect(result).toBe(client);
    expect(createClientMock).toHaveBeenCalledTimes(1);
  });

  test('logs redis errors via registered error handler', async () => {
    client = makeClient();
    createClientMock.mockReturnValue(client);

    await connectRedis();

    client.handlers.error?.(new Error('boom'));

    expect(console.error).toHaveBeenCalledWith('Redis error:', 'boom');
  });

  test('disconnects only when client is open', async () => {
    client = makeClient();
    createClientMock.mockReturnValue(client);

    await connectRedis();
    await disconnectRedis();

    expect(client.quit).toHaveBeenCalled();

    client.quit.mockClear();
    await disconnectRedis();

    expect(client.quit).not.toHaveBeenCalled();
  });

  test('throws when redis is required and all startup attempts fail', async () => {
    envMock.redisRequired = true;
    envMock.redisStartupRetries = 1;

    client = makeClient();
    client.connect.mockRejectedValue(new Error('connect failed'));
    createClientMock.mockReturnValue(client);

    await expect(connectRedis()).rejects.toThrow(
      'Redis is required but unavailable after 1 attempt(s). Last error: connect failed'
    );
  });

  test('retries and then continues without cache when redis is optional', async () => {
    envMock.redisRequired = false;
    envMock.redisStartupRetries = 2;
    envMock.redisRetryDelayMs = 0;

    const firstClient = makeClient();
    firstClient.connect.mockRejectedValueOnce(new Error('first fail'));

    const secondClient = makeClient();
    secondClient.connect.mockRejectedValueOnce(new Error('second fail'));

    createClientMock.mockReturnValueOnce(firstClient).mockReturnValueOnce(secondClient);

    const result = await connectRedis();

    expect(result).toBeNull();
    expect(createClientMock).toHaveBeenCalledTimes(2);
    expect(console.warn).toHaveBeenCalled();
  });

  test('best-effort cleanup ignores quit errors after failed connect', async () => {
    envMock.redisRequired = false;
    envMock.redisStartupRetries = 1;

    client = makeClient({ isOpen: true });
    client.connect.mockRejectedValueOnce(new Error('connect failed'));
    client.quit.mockRejectedValueOnce(new Error('quit failed'));
    createClientMock.mockReturnValue(client);

    const result = await connectRedis();

    expect(result).toBeNull();
    expect(client.quit).toHaveBeenCalled();
  });
});
