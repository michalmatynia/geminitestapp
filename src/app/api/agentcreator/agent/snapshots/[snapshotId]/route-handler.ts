import { GET as getAgentSnapshot } from '@/features/ai/agentcreator/api/agent/snapshots/[snapshotId]/route';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const GET = getAgentSnapshot;
