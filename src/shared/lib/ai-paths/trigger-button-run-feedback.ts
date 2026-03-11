'use client';

import type { AiTriggerButtonLocation } from '@/shared/contracts/ai-trigger-buttons';
import type { AiPathRunRecord } from '@/shared/contracts/ai-paths';

const TRIGGER_BUTTON_RUN_FEEDBACK_STORAGE_KEY = 'ai-paths-trigger-button-run-feedback';
const ACTIVE_FEEDBACK_TTL_MS = 60 * 60 * 1000;
const TERMINAL_FEEDBACK_TTL_MS = 30 * 60 * 1000;

export type TriggerButtonRunFeedbackStatus = AiPathRunRecord['status'] | 'waiting';

export type TriggerButtonRunFeedbackSnapshot = {
  runId: string;
  status: TriggerButtonRunFeedbackStatus;
  updatedAt: string | null;
  finishedAt: string | null;
  errorMessage: string | null;
};

type PersistedTriggerButtonRunFeedback = TriggerButtonRunFeedbackSnapshot & {
  buttonId: string;
  location: AiTriggerButtonLocation;
  entityId: string | null;
  entityType: string;
  expiresAt: number;
};

type PersistedTriggerButtonRunFeedbackMap = Record<string, PersistedTriggerButtonRunFeedback>;

const TERMINAL_RUN_STATUSES = new Set<AiPathRunRecord['status']>([
  'completed',
  'failed',
  'canceled',
  'dead_lettered',
]);

const RUN_FEEDBACK_STATUSES = new Set<TriggerButtonRunFeedbackStatus>([
  'waiting',
  'queued',
  'running',
  'blocked_on_lease',
  'handoff_ready',
  'paused',
  'completed',
  'failed',
  'canceled',
  'dead_lettered',
]);

const canUseLocalStorage = (): boolean =>
  typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';

const normalizeOptionalString = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const normalizeRequiredString = (value: unknown): string | null => {
  const normalized = normalizeOptionalString(value);
  return normalized && normalized.length > 0 ? normalized : null;
};

const buildFeedbackKey = (input: {
  buttonId: string;
  location: AiTriggerButtonLocation;
  entityType: string;
  entityId: string | null;
}): string =>
  [
    input.buttonId.trim(),
    input.location.trim().toLowerCase(),
    input.entityType.trim().toLowerCase(),
    (input.entityId ?? '__none__').trim().toLowerCase(),
  ].join('::');

const readPersistedFeedbackMap = (): PersistedTriggerButtonRunFeedbackMap => {
  if (!canUseLocalStorage()) return {};
  try {
    const raw = window.localStorage.getItem(TRIGGER_BUTTON_RUN_FEEDBACK_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
    return parsed as PersistedTriggerButtonRunFeedbackMap;
  } catch {
    return {};
  }
};

const writePersistedFeedbackMap = (value: PersistedTriggerButtonRunFeedbackMap): void => {
  if (!canUseLocalStorage()) return;
  try {
    window.localStorage.setItem(TRIGGER_BUTTON_RUN_FEEDBACK_STORAGE_KEY, JSON.stringify(value));
  } catch {
    // best-effort persistence
  }
};

const normalizePersistedFeedback = (
  value: unknown
): PersistedTriggerButtonRunFeedback | null => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  const buttonId = normalizeRequiredString(record['buttonId']);
  const location = normalizeRequiredString(record['location']) as AiTriggerButtonLocation | null;
  const entityType = normalizeRequiredString(record['entityType'])?.toLowerCase() ?? null;
  const runId = normalizeRequiredString(record['runId']);
  const normalizedStatus = normalizeRequiredString(record['status'])?.toLowerCase() ?? null;
  const status = normalizedStatus && RUN_FEEDBACK_STATUSES.has(normalizedStatus as TriggerButtonRunFeedbackStatus)
    ? (normalizedStatus as TriggerButtonRunFeedbackStatus)
    : null;
  const updatedAt = normalizeOptionalString(record['updatedAt']);
  const finishedAt = normalizeOptionalString(record['finishedAt']);
  const errorMessage = normalizeOptionalString(record['errorMessage']);
  const entityId = normalizeOptionalString(record['entityId']);
  const expiresAt =
    typeof record['expiresAt'] === 'number' && Number.isFinite(record['expiresAt'])
      ? record['expiresAt']
      : null;

  if (!buttonId || !location || !entityType || !runId || !status || expiresAt === null) {
    return null;
  }

  return {
    buttonId,
    location,
    entityId,
    entityType,
    runId,
    status,
    updatedAt,
    finishedAt,
    errorMessage,
    expiresAt,
  };
};

