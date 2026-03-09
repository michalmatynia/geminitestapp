import { NextResponse } from 'next/server';
import { ZodError } from 'zod';

import {
  SHARED_LEASE_LIMITATION,
  getAgentLeaseDiscoveryPayload,
  getAgentLeaseState,
  listAgentLeaseStates,
  mutateAgentLease,
} from '@/shared/lib/agent-lease-service';
import { apiHandler } from '@/shared/lib/api/api-handler';

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

const GET_handler = async (request: Request) => {
  const { searchParams } = new URL(request.url);
  const resourceId = searchParams.get('resourceId');
  const scopeId = searchParams.get('scopeId');

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
        activeOnly: searchParams.get('activeOnly') === 'true',
      }),
      limitation: SHARED_LEASE_LIMITATION,
    });
  }

  return NextResponse.json(
    await getAgentLeaseDiscoveryPayload({
      activeOnly: searchParams.get('activeOnly') === 'true',
      resourceType: searchParams.get('resourceType'),
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
});

export const POST = apiHandler(POST_handler, {
  source: 'agent.leases.POST',
  parseJsonBody: true,
});
