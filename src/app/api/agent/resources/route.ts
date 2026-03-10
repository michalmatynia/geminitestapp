import { NextResponse } from 'next/server';
import { z } from 'zod';

import {
  getAgentDiscoverySummary,
  getAgentResource,
  listAgentCapabilities,
  listAgentResources,
} from '@/shared/lib/agent-discovery';
import { apiHandler } from '@/shared/lib/api/api-handler';
import {
  optionalBooleanQuerySchema,
  optionalTrimmedQueryString,
} from '@/shared/lib/api/query-schema';

export const querySchema = z.object({
  resourceId: optionalTrimmedQueryString(),
  mode: optionalTrimmedQueryString(),
  requiresLease: optionalBooleanQuerySchema(),
  resourceType: optionalTrimmedQueryString(),
});

const GET_handler = async (_request: Request, ctx: { query?: unknown }) => {
  const query = (ctx.query ?? {}) as z.infer<typeof querySchema>;
  const resourceId = query.resourceId;

  if (resourceId) {
    const resource = getAgentResource(resourceId);

    if (!resource) {
      return NextResponse.json(
        { error: `Unknown agent resource: ${resourceId}` },
        { status: 404 },
      );
    }

    return NextResponse.json({
      resource,
      capabilities: listAgentCapabilities({ resourceId }),
      ...getAgentDiscoverySummary(),
    });
  }

  return NextResponse.json({
    resources: listAgentResources({
      mode: query.mode ?? null,
      requiresLease: query.requiresLease,
      resourceType: query.resourceType ?? null,
    }),
    ...getAgentDiscoverySummary(),
  });
};

export const GET = apiHandler(GET_handler, {
  source: 'agent.resources.GET',
  querySchema,
  requireAuth: true,
});
