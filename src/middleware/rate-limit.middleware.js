import { ApiError } from '../utils/ApiError.js';

function normalizeEmail(value) {
  return typeof value === 'string' ? value.trim().toLowerCase() : '';
}

export function createRateLimitMiddleware({
  maxRequests,
  windowMs,
  keyExtractor,
  code = 'RATE_LIMIT_EXCEEDED',
  message = 'Too many requests. Please try again later.',
}) {
  const hitsByKey = new Map();

  const middleware = (req, res, next) => {
    const key = keyExtractor(req);
    if (!key) return next();

    const now = Date.now();
    const timestamps = hitsByKey.get(key) || [];
    const validTimestamps = timestamps.filter((timestamp) => now - timestamp < windowMs);

    if (validTimestamps.length >= maxRequests) {
      const retryAfterSeconds = Math.max(
        1,
        Math.ceil((validTimestamps[0] + windowMs - now) / 1000)
      );
      res.set('Retry-After', String(retryAfterSeconds));
      return next(new ApiError(429, code, message));
    }

    validTimestamps.push(now);
    hitsByKey.set(key, validTimestamps);
    return next();
  };

  middleware.reset = () => {
    hitsByKey.clear();
  };

  return middleware;
}

export const checkEmailIpRateLimit = createRateLimitMiddleware({
  maxRequests: 10,
  windowMs: 60 * 1000,
  keyExtractor: (req) => req.ip,
});

export const checkEmailAddressRateLimit = createRateLimitMiddleware({
  maxRequests: 5,
  windowMs: 10 * 60 * 1000,
  keyExtractor: (req) => {
    const email = normalizeEmail(req.query?.email);
    return email ? `email:${email}` : null;
  },
});

export function resetCheckEmailRateLimiters() {
  checkEmailIpRateLimit.reset();
  checkEmailAddressRateLimit.reset();
}
