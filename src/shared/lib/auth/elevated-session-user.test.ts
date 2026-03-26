import { describe, expect, it } from 'vitest';

import {
  getElevatedSessionUserSnapshot,
  isElevatedSession,
  isSuperAdminSession,
} from '@/shared/lib/auth/elevated-session-user';

describe('elevated-session-user', () => {
  it('treats explicit elevated sessions as elevated', () => {
    expect(
      isElevatedSession({
        expires: '2026-12-31T23:59:59.000Z',
        user: {
          email: 'admin@example.com',
          id: 'user-1',
          isElevated: true,
          name: 'Admin',
          role: 'user',
        },
      })
    ).toBe(true);
  });

  it('treats super-admin roles as elevated even without the flag', () => {
    expect(
      isElevatedSession({
        expires: '2026-12-31T23:59:59.000Z',
        user: {
          email: 'super@example.com',
          id: 'user-2',
          name: 'Super Admin',
          role: 'super_admin',
        },
      })
    ).toBe(true);
  });

  it('matches only exact super-admin sessions for super-admin access', () => {
    expect(
      isSuperAdminSession({
        expires: '2026-12-31T23:59:59.000Z',
        user: {
          email: 'super@example.com',
          id: 'user-2',
          name: 'Super Admin',
          role: 'super_admin',
        },
      })
    ).toBe(true);
    expect(
      isSuperAdminSession({
        expires: '2026-12-31T23:59:59.000Z',
        user: {
          email: 'admin@example.com',
          id: 'user-4',
          isElevated: true,
          name: 'Admin',
          role: 'admin',
        },
      })
    ).toBe(false);
  });

  it('returns null snapshot for non-elevated sessions', () => {
    expect(
      getElevatedSessionUserSnapshot({
        expires: '2026-12-31T23:59:59.000Z',
        user: {
          email: 'user@example.com',
          id: 'user-3',
          isElevated: false,
          name: 'User',
          role: 'user',
        },
      })
    ).toBeNull();
  });
});
