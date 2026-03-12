import { describe, expect, it } from 'vitest';

import {
  kangurParentAccountActionResponseSchema,
  kangurParentAccountCreateSchema,
  kangurParentEmailVerifyResponseSchema,
  parseKangurParentAccountActionResponse,
  parseKangurParentEmailVerifyResponse,
} from '@/shared/contracts/kangur-auth';

describe('kangur auth contract runtime', () => {
  it('accepts canonical parent account create and verify payloads', () => {
    expect(
      kangurParentAccountCreateSchema.parse({
        email: 'parent@example.com',
        password: 'Strong123!',
        callbackUrl: '/tests?focus=division',
      })
    ).toEqual({
      email: 'parent@example.com',
      password: 'Strong123!',
      callbackUrl: '/tests?focus=division',
    });

    const accountPayload = {
      ok: true,
      email: 'parent@example.com',
      created: true,
      emailVerified: false,
      hasPassword: true,
      retryAfterMs: 60_000,
      message:
        'Sprawdź e-mail rodzica. Konto zostanie utworzone po potwierdzeniu adresu, a AI Tutor odblokuje się po weryfikacji.',
      debug: {
        verificationUrl:
          'https://example.com/kangur/login?callbackUrl=%2Ftests%3Ffocus%3Ddivision&verifyEmailToken=verify-1',
      },
    };
    expect(kangurParentAccountActionResponseSchema.safeParse(accountPayload).success).toBe(true);
    expect(parseKangurParentAccountActionResponse(accountPayload)?.retryAfterMs).toBe(60_000);

    const verifyPayload = {
      ok: true,
      email: 'parent@example.com',
      callbackUrl: '/tests?focus=division',
      emailVerified: true,
      message:
        'Email zostal zweryfikowany. Konto rodzica jest gotowe, AI Tutor jest odblokowany i mozesz zalogowac sie emailem oraz haslem.',
    };
    expect(kangurParentEmailVerifyResponseSchema.safeParse(verifyPayload).success).toBe(true);
    expect(parseKangurParentEmailVerifyResponse(verifyPayload)?.emailVerified).toBe(true);
  });

  it('rejects malformed parent account success payloads', () => {
    expect(
      kangurParentAccountActionResponseSchema.safeParse({
        ok: true,
        email: 'parent@example.com',
        created: true,
        emailVerified: false,
        hasPassword: true,
        message: 'Missing retry hint',
      }).success
    ).toBe(false);

    expect(parseKangurParentEmailVerifyResponse({ ok: true, emailVerified: true })).toBeNull();
  });
});
