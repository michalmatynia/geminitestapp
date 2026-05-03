'use client';

import { useCallback, useEffect, useState } from 'react';

import {
  clearPersistedTraderaQuickListFeedback,
  persistTraderaQuickListFeedback,
  readPersistedTraderaQuickListFeedback,
  subscribeToTraderaQuickListFeedback,
  type PersistedTraderaQuickListFeedback,
  type PersistTraderaQuickListFeedbackOptions,
  type TraderaQuickListFeedbackStatus,
} from '@/features/integrations/utils/traderaQuickListFeedback';

type UseTraderaQuickListFeedbackResult = {
  feedback: PersistedTraderaQuickListFeedback | null;
  feedbackStatus: TraderaQuickListFeedbackStatus | null;
  setFeedbackStatus: (
    status: TraderaQuickListFeedbackStatus | null,
    options?: PersistTraderaQuickListFeedbackOptions
  ) => void;
};

export function useTraderaQuickListFeedback(
  productId: string
): UseTraderaQuickListFeedbackResult {
  const [feedback, setFeedback] = useState<PersistedTraderaQuickListFeedback | null>(() =>
    readPersistedTraderaQuickListFeedback(productId)
  );

  useEffect(() => {
    setFeedback(readPersistedTraderaQuickListFeedback(productId));

    return subscribeToTraderaQuickListFeedback(() => {
      setFeedback(readPersistedTraderaQuickListFeedback(productId));
    });
  }, [productId]);

  const setFeedbackStatus = useCallback(
    (
      status: TraderaQuickListFeedbackStatus | null,
      options?: PersistTraderaQuickListFeedbackOptions
    ): void => {
      if (!status) {
        clearPersistedTraderaQuickListFeedback(productId);
        return;
      }

      persistTraderaQuickListFeedback(productId, status, options);
    },
    [productId]
  );

  return {
    feedback,
    feedbackStatus: feedback?.status ?? null,
    setFeedbackStatus,
  };
}
