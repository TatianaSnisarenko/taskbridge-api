import { jest } from '@jest/globals';
import { createRateLimitMiddleware } from '../../../src/middleware/rate-limit.middleware.js';

function createResponseMock() {
  return {
    set: jest.fn(),
  };
}

describe('rate-limit.middleware', () => {
  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(new Date('2026-03-16T10:00:00.000Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test('allows requests below maxRequests', () => {
    const middleware = createRateLimitMiddleware({
      maxRequests: 2,
      windowMs: 60_000,
      keyExtractor: (req) => req.ip,
    });

    const req = { ip: '127.0.0.1' };
    const res = createResponseMock();
    const next = jest.fn();

    middleware(req, res, next);
    middleware(req, res, next);

    expect(next).toHaveBeenCalledTimes(2);
    expect(next).toHaveBeenNthCalledWith(1);
    expect(next).toHaveBeenNthCalledWith(2);
    expect(res.set).not.toHaveBeenCalled();
  });

  test('blocks requests when limit is exceeded and sets Retry-After header', () => {
    const middleware = createRateLimitMiddleware({
      maxRequests: 1,
      windowMs: 60_000,
      keyExtractor: (req) => req.ip,
    });

    const req = { ip: '127.0.0.1' };
    const res = createResponseMock();
    const next = jest.fn();

    middleware(req, res, next);
    middleware(req, res, next);

    expect(next).toHaveBeenCalledTimes(2);
    expect(next).toHaveBeenNthCalledWith(1);
    expect(next).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        status: 429,
        code: 'RATE_LIMIT_EXCEEDED',
      })
    );
    expect(res.set).toHaveBeenCalledWith('Retry-After', expect.any(String));
  });

  test('skips limiting when keyExtractor returns empty key', () => {
    const middleware = createRateLimitMiddleware({
      maxRequests: 1,
      windowMs: 60_000,
      keyExtractor: () => null,
    });

    const req = {};
    const res = createResponseMock();
    const next = jest.fn();

    middleware(req, res, next);
    middleware(req, res, next);

    expect(next).toHaveBeenCalledTimes(2);
    expect(next).toHaveBeenNthCalledWith(1);
    expect(next).toHaveBeenNthCalledWith(2);
    expect(res.set).not.toHaveBeenCalled();
  });
});
