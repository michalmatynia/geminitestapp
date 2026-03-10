import { NextResponse } from 'next/server';
import { ZodError, z } from 'zod';

import {
  SHARED_LEASE_LIMITATION,
  getAgentLeaseDiscoveryPayload,
  getAgentLeaseState,
  listAgentLeaseStates,
  mutateAgentLease,
} from '@/shared/lib/agent-lease-service';
import { apiHandler } from '@/shared/lib/api/api-handler';
import {
  optionalBooleanQuerySchema,
  optionalTrimmedQueryString,
} from '@/shared/lib/api/query-schema';
import { AgentLeaseMutationRequestSchema } from '@/shared/contracts/agent-leases';

export const querySchema = z.object({
  resourceId: optionalTrimmedQueryString(),
  scopeId: optionalTrimmedQueryString(),
  activeOnly: optionalBooleanQuerySchema(),
  resourceType: optionalTrimmedQueryString(),
});

function statusForLeaseMutation(code: string) {
  switch (code) {
    case 'claimed':
    case 'renewed':
    case 'released':
      return 200;
    case 'conflict':
      return 409;
    case 'not_found':
      return 404;
    case 'unsupported':
      return 400;
    default:
      return 400;
  }
}

const GET_handler = async (_request: Request, ctx: { query?: unknown }) => {
  const query = (ctx.query ?? {}) as z.infer<typeof querySchema>;
  const resourceId = query.resourceId;
  const scopeId = query.scopeId;

  if (resourceId && scopeId) {
    const state = await getAgentLeaseState(resourceId, scopeId);

    if (!state) {
      return NextResponse.json(
        {
          error: `Unknown agent lease scope: ${resourceId} (${scopeId})`,
        },
        { status: 404 },
      );
    }

    return NextResponse.json({
      lease: state,
      limitation: SHARED_LEASE_LIMITATION,
    });
  }

  if (resourceId) {
    return NextResponse.json({
      resourceId,
      leases: await listAgentLeaseStates({
        resourceId,
        activeOnly: query.activeOnly,
      }),
      limitation: SHARED_LEASE_LIMITATION,
    });
  }

  return NextResponse.json(
    await getAgentLeaseDiscoveryPayload({
      activeOnly: query.activeOnly,
      resourceType: query.resourceType ?? null,
    })
  );
};

const POST_handler = async (_request: Request, ctx: { body?: unknown }) => {
  try {
    const body = ctx.body;
    const result = mutateAgentLease(body);

    return NextResponse.json(result, {
      status: statusForLeaseMutation(result.code),
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        {
          error: 'Invalid agent lease request.',
          issues: error.issues,
        },
        { status: 400 },
      );
    }

    throw error;
  }
};

export const GET = apiHandler(GET_handler, {
  source: 'agent.leases.GET',
  querySchema,
  requireAuth: true,
});

export const POST = apiHandler(POST_handler, {
  source: 'agent.leases.POST',
  parseJsonBody: true,
  bodySchema: AgentLeaseMutationRequestSchema,
  requireAuth: true,
});
