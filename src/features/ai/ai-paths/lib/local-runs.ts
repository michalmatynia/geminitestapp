import { fetchSettingsCached, invalidateSettingsCache } from '@/shared/api/settings-client';
import { withCsrfHeaders } from '@/shared/lib/security/csrf-client';

import { AI_PATHS_LOCAL_RUNS_KEY } from './core/constants';

export type AiPathLocalRunStatus = 'success' | 'error';

export type AiPathLocalRunRecord = {
  id: string;
  pathId?: string | null;
  pathName?: string | null;
  triggerEvent?: string | null;
  triggerLabel?: string | null;
  entityType?: string | null;
  entityId?: string | null;
  status: AiPathLocalRunStatus;
  startedAt: string;
  finishedAt: string;
  durationMs?: number | null;
  nodeCount?: number | null;
  error?: string | null;
  source?: string | null;
};

const MAX_LOCAL_RUNS = 200;

const toIsoString = (value: unknown): string | null => {
  if (typeof value === 'string' && value.trim().length > 0) {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date.toISOString();
  }
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value.toISOString();
  }
  return null;
};

const normalizeRecord = (value: unknown): AiPathLocalRunRecord | null => {
  if (!value || typeof value !== 'object') return null;
  const raw = value as Record<string, unknown>;
  const id = typeof raw.id === 'string' && raw.id.trim().length > 0 ? raw.id.trim() : null;
  const status = raw.status === 'success' || raw.status === 'error' ? raw.status : null;
  const startedAt = toIsoString(raw.startedAt);
  const finishedAt = toIsoString(raw.finishedAt);
  if (!id || !status || !startedAt || !finishedAt) return null;
  const durationMs =
    typeof raw.durationMs === 'number' && Number.isFinite(raw.durationMs)
      ? raw.durationMs
      : null;
  const nodeCount =
    typeof raw.nodeCount === 'number' && Number.isFinite(raw.nodeCount)
      ? raw.nodeCount
      : null;
  return {
    id,
    status,
    startedAt,
    finishedAt,
    durationMs,
    nodeCount,
    pathId: typeof raw.pathId === 'string' ? raw.pathId : null,
    pathName: typeof raw.pathName === 'string' ? raw.pathName : null,
    triggerEvent: typeof raw.triggerEvent === 'string' ? raw.triggerEvent : null,
    triggerLabel: typeof raw.triggerLabel === 'string' ? raw.triggerLabel : null,
    entityType: typeof raw.entityType === 'string' ? raw.entityType : null,
    entityId: typeof raw.entityId === 'string' ? raw.entityId : null,
    error: typeof raw.error === 'string' ? raw.error : null,
    source: typeof raw.source === 'string' ? raw.source : null,
  };
};

export const parseLocalRuns = (raw?: string | null): AiPathLocalRunRecord[] => {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((entry: unknown) => normalizeRecord(entry))
      .filter((entry: AiPathLocalRunRecord | null): entry is AiPathLocalRunRecord => Boolean(entry));
  } catch {
    return [];
  }
};

const buildLocalRunId = (): string => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `local_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
};

export const appendLocalRun = async (
  record: Omit<AiPathLocalRunRecord, 'id'> & { id?: string }
): Promise<AiPathLocalRunRecord | null> => {
  const id = record.id && record.id.trim().length > 0 ? record.id : buildLocalRunId();
  const normalized: AiPathLocalRunRecord = {
    ...record,
    id,
  };

  try {
    const settings = await fetchSettingsCached({ scope: 'heavy', bypassCache: true });
    const map = new Map(settings.map((item) => [item.key, item.value]));
    const existing = parseLocalRuns(map.get(AI_PATHS_LOCAL_RUNS_KEY));
    const next = [normalized, ...existing].slice(0, MAX_LOCAL_RUNS);
    const payload = JSON.stringify(next);
    await fetch('/api/settings', {
      method: 'POST',
      headers: withCsrfHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ key: AI_PATHS_LOCAL_RUNS_KEY, value: payload }),
    });
    invalidateSettingsCache();
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('settings:updated', { detail: { scope: 'heavy' } })
      );
    }
    return normalized;
  } catch (error) {
    console.warn('[ai-paths] Failed to append local run.', error);
    return null;
  }
};
