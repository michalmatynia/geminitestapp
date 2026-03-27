import { NextRequest, NextResponse } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';

const getSessionUserMock = vi.fn(async () => null);
const enforceRateLimitMock = vi.fn(async () => ({
  headers: {
    'X-RateLimit-Limit': '120',
    'X-RateLimit-Remaining': '119',
  },
}));
const getActiveOtelContextAttributesMock = vi.fn(() => ({}));
const logSystemEventMock = vi.fn().mockResolvedValue(undefined);
const captureExceptionMock = vi.fn().mockResolvedValue(undefined);
const reportErrorMock = vi.fn(
  async ({
    error,
    fallbackMessage,
  }: {
    error: unknown;
    fallbackMessage?: string;
  }) => {
    const sourceError = error as {
      code?: string;
      httpStatus?: number;
      meta?: Record<string, unknown>;
      message?: string;
      expected?: boolean;
      retryable?: boolean;
      retryAfterMs?: number;
    };

    return {
      resolved: {
        code: sourceError.code ?? 'INTERNAL_SERVER_ERROR',
        httpStatus: sourceError.httpStatus ?? 500,
        errorId: 'err-1',
        category: 'test',
        suggestedActions: ['retry'],
        retryable: sourceError.retryable ?? false,
        retryAfterMs: sourceError.retryAfterMs,
        expected: sourceError.expected ?? false,
        meta: sourceError.meta,
      },
      userMessage: sourceError.message ?? fallbackMessage ?? 'Unexpected error',
      fingerprint: 'fp-1',
    };
  }
);

const loadApiHandler = async () => {
  vi.resetModules();
  vi.unmock('@/shared/lib/api/api-handler');
  vi.doMock('@/shared/lib/api/session-registry', () => ({
    getSessionUser: getSessionUserMock,
  }));
  vi.doMock('@/shared/lib/api/rate-limit', () => ({
    enforceRateLimit: (...args: unknown[]) => enforceRateLimitMock(...args),
  }));
  vi.doMock('@/shared/lib/observability/otel-context', () => ({
    getActiveOtelContextAttributes: getActiveOtelContextAttributesMock,
  }));
  vi.doMock('@/shared/lib/observability/system-logger', () => ({
    logSystemEvent: (...args: unknown[]) => logSystemEventMock(...args),
    getErrorFingerprint: vi.fn(() => 'fp-1'),
  }));
  vi.doMock('@/shared/utils/observability/error-system', () => ({
    ErrorSystem: {
      captureException: (...args: unknown[]) => captureExceptionMock(...args),
    },
  }));
  vi.doMock('@/shared/utils/observability/report-error', () => ({
    reportError: (...args: unknown[]) => reportErrorMock(...args),
  }));
  return import('@/shared/lib/api/api-handler');
};

