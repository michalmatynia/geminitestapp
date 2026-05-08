/**
 * @vitest-environment node
 */

import { describe, expect, it, vi, beforeEach } from 'vitest';
import type { NextRequest } from 'next/server';

// ── Auth module reads AUTH_SECRET lazily, stub before import ──────────────
vi.stubEnv('AUTH_SECRET', 'test-auth-secret-at-least-32-chars!!');

// ── Hoisted mocks ─────────────────────────────────────────────────────────
const mocks = vi.hoisted(() => ({
  // mongodb
  findOne: vi.fn(),
  insertOne: vi.fn(),
  find: vi.fn(),
  sort: vi.fn(),
  toArray: vi.fn(),
  // rate-limit
  checkRateLimit: vi.fn(() => ({ allowed: true, retryAfterSec: 0 })),
  // auth
  getSession: vi.fn(),
  // db-indexes
  ensureAppIndexes: vi.fn(),
}));

vi.mock('@/lib/mongodb', () => ({
  getEcomAuthDb: vi.fn(async () => ({
    collection: () => ({
      findOne: mocks.findOne,
      insertOne: mocks.insertOne,
      find: () => ({ sort: () => ({ toArray: mocks.toArray }) }),
    }),
  })),
}));

vi.mock('@/lib/rate-limit', () => ({
  checkRateLimit: mocks.checkRateLimit,
  getClientIp: vi.fn(() => '127.0.0.1'),
}));

vi.mock('next/headers', () => ({
  cookies: vi.fn(async () => ({ get: () => undefined })),
}));

vi.mock('@/lib/auth', async (importOriginal) => {
  const mod = await importOriginal<typeof import('@/lib/auth')>();
  return {
    ...mod,
    getSession: mocks.getSession,
  };
});

vi.mock('@/lib/db-indexes', () => ({
  ensureAppIndexes: mocks.ensureAppIndexes,
}));

import { POST as login } from './login/route';
import { POST as register } from './register/route';
import { POST as logout } from './logout/route';
import { GET as me } from './me/route';
import { GET as adminUsers } from './admin/users/route';

function jsonReq(url: string, body: unknown): NextRequest {
  return new Request(new URL(url, 'http://localhost'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }) as NextRequest;
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.checkRateLimit.mockReturnValue({ allowed: true, retryAfterSec: 0 });
  mocks.ensureAppIndexes.mockResolvedValue(undefined);
});

// ── Login ─────────────────────────────────────────────────────────────────

describe('POST /api/auth/login', () => {
  it('returns 401 when user not found', async () => {
    mocks.findOne.mockResolvedValue(null);
    const res = await login(jsonReq('/api/auth/login', { email: 'no@one.com', password: 'pass' }));
    expect(res.status).toBe(401);
  });

  it('returns 401 on wrong password', async () => {
    // bcrypt hash for "correct-password" — using a real hash for an unrelated password
    // means the compare will always fail and return false quickly.
    mocks.findOne.mockResolvedValue({
      _id: { toString: () => 'uid1' },
      email: 'user@example.com',
      name: 'User',
      passwordHash: '$2b$12$invalidhashinvalidhashinvalidhash',
    });
    const res = await login(jsonReq('/api/auth/login', { email: 'user@example.com', password: 'wrong' }));
    expect(res.status).toBe(401);
  });

  it('returns 429 when rate limited', async () => {
    mocks.checkRateLimit.mockReturnValue({ allowed: false, retryAfterSec: 900 });
    const res = await login(jsonReq('/api/auth/login', { email: 'a@b.com', password: 'pw' }));
    expect(res.status).toBe(429);
    expect(res.headers.get('Retry-After')).toBe('900');
  });

  it('returns 401 for non-string credentials', async () => {
    const res = await login(jsonReq('/api/auth/login', { email: 123, password: null }));
    expect(res.status).toBe(401);
  });

  it('returns 400 for invalid JSON', async () => {
    const req = new Request('http://localhost/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: 'not-json',
    }) as NextRequest;
    const res = await login(req);
    expect(res.status).toBe(400);
  });
});

// ── Register ──────────────────────────────────────────────────────────────

describe('POST /api/auth/register', () => {
  it('returns 400 for short name', async () => {
    const res = await register(jsonReq('/api/auth/register', { name: 'A', email: 'a@b.com', password: 'password123' }));
    expect(res.status).toBe(400);
    const body = await res.json() as { error: string };
    expect(body.error).toMatch(/name/i);
  });

  it('returns 400 for invalid email', async () => {
    const res = await register(jsonReq('/api/auth/register', { name: 'Alice', email: 'not-an-email', password: 'password123' }));
    expect(res.status).toBe(400);
  });

  it('returns 400 for short password', async () => {
    const res = await register(jsonReq('/api/auth/register', { name: 'Alice', email: 'a@b.com', password: 'short' }));
    expect(res.status).toBe(400);
  });

  it('returns 409 when email already registered', async () => {
    mocks.findOne.mockResolvedValue({ _id: 'existing' });
    const res = await register(jsonReq('/api/auth/register', { name: 'Alice', email: 'taken@example.com', password: 'password123' }));
    expect(res.status).toBe(409);
  });

  it('returns 429 when rate limited', async () => {
    mocks.checkRateLimit.mockReturnValue({ allowed: false, retryAfterSec: 3600 });
    const res = await register(jsonReq('/api/auth/register', { name: 'Alice', email: 'a@b.com', password: 'password123' }));
    expect(res.status).toBe(429);
  });
});

// ── Logout ────────────────────────────────────────────────────────────────

describe('POST /api/auth/logout', () => {
  it('clears the session cookie and returns ok', async () => {
    const res = await logout();
    const body = await res.json() as { ok: boolean };
    expect(res.status).toBe(200);
    expect(body.ok).toBe(true);
  });
});

// ── /me ───────────────────────────────────────────────────────────────────

describe('GET /api/auth/me', () => {
  it('returns 401 when not signed in', async () => {
    mocks.getSession.mockResolvedValue(null);
    // me route imports getSession from @/lib/auth — spy on the module
    const res = await me();
    expect(res.status).toBe(401);
  });
});

// ── Admin users ───────────────────────────────────────────────────────────

describe('GET /api/auth/admin/users', () => {
  it('returns 403 for non-superadmin session', async () => {
    mocks.getSession.mockResolvedValue({ id: 'u1', email: 'user@example.com', isSuperAdmin: false });
    const res = await adminUsers();
    expect(res.status).toBe(403);
  });

  it('returns 403 when not authenticated', async () => {
    mocks.getSession.mockResolvedValue(null);
    const res = await adminUsers();
    expect(res.status).toBe(403);
  });

  it('returns user list for superadmin', async () => {
    mocks.getSession.mockResolvedValue({ id: 'admin1', email: 'admin@example.com', isSuperAdmin: true });
    mocks.toArray.mockResolvedValue([
      { _id: { toString: () => 'uid1' }, email: 'a@b.com', name: 'Alice', createdAt: new Date('2026-01-01') },
    ]);
    const res = await adminUsers();
    const body = await res.json() as { users: unknown[]; total: number };
    expect(res.status).toBe(200);
    expect(body.total).toBe(1);
    expect(body.users[0]).toMatchObject({ email: 'a@b.com', name: 'Alice' });
  });
});
