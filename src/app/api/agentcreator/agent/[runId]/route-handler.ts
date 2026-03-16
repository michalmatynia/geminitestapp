import {
  DELETE as deleteAgentRunById,
  GET as getAgentRunById,
  POST as postAgentRunById,
} from '@/features/ai/agentcreator/api/agent/[runId]/route';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const GET = getAgentRunById;
export const POST = postAgentRunById;
export const DELETE = deleteAgentRunById;
