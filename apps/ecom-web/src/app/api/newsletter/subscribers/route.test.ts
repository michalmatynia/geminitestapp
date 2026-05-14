/**
 * @vitest-environment node
 */

import { describe, expect, it, vi, beforeEach } from 'vitest';

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  find: vi.fn(),
}));

vi.mock('@/lib/auth', () => ({ getSession: mocks.getSession }));

vi.mock('server-only', () => ({}));

vi.mock('@/lib/mongodb', () => ({
  getDb: vi.fn(async () => ({
    collection: () => ({
      find: mocks.find,
    }),
  })),
}));

import { GET } from './route';

const SUPER_ADMIN = { id: 'admin-1', email: 'admin@example.com', name: 'Admin', role: 'admin', isSuperAdmin: true };
const REGULAR_USER = { id: 'user-1', email: 'user@example.com', name: 'User', role: 'customer', isSuperAdmin: false };

const MOCK_DOCS = [
  { email: 'alice@example.com', subscribedAt: '2026-05-10T10:00:00.000Z' },
  { email: 'bob@example.com', subscribedAt: '2026-05-09T08:30:00.000Z' },
];

function makeCursor(docs: unknown[]) {
  return {
    sort: vi.fn().mockReturnThis(),
    toArray: vi.fn().mockResolvedValue(docs),
  };
}

describe('GET /api/newsletter/subscribers', () => {
  beforeEach(() => {
    mocks.getSession.mockReset();
    mocks.find.mockReset();
    mocks.getSession.mockResolvedValue(SUPER_ADMIN);
    mocks.find.mockReturnValue(makeCursor(MOCK_DOCS));
  });

  it('returns subscriber list for a superadmin', async () => {
    const res = await GET();
    const body = await res.json() as { subscribers: typeof MOCK_DOCS; total: number };

    expect(res.status).toBe(200);
    expect(body.total).toBe(2);
    expect(body.subscribers[0]?.email).toBe('alice@example.com');
    expect(body.subscribers[1]?.email).toBe('bob@example.com');
  });

  it('returns an empty list when there are no subscribers', async () => {
    mocks.find.mockReturnValue(makeCursor([]));

    const res = await GET();
    const body = await res.json() as { subscribers: unknown[]; total: number };

    expect(res.status).toBe(200);
    expect(body.subscribers).toEqual([]);
    expect(body.total).toBe(0);
  });

  it('returns 403 for a non-superadmin user', async () => {
    mocks.getSession.mockResolvedValue(REGULAR_USER);

    const res = await GET();
    const body = await res.json() as { error: string };

    expect(res.status).toBe(403);
    expect(body.error).toBe('Forbidden');
    expect(mocks.find).not.toHaveBeenCalled();
  });

  it('returns 403 when not authenticated', async () => {
    mocks.getSession.mockResolvedValue(null);

    const res = await GET();
    expect(res.status).toBe(403);
    expect(mocks.find).not.toHaveBeenCalled();
  });
});
