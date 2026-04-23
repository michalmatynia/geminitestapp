import { type AiPathRunRecord, type AiNode } from '@/shared/contracts/ai-paths';
import { getPathRunRepository } from '@/shared/lib/ai-paths/services/path-run-repository';
import { dispatchRun } from '@/features/ai/ai-paths/services/path-run-executor';
import { ACTIVE_RUN_STATUSES } from '@/features/ai/ai-paths/lib/path-run-status';
import { getAiPathsRuntimeFingerprint } from '@/features/ai/ai-paths/services/runtime-fingerprint';
import { withRuntimeFingerprintMeta } from '@/features/ai/ai-paths/services/runtime-state-port-repair';
import { resolveRunStartedAt } from '@/shared/lib/ai-paths/services/runtime-analytics-service';
import { recordRuntimeRunQueued } from '@/features/ai/ai-paths/workers/ai-path-run-queue/queue';
import { ErrorSystem } from '@/shared/utils/observability/error-system';

const getRetryMeta = (run: AiPathRunRecord, nodeId: string): Record<string, unknown> => {
  return withRuntimeFingerprintMeta({
    ...(run.meta ?? {}),
    resumeMode: 'retry',
    retryNodeIds: [nodeId],
  });
};

const recordRetryEvents = async (run: AiPathRunRecord, nodeId: string): Promise<void> => {
  try {
    const repo = await getPathRunRepository();
    await Promise.all([
      repo.createRunEvent({
        runId: run.id,
        level: 'info',
        message: `Retry node ${nodeId}.`,
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
    void ErrorSystem.logWarning(
      `Non-critical retry logging failure for run ${run.id}, node ${nodeId}`,
      {
        service: 'ai-paths-service',
        error: auxError,
        runId: run.id,
        nodeId,
      }
    );
  }
};

export const retryPathRunNode = async (runId: string, nodeId: string): Promise<AiPathRunRecord> => {
  const repo = await getPathRunRepository();
  const run = await repo.findRunById(runId);
  if (run === null) throw new Error(`Run ${runId} not found`);

  if (ACTIVE_RUN_STATUSES.has(run.status as any)) {
    if (run.status === 'queued') {
      await dispatchRun(run.id);
    }
    return run;
  }

  const nodeInfo = run.graph?.nodes?.find((node: AiNode) => node.id === nodeId) ?? null;
  const meta = getRetryMeta(run, nodeId);
  
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

  await repo.upsertRunNode(runId, nodeId, {
    nodeType: nodeInfo?.type ?? 'unknown',
    nodeTitle: nodeInfo?.title ?? null,
    status: 'pending',
    attempt: 0,
    inputs: undefined,
    outputs: undefined,
    errorMessage: null,
    startedAt: null,
    finishedAt: null,
  });

  await recordRetryEvents(updated, nodeId);

  try {
    await dispatchRun(updated.id);
  } catch (dispatchError: unknown) {
    throw new Error(`Run dispatch failed: ${String(dispatchError)}`);
  }

  return updated;
};
