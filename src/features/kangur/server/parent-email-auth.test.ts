import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  getAuthSecurityProfileMock,
  sendAuthEmailMock,
  shouldExposeAuthEmailDebugMock,
  consumeEmailVerificationChallengeMock,
  consumeMagicEmailLinkChallengeMock,
  createEmailVerificationChallengeMock,
  createMagicEmailLinkChallengeMock,
  createMagicLoginChallengeMock,
  ensureAuthUserWithEmailMock,
  markAuthUserEmailVerifiedMock,
  findAuthUserByIdMock,
} = vi.hoisted(() => ({
  getAuthSecurityProfileMock: vi.fn(),
  sendAuthEmailMock: vi.fn(),
  shouldExposeAuthEmailDebugMock: vi.fn(),
  consumeEmailVerificationChallengeMock: vi.fn(),
  consumeMagicEmailLinkChallengeMock: vi.fn(),
  createEmailVerificationChallengeMock: vi.fn(),
  createMagicEmailLinkChallengeMock: vi.fn(),
  createMagicLoginChallengeMock: vi.fn(),
  ensureAuthUserWithEmailMock: vi.fn(),
  markAuthUserEmailVerifiedMock: vi.fn(),
  findAuthUserByIdMock: vi.fn(),
}));

vi.mock('@/features/auth/services/auth-security-profile', () => ({
  getAuthSecurityProfile: getAuthSecurityProfileMock,
}));

vi.mock('@/features/auth/services/auth-email-delivery', () => ({
  sendAuthEmail: sendAuthEmailMock,
  shouldExposeAuthEmailDebug: shouldExposeAuthEmailDebugMock,
}));

vi.mock('@/features/auth/services/auth-login-challenge', () => ({
  consumeEmailVerificationChallenge: consumeEmailVerificationChallengeMock,
  consumeMagicEmailLinkChallenge: consumeMagicEmailLinkChallengeMock,
  createEmailVerificationChallenge: createEmailVerificationChallengeMock,
  createMagicEmailLinkChallenge: createMagicEmailLinkChallengeMock,
  createMagicLoginChallenge: createMagicLoginChallengeMock,
}));

vi.mock('@/features/auth/services/auth-user-write-service', () => ({
  ensureAuthUserWithEmail: ensureAuthUserWithEmailMock,
  markAuthUserEmailVerified: markAuthUserEmailVerifiedMock,
}));

vi.mock('@/features/auth/server', () => ({
  findAuthUserById: findAuthUserByIdMock,
  normalizeAuthEmail: (value: string) => value.trim().toLowerCase(),
}));

import {
  buildKangurParentMagicLinkDebugPayload,
  exchangeKangurParentMagicLink,
  requestKangurParentMagicLink,
  verifyKangurParentEmail,
} from './parent-email-auth';

