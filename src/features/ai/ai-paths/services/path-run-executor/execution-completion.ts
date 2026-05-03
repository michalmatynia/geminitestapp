import 'server-only';

import type {
  AiPathRunRecord,
  AiPathRunStatus,
  AiNode,
  RuntimePortValues,
} from '@/shared/contracts/ai-paths';
import { ErrorSystem } from '@/shared/utils/observability/error-system';

import {
  buildBlockedRunFailureMessage,
  buildFailedRunFailureMessage,
  buildWaitingNodeFailureMessage,
  collectBlockedNodeDiagnostics,
  collectFailedNodeDiagnostics,
  collectWaitingNodeDiagnostics,
  shouldFailBlockedRun,
} from '../path-run-executor.diagnostics';
import { summarizeRuntimeKernelParityFromHistory } from '../path-run-executor.runtime-kernel';
import { type PathRunRuntimeStateManager } from './runtime-state-manager';
import { type RuntimeProfileSnapshot } from '../path-run-executor.types';

const MARKETPLACE_COPY_DEBRAND_BATCH_META_SOURCE = 'product_marketplace_copy_debrand_batch';
const MARKETPLACE_COPY_DEBRAND_BATCH_SERVER_SOURCE = 'marketplace-copy-debrand-batch';
const MARKETPLACE_COPY_DEBRAND_ROW_META_SOURCE = 'product_marketplace_copy_debrand_row';
const MARKETPLACE_COPY_DEBRAND_ROW_SERVER_SOURCE = 'marketplace-copy-debrand-row';

export type ExecutionCompletionArgs = {
  run: AiPathRunRecord;
  nodes: AiNode[];
  accOutputs: Record<string, RuntimePortValues>;
  runtimeHaltReason: 'completed' | 'blocked' | 'max_iterations' | 'failed' | null;
  nodeValidationEnabled: boolean;
  blockedRunPolicy: 'fail_run' | 'complete_with_warning';
  requiredProcessingNodeIds: string[];
  runMetaWithRuntimeContext: Record<string, unknown>;
  runStartedAt: string;
  traceId: string;
  profileSnapshot: RuntimeProfileSnapshot;
  stateManager: PathRunRuntimeStateManager;
  updateRunSnapshot: (input: {
    status: AiPathRunStatus;
    runtimeState: unknown;
    errorMessage: string | null;
    meta: Record<string, unknown>;
  }) => Promise<boolean | void>;
};

type CompletionStatusInput = {
  nodes: AiNode[];
  accOutputs: Record<string, RuntimePortValues>;
  runtimeHaltReason: ExecutionCompletionArgs['runtimeHaltReason'];
  nodeValidationEnabled: boolean;
  blockedRunPolicy: ExecutionCompletionArgs['blockedRunPolicy'];
};

type CompletionDiagnostics = {
  failedNodeDiagnostics: ReturnType<typeof collectFailedNodeDiagnostics>;
  waitingNodeDiagnostics: ReturnType<typeof collectWaitingNodeDiagnostics>;
};

type CompletionStatusResolution = {
  finalStatus: AiPathRunStatus;
  finalError: string | null;
};

const asRecord = (value: unknown): Record<string, unknown> | null => {
  if (value === null || value === undefined || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }
  return value as Record<string, unknown>;
};

const asTrimmedString = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const shouldPersistCompletedProductSideEffects = (
  runMetaWithRuntimeContext: Record<string, unknown>
): boolean => {
  const serverMetadata = asRecord(runMetaWithRuntimeContext['serverMetadata']);
  return (
    asTrimmedString(runMetaWithRuntimeContext['source']) ===
      MARKETPLACE_COPY_DEBRAND_BATCH_META_SOURCE ||
    asTrimmedString(runMetaWithRuntimeContext['source']) === MARKETPLACE_COPY_DEBRAND_ROW_META_SOURCE ||
    asTrimmedString(serverMetadata?.['source']) === MARKETPLACE_COPY_DEBRAND_BATCH_SERVER_SOURCE ||
    asTrimmedString(serverMetadata?.['source']) === MARKETPLACE_COPY_DEBRAND_ROW_SERVER_SOURCE
  );
};

