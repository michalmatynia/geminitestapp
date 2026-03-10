import type { AiPathRunRecord } from '@/shared/contracts/ai-paths';
import type {
  RuntimeHistoryEntry,
  RuntimeSideEffectDecision,
  RuntimeSideEffectPolicy,
  RuntimeTraceCacheDecision,
  RuntimeTraceResumeDecision,
  RuntimeTraceResumeMode,
  RuntimeTraceResumeReason,
} from '@/shared/contracts/ai-paths-runtime';
import { formatRuntimeValue, stableStringify } from '@/shared/lib/ai-paths';

import { resolveRunHistoryAction } from '../run-history-entry-actions';

import type { 
  RuntimeTraceSnapshot, 
  RuntimeTraceSpanSummary, 
  RuntimeTraceSummary, 
  RunTracePayloadDiff
} from './types';

export const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

export const asString = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

export const asNumber = (value: unknown): number | null =>
  typeof value === 'number' && Number.isFinite(value) ? value : null;

export const asCacheDecision = (value: unknown): RuntimeTraceCacheDecision | null => {
  const normalized = asString(value);
  if (
    normalized === 'miss' ||
    normalized === 'hit' ||
    normalized === 'refresh' ||
    normalized === 'disabled' ||
    normalized === 'seed'
  ) {
    return normalized;
  }
  return null;
};

export const asSideEffectPolicy = (value: unknown): RuntimeSideEffectPolicy | null => {
  const normalized = asString(value);
  if (normalized === 'per_run' || normalized === 'per_activation') {
    return normalized;
  }
  return null;
};

export const asSideEffectDecision = (value: unknown): RuntimeSideEffectDecision | null => {
  const normalized = asString(value);
  if (
    normalized === 'executed' ||
    normalized === 'skipped_duplicate' ||
    normalized === 'skipped_policy' ||
    normalized === 'skipped_missing_idempotency' ||
    normalized === 'failed'
  ) {
    return normalized;
  }
  return null;
};

export const asResumeMode = (value: unknown): RuntimeTraceResumeMode | null => {
  const normalized = asString(value);
  if (normalized === 'resume' || normalized === 'retry' || normalized === 'replay') {
    return normalized;
  }
  return null;
};

export const asResumeDecision = (value: unknown): RuntimeTraceResumeDecision | null => {
  const normalized = asString(value);
  if (normalized === 'reused' || normalized === 'reexecuted') {
    return normalized;
  }
  return null;
};

export const asResumeReason = (value: unknown): RuntimeTraceResumeReason | null => {
  const normalized = asString(value);
  if (
    normalized === 'completed_upstream' ||
    normalized === 'failed_node' ||
    normalized === 'downstream_of_failure' ||
    normalized === 'retry_target' ||
    normalized === 'downstream_of_retry' ||
    normalized === 'incomplete' ||
    normalized === 'replay_requested'
  ) {
    return normalized;
  }
  return null;
};

export const toDate = (value: string | null): Date | null => {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

export const resolveDurationMs = (startedAt: string | null, finishedAt: string | null): number | null => {
  if (!startedAt || !finishedAt) return null;
  const startMs = Date.parse(startedAt);
  const finishMs = Date.parse(finishedAt);
  if (!Number.isFinite(startMs) || !Number.isFinite(finishMs)) return null;
  return Math.max(0, finishMs - startMs);
};

export const normalizeRuntimeTraceSpan = (value: unknown): RuntimeTraceSpanSummary | null => {
  if (!isRecord(value)) return null;
  const startedAt = asString(value['startedAt']);
  const finishedAt = asString(value['finishedAt']);
  const durationMs = asNumber(value['durationMs']) ?? resolveDurationMs(startedAt, finishedAt);
  const cache = isRecord(value['cache']) ? value['cache'] : null;
  const effect = isRecord(value['effect']) ? value['effect'] : null;
  const resume = isRecord(value['resume']) ? value['resume'] : null;
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
    cacheDecision: asCacheDecision(cache?.['decision']),
    activationHash: asString(value['activationHash']),
    effectPolicy: asSideEffectPolicy(effect?.['policy']),
    effectDecision: asSideEffectDecision(effect?.['decision']),
    effectSourceSpanId: asString(effect?.['sourceSpanId']),
    resumeMode: asResumeMode(resume?.['mode']),
    resumeDecision: asResumeDecision(resume?.['decision']),
    resumeReason: asResumeReason(resume?.['reason']),
    resumeSourceTraceId: asString(resume?.['sourceTraceId']),
    resumeSourceSpanId: asString(resume?.['sourceSpanId']),
    resumeSourceStatus: asString(resume?.['sourceStatus']),
  };
};

