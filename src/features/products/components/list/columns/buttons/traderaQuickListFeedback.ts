type TraderaQuickListFeedbackStatus = 'processing' | 'queued' | 'failed' | 'auth_required';

export type PersistedTraderaQuickListFeedback = {
  productId: string;
  status: TraderaQuickListFeedbackStatus;
  expiresAt: number;
  runId?: string | null | undefined;
  requestId?: string | null | undefined;
  integrationId?: string | null | undefined;
  connectionId?: string | null | undefined;
};

export const TRADERA_QUICK_LIST_FEEDBACK_STORAGE_KEY = 'tradera-quick-list-feedback';

const PROCESSING_FEEDBACK_TTL_MS = 2 * 60 * 1000;
const QUEUED_FEEDBACK_TTL_MS = 45 * 1000;
const FAILED_FEEDBACK_TTL_MS = 30 * 60 * 1000;

const canUseSessionStorage = (): boolean =>
  typeof window !== 'undefined' && typeof window.sessionStorage !== 'undefined';

const resolveFeedbackTtlMs = (status: TraderaQuickListFeedbackStatus): number =>
  status === 'processing'
    ? PROCESSING_FEEDBACK_TTL_MS
    : status === 'queued'
      ? QUEUED_FEEDBACK_TTL_MS
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

      if (
        status !== 'processing' &&
        status !== 'queued' &&
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
          };
        }
        return;
      }

      next[productId] = {
        productId,
        status,
        expiresAt,
        runId,
        requestId,
        integrationId,
        connectionId,
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

export const persistTraderaQuickListFeedback = (
  productId: string,
  status: TraderaQuickListFeedbackStatus,
  options?: {
    runId?: string | null | undefined;
    requestId?: string | null | undefined;
    integrationId?: string | null | undefined;
    connectionId?: string | null | undefined;
  }
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
  };
  writePersistedFeedbackMap(nextMap);
};

export const clearPersistedTraderaQuickListFeedback = (productId: string): void => {
  if (!productId.trim()) return;

  const nextMap = readPersistedFeedbackMap();
  if (!(productId in nextMap)) return;

  delete nextMap[productId];
  writePersistedFeedbackMap(nextMap);
};
