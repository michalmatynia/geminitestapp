'use client';

import { listAiPathRuns } from '@/shared/lib/ai-paths/api/client';
import type { AiPathRunRecord } from '@/shared/contracts/ai-paths';
import { toNonEmptyString, toRecord, waitForMs } from './trigger-event-utils';

export const TRIGGER_ENQUEUE_RECOVERY_TIMEOUT_MS = 10_000;
export const TRIGGER_ENQUEUE_RECOVERY_DELAYS_MS = [0, 350, 1_200] as const;

export const extractAiPathRunIdFromListedRun = (value: unknown): string | null => {
  const record = toRecord(value);
  if (!record) return null;
  return (
    toNonEmptyString(record['id']) ??
    toNonEmptyString(record['runId']) ??
    toNonEmptyString(record['_id']) ??
    null
  );
};

export const toAiPathRunRecord = (value: unknown, runId: string): AiPathRunRecord | null => {
  const record = toRecord(value);
  if (!record) return null;
  return {
    ...record,
    id: runId,
    status: toNonEmptyString(record['status']) ?? 'queued',
  } as AiPathRunRecord;
};

export const recoverEnqueuedRunByRequestId = async (args: {
  pathId: string;
  requestId: string;
  lookupRuns?: typeof listAiPathRuns;
  retryDelaysMs?: readonly number[];
}): Promise<{ runId: string; runRecord: AiPathRunRecord | null } | null> => {
  const lookupRuns = args.lookupRuns ?? listAiPathRuns;
  const retryDelaysMs = args.retryDelaysMs ?? TRIGGER_ENQUEUE_RECOVERY_DELAYS_MS;
  for (const delayMs of retryDelaysMs) {
    await waitForMs(delayMs);
    const lookupResult = await lookupRuns({
      pathId: args.pathId,
      requestId: args.requestId,
      limit: 1,
      includeTotal: false,
      fresh: true,
      timeoutMs: TRIGGER_ENQUEUE_RECOVERY_TIMEOUT_MS,
    });
    if (!lookupResult.ok) continue;
    const candidate = lookupResult.data.runs[0];
    const runId = extractAiPathRunIdFromListedRun(candidate);
    if (!runId) continue;
    return {
      runId,
      runRecord: toAiPathRunRecord(candidate, runId),
    };
  }
  return null;
};
