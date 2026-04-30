import type { TriggerButtonRunFeedbackStatus } from '@/shared/lib/ai-paths/trigger-button-run-feedback';

import {
  ACTIVE_EXPORT_FEEDBACK_TTL_MS,
  BASE_QUICK_EXPORT_FEEDBACK_STORAGE_KEY,
  TERMINAL_EXPORT_FEEDBACK_TTL_MS,
  TERMINAL_EXPORT_RUN_STATUSES,
} from './BaseQuickExportButton.constants';
import type { PersistedBaseQuickExportFeedback } from './BaseQuickExportButton.types';

const canUseSessionStorage = (): boolean =>
  typeof window !== 'undefined' && typeof window.sessionStorage !== 'undefined';

const isRecord = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && Array.isArray(value) === false;

const readNonEmptyString = (value: unknown): string | null =>
  typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;

const readPersistedStatus = (
  record: Record<string, unknown>
): TriggerButtonRunFeedbackStatus | null => {
  const status = record['status'];
  return typeof status === 'string' ? (status as TriggerButtonRunFeedbackStatus) : null;
};

const readExpiresAt = (record: Record<string, unknown>): number => {
  const expiresAt = record['expiresAt'];
  return typeof expiresAt === 'number' && Number.isFinite(expiresAt) ? expiresAt : 0;
};

const readPersistedFeedbackRecord = (
  productId: string,
  value: unknown,
  now: number
): PersistedBaseQuickExportFeedback | null => {
  if (isRecord(value) === false) return null;
  const status = readPersistedStatus(value);
  const expiresAt = readExpiresAt(value);
  if (status === null || expiresAt <= now) return null;
  return {
    productId,
    runId: readNonEmptyString(value['runId']),
    status,
    errorMessage: readNonEmptyString(value['errorMessage']),
    expiresAt,
  };
};

const resolveExportFeedbackTtlMs = (status: TriggerButtonRunFeedbackStatus): number =>
  TERMINAL_EXPORT_RUN_STATUSES.has(status)
    ? TERMINAL_EXPORT_FEEDBACK_TTL_MS
    : ACTIVE_EXPORT_FEEDBACK_TTL_MS;

const readPersistedBaseQuickExportFeedbackMap = (): Record<
  string,
  PersistedBaseQuickExportFeedback
> => {
  if (canUseSessionStorage() === false) return {};
  try {
    const raw = window.sessionStorage.getItem(BASE_QUICK_EXPORT_FEEDBACK_STORAGE_KEY);
    if (raw === null || raw === '') return {};
    const parsed = JSON.parse(raw) as unknown;
    if (isRecord(parsed) === false) return {};

    const next: Record<string, PersistedBaseQuickExportFeedback> = {};
    const now = Date.now();
    for (const [productId, value] of Object.entries(parsed)) {
      const record = readPersistedFeedbackRecord(productId, value, now);
      if (record !== null) next[productId] = record;
    }
    return next;
  } catch {
    return {};
  }
};

const writePersistedBaseQuickExportFeedbackMap = (
  nextMap: Record<string, PersistedBaseQuickExportFeedback>
): void => {
  if (canUseSessionStorage() === false) return;
  try {
    if (Object.keys(nextMap).length === 0) {
      window.sessionStorage.removeItem(BASE_QUICK_EXPORT_FEEDBACK_STORAGE_KEY);
      return;
    }
    window.sessionStorage.setItem(BASE_QUICK_EXPORT_FEEDBACK_STORAGE_KEY, JSON.stringify(nextMap));
  } catch {
    // Best-effort UI persistence only.
  }
};

export const readPersistedBaseQuickExportFeedback = (
  productId: string
): PersistedBaseQuickExportFeedback | null => {
  const nextMap = readPersistedBaseQuickExportFeedbackMap();
  const record = nextMap[productId] ?? null;
  writePersistedBaseQuickExportFeedbackMap(nextMap);
  return record;
};

export const persistBaseQuickExportFeedback = (
  productId: string,
  runId: string | null,
  status: TriggerButtonRunFeedbackStatus,
  errorMessage?: string | null
): void => {
  if (productId.trim() === '') return;
  const nextMap = readPersistedBaseQuickExportFeedbackMap();
  nextMap[productId] = {
    productId,
    runId,
    status,
    errorMessage: readNonEmptyString(errorMessage),
    expiresAt: Date.now() + resolveExportFeedbackTtlMs(status),
  };
  writePersistedBaseQuickExportFeedbackMap(nextMap);
};

export const clearPersistedBaseQuickExportFeedback = (productId: string): void => {
  if (productId.trim() === '') return;
  const nextMap = readPersistedBaseQuickExportFeedbackMap();
  if (!(productId in nextMap)) return;
  delete nextMap[productId];
  writePersistedBaseQuickExportFeedbackMap(nextMap);
};
