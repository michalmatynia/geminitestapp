import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { ApiHandlerContext } from '@/shared/contracts/ui/api';

const { resolveKangurActorMock, setKangurParentPasswordMock } = vi.hoisted(() => ({
  resolveKangurActorMock: vi.fn(),
  setKangurParentPasswordMock: vi.fn(),
}));

vi.mock('@/features/kangur/server', () => ({
  resolveKangurActor: resolveKangurActorMock,
}));

vi.mock('@/features/kangur/server/parent-email-auth', () => ({
  setKangurParentPassword: setKangurParentPasswordMock,
}));

import { postKangurParentPasswordHandler } from './handler';

const createRequestContext = (): ApiHandlerContext =>
  ({
    requestId: 'request-kangur-parent-password-1',
    traceId: 'trace-kangur-parent-password-1',
    correlationId: 'corr-kangur-parent-password-1',
    startTime: Date.now(),
    getElapsedMs: () => 1,
  }) as ApiHandlerContext;

describe('kangur parent password handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('sets a password for the authenticated parent account', async () => {
    const requestContext = createRequestContext();
    requestContext.body = {
      password: 'Magic123!',
    };

    resolveKangurActorMock.mockResolvedValue({
      canManageLearners: true,
      ownerUserId: 'parent-1',
    });
    setKangurParentPasswordMock.mockResolvedValue({
      email: 'parent@example.com',
      hasPassword: true,
    });

    const response = await postKangurParentPasswordHandler(
      new NextRequest('http://localhost/api/kangur/auth/parent-password', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          password: 'Magic123!',
        }),
      }),
      requestContext
    );

    expect(resolveKangurActorMock).toHaveBeenCalledTimes(1);
    expect(setKangurParentPasswordMock).toHaveBeenCalledWith({
      userId: 'parent-1',
      password: 'Magic123!',
      locale: 'pl',
    });
    await expect(response.json()).resolves.toEqual({
      ok: true,
      email: 'parent@example.com',
      hasPassword: true,
      message: 'Hasło rodzica zostało ustawione. Od teraz możesz logować się e-mailem i hasłem.',
    });
  });
});
