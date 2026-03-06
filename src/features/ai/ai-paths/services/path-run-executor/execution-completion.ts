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
import { computeDurationMs } from '../path-run-executor.logic';
import { PathRunRuntimeStateManager } from './runtime-state-manager';

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
  profileSnapshot: Record<string, unknown>;
  stateManager: PathRunRuntimeStateManager;
  updateRunSnapshot: (data: Record<string, unknown>) => Promise<boolean>;
};

export const handleExecutionCompletion = async (args: ExecutionCompletionArgs): Promise<AiPathRunStatus> => {
  const {
    run,
    nodes,
    accOutputs,
    runtimeHaltReason,
    nodeValidationEnabled,
    requiredProcessingNodeIds,
    runMetaWithRuntimeContext,
    runStartedAt,
    profileSnapshot,
    stateManager,
    updateRunSnapshot,
  } = args;

  const finishedAt = new Date().toISOString();
  let finalStatus: AiPathRunStatus = 'completed';
  let finalError: string | null = null;

  if (runtimeHaltReason === 'failed') {
    finalStatus = 'failed';
  } else if (runtimeHaltReason === 'max_iterations') {
    finalStatus = 'failed';
    finalError = 'Maximum iteration limit reached. The graph might have a circular dependency or infinite loop.';
  } else if (run.status === 'canceled') {
    finalStatus = 'canceled';
  } else if (runtimeHaltReason === 'blocked') {
    const blockedNodeDiagnostics = collectBlockedNodeDiagnostics(nodes, accOutputs);
    if (
      shouldFailBlockedRun({
        runBlocked: blockedNodeDiagnostics.length > 0,
        blockedRunPolicy:
          (run.meta?.['blockedRunPolicy'] as 'fail_run' | 'complete_with_warning') ??
          'complete_with_warning',
        nodeValidationEnabled,
      })
    ) {
      finalStatus = 'failed';
      finalError = buildBlockedRunFailureMessage(blockedNodeDiagnostics);
    }
  }

  if (finalStatus === 'completed') {
    const requiredProcessingNodeIdSet = new Set<string>(requiredProcessingNodeIds);
    const failedRequiredNodes = collectFailedNodeDiagnostics(nodes, accOutputs).filter(
      (node) =>
        requiredProcessingNodeIdSet.size === 0 || requiredProcessingNodeIdSet.has(node.nodeId)
    );
    if (failedRequiredNodes.length > 0) {
      finalStatus = 'failed';
      finalError = buildFailedRunFailureMessage(failedRequiredNodes);
    }
  }

  const finalRuntimeState = await stateManager.buildCurrentRuntimeStateSnapshot();
  const runtimeTraceRecord =
    runMetaWithRuntimeContext['runtimeTrace'] &&
    typeof runMetaWithRuntimeContext['runtimeTrace'] === 'object' &&
    !Array.isArray(runMetaWithRuntimeContext['runtimeTrace'])
      ? (runMetaWithRuntimeContext['runtimeTrace'] as Record<string, unknown>)
      : {};
  const runtimeKernelParity = summarizeRuntimeKernelParityFromHistory(finalRuntimeState.history);

  await updateRunSnapshot({
    status: finalStatus,
    runtimeState: finalRuntimeState,
    errorMessage: finalError,
    meta: {
      ...runMetaWithRuntimeContext,
      finishedAt,
      durationMs: computeDurationMs(runStartedAt, finishedAt),
      runtimeTrace: {
        ...runtimeTraceRecord,
        profile: profileSnapshot,
        kernelParity: runtimeKernelParity,
      },
    },
  });

  return finalStatus;
};
