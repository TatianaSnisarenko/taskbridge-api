import jwt from 'jsonwebtoken';
import { jest } from '@jest/globals';
import {
  optionalAuth,
  requireAuth,
  requireAuthIfOwner,
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
  });
});
