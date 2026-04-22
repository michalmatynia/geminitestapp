import bcrypt from 'bcryptjs';
import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { ApiHandlerContext } from '@/shared/contracts/ui/api';

const {
  checkLoginAllowedMock,
  createLoginChallengeMock,
  extractClientIpMock,
  findAuthUserByEmailMock,
  getAuthSecurityProfileMock,
  getAuthUserPageSettingsMock,
  logAuthEventMock,
  recordLoginFailureMock,
} = vi.hoisted(() => ({
  checkLoginAllowedMock: vi.fn(),
  createLoginChallengeMock: vi.fn(),
  extractClientIpMock: vi.fn(),
  findAuthUserByEmailMock: vi.fn(),
  getAuthSecurityProfileMock: vi.fn(),
  getAuthUserPageSettingsMock: vi.fn(),
  logAuthEventMock: vi.fn(),
  recordLoginFailureMock: vi.fn(),
}));

vi.mock('bcryptjs', () => ({
  default: {
    compare: vi.fn(),
  },
}));

vi.mock('@/features/auth/server', () => ({
  findAuthUserByEmail: findAuthUserByEmailMock,
  getAuthSecurityProfile: getAuthSecurityProfileMock,
  checkLoginAllowed: checkLoginAllowedMock,
  extractClientIp: extractClientIpMock,
  recordLoginFailure: recordLoginFailureMock,
  getAuthUserPageSettings: getAuthUserPageSettingsMock,
  createLoginChallenge: createLoginChallengeMock,
  logAuthEvent: logAuthEventMock,
}));

import { postHandler } from './handler';

const createRequestContext = (): ApiHandlerContext =>
  ({
    requestId: 'request-auth-verify-credentials-1',
    traceId: 'trace-auth-verify-credentials-1',
    correlationId: 'corr-auth-verify-credentials-1',
    startTime: Date.now(),
    getElapsedMs: () => 1,
  }) as ApiHandlerContext;

describe('auth verify-credentials handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    extractClientIpMock.mockReturnValue('127.0.0.1');
    checkLoginAllowedMock.mockResolvedValue({
      allowed: true,
      reason: null,
      lockedUntil: null,
    });
    getAuthSecurityProfileMock.mockResolvedValue({
      bannedAt: null,
      disabledAt: null,
      allowedIps: [],
      mfaEnabled: false,
    });
    logAuthEventMock.mockResolvedValue(undefined);
    recordLoginFailureMock.mockResolvedValue(undefined);
  });

  it('blocks kangur parent credential verification until the email is verified', async () => {
    const requestContext = createRequestContext();
    requestContext.body = {
      email: 'parent@example.com',
      password: 'Secret123!',
      authFlow: 'kangur_parent',
    };

    findAuthUserByEmailMock.mockResolvedValue({
      id: 'parent-1',
      email: 'parent@example.com',
      passwordHash: 'stored-password-hash',
      emailVerified: null,
    });
    getAuthUserPageSettingsMock.mockResolvedValue({
      requireEmailVerification: false,
    });

    const response = await postHandler(
      new NextRequest('http://localhost/api/auth/verify-credentials', {
        method: 'POST',
        headers: {
          'accept-language': 'en-US,en;q=0.9',
          'content-type': 'application/json',
        },
        body: JSON.stringify(requestContext.body),
      }),
      requestContext
    );

    await expect(response.json()).resolves.toEqual({
      ok: false,
      code: 'EMAIL_UNVERIFIED',
      message: 'Email verification is required.',
    });
    expect(recordLoginFailureMock).toHaveBeenCalledTimes(1);
    expect(bcrypt.compare).not.toHaveBeenCalled();
    expect(createLoginChallengeMock).not.toHaveBeenCalled();
  });

  it('returns a password setup recovery code for legacy Kangur parent accounts without a password', async () => {
    const requestContext = createRequestContext();
    requestContext.body = {
      email: 'parent@example.com',
      password: 'Secret123!',
      authFlow: 'kangur_parent',
    };

    findAuthUserByEmailMock.mockResolvedValue({
      id: 'parent-1',
      email: 'parent@example.com',
      passwordHash: null,
      emailVerified: null,
    });

    const response = await postHandler(
      new NextRequest('http://localhost/api/auth/verify-credentials', {
        method: 'POST',
        headers: {
          'accept-language': 'en-US,en;q=0.9',
          'content-type': 'application/json',
        },
        body: JSON.stringify(requestContext.body),
      }),
      requestContext
    );

    await expect(response.json()).resolves.toEqual({
      ok: false,
      code: 'PASSWORD_SETUP_REQUIRED',
      message: 'Password setup is required before email verification can continue.',
    });
    expect(recordLoginFailureMock).toHaveBeenCalledTimes(1);
    expect(getAuthSecurityProfileMock).not.toHaveBeenCalled();
    expect(getAuthUserPageSettingsMock).not.toHaveBeenCalled();
    expect(bcrypt.compare).not.toHaveBeenCalled();
    expect(createLoginChallengeMock).not.toHaveBeenCalled();
  });

  it('still allows non-Kangur credential verification when global email verification is disabled', async () => {
    const requestContext = createRequestContext();
    requestContext.body = {
      email: 'parent@example.com',
      password: 'Secret123!',
    };

    findAuthUserByEmailMock.mockResolvedValue({
      id: 'parent-1',
      email: 'parent@example.com',
      passwordHash: 'stored-password-hash',
      emailVerified: null,
    });
    getAuthUserPageSettingsMock.mockResolvedValue({
      requireEmailVerification: false,
    });
    vi.mocked(bcrypt.compare).mockResolvedValue(true);
    createLoginChallengeMock.mockResolvedValue({
      id: 'challenge-1',
      expiresAt: new Date('2026-03-09T04:35:00.000Z'),
      mfaRequired: false,
    });

    const response = await postHandler(
      new NextRequest('http://localhost/api/auth/verify-credentials', {
        method: 'POST',
        headers: {
          'accept-language': 'en-US,en;q=0.9',
          'content-type': 'application/json',
        },
        body: JSON.stringify(requestContext.body),
      }),
      requestContext
    );

    await expect(response.json()).resolves.toEqual({
      ok: true,
      mfaRequired: false,
      challengeId: 'challenge-1',
      expiresAt: '2026-03-09T04:35:00.000Z',
    });
    expect(bcrypt.compare).toHaveBeenCalledWith('Secret123!', 'stored-password-hash');
    expect(createLoginChallengeMock).toHaveBeenCalledWith({
      userId: 'parent-1',
      email: 'parent@example.com',
      ip: '127.0.0.1',
      mfaRequired: false,
    });
  });
});
