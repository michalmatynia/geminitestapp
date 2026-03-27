import { describe, expect, it } from 'vitest';

import { isMissingRequestScopeError } from './request-scope-error';

describe('isMissingRequestScopeError', () => {
  it('matches the Next request-scope error shape', () => {
    expect(isMissingRequestScopeError(new Error('`headers` was called outside a request scope'))).toBe(
      true
    );
    expect(isMissingRequestScopeError(new Error('`cookies` was called outside a request scope'))).toBe(
      true
    );
  });

  it('rejects unrelated values', () => {
    expect(isMissingRequestScopeError(new Error('database unavailable'))).toBe(false);
    expect(isMissingRequestScopeError('outside a request scope')).toBe(false);
    expect(isMissingRequestScopeError(null)).toBe(false);
  });
});