const pruneExpiredFeedback = (
  map: PersistedTriggerButtonRunFeedbackMap,
  now = Date.now()
): PersistedTriggerButtonRunFeedbackMap => {
  let mutated = false;
  const next: PersistedTriggerButtonRunFeedbackMap = {};
  for (const [key, value] of Object.entries(map)) {
    const normalized = normalizePersistedFeedback(value);
    if (!normalized || normalized.expiresAt <= now) {
      mutated = true;
      continue;
    }
    next[key] = normalized;
  }
  return mutated ? next : map;
};

const resolveFeedbackTtlMs = (status: TriggerButtonRunFeedbackSnapshot['status']): number =>
  TERMINAL_RUN_STATUSES.has(status) ? TERMINAL_FEEDBACK_TTL_MS : ACTIVE_FEEDBACK_TTL_MS;

export const isTriggerButtonRunFeedbackTerminal = (
  status: TriggerButtonRunFeedbackSnapshot['status']
): boolean => TERMINAL_RUN_STATUSES.has(status);

export const readTriggerButtonRunFeedback = (input: {
  buttonId: string;
  location: AiTriggerButtonLocation;
  entityType: string;
  entityId: string | null;
}): TriggerButtonRunFeedbackSnapshot | null => {
  const buttonId = normalizeRequiredString(input.buttonId);
  const location = normalizeRequiredString(input.location) as AiTriggerButtonLocation | null;
  const entityType = normalizeRequiredString(input.entityType)?.toLowerCase() ?? null;
  if (!buttonId || !location || !entityType) return null;

  const currentMap = readPersistedFeedbackMap();
  const prunedMap = pruneExpiredFeedback(currentMap);
  if (prunedMap !== currentMap) {
    writePersistedFeedbackMap(prunedMap);
  }

  const persisted = prunedMap[
    buildFeedbackKey({ buttonId, location, entityType, entityId: input.entityId })
  ];
  const normalized = normalizePersistedFeedback(persisted);
  if (!normalized) return null;

  return {
    runId: normalized.runId,
    status: normalized.status,
    updatedAt: normalized.updatedAt,
    finishedAt: normalized.finishedAt,
    errorMessage: normalized.errorMessage,
  };
};

export const persistTriggerButtonRunFeedback = (input: {
  buttonId: string;
  location: AiTriggerButtonLocation;
  entityType: string;
  entityId: string | null;
  run: TriggerButtonRunFeedbackSnapshot;
}): void => {
  const buttonId = normalizeRequiredString(input.buttonId);
  const location = normalizeRequiredString(input.location) as AiTriggerButtonLocation | null;
  const entityType = normalizeRequiredString(input.entityType)?.toLowerCase() ?? null;
  if (!buttonId || !location || !entityType) return;
  if (input.run.status === 'waiting') return;

  const currentMap = pruneExpiredFeedback(readPersistedFeedbackMap());
  currentMap[buildFeedbackKey({ buttonId, location, entityType, entityId: input.entityId })] = {
    buttonId,
    location,
    entityId: normalizeOptionalString(input.entityId),
    entityType,
    runId: input.run.runId,
    status: input.run.status,
    updatedAt: input.run.updatedAt,
    finishedAt: input.run.finishedAt,
    errorMessage: input.run.errorMessage,
    expiresAt: Date.now() + resolveFeedbackTtlMs(input.run.status),
  };
  writePersistedFeedbackMap(currentMap);
};

export const clearTriggerButtonRunFeedback = (input: {
  buttonId: string;
  location: AiTriggerButtonLocation;
  entityType: string;
  entityId: string | null;
}): void => {
  const buttonId = normalizeRequiredString(input.buttonId);
  const location = normalizeRequiredString(input.location) as AiTriggerButtonLocation | null;
  const entityType = normalizeRequiredString(input.entityType)?.toLowerCase() ?? null;
  if (!buttonId || !location || !entityType) return;

  const currentMap = pruneExpiredFeedback(readPersistedFeedbackMap());
  delete currentMap[buildFeedbackKey({ buttonId, location, entityType, entityId: input.entityId })];
  writePersistedFeedbackMap(currentMap);
};

export const __resetTriggerButtonRunFeedbackForTests = (): void => {
  if (!canUseLocalStorage()) return;
  try {
    window.localStorage.removeItem(TRIGGER_BUTTON_RUN_FEEDBACK_STORAGE_KEY);
  } catch {
    // ignore
  }
};
