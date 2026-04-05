import type { NextRequest } from 'next/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { ApiHandlerContext } from '@/shared/contracts/ui/api';

const { captureExceptionMock, logInfoMock, logWarningMock } = vi.hoisted(() => ({
  captureExceptionMock: vi.fn(),
  logInfoMock: vi.fn(),
  logWarningMock: vi.fn(),
}));

vi.mock('@/shared/utils/observability/error-system', () => ({
  ErrorSystem: {
    captureException: captureExceptionMock,
    logInfo: logInfoMock,
    logWarning: logWarningMock,
  },
}));

import { POST_handler } from './handler';

const createRequestContext = (): ApiHandlerContext =>
  ({
    requestId: 'request-client-errors-1',
    traceId: 'trace-client-errors-1',
    correlationId: 'corr-client-errors-1',
    startTime: Date.now(),
    getElapsedMs: () => 1,
  }) as ApiHandlerContext;

const createRequest = (
  rawBody: unknown,
  headers: Record<string, string> = {}
): NextRequest =>
  ({
    headers: new Headers(headers),
    json: vi.fn().mockResolvedValue(rawBody),
  }) as unknown as NextRequest;

const createRejectingRequest = (headers: Record<string, string> = {}): NextRequest =>
  ({
    headers: new Headers(headers),
    json: vi.fn().mockRejectedValue(new Error('invalid json')),
  }) as unknown as NextRequest;

describe('client errors handler', () => {
  const originalNodeEnv = process.env['NODE_ENV'];

  beforeEach(() => {
    vi.clearAllMocks();
    process.env['NODE_ENV'] = 'test';
    captureExceptionMock.mockResolvedValue(undefined);
    logInfoMock.mockResolvedValue(undefined);
    logWarningMock.mockResolvedValue(undefined);
  });

  afterEach(() => {
    process.env['NODE_ENV'] = originalNodeEnv;
    vi.restoreAllMocks();
  });

  it('drops oversized payloads before parsing the body', async () => {
    const response = await POST_handler(
      createRequest(
        { message: 'ignored' },
        {
          'content-length': '64001',
        }
      ),
      createRequestContext()
    );

    await expect(response.json()).resolves.toEqual({
      ok: true,
      success: true,
      dropped: true,
      reason: 'payload_too_large',
    });
    expect(captureExceptionMock).not.toHaveBeenCalled();
    expect(logInfoMock).not.toHaveBeenCalled();
    expect(logWarningMock).not.toHaveBeenCalled();
  });

  it('drops empty or unparsable payloads as invalid', async () => {
    const emptyResponse = await POST_handler(createRequest({}), createRequestContext());
    await expect(emptyResponse.json()).resolves.toEqual({
      ok: true,
      success: true,
      dropped: true,
      reason: 'invalid_payload',
    });

    const invalidJsonResponse = await POST_handler(createRejectingRequest(), createRequestContext());
    await expect(invalidJsonResponse.json()).resolves.toEqual({
      ok: true,
      success: true,
      dropped: true,
      reason: 'invalid_payload',
    });
    expect(captureExceptionMock).not.toHaveBeenCalled();
  });

  it('drops abort-like client errors without reporting them', async () => {
    const response = await POST_handler(
      createRequest({
        name: 'AbortError',
        message: 'Request aborted by navigation',
      }),
      createRequestContext()
    );

    await expect(response.json()).resolves.toEqual({
      ok: true,
      success: true,
      dropped: true,
      reason: 'aborted_request',
    });
    expect(captureExceptionMock).not.toHaveBeenCalled();
  });

  it('drops noisy development fetch failures for GET api requests', async () => {
    process.env['NODE_ENV'] = 'development';

    const response = await POST_handler(
      createRequest({
        message: 'Failed to fetch',
        context: {
          endpoint: '/api/settings/lite',
          method: 'GET',
        },
      }),
      createRequestContext()
    );

    await expect(response.json()).resolves.toEqual({
      ok: true,
      success: true,
      dropped: true,
      reason: 'network_fetch_failed',
    });
    expect(captureExceptionMock).not.toHaveBeenCalled();
  });

  it('logs info-level reports with normalized client context', async () => {
    const response = await POST_handler(
      createRequest({
        message: 'Hydration mismatch observed',
        url: '/home',
        timestamp: '2026-03-25T09:45:00.000Z',
        userAgent: 'unit-test-browser',
        context: {
          level: 'info',
          feature: 'homepage',
          count: 3,
        },
      }),
      createRequestContext()
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ ok: true, success: true });
    expect(logInfoMock).toHaveBeenCalledWith(
      'Hydration mismatch observed',
      expect.objectContaining({
        level: 'info',
        feature: 'homepage',
        count: 3,
        url: '/home',
        clientTimestamp: '2026-03-25T09:45:00.000Z',
        clientUserAgent: 'unit-test-browser',
        source: 'client.error.reporter',
        service: 'client-error-reporter',
      })
    );
    expect(captureExceptionMock).not.toHaveBeenCalled();
  });

  it('logs warn-level reports when the payload requests it', async () => {
    const response = await POST_handler(
      createRequest({
        message: 'Recoverable rendering issue',
        context: {
          level: 'warn',
          feature: 'gallery',
        },
      }),
      createRequestContext()
    );

    expect(response.status).toBe(200);
    expect(logWarningMock).toHaveBeenCalledWith(
      'Recoverable rendering issue',
      expect.objectContaining({
        level: 'warn',
        feature: 'gallery',
        source: 'client.error.reporter',
        service: 'client-error-reporter',
      })
    );
    expect(captureExceptionMock).not.toHaveBeenCalled();
  });

  it('captures invalid but meaningful payloads and flags them as payloadInvalid', async () => {
    const response = await POST_handler(
      createRequest({
        message: 'x'.repeat(2105),
        stack: 'stack trace from the browser',
      }),
      createRequestContext()
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ ok: true, success: true });
    expect(captureExceptionMock).toHaveBeenCalledTimes(1);

    const [error, context] = captureExceptionMock.mock.calls[0] as [Error, Record<string, unknown>];
    expect(error).toBeInstanceOf(Error);
    expect(error.message).toContain('[truncated]');
    expect(context).toEqual(
      expect.objectContaining({
        payloadInvalid: true,
        source: 'client.error.reporter',
        service: 'client-error-reporter',
      })
    );
  });

  it('captures error-level reports and redacts sensitive context keys', async () => {
    const response = await POST_handler(
      createRequest({
        name: 'TypeError',
        message: 'Unhandled client exception',
        digest: 'digest-1',
        componentStack: 'at AppShell',
        context: {
          level: 'error',
          password: 'super-secret',
          token: 'abc123',
          nested: {
            authorization: 'Bearer test',
          },
          feature: 'checkout',
        },
      }),
      createRequestContext()
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ ok: true, success: true });
    expect(captureExceptionMock).toHaveBeenCalledTimes(1);

    const [error, context] = captureExceptionMock.mock.calls[0] as [Error, Record<string, unknown>];
    expect(error.name).toBe('TypeError');
    expect(error.message).toBe('Unhandled client exception');
    expect(context).toEqual(
      expect.objectContaining({
        digest: 'digest-1',
        componentStack: 'at AppShell',
        feature: 'checkout',
        password: '[REDACTED]',
        token: '[REDACTED]',
        nested: {
          authorization: '[REDACTED]',
        },
        source: 'client.error.reporter',
        service: 'client-error-reporter',
      })
    );
  });
});
