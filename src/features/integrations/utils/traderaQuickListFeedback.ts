import type {
  QuickExportFeedbackStatus as TraderaQuickListFeedbackStatus,
  PersistedQuickExportFeedback as PersistedTraderaQuickListFeedback,
  QuickExportFeedbackOptions as PersistTraderaQuickListFeedbackOptions,
} from '@/shared/contracts/integrations/listings';

export type {
  TraderaQuickListFeedbackStatus,
  PersistedTraderaQuickListFeedback,
  PersistTraderaQuickListFeedbackOptions,
};

export const TRADERA_QUICK_LIST_FEEDBACK_EVENT_NAME =
  'integrations:tradera-quick-list-feedback-updated';

export const TRADERA_QUICK_LIST_FEEDBACK_STORAGE_KEY = 'tradera-quick-list-feedback';

const PROCESSING_FEEDBACK_TTL_MS = 2 * 60 * 1000;
const QUEUED_FEEDBACK_TTL_MS = 120 * 1000;
const COMPLETED_FEEDBACK_TTL_MS = 5 * 60 * 1000;
const FAILED_FEEDBACK_TTL_MS = 30 * 60 * 1000;

const canUseSessionStorage = (): boolean =>
  typeof window !== 'undefined' && typeof window.sessionStorage !== 'undefined';

const emitTraderaQuickListFeedbackUpdated = (productId: string): void => {
  if (typeof window === 'undefined') return;

  window.dispatchEvent(
    new CustomEvent(TRADERA_QUICK_LIST_FEEDBACK_EVENT_NAME, {
      detail: { productId },
    })
  );
};

const resolveFeedbackTtlMs = (status: TraderaQuickListFeedbackStatus): number =>
  status === 'processing'
    ? PROCESSING_FEEDBACK_TTL_MS
    : status === 'queued'
      ? QUEUED_FEEDBACK_TTL_MS
      : status === 'completed'
        ? COMPLETED_FEEDBACK_TTL_MS
        : FAILED_FEEDBACK_TTL_MS;

const readPersistedFeedbackMap = (): Record<string, PersistedTraderaQuickListFeedback> => {
  if (!canUseSessionStorage()) return {};

  try {
    const raw = window.sessionStorage.getItem(TRADERA_QUICK_LIST_FEEDBACK_STORAGE_KEY);
    if (!raw) return {};

    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return {};
    }

    const now = Date.now();
    const next: Record<string, PersistedTraderaQuickListFeedback> = {};

    Object.entries(parsed as Record<string, unknown>).forEach(([productId, value]) => {
      if (!value || typeof value !== 'object' || Array.isArray(value)) return;
      const record = value as Record<string, unknown>;
      const status = record['status'];
      const expiresAt = record['expiresAt'];
      const integrationId =
        typeof record['integrationId'] === 'string' && record['integrationId'].trim().length > 0
          ? record['integrationId'].trim()
          : null;
      const failureReason =
        typeof record['failureReason'] === 'string' && record['failureReason'].trim().length > 0
          ? record['failureReason'].trim()
          : null;
      const requestId =
        typeof record['requestId'] === 'string' && record['requestId'].trim().length > 0
          ? record['requestId'].trim()
          : null;
      const runId =
        typeof record['runId'] === 'string' && record['runId'].trim().length > 0
          ? record['runId'].trim()
          : null;
      const connectionId =
        typeof record['connectionId'] === 'string' && record['connectionId'].trim().length > 0
          ? record['connectionId'].trim()
          : null;
      const listingId =
        typeof record['listingId'] === 'string' && record['listingId'].trim().length > 0
          ? record['listingId'].trim()
          : null;
      const listingUrl =
        typeof record['listingUrl'] === 'string' && record['listingUrl'].trim().length > 0
          ? record['listingUrl'].trim()
          : null;
      const externalListingId =
        typeof record['externalListingId'] === 'string' && record['externalListingId'].trim().length > 0
          ? record['externalListingId'].trim()
          : null;
      const completedAt =
        typeof record['completedAt'] === 'number' && Number.isFinite(record['completedAt'])
          ? record['completedAt']
          : null;
      const duplicateLinked =
        typeof record['duplicateLinked'] === 'boolean' ? record['duplicateLinked'] : null;

      if (
        status !== 'processing' &&
        status !== 'queued' &&
        status !== 'completed' &&
        status !== 'failed' &&
        status !== 'auth_required'
      ) {
        return;
      }

      if (typeof expiresAt !== 'number' || !Number.isFinite(expiresAt)) {
        return;
      }

      if (expiresAt <= now) {
        if (status === 'processing' || status === 'queued') {
          next[productId] = {
            productId,
            status: 'failed',
            expiresAt: now + resolveFeedbackTtlMs('failed'),
            runId,
            requestId,
            integrationId,
            connectionId,
            failureReason,
            listingId,
            listingUrl,
            externalListingId,
            completedAt,
            duplicateLinked,
          };
        }
        return;
      }

      next[productId] = {
        productId,
        status,
        expiresAt,
        failureReason,
        runId,
        requestId,
        integrationId,
        connectionId,
        listingId,
        listingUrl,
        externalListingId,
        completedAt,
        duplicateLinked,
      };
    });

    return next;
  } catch {
    return {};
  }
};

