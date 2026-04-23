import type { Edge, AiPathRunRecord, RuntimeState } from '@/shared/contracts/ai-paths';
import type { RuntimeTraceResume, RuntimeTraceResumeMode, RuntimeTraceResumeReason } from '@/shared/contracts/ai-paths-runtime';
import { toRuntimeNodeStatus } from './path-run-executor.logic';

export const TERMINAL_REUSED_STATUSES = new Set(['completed', 'cached']);
export const FAILED_RESUME_STATUSES = new Set(['failed', 'timeout']);

export const toResumeSourceStatus = (value: unknown): string | null => {
  if (value === 'executed') return 'completed';
  return toRuntimeNodeStatus(value);
};

export const getLatestRuntimeHistoryEntry = (
  runtimeState: RuntimeState,
  nodeId: string
): NonNullable<RuntimeState['history']>[string][number] | null => {
  const entries = runtimeState.history?.[nodeId];
  return Array.isArray(entries) && entries.length > 0 ? (entries.at(-1) ?? null) : null;
};

export interface RuntimeResumePlan {
  skipNodeIds: Set<string>;
  resumeByNodeId: Map<string, RuntimeTraceResume>;
  sourceHistoryByNodeId: Map<string, NonNullable<RuntimeState['history']>[string][number]>;
}

export const buildResumeEntry = (
  nodeId: string,
  input: {
    mode: RuntimeTraceResumeMode;
    decision: RuntimeTraceResume['decision'];
    reason: RuntimeTraceResumeReason;
  },
  params: {
    sourceHistoryByNodeId: Map<string, NonNullable<RuntimeState['history']>[string][number]>;
    nodeStatusMap: Map<string, string>;
    sourceRunStartedAt: string | null;
    currentRunId: string | null;
    runId: string | null;
  }
): RuntimeTraceResume => {
  const latestHistory = params.sourceHistoryByNodeId.get(nodeId) ?? null;
  const sourceStatus =
    toRuntimeNodeStatus(params.nodeStatusMap.get(nodeId)) ??
    toResumeSourceStatus(latestHistory?.status) ??
    null;
  return {
    mode: input.mode,
    decision: input.decision,
    reason: input.reason,
    sourceTraceId: latestHistory?.traceId ?? params.currentRunId ?? params.runId ?? null,
    sourceSpanId: typeof latestHistory?.spanId === 'string' ? latestHistory.spanId : null,
    sourceRunStartedAt: params.sourceRunStartedAt,
    sourceStatus,
  };
};

const collectSourceHistoryByNodeId = (
  runtimeState: RuntimeState
): Map<string, NonNullable<RuntimeState['history']>[string][number]> => {
  const sourceHistoryByNodeId = new Map<
    string,
    NonNullable<RuntimeState['history']>[string][number]
  >();
  Object.entries(runtimeState.history ?? {}).forEach(([nodeId, entries]) => {
    if (!Array.isArray(entries) || entries.length === 0) return;
    const latestEntry = entries.at(-1);
    if (latestEntry) {
      sourceHistoryByNodeId.set(nodeId, latestEntry);
    }
  });
  return sourceHistoryByNodeId;
};

const computeDownstreamNodeIds = (edges: Edge[], startNodeIds: Set<string>): Set<string> => {
  const downstreamNodeIds = new Set<string>();
  const queue = Array.from(startNodeIds);

  while (queue.length > 0) {
    const currentNodeId = queue.shift();
    if (!currentNodeId) continue;

    for (const edge of edges) {
      if (edge.from !== currentNodeId || !edge.to || downstreamNodeIds.has(edge.to)) continue;
      downstreamNodeIds.add(edge.to);
      queue.push(edge.to);
    }
  }

  return downstreamNodeIds;
};

export const buildResumePlan = (
  run: AiPathRunRecord,
  edges: Edge[],
  nodeStatusMap: Map<string, string>,
  runtimeState: RuntimeState
): RuntimeResumePlan => {
  const sourceHistoryByNodeId = collectSourceHistoryByNodeId(runtimeState);
  const skipNodeIds = new Set<string>();
  const resumeByNodeId = new Map<string, RuntimeTraceResume>();
  const currentRunId = runtimeState.currentRun?.id ?? null;
  const sourceRunStartedAt = runtimeState.currentRun?.startedAt ?? run.startedAt ?? null;
  const failedNodeIds = new Set<string>();
  const params = {
    sourceHistoryByNodeId,
    nodeStatusMap,
    sourceRunStartedAt,
    currentRunId,
    runId: run.id,
  };
  const candidateNodeIds = new Set<string>([
    ...nodeStatusMap.keys(),
    ...sourceHistoryByNodeId.keys(),
  ]);

  candidateNodeIds.forEach((nodeId) => {
    const latestHistory = sourceHistoryByNodeId.get(nodeId) ?? null;
    const status =
      toRuntimeNodeStatus(nodeStatusMap.get(nodeId)) ??
      toResumeSourceStatus(latestHistory?.status) ??
      null;

    if (status && TERMINAL_REUSED_STATUSES.has(status)) {
      skipNodeIds.add(nodeId);
      resumeByNodeId.set(
        nodeId,
        buildResumeEntry(
          nodeId,
          {
            mode: 'resume',
            decision: 'reused',
            reason: 'completed_upstream',
          },
          params
        )
      );
      return;
    }

    if (status && FAILED_RESUME_STATUSES.has(status)) {
      failedNodeIds.add(nodeId);
      resumeByNodeId.set(
        nodeId,
        buildResumeEntry(
          nodeId,
          {
            mode: 'retry',
            decision: 'reexecuted',
            reason: 'failed_node',
          },
          params
        )
      );
      return;
    }

    if (latestHistory) {
      resumeByNodeId.set(
        nodeId,
        buildResumeEntry(
          nodeId,
          {
            mode: 'resume',
            decision: 'reexecuted',
            reason: 'incomplete',
          },
          params
        )
      );
    }
  });

  const downstreamOfFailureNodeIds = computeDownstreamNodeIds(edges, failedNodeIds);
  downstreamOfFailureNodeIds.forEach((nodeId) => {
    if (skipNodeIds.has(nodeId)) return;
    resumeByNodeId.set(
      nodeId,
      buildResumeEntry(
        nodeId,
        {
          mode: 'retry',
          decision: 'reexecuted',
          reason: 'downstream_of_failure',
        },
        params
      )
    );
  });

  return {
    skipNodeIds,
    resumeByNodeId,
    sourceHistoryByNodeId,
  };
};
