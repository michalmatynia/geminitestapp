'use client';

import { aiPathRunRecordSchema, type AiPathRunRecord } from '@/shared/contracts/ai-paths';
import { getAiPathRun, streamAiPathRun } from '@/shared/lib/ai-paths/api/client';
import { parseAiPathRunErrorSummary } from '@/shared/lib/ai-paths/error-reporting';
import { logClientCatch } from '@/shared/utils/observability/client-error-logger';


const RUN_DETAIL_POLL_INTERVAL_MS = 5_000;
const RUN_DETAIL_TRANSIENT_RETRY_DELAY_MS = 5_000;
const RUN_DETAIL_REQUEST_TIMEOUT_MS = 60_000;
const MAX_RUN_DETAIL_POLL_FAILURES = 3;
const RUN_DETAIL_NOT_FOUND_GRACE_MS = 15_000;
// Stop tracking runs older than 10 minutes to prevent stale persisted runs from polling forever.
const MAX_RUN_TRACKING_AGE_MS = 10 * 60 * 1_000;

const TERMINAL_RUN_STATUSES = new Set<AiPathRunRecord['status']>([
  'completed',
  'failed',
  'canceled',
  'dead_lettered',
]);

const RUN_STATUS_ALIASES: Record<string, AiPathRunRecord['status']> = {
  queued: 'queued',
  queue: 'queued',
  running: 'running',
  blocked_on_lease: 'blocked_on_lease',
  blocked: 'blocked_on_lease',
  paused: 'paused',
  handoff_ready: 'handoff_ready',
  handoff: 'handoff_ready',
  completed: 'completed',
  complete: 'completed',
  success: 'completed',
  failed: 'failed',
  failure: 'failed',
  error: 'failed',
  canceled: 'canceled',
  cancelled: 'canceled',
  dead_lettered: 'dead_lettered',
  deadlettered: 'dead_lettered',
};

export type TrackedAiPathRunSnapshot = {
  runId: string;
  status: AiPathRunRecord['status'];
  updatedAt: string | null;
  finishedAt: string | null;
  errorMessage: string | null;
  entityId: string | null;
  entityType: string | null;
  run?: AiPathRunRecord | null;
  trackingState: 'active' | 'stopped';
};

export type SubscribeTrackedAiPathRunOptions = {
  initialSnapshot?: Partial<TrackedAiPathRunSnapshot> | undefined;
};

type TrackedAiPathRunListener = (snapshot: TrackedAiPathRunSnapshot) => void;

type TrackRecord = {
  runId: string;
  snapshot: TrackedAiPathRunSnapshot;
  listeners: Set<TrackedAiPathRunListener>;
  started: boolean;
  trackedAtMs: number;
  pollFailures: number;
  pollTimerId: ReturnType<typeof setTimeout> | null;
  eventSource: EventSource | null;
  removeStreamListeners: (() => void) | null;
};

const trackRecords = new Map<string, TrackRecord>();
let stopTrackingEnvironmentListeners: (() => void) | null = null;

const asTrimmedString = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const asIsoTimestamp = (value: unknown): string | null => {
  if (typeof value === 'string') {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
  }
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value.toISOString();
  }
  return null;
};

const normalizeRunStatus = (value: unknown): AiPathRunRecord['status'] | null => {
  const normalized = asTrimmedString(value)?.toLowerCase();
  if (!normalized) return null;
  return RUN_STATUS_ALIASES[normalized] ?? null;
};

