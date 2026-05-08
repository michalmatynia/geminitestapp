/**
 * @vitest-environment node
 */

import { describe, expect, it, vi, beforeAll } from 'vitest';

// next/headers is only available inside Next.js request context; mock it for unit tests.
vi.mock('next/headers', () => ({
  cookies: vi.fn(async () => ({ get: () => undefined })),
}));

const TEST_SECRET = 'test-auth-secret-at-least-32-chars-long';

// Auth module reads AUTH_SECRET when functions are called, so stub before importing.
vi.stubEnv('AUTH_SECRET', TEST_SECRET);

import {
  isSuperAdmin,
  hashPassword,
  verifyPassword,
  createSessionToken,
  verifySessionToken,
  sessionCookieOptions,
  clearSessionCookieOptions,
  COOKIE_NAME,
  type SessionUser,
} from './auth';

const testUser: SessionUser = {
  id: 'user-123',
  email: 'test@example.com',
  name: 'Test User',
  isSuperAdmin: false,
};

describe('isSuperAdmin', () => {
  it('returns true when email matches SUPER_ADMIN_EMAIL', () => {
    vi.stubEnv('SUPER_ADMIN_EMAIL', 'admin@example.com');
    expect(isSuperAdmin('admin@example.com')).toBe(true);
  });

  it('is case-insensitive', () => {
    vi.stubEnv('SUPER_ADMIN_EMAIL', 'Admin@Example.COM');
    expect(isSuperAdmin('admin@example.com')).toBe(true);
  });

  it('returns false when email does not match', () => {
    vi.stubEnv('SUPER_ADMIN_EMAIL', 'admin@example.com');
    expect(isSuperAdmin('other@example.com')).toBe(false);
  });

  it('returns false when SUPER_ADMIN_EMAIL is not configured', () => {
    vi.stubEnv('SUPER_ADMIN_EMAIL', '');
    expect(isSuperAdmin('anything@example.com')).toBe(false);
  });
});

describe('hashPassword and verifyPassword', () => {
  it('produces a bcrypt hash that verifies correctly', async () => {
    const hash = await hashPassword('correct-horse-battery-staple');
    expect(hash).toMatch(/^\$2[aby]\$/);
    expect(await verifyPassword('correct-horse-battery-staple', hash)).toBe(true);
  });

  it('rejects an incorrect password', async () => {
    const hash = await hashPassword('real-password');
    expect(await verifyPassword('wrong-password', hash)).toBe(false);
  });

  it('produces different hashes for the same password (salt)', async () => {
    const h1 = await hashPassword('same-password');
    const h2 = await hashPassword('same-password');
    expect(h1).not.toBe(h2);
    // Both should still verify correctly
    expect(await verifyPassword('same-password', h1)).toBe(true);
    expect(await verifyPassword('same-password', h2)).toBe(true);
  });
});

describe('createSessionToken and verifySessionToken', () => {
  it('round-trips a SessionUser through JWT', async () => {
    const token = await createSessionToken(testUser);
    expect(typeof token).toBe('string');

    const decoded = await verifySessionToken(token);
    expect(decoded).toMatchObject({
      id: 'user-123',
      email: 'test@example.com',
      name: 'Test User',
    });
  });

  it('returns null for a tampered token', async () => {
    const token = await createSessionToken(testUser);
    const tampered = token.slice(0, -4) + 'XXXX';
    expect(await verifySessionToken(tampered)).toBeNull();
  });

  it('returns null for a token signed with a different secret', async () => {
    // Create a token with the current secret, then verify with a "different" secret
    // by changing the env before verify. We restore it afterwards.
    const token = await createSessionToken(testUser);
    vi.stubEnv('AUTH_SECRET', 'completely-different-secret-that-is-also-32-chars');
    const result = await verifySessionToken(token);
    vi.stubEnv('AUTH_SECRET', TEST_SECRET);
    expect(result).toBeNull();
  });

  it('returns null for an empty string', async () => {
    expect(await verifySessionToken('')).toBeNull();
  });

  it('returns null for a malformed token', async () => {
    expect(await verifySessionToken('not.a.jwt')).toBeNull();
    expect(await verifySessionToken('a.b.c')).toBeNull();
  });

  it('recalculates isSuperAdmin from the email at verification time', async () => {
    // Create a token where isSuperAdmin is false
    vi.stubEnv('SUPER_ADMIN_EMAIL', '');
    const token = await createSessionToken({ ...testUser, isSuperAdmin: false });

    // Change the super-admin to this user's email
    vi.stubEnv('SUPER_ADMIN_EMAIL', testUser.email);
    const decoded = await verifySessionToken(token);

    expect(decoded?.isSuperAdmin).toBe(true);
    vi.stubEnv('SUPER_ADMIN_EMAIL', '');
  });
});

describe('sessionCookieOptions', () => {
  it('sets httpOnly, sameSite lax, and 7-day maxAge', () => {
    const opts = sessionCookieOptions('fake-token');
    expect(opts.name).toBe(COOKIE_NAME);
    expect(opts.value).toBe('fake-token');
    expect(opts.httpOnly).toBe(true);
    expect(opts.sameSite).toBe('lax');
    expect(opts.path).toBe('/');
    expect(opts.maxAge).toBe(60 * 60 * 24 * 7);
  });
});

describe('clearSessionCookieOptions', () => {
  it('sets maxAge to 0 and value to empty string to expire the cookie', () => {
    const opts = clearSessionCookieOptions();
    expect(opts.name).toBe(COOKIE_NAME);
    expect(opts.value).toBe('');
    expect(opts.maxAge).toBe(0);
  });
});
