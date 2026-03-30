import { describe, expect, it } from 'vitest';

import { isKangurAuthStatusError, isKangurStatusError } from '../status-errors';

describe('isKangurStatusError', () => {
  it('returns true only when error-like value contains numeric status', () => {
    expect(isKangurStatusError({ status: 500 })).toBe(true);
    expect(isKangurStatusError({ status: 401, message: 'Unauthorized' })).toBe(true);
    expect(isKangurStatusError({ status: '401' })).toBe(false);
    expect(isKangurStatusError(new Error('boom'))).toBe(false);
    expect(isKangurStatusError(null)).toBe(false);
  });
});

describe('isKangurAuthStatusError', () => {
  it('matches only 401 and 403 status errors', () => {
    expect(isKangurAuthStatusError({ status: 401 })).toBe(true);
    expect(isKangurAuthStatusError({ status: 403 })).toBe(true);
    expect(isKangurAuthStatusError({ status: 500 })).toBe(false);
    expect(isKangurAuthStatusError({ status: '403' })).toBe(false);
    expect(isKangurAuthStatusError(undefined)).toBe(false);
  });
});