const coerceAiPathRunRecord = (value: unknown): AiPathRunRecord | null => {
  const parsed = aiPathRunRecordSchema.safeParse(value);
  if (parsed.success) return parsed.data;
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;

  const raw = value as Record<string, unknown>;
  const id = asTrimmedString(raw['id']) ?? asTrimmedString(raw['_id']);
  const status = normalizeRunStatus(raw['status']);
  if (!id || !status) return null;

  const createdAt =
    asIsoTimestamp(raw['createdAt']) ??
    asIsoTimestamp(raw['startedAt']) ??
    asIsoTimestamp(raw['updatedAt']) ??
    new Date().toISOString();

  const candidate: Record<string, unknown> = {
    id,
    status,
    createdAt,
    updatedAt:
      asIsoTimestamp(raw['updatedAt']) ??
      asIsoTimestamp(raw['finishedAt']) ??
      asIsoTimestamp(raw['startedAt']) ??
      createdAt,
    startedAt: asIsoTimestamp(raw['startedAt']),
    finishedAt: asIsoTimestamp(raw['finishedAt']),
    errorMessage: asTrimmedString(raw['errorMessage']) ?? asTrimmedString(raw['error']),
    pathId: asTrimmedString(raw['pathId']),
    pathName: asTrimmedString(raw['pathName']),
    triggerEvent: asTrimmedString(raw['triggerEvent']),
    triggerNodeId: asTrimmedString(raw['triggerNodeId']),
    entityId: asTrimmedString(raw['entityId']),
    entityType: asTrimmedString(raw['entityType']),
    requestId: asTrimmedString(raw['requestId']),
    meta: raw['meta'],
    graph: raw['graph'],
    runtimeState: raw['runtimeState'],
    triggerContext: raw['triggerContext'],
  };

  const fallbackParsed = aiPathRunRecordSchema.safeParse(candidate);
  return fallbackParsed.success ? fallbackParsed.data : null;
};

const createInitialSnapshot = (
  runId: string,
  initial?: Partial<TrackedAiPathRunSnapshot> | undefined
): TrackedAiPathRunSnapshot => ({
  runId,
  status: initial?.status ?? 'queued',
  updatedAt: initial?.updatedAt ?? new Date().toISOString(),
  finishedAt: initial?.finishedAt ?? null,
  errorMessage: initial?.errorMessage ?? null,
  entityId: initial?.entityId ?? null,
  entityType: initial?.entityType ?? null,
  run: initial?.run ?? null,
  trackingState: initial?.trackingState ?? 'active',
});

const cloneSnapshot = (snapshot: TrackedAiPathRunSnapshot): TrackedAiPathRunSnapshot => ({
  ...snapshot,
});

const isTerminalStatus = (status: AiPathRunRecord['status']): boolean =>
  TERMINAL_RUN_STATUSES.has(status);

const shouldFinalizeTerminalSnapshotWithoutDetail = (
  snapshot: TrackedAiPathRunSnapshot
): boolean => {
  if (snapshot.status === 'completed' || snapshot.status === 'canceled') {
    return true;
  }
  if (
    (snapshot.status === 'failed' || snapshot.status === 'dead_lettered') &&
    typeof snapshot.errorMessage === 'string' &&
    snapshot.errorMessage.trim().length > 0
  ) {
    return true;
  }
  return false;
};

const isTransientRunDetailError = (message: string | null | undefined): boolean => {
  if (typeof message !== 'string') return false;
  return /\btimeout\b|failed to fetch|network request failed|connection|temporarily unavailable/i.test(
    message
  );
};

const isRunDetailNotFoundError = (message: string | null | undefined): boolean => {
  if (typeof message !== 'string') return false;
  return /\brun not found\b|\bnot found\b|status 404\b/i.test(message);
};

const shouldRetryMissingRunDetail = (
  record: TrackRecord,
  message: string | null | undefined
): boolean => {
  if (!isRunDetailNotFoundError(message)) return false;
  return Date.now() - record.trackedAtMs < RUN_DETAIL_NOT_FOUND_GRACE_MS;
};

export const isTrackedAiPathRunTerminal = (snapshot: TrackedAiPathRunSnapshot): boolean =>
  isTerminalStatus(snapshot.status);

const emitSnapshot = (record: TrackRecord): void => {
  const snapshot = cloneSnapshot(record.snapshot);
  record.listeners.forEach((listener: TrackedAiPathRunListener): void => {
    listener(snapshot);
  });
};

