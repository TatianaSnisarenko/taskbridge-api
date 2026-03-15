import { jest } from '@jest/globals';

import { validateCreateMessageRequest } from '../../../src/middleware/validate-chat-message.middleware.js';

describe('validateCreateMessageRequest', () => {
  test('accepts text-only payload', () => {
    const req = {
      body: { text: 'Hello' },
      files: [],
    };
    const res = {};
    const next = jest.fn();

    validateCreateMessageRequest(req, res, next);

    expect(next).toHaveBeenCalledWith();
    expect(req.body.text).toBe('Hello');
  });

  test('accepts file-only payload', () => {
    const req = {
      body: {},
      files: [{ originalname: 'spec.pdf', mimetype: 'application/pdf', size: 512 }],
    };
    const res = {};
    const next = jest.fn();

    validateCreateMessageRequest(req, res, next);

    expect(next).toHaveBeenCalledWith();
    expect(req.body.text).toBe('');
  });

  test('accepts text payload when files is not an array and normalizes files to empty array', () => {
    const req = {
      body: { text: 'Hello' },
      files: null,
    };
    const next = jest.fn();

    validateCreateMessageRequest(req, {}, next);

    expect(next).toHaveBeenCalledWith();
    expect(req.files).toEqual([]);
  });

  test('rejects when both text and files are missing', () => {
    const req = {
      body: { text: '   ' },
      files: [],
    };
    const res = {};
    const next = jest.fn();

    validateCreateMessageRequest(req, res, next);

    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 400,
        code: 'VALIDATION_ERROR',
        details: [
          {
            field: 'text or files',
            message: 'Either text or at least one file is required',
          },
        ],
      })
    );
  });

  test('rejects too many files', () => {
    const req = {
      body: { text: 'Hello' },
      files: Array.from({ length: 11 }, (_, index) => ({
        originalname: `file-${index}.pdf`,
        mimetype: 'application/pdf',
        size: 512,
      })),
    };
    const res = {};
    const next = jest.fn();

    validateCreateMessageRequest(req, res, next);

    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 400,
        code: 'VALIDATION_ERROR',
        details: [{ field: 'files', message: 'Files count must not exceed 10' }],
      })
    );
  });

  test('rejects empty file with field/message shape', () => {
    const req = {
      body: {},
      files: [{ originalname: 'spec.pdf', mimetype: 'application/pdf', size: 0 }],
    };
    const res = {};
    const next = jest.fn();

    validateCreateMessageRequest(req, res, next);

    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 400,
        code: 'VALIDATION_ERROR',
        details: [{ field: 'files[0]', message: 'File must not be empty' }],
      })
    );
  });

  test('rejects missing file name with indexed field path', () => {
    const req = {
      body: {},
      files: [{ mimetype: 'application/pdf', size: 128 }],
    };
    const next = jest.fn();

    validateCreateMessageRequest(req, {}, next);

    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 400,
        code: 'VALIDATION_ERROR',
        details: expect.arrayContaining([
          expect.objectContaining({
            field: 'files[0]',
          }),
        ]),
      })
    );
  });
});
