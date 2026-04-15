import type { AiPathRunRecord } from '@/shared/contracts/ai-paths';
import type {
  RuntimeHistoryEntry,
  RuntimeTraceResumeMode,
  RuntimeTraceResumeDecision,
} from '@/shared/contracts/ai-paths-runtime';
import { formatRuntimeValue, stableStringify } from '@/shared/lib/ai-paths/core/utils';

import {
  type RunTraceComparison,
  type RunTraceComparisonRow,
  type RuntimeTraceSummary,
  type RunTracePayloadDiff,
  type HistoryPayloadSnapshot,
  type AggregatedRuntimeNode
} from './run-trace-types';
import { readRuntimeTraceSummary, readRuntimeHistoryEntries } from './run-trace-utils';

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const normalizePayloadForDiff = (
  value: unknown,
  compareByFields: boolean
): Record<string, unknown> => {
  if (value === null || value === undefined) return {};
  if (compareByFields) {
    return isRecord(value) ? value : {};
  }
  return { payload: value };
};

const buildPayloadDiff = (
  leftValue: unknown | null,
  rightValue: unknown | null,
  maxLines = 6
): RunTracePayloadDiff | null => {
  if (leftValue === null || leftValue === undefined) {
    if (rightValue === null || rightValue === undefined) return null;
  }
  const compareByFields =
    (leftValue === null || leftValue === undefined || isRecord(leftValue)) &&
    (rightValue === null || rightValue === undefined || isRecord(rightValue));
  const leftRecord = normalizePayloadForDiff(leftValue, compareByFields);
  const rightRecord = normalizePayloadForDiff(rightValue, compareByFields);
  const keys = Array.from(
    new Set([...Object.keys(leftRecord), ...Object.keys(rightRecord)])
  ).sort();
  const added: string[] = [];
  const removed: string[] = [];
  const changed: string[] = [];
  const same: string[] = [];
  const entries: RunTracePayloadDiff['entries'] = [];

  keys.forEach((key) => {
    const inLeft = key in leftRecord;
    const inRight = key in rightRecord;
    if (!inLeft && inRight) {
      added.push(key);
      entries.push({
        key,
        change: 'added',
        leftLabel: null,
        rightLabel: formatRuntimeValue(rightRecord[key]),
      });
      return;
    }
    if (inLeft && !inRight) {
      removed.push(key);
      entries.push({
        key,
        change: 'removed',
        leftLabel: formatRuntimeValue(leftRecord[key]),
        rightLabel: null,
      });
      return;
    }
    if (stableStringify(leftRecord[key]) !== stableStringify(rightRecord[key])) {
      changed.push(key);
      entries.push({
        key,
        change: 'changed',
        leftLabel: formatRuntimeValue(leftRecord[key]),
        rightLabel: formatRuntimeValue(rightRecord[key]),
      });
      return;
    }
    same.push(key);
    entries.push({
      key,
      change: 'same',
      leftLabel: formatRuntimeValue(leftRecord[key]),
      rightLabel: formatRuntimeValue(rightRecord[key]),
    });
  });

  const lines = [
    ...added.map((key) => `+ ${key}: ${formatRuntimeValue(rightRecord[key])}`),
    ...removed.map((key) => `- ${key}: ${formatRuntimeValue(leftRecord[key])}`),
    ...changed.map(
      (key) =>
        `~ ${key}: ${formatRuntimeValue(leftRecord[key])} -> ${formatRuntimeValue(
          rightRecord[key]
        )}`
    ),
  ].slice(0, maxLines);

  return {
    added,
    removed,
    changed,
    same,
    entries,
    lines,
    hasChanges: added.length > 0 || removed.length > 0 || changed.length > 0,
  };
};

const STATUS_SEVERITY: Record<string, number> = {
  completed: 0,
  cached: 0,
  success: 0,
  running: 1,
  queued: 1,
  pending: 1,
  processing: 1,
  waiting_callback: 2,
  blocked: 3,
  timeout: 4,
  failed: 5,
  error: 5,
  canceled: 5,
};

const getStatusSeverity = (status: string | null): number =>
  status ? (STATUS_SEVERITY[status.toLowerCase()] ?? 1) : 1;

