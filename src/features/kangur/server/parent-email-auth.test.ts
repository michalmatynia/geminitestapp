import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  createAuthUserWithEmailMock,
  findAuthUserByEmailMock,
  findAuthUserByIdMock,
  getAuthSecurityProfileMock,
  sendAuthEmailMock,
  shouldExposeAuthEmailDebugMock,
  consumeEmailVerificationChallengeMock,
  createEmailVerificationChallengeMock,
  getAuthSecurityPolicyMock,
  markAuthUserEmailVerifiedMock,
  setAuthUserPasswordMock,
  validatePasswordStrengthMock,
} = vi.hoisted(() => ({
  createAuthUserWithEmailMock: vi.fn(),
  findAuthUserByEmailMock: vi.fn(),
  findAuthUserByIdMock: vi.fn(),
  getAuthSecurityProfileMock: vi.fn(),
  sendAuthEmailMock: vi.fn(),
  shouldExposeAuthEmailDebugMock: vi.fn(),
  consumeEmailVerificationChallengeMock: vi.fn(),
  createEmailVerificationChallengeMock: vi.fn(),
  getAuthSecurityPolicyMock: vi.fn(),
  markAuthUserEmailVerifiedMock: vi.fn(),
  setAuthUserPasswordMock: vi.fn(),
  validatePasswordStrengthMock: vi.fn(),
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
  createEmailVerificationChallenge: createEmailVerificationChallengeMock,
}));

vi.mock('@/features/auth/services/auth-user-write-service', () => ({
  createAuthUserWithEmail: createAuthUserWithEmailMock,
  markAuthUserEmailVerified: markAuthUserEmailVerifiedMock,
  setAuthUserPassword: setAuthUserPasswordMock,
}));

vi.mock('@/features/auth/server', () => ({
  findAuthUserByEmail: findAuthUserByEmailMock,
  findAuthUserById: findAuthUserByIdMock,
  getAuthSecurityPolicy: getAuthSecurityPolicyMock,
  normalizeAuthEmail: (value: string) => value.trim().toLowerCase(),
  validatePasswordStrength: validatePasswordStrengthMock,
}));

import {
  buildKangurParentAccountCreateDebugPayload,
  createKangurParentAccount,
  setKangurParentPassword,
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
    getAuthSecurityPolicyMock.mockResolvedValue({
      minPasswordLength: 8,
      requireStrongPassword: true,
      requireUppercase: true,
      requireLowercase: true,
      requireNumber: true,
      requireSymbol: true,
    });
    validatePasswordStrengthMock.mockReturnValue({
      ok: true,
      errors: [],
    });
  });

  it('creates a new unverified parent account with a password and verification email', async () => {
    findAuthUserByEmailMock.mockResolvedValue(null);
    createAuthUserWithEmailMock.mockResolvedValue({
      id: 'parent-1',
      email: 'parent@example.com',
      name: 'parent',
      passwordHash: 'stored-password-hash',
      emailVerified: null,
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

    const result = await createKangurParentAccount({
      email: 'Parent@example.com',
      password: 'Strong123!',
      callbackUrl: '/kangur/tests?focus=division',
      request: new Request('https://example.com/api/kangur/auth/parent-account/create'),
    });

    expect(findAuthUserByEmailMock).toHaveBeenCalledWith('parent@example.com');
    expect(createAuthUserWithEmailMock).toHaveBeenCalledWith({
      email: 'parent@example.com',
      name: 'parent',
      passwordHash: expect.any(String),
      emailVerified: null,
    });
    expect(createAuthUserWithEmailMock.mock.calls[0]?.[0]?.passwordHash).not.toBe('Strong123!');
    expect(createEmailVerificationChallengeMock).toHaveBeenCalledWith({
      userId: 'parent-1',
      email: 'parent@example.com',
      callbackUrl: '/kangur/tests?focus=division',
    });
    expect(sendAuthEmailMock).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'parent@example.com',
        purpose: 'email_verification',
        text: expect.stringContaining('verifyEmailToken=verify-link-1'),
      })
    );
    expect(result).toEqual({
      email: 'parent@example.com',
      created: true,
      emailVerified: false,
      hasPassword: true,
      verificationUrl: `${expectedOrigin}/kangur/login?callbackUrl=%2Fkangur%2Ftests%3Ffocus%3Ddivision&verifyEmailToken=verify-link-1`,
    });
    expect(buildKangurParentAccountCreateDebugPayload(result)).toEqual({
      verificationUrl: `${expectedOrigin}/kangur/login?callbackUrl=%2Fkangur%2Ftests%3Ffocus%3Ddivision&verifyEmailToken=verify-link-1`,
    });
  });

  it('resends verification email for an existing unverified parent account', async () => {
    findAuthUserByEmailMock.mockResolvedValue({
      id: 'parent-1',
      email: 'parent@example.com',
      name: 'Parent',
      passwordHash: 'existing-password-hash',
      emailVerified: null,
    });
    createEmailVerificationChallengeMock.mockResolvedValue({
      id: 'verify-link-2',
      expiresAt: new Date('2026-03-15T21:00:00.000Z'),
    });

    await expect(
      createKangurParentAccount({
        email: 'parent@example.com',
        password: 'Different123!',
        callbackUrl: '/kangur/game',
        request: new Request('https://example.com/api/kangur/auth/parent-account/create'),
      })
    ).resolves.toEqual({
      email: 'parent@example.com',
      created: false,
      emailVerified: false,
      hasPassword: true,
      verificationUrl:
        'http://localhost:3000/kangur/login?callbackUrl=%2Fkangur%2Fgame&verifyEmailToken=verify-link-2',
    });
    expect(createAuthUserWithEmailMock).not.toHaveBeenCalled();
    expect(setAuthUserPasswordMock).not.toHaveBeenCalled();
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

  it('rejects parent account creation when the email already belongs to a verified account', async () => {
    findAuthUserByEmailMock.mockResolvedValue({
      id: 'parent-1',
      email: 'parent@example.com',
      passwordHash: 'existing-password-hash',
      emailVerified: new Date('2026-03-08T21:10:00.000Z'),
    });

    await expect(
      createKangurParentAccount({
        email: 'parent@example.com',
        password: 'Strong123!',
        callbackUrl: '/kangur',
      })
    ).rejects.toMatchObject({
      message: 'Konto z tym emailem juz istnieje. Zaloguj sie emailem i haslem.',
    });
    expect(createEmailVerificationChallengeMock).not.toHaveBeenCalled();
    expect(sendAuthEmailMock).not.toHaveBeenCalled();
  });

  it('stores a password for a legacy parent account without one', async () => {
    findAuthUserByIdMock.mockResolvedValue({
      id: 'parent-1',
      email: 'parent@example.com',
      passwordHash: null,
      emailVerified: null,
    });
    setAuthUserPasswordMock.mockResolvedValue({
      id: 'parent-1',
      email: 'parent@example.com',
      passwordHash: 'hashed-password',
      emailVerified: null,
    });

    await expect(
      setKangurParentPassword({
        userId: 'parent-1',
        password: 'Magic123!',
      })
    ).resolves.toEqual({
      email: 'parent@example.com',
      hasPassword: true,
    });
    expect(validatePasswordStrengthMock).toHaveBeenCalledWith(
      'Magic123!',
      expect.objectContaining({
        minPasswordLength: 8,
      })
    );
    expect(setAuthUserPasswordMock).toHaveBeenCalledWith('parent-1', 'Magic123!');
  });
});
