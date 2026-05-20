import { describe, expect, it } from 'vitest';

import { AppErrorCodes } from '@/shared/errors/app-error';
import { mapErrorToAppError, mapStatusToAppError } from '@/shared/errors/error-mapper';

describe('error-mapper', () => {
  it('maps rate-limited statuses with retry metadata', () => {
    const error = mapStatusToAppError('', 429, { retryAfterMs: 2500 });

    expect(error.code).toBe(AppErrorCodes.rateLimited);
    expect(error.httpStatus).toBe(429);
    expect(error.retryAfterMs).toBe(2500);
  });

  it('maps generic 5xx statuses to external service errors', () => {
    const error = mapStatusToAppError('Gateway failed', 502);

    expect(error.code).toBe(AppErrorCodes.externalService);
    expect(error.httpStatus).toBe(502);
    expect(error.message).toContain('Gateway failed');
  });

  it('maps status-bearing errors and expands retryAfter seconds to milliseconds', () => {
    const error = mapErrorToAppError({
      status: 503,
      message: 'Try later',
      retryAfter: 3,
    });

    expect(error?.code).toBe(AppErrorCodes.serviceUnavailable);
    expect(error?.retryAfterMs).toBe(3000);
  });

  it('tells the operator to start the local database server for local Mongo connection refusal', () => {
    const error = mapErrorToAppError({
      name: 'MongoServerSelectionError',
      message: 'connect ECONNREFUSED 127.0.0.1:27022',
    });

    expect(error?.code).toBe(AppErrorCodes.databaseError);
    expect(error?.httpStatus).toBe(503);
    expect(error?.message).toContain('Start the database server');
    expect(error?.expected).toBe(true);
    expect(error?.retryable).toBe(true);
    expect(error?.retryAfterMs).toBe(5000);
  });
});
