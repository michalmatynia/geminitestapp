/**
 * @vitest-environment node
 */

import { describe, expect, it, vi, beforeEach } from 'vitest';
import type { NextRequest } from 'next/server';

const mocks = vi.hoisted(() => ({
  checkRateLimit: vi.fn(),
  getClientIp: vi.fn(),
  updateOne: vi.fn(),
}));

vi.mock('@/lib/rate-limit', () => ({
  checkRateLimit: mocks.checkRateLimit,
  getClientIp: mocks.getClientIp,
}));

vi.mock('server-only', () => ({}));

vi.mock('@/lib/mongodb', () => ({
  getDb: vi.fn(async () => ({
    collection: () => ({ updateOne: mocks.updateOne }),
  })),
}));

import { POST } from './route';

function makeJsonRequest(body: unknown): NextRequest {
  return new Request('http://localhost/api/newsletter', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }) as NextRequest;
}

describe('POST /api/newsletter', () => {
  beforeEach(() => {
    mocks.checkRateLimit.mockReset();
    mocks.getClientIp.mockReset();
    mocks.updateOne.mockReset();

    mocks.checkRateLimit.mockReturnValue({ allowed: true, retryAfterSec: 0 });
    mocks.getClientIp.mockReturnValue('127.0.0.1');
    mocks.updateOne.mockResolvedValue({ upsertedCount: 1 });
  });

  it('subscribes a valid email and returns 200', async () => {
    const res = await POST(makeJsonRequest({ email: 'user@example.com' }));
    const body = await res.json() as { ok?: boolean };

    expect(res.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(mocks.updateOne).toHaveBeenCalledOnce();

    const [filter, update, options] = mocks.updateOne.mock.calls[0] as [
      Record<string, string>,
      Record<string, unknown>,
      Record<string, boolean>,
    ];
    expect(filter['email']).toBe('user@example.com');
    expect(update['$setOnInsert']).toMatchObject({ email: 'user@example.com' });
    expect(options['upsert']).toBe(true);
  });

  it('normalizes email to lowercase', async () => {
    await POST(makeJsonRequest({ email: 'User@EXAMPLE.COM' }));

    const [filter] = mocks.updateOne.mock.calls[0] as [Record<string, string>];
    expect(filter['email']).toBe('user@example.com');
  });

  it('returns 200 even when DB throws (silent failure)', async () => {
    mocks.updateOne.mockRejectedValue(new Error('DB unavailable'));

    const res = await POST(makeJsonRequest({ email: 'user@example.com' }));
    expect(res.status).toBe(200);
  });

  it('returns 400 for an invalid email', async () => {
    const res = await POST(makeJsonRequest({ email: 'not-an-email' }));
    expect(res.status).toBe(400);
    expect(mocks.updateOne).not.toHaveBeenCalled();
  });

  it('returns 400 when email field is missing', async () => {
    const res = await POST(makeJsonRequest({ name: 'no email here' }));
    expect(res.status).toBe(400);
  });

  it('returns 400 for malformed JSON', async () => {
    const res = await POST(
      new Request('http://localhost/api/newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{bad json',
      }) as NextRequest,
    );
    expect(res.status).toBe(400);
  });

  it('returns 429 when rate limit is exceeded', async () => {
    mocks.checkRateLimit.mockReturnValue({ allowed: false, retryAfterSec: 3600 });

    const res = await POST(makeJsonRequest({ email: 'user@example.com' }));
    expect(res.status).toBe(429);
    expect(res.headers.get('Retry-After')).toBe('3600');
    expect(mocks.updateOne).not.toHaveBeenCalled();
  });
});
