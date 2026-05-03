import { recordRuntimeRunFinishedShared } from '@/features/ai/ai-paths/server';

export const recordRuntimeRunFinished = recordRuntimeRunFinishedShared as (input: { runId: string, status: string, durationMs: number | null, timestamp: Date }) => Promise<void>;