describe('api-handler behavior', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env['NODE_ENV'] = 'test';
    process.env['ENFORCE_TEST_RATE_LIMITS'] = 'true';
    delete process.env['DISABLE_RATE_LIMITS'];
    delete process.env['ENABLE_RATE_LIMITS'];
    delete process.env['ENFORCE_TEST_CSRF'];
  });

  it('parses body, query, and params and applies response headers on success', async () => {
    const { apiHandlerWithParams } = await loadApiHandler();

    let observedContext:
      | {
          body: unknown;
          query: unknown;
          params: unknown;
        }
      | undefined;

    const handler = apiHandlerWithParams(
      async (_request, ctx, params) => {
        observedContext = {
          body: ctx.body,
          query: ctx.query,
          params,
        };
        return NextResponse.json({ ok: true });
      },
      {
        source: 'api.handler.behavior.POST',
        parseJsonBody: true,
        requireCsrf: false,
        successLogging: 'off',
        bodySchema: z.object({ title: z.string() }),
        querySchema: z.object({ page: z.string() }),
        paramsSchema: z.object({ id: z.string() }),
        corsOrigins: ['https://app.example.com'],
        cacheControl: 'private, max-age=120',
      }
    );

    const response = await handler(
      new NextRequest('https://api.example.com/items/123?page=2', {
        method: 'POST',
        headers: new Headers({
          origin: 'https://app.example.com',
          'content-type': 'application/json',
          'x-request-id': 'req-123',
        }),
        body: JSON.stringify({ title: 'Hello' }),
      }),
      { params: { id: '123' } }
    );

    expect(observedContext).toEqual({
      body: { title: 'Hello' },
      query: { page: '2' },
      params: { id: '123' },
    });
    expect(enforceRateLimitMock).toHaveBeenCalledTimes(1);
    expect(response.status).toBe(200);
    expect(response.headers.get('x-request-id')).toBe('req-123');
    expect(response.headers.get('x-trace-id')).toBeTruthy();
    expect(response.headers.get('x-correlation-id')).toBe('req-123');
    expect(response.headers.get('Cache-Control')).toBe('private, max-age=120');
    expect(response.headers.get('X-RateLimit-Limit')).toBe('120');
    expect(response.headers.get('X-RateLimit-Remaining')).toBe('119');
    expect(response.headers.get('X-Content-Type-Options')).toBe('nosniff');
    expect(response.headers.get('X-Frame-Options')).toBe('DENY');
  });

  it('returns a bad-request payload for invalid JSON bodies', async () => {
    const { apiHandler } = await loadApiHandler();

    const handler = apiHandler(
      async () => NextResponse.json({ ok: true }),
      {
        source: 'api.handler.invalid-json.POST',
        parseJsonBody: true,
        requireCsrf: false,
        successLogging: 'off',
      }
    );

    const response = await handler(
      new NextRequest('http://localhost/api/test', {
        method: 'POST',
        headers: new Headers({
          'content-type': 'application/json',
        }),
        body: '{bad json',
      })
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({
      code: 'BAD_REQUEST',
      error: 'Invalid JSON payload',
      fingerprint: 'fp-1',
    });
  });

  it('returns payload-too-large and validation failures from body/query/params schemas', async () => {
    const { apiHandler, apiHandlerWithParams } = await loadApiHandler();

    const bodyHandler = apiHandler(
      async () => NextResponse.json({ ok: true }),
      {
        source: 'api.handler.too-large.POST',
        parseJsonBody: true,
        requireCsrf: false,
        successLogging: 'off',
        maxBodyBytes: 5,
      }
    );

    const oversizedResponse = await bodyHandler(
      new NextRequest('http://localhost/api/test', {
        method: 'POST',
        headers: new Headers({
          'content-type': 'application/json',
          'content-length': '999',
        }),
        body: JSON.stringify({ title: 'Hello' }),
      })
    );

    expect(oversizedResponse.status).toBe(413);
    expect(await oversizedResponse.json()).toMatchObject({
      code: 'PAYLOAD_TOO_LARGE',
      error: 'Payload too large',
    });

    const queryHandler = apiHandler(
      async () => NextResponse.json({ ok: true }),
      {
        source: 'api.handler.invalid-query.GET',
        querySchema: z.object({ page: z.coerce.number() }),
        successLogging: 'off',
      }
    );

    const invalidQueryResponse = await queryHandler(
      new NextRequest('http://localhost/api/test?page=nope', { method: 'GET' })
    );

    expect(invalidQueryResponse.status).toBe(400);
    expect(await invalidQueryResponse.json()).toMatchObject({
      code: 'VALIDATION_ERROR',
      error: 'Query validation failed',
    });

    const paramsHandler = apiHandlerWithParams(
      async () => NextResponse.json({ ok: true }),
      {
        source: 'api.handler.invalid-params.GET',
        paramsSchema: z.object({ id: z.string().uuid() }),
        successLogging: 'off',
      }
    );

    const invalidParamsResponse = await paramsHandler(
      new NextRequest('http://localhost/api/test/not-a-uuid', { method: 'GET' }),
      { params: { id: 'not-a-uuid' } }
    );

    expect(invalidParamsResponse.status).toBe(400);
    expect(await invalidParamsResponse.json()).toMatchObject({
      code: 'VALIDATION_ERROR',
      error: 'Parameter validation failed',
    });
  });

  it('serves OPTIONS requests with cors and no-store cache headers', async () => {
    const { apiOptionsHandler } = await loadApiHandler();

    const handler = apiOptionsHandler({
      source: 'api.handler.options.OPTIONS',
      corsOrigins: ['https://app.example.com'],
    });

    const response = await handler(
      new NextRequest('https://api.example.com/items', {
        method: 'OPTIONS',
        headers: new Headers({
          origin: 'https://app.example.com',
          'access-control-request-method': 'POST',
        }),
      })
    );

    expect(response.status).toBe(204);
    expect(response.headers.get('Cache-Control')).toBe('no-store');
  });

  it('exports query and pagination helpers', async () => {
    const { getPaginationParams, getQueryParams, getRequiredParam } = await loadApiHandler();

    const request = new NextRequest(
      'http://localhost/api/test?page=3&pageSize=25&required=present'
    );
    const searchParams = getQueryParams(request);

    expect(searchParams.get('page')).toBe('3');
    expect(getRequiredParam(searchParams, 'required')).toBe('present');
    expect(getPaginationParams(searchParams)).toEqual({
      page: 3,
      pageSize: 25,
      skip: 50,
    });
    expect(() => getRequiredParam(searchParams, 'missing')).toThrow(
      'Missing required parameter: missing'
    );
  });
});
