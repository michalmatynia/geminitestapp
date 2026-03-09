import { beforeEach, describe, expect, it, vi } from 'vitest';

import { KANGUR_PARENT_VERIFICATION_RESEND_COOLDOWN_MS } from '@/features/kangur/config/auth';

const {
  createAuthUserWithEmailMock,
  findAuthUserByEmailMock,
  findAuthUserByIdMock,
  findActiveEmailVerificationChallengeByEmailMock,
  ensureDefaultKangurLearnerForOwnerMock,
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
  findActiveEmailVerificationChallengeByEmailMock: vi.fn(),
  ensureDefaultKangurLearnerForOwnerMock: vi.fn(),
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

vi.mock('@/server/auth', () => ({
  auth: vi.fn(),
  findAuthUserByEmail: findAuthUserByEmailMock,
  findAuthUserById: findAuthUserByIdMock,
  getAuthSecurityPolicy: getAuthSecurityPolicyMock,
  getAuthSecurityProfile: getAuthSecurityProfileMock,
  normalizeAuthEmail: (value: string) => value.trim().toLowerCase(),
  sendAuthEmail: sendAuthEmailMock,
  shouldExposeAuthEmailDebug: shouldExposeAuthEmailDebugMock,
  consumeEmailVerificationChallenge: consumeEmailVerificationChallengeMock,
  createEmailVerificationChallenge: createEmailVerificationChallengeMock,
  createAuthUserWithEmail: createAuthUserWithEmailMock,
  findActiveEmailVerificationChallengeByEmail: findActiveEmailVerificationChallengeByEmailMock,
  markAuthUserEmailVerified: markAuthUserEmailVerifiedMock,
  setAuthUserPassword: setAuthUserPasswordMock,
  validatePasswordStrength: validatePasswordStrengthMock,
}));

vi.mock('@/features/kangur/services/kangur-learner-repository', () => ({
  ensureDefaultKangurLearnerForOwner: ensureDefaultKangurLearnerForOwnerMock,
}));

import {
  buildKangurParentAccountCreateDebugPayload,
  createKangurParentAccount,
  resendKangurParentVerificationEmail,
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

  it('stages a new parent registration until the verification link is used', async () => {
    findAuthUserByEmailMock.mockResolvedValue(null);
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
    expect(createAuthUserWithEmailMock).not.toHaveBeenCalled();
    expect(createEmailVerificationChallengeMock).toHaveBeenCalledWith({
      email: 'parent@example.com',
      callbackUrl: '/kangur/tests?focus=division',
      pendingRegistration: {
        source: 'kangur_parent',
        name: 'parent',
        passwordHash: expect.any(String),
      },
    });
    expect(
      createEmailVerificationChallengeMock.mock.calls[0]?.[0]?.pendingRegistration?.passwordHash
    ).not.toBe('Strong123!');
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
      retryAfterMs: KANGUR_PARENT_VERIFICATION_RESEND_COOLDOWN_MS,
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
      retryAfterMs: KANGUR_PARENT_VERIFICATION_RESEND_COOLDOWN_MS,
      verificationUrl:
        'http://localhost:3000/kangur/login?callbackUrl=%2Fkangur%2Fgame&verifyEmailToken=verify-link-2',
    });
    expect(createAuthUserWithEmailMock).not.toHaveBeenCalled();
    expect(setAuthUserPasswordMock).not.toHaveBeenCalled();
  });

  it('creates the parent account from the verification token payload', async () => {
    consumeEmailVerificationChallengeMock.mockResolvedValue({
      userId: 'pending:kangur_parent:parent%40example.com',
      email: 'parent@example.com',
      callbackUrl: '/kangur/lessons',
      pendingRegistration: {
        source: 'kangur_parent',
        name: 'Parent',
        passwordHash: 'hashed-password',
      },
    });
    findAuthUserByEmailMock.mockResolvedValue(null);
    createAuthUserWithEmailMock.mockResolvedValue({
      id: 'parent-1',
      email: 'parent@example.com',
      name: 'Parent',
      passwordHash: 'hashed-password',
      emailVerified: new Date('2026-03-08T21:10:00.000Z'),
    });
    ensureDefaultKangurLearnerForOwnerMock.mockResolvedValue({
      id: 'learner-1',
      ownerUserId: 'parent-1',
      displayName: 'Parent',
      loginName: 'parent',
      status: 'active',
      legacyUserKey: 'parent@example.com',
      aiTutor: undefined,
      createdAt: '2026-03-08T21:10:00.000Z',
      updatedAt: '2026-03-08T21:10:00.000Z',
    });

    await expect(verifyKangurParentEmail('verify-link-1')).resolves.toEqual({
      email: 'parent@example.com',
      callbackUrl: '/kangur/lessons',
      emailVerified: true,
    });
    expect(createAuthUserWithEmailMock).toHaveBeenCalledWith({
      email: 'parent@example.com',
      name: 'Parent',
      passwordHash: 'hashed-password',
      emailVerified: expect.any(Date),
    });
    expect(markAuthUserEmailVerifiedMock).not.toHaveBeenCalled();
    expect(ensureDefaultKangurLearnerForOwnerMock).toHaveBeenCalledWith({
      ownerUserId: 'parent-1',
      displayName: 'Parent',
      preferredLoginName: 'parent',
      legacyUserKey: 'parent@example.com',
    });
  });

  it('verifies an existing legacy unverified parent account', async () => {
    consumeEmailVerificationChallengeMock.mockResolvedValue({
      userId: 'parent-1',
      email: 'parent@example.com',
      callbackUrl: '/kangur/lessons',
      pendingRegistration: null,
    });
    markAuthUserEmailVerifiedMock.mockResolvedValue({
      id: 'parent-1',
      email: 'parent@example.com',
      name: 'Parent',
      passwordHash: 'stored-password-hash',
      emailVerified: new Date('2026-03-08T21:10:00.000Z'),
    });
    ensureDefaultKangurLearnerForOwnerMock.mockResolvedValue({
      id: 'learner-1',
      ownerUserId: 'parent-1',
      displayName: 'Parent',
      loginName: 'parent',
      status: 'active',
      legacyUserKey: 'parent@example.com',
      aiTutor: undefined,
      createdAt: '2026-03-08T21:10:00.000Z',
      updatedAt: '2026-03-08T21:10:00.000Z',
    });

    await expect(verifyKangurParentEmail('verify-link-legacy')).resolves.toEqual({
      email: 'parent@example.com',
      callbackUrl: '/kangur/lessons',
      emailVerified: true,
    });

    expect(markAuthUserEmailVerifiedMock).toHaveBeenCalledWith('parent-1');
    expect(createAuthUserWithEmailMock).not.toHaveBeenCalled();
  });

  it('resends a verification email for a staged parent registration', async () => {
    findAuthUserByEmailMock.mockResolvedValue(null);
    findActiveEmailVerificationChallengeByEmailMock.mockResolvedValue({
      userId: 'pending:kangur_parent:parent%40example.com',
      email: 'parent@example.com',
      callbackUrl: '/kangur/tests',
      pendingRegistration: {
        source: 'kangur_parent',
        name: 'Parent',
        passwordHash: 'hashed-password',
      },
      createdAt: new Date('2026-03-09T07:58:00.000Z'),
      expiresAt: new Date('2026-03-15T21:00:00.000Z'),
    });
    createEmailVerificationChallengeMock.mockResolvedValue({
      id: 'verify-link-resend-1',
      expiresAt: new Date('2026-03-15T21:00:00.000Z'),
    });

    await expect(
      resendKangurParentVerificationEmail({
        email: 'parent@example.com',
        callbackUrl: '/kangur/tests?focus=division',
        request: new Request('https://example.com/api/kangur/auth/parent-account/resend'),
      })
    ).resolves.toEqual({
      email: 'parent@example.com',
      created: false,
      emailVerified: false,
      hasPassword: true,
      retryAfterMs: KANGUR_PARENT_VERIFICATION_RESEND_COOLDOWN_MS,
      verificationUrl:
        'http://localhost:3000/kangur/login?callbackUrl=%2Fkangur%2Ftests%3Ffocus%3Ddivision&verifyEmailToken=verify-link-resend-1',
    });

    expect(createEmailVerificationChallengeMock).toHaveBeenCalledWith({
      email: 'parent@example.com',
      callbackUrl: '/kangur/tests?focus=division',
      pendingRegistration: {
        source: 'kangur_parent',
        name: 'Parent',
        passwordHash: 'hashed-password',
      },
    });
  });

  it('resends a verification email for an existing unverified parent account', async () => {
    findAuthUserByEmailMock.mockResolvedValue({
      id: 'parent-1',
      email: 'parent@example.com',
      name: 'Parent',
      passwordHash: 'stored-password-hash',
      emailVerified: null,
    });
    createEmailVerificationChallengeMock.mockResolvedValue({
      id: 'verify-link-resend-2',
      expiresAt: new Date('2026-03-15T21:00:00.000Z'),
    });

    await expect(
      resendKangurParentVerificationEmail({
        email: 'parent@example.com',
        callbackUrl: '/kangur/tests?focus=division',
      })
    ).resolves.toEqual({
      email: 'parent@example.com',
      created: false,
      emailVerified: false,
      hasPassword: true,
      retryAfterMs: KANGUR_PARENT_VERIFICATION_RESEND_COOLDOWN_MS,
      verificationUrl:
        'http://localhost:3000/kangur/login?callbackUrl=%2Fkangur%2Ftests%3Ffocus%3Ddivision&verifyEmailToken=verify-link-resend-2',
    });

    expect(createEmailVerificationChallengeMock).toHaveBeenCalledWith({
      userId: 'parent-1',
      email: 'parent@example.com',
      callbackUrl: '/kangur/tests?focus=division',
    });
  });

  it('rate limits repeated parent account creation while a verification email is still fresh', async () => {
    vi.useFakeTimers();
    try {
      vi.setSystemTime(new Date('2026-03-09T08:00:00.000Z'));
      findAuthUserByEmailMock.mockResolvedValue(null);
      findActiveEmailVerificationChallengeByEmailMock.mockResolvedValue({
        userId: 'pending:kangur_parent:parent%40example.com',
        email: 'parent@example.com',
        callbackUrl: '/kangur/tests',
        pendingRegistration: {
          source: 'kangur_parent',
          name: 'Parent',
          passwordHash: 'hashed-password',
        },
        createdAt: new Date('2026-03-09T07:59:30.000Z'),
        expiresAt: new Date('2026-03-15T21:00:00.000Z'),
      });

      await expect(
        createKangurParentAccount({
          email: 'parent@example.com',
          password: 'Strong123!',
          callbackUrl: '/kangur/tests',
        })
      ).rejects.toMatchObject({
        httpStatus: 429,
        message: 'Email potwierdzajacy zostal juz wyslany. Poczekaj 30 s i sprobuj ponownie.',
        retryAfterMs: 30_000,
      });

      expect(createEmailVerificationChallengeMock).not.toHaveBeenCalled();
      expect(sendAuthEmailMock).not.toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
    }
  });

  it('rate limits resend requests while the last verification email is cooling down', async () => {
    vi.useFakeTimers();
    try {
      vi.setSystemTime(new Date('2026-03-09T08:00:00.000Z'));
      findAuthUserByEmailMock.mockResolvedValue({
        id: 'parent-1',
        email: 'parent@example.com',
        name: 'Parent',
        passwordHash: 'stored-password-hash',
        emailVerified: null,
      });
      findActiveEmailVerificationChallengeByEmailMock.mockResolvedValue({
        userId: 'parent-1',
        email: 'parent@example.com',
        callbackUrl: '/kangur/tests',
        pendingRegistration: null,
        createdAt: new Date('2026-03-09T07:59:45.000Z'),
        expiresAt: new Date('2026-03-15T21:00:00.000Z'),
      });

      await expect(
        resendKangurParentVerificationEmail({
          email: 'parent@example.com',
          callbackUrl: '/kangur/tests',
        })
      ).rejects.toMatchObject({
        httpStatus: 429,
        message: 'Email potwierdzajacy zostal juz wyslany. Poczekaj 45 s i sprobuj ponownie.',
        retryAfterMs: 45_000,
      });

      expect(createEmailVerificationChallengeMock).not.toHaveBeenCalled();
      expect(sendAuthEmailMock).not.toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
    }
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
