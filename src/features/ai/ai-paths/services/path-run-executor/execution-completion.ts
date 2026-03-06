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
import {
  summarizeRuntimeKernelParityFromHistory,
} from '../path-run-executor.helpers';
import { PathRunRuntimeStateManager } from './runtime-state-manager';
import { RuntimeProfileSnapshot } from '../path-run-executor.types';

export type ExecutionCompletionArgs = {
  run: AiPathRunRecord;
  nodes: AiNode[];
  accOutputs: Record<string, RuntimePortValues>;
  runtimeHaltReason: 'completed' | 'blocked' | 'max_iterations' | 'failed' | null;
  nodeValidationEnabled: boolean;
  requiredProcessingNodeIds: string[];
  runMetaWithRuntimeContext: Record<string, unknown>;
  runStartedAt: string;
  traceId: string;
  profileSnapshot: RuntimeProfileSnapshot;
  stateManager: PathRunRuntimeStateManager;
  updateRunSnapshot: (input: {
    status: AiPathRunStatus;
    runtimeState: any;
    errorMessage: string | null;
    meta: Record<string, unknown>;
  }) => Promise<void>;
};

export const handleExecutionCompletion = async (
  args: ExecutionCompletionArgs
): Promise<AiPathRunStatus> => {
  const {
    nodes,
    accOutputs,
    runtimeHaltReason,
    nodeValidationEnabled,
    requiredProcessingNodeIds,
    runMetaWithRuntimeContext,
    runStartedAt,
    traceId,
    profileSnapshot,
    stateManager,
    updateRunSnapshot,
  } = args;

  let finalStatus: AiPathRunStatus = 'completed';
  let finalError: string | null = null;

  if (runtimeHaltReason === 'failed') {
    finalStatus = 'failed';
    finalError = buildFailedRunFailureMessage(collectFailedNodeDiagnostics(accOutputs, nodes));
  } else if (runtimeHaltReason === 'max_iterations') {
    finalStatus = 'failed';
    finalError = 'Maximum iteration limit reached.';
  } else if (
    runtimeHaltReason === 'blocked' &&
    shouldFailBlockedRun(accOutputs, nodes, {
      nodeValidationEnabled,
      requiredProcessingNodeIds,
    })
  ) {
    finalStatus = 'failed';
    finalError = buildBlockedRunFailureMessage(collectBlockedNodeDiagnostics(accOutputs, nodes));
  } else if (runtimeHaltReason === 'blocked') {
    finalStatus = 'blocked';
  }

  const finishedAt = new Date().toISOString();
  const finalRuntimeState = await stateManager.buildCurrentRuntimeStateSnapshot();
  const runtimeTraceRecord =
    runMetaWithRuntimeContext['runtimeTrace'] &&
    typeof runMetaWithRuntimeContext['runtimeTrace'] === 'object' &&
    !Array.isArray(runMetaWithRuntimeContext['runtimeTrace'])
      ? (runMetaWithRuntimeContext['runtimeTrace'] as Record<string, unknown>)
      : {};
  const runtimeKernelParity = summarizeRuntimeKernelParityFromHistory(finalRuntimeState.history as unknown);

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
        profile: profileSnapshot,
        kernelParity: runtimeKernelParity,
      },
    },
  });

  return finalStatus;
};
