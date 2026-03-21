import { NextRequest, NextResponse } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const getActiveOtelContextAttributesMock = vi.fn(() => ({}));
const mockedLogSystemEvent = vi.fn().mockResolvedValue(undefined);
const mockedCaptureException = vi.fn().mockResolvedValue(undefined);

vi.mock('@/shared/lib/observability/otel-context', () => ({
  getActiveOtelContextAttributes: getActiveOtelContextAttributesMock,
}));

const loadApiHandler = async () => {
  vi.unmock('@/shared/lib/api/api-handler');
  vi.doMock('@/features/auth/auth', () => ({
    auth: vi.fn().mockResolvedValue(null),
  }));
  vi.doMock('@/shared/lib/observability/system-logger', () => ({
    logSystemEvent: mockedLogSystemEvent,
    getErrorFingerprint: vi.fn(() => 'test-fingerprint'),
  }));
  vi.doMock('@/shared/utils/observability/error-system', () => ({
    ErrorSystem: {
      captureException: mockedCaptureException,
    },
  }));
  const { apiHandler, apiOptionsHandler } = await import('@/shared/lib/api/api-handler');
  return { apiHandler, apiOptionsHandler, mockedLogSystemEvent, mockedCaptureException };
};

describe('apiHandler observability propagation', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    mockedLogSystemEvent.mockClear();
    mockedCaptureException.mockClear();
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

  it('includes retry metadata for rate-limited failures', async () => {
    const { apiHandler } = await loadApiHandler();
    const handler = apiHandler(async () => {
      const error = new Error('Too many verification emails sent.') as Error & {
        status: number;
        retryAfterMs: number;
      };
      error.status = 429;
      error.retryAfterMs = 45_000;
      throw error;
    }, {
      source: 'kangur.auth.parent-account.resend.POST',
    });

    const response = await handler(
      new NextRequest('http://localhost/api/kangur/auth/parent-account/resend', {
        method: 'GET',
        headers: new Headers({
          'x-request-id': 'req-rate-limited',
        }),
      })
    );

    expect(response.status).toBe(429);
    expect(response.headers.get('Retry-After')).toBe('45');
    expect(response.headers.get('x-request-id')).toBe('req-rate-limited');
    const payload = (await response.json()) as Record<string, unknown>;
    expect(payload).toMatchObject({
      error: 'Too many verification emails sent.',
      code: 'RATE_LIMITED',
      retryable: true,
      retryAfterMs: 45_000,
    });
    expect(payload['fingerprint']).toBe(response.headers.get('x-error-fingerprint'));
  });

  it('reports handler failures through the centralized response logger without a pre-capture', async () => {
    const { apiHandler, mockedLogSystemEvent, mockedCaptureException } = await loadApiHandler();
    const handler = apiHandler(async () => {
      throw new Error('boom');
    }, {
      source: 'centralized.errors.GET',
    });

    const response = await handler(
      new NextRequest('http://localhost/api/centralized-errors', {
        method: 'GET',
        headers: new Headers({
          'x-request-id': 'req-centralized',
        }),
      })
    );

    expect(response.status).toBe(500);
    expect(mockedCaptureException).not.toHaveBeenCalled();
    expect(mockedLogSystemEvent).toHaveBeenCalledTimes(1);
    expect(mockedLogSystemEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        source: 'centralized.errors.GET',
        requestId: 'req-centralized',
        service: 'centralized.errors',
        level: 'error',
      })
    );
  });
});
