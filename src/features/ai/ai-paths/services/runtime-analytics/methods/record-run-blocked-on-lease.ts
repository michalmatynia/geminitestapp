import { recordRuntimeRunBlockedOnLeaseShared } from '@/features/ai/ai-paths/server';

export const recordRuntimeRunBlockedOnLease = recordRuntimeRunBlockedOnLeaseShared as (input: { runId: string, timestamp: string }) => Promise<void>;
