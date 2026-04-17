import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { ApiHandlerContext } from '@/shared/contracts/ui/api';

const {
  readOptionalServerAuthSessionMock,
  getLiveScripterSessionMock,
  disposeLiveScripterSessionMock,
} = vi.hoisted(() => ({
  readOptionalServerAuthSessionMock: vi.fn(),
  getLiveScripterSessionMock: vi.fn(),
  disposeLiveScripterSessionMock: vi.fn(),
}));

vi.mock('@/features/auth/server', () => ({
  readOptionalServerAuthSession: () => readOptionalServerAuthSessionMock(),
}));

vi.mock('@/features/playwright/server/live-session', () => ({
  getLiveScripterSession: (...args: unknown[]) => getLiveScripterSessionMock(...args),
  disposeLiveScripterSession: (...args: unknown[]) =>
    disposeLiveScripterSessionMock(...args),
}));

import { POST_handler } from './handler';

const createContext = (body: Record<string, unknown>): ApiHandlerContext =>
  ({
    requestId: 'request-live-scripter-dispose-1',
    traceId: 'trace-live-scripter-dispose-1',
    correlationId: 'corr-live-scripter-dispose-1',
    startTime: Date.now(),
    getElapsedMs: () => 1,
    body,
  }) as ApiHandlerContext;

describe('playwright live scripter dispose handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    readOptionalServerAuthSessionMock.mockResolvedValue({
      user: {
        id: 'admin-1',
        isElevated: true,
      },
    });
    getLiveScripterSessionMock.mockReturnValue({
      id: 'session-123',
      ownerUserId: 'admin-1',
    });
    disposeLiveScripterSessionMock.mockResolvedValue(undefined);
  });

  it('disposes a live scripter session owned by the current admin', async () => {
    const response = await POST_handler(
      new NextRequest('http://localhost/api/playwright/live-scripter/dispose', {
        method: 'POST',
      }),
      createContext({ sessionId: 'session-123' })
    );

    expect(getLiveScripterSessionMock).toHaveBeenCalledWith('session-123');
    expect(disposeLiveScripterSessionMock).toHaveBeenCalledWith('session-123');
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ ok: true });
  });

  it('rejects a live scripter session owned by another admin', async () => {
    getLiveScripterSessionMock.mockReturnValue({
      id: 'session-123',
      ownerUserId: 'admin-2',
    });

    await expect(
      POST_handler(
        new NextRequest('http://localhost/api/playwright/live-scripter/dispose', {
          method: 'POST',
        }),
        createContext({ sessionId: 'session-123' })
      )
    ).rejects.toThrow('Live scripter session access denied.');
  });

  it('rejects non-admin access', async () => {
    readOptionalServerAuthSessionMock.mockResolvedValue({
      user: {
        id: 'user-1',
        isElevated: false,
      },
    });

    await expect(
      POST_handler(
        new NextRequest('http://localhost/api/playwright/live-scripter/dispose', {
          method: 'POST',
        }),
        createContext({ sessionId: 'session-123' })
      )
    ).rejects.toThrow('Admin access is required for Playwright live scripter.');
  });
});
