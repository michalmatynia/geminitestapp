import { apiHandler } from '@/shared/lib/api/api-handler';
import {
  getAgentDiscoverySummary,
  getAgentResource,
  listAgentCapabilities,
  listAgentResources,
} from '@/shared/lib/agent-discovery';
import { NextResponse } from 'next/server';

function parseBooleanFlag(value: string | null) {
  if (value === 'true') {
    return true;
  }

  if (value === 'false') {
    return false;
  }

  return undefined;
}

const GET_handler = async (request: Request) => {
  const { searchParams } = new URL(request.url);
  const resourceId = searchParams.get('resourceId');

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
      mode: searchParams.get('mode'),
      requiresLease: parseBooleanFlag(searchParams.get('requiresLease')),
      resourceType: searchParams.get('resourceType'),
    }),
    ...getAgentDiscoverySummary(),
  });
};

export const GET = apiHandler(GET_handler, {
  source: 'agent.resources.GET',
});
