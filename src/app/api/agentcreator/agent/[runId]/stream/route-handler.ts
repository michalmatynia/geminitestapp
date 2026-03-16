import { GET as getAgentRunStream } from '@/features/ai/agentcreator/api/agent/[runId]/stream/route';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const GET = getAgentRunStream;
