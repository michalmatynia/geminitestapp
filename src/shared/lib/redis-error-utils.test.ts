import { describe, expect, it } from 'vitest';

import { isTransientRedisTransportError } from './redis-error-utils';

describe('isTransientRedisTransportError', () => {
  it('matches known transport error codes', () => {
    const error = new Error('socket blew up') as Error & { code?: string };
    error.code = 'econnreset';

    expect(isTransientRedisTransportError(error)).toBe(true);
  });

  it('matches known transport error message fragments', () => {
    expect(isTransientRedisTransportError(new Error('Socket closed unexpectedly by peer'))).toBe(
      true
    );
  });

  it('rejects unrelated errors', () => {
    expect(isTransientRedisTransportError(new Error('validation failed'))).toBe(false);
    expect(isTransientRedisTransportError('EPIPE')).toBe(false);
  });
});
