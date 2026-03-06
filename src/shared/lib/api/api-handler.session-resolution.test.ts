import { NextRequest, NextResponse } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const authMock = vi.fn(async () => ({ user: { id: 'user-1' } }));
const getActiveOtelContextAttributesMock = vi.fn(() => ({}));
const mockedLogSystemEvent = vi.fn().mockResolvedValue(undefined);

const loadApiHandler = async () => {
  vi.resetModules();
  vi.unmock('@/shared/lib/api/api-handler');
  vi.doMock('@/features/auth/auth', () => ({
    auth: authMock,
  }));
  vi.doMock('@/shared/lib/observability/otel-context', () => ({
    getActiveOtelContextAttributes: getActiveOtelContextAttributesMock,
  }));
  vi.doMock('@/shared/lib/observability/system-logger', () => ({
    logSystemEvent: mockedLogSystemEvent,
    getErrorFingerprint: vi.fn(() => 'test-fingerprint'),
  }));
  const { apiHandler } = await import('@/shared/lib/api/api-handler');
  return { apiHandler };
};

describe('apiHandler session resolution', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env['NODE_ENV'] = 'development';
    delete process.env['ENABLE_RATE_LIMITS'];
  });

  it('resolves session user by default', async () => {
    const { apiHandler } = await loadApiHandler();
    let observedUserId: string | null | undefined;

    const handler = apiHandler(
      async (_request, ctx) => {
        observedUserId = ctx.userId;
        return NextResponse.json({ ok: true });
      },
      { source: 'api-handler.session.GET' }
    );

    await handler(new NextRequest('http://localhost/api/test', { method: 'GET' }));

    expect(authMock).toHaveBeenCalledTimes(1);
    expect(observedUserId).toBe('user-1');
  });

  it('skips session resolution when resolveSessionUser is false', async () => {
    const { apiHandler } = await loadApiHandler();
    let observedUserId: string | null | undefined;

    const handler = apiHandler(
      async (_request, ctx) => {
        observedUserId = ctx.userId;
        return NextResponse.json({ ok: true });
      },
      {
        source: 'api-handler.session-skip.GET',
        resolveSessionUser: false,
      }
    );

    await handler(new NextRequest('http://localhost/api/test', { method: 'GET' }));

    expect(authMock).not.toHaveBeenCalled();
    expect(observedUserId).toBeNull();
  });
});
