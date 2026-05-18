
import { type NextRequest } from 'next/server';

import { apiHandlerWithParams } from '@/shared/lib/api/api-handler';
import type { CatchAllRoutePathParams as RouteParams } from '@/shared/lib/api/catch-all-router';
import { resolveKangurApiPathSegments } from '../route-utils';
import { notFound } from './routing/routing.utils';
import { handleAuthRouting } from './routing/routing.auth';
import { handleDuelRouting } from './routing/routing.duels';
import { handleLearnerRouting } from './routing/routing.learner';
import { handleAiTutorRouting } from './routing/routing.ai-tutor';
import { handleMiscRouting } from './routing/routing.misc';

const routeKangurRequest = async (
  request: NextRequest,
  params: RouteParams
): Promise<Response> => {
  const segments = resolveKangurApiPathSegments(request, { params });

  return (
    (await handleAuthRouting(request, segments)) ??
    (await handleDuelRouting(request, segments)) ??
    (await handleLearnerRouting(request, segments)) ??
    (await handleAiTutorRouting(request, segments)) ??
    (await handleMiscRouting(request, segments)) ??
    (await notFound(request, request.method))
  );
};

const ROUTER_OPTIONS = {
  successLogging: 'off',
  requireCsrf: false,
  resolveSessionUser: false,
  rateLimitKey: false,
} as const;

/**
 * GET /api/kangur/[[...path]]
 * 
 * Catch-all route for Kangur API requests (Auth, Duels, Learner, AI Tutor).
 * Requires authentication.
 */
export const GET = apiHandlerWithParams<RouteParams>(
  (request: NextRequest, _ctx, params) => routeKangurRequest(request, params),
  { ...ROUTER_OPTIONS, source: 'kangur.[[...path]].GET', requireAuth: true }
);

/**
 * POST /api/kangur/[[...path]]
 * 
 * Catch-all route for Kangur API requests (Auth, Duels, Learner, AI Tutor).
 * Requires authentication.
 */
export const POST = apiHandlerWithParams<RouteParams>(
  (request: NextRequest, _ctx, params) => routeKangurRequest(request, params),
  { ...ROUTER_OPTIONS, source: 'kangur.[[...path]].POST', requireAuth: true }
);

/**
 * PATCH /api/kangur/[[...path]]
 * 
 * Catch-all route for Kangur API requests (Auth, Duels, Learner, AI Tutor).
 * Requires authentication.
 */
export const PATCH = apiHandlerWithParams<RouteParams>(
  (request: NextRequest, _ctx, params) => routeKangurRequest(request, params),
  { ...ROUTER_OPTIONS, source: 'kangur.[[...path]].PATCH', requireAuth: true }
);

/**
 * DELETE /api/kangur/[[...path]]
 * 
 * Catch-all route for Kangur API requests (Auth, Duels, Learner, AI Tutor).
 * Requires authentication.
 */
export const DELETE = apiHandlerWithParams<RouteParams>(
  (request: NextRequest, _ctx, params) => routeKangurRequest(request, params),
  { ...ROUTER_OPTIONS, source: 'kangur.[[...path]].DELETE', requireAuth: true }
);
