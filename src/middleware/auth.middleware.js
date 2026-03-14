import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { ApiError } from '../utils/ApiError.js';
import { prisma } from '../db/prisma.js';

const ADMIN_ROLE = 'ADMIN';
const MODERATOR_ROLE = 'MODERATOR';

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

async function loadActiveUser(userId) {
  return prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      deletedAt: true,
    },
  });
}

function hasAnyRole(userRoles, allowedRoles) {
  if (!Array.isArray(userRoles)) return false;
  return allowedRoles.some((role) => userRoles.includes(role));
}

async function loadUserRoles(userId) {
  return prisma.user.findUnique({
    where: { id: userId },
    select: { roles: true },
  });
}

export async function requireAuth(req, res, next) {
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

    const activeUser = await loadActiveUser(user.id);
    if (!activeUser || activeUser.deletedAt) {
      return next(new ApiError(401, 'INVALID_TOKEN', 'Access token is invalid or expired'));
    }

    req.user = {
      id: activeUser.id,
      email: activeUser.email,
    };
    return next();
  } catch {
    return next(new ApiError(401, 'INVALID_TOKEN', 'Access token is invalid or expired'));
  }
}

export async function requireAuthIfOwner(req, res, next) {
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

    const activeUser = await loadActiveUser(user.id);
    if (!activeUser || activeUser.deletedAt) {
      return next(new ApiError(401, 'INVALID_TOKEN', 'Access token is invalid or expired'));
    }

    req.user = {
      id: activeUser.id,
      email: activeUser.email,
    };
    return next();
  } catch {
    return next(new ApiError(401, 'INVALID_TOKEN', 'Access token is invalid or expired'));
  }
}

/**
 * Optional authentication - sets req.user if valid token provided, but doesn't require it
 */
export async function optionalAuth(req, res, next) {
  const header = req.headers.authorization;
  const token = extractBearerToken(header);

  if (!token) {
    // No token provided - continue without user
    return next();
  }

  try {
    const payload = jwt.verify(token, env.jwtAccessSecret);

    const user = mapAuthUser(payload);
    if (!user) {
      return next();
    }

    const activeUser = await loadActiveUser(user.id);
    if (!activeUser || activeUser.deletedAt) {
      return next();
    }

    req.user = {
      id: activeUser.id,
      email: activeUser.email,
    };
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
    const user = await loadUserRoles(req.user.id);

    if (!user) {
      return next(new ApiError(401, 'USER_NOT_FOUND', 'User not found'));
    }

    if (!hasAnyRole(user.roles, [ADMIN_ROLE])) {
      return next(new ApiError(403, 'FORBIDDEN', 'Admin access required'));
    }

    return next();
  } catch {
    return next(new ApiError(500, 'INTERNAL_ERROR', 'Failed to verify admin role'));
  }
}

export async function requireAdminOrModerator(req, res, next) {
  if (!req.user?.id) {
    return next(new ApiError(401, 'AUTH_REQUIRED', 'Authentication required'));
  }

  try {
    const user = await loadUserRoles(req.user.id);

    if (!user) {
      return next(new ApiError(401, 'USER_NOT_FOUND', 'User not found'));
    }

    if (!hasAnyRole(user.roles, [ADMIN_ROLE, MODERATOR_ROLE])) {
      return next(new ApiError(403, 'FORBIDDEN', 'Admin or moderator access required'));
    }

    return next();
  } catch {
    return next(new ApiError(500, 'INTERNAL_ERROR', 'Failed to verify access role'));
  }
}

/**
 * Loads admin/moderator status into req.user.isAdminOrModerator
 * Attach after optionalAuth or requireAuth to enrich request context
 */
export async function loadAdminOrModeratorStatus(req, res, next) {
  if (!req.user?.id) {
    // No authenticated user - skip
    req.user = req.user || {};
    req.user.isAdminOrModerator = false;
    return next();
  }

  try {
    const user = await loadUserRoles(req.user.id);
    req.user.isAdminOrModerator = user
      ? hasAnyRole(user.roles, [ADMIN_ROLE, MODERATOR_ROLE])
      : false;
    return next();
  } catch {
    // On error, default to false privilege
    req.user.isAdminOrModerator = false;
    return next();
  }
}
