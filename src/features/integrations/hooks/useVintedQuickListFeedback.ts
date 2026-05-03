'use client';

import { useCallback, useEffect, useState } from 'react';

import {
  clearPersistedVintedQuickListFeedback,
  persistVintedQuickListFeedback,
  readPersistedVintedQuickListFeedback,
  subscribeToVintedQuickListFeedback,
  type PersistedVintedQuickListFeedback,
  type PersistVintedQuickListFeedbackOptions,
  type VintedQuickListFeedbackStatus,
} from '@/features/integrations/utils/vintedQuickListFeedback';

type UseVintedQuickListFeedbackResult = {
  feedback: PersistedVintedQuickListFeedback | null;
  feedbackStatus: VintedQuickListFeedbackStatus | null;
  setFeedbackStatus: (
    status: VintedQuickListFeedbackStatus | null,
    options?: PersistVintedQuickListFeedbackOptions
  ) => void;
};

export function useVintedQuickListFeedback(
  productId: string
): UseVintedQuickListFeedbackResult {
  const [feedback, setFeedback] = useState<PersistedVintedQuickListFeedback | null>(() =>
    readPersistedVintedQuickListFeedback(productId)
  );

  useEffect(() => {
    setFeedback(readPersistedVintedQuickListFeedback(productId));

    return subscribeToVintedQuickListFeedback(() => {
      setFeedback(readPersistedVintedQuickListFeedback(productId));
    });
  }, [productId]);

  const setFeedbackStatus = useCallback(
    (
      status: VintedQuickListFeedbackStatus | null,
      options?: PersistVintedQuickListFeedbackOptions
    ): void => {
      if (!status) {
        clearPersistedVintedQuickListFeedback(productId);
        return;
      }

      persistVintedQuickListFeedback(productId, status, options);
    },
    [productId]
  );

  return {
    feedback,
    feedbackStatus: feedback?.status ?? null,
    setFeedbackStatus,
  };
}
