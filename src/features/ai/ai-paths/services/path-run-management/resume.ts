import { type AiPathRunRecord } from '@/shared/contracts/ai-paths';
import { getPathRunRepository } from '@/shared/lib/ai-paths/services/path-run-repository';
import { dispatchRun } from '@/features/ai/ai-paths/services/path-run-executor';
import { ACTIVE_RUN_STATUSES } from '@/features/ai/ai-paths/lib/path-run-status';
import { getAiPathsRuntimeFingerprint } from '@/features/ai/ai-paths/services/runtime-fingerprint';
import { withRuntimeFingerprintMeta } from '@/features/ai/ai-paths/services/runtime-state-port-repair';
import { resolveRunStartedAt } from '@/shared/lib/ai-paths/services/runtime-analytics-service';
import { recordRuntimeRunQueued } from '@/features/ai/ai-paths/workers/ai-path-run-queue/queue';
import { ErrorSystem } from '@/shared/utils/observability/error-system';
import { publishRunUpdate } from '@/features/ai/ai-paths/services/run-stream-publisher';

const getResumeMeta = (run: AiPathRunRecord, mode: 'resume' | 'replay'): Record<string, unknown> => {
  return withRuntimeFingerprintMeta({
    ...(run.meta ?? {}),
    resumeMode: mode,
    retryNodeIds: [],
  });
};

const recordResumeEvents = async (run: AiPathRunRecord, mode: string): Promise<void> => {
  try {
    const repo = await getPathRunRepository();
    await Promise.all([
      repo.createRunEvent({
        runId: run.id,
        level: 'info',
        message: `Run resumed (${mode}).`,
        metadata: {
          runStartedAt: resolveRunStartedAt(run) ?? undefined,
          runtimeFingerprint: getAiPathsRuntimeFingerprint(),
          traceId: run.id,
        },
      }),
      recordRuntimeRunQueued({ runId: run.id }),
    ]);
  } catch (auxError) {
    void ErrorSystem.captureException(auxError);
    void ErrorSystem.logWarning(`Non-critical resume logging failure for run ${run.id}`, {
      service: 'ai-paths-service',
      error: auxError,
      runId: run.id,
    });
  }
};

export const resumePathRun = async (
  runId: string,
  mode: 'resume' | 'replay' = 'resume'
): Promise<AiPathRunRecord> => {
  const repo = await getPathRunRepository();
  const run = await repo.findRunById(runId);
  if (run === null) throw new Error(`Run ${runId} not found`);

  if (ACTIVE_RUN_STATUSES.has(run.status as any)) {
    if (run.status === 'queued') {
      await dispatchRun(run.id);
    }
    return run;
  }

  const meta = getResumeMeta(run, mode);
  const updated = await repo.updateRunIfStatus(runId, [run.status], {
    status: 'queued',
    errorMessage: null,
    retryCount: 0,
    nextRetryAt: null,
    deadLetteredAt: null,
    meta,
  });

  if (updated === null) {
    const latest = await repo.findRunById(runId);
    if (latest === null) throw new Error(`Run ${runId} not found`);
    if (latest.status === 'queued') {
      await dispatchRun(latest.id);
    }
    return latest;
  }

  await recordResumeEvents(updated, mode);
  try {
    await dispatchRun(updated.id);
  } catch (dispatchError: unknown) {
    throw new Error(`Run dispatch failed: ${String(dispatchError)}`);
  }

  publishRunUpdate(runId, 'run', { status: 'queued', mode, traceId: runId });
  return updated;
};
