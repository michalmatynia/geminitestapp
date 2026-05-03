import type {
  QuickExportFeedbackStatus as VintedQuickListFeedbackStatus,
  PersistedQuickExportFeedback as PersistedVintedQuickListFeedback,
  QuickExportFeedbackOptions as PersistVintedQuickListFeedbackOptions,
} from '@/shared/contracts/integrations/listings';

import {
  type MarketplaceFeedbackConfig,
  readPersistedMarketplaceFeedback,
  persistMarketplaceFeedback,
  clearPersistedMarketplaceFeedback,
  subscribeToMarketplaceFeedback,
} from './marketplace-feedback-utils';

export type {
  VintedQuickListFeedbackStatus,
  PersistedVintedQuickListFeedback,
  PersistVintedQuickListFeedbackOptions,
};

export const VINTED_QUICK_LIST_FEEDBACK_EVENT_NAME =
  'integrations:vinted-quick-list-feedback-updated';

export const VINTED_QUICK_LIST_FEEDBACK_STORAGE_KEY = 'vinted-quick-list-feedback';

export const VINTED_FEEDBACK_CONFIG: MarketplaceFeedbackConfig = {
  storageKey: VINTED_QUICK_LIST_FEEDBACK_STORAGE_KEY,
  eventName: VINTED_QUICK_LIST_FEEDBACK_EVENT_NAME,
};

export const readPersistedVintedQuickListFeedback = (
  productId: string
): PersistedVintedQuickListFeedback | null =>
  readPersistedMarketplaceFeedback(VINTED_FEEDBACK_CONFIG, productId);

export const subscribeToVintedQuickListFeedback = (
  onStoreChange: () => void
): (() => void) => subscribeToMarketplaceFeedback(VINTED_FEEDBACK_CONFIG, onStoreChange);

export const persistVintedQuickListFeedback = (
  productId: string,
  status: VintedQuickListFeedbackStatus,
  options?: PersistVintedQuickListFeedbackOptions
): void => persistMarketplaceFeedback(VINTED_FEEDBACK_CONFIG, productId, status, options);

export const clearPersistedVintedQuickListFeedback = (productId: string): void =>
  clearPersistedMarketplaceFeedback(VINTED_FEEDBACK_CONFIG, productId);
