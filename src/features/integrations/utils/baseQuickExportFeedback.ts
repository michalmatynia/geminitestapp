import type { TriggerButtonRunFeedbackStatus } from '@/shared/lib/ai-paths/trigger-button-run-feedback';

export type PersistedBaseQuickExportFeedback = {
  productId: string;
  runId: string | null;
  status: TriggerButtonRunFeedbackStatus;
  expiresAt: number;
};

export const BASE_QUICK_EXPORT_FEEDBACK_STORAGE_KEY = 'base-quick-export-feedback';

const ACTIVE_EXPORT_FEEDBACK_TTL_MS = 15 * 60 * 1000;
const TERMINAL_EXPORT_FEEDBACK_TTL_MS = 30 * 60 * 1000;

export const TERMINAL_BASE_QUICK_EXPORT_RUN_STATUSES = new Set<TriggerButtonRunFeedbackStatus>([
  'completed',
  'failed',
  'canceled',
]);

const canUseSessionStorage = (): boolean =>
  typeof window !== 'undefined' && typeof window.sessionStorage !== 'undefined';

const resolveExportFeedbackTtlMs = (status: TriggerButtonRunFeedbackStatus): number =>
  TERMINAL_BASE_QUICK_EXPORT_RUN_STATUSES.has(status)
    ? TERMINAL_EXPORT_FEEDBACK_TTL_MS
    : ACTIVE_EXPORT_FEEDBACK_TTL_MS;

const readPersistedBaseQuickExportFeedbackMap = (): Record<string, PersistedBaseQuickExportFeedback> => {
  if (!canUseSessionStorage()) return {};

  try {
    const raw = window.sessionStorage.getItem(BASE_QUICK_EXPORT_FEEDBACK_STORAGE_KEY);
    if (!raw) return {};

    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return {};
    }

    const next: Record<string, PersistedBaseQuickExportFeedback> = {};
    const now = Date.now();

    Object.entries(parsed as Record<string, unknown>).forEach(([productId, value]) => {
      if (!value || typeof value !== 'object' || Array.isArray(value)) return;
      const record = value as Record<string, unknown>;
      const status =
        typeof record['status'] === 'string'
          ? (record['status'] as TriggerButtonRunFeedbackStatus)
          : null;
      const expiresAt =
        typeof record['expiresAt'] === 'number' && Number.isFinite(record['expiresAt'])
          ? record['expiresAt']
          : 0;
      if (!status || expiresAt <= now) return;

      next[productId] = {
        productId,
        runId:
          typeof record['runId'] === 'string' && record['runId'].trim().length > 0
            ? record['runId'].trim()
            : null,
        status,
        expiresAt,
      };
    });

    return next;
  } catch {
    return {};
  }
};

const writePersistedBaseQuickExportFeedbackMap = (
  nextMap: Record<string, PersistedBaseQuickExportFeedback>
): void => {
  if (!canUseSessionStorage()) return;

  try {
    if (Object.keys(nextMap).length === 0) {
      window.sessionStorage.removeItem(BASE_QUICK_EXPORT_FEEDBACK_STORAGE_KEY);
      return;
    }

    window.sessionStorage.setItem(
      BASE_QUICK_EXPORT_FEEDBACK_STORAGE_KEY,
      JSON.stringify(nextMap)
    );
  } catch {
    // Best-effort UI persistence only.
  }
};

export const readPersistedBaseQuickExportFeedback = (
  productId: string
): PersistedBaseQuickExportFeedback | null => {
  const nextMap = readPersistedBaseQuickExportFeedbackMap();
  writePersistedBaseQuickExportFeedbackMap(nextMap);
  return nextMap[productId] ?? null;
};

export const persistBaseQuickExportFeedback = (
  productId: string,
  runId: string | null,
  status: TriggerButtonRunFeedbackStatus
): void => {
  if (!productId.trim()) return;

  const nextMap = readPersistedBaseQuickExportFeedbackMap();
  nextMap[productId] = {
    productId,
    runId,
    status,
    expiresAt: Date.now() + resolveExportFeedbackTtlMs(status),
  };
  writePersistedBaseQuickExportFeedbackMap(nextMap);
};

export const clearPersistedBaseQuickExportFeedback = (productId: string): void => {
  if (!productId.trim()) return;

  const nextMap = readPersistedBaseQuickExportFeedbackMap();
  if (!(productId in nextMap)) return;

  delete nextMap[productId];
  writePersistedBaseQuickExportFeedbackMap(nextMap);
};
