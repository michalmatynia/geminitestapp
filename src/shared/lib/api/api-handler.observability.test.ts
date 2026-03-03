import { NextRequest, NextResponse } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { apiHandler } from '@/shared/lib/api/api-handler';
import { logSystemEvent } from '@/shared/lib/observability/system-logger';

describe('apiHandler observability propagation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env['NODE_ENV'] = 'development';
    delete process.env['ENABLE_RATE_LIMITS'];
  });

  it('uses incoming x-trace-id and echoes correlation headers', async () => {
    const mockedLogSystemEvent = vi.mocked(logSystemEvent);
    const handler = apiHandler(
      async (_request, ctx) => {
        expect(ctx.requestId).toBe('req-1');
        expect(ctx.traceId).toBe('trace-abc');
        expect(ctx.correlationId).toBe('corr-1');
        return NextResponse.json({ ok: true }, { status: 200 });
      },
      {
        source: 'observability.logs.GET',
        successLogging: 'all',
      }
    );

    const response = await handler(
      new NextRequest('http://localhost/api/test', {
        method: 'GET',
        headers: new Headers({
          'x-request-id': 'req-1',
          'x-trace-id': 'trace-abc',
          'x-correlation-id': 'corr-1',
        }),
      })
    );

    expect(response.headers.get('x-request-id')).toBe('req-1');
    expect(response.headers.get('x-trace-id')).toBe('trace-abc');
    expect(response.headers.get('x-correlation-id')).toBe('corr-1');

    await vi.waitFor(() => {
      expect(mockedLogSystemEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          source: 'observability.logs.GET',
          service: 'observability.logs',
          requestId: 'req-1',
          traceId: 'trace-abc',
          correlationId: 'corr-1',
        })
      );
    });
  });

  it('generates trace id fallback and skips fast success logs by default', async () => {
    const mockedLogSystemEvent = vi.mocked(logSystemEvent);
    const handler = apiHandler(
      async () => NextResponse.json({ ok: true }, { status: 200 }),
      {
        source: 'fallback.trace.GET',
      }
    );

    const response = await handler(
      new NextRequest('http://localhost/api/test', {
        method: 'GET',
        headers: new Headers({
          'x-request-id': 'req-fallback',
        }),
      })
    );

    const generatedTraceId = response.headers.get('x-trace-id');
    expect(response.headers.get('x-request-id')).toBe('req-fallback');
    expect(response.headers.get('x-correlation-id')).toBe('req-fallback');
    expect(generatedTraceId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    );

    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(mockedLogSystemEvent).not.toHaveBeenCalled();
  });
});
