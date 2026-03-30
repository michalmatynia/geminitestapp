import { describe, expect, it } from 'vitest';

import { isAbortLikeError } from '@/shared/utils/observability/is-abort-like-error';

describe('isAbortLikeError', () => {
  it('returns true for aborted signals', () => {
    const controller = new AbortController();
    controller.abort();

    expect(isAbortLikeError(new Error('anything'), controller.signal)).toBe(true);
  });

  it('returns true for abort-like names and messages', () => {
    const canceled = new Error('Request aborted');
    canceled.name = 'CanceledError';

    expect(isAbortLikeError(canceled)).toBe(true);
    expect(isAbortLikeError({ message: 'operation was aborted by the caller' })).toBe(true);
  });

  it('returns false for non-abort errors', () => {
    expect(isAbortLikeError(new Error('Validation failed'))).toBe(false);
    expect(isAbortLikeError({ name: 'TypeError', message: 'Nope' })).toBe(false);
  });
});
