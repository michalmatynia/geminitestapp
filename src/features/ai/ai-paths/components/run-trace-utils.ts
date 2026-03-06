import { formatRuntimeValue, stableStringify } from '@/shared/lib/ai-paths';
import type { AiPathRunNodeRecord, AiPathRunRecord } from '@/shared/contracts/ai-paths';
import type { RuntimeHistoryEntry, RuntimeTraceRecord } from '@/shared/contracts/ai-paths-runtime';

type RuntimeTraceProfileSummary = {
  durationMs?: number | null;
  iterationCount?: number | null;
  nodeCount?: number | null;
  edgeCount?: number | null;
  hottestNodes?: Array<{
    nodeId?: string;
    nodeType?: string;
    avgMs?: number;
    totalMs?: number;
  }>;
} | null;

type RuntimeTraceSnapshot = Partial<RuntimeTraceRecord> & {
  profile?: {
    eventCount?: number;
    sampledEventCount?: number;
    droppedEventCount?: number;
    nodeSpans?: Array<{
      spanId?: string;
      nodeId?: string;
      nodeType?: string;
      nodeTitle?: string | null;
      status?: string;
      iteration?: number;
      attempt?: number;
      startedAt?: string | null;
      finishedAt?: string | null;
      durationMs?: number | null;
      error?: string | null;
      cached?: boolean;
    }>;
    summary?: RuntimeTraceProfileSummary;
  } | null;
};

export type RuntimeTraceSpanSummary = {
  spanId: string | null;
  nodeId: string | null;
  nodeType: string | null;
  nodeTitle: string | null;
  status: string | null;
  iteration: number | null;
  attempt: number | null;
  startedAt: string | null;
  finishedAt: string | null;
  durationMs: number | null;
  error: string | null;
  cached: boolean;
};

export type RuntimeTraceSummary = {
  snapshot: RuntimeTraceSnapshot;
  traceId: string | null;
  source: RuntimeTraceRecord['source'] | null;
  startedAt: string | null;
  finishedAt: string | null;
  profiledEventCount: number;
  droppedEventCount: number;
  engineEventCount: number;
  durationMs: number | null;
  iterationCount: number | null;
  nodeSpanCount: number;
  hottestNode:
    | {
        nodeId?: string;
        nodeType?: string;
        avgMs?: number;
        totalMs?: number;
      }
    | null;
  spans: RuntimeTraceSpanSummary[];
  slowestSpan: RuntimeTraceSpanSummary | null;
};

export type RuntimeTraceTimelineItem = {
  id: string;
  timestamp: Date;
  label: string;
  description?: string;
  status?: string | null;
  kind: 'run' | 'node';
  meta?: string;
  source: 'trace' | 'record';
};

export type RuntimeTraceDurationRow = {
  id: string;
  label: string;
  status?: string | null;
  durationMs: number | null;
  source: 'trace' | 'record';
};

export type RunTracePayloadDiff = {
  added: string[];
  removed: string[];
  changed: string[];
  same: string[];
  lines: string[];
  hasChanges: boolean;
};

type AggregatedRuntimeNode = {
  key: string;
  nodeId: string;
  nodeType: string | null;
  nodeTitle: string | null;
  status: string | null;
  totalMs: number | null;
  avgMs: number | null;
  maxMs: number | null;
  spanCount: number;
};

export type RunTraceComparisonRow = {
  key: string;
  nodeId: string;
  nodeType: string | null;
  nodeTitle: string | null;
  classification: 'regressed' | 'improved' | 'changed' | 'added' | 'removed';
  leftStatus: string | null;
  rightStatus: string | null;
  leftTotalMs: number | null;
  rightTotalMs: number | null;
  deltaMs: number | null;
  leftSpanCount: number;
  rightSpanCount: number;
  leftHistorySpanId: string | null;
  rightHistorySpanId: string | null;
  leftInputs: Record<string, unknown> | null;
  rightInputs: Record<string, unknown> | null;
  leftOutputs: Record<string, unknown> | null;
  rightOutputs: Record<string, unknown> | null;
  inputDiff: RunTracePayloadDiff | null;
  outputDiff: RunTracePayloadDiff | null;
};

