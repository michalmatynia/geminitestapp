import { type AiPathRunRecord } from '@/shared/contracts/ai-paths';
import { getPathRunRepository } from '@/shared/lib/ai-paths/services/path-run-repository';
import { getAiPathsRuntimeFingerprint } from '@/features/ai/ai-paths/services/runtime-fingerprint';
import { ErrorSystem } from '@/shared/utils/observability/error-system';
import { publishRunUpdate } from '@/features/ai/ai-paths/services/run-stream-publisher';
import { cleanupRunQueueEntries } from './cleanup';
import { isObjectRecord } from '@/shared/lib/ai-paths/core/utils';

const resolveNormalizedReason = (runStatus: string, reason: string | null): string => {
    if (reason !== null && reason.trim() !== '') return reason.trim();
    return runStatus === 'blocked_on_lease' 
        ? 'Execution lease is still owned by another worker.' 
        : 'Run requires delegated continuation.';
};

const resolveLineageId = (checkpointLineageId: string | null): string => {
    if (checkpointLineageId !== null && checkpointLineageId.trim() !== '') return checkpointLineageId.trim();
    return `${Date.now()}`;
};

const resolveHandoffReadyMeta = (
  run: AiPathRunRecord,
  reason: string | null,
  checkpointLineageId: string | null,
  requestedBy: string | null
): Record<string, unknown> => {
  const normalizedReason = resolveNormalizedReason(run.status, reason);
  const lineageId = `${run.id}:${resolveLineageId(checkpointLineageId)}`;
    
  return {
    ...(isObjectRecord(run.meta) ? { ...run.meta } : {}),
    handoff: {
      readyAt: new Date().toISOString(),
      reason: normalizedReason,
      previousStatus: run.status,
      checkpointLineageId: lineageId,
      requestedBy,
    },
  };
};

const handleHandoffLogging = async (
  runId: string,
  repo: Awaited<ReturnType<typeof getPathRunRepository>>,
  params: { reason: string; status: string; lineageId: string; requestedBy: string | null }
): Promise<void> => {
  try {
    const { recordRuntimeRunHandoffReady } = await import(
      '@/features/ai/ai-paths/services/runtime-analytics-service'
    );
    await Promise.all([
      repo.createRunEvent({
        runId,
        level: 'warn',
        message: 'Run marked handoff-ready for delegated continuation.',
        metadata: {
          reason: params.reason,
          previousStatus: params.status,
          checkpointLineageId: params.lineageId,
          requestedBy: params.requestedBy ?? null,
          runtimeFingerprint: getAiPathsRuntimeFingerprint(),
          traceId: runId,
        },
      }),
      (recordRuntimeRunHandoffReady as any)({ runId }),
    ]);
  } catch (auxError: unknown) {
    void ErrorSystem.captureException(auxError);
  }
};

export async function markPathRunHandoffReady({
  runId,
  reason,
  checkpointLineageId,
  requestedBy,
}: {
  runId: string;
  reason?: string | null;
  checkpointLineageId?: string | null;
  requestedBy?: string | null;
}): Promise<AiPathRunRecord | null> {
  const repo = await getPathRunRepository();
  const run = await repo.findRunById(runId);
  if (run === null) return null;
  if (run.status !== 'blocked_on_lease' && run.status !== 'paused' && run.status !== 'failed') return run;

  const nextMeta = resolveHandoffReadyMeta(run, reason ?? null, checkpointLineageId ?? null, requestedBy ?? null);
  const updated = await repo.updateRunIfStatus(run.id, [run.status], { status: 'handoff_ready', meta: nextMeta });
  const current = updated ?? (await repo.findRunById(run.id));
  if (current === null) return null;

  const handoffData = nextMeta['handoff'] as { reason: string; checkpointLineageId: string };
  await handleHandoffLogging(run.id, repo, {
    reason: handoffData.reason,
    status: run.status,
    lineageId: handoffData.checkpointLineageId,
    requestedBy: requestedBy ?? null
  });

  publishRunUpdate(run.id, 'run', {
    status: 'handoff_ready',
    reason: handoffData.reason,
    checkpointLineageId: handoffData.checkpointLineageId,
    traceId: run.id,
  });
  cleanupRunQueueEntries(run.id);

  return current;
}
