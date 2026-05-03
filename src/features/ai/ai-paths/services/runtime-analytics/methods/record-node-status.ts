import { recordRuntimeNodeStatusShared } from '@/features/ai/ai-paths/server';
import type { AiPathNodeStatus } from '@/shared/contracts/ai-paths';

export const recordRuntimeNodeStatus = recordRuntimeNodeStatusShared as (input: { runId: string, nodeId: string, status: AiPathNodeStatus }) => Promise<void>;
