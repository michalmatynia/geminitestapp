import { NextResponse } from 'next/server';

import { agentCapabilityManifest } from '@/shared/lib/agent-capability-manifest';
import { apiHandler } from '@/shared/lib/api/api-handler';

const getCapabilitiesHandler = (): Promise<Response> =>
  Promise.resolve(NextResponse.json(agentCapabilityManifest));

export const GET = apiHandler(getCapabilitiesHandler, {
  source: 'agent.capabilities.GET',
  requireAuth: true,
});
