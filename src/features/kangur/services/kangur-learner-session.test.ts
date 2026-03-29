import { createHmac } from 'crypto';

import { NextResponse } from 'next/server';
import { describe, expect, it } from 'vitest';

import {
  clearKangurLearnerSession,
  readKangurLearnerSession,
  setKangurLearnerSession,
} from './kangur-learner-session';

const createRequestWithCookie = (cookie: string) =>
  ({
    cookies: {
      get: (name: string) => {
        const [cookiePair] = cookie.split(';');
        const [cookieName, cookieValue] = cookiePair.split('=');
        if (cookieName !== name || !cookieValue) {
          return undefined;
        }
        return {
          name: cookieName,
          value: cookieValue,
        };
      },
    },
  }) as never;

describe('kangur learner session', () => {
  it('round-trips a signed learner session cookie', () => {
    const response = NextResponse.json({ ok: true });

    setKangurLearnerSession(response, {
      learnerId: 'learner-1',
      ownerUserId: 'parent-1',
    });

    const cookie = response.headers.get('set-cookie');

    expect(cookie).toContain('kangur.learner-session=');

    const payload = readKangurLearnerSession(createRequestWithCookie(cookie ?? ''));

    expect(payload).toEqual(
      expect.objectContaining({
        learnerId: 'learner-1',
        ownerUserId: 'parent-1',
      }),
    );
    expect(payload?.exp).toBeGreaterThan(Date.now());
  });

  it('rejects a tampered learner session cookie', () => {
    const response = NextResponse.json({ ok: true });

    setKangurLearnerSession(response, {
      learnerId: 'learner-1',
      ownerUserId: 'parent-1',
    });

    const cookie = response.headers.get('set-cookie') ?? '';
    const [cookiePair, ...attributes] = cookie.split(';');
    const [cookieName, cookieValue] = cookiePair.split('=');
    const tamperedValue = `${cookieValue.slice(0, -1)}x`;
    const tamperedCookie = [`${cookieName}=${tamperedValue}`, ...attributes].join(';');

    expect(readKangurLearnerSession(createRequestWithCookie(tamperedCookie))).toBeNull();
  });

  it('rejects an expired learner session cookie', () => {
    const expiredPayload = Buffer.from(
      JSON.stringify({
        learnerId: 'learner-1',
        ownerUserId: 'parent-1',
        exp: Date.now() - 1_000,
      }),
    ).toString('base64url');
    const signingKey =
      process.env.AUTH_SECRET ||
      process.env.NEXTAUTH_SECRET ||
      (process.env.NODE_ENV === 'development' ? 'kangur-dev-signing-key-change-me' : '');
    const signature = createHmac('sha256', signingKey).update(expiredPayload).digest('base64url');
    const expiredCookie = `kangur.learner-session=${expiredPayload}.${signature}`;

    expect(readKangurLearnerSession(createRequestWithCookie(expiredCookie))).toBeNull();
  });

  it('clears the learner session cookie', () => {
    const response = NextResponse.json({ ok: true });

    clearKangurLearnerSession(response);

    expect(response.headers.get('set-cookie')).toContain('Max-Age=0');
  });
});
