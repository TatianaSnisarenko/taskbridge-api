import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { ApiError } from '../utils/ApiError.js';

export function requireAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return next(new ApiError(401, 'AUTH_REQUIRED', 'Authorization header missing'));
  }

  const token = header.slice('Bearer '.length);
  try {
    const payload = jwt.verify(token, env.jwtAccessSecret);
    req.user = {
      id: payload.sub,
      email: payload.email,
    };
    return next();
  } catch {
    return next(new ApiError(401, 'INVALID_TOKEN', 'Access token is invalid or expired'));
  }
}

export function requireAuthIfOwner(req, res, next) {
  const isOwnerQuery = req.query.owner === 'true' || req.query.owner === true;

  if (!isOwnerQuery) {
    // Public access - no auth required
    return next();
  }

  // owner=true requires authentication
  const header = req.headers.authorization;

  if (!header || !header.startsWith('Bearer ')) {
    return next(new ApiError(401, 'AUTH_REQUIRED', 'Authorization required for owner filter'));
  }

  const token = header.slice('Bearer '.length);
  try {
    const payload = jwt.verify(token, env.jwtAccessSecret);
    req.user = {
      id: payload.sub,
      email: payload.email,
    };
    return next();
  } catch {
    return next(new ApiError(401, 'INVALID_TOKEN', 'Access token is invalid or expired'));
  }
}