const resolveRuntimeHaltFailure = (input: {
  runtimeHaltReason: CompletionStatusInput['runtimeHaltReason'];
  failedNodeDiagnostics: CompletionDiagnostics['failedNodeDiagnostics'];
}): CompletionStatusResolution | null => {
  if (input.runtimeHaltReason === 'failed') {
    return {
      finalStatus: 'failed',
      finalError: buildFailedRunFailureMessage(input.failedNodeDiagnostics),
    };
  }
  if (input.runtimeHaltReason === 'max_iterations') {
    return { finalStatus: 'failed', finalError: 'Maximum iteration limit reached.' };
  }
  return null;
};

const resolveBlockedFailure = (input: {
  nodes: AiNode[];
  accOutputs: Record<string, RuntimePortValues>;
  runtimeHaltReason: CompletionStatusInput['runtimeHaltReason'];
  nodeValidationEnabled: boolean;
  blockedRunPolicy: CompletionStatusInput['blockedRunPolicy'];
  failedNodeDiagnostics: CompletionDiagnostics['failedNodeDiagnostics'];
}): CompletionStatusResolution | null => {
  if (input.runtimeHaltReason !== 'blocked') return null;
  if (input.failedNodeDiagnostics.length > 0) {
    return {
      finalStatus: 'failed',
      finalError: buildFailedRunFailureMessage(input.failedNodeDiagnostics),
    };
  }
  if (
    !shouldFailBlockedRun({
      runBlocked: true,
      blockedRunPolicy: input.blockedRunPolicy,
      nodeValidationEnabled: input.nodeValidationEnabled,
    })
  ) {
    return null;
  }

  const blockedDiagnostics = collectBlockedNodeDiagnostics(input.nodes, input.accOutputs);
  return blockedDiagnostics.length > 0
    ? { finalStatus: 'failed', finalError: buildBlockedRunFailureMessage(blockedDiagnostics) }
    : { finalStatus: 'completed', finalError: null };
};

const resolveWaitingFailure = (
  waitingNodeDiagnostics: CompletionDiagnostics['waitingNodeDiagnostics']
): CompletionStatusResolution | null =>
  waitingNodeDiagnostics.length > 0
    ? {
        finalStatus: 'failed',
        finalError: buildWaitingNodeFailureMessage(waitingNodeDiagnostics),
      }
    : null;

const resolveCompletedRunFailure = (
  failedNodeDiagnostics: CompletionDiagnostics['failedNodeDiagnostics']
): CompletionStatusResolution | null =>
  failedNodeDiagnostics.length > 0
    ? {
        finalStatus: 'failed',
        finalError: buildFailedRunFailureMessage(failedNodeDiagnostics),
      }
    : null;

const resolveCompletionStatus = (
  input: CompletionStatusInput
): CompletionStatusResolution => {
  const failedNodeDiagnostics = collectFailedNodeDiagnostics(input.nodes, input.accOutputs);
  const waitingNodeDiagnostics = collectWaitingNodeDiagnostics(input.nodes, input.accOutputs);

  return (
    resolveRuntimeHaltFailure({
      runtimeHaltReason: input.runtimeHaltReason,
      failedNodeDiagnostics,
    }) ??
    resolveBlockedFailure({
      ...input,
      failedNodeDiagnostics,
    }) ??
    resolveWaitingFailure(waitingNodeDiagnostics) ??
    resolveCompletedRunFailure(failedNodeDiagnostics) ?? {
      finalStatus: 'completed',
      finalError: null,
    }
  );
};

