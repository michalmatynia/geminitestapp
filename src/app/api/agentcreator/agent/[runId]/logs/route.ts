import { GET as getAgentRunLogs } from '@/features/ai/agentcreator/api/agent/[runId]/logs/route';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const GET = getAgentRunLogs;
