'use client';

import { aiPathRunStatusSchema, type AiPathRunRecord } from '@/shared/contracts/ai-paths';

import { AI_PATHS_RUN_SOURCE_VALUES } from './run-sources';

const STORAGE_KEY = 'ai-paths-optimistic-run-queue';
const DEFAULT_RUN_TTL_MS = 60_000;
const AI_PATHS_NODE_SOURCES = new Set<string>(AI_PATHS_RUN_SOURCE_VALUES);

type StoredOptimisticRun = {
  expiresAt: number;
  run: AiPathRunRecord;
};

export type OptimisticRunFilters = {
  pathId?: string;
  source?: string;
  sourceMode?: 'include' | 'exclude';
  status?: string;
  query?: string;
};

type AiPathQueuePayload = {
  runs: AiPathRunRecord[];
  total: number;
};

const canUseStorage = (): boolean =>
  typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';

const normalizeString = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  const normalized = value.trim().toLowerCase();
  return normalized.length > 0 ? normalized : null;
};

const normalizeRunId = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const toTimestamp = (value: unknown): number => {
  if (typeof value !== 'string') return 0;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const compareRuns = (left: AiPathRunRecord, right: AiPathRunRecord): number => {
  const leftTimestamp = Math.max(toTimestamp(left.createdAt), toTimestamp(left.updatedAt));
  const rightTimestamp = Math.max(toTimestamp(right.createdAt), toTimestamp(right.updatedAt));
  if (rightTimestamp !== leftTimestamp) return rightTimestamp - leftTimestamp;
  return (right.id ?? '').localeCompare(left.id ?? '');
};

const readMetaRecord = (meta: AiPathRunRecord['meta']): Record<string, unknown> | null => {
  if (!meta || typeof meta !== 'object' || Array.isArray(meta)) return null;
  return meta;
};

const resolveRunSource = (run: AiPathRunRecord): string | null => {
  const meta = readMetaRecord(run.meta as Record<string, unknown>);
  if (!meta) return null;
  return normalizeString(meta['source']);
};

const isAiPathsNodeSource = (source: string | null): boolean => {
  if (!source) return false;
  return AI_PATHS_NODE_SOURCES.has(source);
};

const matchesSourceFilter = (
  run: AiPathRunRecord,
  sourceFilter: string | null,
  sourceMode: 'include' | 'exclude'
): boolean => {
  if (!sourceFilter) return true;
  const runSource = resolveRunSource(run);

  if (sourceMode === 'exclude') {
    if (sourceFilter === 'ai_paths_ui') {
      return !isAiPathsNodeSource(runSource);
    }
    return runSource !== sourceFilter;
  }

  if (sourceFilter === 'ai_paths_ui') {
    return isAiPathsNodeSource(runSource);
  }
  return runSource === sourceFilter;
};

const matchesQueryFilter = (run: AiPathRunRecord, query: string | null): boolean => {
  if (!query) return true;
  const haystack = [run.id, run.pathId, run.pathName, run.entityId, run.errorMessage]
    .map((item: unknown) => (typeof item === 'string' ? item.toLowerCase() : ''))
    .join(' ');
  return haystack.includes(query);
};

export const aiPathRunMatchesFilters = (
  run: AiPathRunRecord,
  filters?: OptimisticRunFilters
): boolean => {
  const statusFilter = normalizeString(filters?.status);
  if (statusFilter && statusFilter !== 'all') {
    const runStatus = normalizeString(run.status);
    if (runStatus !== statusFilter) return false;
  }

  const pathFilter = normalizeString(filters?.pathId);
  if (pathFilter) {
    const runPathId = normalizeString(run.pathId);
    if (runPathId !== pathFilter) return false;
  }

  const sourceFilter = normalizeString(filters?.source);
  const sourceMode = filters?.sourceMode === 'exclude' ? 'exclude' : 'include';
  if (!matchesSourceFilter(run, sourceFilter, sourceMode)) return false;

  const queryFilter = normalizeString(filters?.query);
  return matchesQueryFilter(run, queryFilter);
};

const normalizeStoredRun = (value: unknown): AiPathRunRecord | null => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  const id = normalizeRunId(record['id']);
  const status = aiPathRunStatusSchema.safeParse(record['status']);
  if (!id || !status.success) return null;
  return {
    ...(record as AiPathRunRecord),
    id,
    status: status.data,
  };
};

const normalizeStoredEntry = (value: unknown): StoredOptimisticRun | null => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  const expiresAt =
    typeof record['expiresAt'] === 'number' && Number.isFinite(record['expiresAt'])
      ? record['expiresAt']
      : null;
  const run = normalizeStoredRun(record['run']);
  if (!expiresAt || !run) return null;
  return { expiresAt, run };
};

const writeEntries = (entries: StoredOptimisticRun[]): void => {
  if (!canUseStorage()) return;
  if (entries.length === 0) {
    window.localStorage.removeItem(STORAGE_KEY);
    return;
  }
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
};

