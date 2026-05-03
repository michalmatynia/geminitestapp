import type {
  QuickExportFeedbackStatus as TraderaQuickListFeedbackStatus,
  PersistedQuickExportFeedback as PersistedTraderaQuickListFeedback,
  QuickExportFeedbackOptions as PersistTraderaQuickListFeedbackOptions,
} from '@/shared/contracts/integrations/listings';

import {
  type MarketplaceFeedbackConfig,
  readPersistedMarketplaceFeedback,
  persistMarketplaceFeedback,
  clearPersistedMarketplaceFeedback,
  subscribeToMarketplaceFeedback,
} from './marketplace-feedback-utils';

export type {
  TraderaQuickListFeedbackStatus,
  PersistedTraderaQuickListFeedback,
  PersistTraderaQuickListFeedbackOptions,
};

export const TRADERA_QUICK_LIST_FEEDBACK_EVENT_NAME =
  'integrations:tradera-quick-list-feedback-updated';

export const TRADERA_QUICK_LIST_FEEDBACK_STORAGE_KEY = 'tradera-quick-list-feedback';

export const TRADERA_FEEDBACK_CONFIG: MarketplaceFeedbackConfig = {
  storageKey: TRADERA_QUICK_LIST_FEEDBACK_STORAGE_KEY,
  eventName: TRADERA_QUICK_LIST_FEEDBACK_EVENT_NAME,
};

const toRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};

const readString = (value: unknown): string | null =>
  typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;

const resolveDuplicateMatchStrategyFromOptions = (
  options?: PersistTraderaQuickListFeedbackOptions
): string | null => {
  const record = toRecord(options);
  return (
    readString(record['duplicateMatchStrategy']) ??
    readString(toRecord(record['metadata'])['duplicateMatchStrategy']) ??
    readString(toRecord(toRecord(record['metadata'])['rawResult'])['duplicateMatchStrategy']) ??
    null
  );
};

const normalizeTraderaFeedback = (
  feedback: PersistedTraderaQuickListFeedback | null
): PersistedTraderaQuickListFeedback | null => {
  if (!feedback) {
    return null;
  }

  const duplicateLinked =
    feedback.duplicateLinked === true || Boolean(feedback.duplicateMatchStrategy);
  if (
    duplicateLinked &&
    (feedback.status === 'failed' || feedback.status === 'auth_required')
  ) {
    return {
      ...feedback,
      status: 'completed',
      failureReason: null,
    };
  }

  return feedback;
};

export const readPersistedTraderaQuickListFeedback = (
  productId: string
): PersistedTraderaQuickListFeedback | null => {
  const persisted = readPersistedMarketplaceFeedback(TRADERA_FEEDBACK_CONFIG, productId);
  const normalized = normalizeTraderaFeedback(persisted);

  if (
    normalized &&
    persisted &&
    (normalized.status !== persisted.status || normalized.failureReason !== persisted.failureReason)
  ) {
    persistMarketplaceFeedback(TRADERA_FEEDBACK_CONFIG, productId, normalized.status, normalized);
  }

  return normalized;
};

export const subscribeToTraderaQuickListFeedback = (
  onStoreChange: () => void
): (() => void) => subscribeToMarketplaceFeedback(TRADERA_FEEDBACK_CONFIG, onStoreChange);

export const persistTraderaQuickListFeedback = (
  productId: string,
  status: TraderaQuickListFeedbackStatus,
  options?: PersistTraderaQuickListFeedbackOptions
): void => {
  const duplicateLinked =
    options?.duplicateLinked === true || Boolean(resolveDuplicateMatchStrategyFromOptions(options));
  const normalizedStatus =
    duplicateLinked && (status === 'failed' || status === 'auth_required')
      ? 'completed'
      : status;

  persistMarketplaceFeedback(TRADERA_FEEDBACK_CONFIG, productId, normalizedStatus, {
    ...options,
    ...(normalizedStatus === 'completed' ? { failureReason: null } : {}),
  });
};

export const clearPersistedTraderaQuickListFeedback = (productId: string): void =>
  clearPersistedMarketplaceFeedback(TRADERA_FEEDBACK_CONFIG, productId);
