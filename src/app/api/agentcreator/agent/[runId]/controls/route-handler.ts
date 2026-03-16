import { POST as postAgentRunControl } from '@/features/ai/agentcreator/api/agent/[runId]/controls/route';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const POST = postAgentRunControl;
