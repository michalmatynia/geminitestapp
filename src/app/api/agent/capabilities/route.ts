import { NextResponse } from 'next/server';

import { agentCapabilityManifest } from '@/shared/lib/agent-capability-manifest';
import { apiHandler } from '@/shared/lib/api/api-handler';

const GET_handler = async () => {
  return NextResponse.json(agentCapabilityManifest);
};

export const GET = apiHandler(GET_handler, {
  source: 'agent.capabilities.GET',
  requireAuth: true,
});
