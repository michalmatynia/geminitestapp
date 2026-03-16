import { GET as getAgentRunAudits } from '@/features/ai/agentcreator/api/agent/[runId]/audits/route';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const GET = getAgentRunAudits;
