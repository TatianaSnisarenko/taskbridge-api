import { jest } from '@jest/globals';
import { validate } from '../../src/middleware/validate.middleware.js';

describe('validate middleware', () => {
  test('passes validation errors to next', () => {
    const schema = {
      validate: () => ({ error: new Error('bad'), value: null }),
    };
    const middleware = validate(schema);

    const req = { body: { foo: 'bar' } };
    const res = {};
    const next = jest.fn();

    middleware(req, res, next);

    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });

  test('assigns sanitized value to request', () => {
    const schema = {
      validate: () => ({ error: null, value: { ok: true } }),
    };
    const middleware = validate(schema, 'query');

    const req = { query: { raw: 'value' } };
    const res = {};
    const next = jest.fn();

    middleware(req, res, next);

    expect(req.query).toEqual({ ok: true });
    expect(next).toHaveBeenCalledWith();
  });
});
