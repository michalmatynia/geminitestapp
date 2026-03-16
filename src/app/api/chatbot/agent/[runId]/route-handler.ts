export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import {
  AgentCreatorAgentRunDELETE,
  AgentCreatorAgentRunGET,
  AgentCreatorAgentRunPOST,
} from '@/features/ai/agentcreator/server';

export const GET = AgentCreatorAgentRunGET;
export const POST = AgentCreatorAgentRunPOST;
export const DELETE = AgentCreatorAgentRunDELETE;
