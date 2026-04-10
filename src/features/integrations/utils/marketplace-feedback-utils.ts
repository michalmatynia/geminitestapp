import type {
  QuickExportFeedbackStatus,
  PersistedQuickExportFeedback,
  QuickExportFeedbackOptions,
} from '@/shared/contracts/integrations/listings';

export interface MarketplaceFeedbackConfig {
  storageKey: string;
  eventName: string;
}

const PROCESSING_FEEDBACK_TTL_MS = 2 * 60 * 1000;
const QUEUED_FEEDBACK_TTL_MS = 120 * 1000;
const COMPLETED_FEEDBACK_TTL_MS = 5 * 60 * 1000;
const FAILED_FEEDBACK_TTL_MS = 30 * 60 * 1000;

const canUseSessionStorage = (): boolean =>
  typeof window !== 'undefined' && typeof window.sessionStorage !== 'undefined';

const resolveFeedbackTtlMs = (status: QuickExportFeedbackStatus): number =>
  status === 'processing'
    ? PROCESSING_FEEDBACK_TTL_MS
    : status === 'queued'
      ? QUEUED_FEEDBACK_TTL_MS
      : status === 'completed'
        ? COMPLETED_FEEDBACK_TTL_MS
        : FAILED_FEEDBACK_TTL_MS;

const emitFeedbackUpdated = (config: MarketplaceFeedbackConfig, productId: string): void => {
  if (typeof window === 'undefined') return;

  window.dispatchEvent(
    new CustomEvent(config.eventName, {
      detail: { productId },
    })
  );
};

const readPersistedFeedbackMap = (
  config: MarketplaceFeedbackConfig
): Record<string, PersistedQuickExportFeedback> => {
  if (!canUseSessionStorage()) return {};

  try {
    const raw = window.sessionStorage.getItem(config.storageKey);
    if (!raw) return {};

    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return {};
    }

    const now = Date.now();
    const next: Record<string, PersistedQuickExportFeedback> = {};

    Object.entries(parsed as Record<string, unknown>).forEach(([productId, value]) => {
      if (!value || typeof value !== 'object' || Array.isArray(value)) return;

      const record = value as Record<string, unknown>;
      const status = record['status'] as QuickExportFeedbackStatus;
      const expiresAt = record['expiresAt'] as number;

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
            ...record,
            productId,
            status: 'failed',
            expiresAt: now + resolveFeedbackTtlMs('failed'),
          } as PersistedQuickExportFeedback;
        }
        return;
      }

      next[productId] = {
        ...record,
        productId,
        status,
        expiresAt,
      } as PersistedQuickExportFeedback;
    });

    return next;
  } catch {
    return {};
  }
};

const writePersistedFeedbackMap = (
  config: MarketplaceFeedbackConfig,
  nextMap: Record<string, PersistedQuickExportFeedback>
): void => {
  if (!canUseSessionStorage()) return;

  try {
    if (Object.keys(nextMap).length === 0) {
      window.sessionStorage.removeItem(config.storageKey);
      return;
    }

    window.sessionStorage.setItem(config.storageKey, JSON.stringify(nextMap));
  } catch {
    // Best-effort UI persistence only.
  }
};

export const readPersistedMarketplaceFeedback = (
  config: MarketplaceFeedbackConfig,
  productId: string
): PersistedQuickExportFeedback | null => {
  const nextMap = readPersistedFeedbackMap(config);
  writePersistedFeedbackMap(config, nextMap);
  return nextMap[productId] ?? null;
};

export const persistMarketplaceFeedback = (
  config: MarketplaceFeedbackConfig,
  productId: string,
  status: QuickExportFeedbackStatus,
  options?: QuickExportFeedbackOptions
): void => {
  if (!productId.trim()) return;

  const nextMap = readPersistedFeedbackMap(config);
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
    metadata: options?.metadata,
  };
  writePersistedFeedbackMap(config, nextMap);
  emitFeedbackUpdated(config, productId);
};

export const clearPersistedMarketplaceFeedback = (
  config: MarketplaceFeedbackConfig,
  productId: string
): void => {
  if (!productId.trim()) return;

  const nextMap = readPersistedFeedbackMap(config);
  if (!(productId in nextMap)) return;

  delete nextMap[productId];
  writePersistedFeedbackMap(config, nextMap);
  emitFeedbackUpdated(config, productId);
};

export const subscribeToMarketplaceFeedback = (
  config: MarketplaceFeedbackConfig,
  onStoreChange: () => void
): (() => void) => {
  if (typeof window === 'undefined') {
    return () => undefined;
  }

  const handleFeedbackUpdate = (): void => {
    onStoreChange();
  };
  const handleStorage = (event: StorageEvent): void => {
    if (event.key !== null && event.key !== config.storageKey) {
      return;
    }
    onStoreChange();
  };

  window.addEventListener(config.eventName, handleFeedbackUpdate as EventListener);
  window.addEventListener('storage', handleStorage);

  return () => {
    window.removeEventListener(config.eventName, handleFeedbackUpdate as EventListener);
    window.removeEventListener('storage', handleStorage);
  };
};
