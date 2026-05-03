import type {
  RuntimeTraceRecord,
  RuntimeTraceCacheDecision,
  RuntimeSideEffectPolicy,
  RuntimeSideEffectDecision,
} from '@/shared/contracts/ai-paths-runtime';

export type RuntimeTraceProfileSummary = {
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

export type RuntimeTraceSnapshot = Partial<RuntimeTraceRecord> & {
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
  cacheDecision: RuntimeTraceCacheDecision | null;
  activationHash: string | null;
  effectPolicy: RuntimeSideEffectPolicy | null;
  effectDecision: RuntimeSideEffectDecision | null;
  effectSourceSpanId: string | null;
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
  cachedSpanCount: number;
  seededSpanCount: number;
  effectReplayCount: number;
  hottestNode: {
    nodeId?: string;
    nodeType?: string;
    avgMs?: number;
    totalMs?: number;
  } | null;
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
  details?: string[];
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
  entries: Array<{
    key: string;
    change: 'added' | 'removed' | 'changed' | 'same';
    leftLabel: string | null;
    rightLabel: string | null;
  }>;
  lines: string[];
  hasChanges: boolean;
};

export type AggregatedRuntimeNode = {
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
  leftInputs: unknown | null;
  rightInputs: unknown | null;
  leftOutputs: unknown | null;
  rightOutputs: unknown | null;
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

export type HistoryPayloadSnapshot = {
  spanId: string | null;
  inputs: unknown;
  outputs: unknown;
};
