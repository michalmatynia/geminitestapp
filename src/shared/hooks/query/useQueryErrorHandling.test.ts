import { describe, expect, it } from 'vitest';

import {
  buildErrorToastSignature,
  buildQueryErrorSignature,
} from '@/shared/hooks/query/useQueryErrorHandling';

describe('useQueryErrorHandling', () => {
  it('dedupes auth errors across different query keys', () => {
    const message = 'Unauthorized.';
    const authError = Object.assign(new Error(message), { status: 401 });

    const firstSignature = buildErrorToastSignature(['job-queue', 'runs'], message, authError);
    const secondSignature = buildErrorToastSignature(
      ['job-queue', 'queue-status'],
      message,
      authError
    );

    expect(firstSignature).toBe('AUTH::unauthorized.');
    expect(secondSignature).toBe(firstSignature);
  });

  it('keeps non-auth errors scoped to the query key', () => {
    const message = 'Database unavailable.';
    const error = new Error(message);

    const firstSignature = buildErrorToastSignature(['job-queue', 'runs'], message, error);
    const secondSignature = buildErrorToastSignature(['job-queue', 'queue-status'], message, error);

    expect(firstSignature).toBe(buildQueryErrorSignature(['job-queue', 'runs'], message));
    expect(secondSignature).toBe(buildQueryErrorSignature(['job-queue', 'queue-status'], message));
    expect(secondSignature).not.toBe(firstSignature);
  });
});
