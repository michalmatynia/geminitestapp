import type { AiPathRunRecord } from '@/shared/contracts/ai-paths';
import type { RuntimeHistoryEntry } from '@/shared/contracts/ai-paths-runtime';
import { 
  readRuntimeTraceSummary, 
  toDate, 
  readRuntimeHistoryEntries 
} from './normalization';
import type { 
  AggregatedRuntimeNode, 
  RuntimeTraceSummary 
} from './types';

export const aggregateTraceNodes = (summary: RuntimeTraceSummary): AggregatedRuntimeNode[] => {
  const buckets = new Map<
    string,
    AggregatedRuntimeNode & { durations: number[]; latestAt: number }
  >();
  summary.spans.forEach((span, index) => {
    const nodeId = span.nodeId ?? `unknown-${index}`;
    const key = `${nodeId}:${span.nodeType ?? 'unknown'}`;
    const existing = buckets.get(key) ?? {
      key,
      nodeId,
      nodeType: span.nodeType,
      nodeTitle: span.nodeTitle,
      status: span.status,
      totalMs: null,
      avgMs: null,
      maxMs: null,
      spanCount: 0,
      resumeMode: span.resumeMode,
      resumeDecision: span.resumeDecision,
      durations: [],
      latestAt: -Infinity,
    };
    existing.spanCount += 1;
    if (typeof span.durationMs === 'number') {
      existing.durations.push(span.durationMs);
    }
    const spanTime =
      toDate(span.finishedAt)?.getTime() ?? toDate(span.startedAt)?.getTime() ?? existing.latestAt;
    if (spanTime >= existing.latestAt) {
      existing.latestAt = spanTime;
      existing.status = span.status;
      existing.nodeTitle = span.nodeTitle ?? existing.nodeTitle;
      existing.resumeMode = span.resumeMode;
      existing.resumeDecision = span.resumeDecision;
    }
    buckets.set(key, existing);
  });

  return Array.from(buckets.values()).map((bucket) => {
    const totalMs =
      bucket.durations.length > 0 ? bucket.durations.reduce((sum, value) => sum + value, 0) : null;
    const maxMs = bucket.durations.length > 0 ? Math.max(...bucket.durations) : null;
    return {
      key: bucket.key,
      nodeId: bucket.nodeId,
      nodeType: bucket.nodeType,
      nodeTitle: bucket.nodeTitle,
      status: bucket.status,
      totalMs,
      avgMs: totalMs !== null ? totalMs / bucket.durations.length : null,
      maxMs,
      spanCount: bucket.spanCount,
      resumeMode: bucket.resumeMode,
      resumeDecision: bucket.resumeDecision,
    };
  });
};

export const aggregateHistoryNodes = (run: AiPathRunRecord): AggregatedRuntimeNode[] => {
  const latestByNode = new Map<string, RuntimeHistoryEntry>();
  readRuntimeHistoryEntries(run).forEach((entry) => {
    const current = latestByNode.get(entry.nodeId);
    const currentTime = current ? Date.parse(current.timestamp) : -Infinity;
    const nextTime = Date.parse(entry.timestamp);
    if (!current || nextTime >= currentTime) {
      latestByNode.set(entry.nodeId, entry);
    }
  });

  return Array.from(latestByNode.values()).map((entry) => ({
    key: `${entry.nodeId}:${entry.nodeType ?? 'unknown'}`,
    nodeId: entry.nodeId,
    nodeType: entry.nodeType ?? null,
    nodeTitle: entry.nodeTitle ?? null,
    status: entry.status ?? null,
    totalMs: entry.durationMs ?? null,
    avgMs: entry.durationMs ?? null,
    maxMs: entry.durationMs ?? null,
    spanCount: 1,
    resumeMode: entry.resumeMode ?? null,
    resumeDecision: entry.resumeDecision ?? null,
  }));
};

export const buildNodeAggregateIndex = (
  run: AiPathRunRecord
): { dataSource: 'trace' | 'history' | 'none'; index: Map<string, AggregatedRuntimeNode> } => {
  const traceSummary = readRuntimeTraceSummary(run.meta ?? null);
  if (traceSummary && traceSummary.spans.length > 0) {
    return {
      dataSource: 'trace',
      index: new Map(aggregateTraceNodes(traceSummary).map((entry) => [entry.key, entry])),
    };
  }
  const historyNodes = aggregateHistoryNodes(run);
  if (historyNodes.length > 0) {
    return {
      dataSource: 'history',
      index: new Map(historyNodes.map((entry) => [entry.key, entry])),
    };
  }
  return {
    dataSource: 'none',
    index: new Map(),
  };
};
