import 'server-only';

import type {
  AiPathRunRecord,
  AiPathRunStatus,
  AiNode,
  RuntimePortValues,
} from '@/shared/contracts/ai-paths';

import {
  buildBlockedRunFailureMessage,
  buildFailedRunFailureMessage,
  collectBlockedNodeDiagnostics,
  collectFailedNodeDiagnostics,
  shouldFailBlockedRun,
} from '../path-run-executor.diagnostics';
import { summarizeRuntimeKernelParityFromHistory } from '../path-run-executor.runtime-kernel';
import { PathRunRuntimeStateManager } from './runtime-state-manager';
import { RuntimeProfileSnapshot } from '../path-run-executor.types';

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

export const handleExecutionCompletion = async (
  args: ExecutionCompletionArgs
): Promise<AiPathRunStatus> => {
  const {
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

  let finalStatus: AiPathRunStatus = 'completed';
  let finalError = null;
  const failedNodeDiagnostics = collectFailedNodeDiagnostics(nodes, accOutputs);

  if (runtimeHaltReason === 'failed') {
    finalStatus = 'failed';
    finalError = buildFailedRunFailureMessage(failedNodeDiagnostics);
  } else if (runtimeHaltReason === 'max_iterations') {
    finalStatus = 'failed';
    finalError = 'Maximum iteration limit reached.';
  } else if (runtimeHaltReason === 'blocked' && failedNodeDiagnostics.length > 0) {
    finalStatus = 'failed';
    finalError = buildFailedRunFailureMessage(failedNodeDiagnostics);
  } else if (
    runtimeHaltReason === 'blocked' &&
    shouldFailBlockedRun({
      runBlocked: true,
      blockedRunPolicy,
      nodeValidationEnabled,
    })
  ) {
    const blockedDiagnostics = collectBlockedNodeDiagnostics(nodes, accOutputs);
    if (blockedDiagnostics.length > 0) {
      finalStatus = 'failed';
      finalError = buildBlockedRunFailureMessage(blockedDiagnostics);
    }
  } else if (runtimeHaltReason === 'blocked') {
    finalStatus = 'completed';
  }

  if (finalStatus === 'completed' && failedNodeDiagnostics.length > 0) {
    finalStatus = 'failed';
    finalError = buildFailedRunFailureMessage(failedNodeDiagnostics);
  }

  const finishedAt = new Date().toISOString();
  const finalRuntimeState = await stateManager.buildCurrentRuntimeStateSnapshot();
  const runtimeTraceRecord =
    runMetaWithRuntimeContext['runtimeTrace'] &&
    typeof runMetaWithRuntimeContext['runtimeTrace'] === 'object' &&
    !Array.isArray(runMetaWithRuntimeContext['runtimeTrace'])
      ? (runMetaWithRuntimeContext['runtimeTrace'] as Record<string, unknown>)
      : {};
  const runtimeKernelParity = summarizeRuntimeKernelParityFromHistory(finalRuntimeState.history);

  const startMs = Date.parse(runStartedAt);
  const finishMs = Date.parse(finishedAt);
  const durationMs =
    Number.isFinite(startMs) && Number.isFinite(finishMs) ? Math.max(0, finishMs - startMs) : null;

  await updateRunSnapshot({
    status: finalStatus,
    runtimeState: finalRuntimeState as unknown,
    errorMessage: finalError,
    meta: {
      ...runMetaWithRuntimeContext,
      finishedAt,
      durationMs,
      runtimeTrace: {
        ...runtimeTraceRecord,
        finishedAt,
        profile: profileSnapshot,
        kernelParity: runtimeKernelParity,
      },
    },
  });

  return finalStatus;
};