const persistCompletedProductSideEffects = async (input: {
  run: AiPathRunRecord;
  runMetaWithRuntimeContext: Record<string, unknown>;
  finalRuntimeState: unknown;
  accOutputs: Record<string, RuntimePortValues>;
}): Promise<void> => {
  if (!shouldPersistCompletedProductSideEffects(input.runMetaWithRuntimeContext)) return;

  try {
    const { persistMarketplaceCopyDebrandBatchRunResult } = await import(
      '@/features/products/server/marketplace-copy-debrand-run-completion'
    );
    await persistMarketplaceCopyDebrandBatchRunResult({
      run: input.run,
      runMeta: input.runMetaWithRuntimeContext,
      runtimeState: input.finalRuntimeState,
      accOutputs: input.accOutputs,
    });
  } catch (error) {
    await ErrorSystem.captureException(error, {
      service: 'ai-path-run-execution-completion',
      action: 'persistCompletedProductSideEffects',
      runId: input.run.id,
      productId: input.run.entityId ?? undefined,
    });
  }
};

const buildRuntimeTraceRecord = (
  runMetaWithRuntimeContext: Record<string, unknown>
): Record<string, unknown> => {
  const runtimeTraceRaw = runMetaWithRuntimeContext['runtimeTrace'];
  return asRecord(runtimeTraceRaw) ?? {};
};

const computeDurationMs = (input: { runStartedAt: string; finishedAt: string }): number | null => {
  const startMs = Date.parse(input.runStartedAt);
  const finishMs = Date.parse(input.finishedAt);
  return Number.isFinite(startMs) && Number.isFinite(finishMs)
    ? Math.max(0, finishMs - startMs)
    : null;
};

const buildFinalRunMeta = (input: {
  runMetaWithRuntimeContext: Record<string, unknown>;
  finishedAt: string;
  durationMs: number | null;
  profileSnapshot: RuntimeProfileSnapshot;
  runtimeKernelParity: unknown;
}): Record<string, unknown> => ({
  ...input.runMetaWithRuntimeContext,
  finishedAt: input.finishedAt,
  durationMs: input.durationMs,
  runtimeTrace: {
    ...buildRuntimeTraceRecord(input.runMetaWithRuntimeContext),
    finishedAt: input.finishedAt,
    profile: input.profileSnapshot,
    kernelParity: input.runtimeKernelParity,
  },
});

export const handleExecutionCompletion = async (
  args: ExecutionCompletionArgs
): Promise<AiPathRunStatus> => {
  const {
    run,
    nodes,
    accOutputs,
    runtimeHaltReason,
    nodeValidationEnabled,
    blockedRunPolicy,
    runMetaWithRuntimeContext,
    runStartedAt,
    profileSnapshot,
    stateManager,
    updateRunSnapshot,
  } = args;

  const { finalStatus, finalError } = resolveCompletionStatus({
    nodes,
    accOutputs,
    runtimeHaltReason,
    nodeValidationEnabled,
    blockedRunPolicy,
  });

  const finishedAt = new Date().toISOString();
  const finalRuntimeState = await stateManager.buildCurrentRuntimeStateSnapshot();
  const runtimeKernelParity = summarizeRuntimeKernelParityFromHistory(finalRuntimeState.history);
  const finalMeta = buildFinalRunMeta({
    runMetaWithRuntimeContext,
    finishedAt,
    durationMs: computeDurationMs({ runStartedAt, finishedAt }),
    profileSnapshot,
    runtimeKernelParity,
  });
  const snapshotUpdated = await updateRunSnapshot({
    status: finalStatus,
    runtimeState: finalRuntimeState as unknown,
    errorMessage: finalError,
    meta: finalMeta,
  });

  if (finalStatus === 'completed' && snapshotUpdated !== false) {
    await persistCompletedProductSideEffects({
      run,
      runMetaWithRuntimeContext: finalMeta,
      finalRuntimeState,
      accOutputs,
    });
  }

  return finalStatus;
};