const writePersistedFeedbackMap = (
  nextMap: Record<string, PersistedTraderaQuickListFeedback>
): void => {
  if (!canUseSessionStorage()) return;

  try {
    if (Object.keys(nextMap).length === 0) {
      window.sessionStorage.removeItem(TRADERA_QUICK_LIST_FEEDBACK_STORAGE_KEY);
      return;
    }

    window.sessionStorage.setItem(
      TRADERA_QUICK_LIST_FEEDBACK_STORAGE_KEY,
      JSON.stringify(nextMap)
    );
  } catch {
    // Best-effort UI persistence only.
  }
};

export const readPersistedTraderaQuickListFeedback = (
  productId: string
): PersistedTraderaQuickListFeedback | null => {
  const nextMap = readPersistedFeedbackMap();
  writePersistedFeedbackMap(nextMap);
  return nextMap[productId] ?? null;
};

export const subscribeToTraderaQuickListFeedback = (
  onStoreChange: () => void
): (() => void) => {
  if (typeof window === 'undefined') {
    return () => undefined;
  }

  const handleFeedbackUpdate = (): void => {
    onStoreChange();
  };
  const handleStorage = (event: StorageEvent): void => {
    if (
      event.key !== null &&
      event.key !== TRADERA_QUICK_LIST_FEEDBACK_STORAGE_KEY
    ) {
      return;
    }
    onStoreChange();
  };

  window.addEventListener(
    TRADERA_QUICK_LIST_FEEDBACK_EVENT_NAME,
    handleFeedbackUpdate as EventListener
  );
  window.addEventListener('storage', handleStorage);

  return () => {
    window.removeEventListener(
      TRADERA_QUICK_LIST_FEEDBACK_EVENT_NAME,
      handleFeedbackUpdate as EventListener
    );
    window.removeEventListener('storage', handleStorage);
  };
};

export const persistTraderaQuickListFeedback = (
  productId: string,
  status: TraderaQuickListFeedbackStatus,
  options?: PersistTraderaQuickListFeedbackOptions
): void => {
  if (!productId.trim()) return;

  const nextMap = readPersistedFeedbackMap();
  nextMap[productId] = {
    productId,
    status,
    expiresAt: Date.now() + resolveFeedbackTtlMs(status),
    runId: options?.runId ?? null,
    requestId: options?.requestId ?? null,
    integrationId: options?.integrationId ?? null,
    connectionId: options?.connectionId ?? null,
    failureReason: options?.failureReason ?? null,
    listingId: options?.listingId ?? null,
    listingUrl: options?.listingUrl ?? null,
    externalListingId: options?.externalListingId ?? null,
    completedAt: options?.completedAt ?? null,
    duplicateLinked: options?.duplicateLinked ?? null,
  };
  writePersistedFeedbackMap(nextMap);
  emitTraderaQuickListFeedbackUpdated(productId);
};

export const clearPersistedTraderaQuickListFeedback = (productId: string): void => {
  if (!productId.trim()) return;

  const nextMap = readPersistedFeedbackMap();
  if (!(productId in nextMap)) return;

  delete nextMap[productId];
  writePersistedFeedbackMap(nextMap);
  emitTraderaQuickListFeedbackUpdated(productId);
};
