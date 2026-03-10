import type { AiPathRunNodeRecord, AiPathRunRecord } from '@/shared/contracts/ai-paths';
import type { RuntimeHistoryEntry } from '@/shared/contracts/ai-paths-runtime';

import { 
  readRuntimeTraceSummary, 
  toDate, 
  asString, 
  formatNodeLabel, 
  resolveDurationMs, 
  readRuntimeHistoryEntries 
} from './normalization';

import type { 
  RuntimeTraceDurationRow 
} from './types';

export const buildFallbackDurationRowsFromHistory = (run: AiPathRunRecord): RuntimeTraceDurationRow[] => {
  const latestByNode = new Map<string, RuntimeHistoryEntry>();
  readRuntimeHistoryEntries(run).forEach((entry: RuntimeHistoryEntry) => {
    const current = latestByNode.get(entry.nodeId);
    const currentTime = current ? Date.parse(current.timestamp) : -Infinity;
    const nextTime = Date.parse(entry.timestamp);
    if (!current || nextTime >= currentTime) {
      latestByNode.set(entry.nodeId, entry);
    }
  });

  return Array.from(latestByNode.values())
    .sort((left, right) => Date.parse(left.timestamp) - Date.parse(right.timestamp))
    .map((entry) => ({
      id: entry.spanId ?? entry.nodeId,
      label: formatNodeLabel({
        nodeTitle: entry.nodeTitle ?? null,
        nodeId: entry.nodeId,
        nodeType: entry.nodeType ?? null,
        iteration: entry.iteration,
        attempt: entry.attempt ?? null,
      }),
      status: entry.status,
      durationMs: entry.durationMs ?? null,
      source: 'record' as const,
    }));
};

export const buildRuntimeDurationRows = (
  run: AiPathRunRecord,
  nodes: AiPathRunNodeRecord[] = []
): RuntimeTraceDurationRow[] => {
  const traceSummary = readRuntimeTraceSummary(run.meta ?? null);
  if (traceSummary && traceSummary.spans.length > 0) {
    return [...traceSummary.spans]
      .sort((left, right) => {
        const leftTime =
          toDate(left.startedAt)?.getTime() ?? toDate(left.finishedAt)?.getTime() ?? Infinity;
        const rightTime =
          toDate(right.startedAt)?.getTime() ?? toDate(right.finishedAt)?.getTime() ?? Infinity;
        return leftTime - rightTime;
      })
      .map((span, index) => ({
        id: span.spanId ?? `${span.nodeId ?? 'node'}:${index}`,
        label: formatNodeLabel({
          nodeTitle: span.nodeTitle,
          nodeId: span.nodeId,
          nodeType: span.nodeType,
          iteration: span.iteration,
          attempt: span.attempt,
        }),
        status: span.status,
        durationMs: span.durationMs,
        source: 'trace' as const,
      }));
  }

  if (nodes.length > 0) {
    return nodes.map((node) => ({
      id: node.id,
      label: formatNodeLabel({
        nodeTitle: node.nodeTitle ?? null,
        nodeId: node.nodeId,
        nodeType: node.nodeType ?? null,
      }),
      status: node.status,
      durationMs: resolveDurationMs(
        asString(node.startedAt),
        asString(node.finishedAt) ?? asString(node.completedAt)
      ),
      source: 'record' as const,
    }));
  }

  return buildFallbackDurationRowsFromHistory(run);
};
