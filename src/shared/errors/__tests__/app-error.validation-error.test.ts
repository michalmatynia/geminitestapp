import { describe, expect, it } from 'vitest';

import { AppErrorCodes, badRequestError, validationError } from '@/shared/errors/app-error';

describe('validationError', () => {
  it('preserves validation messages verbatim', () => {
    const messages = [
      'Legacy AI Paths trigger output ports are no longer supported.',
      'Legacy AI Paths trigger data edges are no longer supported.',
      'Legacy AI Paths runtime identity fields are no longer supported.',
    ];

    for (const message of messages) {
      const error = validationError(message);
      expect(error.message).toBe(message);
      expect(error.code).toBe(AppErrorCodes.validation);
      expect(error.httpStatus).toBe(400);
    }
  });
});

describe('AppError.withCause', () => {
  it('preserves error metadata while attaching the original cause', () => {
    const cause = new Error('invalid json');
    const error = badRequestError('Invalid JSON payload', { body: 'raw' }).withCause(cause);

    expect(error.message).toBe('Invalid JSON payload');
    expect(error.code).toBe(AppErrorCodes.badRequest);
    expect(error.httpStatus).toBe(400);
    expect(error.meta).toEqual({ body: 'raw' });
    expect(error.cause).toBe(cause);
  });
});