const isTrackingDocumentVisible = (): boolean => {
  if (typeof document === 'undefined') return true;
  return document.visibilityState === 'visible';
};

const isTrackingWindowFocused = (): boolean => {
  if (typeof document === 'undefined') return true;
  if (typeof document.hasFocus !== 'function') return true;
  return document.hasFocus();
};

const isTrackingEnvironmentActive = (): boolean =>
  isTrackingDocumentVisible() && isTrackingWindowFocused();

const clearPollTimer = (record: TrackRecord): void => {
  if (record.pollTimerId !== null) {
    clearTimeout(record.pollTimerId);
    record.pollTimerId = null;
  }
};

const teardownStream = (record: TrackRecord): void => {
  record.removeStreamListeners?.();
  record.removeStreamListeners = null;
  record.eventSource?.close();
  record.eventSource = null;
};

const schedulePoll = (record: TrackRecord, delayMs: number): void => {
  clearPollTimer(record);
  record.pollTimerId = setTimeout(() => {
    void pollRecord(record.runId);
  }, delayMs);
};

const cleanupRecord = (runId: string): void => {
  const record = trackRecords.get(runId);
  if (!record) return;
  clearPollTimer(record);
  teardownStream(record);
  record.started = false;
  trackRecords.delete(runId);
  if (trackRecords.size === 0) {
    stopTrackingEnvironmentListeners?.();
    stopTrackingEnvironmentListeners = null;
  }
};

const finalizeRecord = (
  record: TrackRecord,
  patch?: Partial<TrackedAiPathRunSnapshot> | undefined
): void => {
  clearPollTimer(record);
  teardownStream(record);
  record.started = false;
  record.snapshot = {
    ...record.snapshot,
    ...(patch ?? {}),
    trackingState: 'stopped',
  };
  emitSnapshot(record);
};

const updateRecordSnapshot = (
  record: TrackRecord,
  patch: Partial<TrackedAiPathRunSnapshot>
): void => {
  record.snapshot = {
    ...record.snapshot,
    ...patch,
    trackingState: 'active',
  };
  emitSnapshot(record);
};

const mergeInitialSnapshot = (
  current: TrackedAiPathRunSnapshot,
  initial?: Partial<TrackedAiPathRunSnapshot> | undefined
): TrackedAiPathRunSnapshot => {
  if (!initial) return current;
  return {
    ...current,
    ...(current.entityId ? {} : { entityId: initial.entityId ?? current.entityId }),
    ...(current.entityType ? {} : { entityType: initial.entityType ?? current.entityType }),
    ...(current.run ? {} : { run: initial.run ?? current.run }),
  };
};

const resolveSnapshotFromDetailPayload = (
  value: unknown,
  fallbackRunId: string,
  previous: TrackedAiPathRunSnapshot
): TrackedAiPathRunSnapshot | null => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const payload = value as {
    run?: unknown;
    errorSummary?: unknown;
  };
  const run = coerceAiPathRunRecord(payload.run);
  const runId = run?.id ?? previous.runId ?? fallbackRunId;
  if (!runId) return null;

  const errorSummary = parseAiPathRunErrorSummary(payload.errorSummary);
  const errorMessage =
    run?.errorMessage ??
    errorSummary?.primary?.userMessage ??
    errorSummary?.primary?.message ??
    null;
  const status = run?.status ?? previous.status ?? 'queued';

  return {
    runId,
    status,
    updatedAt: run?.updatedAt ?? previous.updatedAt ?? new Date().toISOString(),
    finishedAt: run?.finishedAt ?? previous.finishedAt ?? null,
    errorMessage: isTerminalStatus(status) ? errorMessage : null,
    entityId: run?.entityId ?? previous.entityId ?? null,
    entityType: run?.entityType ?? previous.entityType ?? null,
    run: run ?? previous.run ?? null,
    trackingState: previous.trackingState,
  };
};