describe('parent email auth service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    shouldExposeAuthEmailDebugMock.mockReturnValue(true);
    getAuthSecurityProfileMock.mockResolvedValue({
      bannedAt: null,
      disabledAt: null,
    });
  });

  it('creates magic login and verification links for an unverified parent account', async () => {
    ensureAuthUserWithEmailMock.mockResolvedValue({
      created: true,
      user: {
        id: 'parent-1',
        email: 'parent@example.com',
        name: 'Parent',
        passwordHash: null,
        emailVerified: null,
      },
    });
    createMagicEmailLinkChallengeMock.mockResolvedValue({
      id: 'magic-link-1',
      expiresAt: new Date('2026-03-08T21:00:00.000Z'),
    });
    createEmailVerificationChallengeMock.mockResolvedValue({
      id: 'verify-link-1',
      expiresAt: new Date('2026-03-15T21:00:00.000Z'),
    });
    sendAuthEmailMock.mockResolvedValue(undefined);
    const expectedOrigin =
      process.env['NEXT_PUBLIC_APP_URL']?.trim() ||
      process.env['NEXTAUTH_URL']?.trim() ||
      process.env['PLAYWRIGHT_BASE_URL']?.trim() ||
      'http://localhost:3000';

    const result = await requestKangurParentMagicLink({
      email: 'Parent@example.com',
      callbackUrl: '/kangur/tests?focus=division',
      request: new Request('https://example.com/api/kangur/auth/parent-magic-link/request'),
    });

    expect(ensureAuthUserWithEmailMock).toHaveBeenCalledWith({
      email: 'parent@example.com',
      name: 'parent',
    });
    expect(createMagicEmailLinkChallengeMock).toHaveBeenCalledWith({
      userId: 'parent-1',
      email: 'parent@example.com',
      callbackUrl: '/kangur/tests?focus=division',
    });
    expect(createEmailVerificationChallengeMock).toHaveBeenCalledWith({
      userId: 'parent-1',
      email: 'parent@example.com',
      callbackUrl: '/kangur/tests?focus=division',
    });
    expect(sendAuthEmailMock).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'parent@example.com',
        purpose: 'magic_login',
        text: expect.stringContaining('magicLinkToken=magic-link-1'),
      })
    );
    expect(result).toEqual({
      email: 'parent@example.com',
      created: true,
      emailVerified: false,
      hasPassword: false,
      magicLinkUrl: `${expectedOrigin}/kangur/login?callbackUrl=%2Fkangur%2Ftests%3Ffocus%3Ddivision&magicLinkToken=magic-link-1`,
      verificationUrl: `${expectedOrigin}/kangur/login?callbackUrl=%2Fkangur%2Ftests%3Ffocus%3Ddivision&verifyEmailToken=verify-link-1`,
    });
    expect(buildKangurParentMagicLinkDebugPayload(result)).toEqual({
      magicLinkUrl: `${expectedOrigin}/kangur/login?callbackUrl=%2Fkangur%2Ftests%3Ffocus%3Ddivision&magicLinkToken=magic-link-1`,
      verificationUrl: `${expectedOrigin}/kangur/login?callbackUrl=%2Fkangur%2Ftests%3Ffocus%3Ddivision&verifyEmailToken=verify-link-1`,
    });
  });

  it('exchanges a magic email link token for a sign-in challenge', async () => {
    consumeMagicEmailLinkChallengeMock.mockResolvedValue({
      userId: 'parent-1',
      email: 'parent@example.com',
      callbackUrl: '/kangur/game',
    });
    findAuthUserByIdMock.mockResolvedValue({
      id: 'parent-1',
      email: 'parent@example.com',
      emailVerified: null,
    });
    createMagicLoginChallengeMock.mockResolvedValue({
      id: 'challenge-1',
      expiresAt: new Date('2026-03-08T21:05:00.000Z'),
    });

    await expect(exchangeKangurParentMagicLink('magic-link-1')).resolves.toEqual({
      email: 'parent@example.com',
      challengeId: 'challenge-1',
      callbackUrl: '/kangur/game',
      emailVerified: false,
    });
    expect(createMagicLoginChallengeMock).toHaveBeenCalledWith({
      userId: 'parent-1',
      email: 'parent@example.com',
      callbackUrl: '/kangur/game',
    });
  });

  it('marks a parent email as verified from the verification token', async () => {
    consumeEmailVerificationChallengeMock.mockResolvedValue({
      userId: 'parent-1',
      email: 'parent@example.com',
      callbackUrl: '/kangur/lessons',
    });
    markAuthUserEmailVerifiedMock.mockResolvedValue({
      id: 'parent-1',
      email: 'parent@example.com',
      emailVerified: new Date('2026-03-08T21:10:00.000Z'),
    });

    await expect(verifyKangurParentEmail('verify-link-1')).resolves.toEqual({
      email: 'parent@example.com',
      callbackUrl: '/kangur/lessons',
      emailVerified: true,
    });
    expect(markAuthUserEmailVerifiedMock).toHaveBeenCalledWith('parent-1');
  });
});
