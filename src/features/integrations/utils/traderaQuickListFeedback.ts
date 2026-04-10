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

export const readPersistedTraderaQuickListFeedback = (
  productId: string
): PersistedTraderaQuickListFeedback | null =>
  readPersistedMarketplaceFeedback(TRADERA_FEEDBACK_CONFIG, productId);

export const subscribeToTraderaQuickListFeedback = (
  onStoreChange: () => void
): (() => void) => subscribeToMarketplaceFeedback(TRADERA_FEEDBACK_CONFIG, onStoreChange);

export const persistTraderaQuickListFeedback = (
  productId: string,
  status: TraderaQuickListFeedbackStatus,
  options?: PersistTraderaQuickListFeedbackOptions
): void => persistMarketplaceFeedback(TRADERA_FEEDBACK_CONFIG, productId, status, options);

export const clearPersistedTraderaQuickListFeedback = (productId: string): void =>
  clearPersistedMarketplaceFeedback(TRADERA_FEEDBACK_CONFIG, productId);
