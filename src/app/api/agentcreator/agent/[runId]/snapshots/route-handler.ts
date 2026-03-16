import { GET as getAgentRunSnapshots } from '@/features/ai/agentcreator/api/agent/[runId]/snapshots/route';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const GET = getAgentRunSnapshots;
