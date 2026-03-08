import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { ApiError } from '../utils/ApiError.js';
import { prisma } from '../db/prisma.js';

function extractBearerToken(header) {
  if (!header || typeof header !== 'string') return null;
  const match = header.match(/^Bearer\s+(.+)$/i);
  return match ? match[1] : null;
}

function mapAuthUser(payload) {
  const id = payload?.sub || payload?.userId || payload?.id || null;
  if (!id) return null;
  return {
    id,
    email: payload?.email,
  };
}

export function requireAuth(req, res, next) {
  const header = req.headers.authorization;
  const token = extractBearerToken(header);
  if (!token) {
    return next(new ApiError(401, 'AUTH_REQUIRED', 'Authorization header missing'));
  }

  try {
    const payload = jwt.verify(token, env.jwtAccessSecret);
    const user = mapAuthUser(payload);
    if (!user) {
      return next(new ApiError(401, 'INVALID_TOKEN', 'Access token payload is invalid'));
    }
    req.user = user;
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
  const token = extractBearerToken(header);
  if (!token) {
    return next(new ApiError(401, 'AUTH_REQUIRED', 'Authorization required for owner filter'));
  }

  try {
    const payload = jwt.verify(token, env.jwtAccessSecret);
    const user = mapAuthUser(payload);
    if (!user) {
      return next(new ApiError(401, 'INVALID_TOKEN', 'Access token payload is invalid'));
    }
    req.user = user;
    return next();
  } catch {
    return next(new ApiError(401, 'INVALID_TOKEN', 'Access token is invalid or expired'));
  }
}

/**
 * Optional authentication - sets req.user if valid token provided, but doesn't require it
 */
export function optionalAuth(req, res, next) {
  const header = req.headers.authorization;
  const token = extractBearerToken(header);

  if (!token) {
    // No token provided - continue without user
    return next();
  }

  try {
    const payload = jwt.verify(token, env.jwtAccessSecret);
    req.user = mapAuthUser(payload);
    return next();
  } catch {
    // Invalid token - continue without user (silently ignore)
    return next();
  }
}

/**
 * Requires admin role. Must be used after requireAuth middleware.
 */
export async function requireAdmin(req, res, next) {
  if (!req.user?.id) {
    return next(new ApiError(401, 'AUTH_REQUIRED', 'Authentication required'));
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { role: true },
    });

    if (!user) {
      return next(new ApiError(401, 'USER_NOT_FOUND', 'User not found'));
    }

    if (user.role !== 'ADMIN') {
      return next(new ApiError(403, 'FORBIDDEN', 'Admin access required'));
    }

    return next();
  } catch {
    return next(new ApiError(500, 'INTERNAL_ERROR', 'Failed to verify admin role'));
  }
}
