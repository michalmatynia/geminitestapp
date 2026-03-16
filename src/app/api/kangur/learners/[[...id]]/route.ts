export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';

import { kangurLearnerCreateInputSchema, kangurLearnerUpdateInputSchema } from '@/shared/contracts/kangur';
import { apiHandler, apiHandlerWithParams } from '@/shared/lib/api/api-handler';

import {
  deleteKangurLearnerHandler,
  getKangurLearnersHandler,
  patchKangurLearnerHandler,
  postKangurLearnersHandler,
} from '../handler';
import { getKangurLearnerInteractionsHandler } from '../[id]/interactions/handler';
import { getKangurLearnerSessionsHandler } from '../[id]/sessions/handler';

type RouteContext = {
  params: {
    id?: string[];
  };
};

type SimpleRouteHandler = (request: NextRequest) => Promise<Response>;
type ParamRouteHandler = (request: NextRequest, context: { params: { id: string } }) => Promise<Response>;

const getLearners = apiHandler(getKangurLearnersHandler, {
  source: 'kangur.learners.GET',
  service: 'kangur.api',
  successLogging: 'all',
});

const postLearners = apiHandler(postKangurLearnersHandler, {
  source: 'kangur.learners.POST',
  service: 'kangur.api',
  successLogging: 'all',
  parseJsonBody: true,
  bodySchema: kangurLearnerCreateInputSchema,
});

const patchLearner: ParamRouteHandler = apiHandlerWithParams<{ id: string }>(
  patchKangurLearnerHandler,
  {
    source: 'kangur.learners.[id].PATCH',
    service: 'kangur.api',
    successLogging: 'all',
    parseJsonBody: true,
    bodySchema: kangurLearnerUpdateInputSchema,
  }
);

const deleteLearner: ParamRouteHandler = apiHandlerWithParams<{ id: string }>(
  deleteKangurLearnerHandler,
  {
    source: 'kangur.learners.[id].DELETE',
    service: 'kangur.api',
    successLogging: 'all',
    parseJsonBody: false,
  }
);

const getLearnerInteractions: ParamRouteHandler = apiHandlerWithParams<{ id: string }>(
  getKangurLearnerInteractionsHandler,
  {
    source: 'kangur.learners.[id].interactions.GET',
    service: 'kangur.api',
    successLogging: 'all',
  }
);

const getLearnerSessions: ParamRouteHandler = apiHandlerWithParams<{ id: string }>(
  getKangurLearnerSessionsHandler,
  {
    source: 'kangur.learners.[id].sessions.GET',
    service: 'kangur.api',
    successLogging: 'all',
    parseJsonBody: false,
  }
);

const notFound = (): Response => new Response('Not Found', { status: 404 });
const methodNotAllowed = (allowed: string[]): Response =>
  new Response('Method Not Allowed', {
    status: 405,
    headers: { Allow: allowed.join(', ') },
  });

const resolveSegments = (
  raw: string[] | undefined
): { id: string | null; action: string | null; hasExtraSegments: boolean } => {
  if (!raw || raw.length === 0) {
    return { id: null, action: null, hasExtraSegments: false };
  }
  const [id, action, ...rest] = raw;
  return { id: id ?? null, action: action ?? null, hasExtraSegments: rest.length > 0 };
};

export const GET = (request: NextRequest, context: RouteContext): Promise<Response> => {
  const { id, action, hasExtraSegments } = resolveSegments(context.params.id);
  if (hasExtraSegments) {
    return Promise.resolve(notFound());
  }
  if (id) {
    if (action === 'interactions') {
      return getLearnerInteractions(request, { params: { id } });
    }
    if (action === 'sessions') {
      return getLearnerSessions(request, { params: { id } });
    }
    if (action) {
      return Promise.resolve(notFound());
    }
    return Promise.resolve(methodNotAllowed(['PATCH', 'DELETE']));
  }
  return (getLearners as SimpleRouteHandler)(request);
};

export const POST = (request: NextRequest, context: RouteContext): Promise<Response> => {
  const { id, action, hasExtraSegments } = resolveSegments(context.params.id);
  if (hasExtraSegments) {
    return Promise.resolve(notFound());
  }
  if (id) {
    if (action) {
      return Promise.resolve(methodNotAllowed(['GET']));
    }
    return Promise.resolve(methodNotAllowed(['PATCH', 'DELETE']));
  }
  return (postLearners as SimpleRouteHandler)(request);
};

export const PATCH = (request: NextRequest, context: RouteContext): Promise<Response> => {
  const { id, action, hasExtraSegments } = resolveSegments(context.params.id);
  if (hasExtraSegments) {
    return Promise.resolve(notFound());
  }
  if (action) {
    return Promise.resolve(methodNotAllowed(['GET']));
  }
  if (!id) {
    return Promise.resolve(methodNotAllowed(['GET', 'POST']));
  }
  return patchLearner(request, { params: { id } });
};

export const DELETE = (request: NextRequest, context: RouteContext): Promise<Response> => {
  const { id, action, hasExtraSegments } = resolveSegments(context.params.id);
  if (hasExtraSegments) {
    return Promise.resolve(notFound());
  }
  if (action) {
    return Promise.resolve(methodNotAllowed(['GET']));
  }
  if (!id) {
    return Promise.resolve(methodNotAllowed(['GET', 'POST']));
  }
  return deleteLearner(request, { params: { id } });
};
