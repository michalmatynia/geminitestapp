import { apiHandler } from '@/shared/lib/api/api-handler';
import { agentCapabilityManifest } from '@/shared/lib/agent-capability-manifest';
import { NextResponse } from 'next/server';

const GET_handler = async () => {
  return NextResponse.json(agentCapabilityManifest);
};

export const GET = apiHandler(GET_handler, {
  source: 'agent.capabilities.GET',
});
