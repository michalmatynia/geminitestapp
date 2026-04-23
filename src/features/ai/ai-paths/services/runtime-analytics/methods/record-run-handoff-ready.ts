import { recordRuntimeRunHandoffReadyShared } from '@/features/ai/ai-paths/server';

export const recordRuntimeRunHandoffReady = recordRuntimeRunHandoffReadyShared as (input: { runId: string }) => Promise<void>;
