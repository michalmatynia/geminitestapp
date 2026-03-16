export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';

import { auth } from '@/features/auth/server';
import { kangurLearnerSignInInputSchema } from '@/shared/contracts/kangur';
import {
  kangurParentAccountCreateSchema,
  kangurParentAccountResendSchema,
  kangurParentEmailVerifySchema,
} from '@/shared/contracts/kangur-auth';
import { apiHandler } from '@/shared/lib/api/api-handler';

import { postKangurLearnerSignInHandler } from '../learner-signin/handler';
import { postKangurLearnerSignOutHandler } from '../learner-signout/handler';
import { postKangurLogoutHandler } from '../logout/handler';
import { getKangurAuthMeHandler } from '../me/handler';
import { postKangurParentAccountCreateHandler } from '../parent-account/create/handler';
import { postKangurParentAccountResendHandler } from '../parent-account/resend/handler';
import { postKangurParentEmailVerifyHandler } from '../parent-email/verify/handler';
import { kangurParentPasswordSchema, postKangurParentPasswordHandler } from '../parent-password/handler';

type RouteContext = {
  params: {
    path?: string[];
  };
};

type SimpleRouteHandler = (request: NextRequest) => Promise<Response>;

const createMagicLinkHandler = (source: string): SimpleRouteHandler =>
  apiHandler(
    async () => {
      await auth().catch(() => null);
      return NextResponse.json(
        {
          ok: false,
          error: {
            message:
              'Logowanie linkiem z e-maila nie jest już dostępne. Utwórz konto albo zaloguj się e-mailem i hasłem.',
          },
        },
        { status: 410 }
      );
    },
    {
      source,
      requireCsrf: false,
      resolveSessionUser: false,
    }
  );

const getHandlers: Record<string, SimpleRouteHandler> = {
  me: apiHandler(getKangurAuthMeHandler, {
    source: 'kangur.auth.me.GET',
    service: 'kangur.api',
    successLogging: 'all',
  }),
};

const postHandlers: Record<string, SimpleRouteHandler> = {
  'learner-signin': apiHandler(postKangurLearnerSignInHandler, {
    source: 'kangur.auth.learner-signin.POST',
    service: 'kangur.api',
    successLogging: 'all',
    parseJsonBody: true,
    bodySchema: kangurLearnerSignInInputSchema,
  }),
  'learner-signout': apiHandler(postKangurLearnerSignOutHandler, {
    source: 'kangur.auth.learner-signout.POST',
    service: 'kangur.api',
    successLogging: 'all',
  }),
  logout: apiHandler(postKangurLogoutHandler, {
    source: 'kangur.auth.logout.POST',
    service: 'kangur.api',
    successLogging: 'all',
  }),
  'parent-account/create': apiHandler(postKangurParentAccountCreateHandler, {
    source: 'kangur.auth.parent-account.create.POST',
    service: 'kangur.api',
    successLogging: 'all',
    parseJsonBody: true,
    bodySchema: kangurParentAccountCreateSchema,
  }),
  'parent-account/resend': apiHandler(postKangurParentAccountResendHandler, {
    source: 'kangur.auth.parent-account.resend.POST',
    service: 'kangur.api',
    successLogging: 'all',
    parseJsonBody: true,
    bodySchema: kangurParentAccountResendSchema,
  }),
  'parent-email/verify': apiHandler(postKangurParentEmailVerifyHandler, {
    source: 'kangur.auth.parent-email.verify.POST',
    service: 'kangur.api',
    successLogging: 'all',
    parseJsonBody: true,
    bodySchema: kangurParentEmailVerifySchema,
  }),
  'parent-magic-link/exchange': createMagicLinkHandler(
    'kangur.auth.parent-magic-link.exchange.POST'
  ),
  'parent-magic-link/request': createMagicLinkHandler(
    'kangur.auth.parent-magic-link.request.POST'
  ),
  'parent-password': apiHandler(postKangurParentPasswordHandler, {
    source: 'kangur.auth.parent-password.POST',
    service: 'kangur.api',
    successLogging: 'all',
    parseJsonBody: true,
    bodySchema: kangurParentPasswordSchema,
  }),
};

const knownActions = new Set([...Object.keys(getHandlers), ...Object.keys(postHandlers)]);

const notFound = (): Response => new Response('Not Found', { status: 404 });
const methodNotAllowed = (allowed: string[]): Response =>
  new Response('Method Not Allowed', {
    status: 405,
    headers: { Allow: allowed.join(', ') },
  });

const resolvePath = (
  raw: string[] | undefined
): { key: string; hasExtraSegments: boolean } => {
  if (!raw || raw.length === 0) {
    return { key: '', hasExtraSegments: false };
  }
  return { key: raw.join('/'), hasExtraSegments: raw.length > 2 };
};

export const GET = (request: NextRequest, context: RouteContext): Promise<Response> => {
  const { key, hasExtraSegments } = resolvePath(context.params.path);
  if (hasExtraSegments) {
    return Promise.resolve(notFound());
  }
  const handler = getHandlers[key];
  if (!handler) {
    if (knownActions.has(key)) {
      return Promise.resolve(methodNotAllowed(['POST']));
    }
    return Promise.resolve(notFound());
  }
  return handler(request);
};

export const POST = (request: NextRequest, context: RouteContext): Promise<Response> => {
  const { key, hasExtraSegments } = resolvePath(context.params.path);
  if (hasExtraSegments) {
    return Promise.resolve(notFound());
  }
  const handler = postHandlers[key];
  if (!handler) {
    if (knownActions.has(key)) {
      return Promise.resolve(methodNotAllowed(['GET']));
    }
    return Promise.resolve(notFound());
  }
  return handler(request);
};
