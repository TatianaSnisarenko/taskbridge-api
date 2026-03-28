import { jest } from '@jest/globals';
import {
  createRateLimitMiddleware,
  checkEmailAddressRateLimit,
  checkEmailIpRateLimit,
  resetCheckEmailRateLimiters,
} from '../../../src/middleware/rate-limit.middleware.js';

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

  test('allows requests again after window expires', () => {
    const middleware = createRateLimitMiddleware({
      maxRequests: 1,
      windowMs: 60_000,
      keyExtractor: (req) => req.ip,
    });

    const req = { ip: '127.0.0.1' };
    const res = createResponseMock();
    const next = jest.fn();

    middleware(req, res, next);
    jest.advanceTimersByTime(60_001);
    middleware(req, res, next);

    expect(next).toHaveBeenNthCalledWith(1);
    expect(next).toHaveBeenNthCalledWith(2);
    expect(res.set).not.toHaveBeenCalled();
  });

  test('uses custom code and message when blocked', () => {
    const middleware = createRateLimitMiddleware({
      maxRequests: 1,
      windowMs: 60_000,
      keyExtractor: (req) => req.ip,
      code: 'CUSTOM_LIMIT',
      message: 'Blocked by custom limiter',
    });

    const req = { ip: '127.0.0.1' };
    const res = createResponseMock();
    const next = jest.fn();

    middleware(req, res, next);
    middleware(req, res, next);

    expect(next).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        status: 429,
        code: 'CUSTOM_LIMIT',
        message: 'Blocked by custom limiter',
      })
    );
  });

  test('reset clears in-memory counters', () => {
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
    middleware.reset();
    middleware(req, res, next);

    expect(next).toHaveBeenNthCalledWith(2, expect.any(Object));
    expect(next).toHaveBeenNthCalledWith(3);
  });

  test('checkEmailAddressRateLimit normalizes email and limits by query email', () => {
    const req = { query: { email: '  Test@Example.COM ' } };
    const res = createResponseMock();
    const next = jest.fn();

    for (let i = 0; i < 5; i += 1) {
      checkEmailAddressRateLimit(req, res, next);
    }
    checkEmailAddressRateLimit(req, res, next);

    expect(next).toHaveBeenNthCalledWith(6, expect.any(Object));
    resetCheckEmailRateLimiters();
  });

  test('checkEmailIpRateLimit skips when ip key missing', () => {
    const req = { ip: '' };
    const res = createResponseMock();
    const next = jest.fn();

    checkEmailIpRateLimit(req, res, next);

    expect(next).toHaveBeenCalledWith();
    expect(res.set).not.toHaveBeenCalled();
  });

  test('checkEmailAddressRateLimit skips when query email is missing', () => {
    const req = { query: {} };
    const res = createResponseMock();
    const next = jest.fn();

    checkEmailAddressRateLimit(req, res, next);

    expect(next).toHaveBeenCalledWith();
    expect(res.set).not.toHaveBeenCalled();
  });

  test('checkEmailAddressRateLimit skips when email is non-string', () => {
    const req = { query: { email: 12345 } };
    const res = createResponseMock();
    const next = jest.fn();

    checkEmailAddressRateLimit(req, res, next);

    expect(next).toHaveBeenCalledWith();
    expect(res.set).not.toHaveBeenCalled();
  });

  test('resetCheckEmailRateLimiters resets both default limiters', () => {
    const req = { ip: '127.0.0.1', query: { email: 'a@example.com' } };
    const res = createResponseMock();
    const next = jest.fn();

    for (let i = 0; i < 6; i += 1) {
      checkEmailAddressRateLimit(req, res, next);
    }

    resetCheckEmailRateLimiters();

    const afterResetNext = jest.fn();
    checkEmailAddressRateLimit(req, res, afterResetNext);
    expect(afterResetNext).toHaveBeenCalledWith();
  });
});
