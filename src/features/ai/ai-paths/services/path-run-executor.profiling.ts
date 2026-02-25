import {
  type AiPathRunNodeRecord,
  type RuntimeState,
} from '@/shared/contracts/ai-paths';
import {
  type AiPathRuntimeProfileEventDto,
  type RuntimeProfileSummaryDto,
} from '@/shared/contracts/ai-paths-runtime';
import {
  RUNTIME_PROFILE_HIGHLIGHT_LIMIT,
  RUNTIME_PROFILE_SAMPLE_LIMIT,
  RUNTIME_PROFILE_SLOW_NODE_MS,
  RUNTIME_TRACE_SPAN_LIMIT,
} from './path-run-executor.helpers';

export const buildRunProfileSummary = (
  runId: string,
  runtimeState: RuntimeState,
  nodeRecords: AiPathRunNodeRecord[]
): RuntimeProfileSummaryDto => {
  const events = runtimeState.events || [];
  const totalEvents = events.length;
  
  const nodeExecutionTimes = new Map<string, number>();
  nodeRecords.forEach((record) => {
    if (record.finishedAt && record.startedAt) {
      const duration = new Date(record.finishedAt).getTime() - new Date(record.startedAt).getTime();
      nodeExecutionTimes.set(record.nodeId, duration);
    }
  });

  const slowNodes = Array.from(nodeExecutionTimes.entries())
    .filter(([_, duration]) => duration >= RUNTIME_PROFILE_SLOW_NODE_MS)
    .sort((a, b) => b[1] - a[1])
    .slice(0, RUNTIME_PROFILE_HIGHLIGHT_LIMIT)
    .map(([nodeId, duration]) => ({ nodeId, durationMs: duration }));

  const samples = events
    .slice(-RUNTIME_PROFILE_SAMPLE_LIMIT)
    .map((event): AiPathRuntimeProfileEventDto => ({
      type: event.type,
      nodeId: event.nodeId,
      timestamp: event.timestamp,
      metadata: event.metadata,
    }));

  return {
    runId,
    totalEvents,
    slowNodes,
    samples,
    traceSpanLimit: RUNTIME_TRACE_SPAN_LIMIT,
  };
};
