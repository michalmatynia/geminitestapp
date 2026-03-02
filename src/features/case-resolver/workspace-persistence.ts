import type {
  CaseResolverWorkspace,
  CaseResolverWorkspaceMetadata,
  PersistCaseResolverWorkspaceResult,
  PersistCaseResolverWorkspaceSuccess as _PersistCaseResolverWorkspaceSuccess,
  PersistCaseResolverWorkspaceConflict as _PersistCaseResolverWorkspaceConflict,
  PersistCaseResolverWorkspaceFailure as _PersistCaseResolverWorkspaceFailure,
} from '@/shared/contracts/case-resolver';

import {
  CASE_RESOLVER_WORKSPACE_KEY,
  getCaseResolverWorkspaceNormalizationDiagnostics,
  normalizeCaseResolverWorkspace,
  parseCaseResolverWorkspace,
} from './settings';

import { logSystemEvent } from '@/shared/lib/observability/system-logger';

const CASE_RESOLVER_WORKSPACE_DEBUG_EVENTS_KEY = '__caseResolverWorkspaceDebugEvents';
const CASE_RESOLVER_WORKSPACE_DEBUG_EVENT_NAME = 'case-resolver-workspace-debug';
const CASE_RESOLVER_WORKSPACE_DEBUG_LIMIT = 200;
const CASE_RESOLVER_WORKSPACE_NAVIGATION_CACHE_KEY = '__caseResolverWorkspaceNavigationCache';
const CASE_RESOLVER_WORKSPACE_NAVIGATION_CACHE_TTL_MS = 2 * 60 * 1000;
const CASE_RESOLVER_WORKSPACE_MAX_PAYLOAD_BYTES_DEFAULT = 1_500_000;
const CASE_RESOLVER_CONFLICT_RETRY_BASE_DELAY_MS_DEFAULT = 150;
const CASE_RESOLVER_CONFLICT_RETRY_MAX_DELAY_MS_DEFAULT = 1_500;
const CASE_RESOLVER_CONFLICT_RETRY_JITTER_MS_DEFAULT = 120;
const CASE_RESOLVER_WORKSPACE_FETCH_TIMEOUT_MS_DEFAULT = 8_000;

