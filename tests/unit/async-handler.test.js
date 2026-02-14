import { jest } from '@jest/globals';
import { asyncHandler } from '../../src/utils/asyncHandler.js';

describe('asyncHandler', () => {
  test('calls handler and does not invoke next on success', async () => {
    const handler = jest.fn().mockResolvedValue(undefined);
    const wrapped = asyncHandler(handler);

    const req = {};
    const res = {};
    const next = jest.fn();

    await wrapped(req, res, next);

    expect(handler).toHaveBeenCalledWith(req, res, next);
    expect(next).not.toHaveBeenCalled();
  });

  test('forwards errors to next', async () => {
    const err = new Error('boom');
    const handler = jest.fn().mockRejectedValue(err);
    const wrapped = asyncHandler(handler);

    const req = {};
    const res = {};
    const next = jest.fn();

    await wrapped(req, res, next);

    expect(next).toHaveBeenCalledWith(err);
  });
});
