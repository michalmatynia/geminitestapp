import {
  DELETE as deleteAgentRun,
  GET as getAgentRuns,
  POST as postAgentRun,
} from '@/features/ai/agentcreator/api/agent/route';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const GET = getAgentRuns;
export const POST = postAgentRun;
export const DELETE = deleteAgentRun;