export type RunTraceComparison = {
  dataSource: 'trace' | 'history' | 'mixed' | 'none';
  leftSummary: RuntimeTraceSummary | null;
  rightSummary: RuntimeTraceSummary | null;
  durationDeltaMs: number | null;
  iterationDelta: number | null;
  spanDelta: number | null;
  regressedCount: number;
  improvedCount: number;
  addedCount: number;
  removedCount: number;
  payloadChangedCount: number;
  rows: RunTraceComparisonRow[];
};

type HistoryPayloadSnapshot = {
  spanId: string | null;
  inputs: Record<string, unknown>;
  outputs: Record<string, unknown>;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const asString = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const asNumber = (value: unknown): number | null =>
  typeof value === 'number' && Number.isFinite(value) ? value : null;

const toDate = (value: string | null): Date | null => {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const resolveDurationMs = (startedAt: string | null, finishedAt: string | null): number | null => {
  if (!startedAt || !finishedAt) return null;
  const startMs = Date.parse(startedAt);
  const finishMs = Date.parse(finishedAt);
  if (!Number.isFinite(startMs) || !Number.isFinite(finishMs)) return null;
  return Math.max(0, finishMs - startMs);
};

const normalizeRuntimeTraceSpan = (value: unknown): RuntimeTraceSpanSummary | null => {
  if (!isRecord(value)) return null;
  const startedAt = asString(value['startedAt']);
  const finishedAt = asString(value['finishedAt']);
  const durationMs = asNumber(value['durationMs']) ?? resolveDurationMs(startedAt, finishedAt);
  const rawError = value['error'];
  const error =
    typeof rawError === 'string'
      ? rawError
      : isRecord(rawError)
        ? asString(rawError['message'])
        : null;
  const status = asString(value['status']);
  return {
    spanId: asString(value['spanId']),
    nodeId: asString(value['nodeId']),
    nodeType: asString(value['nodeType']),
    nodeTitle: asString(value['nodeTitle']),
    status,
    iteration: asNumber(value['iteration']),
    attempt: asNumber(value['attempt']),
    startedAt,
    finishedAt,
    durationMs,
    error,
    cached: value['cached'] === true || status === 'cached',
  };
};

const readRuntimeTraceSnapshot = (meta: unknown): RuntimeTraceSnapshot | null => {
  if (!isRecord(meta)) return null;
  const runtimeTrace = meta['runtimeTrace'];
  if (!isRecord(runtimeTrace)) return null;
  return runtimeTrace as RuntimeTraceSnapshot;
};

const collectTraceSpans = (snapshot: RuntimeTraceSnapshot): RuntimeTraceSpanSummary[] => {
  const v1Spans = Array.isArray(snapshot.spans)
    ? snapshot.spans
        .map((span: unknown) => normalizeRuntimeTraceSpan(span))
        .filter((span): span is RuntimeTraceSpanSummary => Boolean(span))
    : [];
  if (v1Spans.length > 0) {
    return v1Spans;
  }
  return Array.isArray(snapshot.profile?.nodeSpans)
    ? snapshot.profile.nodeSpans
        .map((span: unknown) => normalizeRuntimeTraceSpan(span))
        .filter((span): span is RuntimeTraceSpanSummary => Boolean(span))
    : [];
};

export const readRuntimeTraceSummary = (meta: unknown): RuntimeTraceSummary | null => {
  const snapshot = readRuntimeTraceSnapshot(meta);
  if (!snapshot) return null;

  const spans = collectTraceSpans(snapshot);
  const startedAt = asString(snapshot.startedAt);
  const finishedAt = asString(snapshot.finishedAt);
  const profileSummary = snapshot.profile?.summary ?? null;
  const durationMs =
    asNumber(profileSummary?.durationMs) ?? resolveDurationMs(startedAt, finishedAt);
  const iterationCount =
    asNumber(profileSummary?.iterationCount) ??
    spans.reduce<number | null>((maxIteration, span) => {
      if (span.iteration === null) return maxIteration;
      return maxIteration === null ? span.iteration : Math.max(maxIteration, span.iteration);
    }, null);
  const slowestSpan = spans.reduce<RuntimeTraceSpanSummary | null>((slowest, current) => {
    if (current.durationMs === null) return slowest;
    if (!slowest || slowest.durationMs === null || current.durationMs > slowest.durationMs) {
      return current;
    }
    return slowest;
  }, null);

  return {
    snapshot,
    traceId: asString(snapshot.traceId),
    source: snapshot.source === 'local' || snapshot.source === 'server' ? snapshot.source : null,
    startedAt,
    finishedAt,
    profiledEventCount: asNumber(snapshot.profile?.sampledEventCount) ?? 0,
    droppedEventCount: asNumber(snapshot.profile?.droppedEventCount) ?? 0,
    engineEventCount: asNumber(snapshot.profile?.eventCount) ?? 0,
    durationMs,
    iterationCount,
    nodeSpanCount: spans.length,
    hottestNode: profileSummary?.hottestNodes?.[0] ?? null,
    spans,
    slowestSpan,
  };
};

const formatNodeLabel = (input: {
  nodeTitle: string | null;
  nodeId: string | null;
  nodeType: string | null;
  iteration?: number | null;
  attempt?: number | null;
}): string => {
  const base = input.nodeTitle ?? input.nodeId ?? 'Node';
  const withType = input.nodeType ? `${base} (${input.nodeType})` : base;
  const suffix: string[] = [];
  if (typeof input.iteration === 'number') {
    suffix.push(`iter ${input.iteration}`);
  }
  if (typeof input.attempt === 'number') {
    suffix.push(`attempt ${input.attempt}`);
  }
  return suffix.length > 0 ? `${withType} · ${suffix.join(' · ')}` : withType;
};

const formatSpanDuration = (durationMs: number | null): string | null => {
  if (durationMs === null) return null;
  if (durationMs < 1000) return `${Math.round(durationMs)}ms`;
  const seconds = Math.round(durationMs / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remaining = seconds % 60;
  return `${minutes}m ${remaining}s`;
};

const readRuntimeHistoryEntries = (run: AiPathRunRecord): RuntimeHistoryEntry[] => {
  const history = (
    run.runtimeState as { history?: Record<string, RuntimeHistoryEntry[]> } | null | undefined
  )?.history;
  if (!history || typeof history !== 'object' || Array.isArray(history)) return [];
  return Object.values(history)
    .flatMap((entries: RuntimeHistoryEntry[] | undefined) => (Array.isArray(entries) ? entries : []))
    .filter((entry: RuntimeHistoryEntry | null | undefined): entry is RuntimeHistoryEntry => Boolean(entry));
};

const toRecord = (value: unknown): Record<string, unknown> => (isRecord(value) ? value : {});

const buildPayloadDiff = (
  leftValue: Record<string, unknown> | null,
  rightValue: Record<string, unknown> | null,
  maxLines = 6
): RunTracePayloadDiff | null => {
  if (!leftValue && !rightValue) return null;
  const leftRecord = leftValue ?? {};
  const rightRecord = rightValue ?? {};
  const keys = Array.from(new Set([...Object.keys(leftRecord), ...Object.keys(rightRecord)])).sort();
  const added: string[] = [];
  const removed: string[] = [];
  const changed: string[] = [];
  const same: string[] = [];

  keys.forEach((key) => {
    const inLeft = key in leftRecord;
    const inRight = key in rightRecord;
    if (!inLeft && inRight) {
      added.push(key);
      return;
    }
    if (inLeft && !inRight) {
      removed.push(key);
      return;
    }
    if (stableStringify(leftRecord[key]) !== stableStringify(rightRecord[key])) {
      changed.push(key);
      return;
    }
    same.push(key);
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
    lines,
    hasChanges: added.length > 0 || removed.length > 0 || changed.length > 0,
  };
};

const buildFallbackDurationRowsFromHistory = (run: AiPathRunRecord): RuntimeTraceDurationRow[] => {
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

export const buildRuntimeTimelineItems = (
  run: AiPathRunRecord,
  nodes: AiPathRunNodeRecord[] = []
): RuntimeTraceTimelineItem[] => {
  const items: RuntimeTraceTimelineItem[] = [];
  const queuedAt = toDate(asString(run.createdAt));
  if (queuedAt) {
    items.push({
      id: `run-created-${run.id}`,
      timestamp: queuedAt,
      label: 'Run queued',
      description: run.pathName ?? run.pathId ?? 'AI Path',
      status: 'queued',
      kind: 'run',
      source: 'record',
    });
  }

  const startedAt = toDate(asString(run.startedAt));
  if (startedAt) {
    items.push({
      id: `run-started-${run.id}`,
      timestamp: startedAt,
      label: 'Run started',
      description: run.pathName ?? run.pathId ?? 'AI Path',
      status: 'running',
      kind: 'run',
      source: 'record',
    });
  }

  const traceSummary = readRuntimeTraceSummary(run.meta ?? null);
  if (traceSummary && traceSummary.spans.length > 0) {
    traceSummary.spans.forEach((span, index) => {
      const spanLabel = formatNodeLabel({
        nodeTitle: span.nodeTitle,
        nodeId: span.nodeId,
        nodeType: span.nodeType,
        iteration: span.iteration,
        attempt: span.attempt,
      });
      const spanStartedAt = toDate(span.startedAt);
      if (spanStartedAt) {
        items.push({
          id: `trace-span-start-${span.spanId ?? index}`,
          timestamp: spanStartedAt,
          label: 'Node started',
          description: spanLabel,
          status: 'running',
          kind: 'node',
          source: 'trace',
        });
      }
      const spanFinishedAt = toDate(span.finishedAt);
      if (spanFinishedAt) {
        const durationLabel = formatSpanDuration(span.durationMs);
        items.push({
          id: `trace-span-finish-${span.spanId ?? index}`,
          timestamp: spanFinishedAt,
          label: `Node ${span.status ?? 'finished'}`,
          description: durationLabel ? `${spanLabel} · ${durationLabel}` : spanLabel,
          status: span.status,
          kind: 'node',
          meta: span.error ?? undefined,
          source: 'trace',
        });
      }
    });
  } else {
    nodes.forEach((node) => {
      const nodeLabel = formatNodeLabel({
        nodeTitle: node.nodeTitle ?? null,
        nodeId: node.nodeId,
        nodeType: node.nodeType ?? null,
      });
      const nodeStartedAt = toDate(asString(node.startedAt));
      if (nodeStartedAt) {
        items.push({
          id: `node-start-${node.id}`,
          timestamp: nodeStartedAt,
          label: 'Node started',
          description: nodeLabel,
          status: 'running',
          kind: 'node',
          source: 'record',
        });
      }
      const nodeFinishedAt = toDate(asString(node.finishedAt) ?? asString(node.completedAt));
      if (nodeFinishedAt) {
        const durationLabel = formatSpanDuration(
          resolveDurationMs(asString(node.startedAt), asString(node.finishedAt))
        );
        items.push({
          id: `node-finish-${node.id}`,
          timestamp: nodeFinishedAt,
          label: `Node ${node.status}`,
          description: durationLabel ? `${nodeLabel} · ${durationLabel}` : nodeLabel,
          status: node.status,
          kind: 'node',
          meta: asString(node.errorMessage) ?? undefined,
          source: 'record',
        });
      }
    });
  }

  const finishedAt = toDate(asString(run.finishedAt));
  if (finishedAt) {
    items.push({
      id: `run-finished-${run.id}`,
      timestamp: finishedAt,
      label: `Run ${run.status}`,
      description: run.pathName ?? run.pathId ?? 'AI Path',
      status: run.status,
      kind: 'run',
      meta: asString(run.errorMessage) ?? undefined,
      source: 'record',
    });
  }

  return items
    .filter((item) => Number.isFinite(item.timestamp.getTime()))
    .sort((left, right) => left.timestamp.getTime() - right.timestamp.getTime());
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
  const buckets = new Map<string, AggregatedRuntimeNode & { durations: number[]; latestAt: number }>();
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
    }
    buckets.set(key, existing);
  });

  return Array.from(buckets.values()).map((bucket) => {
    const totalMs =
      bucket.durations.length > 0
        ? bucket.durations.reduce((sum, value) => sum + value, 0)
        : null;
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
    };
  });
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
        inputs: toRecord(entry.inputs),
        outputs: toRecord(entry.outputs),
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
    rows,
  };
};
