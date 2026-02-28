import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const insertAnalyticsEventMock = vi.hoisted(() => vi.fn());
const listAnalyticsEventsMock = vi.hoisted(() => vi.fn());
const authMock = vi.hoisted(() => vi.fn());
const extractClientIpMock = vi.hoisted(() => vi.fn(() => '127.0.0.1'));

vi.mock('@/shared/lib/analytics/server', () => ({
  insertAnalyticsEvent: insertAnalyticsEventMock,
  listAnalyticsEvents: listAnalyticsEventsMock,
}));

vi.mock('@/features/auth/server', () => ({
  auth: authMock,
  extractClientIp: extractClientIpMock,
}));

import { POST } from '@/app/api/analytics/events/route';

const payload = {
  type: 'pageview',
  scope: 'admin',
  path: '/admin/products',
  visitorId: 'visitor-1',
  sessionId: 'session-1',
};

describe('/api/analytics/events POST', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authMock.mockResolvedValue({ user: { id: 'user-1' } });
  });

  it('returns 202 without waiting for ingestion in default non-blocking mode', async () => {
    insertAnalyticsEventMock.mockImplementation(
      () =>
        new Promise<{ id: string }>(() => {
          // Intentionally unresolved to verify request returns immediately.
        })
    );

    const req = new NextRequest('http://localhost/api/analytics/events', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const response = await Promise.race([
      POST(req),
      new Promise<Response>((_resolve, reject) => {
        setTimeout(() => reject(new Error('POST /api/analytics/events timed out')), 250);
      }),
    ]);

    const data = (await response.json()) as { ok: boolean; queued: boolean };
    expect(response.status).toBe(202);
    expect(data).toEqual(
      expect.objectContaining({
        ok: true,
        queued: true,
      })
    );

    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(authMock).toHaveBeenCalledTimes(1);
    expect(insertAnalyticsEventMock).toHaveBeenCalledTimes(1);
    expect(insertAnalyticsEventMock).toHaveBeenCalledWith(
      expect.objectContaining({
        path: '/admin/products',
        userId: 'user-1',
      }),
      expect.objectContaining({
        ip: '127.0.0.1',
      })
    );
  });
});
