export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import {
  AgentCreatorAgentDELETE,
  AgentCreatorAgentGET,
  AgentCreatorAgentPOST,
} from '@/features/ai/agentcreator/server';

export const GET = AgentCreatorAgentGET;
export const POST = AgentCreatorAgentPOST;
export const DELETE = AgentCreatorAgentDELETE;
