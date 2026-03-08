import jwt from 'jsonwebtoken';
import { jest } from '@jest/globals';
import { requireAuth, requireAuthIfOwner } from '../../../src/middleware/auth.middleware.js';
import { ApiError } from '../../../src/utils/ApiError.js';
import { env } from '../../../src/config/env.js';

describe('auth.middleware', () => {
  test('rejects missing Authorization header', () => {
    const req = { headers: {} };
    const res = {};
    const next = jest.fn();

    requireAuth(req, res, next);

    const err = next.mock.calls[0][0];
    expect(err).toBeInstanceOf(ApiError);
    expect(err.status).toBe(401);
    expect(err.code).toBe('AUTH_REQUIRED');
  });

  test('rejects invalid token', () => {
    const req = { headers: { authorization: 'Bearer bad' } };
    const res = {};
    const next = jest.fn();

    requireAuth(req, res, next);

    const err = next.mock.calls[0][0];
    expect(err).toBeInstanceOf(ApiError);
    expect(err.code).toBe('INVALID_TOKEN');
  });

  test('accepts valid token and sets req.user', () => {
    const token = jwt.sign({ email: 'a@example.com' }, env.jwtAccessSecret, {
      subject: 'u1',
      expiresIn: 60,
    });

    const req = { headers: { authorization: `Bearer ${token}` } };
    const res = {};
    const next = jest.fn();

    requireAuth(req, res, next);

    expect(req.user).toEqual({ id: 'u1', email: 'a@example.com' });
    expect(next).toHaveBeenCalledWith();
  });

  describe('requireAuthIfOwner', () => {
    test('allows public access when owner query is not present', () => {
      const req = { headers: {}, query: {} };
      const res = {};
      const next = jest.fn();

      requireAuthIfOwner(req, res, next);

      expect(req.user).toBeUndefined();
      expect(next).toHaveBeenCalledWith();
    });

    test('allows public access when owner=false', () => {
      const req = { headers: {}, query: { owner: 'false' } };
      const res = {};
      const next = jest.fn();

      requireAuthIfOwner(req, res, next);

      expect(req.user).toBeUndefined();
      expect(next).toHaveBeenCalledWith();
    });

    test('requires auth when owner=true', () => {
      const req = { headers: {}, query: { owner: 'true' } };
      const res = {};
      const next = jest.fn();

      requireAuthIfOwner(req, res, next);

      const err = next.mock.calls[0][0];
      expect(err).toBeInstanceOf(ApiError);
      expect(err.status).toBe(401);
      expect(err.code).toBe('AUTH_REQUIRED');
    });

    test('accepts valid token when owner=true', () => {
      const token = jwt.sign({ email: 'a@example.com' }, env.jwtAccessSecret, {
        subject: 'u1',
        expiresIn: 60,
      });

      const req = { headers: { authorization: `Bearer ${token}` }, query: { owner: 'true' } };
      const res = {};
      const next = jest.fn();

      requireAuthIfOwner(req, res, next);

      expect(req.user).toEqual({ id: 'u1', email: 'a@example.com' });
      expect(next).toHaveBeenCalledWith();
    });

    test('rejects invalid token when owner=true', () => {
      const req = { headers: { authorization: 'Bearer bad' }, query: { owner: 'true' } };
      const res = {};
      const next = jest.fn();

      requireAuthIfOwner(req, res, next);

      const err = next.mock.calls[0][0];
      expect(err).toBeInstanceOf(ApiError);
      expect(err.code).toBe('INVALID_TOKEN');
    });
  });
});