const resolveSnapshotFromRunRecord = (
  run: AiPathRunRecord,
  previous: TrackedAiPathRunSnapshot
): TrackedAiPathRunSnapshot => ({
  runId: run.id,
  status: run.status,
  updatedAt: run.updatedAt ?? previous.updatedAt ?? new Date().toISOString(),
  finishedAt: run.finishedAt ?? previous.finishedAt ?? null,
  errorMessage: isTerminalStatus(run.status) ? (run.errorMessage ?? previous.errorMessage) : null,
  entityId: run.entityId ?? previous.entityId ?? null,
  entityType: run.entityType ?? previous.entityType ?? null,
  run,
  trackingState: previous.trackingState,
});

const parseMessageEventPayload = (event: MessageEvent): unknown => {
  const raw: unknown = event.data;
  if (typeof raw !== 'string') return raw;
  try {
    return JSON.parse(raw) as unknown;
  } catch (error) {
    logClientCatch(error, {
      source: 'client-run-tracker',
      action: 'parseMessageEventPayload',
      runEventType: event.type,
    });
    return raw;
  }
};

const syncTerminalDetail = async (
  record: TrackRecord,
  fallback: TrackedAiPathRunSnapshot
): Promise<void> => {
  const activeRecord = trackRecords.get(record.runId);
  if (activeRecord !== record) return;

  try {
    const response = await getAiPathRun(record.runId, {
      cache: 'no-store',
      timeoutMs: RUN_DETAIL_REQUEST_TIMEOUT_MS,
    });
    if (trackRecords.get(record.runId) !== record) return;
    if (!response.ok) {
      if (isTransientRunDetailError(response.error)) {
        finalizeRecord(record, fallback);
        return;
      }
      finalizeRecord(record, {
        ...fallback,
        errorMessage: fallback.errorMessage ?? response.error ?? null,
      });
      return;
    }
    const nextSnapshot = resolveSnapshotFromDetailPayload(response.data, record.runId, fallback);
    finalizeRecord(record, nextSnapshot ?? fallback);
  } catch (error) {
    logClientCatch(error, {
      source: 'client-run-tracker',
      action: 'syncTerminalDetail',
      runId: record.runId,
    });
    if (trackRecords.get(record.runId) !== record) return;
    if (isTransientRunDetailError(error instanceof Error ? error.message : null)) {
      finalizeRecord(record, fallback);
      return;
    }
    finalizeRecord(record, {
      ...fallback,
      errorMessage:
        fallback.errorMessage ??
        (error instanceof Error ? error.message : 'Failed to load AI Path run details.'),
    });
  }
};

const startPolling = (record: TrackRecord, delayMs = 0): void => {
  teardownStream(record);
  clearPollTimer(record);
  record.started = true;
  record.pollFailures = 0;
  record.pollTimerId = setTimeout(() => {
    void pollRecord(record.runId);
  }, delayMs);
};

const handlePollFailure = (record: TrackRecord, message: string): void => {
  record.pollFailures += 1;
  if (record.pollFailures >= MAX_RUN_DETAIL_POLL_FAILURES) {
    finalizeRecord(record, {
      errorMessage: record.snapshot.errorMessage ?? message,
    });
    return;
  }
  schedulePoll(record, RUN_DETAIL_POLL_INTERVAL_MS);
};

