import { type NextRequest } from 'next/server';
import { apiHandler } from '@/shared/lib/api/api-handler';
import { kangurLearnerSignInInputSchema } from '@kangur/contracts/kangur';
import {
  kangurParentAccountCreateSchema,
  kangurParentAccountResendSchema,
  kangurParentEmailVerifySchema,
} from '@/shared/contracts/kangur-auth';
import { postKangurLearnerSignInHandler } from '@/app/api/kangur/auth/learner-signin/handler';
import { postKangurLearnerSignOutHandler } from '@/app/api/kangur/auth/learner-signout/handler';
import { postKangurLogoutHandler } from '@/app/api/kangur/auth/logout/handler';
import { getKangurAuthMeHandler } from '@/app/api/kangur/auth/me/handler';
import { postKangurParentAccountCreateHandler } from '@/app/api/kangur/auth/parent-account/create/handler';
import { postKangurParentAccountResendHandler } from '@/app/api/kangur/auth/parent-account/resend/handler';
import { postKangurParentEmailVerifyHandler } from '@/app/api/kangur/auth/parent-email/verify/handler';
import {
  kangurParentPasswordSchema,
  postKangurParentPasswordHandler,
} from '@/app/api/kangur/auth/parent-password/handler';
import { methodNotAllowed, SimpleRouteHandler } from './routing.utils';

export const authMeHandler: SimpleRouteHandler = apiHandler(getKangurAuthMeHandler, {
  source: 'kangur.auth.me.GET',
  service: 'kangur.api',
});

export const learnerSignInHandler: SimpleRouteHandler = apiHandler(postKangurLearnerSignInHandler, {
  source: 'kangur.auth.learner-signin.POST',
  service: 'kangur.api',
  parseJsonBody: true,
  bodySchema: kangurLearnerSignInInputSchema,
});

export const learnerSignOutHandler: SimpleRouteHandler = apiHandler(postKangurLearnerSignOutHandler, {
  source: 'kangur.auth.learner-signout.POST',
  service: 'kangur.api',
});

export const logoutHandler: SimpleRouteHandler = apiHandler(postKangurLogoutHandler, {
  source: 'kangur.auth.logout.POST',
  service: 'kangur.api',
});

export const parentAccountCreateHandler: SimpleRouteHandler = apiHandler(
  postKangurParentAccountCreateHandler,
  {
    source: 'kangur.auth.parent-account.create.POST',
    service: 'kangur.api',
    parseJsonBody: true,
    bodySchema: kangurParentAccountCreateSchema,
  }
);

export const parentAccountResendHandler: SimpleRouteHandler = apiHandler(
  postKangurParentAccountResendHandler,
  {
    source: 'kangur.auth.parent-account.resend.POST',
    service: 'kangur.api',
    parseJsonBody: true,
    bodySchema: kangurParentAccountResendSchema,
  }
);

export const parentEmailVerifyHandler: SimpleRouteHandler = apiHandler(
  postKangurParentEmailVerifyHandler,
  {
    source: 'kangur.auth.parent-email.verify.POST',
    service: 'kangur.api',
    parseJsonBody: true,
    bodySchema: kangurParentEmailVerifySchema,
  }
);

export const parentPasswordHandler: SimpleRouteHandler = apiHandler(postKangurParentPasswordHandler, {
  source: 'kangur.auth.parent-password.POST',
  service: 'kangur.api',
  parseJsonBody: true,
  bodySchema: kangurParentPasswordSchema,
});

export const handleAuthRouting = (request: NextRequest, segments: string[]): Promise<Response> | null => {
  if (segments[0] === 'auth') {
    const sub = segments[1];
    if (sub === 'me' && segments.length === 2) {
      if (request.method !== 'GET') return methodNotAllowed(request, ['GET'], request.method);
      return authMeHandler(request);
    }
    if (sub === 'learner-signin' && segments.length === 2) {
      if (request.method !== 'POST') return methodNotAllowed(request, ['POST'], request.method);
      return learnerSignInHandler(request);
    }
    if (sub === 'learner-signout' && segments.length === 2) {
      if (request.method !== 'POST') return methodNotAllowed(request, ['POST'], request.method);
      return learnerSignOutHandler(request);
    }
    if (sub === 'logout' && segments.length === 2) {
      if (request.method !== 'POST') return methodNotAllowed(request, ['POST'], request.method);
      return logoutHandler(request);
    }
    if (sub === 'parent-account' && segments[2] === 'create' && segments.length === 3) {
      if (request.method !== 'POST') return methodNotAllowed(request, ['POST'], request.method);
      return parentAccountCreateHandler(request);
    }
    if (sub === 'parent-account' && segments[2] === 'resend' && segments.length === 3) {
      if (request.method !== 'POST') return methodNotAllowed(request, ['POST'], request.method);
      return parentAccountResendHandler(request);
    }
    if (sub === 'parent-email' && segments[2] === 'verify' && segments.length === 3) {
      if (request.method !== 'POST') return methodNotAllowed(request, ['POST'], request.method);
      return parentEmailVerifyHandler(request);
    }
    if (sub === 'parent-password' && segments.length === 2) {
      if (request.method !== 'POST') return methodNotAllowed(request, ['POST'], request.method);
      return parentPasswordHandler(request);
    }
  }
  return null;
};