const readPositiveIntegerEnv = (key: string, fallback: number): number => {
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

export type CaseResolverWorkspaceFetchAttemptProfile = 'default' | 'context_fast';

export type CaseResolverWorkspaceRecordFetchResult =
  | {
      status: 'resolved';
      workspace: CaseResolverWorkspace;
      attemptKey: string;
      scope: 'light' | 'heavy';
      durationMs: number;
    }
  | {
      status: 'missing_required_file';
      attemptKey: string | null;
      durationMs: number;
      message: string;
    }
  | {
      status: 'unavailable';
      reason: 'no_workspace_record' | 'transport_error' | 'budget_exhausted';
      durationMs: number;
      message: string;
    };

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

type CaseResolverWorkspaceNavigationCache = {
  workspace: CaseResolverWorkspace;
  cachedAtMs: number;
};

type PersistWorkspaceInput = {
  workspace: CaseResolverWorkspace;
  expectedRevision: number;
  mutationId: string;
  source: string;
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

const readNavigationCache = (): CaseResolverWorkspaceNavigationCache | null => {
  const scope = globalThis as typeof globalThis & {
    [CASE_RESOLVER_WORKSPACE_NAVIGATION_CACHE_KEY]?: CaseResolverWorkspaceNavigationCache;
  };
  const cache = scope[CASE_RESOLVER_WORKSPACE_NAVIGATION_CACHE_KEY];
  if (!cache || typeof cache !== 'object') return null;
  if (
    !cache.workspace ||
    typeof cache.cachedAtMs !== 'number' ||
    !Number.isFinite(cache.cachedAtMs)
  ) {
    return null;
  }
  if (Date.now() - cache.cachedAtMs > CASE_RESOLVER_WORKSPACE_NAVIGATION_CACHE_TTL_MS) {
    return null;
  }
  return cache;
};

export const primeCaseResolverNavigationWorkspace = (workspace: CaseResolverWorkspace): void => {
  const scope = globalThis as typeof globalThis & {
    [CASE_RESOLVER_WORKSPACE_NAVIGATION_CACHE_KEY]?: CaseResolverWorkspaceNavigationCache;
  };
  scope[CASE_RESOLVER_WORKSPACE_NAVIGATION_CACHE_KEY] = {
    workspace,
    cachedAtMs: Date.now(),
  };
};

export const readCaseResolverNavigationWorkspace = (): CaseResolverWorkspace | null => {
  const cache = readNavigationCache();
  return cache?.workspace ?? null;
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
  const rounded =
    normalized >= 10 || unitIndex === 0 ? normalized.toFixed(0) : normalized.toFixed(1);
  return `${rounded} ${units[unitIndex]}`;
};

export const getCaseResolverWorkspaceMaxPayloadBytes = (): number =>
  CASE_RESOLVER_WORKSPACE_MAX_PAYLOAD_BYTES;

export const isCaseResolverWorkspacePayloadTooLarge = (payloadBytes: number): boolean =>
  Number.isFinite(payloadBytes) && payloadBytes > CASE_RESOLVER_WORKSPACE_MAX_PAYLOAD_BYTES;

export const computeCaseResolverConflictRetryDelayMs = (
  attempt: number,
  options?: {
    baseDelayMs?: number;
    maxDelayMs?: number;
    jitterMs?: number;
  }
): number => {
  const normalizedAttempt = Number.isFinite(attempt) && attempt > 0 ? Math.floor(attempt) : 1;
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

  const exponentialDelay = Math.min(maxDelayMs, baseDelayMs * Math.pow(2, normalizedAttempt - 1));
  const jitter = jitterMs > 0 ? Math.floor(Math.random() * (jitterMs + 1)) : 0;
  return exponentialDelay + jitter;
};

export const createCaseResolverWorkspaceMutationId = (
  prefix = 'case-resolver-workspace'
): string => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}-${Date.now()}`;
};

export const getCaseResolverWorkspaceRevision = (workspace: {
  workspaceRevision?: unknown;
}): number => {
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
  const baseWorkspace =
    input.normalizeWorkspace === false ? workspace : normalizeCaseResolverWorkspace(workspace);
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
    void logSystemEvent({
      level: 'info',
      message: '[case-resolver][workspace] persistence successful',
      source: 'case-resolver-persistence',
      context: entry,
    });
  }
  if (typeof window !== 'undefined') {
    // Defer notification so debug-panel state updates never run inside another component render.
    window.setTimeout(() => {
      window.dispatchEvent(new CustomEvent(CASE_RESOLVER_WORKSPACE_DEBUG_EVENT_NAME));
    }, 0);
  }
};

export const readCaseResolverWorkspaceDebugEvents = (): CaseResolverWorkspaceDebugEvent[] => [
  ...readDebugBuffer(),
];

export const getCaseResolverWorkspaceDebugEventName = (): string =>
  CASE_RESOLVER_WORKSPACE_DEBUG_EVENT_NAME;

const readWorkspaceFromSettingRecord = (
  record: SettingsRecordLike | null,
  fallback: string
): CaseResolverWorkspace => {
  const rawValue = typeof record?.value === 'string' ? record.value : fallback;
  return parseCaseResolverWorkspace(rawValue);
};

const readSettingsRecordsFromPayload = (payload: unknown): SettingsRecordLike[] => {
  if (Array.isArray(payload)) {
    return payload.filter(
      (entry: unknown): entry is SettingsRecordLike => Boolean(entry) && typeof entry === 'object'
    );
  }
  if (!payload || typeof payload !== 'object') return [];
  const payloadRecord = payload as WorkspaceSettingsPayloadLike;
  if (Array.isArray(payloadRecord.settings)) {
    return payloadRecord.settings.filter(
      (entry: unknown): entry is SettingsRecordLike => Boolean(entry) && typeof entry === 'object'
    );
  }
  if (typeof payloadRecord.key === 'string' && typeof payloadRecord.value === 'string') {
    return [payloadRecord as SettingsRecordLike];
  }
  return [];
};

const resolveWorkspaceRecordFromSettingsPayload = (payload: unknown): SettingsRecordLike | null => {
  const records = readSettingsRecordsFromPayload(payload);
  return (
    records.find(
      (entry: SettingsRecordLike): boolean =>
        entry?.key === CASE_RESOLVER_WORKSPACE_KEY && typeof entry?.value === 'string'
    ) ?? null
  );
};

const fetchSettingsPayloadWithTimeout = async (input: {
  url: string;
  timeoutMs: number;
}): Promise<Response> => {
  const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
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
  const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
  const timeoutId = controller
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

export const fetchCaseResolverWorkspaceRecord = async (
  source: string,
  options?: {
    fresh?: boolean;
    strategy?: 'light_then_heavy' | 'light_only' | 'heavy_only';
    requiredFileId?: string | null;
    attemptProfile?: CaseResolverWorkspaceFetchAttemptProfile;
    maxTotalMs?: number;
    attemptTimeoutMs?: number;
  }
): Promise<CaseResolverWorkspace | null> => {
  const result = await fetchCaseResolverWorkspaceRecordDetailed(source, options);
  return result.status === 'resolved' ? result.workspace : null;
};

const buildWorkspaceRecordFetchAttempts = ({
  strategy,
  fresh,
  attemptProfile,
}: {
  strategy: 'light_then_heavy' | 'light_only' | 'heavy_only';
  fresh: boolean;
  attemptProfile: CaseResolverWorkspaceFetchAttemptProfile;
}): Array<{ key: string; url: string; scope: 'light' | 'heavy' }> => {
  const attemptScopes: Array<'light' | 'heavy'> =
    strategy === 'heavy_only' ? ['heavy'] : strategy === 'light_only' ? ['light'] : ['light', 'heavy'];
  if (!fresh) {
    return attemptScopes.map((scope) => ({
      key: `${scope}_cached_key`,
      scope,
      url: `/api/settings?scope=${scope}&key=${encodeURIComponent(CASE_RESOLVER_WORKSPACE_KEY)}`,
    }));
  }

  if (attemptProfile === 'context_fast' && strategy === 'light_then_heavy') {
    return [
      {
        key: 'light_fresh_key',
        scope: 'light',
        url: `/api/settings?scope=light&fresh=1&key=${encodeURIComponent(CASE_RESOLVER_WORKSPACE_KEY)}`,
      },
      {
        key: 'heavy_fresh_key',
        scope: 'heavy',
        url: `/api/settings?scope=heavy&fresh=1&key=${encodeURIComponent(CASE_RESOLVER_WORKSPACE_KEY)}`,
      },
      {
        key: 'light_cached_key',
        scope: 'light',
        url: `/api/settings?scope=light&key=${encodeURIComponent(CASE_RESOLVER_WORKSPACE_KEY)}`,
      },
      {
        key: 'heavy_cached_key',
        scope: 'heavy',
        url: `/api/settings?scope=heavy&key=${encodeURIComponent(CASE_RESOLVER_WORKSPACE_KEY)}`,
      },
    ];
  }

  const attempts: Array<{ key: string; url: string; scope: 'light' | 'heavy' }> = [];
  attemptScopes.forEach((scope): void => {
    attempts.push(
      {
        key: `${scope}_fresh_key`,
        scope,
        url: `/api/settings?scope=${scope}&fresh=1&key=${encodeURIComponent(CASE_RESOLVER_WORKSPACE_KEY)}`,
      },
      {
        key: `${scope}_cached_key`,
        scope,
        url: `/api/settings?scope=${scope}&key=${encodeURIComponent(CASE_RESOLVER_WORKSPACE_KEY)}`,
      }
    );
  });
  return attempts;
};

export const fetchCaseResolverWorkspaceRecordDetailed = async (
  source: string,
  options?: {
    fresh?: boolean;
    strategy?: 'light_then_heavy' | 'light_only' | 'heavy_only';
    requiredFileId?: string | null;
    attemptProfile?: CaseResolverWorkspaceFetchAttemptProfile;
    maxTotalMs?: number;
    attemptTimeoutMs?: number;
  }
): Promise<CaseResolverWorkspaceRecordFetchResult> => {
  const startedAt = Date.now();
  const fetchStrategy = options?.strategy ?? 'light_then_heavy';
  const fetchFresh = options?.fresh !== false;
  const requiredFileId = options?.requiredFileId?.trim() ?? '';
  const attemptProfile = options?.attemptProfile ?? 'default';
  const attempts = buildWorkspaceRecordFetchAttempts({
    strategy: fetchStrategy,
    fresh: fetchFresh,
    attemptProfile,
  });
  const attemptTimeoutMs =
    typeof options?.attemptTimeoutMs === 'number' && Number.isFinite(options.attemptTimeoutMs)
      ? Math.max(1, Math.floor(options.attemptTimeoutMs))
      : CASE_RESOLVER_WORKSPACE_FETCH_TIMEOUT_MS;
  const defaultMaxTotalMs =
    attemptProfile === 'context_fast' ? Math.max(1_000, attemptTimeoutMs * 3) : attemptTimeoutMs * attempts.length;
  const maxTotalMs =
    typeof options?.maxTotalMs === 'number' && Number.isFinite(options.maxTotalMs)
      ? Math.max(1, Math.floor(options.maxTotalMs))
      : defaultMaxTotalMs;

  let lastFailureMessage = 'Workspace record request failed.';
  let loggedHeavyFallback = false;
  let sawWorkspaceRecordMissingRequiredFile = false;
  let lastMissingRequiredAttemptKey: string | null = null;
  let sawTransportFailure = false;
  let budgetExhausted = false;

  for (const attempt of attempts) {
    const elapsedMs = Date.now() - startedAt;
    const remainingBudgetMs = maxTotalMs - elapsedMs;
    if (remainingBudgetMs <= 0) {
      budgetExhausted = true;
      lastFailureMessage = `Workspace fetch budget exhausted before attempt ${attempt.key}.`;
      break;
    }
    if (!loggedHeavyFallback && fetchStrategy === 'light_then_heavy' && attempt.scope === 'heavy') {
      loggedHeavyFallback = true;
      logCaseResolverWorkspaceEvent({
        source,
        action: 'refresh_fallback_to_heavy',
        durationMs: Date.now() - startedAt,
        message: 'fallback=heavy_keyed',
      });
    }
    try {
      const response = await fetchSettingsPayloadWithTimeout({
        url: attempt.url,
        timeoutMs: Math.min(attemptTimeoutMs, remainingBudgetMs),
      });
      if (!response.ok) {
        sawTransportFailure = true;
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
      if (
        requiredFileId.length > 0 &&
        !workspace.files.some((file): boolean => file.id === requiredFileId)
      ) {
        sawWorkspaceRecordMissingRequiredFile = true;
        lastMissingRequiredAttemptKey = attempt.key;
        lastFailureMessage = `Attempt ${attempt.key} returned workspace without required file ${requiredFileId}.`;
        logCaseResolverWorkspaceEvent({
          source,
          action: 'refresh_attempt_failed',
          durationMs: Date.now() - startedAt,
          message: lastFailureMessage,
        });
        continue;
      }
      logCaseResolverWorkspaceEvent({
        source,
        action: 'refresh_success',
        workspaceRevision: getCaseResolverWorkspaceRevision(workspace),
        durationMs: Date.now() - startedAt,
        message: `attempt=${attempt.key}`,
      });
      return {
        status: 'resolved',
        workspace,
        attemptKey: attempt.key,
        scope: attempt.scope,
        durationMs: Date.now() - startedAt,
      };
    } catch (error: unknown) {
      sawTransportFailure = true;
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

  if (budgetExhausted) {
    logCaseResolverWorkspaceEvent({
      source,
      action: 'refresh_budget_exhausted',
      durationMs: Date.now() - startedAt,
      message: `attempt_profile=${attemptProfile} max_total_ms=${maxTotalMs}`,
    });
  }

  if (
    requiredFileId.length > 0 &&
    sawWorkspaceRecordMissingRequiredFile &&
    !sawTransportFailure &&
    !budgetExhausted
  ) {
    return {
      status: 'missing_required_file',
      attemptKey: lastMissingRequiredAttemptKey,
      durationMs: Date.now() - startedAt,
      message: lastFailureMessage,
    };
  }

  const unavailableReason: 'no_workspace_record' | 'transport_error' | 'budget_exhausted' =
    budgetExhausted ? 'budget_exhausted' : sawTransportFailure ? 'transport_error' : 'no_workspace_record';

  logCaseResolverWorkspaceEvent({
    source,
    action: 'refresh_failed',
    message: lastFailureMessage,
    durationMs: Date.now() - startedAt,
  });

  return {
    status: 'unavailable',
    reason: unavailableReason,
    durationMs: Date.now() - startedAt,
    message: lastFailureMessage,
  };
};

export const fetchCaseResolverWorkspaceSnapshot = async (
  source: string
): Promise<CaseResolverWorkspace | null> => {
  return await fetchCaseResolverWorkspaceRecord(source, { fresh: true });
};

type FetchIfStaleResult =
  | { updated: false; revision: number }
  | { updated: true; workspace: CaseResolverWorkspace };

/**
 * Single conditional HTTP request that replaces the old two-step waterfall
 * (metadata pre-flight → full workspace fetch). The server compares the stored
 * revision against `currentRevision` and returns the full workspace only when
 * it has advanced. On a cache hit the response is a small JSON object with
 * `upToDate: true` — no workspace data is transferred.
 */
export const fetchCaseResolverWorkspaceIfStale = async (
  source: string,
  currentRevision: number
): Promise<FetchIfStaleResult> => {
  const startedAt = Date.now();
  const normalizedRevision = Math.max(0, Math.floor(currentRevision));
  const url =
    `/api/settings?key=${encodeURIComponent(CASE_RESOLVER_WORKSPACE_KEY)}` +
    `&fresh=1&ifRevisionGt=${normalizedRevision}`;
  try {
    const response = await fetchSettingsPayloadWithTimeout({
      url,
      timeoutMs: CASE_RESOLVER_WORKSPACE_FETCH_TIMEOUT_MS,
    });
    if (!response.ok) {
      logCaseResolverWorkspaceEvent({
        source,
        action: 'conditional_fetch_failed',
        message: `HTTP ${response.status}`,
        durationMs: Date.now() - startedAt,
      });
      return { updated: false, revision: normalizedRevision };
    }
    const payload = (await response.json()) as unknown;
    // Server signals the client revision is current — no data transfer needed
    if (
      payload !== null &&
      typeof payload === 'object' &&
      !Array.isArray(payload) &&
      (payload as Record<string, unknown>)['upToDate'] === true
    ) {
      const serverRevisionRaw = (payload as Record<string, unknown>)['revision'];
      const revision =
        typeof serverRevisionRaw === 'number' && Number.isFinite(serverRevisionRaw) &&
        serverRevisionRaw > 0
          ? Math.floor(serverRevisionRaw)
          : normalizedRevision;
      logCaseResolverWorkspaceEvent({
        source,
        action: 'conditional_fetch_up_to_date',
        workspaceRevision: revision,
        durationMs: Date.now() - startedAt,
      });
      return { updated: false, revision };
    }
    // Server returned updated workspace payload
    const workspaceRecord = resolveWorkspaceRecordFromSettingsPayload(payload);
    if (!workspaceRecord) {
      logCaseResolverWorkspaceEvent({
        source,
        action: 'conditional_fetch_no_record',
        durationMs: Date.now() - startedAt,
      });
      return { updated: false, revision: normalizedRevision };
    }
    const workspace = readWorkspaceFromSettingRecord(workspaceRecord, '');
    logCaseResolverWorkspaceEvent({
      source,
      action: 'conditional_fetch_updated',
      workspaceRevision: getCaseResolverWorkspaceRevision(workspace),
      durationMs: Date.now() - startedAt,
    });
    return { updated: true, workspace };
  } catch (error: unknown) {
    logCaseResolverWorkspaceEvent({
      source,
      action: 'conditional_fetch_error',
      message: error instanceof Error ? error.message : 'Unknown error',
      durationMs: Date.now() - startedAt,
    });
    return { updated: false, revision: normalizedRevision };
  }
};

/**
 * Strip re-derivable content fields before persisting to reduce payload size.
 * For `document` files we keep html as the canonical source and omit markdown/plaintext.
 * For `scanfile` files we keep markdown as canonical and omit duplicated html/plain/version mirrors.
 * History entries are compacted with the same per-file strategy.
 */
export const compactCaseResolverWorkspaceForPersist = (
  workspace: CaseResolverWorkspace
): CaseResolverWorkspace => {
  if (!Array.isArray(workspace.files) || workspace.files.length === 0) {
    return workspace;
  }
  const compactedFiles = workspace.files.map((file): CaseResolverWorkspace['files'][number] => {
    const fileRecord = file as unknown as Record<string, unknown>;
    const isScanFile = file.fileType === 'scanfile';
    const rawHistory = fileRecord['documentHistory'];
    const compactedHistory = Array.isArray(rawHistory)
      ? rawHistory.map((entry: unknown) => {
        if (!entry || typeof entry !== 'object') return entry;
        const entryRecord = entry as Record<string, unknown>;
        const rest = { ...entryRecord };
        if (isScanFile) {
          delete rest['documentContent'];
          delete rest['documentContentHtml'];
          delete rest['documentContentPlainText'];
        } else {
          delete rest['documentContentMarkdown'];
          delete rest['documentContentPlainText'];
        }
        return rest;
      })
      : rawHistory;
    if (isScanFile) {
      const {
        documentContent: _content,
        documentContentHtml: _html,
        documentContentPlainText: _plainText,
        originalDocumentContent: _original,
        explodedDocumentContent: _exploded,
        ...fileRest
      } = file;
      return {
        ...fileRest,
        documentHistory: compactedHistory,
      } as CaseResolverWorkspace['files'][number];
    }
    const {
      documentContentMarkdown: _markdown,
      documentContentPlainText: _plainText,
      ...fileRest
    } = file;
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
  const workspaceForPersist = compactCaseResolverWorkspaceForPersist(normalizedWorkspace);
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
      : null) ?? `Failed to persist Case Resolver workspace (${response.status}).`;
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