const pollRecord = async (runId: string): Promise<void> => {
  const record = trackRecords.get(runId);
  if (!record) return;

  // Stop polling runs that have been tracked too long — they likely stalled or
  // were persisted from a previous session and never reached a terminal state.
  if (Date.now() - record.trackedAtMs > MAX_RUN_TRACKING_AGE_MS) {
    finalizeRecord(record, { errorMessage: 'Run tracking timed out.' });
    return;
  }

  try {
    const response = await getAiPathRun(runId, {
      cache: 'no-store',
      timeoutMs: RUN_DETAIL_REQUEST_TIMEOUT_MS,
    });
    const activeRecord = trackRecords.get(runId);
    if (activeRecord !== record) return;
    if (!response.ok) {
      if (isTransientRunDetailError(response.error)) {
        schedulePoll(record, RUN_DETAIL_TRANSIENT_RETRY_DELAY_MS);
        return;
      }
      if (shouldRetryMissingRunDetail(record, response.error)) {
        schedulePoll(record, RUN_DETAIL_POLL_INTERVAL_MS);
        return;
      }
      handlePollFailure(record, response.error || 'Failed to load AI Path run details.');
      return;
    }
    const nextSnapshot = resolveSnapshotFromDetailPayload(response.data, runId, record.snapshot);
    if (!nextSnapshot) {
      handlePollFailure(record, 'Failed to parse AI Path run details.');
      return;
    }
    record.pollFailures = 0;
    if (isTerminalStatus(nextSnapshot.status)) {
      finalizeRecord(record, nextSnapshot);
      return;
    }
    updateRecordSnapshot(record, nextSnapshot);
    schedulePoll(record, RUN_DETAIL_POLL_INTERVAL_MS);
  } catch (error) {
    logClientCatch(error, {
      source: 'client-run-tracker',
      action: 'pollRecord',
      runId,
    });
    const activeRecord = trackRecords.get(runId);
    if (activeRecord !== record) return;
    const errorMessage = error instanceof Error ? error.message : null;
    if (isTransientRunDetailError(errorMessage)) {
      schedulePoll(record, RUN_DETAIL_TRANSIENT_RETRY_DELAY_MS);
      return;
    }
    if (shouldRetryMissingRunDetail(record, errorMessage)) {
      schedulePoll(record, RUN_DETAIL_POLL_INTERVAL_MS);
      return;
    }
    handlePollFailure(
      record,
      errorMessage ?? 'Failed to load AI Path run details.'
    );
  }
};

const startStreaming = (record: TrackRecord): void => {
  record.started = true;
  clearPollTimer(record);

  try {
    const eventSource = streamAiPathRun(record.runId);
    record.eventSource = eventSource;

    const handleRunEvent = (event: Event): void => {
      if (!(event instanceof MessageEvent)) return;
      const payload = parseMessageEventPayload(event);
      const run = coerceAiPathRunRecord(payload);
      if (!run) return;
      const nextSnapshot = resolveSnapshotFromRunRecord(run, record.snapshot);
      if (isTerminalStatus(nextSnapshot.status)) {
        if (shouldFinalizeTerminalSnapshotWithoutDetail(nextSnapshot)) {
          finalizeRecord(record, nextSnapshot);
          return;
        }
        void syncTerminalDetail(record, nextSnapshot);
        return;
      }
      updateRecordSnapshot(record, nextSnapshot);
    };

    const handleDoneEvent = (): void => {
      if (shouldFinalizeTerminalSnapshotWithoutDetail(record.snapshot)) {
        finalizeRecord(record, record.snapshot);
        return;
      }
      void syncTerminalDetail(record, record.snapshot);
    };

    const handleErrorEvent = (): void => {
      if (record.snapshot.trackingState === 'stopped') return;
      if (isTerminalStatus(record.snapshot.status)) {
        finalizeRecord(record, record.snapshot);
        return;
      }
      startPolling(record, 0);
    };

    eventSource.addEventListener('run', handleRunEvent);
    eventSource.addEventListener('done', handleDoneEvent);
    eventSource.addEventListener('error', handleErrorEvent);

    record.removeStreamListeners = (): void => {
      eventSource.removeEventListener('run', handleRunEvent);
      eventSource.removeEventListener('done', handleDoneEvent);
      eventSource.removeEventListener('error', handleErrorEvent);
    };
  } catch (error) {
    logClientCatch(error, {
      source: 'client-run-tracker',
      action: 'startStreaming',
      runId: record.runId,
    });
    startPolling(record, 0);
  }
};

const pauseRecord = (record: TrackRecord): void => {
  clearPollTimer(record);
  teardownStream(record);
  record.started = false;
};

