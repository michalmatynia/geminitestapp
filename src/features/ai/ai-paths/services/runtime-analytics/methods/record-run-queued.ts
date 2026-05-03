import { recordRuntimeRunQueuedShared } from '@/features/ai/ai-paths/server';

export const recordRuntimeRunQueued = recordRuntimeRunQueuedShared as (input: { runId: string }) => Promise<void>;
