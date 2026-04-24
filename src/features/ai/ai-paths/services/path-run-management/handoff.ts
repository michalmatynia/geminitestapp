import type { AiPathRunRecord } from '@/shared/contracts/ai-paths';

const FORWARD_ONLY_ERROR =
  'AI Paths is forward-only. Handoff operations have been removed.';

export function markPathRunHandoffReady(_input: {
  runId: string;
  reason?: string | null;
  checkpointLineageId?: string | null;
  requestedBy?: string | null;
}): Promise<AiPathRunRecord | null> {
  return Promise.reject(new Error(FORWARD_ONLY_ERROR));
}
