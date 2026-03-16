import { GET as getAgentRunAsset } from '@/features/ai/agentcreator/api/agent/[runId]/assets/[file]/route';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const GET = getAgentRunAsset;
