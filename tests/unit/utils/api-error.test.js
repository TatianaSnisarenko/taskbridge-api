import { ApiError, errorResponse } from '../../../src/utils/ApiError.js';

describe('ApiError', () => {
  test('stores status, code, message, and details', () => {
    const err = new ApiError(400, 'BAD_REQUEST', 'Invalid input', [{ field: 'email' }]);

    expect(err.status).toBe(400);
    expect(err.code).toBe('BAD_REQUEST');
    expect(err.message).toBe('Invalid input');
    expect(err.details).toEqual([{ field: 'email' }]);
  });

  test('errorResponse formats error payload', () => {
    const err = new ApiError(401, 'AUTH_REQUIRED', 'Missing auth');

    expect(errorResponse(err)).toEqual({
      error: {
        code: 'AUTH_REQUIRED',
        message: 'Missing auth',
        details: undefined,
      },
    });
  });

  test('errorResponse falls back to defaults', () => {
    const err = new Error('Oops');

    expect(errorResponse(err)).toEqual({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Oops',
        details: undefined,
      },
    });
  });
});
