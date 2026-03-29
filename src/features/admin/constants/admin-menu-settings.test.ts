import { describe, expect, it, vi } from 'vitest';

import { parseAdminMenuBoolean } from './admin-menu-settings';

vi.mock('@/shared/utils/observability/client-error-logger', () => ({
  logClientError: vi.fn(),
}));

describe('parseAdminMenuBoolean', () => {
  it('parses direct boolean literals', () => {
    expect(parseAdminMenuBoolean('true')).toBe(true);
    expect(parseAdminMenuBoolean('0')).toBe(false);
  });

  it('falls back for empty values', () => {
    expect(parseAdminMenuBoolean(undefined, true)).toBe(true);
    expect(parseAdminMenuBoolean('', false)).toBe(false);
  });

  it('coerces JSON values when the literal parser does not match', () => {
    expect(parseAdminMenuBoolean('2')).toBe(true);
    expect(parseAdminMenuBoolean('null', true)).toBe(false);
  });
});