const aggregateTraceNodes = (summary: RuntimeTraceSummary): AggregatedRuntimeNode[] => {
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

const toDate = (value: string | null): Date | null => {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const aggregateHistoryNodes = (run: AiPathRunRecord): AggregatedRuntimeNode[] => {
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

const buildHistoryPayloadIndex = (run: AiPathRunRecord): Map<string, HistoryPayloadSnapshot> => {
  const latestByNode = new Map<string, RuntimeHistoryEntry>();
  readRuntimeHistoryEntries(run).forEach((entry) => {
    const key = `${entry.nodeId}:${entry.nodeType ?? 'unknown'}`;
    const current = latestByNode.get(key);
    const currentTime = current ? Date.parse(current.timestamp) : -Infinity;
    const nextTime = Date.parse(entry.timestamp);
    if (!current || nextTime >= currentTime) {
      latestByNode.set(key, entry);
    }
  });

  return new Map(
    Array.from(latestByNode.entries()).map(([key, entry]) => [
      key,
      {
        spanId: entry.spanId ?? null,
        inputs: entry.inputs ?? null,
        outputs: entry.outputs ?? null,
      },
    ])
  );
};

const buildNodeAggregateIndex = (
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

export const runTraceComparisonRowHasResumeChange = (
  row: Pick<
    RunTraceComparisonRow,
    'leftResumeMode' | 'rightResumeMode' | 'leftResumeDecision' | 'rightResumeDecision'
  >
): boolean =>
  ((row.leftResumeMode ?? null) !== (row.rightResumeMode ?? null) &&
    (row.leftResumeMode !== null || row.rightResumeMode !== null)) ||
  ((row.leftResumeDecision ?? null) !== (row.rightResumeDecision ?? null) &&
    (row.leftResumeDecision !== null || row.rightResumeDecision !== null));

export const buildRunTraceComparison = (
  leftRun: AiPathRunRecord | null,
  rightRun: AiPathRunRecord | null
): RunTraceComparison | null => {
  if (!leftRun || !rightRun) return null;
  const leftSummary = readRuntimeTraceSummary(leftRun.meta ?? null);
  const rightSummary = readRuntimeTraceSummary(rightRun.meta ?? null);
  const leftAggregate = buildNodeAggregateIndex(leftRun);
  const rightAggregate = buildNodeAggregateIndex(rightRun);
  const leftHistoryPayloads = buildHistoryPayloadIndex(leftRun);
  const rightHistoryPayloads = buildHistoryPayloadIndex(rightRun);
  const dataSource =
    leftAggregate.dataSource === rightAggregate.dataSource
      ? leftAggregate.dataSource
      : leftAggregate.dataSource === 'none'
        ? rightAggregate.dataSource
        : rightAggregate.dataSource === 'none'
          ? leftAggregate.dataSource
          : 'mixed';

  const keys = new Set([...leftAggregate.index.keys(), ...rightAggregate.index.keys()]);
  const getResumeChangeScore = (row: {
    leftResumeMode: RuntimeTraceResumeMode | null;
    rightResumeMode: RuntimeTraceResumeMode | null;
    leftResumeDecision: RuntimeTraceResumeDecision | null;
    rightResumeDecision: RuntimeTraceResumeDecision | null;
  }): number => {
    let score = 0;
    if ((row.leftResumeMode ?? null) !== (row.rightResumeMode ?? null)) {
      score += 1;
    }
    if ((row.leftResumeDecision ?? null) !== (row.rightResumeDecision ?? null)) {
      score += 2;
    }
    return score;
  };
  const rows = Array.from(keys)
    .map((key): RunTraceComparisonRow => {
      const left = leftAggregate.index.get(key) ?? null;
      const right = rightAggregate.index.get(key) ?? null;
      const leftPayload = leftHistoryPayloads.get(key) ?? null;
      const rightPayload = rightHistoryPayloads.get(key) ?? null;
      const inputDiff = buildPayloadDiff(leftPayload?.inputs ?? null, rightPayload?.inputs ?? null);
      const outputDiff = buildPayloadDiff(
        leftPayload?.outputs ?? null,
        rightPayload?.outputs ?? null
      );
      const deltaMs =
        left && right && left.totalMs !== null && right.totalMs !== null
          ? right.totalMs - left.totalMs
          : null;
      let classification: RunTraceComparisonRow['classification'] = 'changed';
      if (!left && right) {
        classification = 'added';
      } else if (left && !right) {
        classification = 'removed';
      } else if (left && right) {
        const leftSeverity = getStatusSeverity(left.status);
        const rightSeverity = getStatusSeverity(right.status);
        if (rightSeverity > leftSeverity || (deltaMs !== null && deltaMs > 50)) {
          classification = 'regressed';
        } else if (rightSeverity < leftSeverity || (deltaMs !== null && deltaMs < -50)) {
          classification = 'improved';
        }
      }
      const resolved = right ?? left;
      return {
        key,
        nodeId: resolved?.nodeId ?? key,
        nodeType: resolved?.nodeType ?? null,
        nodeTitle: resolved?.nodeTitle ?? null,
        classification,
        leftStatus: left?.status ?? null,
        rightStatus: right?.status ?? null,
        leftTotalMs: left?.totalMs ?? null,
        rightTotalMs: right?.totalMs ?? null,
        deltaMs,
        leftSpanCount: left?.spanCount ?? 0,
        rightSpanCount: right?.spanCount ?? 0,
        leftResumeMode: left?.resumeMode ?? null,
        rightResumeMode: right?.resumeMode ?? null,
        leftResumeDecision: left?.resumeDecision ?? null,
        rightResumeDecision: right?.resumeDecision ?? null,
        leftHistorySpanId: leftPayload?.spanId ?? null,
        rightHistorySpanId: rightPayload?.spanId ?? null,
        leftInputs: leftPayload?.inputs ?? null,
        rightInputs: rightPayload?.inputs ?? null,
        leftOutputs: leftPayload?.outputs ?? null,
        rightOutputs: rightPayload?.outputs ?? null,
        inputDiff,
        outputDiff,
      };
    })
    .sort((left, right) => {
      const rank = (value: RunTraceComparisonRow['classification']): number => {
        if (value === 'regressed') return 0;
        if (value === 'added' || value === 'removed') return 1;
        if (value === 'changed') return 2;
        return 3;
      };
      const rankDiff = rank(left.classification) - rank(right.classification);
      if (rankDiff !== 0) return rankDiff;
      const leftResumeScore = getResumeChangeScore(left);
      const rightResumeScore = getResumeChangeScore(right);
      if (rightResumeScore !== leftResumeScore) {
        return rightResumeScore - leftResumeScore;
      }
      const leftDelta = Math.abs(left.deltaMs ?? 0);
      const rightDelta = Math.abs(right.deltaMs ?? 0);
      if (rightDelta !== leftDelta) return rightDelta - leftDelta;
      return left.nodeId.localeCompare(right.nodeId);
    });

  return {
    dataSource,
    leftSummary,
    rightSummary,
    durationDeltaMs:
      leftSummary?.durationMs !== null &&
      leftSummary?.durationMs !== undefined &&
      rightSummary?.durationMs !== null &&
      rightSummary?.durationMs !== undefined
        ? rightSummary.durationMs - leftSummary.durationMs
        : null,
    iterationDelta:
      leftSummary?.iterationCount !== null &&
      leftSummary?.iterationCount !== undefined &&
      rightSummary?.iterationCount !== null &&
      rightSummary?.iterationCount !== undefined
        ? rightSummary.iterationCount - leftSummary.iterationCount
        : null,
    spanDelta:
      leftSummary?.nodeSpanCount !== undefined && rightSummary?.nodeSpanCount !== undefined
        ? rightSummary.nodeSpanCount - leftSummary.nodeSpanCount
        : null,
    regressedCount: rows.filter((row) => row.classification === 'regressed').length,
    improvedCount: rows.filter((row) => row.classification === 'improved').length,
    addedCount: rows.filter((row) => row.classification === 'added').length,
    removedCount: rows.filter((row) => row.classification === 'removed').length,
    payloadChangedCount: rows.filter(
      (row) => row.inputDiff?.hasChanges || row.outputDiff?.hasChanges
    ).length,
    resumeModeChangeCount: rows.filter(
      (row) =>
        (row.leftResumeMode ?? null) !== (row.rightResumeMode ?? null) &&
        (row.leftResumeMode !== null || row.rightResumeMode !== null)
    ).length,
    resumeDecisionChangeCount: rows.filter(
      (row) =>
        (row.leftResumeDecision ?? null) !== (row.rightResumeDecision ?? null) &&
        (row.leftResumeDecision !== null || row.rightResumeDecision !== null)
    ).length,
    resumedNodeDelta:
      leftSummary && rightSummary
        ? rightSummary.resumeReuseCount +
            rightSummary.resumeReexecutionCount -
          (leftSummary.resumeReuseCount + leftSummary.resumeReexecutionCount)
        : null,
    reusedNodeDelta:
      leftSummary && rightSummary
        ? rightSummary.resumeReuseCount - leftSummary.resumeReuseCount
        : null,
    reexecutedNodeDelta:
      leftSummary && rightSummary
        ? rightSummary.resumeReexecutionCount - leftSummary.resumeReexecutionCount
        : null,
    rows,
  };
};
