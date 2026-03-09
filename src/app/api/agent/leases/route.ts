import { apiHandler } from '@/shared/lib/api/api-handler';
import {
  getAgentLeaseDiscoveryPayload,
  getAgentLeaseState,
  mutateAgentLease,
} from '@/shared/lib/agent-lease-service';
import { NextResponse } from 'next/server';
import { ZodError } from 'zod';

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

  if (resourceId) {
    const state = getAgentLeaseState(resourceId);

    if (!state) {
      return NextResponse.json(
        { error: `Unknown agent resource: ${resourceId}` },
        { status: 404 },
      );
    }

    return NextResponse.json({
      lease: state,
      limitation:
        'Lease state is currently process-local until the existing runtime broker and import lease implementations are migrated onto this shared service.',
    });
  }

  return NextResponse.json(
    getAgentLeaseDiscoveryPayload({
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
