import { NextRequest, NextResponse } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const getActiveOtelContextAttributesMock = vi.fn(() => ({}));
const mockedLogSystemEvent = vi.fn().mockResolvedValue(undefined);

vi.mock('@/shared/lib/observability/otel-context', () => ({
  getActiveOtelContextAttributes: getActiveOtelContextAttributesMock,
}));

const loadApiHandler = async () => {
  vi.unmock('@/shared/lib/api/api-handler');
  vi.doMock('@/shared/lib/observability/system-logger', () => ({
    logSystemEvent: mockedLogSystemEvent,
    getErrorFingerprint: vi.fn(() => 'test-fingerprint'),
  }));
  const { apiHandler, apiOptionsHandler } = await import('@/shared/lib/api/api-handler');
  return { apiHandler, apiOptionsHandler, mockedLogSystemEvent };
};

describe('apiHandler observability propagation', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    mockedLogSystemEvent.mockClear();
    getActiveOtelContextAttributesMock.mockReturnValue({});
    process.env['NODE_ENV'] = 'development';
    delete process.env['ENABLE_RATE_LIMITS'];
  });

  it('uses incoming x-trace-id and echoes correlation headers', async () => {
    const { apiHandler, mockedLogSystemEvent } = await loadApiHandler();
    getActiveOtelContextAttributesMock.mockReturnValue({
      otelTraceId: 'otel-trace-1',
      otelSpanId: 'otel-span-1',
      otelTraceFlags: '01',
    });

    let observedCtx:
      | {
          requestId: string;
          traceId: string;
          correlationId: string;
        }
      | undefined;
    const handler = apiHandler(
      async (_request, ctx) => {
        observedCtx = {
          requestId: ctx.requestId,
          traceId: ctx.traceId,
          correlationId: ctx.correlationId,
        };
        return NextResponse.json({ ok: true }, { status: 200 });
      },
      {
        source: 'observability.logs.GET',
        successLogging: 'all',
      }
    );

    const response = await handler(
      new NextRequest('/api/test', {
        method: 'GET',
        headers: new Headers({
          'x-request-id': 'req-1',
          'x-trace-id': 'trace-abc',
          'x-correlation-id': 'corr-1',
        }),
      })
    );

    expect(response.status).toBe(200);
    expect(observedCtx).toEqual({
      requestId: 'req-1',
      traceId: 'trace-abc',
      correlationId: 'corr-1',
    });
    expect(response.headers.get('x-request-id')).toBe('req-1');
    expect(response.headers.get('x-trace-id')).toBe('trace-abc');
    expect(response.headers.get('x-correlation-id')).toBe('corr-1');

    await vi.waitFor(() => {
      expect(mockedLogSystemEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          source: 'observability.logs.GET',
          requestId: 'req-1',
          traceId: 'trace-abc',
          correlationId: 'corr-1',
          service: 'observability.logs',
          level: 'info',
          context: expect.objectContaining({
            otelTraceId: 'otel-trace-1',
            otelSpanId: 'otel-span-1',
            otelTraceFlags: '01',
          }),
        })
      );
    });
  });

  it('generates trace id fallback and skips fast success logs by default', async () => {
    const { apiHandler, mockedLogSystemEvent } = await loadApiHandler();
    const handler = apiHandler(async () => NextResponse.json({ ok: true }, { status: 200 }), {
      source: 'fallback.trace.GET',
    });

    const response = await handler(
      new NextRequest('/api/test', {
        method: 'GET',
        headers: new Headers({
          'x-request-id': 'req-fallback',
        }),
      })
    );

    expect(response.status).toBe(200);
    const generatedTraceId = response.headers.get('x-trace-id');
    expect(response.headers.get('x-request-id')).toBe('req-fallback');
    expect(response.headers.get('x-correlation-id')).toBe('req-fallback');
    expect(generatedTraceId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    );

    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(mockedLogSystemEvent).not.toHaveBeenCalled();
  });

  it('clones immutable responses before attaching observability headers', async () => {
    const { apiHandler } = await loadApiHandler();
    const handler = apiHandler(
      async () => fetch('data:application/json,%7B%22ok%22%3Atrue%7D'),
      {
        source: 'immutable.response.GET',
      }
    );

    const response = await handler(new NextRequest('/api/test', { method: 'GET' }));

    expect(response.status).toBe(200);
    expect(response.headers.get('x-request-id')).toBeTruthy();
    expect(response.headers.get('x-trace-id')).toBeTruthy();
    expect(response.headers.get('x-correlation-id')).toBeTruthy();
    await expect(response.json()).resolves.toEqual({ ok: true });
  });

  it('adds trusted-origin cors headers when configured', async () => {
    vi.doMock('@/shared/lib/security/csrf', async () => {
      const actual = await vi.importActual<typeof import('@/shared/lib/security/csrf')>(
        '@/shared/lib/security/csrf'
      );
      return {
        ...actual,
        isTrustedOriginRequest: vi.fn(() => true),
      };
    });

    const { apiHandler, apiOptionsHandler } = await loadApiHandler();
    const handler = apiHandler(async () => NextResponse.json({ ok: true }, { status: 200 }), {
      source: 'cors.allowed.GET',
      corsOrigins: ['http://localhost:8081'],
    });
    const optionsHandler = apiOptionsHandler({
      source: 'cors.allowed.OPTIONS',
      corsOrigins: ['http://localhost:8081'],
    });

    const response = await handler(
      new NextRequest('http://localhost:3000/api/test', {
        method: 'GET',
        headers: new Headers({
          origin: 'http://localhost:8081',
        }),
      })
    );
    const preflightResponse = await optionsHandler(
      new NextRequest('http://localhost:3000/api/test', {
        method: 'OPTIONS',
        headers: new Headers({
          origin: 'http://localhost:8081',
          'access-control-request-method': 'POST',
        }),
      })
    );

    expect(response.headers.get('access-control-allow-origin')).toContain('http://localhost');
    expect(response.headers.get('access-control-allow-credentials')).toBe('true');
    expect(response.headers.get('access-control-expose-headers')).toContain('x-csrf-token');
    expect(response.headers.get('vary')).toContain('Origin');
    expect(preflightResponse.status).toBe(204);
    expect(preflightResponse.headers.get('access-control-allow-origin')).toContain(
      'http://localhost'
    );
    expect(preflightResponse.headers.get('access-control-allow-methods')).toContain('POST');
    expect(preflightResponse.headers.get('access-control-expose-headers')).toContain(
      'x-csrf-token'
    );
  });

  it('bootstraps a csrf cookie for trusted-origin requests when none exists', async () => {
    vi.doMock('@/shared/lib/security/csrf', async () => {
      const actual = await vi.importActual<typeof import('@/shared/lib/security/csrf')>(
        '@/shared/lib/security/csrf'
      );
      return {
        ...actual,
        isTrustedOriginRequest: vi.fn(() => true),
      };
    });

    const { apiHandler } = await loadApiHandler();
    const handler = apiHandler(async () => NextResponse.json({ ok: true }, { status: 200 }), {
      source: 'csrf.bootstrap.GET',
      corsOrigins: ['http://localhost:8081'],
    });

    const response = await handler(
      new NextRequest('http://localhost:3000/api/test', {
        method: 'GET',
        headers: new Headers({
          origin: 'http://localhost:8081',
        }),
      })
    );

    expect(response.headers.get('set-cookie')).toContain('csrf-token=');
    expect(response.headers.get('x-csrf-token')).toBeTruthy();
    expect(response.headers.get('access-control-allow-origin')).toContain('http://localhost');
  });
});
