import {
  type AiPathRunNodeRecord,
  type RuntimeState,
} from '@/shared/contracts/ai-paths';
import {
  type RuntimeProfileSummaryDto,
} from '@/shared/contracts/ai-paths-runtime';
import {
  RUNTIME_PROFILE_HIGHLIGHT_LIMIT,
} from './path-run-executor.helpers';

export const buildRunProfileSummary = (
  runId: string,
  _runtimeState: RuntimeState,
  nodeRecords: AiPathRunNodeRecord[]
): RuntimeProfileSummaryDto => {
  const nodeStatsMap = new Map<string, {
    nodeId: string;
    nodeType: string;
    count: number;
    totalMs: number;
    maxMs: number;
    cachedCount: number;
    skippedCount: number;
    errorCount: number;
    hashCount: number;
    hashTotalMs: number;
    hashMaxMs: number;
  }>();

  nodeRecords.forEach((record) => {
    const key = `${record.nodeId}:${record.nodeType}`;
    const existing = nodeStatsMap.get(key) ?? {
      nodeId: record.nodeId,
      nodeType: record.nodeType,
      count: 0,
      totalMs: 0,
      maxMs: 0,
      cachedCount: 0,
      skippedCount: 0,
      errorCount: 0,
      hashCount: 0,
      hashTotalMs: 0,
      hashMaxMs: 0,
    };
    existing.count += 1;
    if (record.status === 'cached') existing.cachedCount += 1;
    if (record.status === 'skipped') existing.skippedCount += 1;
    if (record.status === 'failed') existing.errorCount += 1;

    const finishedAt = record.finishedAt ?? record.completedAt ?? null;
    if (record.startedAt && finishedAt) {
      const duration = Math.max(
        0,
        new Date(finishedAt).getTime() - new Date(record.startedAt).getTime()
      );
      existing.totalMs += duration;
      existing.maxMs = Math.max(existing.maxMs, duration);
    }

    nodeStatsMap.set(key, existing);
  });

  const nodes = Array.from(nodeStatsMap.values()).map((item) => ({
    ...item,
    avgMs: item.count > 0 ? item.totalMs / item.count : 0,
    hashAvgMs: item.hashCount > 0 ? item.hashTotalMs / item.hashCount : 0,
  }));
  const hottestNodes = [...nodes]
    .sort((left, right) => right.totalMs - left.totalMs)
    .slice(0, RUNTIME_PROFILE_HIGHLIGHT_LIMIT);
  const durationMs = nodes.reduce((sum, item) => sum + item.totalMs, 0);

  return {
    runId,
    durationMs,
    iterationCount: 0,
    nodeCount: nodeStatsMap.size,
    edgeCount: 0,
    nodes,
    hottestNodes,
  };
};
