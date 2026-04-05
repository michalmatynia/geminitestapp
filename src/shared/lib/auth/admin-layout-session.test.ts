import { describe, expect, it } from 'vitest';

import {
  buildAdminLayoutSessionHeaderValue,
  normalizeAdminLayoutSession,
  parseAdminLayoutSessionHeaderValue,
} from './admin-layout-session';

describe('admin layout session helpers', () => {
  it('round-trips a minimal admin session through the forwarded header value', () => {
    const value = buildAdminLayoutSessionHeaderValue({
      user: {
        id: 'user-1',
        name: 'Admin',
        email: 'admin@example.com',
        image: 'https://example.com/avatar.png',
        role: 'admin',
        roleLevel: 100,
        isElevated: true,
        roleAssigned: true,
        permissions: ['settings.manage', 'products.manage'],
        accountDisabled: false,
        accountBanned: false,
      },
    });

    expect(parseAdminLayoutSessionHeaderValue(value)).toEqual({
      user: {
        id: 'user-1',
        name: 'Admin',
        email: 'admin@example.com',
        image: 'https://example.com/avatar.png',
        role: 'admin',
        roleLevel: 100,
        isElevated: true,
        roleAssigned: true,
        permissions: ['settings.manage', 'products.manage'],
        accountDisabled: false,
        accountBanned: false,
      },
      expires: new Date(0).toISOString(),
    });
  });

  it('rejects malformed or incomplete payloads', () => {
    expect(parseAdminLayoutSessionHeaderValue(null)).toBeNull();
    expect(parseAdminLayoutSessionHeaderValue('%7Bbad-json')).toBeNull();
    expect(normalizeAdminLayoutSession({ user: { name: 'Missing id' } })).toBeNull();
    expect(buildAdminLayoutSessionHeaderValue({ user: undefined })).toBeNull();
  });
});
