export type VintedQuickListFeedbackStatus =
  | 'processing'
  | 'queued'
  | 'completed'
  | 'failed'
  | 'auth_required';

export const VINTED_QUICK_LIST_FEEDBACK_EVENT_NAME =
  'integrations:vinted-quick-list-feedback-updated';

export type PersistedVintedQuickListFeedback = {
  productId: string;
  status: VintedQuickListFeedbackStatus;
  expiresAt: number;
  failureReason?: string | null | undefined;
  runId?: string | null | undefined;
  requestId?: string | null | undefined;
  integrationId?: string | null | undefined;
  connectionId?: string | null | undefined;
  listingId?: string | null | undefined;
  listingUrl?: string | null | undefined;
  externalListingId?: string | null | undefined;
  completedAt?: number | null | undefined;
};

export type PersistVintedQuickListFeedbackOptions = {
  runId?: string | null | undefined;
  requestId?: string | null | undefined;
  integrationId?: string | null | undefined;
  connectionId?: string | null | undefined;
  failureReason?: string | null | undefined;
  listingId?: string | null | undefined;
  listingUrl?: string | null | undefined;
  externalListingId?: string | null | undefined;
  completedAt?: number | null | undefined;
};

export const VINTED_QUICK_LIST_FEEDBACK_STORAGE_KEY = 'vinted-quick-list-feedback';

const PROCESSING_FEEDBACK_TTL_MS = 2 * 60 * 1000;
const QUEUED_FEEDBACK_TTL_MS = 120 * 1000;
const COMPLETED_FEEDBACK_TTL_MS = 5 * 60 * 1000;
const FAILED_FEEDBACK_TTL_MS = 30 * 60 * 1000;

const canUseSessionStorage = (): boolean =>
  typeof window !== 'undefined' && typeof window.sessionStorage !== 'undefined';

const emitVintedQuickListFeedbackUpdated = (productId: string): void => {
  if (typeof window === 'undefined') return;

  window.dispatchEvent(
    new CustomEvent(VINTED_QUICK_LIST_FEEDBACK_EVENT_NAME, {
      detail: { productId },
    })
  );
};

const resolveFeedbackTtlMs = (status: VintedQuickListFeedbackStatus): number =>
  status === 'processing'
    ? PROCESSING_FEEDBACK_TTL_MS
    : status === 'queued'
      ? QUEUED_FEEDBACK_TTL_MS
      : status === 'completed'
        ? COMPLETED_FEEDBACK_TTL_MS
        : FAILED_FEEDBACK_TTL_MS;

const readPersistedFeedbackMap = (): Record<string, PersistedVintedQuickListFeedback> => {
  if (!canUseSessionStorage()) return {};

  try {
    const raw = window.sessionStorage.getItem(VINTED_QUICK_LIST_FEEDBACK_STORAGE_KEY);
    if (!raw) return {};

    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return {};
    }

    const now = Date.now();
    const next: Record<string, PersistedVintedQuickListFeedback> = {};

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
        typeof record['externalListingId'] === 'string' &&
        record['externalListingId'].trim().length > 0
          ? record['externalListingId'].trim()
          : null;
      const completedAt =
        typeof record['completedAt'] === 'number' && Number.isFinite(record['completedAt'])
          ? record['completedAt']
          : null;

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
      };
    });

    return next;
  } catch {
    return {};
  }
};

const writePersistedFeedbackMap = (
  nextMap: Record<string, PersistedVintedQuickListFeedback>
): void => {
  if (!canUseSessionStorage()) return;

  try {
    if (Object.keys(nextMap).length === 0) {
      window.sessionStorage.removeItem(VINTED_QUICK_LIST_FEEDBACK_STORAGE_KEY);
      return;
    }

    window.sessionStorage.setItem(
      VINTED_QUICK_LIST_FEEDBACK_STORAGE_KEY,
      JSON.stringify(nextMap)
    );
  } catch {
    // Best-effort UI persistence only.
  }
};

export const readPersistedVintedQuickListFeedback = (
  productId: string
): PersistedVintedQuickListFeedback | null => {
  const nextMap = readPersistedFeedbackMap();
  writePersistedFeedbackMap(nextMap);
  return nextMap[productId] ?? null;
};

export const subscribeToVintedQuickListFeedback = (
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
      event.key !== VINTED_QUICK_LIST_FEEDBACK_STORAGE_KEY
    ) {
      return;
    }
    onStoreChange();
  };

  window.addEventListener(
    VINTED_QUICK_LIST_FEEDBACK_EVENT_NAME,
    handleFeedbackUpdate as EventListener
  );
  window.addEventListener('storage', handleStorage);

  return () => {
    window.removeEventListener(
      VINTED_QUICK_LIST_FEEDBACK_EVENT_NAME,
      handleFeedbackUpdate as EventListener
    );
    window.removeEventListener('storage', handleStorage);
  };
};

export const persistVintedQuickListFeedback = (
  productId: string,
  status: VintedQuickListFeedbackStatus,
  options?: PersistVintedQuickListFeedbackOptions
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
  };
  writePersistedFeedbackMap(nextMap);
  emitVintedQuickListFeedbackUpdated(productId);
};

export const clearPersistedVintedQuickListFeedback = (productId: string): void => {
  if (!productId.trim()) return;

  const nextMap = readPersistedFeedbackMap();
  if (!(productId in nextMap)) return;

  delete nextMap[productId];
  writePersistedFeedbackMap(nextMap);
  emitVintedQuickListFeedbackUpdated(productId);
};