const resumeRecord = (record: TrackRecord): void => {
  if (record.started || record.listeners.size === 0 || record.snapshot.trackingState === 'stopped') {
    return;
  }

  if (typeof window !== 'undefined' && typeof window.EventSource === 'function') {
    startStreaming(record);
    return;
  }

  startPolling(record, 0);
};

const syncTrackingEnvironmentState = (): void => {
  if (isTrackingEnvironmentActive()) {
    trackRecords.forEach((record: TrackRecord) => {
      resumeRecord(record);
    });
    return;
  }

  trackRecords.forEach((record: TrackRecord) => {
    pauseRecord(record);
  });
};

const ensureTrackingEnvironmentListeners = (): void => {
  if (stopTrackingEnvironmentListeners !== null) return;
  if (typeof window === 'undefined' || typeof document === 'undefined') return;

  const handleTrackingEnvironmentChange = (): void => {
    syncTrackingEnvironmentState();
  };

  document.addEventListener('visibilitychange', handleTrackingEnvironmentChange);
  window.addEventListener('focus', handleTrackingEnvironmentChange);
  window.addEventListener('blur', handleTrackingEnvironmentChange);

  stopTrackingEnvironmentListeners = (): void => {
    document.removeEventListener('visibilitychange', handleTrackingEnvironmentChange);
    window.removeEventListener('focus', handleTrackingEnvironmentChange);
    window.removeEventListener('blur', handleTrackingEnvironmentChange);
    stopTrackingEnvironmentListeners = null;
  };
};

const ensureRecord = (
  runId: string,
  initialSnapshot?: Partial<TrackedAiPathRunSnapshot> | undefined
): TrackRecord => {
  const existing = trackRecords.get(runId);
  if (existing) {
    existing.snapshot = mergeInitialSnapshot(existing.snapshot, initialSnapshot);
    return existing;
  }

  const record: TrackRecord = {
    runId,
    snapshot: createInitialSnapshot(runId, initialSnapshot),
    listeners: new Set<TrackedAiPathRunListener>(),
    started: false,
    trackedAtMs: Date.now(),
    pollFailures: 0,
    pollTimerId: null,
    eventSource: null,
    removeStreamListeners: null,
  };
  trackRecords.set(runId, record);
  return record;
};

export const subscribeToTrackedAiPathRun = (
  runId: string,
  listener: TrackedAiPathRunListener,
  options?: SubscribeTrackedAiPathRunOptions | undefined
): (() => void) => {
  const normalizedRunId = asTrimmedString(runId);
  if (!normalizedRunId) return () => {};

  const record = ensureRecord(normalizedRunId, options?.initialSnapshot);
  record.listeners.add(listener);
  listener(cloneSnapshot(record.snapshot));
  ensureTrackingEnvironmentListeners();

  if (
    !record.started &&
    record.snapshot.trackingState !== 'stopped' &&
    isTrackingEnvironmentActive()
  ) {
    if (typeof window !== 'undefined' && typeof window.EventSource === 'function') {
      startStreaming(record);
    } else {
      startPolling(record, 0);
    }
  }

  return () => {
    const activeRecord = trackRecords.get(normalizedRunId);
    if (!activeRecord) return;
    activeRecord.listeners.delete(listener);
    if (activeRecord.listeners.size === 0) {
      cleanupRecord(normalizedRunId);
    }
  };
};

export const readTrackedAiPathRunSnapshot = (
  runId: string
): TrackedAiPathRunSnapshot | null => {
  const normalizedRunId = asTrimmedString(runId);
  if (!normalizedRunId) return null;
  const record = trackRecords.get(normalizedRunId);
  return record ? cloneSnapshot(record.snapshot) : null;
};

export const __resetTrackedAiPathRunClientStateForTests = (): void => {
  Array.from(trackRecords.keys()).forEach((runId: string) => {
    cleanupRecord(runId);
  });
  stopTrackingEnvironmentListeners?.();
  stopTrackingEnvironmentListeners = null;
};
