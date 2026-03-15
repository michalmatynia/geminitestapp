'use client';

import type { AiTriggerButtonLocation } from '@/shared/contracts/ai-trigger-buttons';
import type { AiPathRunRecord } from '@/shared/contracts/ai-paths';
import { logClientError } from '@/shared/utils/observability/client-error-logger';


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
  pathId: string | null;
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

const isTrackedRunStatus = (
  status: TriggerButtonRunFeedbackStatus
): status is AiPathRunRecord['status'] => status !== 'waiting';

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

const normalizeLegacyButtonIds = (
  value: readonly string[] | undefined,
  buttonId: string
): string[] => {
  const normalized = new Set<string>();
  normalized.add(buttonId);
  value?.forEach((candidate: string) => {
    const nextValue = normalizeRequiredString(candidate);
    if (nextValue) {
      normalized.add(nextValue);
    }
  });
  return Array.from(normalized);
};

const buildSharedFeedbackKey = (input: {
  identityType: 'button' | 'path';
  identityValue: string;
  entityType: string;
  entityId: string | null;
}): string =>
  [
    input.identityType,
    input.identityValue.trim().toLowerCase(),
    input.entityType.trim().toLowerCase(),
    (input.entityId ?? '__none__').trim().toLowerCase(),
  ].join('::');

const resolveFeedbackIdentity = (input: { buttonId: string; pathId?: string | null }) => {
  const pathId = normalizeRequiredString(input.pathId);
  if (pathId) {
    return {
      identityType: 'path' as const,
      identityValue: pathId,
    };
  }
  return {
    identityType: 'button' as const,
    identityValue: input.buttonId,
  };
};

const resolveFeedbackRecency = (value: TriggerButtonRunFeedbackSnapshot): number => {
  const timestamp = Date.parse(value.finishedAt ?? value.updatedAt ?? '');
  return Number.isFinite(timestamp) ? timestamp : 0;
};

const matchesLegacyFeedbackRecord = (
  value: PersistedTriggerButtonRunFeedback,
  aliases: ReadonlySet<string>,
  entityType: string,
  entityId: string | null
): boolean =>
  aliases.has(value.buttonId) &&
  value.entityType === entityType &&
  value.entityId === entityId;

const removeLegacyFeedbackRecords = (
  map: PersistedTriggerButtonRunFeedbackMap,
  aliases: ReadonlySet<string>,
  entityType: string,
  entityId: string | null
): void => {
  Object.entries(map).forEach(([key, rawValue]) => {
    const normalized = normalizePersistedFeedback(rawValue);
    if (!normalized) {
      delete map[key];
      return;
    }
    if (!matchesLegacyFeedbackRecord(normalized, aliases, entityType, entityId)) {
      return;
    }
    delete map[key];
  });
};

