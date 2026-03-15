import { jest } from '@jest/globals';
import { ApiError } from '../../../src/utils/ApiError.js';
import { errorMiddleware } from '../../../src/middleware/error.middleware.js';

describe('error.middleware', () => {
  test('forwards error when headers were already sent', () => {
    const err = new Error('Already sent');
    const next = jest.fn();
    const res = {
      headersSent: true,
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    errorMiddleware(err, {}, res, next);

    expect(next).toHaveBeenCalledWith(err);
    expect(res.status).not.toHaveBeenCalled();
    expect(res.json).not.toHaveBeenCalled();
  });

  test('handles ApiError', () => {
    const err = new ApiError(401, 'AUTH_REQUIRED', 'Missing auth');
    const req = {};
    const res = {
      headersSent: false,
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    errorMiddleware(err, req, res, jest.fn());

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      error: { code: 'AUTH_REQUIRED', message: 'Missing auth', details: undefined },
    });
  });

  test('handles invalid JSON', () => {
    const err = new SyntaxError('Bad JSON');
    err.type = 'entity.parse.failed';
    const req = {};
    const res = {
      headersSent: false,
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    errorMiddleware(err, req, res, jest.fn());

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      error: { code: 'INVALID_JSON', message: 'Invalid JSON format', details: undefined },
    });
  });

  test('handles Joi validation errors', () => {
    const err = {
      isJoi: true,
      details: [{ path: ['email'], message: 'Email is required' }],
    };
    const req = {};
    const res = {
      headersSent: false,
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    errorMiddleware(err, req, res, jest.fn());

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Validation failed',
        details: [{ field: 'email', issue: 'Email is required' }],
      },
    });
  });

  test('handles Joi object.missing errors', () => {
    const err = {
      isJoi: true,
      details: [
        {
          path: [],
          type: 'object.missing',
          context: { peers: ['email', 'password'] },
          message: 'Missing fields',
        },
      ],
    };
    const req = {};
    const res = {
      headersSent: false,
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    errorMiddleware(err, req, res, jest.fn());

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Validation failed',
        details: [{ field: 'email or password', issue: 'Missing fields' }],
      },
    });
  });

  test('handles Joi validation fallback field and issue values', () => {
    const err = {
      isJoi: true,
      details: [
        {
          path: [],
          type: 'string.empty',
        },
      ],
    };
    const res = {
      headersSent: false,
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    errorMiddleware(err, {}, res, jest.fn());

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Validation failed',
        details: [{ field: 'body', issue: 'string.empty' }],
      },
    });
  });

  test('handles CORS errors', () => {
    const err = new Error('CORS: blocked');
    const req = {};
    const res = {
      headersSent: false,
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    errorMiddleware(err, req, res, jest.fn());

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({
      error: { code: 'CORS_NOT_ALLOWED', message: 'CORS: blocked', details: undefined },
    });
  });

  test('handles unknown errors', () => {
    const err = new Error('Boom');
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const req = {};
    const res = {
      headersSent: false,
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    errorMiddleware(err, req, res, jest.fn());

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      error: { code: 'INTERNAL_ERROR', message: 'Internal server error', details: undefined },
    });

    errorSpy.mockRestore();
  });
});
