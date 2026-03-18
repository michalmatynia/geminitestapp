export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { type NextRequest } from 'next/server';
import { resolveKangurApiPathSegments } from '../route-utils';
import { notFound } from './routing/routing.utils';
import { handleAuthRouting } from './routing/routing.auth';
import { handleDuelRouting } from './routing/routing.duels';
import { handleLearnerRouting } from './routing/routing.learner';
import { handleAiTutorRouting } from './routing/routing.ai-tutor';
import { handleMiscRouting } from './routing/routing.misc';

const routeKangurRequest = async (
  request: NextRequest,
  context: { params: Promise<{ path?: string[] | string }> }
): Promise<Response> => {
  const params = await context.params;
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

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ path?: string[] | string }> }
): Promise<Response> {
  return routeKangurRequest(request, context);
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ path?: string[] | string }> }
): Promise<Response> {
  return routeKangurRequest(request, context);
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ path?: string[] | string }> }
): Promise<Response> {
  return routeKangurRequest(request, context);
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ path?: string[] | string }> }
): Promise<Response> {
  return routeKangurRequest(request, context);
}