export const readRuntimeTraceSnapshot = (meta: unknown): RuntimeTraceSnapshot | null => {
  if (!isRecord(meta)) return null;
  const runtimeTrace = meta['runtimeTrace'];
  if (!isRecord(runtimeTrace)) return null;
  return runtimeTrace as RuntimeTraceSnapshot;
};

export const collectTraceSpans = (snapshot: RuntimeTraceSnapshot): RuntimeTraceSpanSummary[] => {
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
    if (slowest?.durationMs === null || !slowest || current.durationMs > slowest.durationMs) {
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
    cachedSpanCount: spans.filter((span) => span.cached).length,
    seededSpanCount: spans.filter((span) => span.cacheDecision === 'seed').length,
    effectReplayCount: spans.filter((span) => span.effectDecision === 'skipped_duplicate').length,
    resumeReuseCount: spans.filter((span) => span.resumeDecision === 'reused').length,
    resumeReexecutionCount: spans.filter((span) => span.resumeDecision === 'reexecuted').length,
    hottestNode: profileSummary?.hottestNodes?.[0] ?? null,
    spans,
    slowestSpan,
  };
};

export const formatNodeLabel = (input: {
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

export const formatSpanDuration = (durationMs: number | null): string | null => {
  if (durationMs === null) return null;
  if (durationMs < 1000) return `${Math.round(durationMs)}ms`;
  const seconds = Math.round(durationMs / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remaining = seconds % 60;
  return `${minutes}m ${remaining}s`;
};

export const formatTraceSpanDetails = (span: RuntimeTraceSpanSummary): string[] => {
  const details: string[] = [];
  if (span.cacheDecision) {
    details.push(`cache=${span.cacheDecision}`);
  }
  if (span.effectDecision) {
    details.push(`effect=${span.effectDecision}`);
  }
  if (span.effectPolicy) {
    details.push(`policy=${span.effectPolicy}`);
  }
  if (span.effectSourceSpanId) {
    details.push(`sourceSpan=${span.effectSourceSpanId}`);
  }
  if (span.activationHash) {
    details.push(`activation=${span.activationHash}`);
  }
  if (span.resumeDecision) {
    details.push(`resume=${span.resumeDecision}`);
  }
  if (span.resumeMode) {
    details.push(`resumeMode=${span.resumeMode}`);
  }
  if (span.resumeReason) {
    details.push(`resumeReason=${span.resumeReason}`);
  }
  if (span.resumeSourceSpanId || span.resumeSourceTraceId) {
    details.push(`resumeSource=${span.resumeSourceSpanId ?? span.resumeSourceTraceId}`);
  }
  if (span.resumeSourceStatus) {
    details.push(`resumeStatus=${span.resumeSourceStatus}`);
  }
  return details;
};

export const formatTraceSpanActionExplanation = (span: RuntimeTraceSpanSummary): string | null => {
  const hasActionContext =
    span.resumeMode !== null ||
    span.resumeDecision !== null ||
    span.status === 'failed' ||
    span.status === 'blocked' ||
    span.status === 'waiting_callback';
  if (!hasActionContext) return null;
  return resolveRunHistoryAction({
    status: span.status,
    resumeMode: span.resumeMode,
    resumeDecision: span.resumeDecision,
  }).description;
};

export const readRuntimeHistoryEntries = (run: AiPathRunRecord): RuntimeHistoryEntry[] => {
  const history = (
    run.runtimeState as { history?: Record<string, RuntimeHistoryEntry[]> } | null | undefined
  )?.history;
  if (!history || typeof history !== 'object' || Array.isArray(history)) return [];
  return Object.values(history)
    .flatMap((entries: RuntimeHistoryEntry[] | undefined) =>
      Array.isArray(entries) ? entries : []
    )
    .filter((entry: RuntimeHistoryEntry | null | undefined): entry is RuntimeHistoryEntry =>
      Boolean(entry)
    );
};

export const normalizePayloadForDiff = (
  value: unknown,
  compareByFields: boolean
): Record<string, unknown> => {
  if (value === null || value === undefined) return {};
  if (compareByFields) {
    return isRecord(value) ? value : {};
  }
  return { payload: value };
};

export const buildPayloadDiff = (
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
