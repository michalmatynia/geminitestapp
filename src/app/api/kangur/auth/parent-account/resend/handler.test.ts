import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { ApiHandlerContext } from '@/shared/contracts/ui/api';

const {
  buildKangurParentAccountCreateDebugPayloadMock,
  resendKangurParentVerificationEmailMock,
} = vi.hoisted(() => ({
  buildKangurParentAccountCreateDebugPayloadMock: vi.fn(),
  resendKangurParentVerificationEmailMock: vi.fn(),
}));

vi.mock('@/features/kangur/server/parent-email-auth', () => ({
  buildKangurParentAccountCreateDebugPayload: buildKangurParentAccountCreateDebugPayloadMock,
  resendKangurParentVerificationEmail: resendKangurParentVerificationEmailMock,
}));

import { postKangurParentAccountResendHandler } from './handler';

const createRequestContext = (): ApiHandlerContext =>
  ({
    requestId: 'request-kangur-parent-account-resend-1',
    traceId: 'trace-kangur-parent-account-resend-1',
    correlationId: 'corr-kangur-parent-account-resend-1',
    startTime: Date.now(),
    getElapsedMs: () => 1,
  }) as ApiHandlerContext;

describe('kangur parent account resend handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('resends the parent verification email and returns the verification response', async () => {
    const requestContext = createRequestContext();
    requestContext.body = {
      email: 'parent@example.com',
      callbackUrl: '/tests?focus=division',
    };

    resendKangurParentVerificationEmailMock.mockResolvedValue({
      email: 'parent@example.com',
      created: false,
      emailVerified: false,
      hasPassword: true,
      retryAfterMs: 60000,
      verificationUrl: 'https://example.com/kangur/login?verifyEmailToken=verify-2',
    });
    buildKangurParentAccountCreateDebugPayloadMock.mockReturnValue({
      verificationUrl: 'https://example.com/kangur/login?verifyEmailToken=verify-2',
    });

    const response = await postKangurParentAccountResendHandler(
      new NextRequest('http://localhost/api/kangur/auth/parent-account/resend', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(requestContext.body),
      }),
      requestContext
    );

    expect(resendKangurParentVerificationEmailMock).toHaveBeenCalledWith({
      email: 'parent@example.com',
      callbackUrl: '/tests?focus=division',
      locale: 'pl',
      request: expect.any(NextRequest),
    });
    await expect(response.json()).resolves.toEqual({
      ok: true,
      email: 'parent@example.com',
      created: false,
      emailVerified: false,
      hasPassword: true,
      retryAfterMs: 60000,
      message:
        'Wysłaliśmy nowy email potwierdzający. Konto rodzica uaktywni się po weryfikacji adresu.',
      debug: {
        verificationUrl: 'https://example.com/kangur/login?verifyEmailToken=verify-2',
      },
    });
  });

  it('returns retryAfterMs from resend service payload', async () => {
    const requestContext = createRequestContext();
    requestContext.body = {
      email: 'parent@example.com',
      callbackUrl: '/tests?focus=division',
    };

    resendKangurParentVerificationEmailMock.mockResolvedValue({
      email: 'parent@example.com',
      created: false,
      emailVerified: false,
      hasPassword: true,
      retryAfterMs: 8_000,
      verificationUrl: 'https://example.com/kangur/login?verifyEmailToken=verify-custom',
    });
    buildKangurParentAccountCreateDebugPayloadMock.mockReturnValue({
      verificationUrl: 'https://example.com/kangur/login?verifyEmailToken=verify-custom',
    });

    const response = await postKangurParentAccountResendHandler(
      new NextRequest('http://localhost/api/kangur/auth/parent-account/resend', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(requestContext.body),
      }),
      requestContext
    );

    await expect(response.json()).resolves.toEqual({
      ok: true,
      email: 'parent@example.com',
      created: false,
      emailVerified: false,
      hasPassword: true,
      retryAfterMs: 8_000,
      message:
        'Wysłaliśmy nowy email potwierdzający. Konto rodzica uaktywni się po weryfikacji adresu.',
      debug: {
        verificationUrl: 'https://example.com/kangur/login?verifyEmailToken=verify-custom',
      },
    });
  });
});
