import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { DEFAULT_KANGUR_AI_TUTOR_CONTENT } from '@/shared/contracts/kangur-ai-tutor-content';
import type { ApiHandlerContext } from '@/shared/contracts/ui';

const {
  buildKangurParentAccountCreateDebugPayloadMock,
  createKangurParentAccountMock,
  getKangurAiTutorContentMock,
  verifyKangurParentCaptchaMock,
  readStoredSettingValueMock,
} = vi.hoisted(() => ({
  buildKangurParentAccountCreateDebugPayloadMock: vi.fn(),
  createKangurParentAccountMock: vi.fn(),
  getKangurAiTutorContentMock: vi.fn(),
  verifyKangurParentCaptchaMock: vi.fn(),
  readStoredSettingValueMock: vi.fn(),
}));

vi.mock('@/features/kangur/server/parent-email-auth', () => ({
  buildKangurParentAccountCreateDebugPayload: buildKangurParentAccountCreateDebugPayloadMock,
  createKangurParentAccount: createKangurParentAccountMock,
}));

vi.mock('@/features/kangur/server/ai-tutor-content-repository', () => ({
  getKangurAiTutorContent: getKangurAiTutorContentMock,
}));

vi.mock('@/features/kangur/server/parent-account-captcha', () => ({
  verifyKangurParentCaptcha: verifyKangurParentCaptchaMock,
}));

vi.mock('@/shared/lib/ai-brain/server', () => ({
  readStoredSettingValue: readStoredSettingValueMock,
}));

import { postKangurParentAccountCreateHandler } from './handler';

const createRequestContext = (): ApiHandlerContext =>
  ({
    requestId: 'request-kangur-parent-account-create-1',
    traceId: 'trace-kangur-parent-account-create-1',
    correlationId: 'corr-kangur-parent-account-create-1',
    startTime: Date.now(),
    getElapsedMs: () => 1,
  }) as ApiHandlerContext;

describe('kangur parent account create handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getKangurAiTutorContentMock.mockResolvedValue(DEFAULT_KANGUR_AI_TUTOR_CONTENT);
    verifyKangurParentCaptchaMock.mockResolvedValue({ ok: true, required: false });
    readStoredSettingValueMock.mockResolvedValue(null);
  });

  it('stages parent account creation and returns the verification response', async () => {
    const requestContext = createRequestContext();
    requestContext.body = {
      email: 'parent@example.com',
      password: 'Strong123!',
      callbackUrl: '/tests?focus=division',
    };

    createKangurParentAccountMock.mockResolvedValue({
      email: 'parent@example.com',
      created: true,
      emailVerified: false,
      hasPassword: true,
      retryAfterMs: 60000,
      verificationUrl: 'https://example.com/kangur/login?verifyEmailToken=verify-1',
    });
    buildKangurParentAccountCreateDebugPayloadMock.mockReturnValue({
      verificationUrl: 'https://example.com/kangur/login?verifyEmailToken=verify-1',
    });

    const response = await postKangurParentAccountCreateHandler(
      new NextRequest('http://localhost/api/kangur/auth/parent-account/create', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(requestContext.body),
      }),
      requestContext
    );

    expect(verifyKangurParentCaptchaMock).toHaveBeenCalledWith({
      token: undefined,
      request: expect.any(NextRequest),
      requireCaptcha: true,
    });
    expect(createKangurParentAccountMock).toHaveBeenCalledWith({
      email: 'parent@example.com',
      password: 'Strong123!',
      callbackUrl: '/tests?focus=division',
      request: expect.any(NextRequest),
    });
    await expect(response.json()).resolves.toEqual({
      ok: true,
      email: 'parent@example.com',
      created: true,
      emailVerified: false,
      hasPassword: true,
      retryAfterMs: 60000,
      message:
        DEFAULT_KANGUR_AI_TUTOR_CONTENT.parentVerification.createSuccessMessage,
      debug: {
        verificationUrl: 'https://example.com/kangur/login?verifyEmailToken=verify-1',
      },
    });
  });

  it('returns retryAfterMs from create service payload', async () => {
    const requestContext = createRequestContext();
    requestContext.body = {
      email: 'parent@example.com',
      password: 'Strong123!',
      callbackUrl: '/tests?focus=division',
    };

    createKangurParentAccountMock.mockResolvedValue({
      email: 'parent@example.com',
      created: true,
      emailVerified: false,
      hasPassword: true,
      retryAfterMs: 15_000,
      verificationUrl: 'https://example.com/kangur/login?verifyEmailToken=verify-custom',
    });
    buildKangurParentAccountCreateDebugPayloadMock.mockReturnValue({
      verificationUrl: 'https://example.com/kangur/login?verifyEmailToken=verify-custom',
    });

    const response = await postKangurParentAccountCreateHandler(
      new NextRequest('http://localhost/api/kangur/auth/parent-account/create', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(requestContext.body),
      }),
      requestContext
    );

    await expect(response.json()).resolves.toEqual({
      ok: true,
      email: 'parent@example.com',
      created: true,
      emailVerified: false,
      hasPassword: true,
      retryAfterMs: 15_000,
      message:
        DEFAULT_KANGUR_AI_TUTOR_CONTENT.parentVerification.createSuccessMessage,
      debug: {
        verificationUrl: 'https://example.com/kangur/login?verifyEmailToken=verify-custom',
      },
    });
  });

  it('rejects when captcha is required but missing', async () => {
    const requestContext = createRequestContext();
    requestContext.body = {
      email: 'parent@example.com',
      password: 'Strong123!',
      callbackUrl: '/tests?focus=division',
    };

    verifyKangurParentCaptchaMock.mockResolvedValue({
      ok: false,
      required: true,
      reason: 'missing-token',
    });

    await expect(
      postKangurParentAccountCreateHandler(
        new NextRequest('http://localhost/api/kangur/auth/parent-account/create', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(requestContext.body),
        }),
        requestContext
      )
    ).rejects.toThrow('Potwierdź, że nie jesteś botem.');

    expect(createKangurParentAccountMock).not.toHaveBeenCalled();
  });

  it('rejects when captcha verification fails', async () => {
    const requestContext = createRequestContext();
    requestContext.body = {
      email: 'parent@example.com',
      password: 'Strong123!',
      callbackUrl: '/tests?focus=division',
    };

    verifyKangurParentCaptchaMock.mockResolvedValue({
      ok: false,
      required: true,
      reason: 'invalid-input-response',
    });

    await expect(
      postKangurParentAccountCreateHandler(
        new NextRequest('http://localhost/api/kangur/auth/parent-account/create', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(requestContext.body),
        }),
        requestContext
      )
    ).rejects.toThrow('Nie udało się zweryfikować Captcha. Spróbuj ponownie.');

    expect(createKangurParentAccountMock).not.toHaveBeenCalled();
  });
});
