import { NextRequest } from 'next/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { ApiHandlerContext } from '@/shared/contracts/ui/api';

const { handlersGetMock, handlersPostMock, logAuthEventMock, captureExceptionMock } = vi.hoisted(
  () => ({
    handlersGetMock: vi.fn(),
    handlersPostMock: vi.fn(),
    logAuthEventMock: vi.fn(),
    captureExceptionMock: vi.fn(),
  })
);

vi.mock('@/features/auth/server', () => ({
  handlers: {
    GET: handlersGetMock,
    POST: handlersPostMock,
  },
  logAuthEvent: logAuthEventMock,
}));

vi.mock('@/shared/utils/observability/error-system', () => ({
  ErrorSystem: {
    captureException: captureExceptionMock,
  },
}));

import { getHandler, postHandler } from './handler';

const createRequestContext = (): ApiHandlerContext =>
  ({
    requestId: 'request-auth-nextauth-1',
    traceId: 'trace-auth-nextauth-1',
    correlationId: 'corr-auth-nextauth-1',
    startTime: Date.now(),
    getElapsedMs: () => 1,
  }) as ApiHandlerContext;

const clearAuthSessionMemoState = (): void => {
  delete (
    globalThis as typeof globalThis & {
      __authSessionMemoState?: unknown;
    }
  ).__authSessionMemoState;
};

describe('auth nextauth wrapper handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearAuthSessionMemoState();
    handlersGetMock.mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    );
    handlersPostMock.mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), {
        status: 201,
        headers: { 'Content-Type': 'application/json' },
      })
    );
    logAuthEventMock.mockResolvedValue(undefined);
    captureExceptionMock.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    clearAuthSessionMemoState();
  });

  it('memoizes unauthenticated session responses when no session cookie is present', async () => {
    const nowSpy = vi.spyOn(Date, 'now');
    nowSpy.mockReturnValue(10_000);

    const firstResponse = await getHandler(
      new NextRequest('http://localhost/api/auth/session'),
      createRequestContext()
    );

    expect(firstResponse.status).toBe(200);
    expect(firstResponse.headers.get('X-Session-Cache')).toBe('miss');
    expect(firstResponse.headers.get('Cache-Control')).toBe('no-store');
    expect(firstResponse.headers.get('Server-Timing')).toContain('cache;dur=');
    await expect(firstResponse.json()).resolves.toBeNull();

    nowSpy.mockReturnValue(10_500);

    const secondResponse = await getHandler(
      new NextRequest('http://localhost/api/auth/session'),
      createRequestContext()
    );

    expect(secondResponse.status).toBe(200);
    expect(secondResponse.headers.get('X-Session-Cache')).toBe('hit');
    await expect(secondResponse.json()).resolves.toBeNull();
    expect(handlersGetMock).not.toHaveBeenCalled();
    expect(logAuthEventMock).not.toHaveBeenCalled();
  });

  it('delegates authenticated session GET requests and attaches server timing', async () => {
    handlersGetMock.mockResolvedValue(
      new Response(JSON.stringify({ user: { id: 'user-1' } }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    );

    const request = new NextRequest('http://localhost/api/auth/session', {
      headers: {
        cookie: 'authjs.session-token=session-token-1',
      },
    });

    const response = await getHandler(request, createRequestContext());

    expect(handlersGetMock).toHaveBeenCalledWith(request);
    expect(logAuthEventMock).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        action: 'auth.nextauth',
        stage: 'start',
      })
    );
    expect(logAuthEventMock).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        action: 'auth.nextauth',
        stage: 'success',
        status: 200,
      })
    );
    expect(response.headers.get('Server-Timing')).toContain('handler;dur=');
    await expect(response.json()).resolves.toEqual({
      user: { id: 'user-1' },
    });
  });

  it('falls back to a null session when the session handler throws', async () => {
    const error = new Error('session lookup failed');
    handlersGetMock.mockRejectedValue(error);

    const response = await getHandler(
      new NextRequest('http://localhost/api/auth/session', {
        headers: {
          cookie: 'next-auth.session-token=session-token-2',
        },
      }),
      createRequestContext()
    );

    expect(captureExceptionMock).toHaveBeenCalledWith(error);
    expect(response.status).toBe(200);
    expect(response.headers.get('Cache-Control')).toBe('no-store');
    expect(response.headers.get('X-Session-Cache')).toBe('fallback');
    expect(response.headers.get('Server-Timing')).toContain('handler;dur=');
    await expect(response.json()).resolves.toBeNull();
    expect(logAuthEventMock).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'auth.nextauth',
        stage: 'failure',
        status: 200,
        outcome: 'session-fallback',
      })
    );
  });

  it('rethrows non-session GET errors after capturing them', async () => {
    const error = new Error('providers failed');
    handlersGetMock.mockRejectedValue(error);

    await expect(
      getHandler(
        new NextRequest('http://localhost/api/auth/providers'),
        createRequestContext()
      )
    ).rejects.toBe(error);

    expect(captureExceptionMock).toHaveBeenCalledWith(error);
    expect(logAuthEventMock).toHaveBeenCalledTimes(1);
    expect(logAuthEventMock).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'auth.nextauth',
        stage: 'start',
      })
    );
  });

  it('delegates POST requests and records auth success', async () => {
    handlersPostMock.mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), {
        status: 201,
        headers: { 'Content-Type': 'application/json' },
      })
    );

    const request = new NextRequest('http://localhost/api/auth/callback/credentials', {
      method: 'POST',
      body: JSON.stringify({ email: 'user@example.com' }),
      headers: {
        'content-type': 'application/json',
      },
    });

    const response = await postHandler(request, createRequestContext());

    expect(handlersPostMock).toHaveBeenCalledWith(request);
    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toEqual({ ok: true });
    expect(logAuthEventMock).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        action: 'auth.nextauth',
        stage: 'start',
      })
    );
    expect(logAuthEventMock).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        action: 'auth.nextauth',
        stage: 'success',
        status: 201,
      })
    );
  });
});
