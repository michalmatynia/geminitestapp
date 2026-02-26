import type { CaseResolverWorkspace } from '@/shared/contracts/case-resolver';

import {
  CASE_RESOLVER_WORKSPACE_KEY,
  getCaseResolverWorkspaceNormalizationDiagnostics,
  normalizeCaseResolverWorkspace,
  parseCaseResolverWorkspace,
} from './settings';

const CASE_RESOLVER_WORKSPACE_DEBUG_EVENTS_KEY = '__caseResolverWorkspaceDebugEvents';
const CASE_RESOLVER_WORKSPACE_DEBUG_EVENT_NAME = 'case-resolver-workspace-debug';
const CASE_RESOLVER_WORKSPACE_DEBUG_LIMIT = 200;
const CASE_RESOLVER_WORKSPACE_MAX_PAYLOAD_BYTES_DEFAULT = 1_500_000;
const CASE_RESOLVER_CONFLICT_RETRY_BASE_DELAY_MS_DEFAULT = 150;
const CASE_RESOLVER_CONFLICT_RETRY_MAX_DELAY_MS_DEFAULT = 1_500;
const CASE_RESOLVER_CONFLICT_RETRY_JITTER_MS_DEFAULT = 120;
const CASE_RESOLVER_WORKSPACE_FETCH_TIMEOUT_MS_DEFAULT = 8_000;

const readPositiveIntegerEnv = (
  key: string,
  fallback: number
): number => {
  const value = process.env[key];
  if (!value) return fallback;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  const normalized = Math.floor(parsed);
  if (normalized <= 0) return fallback;
  return normalized;
};

const CASE_RESOLVER_WORKSPACE_MAX_PAYLOAD_BYTES = readPositiveIntegerEnv(
  'NEXT_PUBLIC_CASE_RESOLVER_WORKSPACE_MAX_PAYLOAD_BYTES',
  CASE_RESOLVER_WORKSPACE_MAX_PAYLOAD_BYTES_DEFAULT
);
const CASE_RESOLVER_WORKSPACE_FETCH_TIMEOUT_MS = readPositiveIntegerEnv(
  'NEXT_PUBLIC_CASE_RESOLVER_WORKSPACE_FETCH_TIMEOUT_MS',
  CASE_RESOLVER_WORKSPACE_FETCH_TIMEOUT_MS_DEFAULT
);

export type CaseResolverWorkspaceDebugEvent = {
  id: string;
  timestamp: string;
  source: string;
  action: string;
  message?: string | undefined;
  mutationId?: string | null | undefined;
  expectedRevision?: number | null | undefined;
  currentRevision?: number | null | undefined;
  workspaceRevision?: number | null | undefined;
  durationMs?: number | undefined;
  payloadBytes?: number | undefined;
};

type SettingsRecordLike = {
  key?: unknown;
  value?: unknown;
  conflict?: unknown;
  idempotent?: unknown;
  currentRevision?: unknown;
};

type WorkspaceMetadataLike = {
  key?: unknown;
  revision?: unknown;
  lastMutationId?: unknown;
  exists?: unknown;
};

type WorkspaceSettingsPayloadLike = {
  settings?: unknown;
  key?: unknown;
  value?: unknown;
};

type PersistWorkspaceInput = {
  workspace: CaseResolverWorkspace;
  expectedRevision: number;
  mutationId: string;
  source: string;
};

type PersistWorkspaceSuccess = {
  ok: true;
  workspace: CaseResolverWorkspace;
  idempotent: boolean;
};

type PersistWorkspaceConflict = {
  ok: false;
  conflict: true;
  workspace: CaseResolverWorkspace;
  expectedRevision: number;
  currentRevision: number;
};

type PersistWorkspaceFailure = {
  ok: false;
  conflict: false;
  error: string;
};

export type PersistCaseResolverWorkspaceResult =
  | PersistWorkspaceSuccess
  | PersistWorkspaceConflict
  | PersistWorkspaceFailure;

export type CaseResolverWorkspaceMetadata = {
  revision: number;
  lastMutationId: string | null;
  exists: boolean;
};

