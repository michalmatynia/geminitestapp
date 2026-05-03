import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { ApiHandlerContext } from '@/shared/contracts/ui/api';

const { readOptionalServerAuthSessionMock, createLiveScripterSessionMock } = vi.hoisted(() => ({
  readOptionalServerAuthSessionMock: vi.fn(),
  createLiveScripterSessionMock: vi.fn(),
}));

vi.mock('@/features/auth/server', () => ({
  readOptionalServerAuthSession: () => readOptionalServerAuthSessionMock(),
}));

vi.mock('@/features/playwright/server/live-session', () => ({
  createLiveScripterSession: (...args: unknown[]) => createLiveScripterSessionMock(...args),
}));

import { postHandler } from './handler';

const createContext = (body: Record<string, unknown>): ApiHandlerContext =>
  ({
    requestId: 'request-live-scripter-start-1',
    traceId: 'trace-live-scripter-start-1',
    correlationId: 'corr-live-scripter-start-1',
    startTime: Date.now(),
    getElapsedMs: () => 1,
    body,
  }) as ApiHandlerContext;

describe('playwright live scripter start handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    readOptionalServerAuthSessionMock.mockResolvedValue({
      user: {
        id: 'admin-1',
        isElevated: true,
      },
    });
    createLiveScripterSessionMock.mockResolvedValue({
      sessionId: 'session-123',
    });
  });

  it('creates a live scripter session for an elevated admin', async () => {
    const response = await postHandler(
      new NextRequest('http://localhost/api/playwright/live-scripter/start', {
        method: 'POST',
      }),
      createContext({
        url: 'https://example.com/product',
        viewport: { width: 1440, height: 900 },
        personaId: 'persona-1',
        selectorProfile: 'default',
      })
    );

    expect(createLiveScripterSessionMock).toHaveBeenCalledWith({
      ownerUserId: 'admin-1',
      url: 'https://example.com/product',
      viewport: { width: 1440, height: 900 },
      personaId: 'persona-1',
      selectorProfile: 'default',
    });
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      sessionId: 'session-123',
      socketPath: '/api/playwright/live-scripter/ws?sessionId=session-123',
    });
  });

  it('rejects non-admin access', async () => {
    readOptionalServerAuthSessionMock.mockResolvedValue({
      user: {
        id: 'user-1',
        isElevated: false,
      },
    });

    await expect(
      postHandler(
        new NextRequest('http://localhost/api/playwright/live-scripter/start', {
          method: 'POST',
        }),
        createContext({ url: 'https://example.com/product' })
      )
    ).rejects.toThrow('Admin access is required for Playwright live scripter.');
  });
});
