export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';

import {
  kangurAssignmentCreateInputSchema,
  kangurAssignmentUpdateInputSchema,
} from '@/shared/contracts/kangur';
import { apiHandler, apiHandlerWithParams } from '@/shared/lib/api/api-handler';

import {
  getKangurAssignmentsHandler,
  patchKangurAssignmentHandler,
  postKangurAssignmentsHandler,
  querySchema,
} from '../handler';
import { postKangurAssignmentReassignHandler } from '../[id]/reassign/handler';

type RouteContext = {
  params: {
    id?: string[];
  };
};

type SimpleRouteHandler = (request: NextRequest) => Promise<Response>;
type ParamRouteHandler = (request: NextRequest, context: { params: { id: string } }) => Promise<Response>;

const getAssignments = apiHandler(getKangurAssignmentsHandler, {
  source: 'kangur.assignments.GET',
  service: 'kangur.api',
  successLogging: 'all',
  querySchema,
});

const postAssignments = apiHandler(postKangurAssignmentsHandler, {
  source: 'kangur.assignments.POST',
  service: 'kangur.api',
  successLogging: 'all',
  parseJsonBody: true,
  bodySchema: kangurAssignmentCreateInputSchema,
});

const patchAssignment: ParamRouteHandler = apiHandlerWithParams<{ id: string }>(
  patchKangurAssignmentHandler,
  {
    source: 'kangur.assignments.[id].PATCH',
    service: 'kangur.api',
    successLogging: 'all',
    parseJsonBody: true,
    bodySchema: kangurAssignmentUpdateInputSchema,
  }
);

const postAssignmentReassign: ParamRouteHandler = apiHandlerWithParams<{ id: string }>(
  postKangurAssignmentReassignHandler,
  {
    source: 'kangur.assignments.[id].reassign.POST',
    service: 'kangur.api',
    successLogging: 'all',
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
    if (action === 'reassign') {
      return Promise.resolve(methodNotAllowed(['POST']));
    }
    return Promise.resolve(methodNotAllowed(['PATCH']));
  }
  return (getAssignments as SimpleRouteHandler)(request);
};

export const POST = (request: NextRequest, context: RouteContext): Promise<Response> => {
  const { id, action, hasExtraSegments } = resolveSegments(context.params.id);
  if (hasExtraSegments) {
    return Promise.resolve(notFound());
  }
  if (id) {
    if (action === 'reassign') {
      return postAssignmentReassign(request, { params: { id } });
    }
    if (action) {
      return Promise.resolve(notFound());
    }
    return Promise.resolve(methodNotAllowed(['PATCH']));
  }
  return (postAssignments as SimpleRouteHandler)(request);
};

export const PATCH = (request: NextRequest, context: RouteContext): Promise<Response> => {
  const { id, action, hasExtraSegments } = resolveSegments(context.params.id);
  if (hasExtraSegments) {
    return Promise.resolve(notFound());
  }
  if (action === 'reassign') {
    return Promise.resolve(methodNotAllowed(['POST']));
  }
  if (!id) {
    return Promise.resolve(methodNotAllowed(['GET', 'POST']));
  }
  return patchAssignment(request, { params: { id } });
};
