import jwt from 'jsonwebtoken';
import { jest } from '@jest/globals';
import {
  optionalAuth,
  requireAuth,
  requireAuthIfOwner,
  requireAdmin,
  requireAdminOrModerator,
  loadAdminOrModeratorStatus,
} from '../../../src/middleware/auth.middleware.js';
import { ApiError } from '../../../src/utils/ApiError.js';
import { env } from '../../../src/config/env.js';
import { prisma } from '../../../src/db/prisma.js';

describe('auth.middleware', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    prisma.user.findUnique = jest.fn().mockResolvedValue({
      id: 'u1',
      email: 'a@example.com',
      deletedAt: null,
    });
  });

  test('rejects missing Authorization header', async () => {
    const req = { headers: {} };
    const res = {};
    const next = jest.fn();

    await requireAuth(req, res, next);

    const err = next.mock.calls[0][0];
    expect(err).toBeInstanceOf(ApiError);
    expect(err.status).toBe(401);
    expect(err.code).toBe('AUTH_REQUIRED');
  });

  test('rejects invalid token', async () => {
    const req = { headers: { authorization: 'Bearer bad' } };
    const res = {};
    const next = jest.fn();

    await requireAuth(req, res, next);

    const err = next.mock.calls[0][0];
    expect(err).toBeInstanceOf(ApiError);
    expect(err.code).toBe('INVALID_TOKEN');
  });

  test('accepts valid token and sets req.user from database', async () => {
    const token = jwt.sign({ email: 'a@example.com' }, env.jwtAccessSecret, {
      subject: 'u1',
      expiresIn: 60,
    });

    const req = { headers: { authorization: `Bearer ${token}` } };
    const res = {};
    const next = jest.fn();

    await requireAuth(req, res, next);

    expect(req.user).toEqual({ id: 'u1', email: 'a@example.com' });
    expect(next).toHaveBeenCalledWith();
  });

  test('rejects token for soft-deleted user', async () => {
    prisma.user.findUnique = jest.fn().mockResolvedValue({
      id: 'u1',
      email: 'a@example.com',
      deletedAt: new Date('2026-03-14T12:00:00Z'),
    });

    const token = jwt.sign({ email: 'a@example.com' }, env.jwtAccessSecret, {
      subject: 'u1',
      expiresIn: 60,
    });

    const req = { headers: { authorization: `Bearer ${token}` } };
    const res = {};
    const next = jest.fn();

    await requireAuth(req, res, next);

    const err = next.mock.calls[0][0];
    expect(err).toBeInstanceOf(ApiError);
    expect(err.code).toBe('INVALID_TOKEN');
  });

  describe('requireAuthIfOwner', () => {
    test('allows public access when owner query is not present', async () => {
      const req = { headers: {}, query: {} };
      const res = {};
      const next = jest.fn();

      await requireAuthIfOwner(req, res, next);

      expect(req.user).toBeUndefined();
      expect(next).toHaveBeenCalledWith();
    });

    test('allows public access when owner=false', async () => {
      const req = { headers: {}, query: { owner: 'false' } };
      const res = {};
      const next = jest.fn();

      await requireAuthIfOwner(req, res, next);

      expect(req.user).toBeUndefined();
      expect(next).toHaveBeenCalledWith();
    });

    test('requires auth when owner=true', async () => {
      const req = { headers: {}, query: { owner: 'true' } };
      const res = {};
      const next = jest.fn();

      await requireAuthIfOwner(req, res, next);

      const err = next.mock.calls[0][0];
      expect(err).toBeInstanceOf(ApiError);
      expect(err.status).toBe(401);
      expect(err.code).toBe('AUTH_REQUIRED');
    });

    test('accepts valid token when owner=true', async () => {
      const token = jwt.sign({ email: 'a@example.com' }, env.jwtAccessSecret, {
        subject: 'u1',
        expiresIn: 60,
      });

      const req = { headers: { authorization: `Bearer ${token}` }, query: { owner: 'true' } };
      const res = {};
      const next = jest.fn();

      await requireAuthIfOwner(req, res, next);

      expect(req.user).toEqual({ id: 'u1', email: 'a@example.com' });
      expect(next).toHaveBeenCalledWith();
    });

    test('rejects invalid token when owner=true', async () => {
      const req = { headers: { authorization: 'Bearer bad' }, query: { owner: 'true' } };
      const res = {};
      const next = jest.fn();

      await requireAuthIfOwner(req, res, next);

      const err = next.mock.calls[0][0];
      expect(err).toBeInstanceOf(ApiError);
      expect(err.code).toBe('INVALID_TOKEN');
    });

    test('rejects token for soft-deleted user when owner=true', async () => {
      prisma.user.findUnique = jest.fn().mockResolvedValue({
        id: 'u1',
        email: 'a@example.com',
        deletedAt: new Date('2026-03-14T12:00:00Z'),
      });

      const token = jwt.sign({ email: 'a@example.com' }, env.jwtAccessSecret, {
        subject: 'u1',
        expiresIn: 60,
      });

      const req = { headers: { authorization: `Bearer ${token}` }, query: { owner: 'true' } };
      const res = {};
      const next = jest.fn();

      await requireAuthIfOwner(req, res, next);

      const err = next.mock.calls[0][0];
      expect(err).toBeInstanceOf(ApiError);
      expect(err.code).toBe('INVALID_TOKEN');
    });
  });

  describe('optionalAuth', () => {
    test('continues without auth when token is missing', async () => {
      const req = { headers: {} };
      const res = {};
      const next = jest.fn();

      await optionalAuth(req, res, next);

      expect(req.user).toBeUndefined();
      expect(next).toHaveBeenCalledWith();
    });

    test('continues as public user for soft-deleted token subject', async () => {
      prisma.user.findUnique = jest.fn().mockResolvedValue({
        id: 'u1',
        email: 'a@example.com',
        deletedAt: new Date('2026-03-14T12:00:00Z'),
      });

      const token = jwt.sign({ email: 'a@example.com' }, env.jwtAccessSecret, {
        subject: 'u1',
        expiresIn: 60,
      });

      const req = { headers: { authorization: `Bearer ${token}` } };
      const res = {};
      const next = jest.fn();

      await optionalAuth(req, res, next);

      expect(req.user).toBeUndefined();
      expect(next).toHaveBeenCalledWith();
    });

    test('continues as public user for invalid token', async () => {
      const req = { headers: { authorization: 'Bearer bad' } };
      const res = {};
      const next = jest.fn();

      await optionalAuth(req, res, next);

      expect(req.user).toBeUndefined();
      expect(next).toHaveBeenCalledWith();
    });

    test('continues without user when token payload has no supported user id field', async () => {
      const token = jwt.sign({ email: 'a@example.com' }, env.jwtAccessSecret, {
        expiresIn: 60,
      });

      const req = { headers: { authorization: `Bearer ${token}` } };
      const res = {};
      const next = jest.fn();

      await optionalAuth(req, res, next);

      expect(req.user).toBeUndefined();
      expect(next).toHaveBeenCalledWith();
    });
  });

  describe('requireAdmin', () => {
    test('rejects when req.user is missing', async () => {
      const req = {};
      const res = {};
      const next = jest.fn();

      await requireAdmin(req, res, next);

      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({ status: 401, code: 'AUTH_REQUIRED' })
      );
    });

    test('rejects when user is not found', async () => {
      prisma.user.findUnique = jest.fn().mockResolvedValue(null);
      const req = { user: { id: 'u1' } };
      const res = {};
      const next = jest.fn();

      await requireAdmin(req, res, next);

      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({ status: 401, code: 'USER_NOT_FOUND' })
      );
    });

    test('rejects when user lacks admin role', async () => {
      prisma.user.findUnique = jest.fn().mockResolvedValue({ roles: ['MODERATOR'] });
      const req = { user: { id: 'u1' } };
      const res = {};
      const next = jest.fn();

      await requireAdmin(req, res, next);

      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({ status: 403, code: 'FORBIDDEN' })
      );
    });

    test('allows admin user', async () => {
      prisma.user.findUnique = jest.fn().mockResolvedValue({ roles: ['ADMIN'] });
      const req = { user: { id: 'u1' } };
      const res = {};
      const next = jest.fn();

      await requireAdmin(req, res, next);

      expect(next).toHaveBeenCalledWith();
    });

    test('returns internal error when role lookup fails', async () => {
      prisma.user.findUnique = jest.fn().mockRejectedValue(new Error('db failed'));
      const req = { user: { id: 'u1' } };
      const res = {};
      const next = jest.fn();

      await requireAdmin(req, res, next);

      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({ status: 500, code: 'INTERNAL_ERROR' })
      );
    });
  });

  describe('requireAdminOrModerator', () => {
    test('rejects when req.user is missing', async () => {
      const req = {};
      const res = {};
      const next = jest.fn();

      await requireAdminOrModerator(req, res, next);

      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({ status: 401, code: 'AUTH_REQUIRED' })
      );
    });

    test('rejects when user is not found', async () => {
      prisma.user.findUnique = jest.fn().mockResolvedValue(null);
      const req = { user: { id: 'u1' } };
      const res = {};
      const next = jest.fn();

      await requireAdminOrModerator(req, res, next);

      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({ status: 401, code: 'USER_NOT_FOUND' })
      );
    });

    test('rejects when user lacks both admin and moderator roles', async () => {
      prisma.user.findUnique = jest.fn().mockResolvedValue({ roles: ['USER'] });
      const req = { user: { id: 'u1' } };
      const res = {};
      const next = jest.fn();

      await requireAdminOrModerator(req, res, next);

      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({ status: 403, code: 'FORBIDDEN' })
      );
    });

    test('allows moderator user', async () => {
      prisma.user.findUnique = jest.fn().mockResolvedValue({ roles: ['MODERATOR'] });
      const req = { user: { id: 'u1' } };
      const res = {};
      const next = jest.fn();

      await requireAdminOrModerator(req, res, next);

      expect(next).toHaveBeenCalledWith();
    });

    test('returns internal error when role lookup fails', async () => {
      prisma.user.findUnique = jest.fn().mockRejectedValue(new Error('db failed'));
      const req = { user: { id: 'u1' } };
      const res = {};
      const next = jest.fn();

      await requireAdminOrModerator(req, res, next);

      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({ status: 500, code: 'INTERNAL_ERROR' })
      );
    });
  });

  describe('loadAdminOrModeratorStatus', () => {
    test('sets false when request has no authenticated user', async () => {
      const req = {};
      const res = {};
      const next = jest.fn();

      await loadAdminOrModeratorStatus(req, res, next);

      expect(req.user).toEqual({ isAdminOrModerator: false });
      expect(next).toHaveBeenCalledWith();
    });

    test('sets false when user role record is missing', async () => {
      prisma.user.findUnique = jest.fn().mockResolvedValue(null);
      const req = { user: { id: 'u1' } };
      const res = {};
      const next = jest.fn();

      await loadAdminOrModeratorStatus(req, res, next);

      expect(req.user.isAdminOrModerator).toBe(false);
      expect(next).toHaveBeenCalledWith();
    });

    test('sets true for admin user', async () => {
      prisma.user.findUnique = jest.fn().mockResolvedValue({ roles: ['ADMIN'] });
      const req = { user: { id: 'u1' } };
      const res = {};
      const next = jest.fn();

      await loadAdminOrModeratorStatus(req, res, next);

      expect(req.user.isAdminOrModerator).toBe(true);
      expect(next).toHaveBeenCalledWith();
    });

    test('defaults to false when role lookup throws', async () => {
      prisma.user.findUnique = jest.fn().mockRejectedValue(new Error('db failed'));
      const req = { user: { id: 'u1' } };
      const res = {};
      const next = jest.fn();

      await loadAdminOrModeratorStatus(req, res, next);

      expect(req.user.isAdminOrModerator).toBe(false);
      expect(next).toHaveBeenCalledWith();
    });
  });
});
