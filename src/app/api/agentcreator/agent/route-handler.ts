import {
  DELETE as deleteAgentRun,
  GET as getAgentRuns,
  POST as postAgentRun,
} from '@/features/ai/agentcreator/api/agent/route';

/**
 * AgentCreator Agent API
 * 
 * Handles management of agent runs, including:
 * - GET: Fetch agent runs.
 * - POST: Create/start an agent run.
 * - DELETE: Remove an agent run.
 */

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const GET = getAgentRuns;
export const POST = postAgentRun;
export const DELETE = deleteAgentRun;