const readEntries = (): StoredOptimisticRun[] => {
  if (!canUseStorage()) return [];
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return [];

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    window.localStorage.removeItem(STORAGE_KEY);
    return [];
  }

  if (!Array.isArray(parsed)) {
    window.localStorage.removeItem(STORAGE_KEY);
    return [];
  }

  const now = Date.now();
  const entries = parsed
    .map((entry: unknown) => normalizeStoredEntry(entry))
    .filter((entry: StoredOptimisticRun | null): entry is StoredOptimisticRun => {
      return entry !== null && entry.expiresAt > now;
    })
    .sort((left, right) => compareRuns(left.run, right.run));

  if (entries.length !== parsed.length) {
    writeEntries(entries);
  }

  return entries;
};

const replaceEntry = (
  entries: StoredOptimisticRun[],
  run: AiPathRunRecord,
  expiresAt: number
): StoredOptimisticRun[] => {
  const normalizedRun = normalizeStoredRun(run);
  if (!normalizedRun) return entries;
  const nextEntries = entries.filter((entry) => entry.run.id !== normalizedRun.id);
  nextEntries.push({ expiresAt, run: normalizedRun });
  nextEntries.sort((left, right) => compareRuns(left.run, right.run));
  return nextEntries;
};

export const rememberOptimisticAiPathRun = (
  run: AiPathRunRecord,
  options?: { ttlMs?: number }
): void => {
  const normalizedRun = normalizeStoredRun(run);
  if (!normalizedRun || !canUseStorage()) return;

  const ttlMs = Math.max(1_000, options?.ttlMs ?? DEFAULT_RUN_TTL_MS);
  const entries = readEntries();
  const nextEntries = replaceEntry(entries, normalizedRun, Date.now() + ttlMs);
  writeEntries(nextEntries);
};

export const removeOptimisticAiPathRun = (runId: string): void => {
  const normalizedRunId = normalizeRunId(runId);
  if (!normalizedRunId || !canUseStorage()) return;

  const entries = readEntries();
  const nextEntries = entries.filter((entry) => entry.run.id !== normalizedRunId);
  if (nextEntries.length === entries.length) return;
  writeEntries(nextEntries);
};

export const removeOptimisticAiPathRuns = (runIds: Iterable<string>): void => {
  if (!canUseStorage()) return;
  const normalizedIds = new Set<string>();
  for (const runId of runIds) {
    const normalizedRunId = normalizeRunId(runId);
    if (normalizedRunId) normalizedIds.add(normalizedRunId);
  }
  if (normalizedIds.size === 0) return;

  const entries = readEntries();
  const nextEntries = entries.filter((entry) => !normalizedIds.has(entry.run.id));
  if (nextEntries.length === entries.length) return;
  writeEntries(nextEntries);
};

export const listOptimisticAiPathRuns = (filters?: OptimisticRunFilters): AiPathRunRecord[] => {
  return readEntries()
    .map((entry) => entry.run)
    .filter((run) => aiPathRunMatchesFilters(run, filters));
};

export const previewAiPathQueuePayloadWithOptimisticRuns = (
  payload: AiPathQueuePayload,
  options?: OptimisticRunFilters & {
    limit?: number;
    offset?: number;
  }
): AiPathQueuePayload => {
  const currentRuns = Array.isArray(payload.runs) ? payload.runs : [];
  const offset = typeof options?.offset === 'number' ? options.offset : 0;
  if (offset > 0) return payload;

  const currentRunIds = new Set<string>();
  currentRuns.forEach((run) => {
    const runId = normalizeRunId(run?.id);
    if (runId) currentRunIds.add(runId);
  });

  const optimisticRuns = listOptimisticAiPathRuns(options).filter((run) => !currentRunIds.has(run.id));
  if (optimisticRuns.length === 0) return payload;

  const combinedRuns = [...optimisticRuns, ...currentRuns];
  const limit = typeof options?.limit === 'number' ? options.limit : null;

  return {
    runs: limit && limit > 0 ? combinedRuns.slice(0, limit) : combinedRuns,
    total: payload.total + optimisticRuns.length,
  };
};

export const mergeAiPathQueuePayloadWithOptimisticRuns = (
  payload: AiPathQueuePayload,
  options?: OptimisticRunFilters & {
    limit?: number;
    offset?: number;
  }
): AiPathQueuePayload => {
  const serverRuns = Array.isArray(payload.runs) ? payload.runs : [];
  const serverRunIds = new Set<string>();
  serverRuns.forEach((run) => {
    const runId = normalizeRunId(run?.id);
    if (runId) serverRunIds.add(runId);
  });
  if (serverRunIds.size > 0) {
    removeOptimisticAiPathRuns(serverRunIds);
  }
  return previewAiPathQueuePayloadWithOptimisticRuns(payload, options);
};

export const patchQueuedCountWithOptimisticRuns = <T extends { queuedCount?: number | null }>(
  status: T
): T => {
  const optimisticQueuedCount = listOptimisticAiPathRuns({ status: 'queued' }).length;
  if (optimisticQueuedCount === 0) return status;

  const queuedCount =
    typeof status.queuedCount === 'number' && Number.isFinite(status.queuedCount)
      ? status.queuedCount
      : 0;
  if (queuedCount > 0) return status;

  return {
    ...status,
    queuedCount: optimisticQueuedCount,
  };
};
