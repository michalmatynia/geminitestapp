import { recordRuntimeRunStartedShared } from '@/features/ai/ai-paths/server';

export const recordRuntimeRunStarted = recordRuntimeRunStartedShared as (input: { runId: string }) => Promise<void>;