const readPersistedFeedbackMap = (): PersistedTriggerButtonRunFeedbackMap => {
  if (!canUseLocalStorage()) return {};
  try {
    const raw = window.localStorage.getItem(TRIGGER_BUTTON_RUN_FEEDBACK_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
    return parsed as PersistedTriggerButtonRunFeedbackMap;
  } catch (error) {
    logClientError(error);
    return {};
  }
};

const writePersistedFeedbackMap = (value: PersistedTriggerButtonRunFeedbackMap): void => {
  if (!canUseLocalStorage()) return;
  try {
    window.localStorage.setItem(TRIGGER_BUTTON_RUN_FEEDBACK_STORAGE_KEY, JSON.stringify(value));
  } catch (error) {
    logClientError(error);
  
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
  const pathId = normalizeOptionalString(record['pathId']);
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
    pathId,
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
  isTrackedRunStatus(status) && TERMINAL_RUN_STATUSES.has(status)
    ? TERMINAL_FEEDBACK_TTL_MS
    : ACTIVE_FEEDBACK_TTL_MS;

export const isTriggerButtonRunFeedbackTerminal = (
  status: TriggerButtonRunFeedbackSnapshot['status']
): boolean => isTrackedRunStatus(status) && TERMINAL_RUN_STATUSES.has(status);

export const readTriggerButtonRunFeedback = (input: {
  buttonId: string;
  pathId?: string | null;
  legacyButtonIds?: readonly string[] | undefined;
  location?: AiTriggerButtonLocation | undefined;
  entityType: string;
  entityId: string | null;
}): TriggerButtonRunFeedbackSnapshot | null => {
  const buttonId = normalizeRequiredString(input.buttonId);
  const entityType = normalizeRequiredString(input.entityType)?.toLowerCase() ?? null;
  if (!buttonId || !entityType) return null;

  const normalizedEntityId = normalizeOptionalString(input.entityId);
  const aliases = new Set<string>(normalizeLegacyButtonIds(input.legacyButtonIds, buttonId));
  const feedbackIdentity = resolveFeedbackIdentity({
    buttonId,
    pathId: input.pathId,
  });

  const currentMap = readPersistedFeedbackMap();
  const prunedMap = pruneExpiredFeedback(currentMap);
  if (prunedMap !== currentMap) {
    writePersistedFeedbackMap(prunedMap);
  }

  const persisted =
    prunedMap[
      buildSharedFeedbackKey({
        identityType: feedbackIdentity.identityType,
        identityValue: feedbackIdentity.identityValue,
        entityType,
        entityId: normalizedEntityId,
      })
    ];
  const normalized = normalizePersistedFeedback(persisted);
  if (normalized) {
    return {
      runId: normalized.runId,
      status: normalized.status,
      updatedAt: normalized.updatedAt,
      finishedAt: normalized.finishedAt,
      errorMessage: normalized.errorMessage,
    };
  }

  const legacyMatch =
    Object.values(prunedMap)
      .map((value) => normalizePersistedFeedback(value))
      .filter((value): value is PersistedTriggerButtonRunFeedback => Boolean(value))
      .filter((value) => matchesLegacyFeedbackRecord(value, aliases, entityType, normalizedEntityId))
      .sort((left, right) => resolveFeedbackRecency(right) - resolveFeedbackRecency(left))[0] ?? null;

  if (!legacyMatch) return null;

  return {
    runId: legacyMatch.runId,
    status: legacyMatch.status,
    updatedAt: legacyMatch.updatedAt,
    finishedAt: legacyMatch.finishedAt,
    errorMessage: legacyMatch.errorMessage,
  };
};

export const persistTriggerButtonRunFeedback = (input: {
  buttonId: string;
  pathId?: string | null;
  legacyButtonIds?: readonly string[] | undefined;
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

  const normalizedEntityId = normalizeOptionalString(input.entityId);
  const aliases = new Set<string>(normalizeLegacyButtonIds(input.legacyButtonIds, buttonId));
  const feedbackIdentity = resolveFeedbackIdentity({
    buttonId,
    pathId: input.pathId,
  });
  const currentMap = pruneExpiredFeedback(readPersistedFeedbackMap());
  removeLegacyFeedbackRecords(currentMap, aliases, entityType, normalizedEntityId);
  currentMap[
    buildSharedFeedbackKey({
      identityType: feedbackIdentity.identityType,
      identityValue: feedbackIdentity.identityValue,
      entityType,
      entityId: normalizedEntityId,
    })
  ] = {
    buttonId,
    pathId: normalizeOptionalString(input.pathId),
    location,
    entityId: normalizedEntityId,
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
  pathId?: string | null;
  legacyButtonIds?: readonly string[] | undefined;
  location: AiTriggerButtonLocation;
  entityType: string;
  entityId: string | null;
}): void => {
  const buttonId = normalizeRequiredString(input.buttonId);
  const location = normalizeRequiredString(input.location) as AiTriggerButtonLocation | null;
  const entityType = normalizeRequiredString(input.entityType)?.toLowerCase() ?? null;
  if (!buttonId || !location || !entityType) return;

  const normalizedEntityId = normalizeOptionalString(input.entityId);
  const aliases = new Set<string>(normalizeLegacyButtonIds(input.legacyButtonIds, buttonId));
  const feedbackIdentity = resolveFeedbackIdentity({
    buttonId,
    pathId: input.pathId,
  });
  const currentMap = pruneExpiredFeedback(readPersistedFeedbackMap());
  removeLegacyFeedbackRecords(currentMap, aliases, entityType, normalizedEntityId);
  delete currentMap[
    buildSharedFeedbackKey({
      identityType: feedbackIdentity.identityType,
      identityValue: feedbackIdentity.identityValue,
      entityType,
      entityId: normalizedEntityId,
    })
  ];
  writePersistedFeedbackMap(currentMap);
};

export const __resetTriggerButtonRunFeedbackForTests = (): void => {
  if (!canUseLocalStorage()) return;
  try {
    window.localStorage.removeItem(TRIGGER_BUTTON_RUN_FEEDBACK_STORAGE_KEY);
  } catch (error) {
    logClientError(error);
  
    // ignore
  }
};
