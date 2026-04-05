import { NextRequest, NextResponse } from 'next/server';

import { authConfig } from '@/features/auth/auth.config';
import {
  clearKangurLearnerSession,
  readKangurLearnerSession,
} from '@/features/kangur/services/kangur-learner-session';
import { ActivityTypes } from '@/shared/constants/observability';
import type { ApiHandlerContext } from '@/shared/contracts/ui/ui/api';
import { logActivity } from '@/shared/utils/observability/activity-service';
import { ErrorSystem } from '@/features/kangur/shared/utils/observability/error-system';
import { readTolerantServerAuthSession } from '@/features/auth/server';

const AUTH_COOKIE_KEYS = [
  'sessionToken',
  'callbackUrl',
  'csrfToken',
  'pkceCodeVerifier',
  'state',
  'nonce',
] as const;

type AuthCookieKey = (typeof AUTH_COOKIE_KEYS)[number];
type AuthCookieConfig = (typeof authConfig.cookies)[AuthCookieKey];

const resolveSameSiteValue = (sameSite: unknown): 'Strict' | 'Lax' | 'None' => {
  if (sameSite === 'strict') return 'Strict';
  if (sameSite === 'none') return 'None';
  return 'Lax';
};

const resolveCookieDomain = (options: AuthCookieConfig['options']): string | null => {
  if (!('domain' in options)) {
    return null;
  }
  return typeof options.domain === 'string' && options.domain.length > 0 ? options.domain : null;
};

const buildExpiredCookieValue = (
  name: string,
  options: AuthCookieConfig['options']
): string => {
  const parts = [
    `${name}=`,
    `Path=${options.path ?? '/'}`,
    'HttpOnly',
    `SameSite=${resolveSameSiteValue(options.sameSite)}`,
    'Max-Age=0',
    'Expires=Thu, 01 Jan 1970 00:00:00 GMT',
  ];

  if (options.secure) {
    parts.push('Secure');
  }

  const domain = resolveCookieDomain(options);
  if (domain) {
    parts.push(`Domain=${domain}`);
  }

  return parts.join('; ');
};

const clearAuthCookie = (
  response: NextResponse,
  name: string,
  options: AuthCookieConfig['options']
): void => {
  const cookies = (
    response as NextResponse & {
      cookies?: { set?: (name: string, value: string, options: Record<string, unknown>) => void };
    }
  ).cookies;
  if (cookies?.set) {
    cookies.set(name, '', {
      ...options,
      expires: new Date(0),
      maxAge: 0,
    });
    return;
  }

  response.headers.append('set-cookie', buildExpiredCookieValue(name, options));
};

const listRequestCookieNames = (request: NextRequest): string[] => {
  const cookieHeader = request.headers.get('cookie');
  if (!cookieHeader) {
    return [];
  }

  return cookieHeader
    .split(';')
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0)
    .map((entry) => {
      const separatorIndex = entry.indexOf('=');
      return separatorIndex >= 0 ? entry.slice(0, separatorIndex) : entry;
    });
};

const clearSessionTokenCookies = (
  request: NextRequest,
  response: NextResponse,
  cookie: AuthCookieConfig
): void => {
  const matchingNames = listRequestCookieNames(request)
    .filter(
      (name) => name === cookie.name || name.startsWith(`${cookie.name}.`)
    );

  if (matchingNames.length === 0) {
    clearAuthCookie(response, cookie.name, cookie.options);
    return;
  }

  matchingNames.forEach((name) => {
    clearAuthCookie(response, name, cookie.options);
  });
};

export async function postKangurLogoutHandler(
  req: NextRequest,
  _ctx: ApiHandlerContext
): Promise<Response> {
  await readTolerantServerAuthSession({
    onError: (error) => ErrorSystem.captureException(error),
  });
  const learnerSession = readKangurLearnerSession(req);
  const response = NextResponse.json({ ok: true });

  clearKangurLearnerSession(response);
  if (learnerSession) {
    void logActivity({
      type: ActivityTypes.KANGUR.LEARNER_SIGNOUT,
      description: 'Kangur learner signed out (parent logout).',
      userId: learnerSession.ownerUserId,
      entityId: learnerSession.learnerId,
      entityType: 'kangur_learner',
      metadata: {
        surface: 'kangur',
        actorType: 'learner',
        learnerId: learnerSession.learnerId,
        ownerUserId: learnerSession.ownerUserId,
        reason: 'parent_logout',
      },
    }).catch((error) => {
      void ErrorSystem.captureException(error);
      // Avoid failing logout on activity log issues.
    });
  }

  AUTH_COOKIE_KEYS.forEach((key) => {
    const cookie = authConfig.cookies[key];
    if (key === 'sessionToken') {
      clearSessionTokenCookies(req, response, cookie);
      return;
    }
    clearAuthCookie(response, cookie.name, cookie.options);
  });

  return response;
}