const readDebugBuffer = (): CaseResolverWorkspaceDebugEvent[] => {
  const scope = globalThis as typeof globalThis & {
    [CASE_RESOLVER_WORKSPACE_DEBUG_EVENTS_KEY]?: CaseResolverWorkspaceDebugEvent[];
  };
  if (!Array.isArray(scope[CASE_RESOLVER_WORKSPACE_DEBUG_EVENTS_KEY])) {
    scope[CASE_RESOLVER_WORKSPACE_DEBUG_EVENTS_KEY] = [];
  }
  return scope[CASE_RESOLVER_WORKSPACE_DEBUG_EVENTS_KEY] ?? [];
};

const writeDebugBuffer = (events: CaseResolverWorkspaceDebugEvent[]): void => {
  const scope = globalThis as typeof globalThis & {
    [CASE_RESOLVER_WORKSPACE_DEBUG_EVENTS_KEY]?: CaseResolverWorkspaceDebugEvent[];
  };
  scope[CASE_RESOLVER_WORKSPACE_DEBUG_EVENTS_KEY] = events;
};

const safeParseJson = <T>(value: string): T | null => {
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
};

const formatByteCount = (value: number): string => {
  if (!Number.isFinite(value) || value <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  let normalized = value;
  let unitIndex = 0;
  while (normalized >= 1024 && unitIndex < units.length - 1) {
    normalized /= 1024;
    unitIndex += 1;
  }
  const rounded = normalized >= 10 || unitIndex === 0
    ? normalized.toFixed(0)
    : normalized.toFixed(1);
  return `${rounded} ${units[unitIndex]}`;
};

export const getCaseResolverWorkspaceMaxPayloadBytes = (): number =>
  CASE_RESOLVER_WORKSPACE_MAX_PAYLOAD_BYTES;

export const isCaseResolverWorkspacePayloadTooLarge = (payloadBytes: number): boolean =>
  Number.isFinite(payloadBytes) &&
  payloadBytes > CASE_RESOLVER_WORKSPACE_MAX_PAYLOAD_BYTES;

export const computeCaseResolverConflictRetryDelayMs = (
  attempt: number,
  options?: {
    baseDelayMs?: number;
    maxDelayMs?: number;
    jitterMs?: number;
  }
): number => {
  const normalizedAttempt =
    Number.isFinite(attempt) && attempt > 0 ? Math.floor(attempt) : 1;
  const baseDelayMs =
    Number.isFinite(options?.baseDelayMs) && (options?.baseDelayMs ?? 0) > 0
      ? Math.floor(options?.baseDelayMs ?? 0)
      : CASE_RESOLVER_CONFLICT_RETRY_BASE_DELAY_MS_DEFAULT;
  const maxDelayMs =
    Number.isFinite(options?.maxDelayMs) && (options?.maxDelayMs ?? 0) > 0
      ? Math.max(baseDelayMs, Math.floor(options?.maxDelayMs ?? baseDelayMs))
      : CASE_RESOLVER_CONFLICT_RETRY_MAX_DELAY_MS_DEFAULT;
  const jitterMs =
    Number.isFinite(options?.jitterMs) && (options?.jitterMs ?? 0) >= 0
      ? Math.floor(options?.jitterMs ?? 0)
      : CASE_RESOLVER_CONFLICT_RETRY_JITTER_MS_DEFAULT;

  const exponentialDelay = Math.min(
    maxDelayMs,
    baseDelayMs * Math.pow(2, normalizedAttempt - 1)
  );
  const jitter = jitterMs > 0 ? Math.floor(Math.random() * (jitterMs + 1)) : 0;
  return exponentialDelay + jitter;
};

export const createCaseResolverWorkspaceMutationId = (prefix = 'case-resolver-workspace'): string => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}-${Date.now()}`;
};

export const getCaseResolverWorkspaceRevision = (
  workspace: { workspaceRevision?: unknown }
): number => {
  const candidate = workspace.workspaceRevision;
  if (typeof candidate !== 'number' || !Number.isFinite(candidate)) return 0;
  if (candidate <= 0) return 0;
  return Math.floor(candidate);
};

export const stampCaseResolverWorkspaceMutation = (
  workspace: CaseResolverWorkspace,
  input: {
    baseRevision: number;
    mutationId: string;
    timestamp?: string;
    normalizeWorkspace?: boolean;
  }
): CaseResolverWorkspace => {
  const baseWorkspace = input.normalizeWorkspace === false
    ? workspace
    : normalizeCaseResolverWorkspace(workspace);
  const baseRevision =
    typeof input.baseRevision === 'number' && Number.isFinite(input.baseRevision)
      ? Math.max(0, Math.floor(input.baseRevision))
      : 0;
  const nextRevision = Math.max(getCaseResolverWorkspaceRevision(baseWorkspace), baseRevision + 1);
  return {
    ...baseWorkspace,
    workspaceRevision: nextRevision,
    lastMutationId: input.mutationId.trim() || null,
    lastMutationAt: (input.timestamp ?? new Date().toISOString()).trim(),
  };
};

export const logCaseResolverWorkspaceEvent = (
  event: Omit<CaseResolverWorkspaceDebugEvent, 'id' | 'timestamp'>
): void => {
  const entry: CaseResolverWorkspaceDebugEvent = {
    id: createCaseResolverWorkspaceMutationId('workspace-debug'),
    timestamp: new Date().toISOString(),
    ...event,
  };
  const nextEvents = [...readDebugBuffer(), entry].slice(-CASE_RESOLVER_WORKSPACE_DEBUG_LIMIT);
  writeDebugBuffer(nextEvents);
  if (process.env['NODE_ENV'] !== 'production') {
    console.info('[case-resolver][workspace]', entry);
  }
  if (typeof window !== 'undefined') {
    // Defer notification so debug-panel state updates never run inside another component render.
    window.setTimeout(() => {
      window.dispatchEvent(new CustomEvent(CASE_RESOLVER_WORKSPACE_DEBUG_EVENT_NAME));
    }, 0);
  }
};

export const readCaseResolverWorkspaceDebugEvents = (): CaseResolverWorkspaceDebugEvent[] =>
  [...readDebugBuffer()];

export const getCaseResolverWorkspaceDebugEventName = (): string =>
  CASE_RESOLVER_WORKSPACE_DEBUG_EVENT_NAME;

const readWorkspaceFromSettingRecord = (record: SettingsRecordLike | null, fallback: string): CaseResolverWorkspace => {
  const rawValue = typeof record?.value === 'string' ? record.value : fallback;
  return parseCaseResolverWorkspace(rawValue);
};

const readSettingsRecordsFromPayload = (payload: unknown): SettingsRecordLike[] => {
  if (Array.isArray(payload)) {
    return payload.filter(
      (entry: unknown): entry is SettingsRecordLike =>
        Boolean(entry) && typeof entry === 'object',
    );
  }
  if (!payload || typeof payload !== 'object') return [];
  const payloadRecord = payload as WorkspaceSettingsPayloadLike;
  if (Array.isArray(payloadRecord.settings)) {
    return payloadRecord.settings.filter(
      (entry: unknown): entry is SettingsRecordLike =>
        Boolean(entry) && typeof entry === 'object',
    );
  }
  if (
    typeof payloadRecord.key === 'string' &&
    typeof payloadRecord.value === 'string'
  ) {
    return [payloadRecord as SettingsRecordLike];
  }
  return [];
};

const resolveWorkspaceRecordFromSettingsPayload = (
  payload: unknown,
): SettingsRecordLike | null => {
  const records = readSettingsRecordsFromPayload(payload);
  return (
    records.find(
      (entry: SettingsRecordLike): boolean =>
        entry?.key === CASE_RESOLVER_WORKSPACE_KEY &&
        typeof entry?.value === 'string',
    ) ?? null
  );
};

const fetchSettingsPayloadWithTimeout = async (input: {
  url: string;
  timeoutMs: number;
}): Promise<Response> => {
  const controller =
    typeof AbortController !== 'undefined' ? new AbortController() : null;
  const timeoutId = controller
    ? setTimeout((): void => {
      controller.abort();
    }, input.timeoutMs)
    : null;
  try {
    return await fetch(input.url, {
      method: 'GET',
      cache: 'no-store',
      ...(controller ? { signal: controller.signal } : {}),
    });
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  }
};

const readWorkspaceMetadata = (
  payload: WorkspaceMetadataLike | null
): CaseResolverWorkspaceMetadata => {
  const revisionRaw = payload?.revision;
  const revision =
    typeof revisionRaw === 'number' && Number.isFinite(revisionRaw) && revisionRaw > 0
      ? Math.floor(revisionRaw)
      : 0;
  const lastMutationIdRaw = payload?.lastMutationId;
  const lastMutationId =
    typeof lastMutationIdRaw === 'string' && lastMutationIdRaw.trim().length > 0
      ? lastMutationIdRaw
      : null;
  const exists = payload?.exists !== false;
  return {
    revision,
    lastMutationId,
    exists,
  };
};

export const fetchCaseResolverWorkspaceMetadata = async (
  source: string
): Promise<CaseResolverWorkspaceMetadata | null> => {
  const startedAt = Date.now();
  const controller =
    typeof AbortController !== 'undefined' ? new AbortController() : null;
  const timeoutId =
    controller
      ? setTimeout((): void => {
        controller.abort();
      }, CASE_RESOLVER_WORKSPACE_FETCH_TIMEOUT_MS)
      : null;
  try {
    const response = await fetch(
      `/api/settings?scope=light&fresh=1&key=${encodeURIComponent(CASE_RESOLVER_WORKSPACE_KEY)}&meta=1`,
      {
        method: 'GET',
        cache: 'no-store',
        ...(controller ? { signal: controller.signal } : {}),
      }
    );
    if (!response.ok) {
      logCaseResolverWorkspaceEvent({
        source,
        action: 'refresh_meta_failed',
        message: `Failed to fetch workspace metadata (${response.status}).`,
      });
      return null;
    }
    const payload = (await response.json()) as WorkspaceMetadataLike | null;
    const metadata = readWorkspaceMetadata(payload);
    logCaseResolverWorkspaceEvent({
      source,
      action: 'refresh_meta_success',
      workspaceRevision: metadata.revision,
      durationMs: Date.now() - startedAt,
    });
    return metadata;
  } catch (error: unknown) {
    logCaseResolverWorkspaceEvent({
      source,
      action: 'refresh_meta_failed',
      message: error instanceof Error ? error.message : 'Unknown metadata refresh error.',
      durationMs: Date.now() - startedAt,
    });
    return null;
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  }
};

export const fetchCaseResolverWorkspaceSnapshot = async (
  source: string
): Promise<CaseResolverWorkspace | null> => {
  const startedAt = Date.now();
  const attempts: Array<{ key: string; url: string }> = [
    {
      key: 'light_fresh_key',
      url: `/api/settings?scope=light&fresh=1&key=${encodeURIComponent(CASE_RESOLVER_WORKSPACE_KEY)}`,
    },
    {
      key: 'light_cached_key',
      url: `/api/settings?scope=light&key=${encodeURIComponent(CASE_RESOLVER_WORKSPACE_KEY)}`,
    },
    {
      key: 'all_cached_scope',
      url: '/api/settings?scope=all',
    },
    {
      key: 'all_fresh_scope',
      url: '/api/settings?scope=all&fresh=1',
    },
  ];

  let lastFailureMessage = 'Workspace snapshot request failed.';
  for (const attempt of attempts) {
    try {
      const response = await fetchSettingsPayloadWithTimeout({
        url: attempt.url,
        timeoutMs: CASE_RESOLVER_WORKSPACE_FETCH_TIMEOUT_MS,
      });
      if (!response.ok) {
        lastFailureMessage = `Attempt ${attempt.key} failed (${response.status}).`;
        logCaseResolverWorkspaceEvent({
          source,
          action: 'refresh_attempt_failed',
          durationMs: Date.now() - startedAt,
          message: lastFailureMessage,
        });
        continue;
      }
      const payload = (await response.json()) as unknown;
      const workspaceRecord = resolveWorkspaceRecordFromSettingsPayload(payload);
      if (!workspaceRecord) {
        lastFailureMessage = `Attempt ${attempt.key} returned no workspace record.`;
        logCaseResolverWorkspaceEvent({
          source,
          action: 'refresh_attempt_failed',
          durationMs: Date.now() - startedAt,
          message: lastFailureMessage,
        });
        continue;
      }
      const workspace = readWorkspaceFromSettingRecord(workspaceRecord, '');
      logCaseResolverWorkspaceEvent({
        source,
        action: 'refresh_success',
        workspaceRevision: getCaseResolverWorkspaceRevision(workspace),
        durationMs: Date.now() - startedAt,
        message: `attempt=${attempt.key}`,
      });
      return workspace;
    } catch (error: unknown) {
      lastFailureMessage =
        error instanceof Error ? error.message : `Unknown refresh error (${attempt.key}).`;
      logCaseResolverWorkspaceEvent({
        source,
        action: 'refresh_attempt_failed',
        durationMs: Date.now() - startedAt,
        message: `Attempt ${attempt.key} failed: ${lastFailureMessage}`,
      });
    }
  }

  logCaseResolverWorkspaceEvent({
    source,
    action: 'refresh_failed',
    message: lastFailureMessage,
    durationMs: Date.now() - startedAt,
  });
  return null;
};

/**
 * Strip re-derivable derived content fields before persisting to reduce payload size.
 * `documentContentMarkdown` and `documentContentPlainText` are always regenerated from
 * `documentContentHtml` by `createCaseResolverFile` on load, so storing them is redundant.
 * History entries are compacted the same way. Achieves ~30–50% size reduction for
 * text-heavy workspaces without any data loss.
 */
const compactWorkspaceForPersist = (
  workspace: CaseResolverWorkspace
): CaseResolverWorkspace => {
  if (!Array.isArray(workspace.files) || workspace.files.length === 0) {
    return workspace;
  }
  const compactedFiles = workspace.files.map((file): CaseResolverWorkspace['files'][number] => {
    const fileRecord = file as unknown as Record<string, unknown>;
    const rawHistory = fileRecord['documentHistory'];
    const compactedHistory = Array.isArray(rawHistory)
      ? rawHistory.map((entry: unknown) => {
        if (!entry || typeof entry !== 'object') return entry;
        const { documentContentMarkdown: _md, documentContentPlainText: _pt, ...rest } =
            entry as Record<string, unknown>;
        return rest;
      })
      : rawHistory;
    const { documentContentMarkdown: _fmd, documentContentPlainText: _fpt, ...fileRest } = file;
    return {
      ...fileRest,
      documentHistory: compactedHistory,
    } as CaseResolverWorkspace['files'][number];
  });
  return { ...workspace, files: compactedFiles };
};

export const persistCaseResolverWorkspaceSnapshot = async (
  input: PersistWorkspaceInput
): Promise<PersistCaseResolverWorkspaceResult> => {
  const startedAt = Date.now();
  const normalizedWorkspace = normalizeCaseResolverWorkspace(input.workspace);
  const normalizationDiagnostics =
    getCaseResolverWorkspaceNormalizationDiagnostics(normalizedWorkspace);
  logCaseResolverWorkspaceEvent({
    source: input.source,
    action: 'ownership_normalization',
    mutationId: input.mutationId,
    workspaceRevision: getCaseResolverWorkspaceRevision(normalizedWorkspace),
    message: [
      `ownership_repaired_count=${normalizationDiagnostics.ownershipRepairedCount}`,
      `ownership_unresolved_count=${normalizationDiagnostics.ownershipUnresolvedCount}`,
      `dropped_duplicate_count=${normalizationDiagnostics.droppedDuplicateCount}`,
    ].join(' '),
  });
  const workspaceForPersist = compactWorkspaceForPersist(normalizedWorkspace);
  const serializedWorkspace = JSON.stringify(workspaceForPersist);
  const payloadBytes = serializedWorkspace.length;
  logCaseResolverWorkspaceEvent({
    source: input.source,
    action: 'persist_attempt',
    mutationId: input.mutationId,
    expectedRevision: input.expectedRevision,
    workspaceRevision: getCaseResolverWorkspaceRevision(normalizedWorkspace),
    payloadBytes,
  });
  if (isCaseResolverWorkspacePayloadTooLarge(payloadBytes)) {
    const maxPayloadBytes = getCaseResolverWorkspaceMaxPayloadBytes();
    const message = [
      'Case Resolver workspace is too large to save safely.',
      `Payload: ${formatByteCount(payloadBytes)}.`,
      `Limit: ${formatByteCount(maxPayloadBytes)}.`,
      'Reduce content size or split work into smaller documents.',
    ].join(' ');
    logCaseResolverWorkspaceEvent({
      source: input.source,
      action: 'persist_rejected_payload_too_large',
      mutationId: input.mutationId,
      expectedRevision: input.expectedRevision,
      workspaceRevision: getCaseResolverWorkspaceRevision(normalizedWorkspace),
      payloadBytes,
      durationMs: Date.now() - startedAt,
      message,
    });
    return {
      ok: false,
      conflict: false,
      error: message,
    };
  }

  let response: Response;
  try {
    response = await fetch('/api/settings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        key: CASE_RESOLVER_WORKSPACE_KEY,
        value: serializedWorkspace,
        expectedRevision: input.expectedRevision,
        mutationId: input.mutationId,
      }),
    });
  } catch (error: unknown) {
    return {
      ok: false,
      conflict: false,
      error: error instanceof Error ? error.message : 'Failed to persist workspace.',
    };
  }

  const rawText = await response.text();
  const payload = rawText.trim().length > 0 ? safeParseJson<SettingsRecordLike>(rawText) : null;

  if (response.ok) {
    const nextWorkspace = readWorkspaceFromSettingRecord(payload, serializedWorkspace);
    logCaseResolverWorkspaceEvent({
      source: input.source,
      action: 'persist_success',
      mutationId: input.mutationId,
      expectedRevision: input.expectedRevision,
      workspaceRevision: getCaseResolverWorkspaceRevision(nextWorkspace),
      currentRevision: getCaseResolverWorkspaceRevision(nextWorkspace),
      payloadBytes,
      durationMs: Date.now() - startedAt,
      ...(payload?.idempotent === true ? { message: 'idempotent' } : {}),
    });
    return {
      ok: true,
      workspace: nextWorkspace,
      idempotent: payload?.idempotent === true,
    };
  }

  if (response.status === 409) {
    const currentWorkspace = readWorkspaceFromSettingRecord(payload, serializedWorkspace);
    const currentRevision = getCaseResolverWorkspaceRevision(currentWorkspace);
    logCaseResolverWorkspaceEvent({
      source: input.source,
      action: 'persist_conflict',
      mutationId: input.mutationId,
      expectedRevision: input.expectedRevision,
      currentRevision,
      workspaceRevision: getCaseResolverWorkspaceRevision(normalizedWorkspace),
      payloadBytes,
      durationMs: Date.now() - startedAt,
    });
    return {
      ok: false,
      conflict: true,
      workspace: currentWorkspace,
      expectedRevision: input.expectedRevision,
      currentRevision,
    };
  }

  const message =
    (payload && typeof payload.value === 'string' && payload.value.trim().length > 0
      ? payload.value
      : null) ??
    `Failed to persist Case Resolver workspace (${response.status}).`;
  logCaseResolverWorkspaceEvent({
    source: input.source,
    action: 'persist_failed',
    mutationId: input.mutationId,
    expectedRevision: input.expectedRevision,
    workspaceRevision: getCaseResolverWorkspaceRevision(normalizedWorkspace),
    payloadBytes,
    durationMs: Date.now() - startedAt,
    message,
  });
  return {
    ok: false,
    conflict: false,
    error: message,
  };
};
