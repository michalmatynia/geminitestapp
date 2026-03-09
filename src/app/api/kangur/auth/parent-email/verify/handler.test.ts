import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { ApiHandlerContext } from '@/shared/contracts/ui';

const { verifyKangurParentEmailMock } = vi.hoisted(() => ({
  verifyKangurParentEmailMock: vi.fn(),
}));

vi.mock('@/features/kangur/server/parent-email-auth', () => ({
  verifyKangurParentEmail: verifyKangurParentEmailMock,
}));

import { postKangurParentEmailVerifyHandler } from './handler';

const createRequestContext = (): ApiHandlerContext =>
  ({
    requestId: 'request-kangur-parent-email-verify-1',
    traceId: 'trace-kangur-parent-email-verify-1',
    correlationId: 'corr-kangur-parent-email-verify-1',
    startTime: Date.now(),
    getElapsedMs: () => 1,
  }) as ApiHandlerContext;

describe('kangur parent email verify handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('verifies the token and returns the activated parent account response', async () => {
    const requestContext = createRequestContext();
    requestContext.body = {
      token: 'verify-token-1',
    };

    verifyKangurParentEmailMock.mockResolvedValue({
      email: 'parent@example.com',
      callbackUrl: '/tests?focus=division',
      emailVerified: true,
    });

    const response = await postKangurParentEmailVerifyHandler(
      new Request('http://localhost/api/kangur/auth/parent-email/verify', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(requestContext.body),
      }),
      requestContext
    );

    expect(verifyKangurParentEmailMock).toHaveBeenCalledWith('verify-token-1');
    await expect(response.json()).resolves.toEqual({
      ok: true,
      email: 'parent@example.com',
      callbackUrl: '/tests?focus=division',
      emailVerified: true,
      message:
        'Email zostal zweryfikowany. Konto rodzica jest gotowe, AI Tutor jest odblokowany i mozesz zalogowac sie emailem oraz haslem.',
    });
  });
});
