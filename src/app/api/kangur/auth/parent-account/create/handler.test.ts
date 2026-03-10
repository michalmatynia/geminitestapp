import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { DEFAULT_KANGUR_AI_TUTOR_CONTENT } from '@/shared/contracts/kangur-ai-tutor-content';
import type { ApiHandlerContext } from '@/shared/contracts/ui';

const {
  buildKangurParentAccountCreateDebugPayloadMock,
  createKangurParentAccountMock,
  getKangurAiTutorContentMock,
} = vi.hoisted(() => ({
  buildKangurParentAccountCreateDebugPayloadMock: vi.fn(),
  createKangurParentAccountMock: vi.fn(),
  getKangurAiTutorContentMock: vi.fn(),
}));

vi.mock('@/features/kangur/server/parent-email-auth', () => ({
  buildKangurParentAccountCreateDebugPayload: buildKangurParentAccountCreateDebugPayloadMock,
  createKangurParentAccount: createKangurParentAccountMock,
}));

vi.mock('@/features/kangur/server/ai-tutor-content-repository', () => ({
  getKangurAiTutorContent: getKangurAiTutorContentMock,
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
});
