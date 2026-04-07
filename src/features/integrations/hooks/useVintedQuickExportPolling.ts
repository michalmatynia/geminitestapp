'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';

import { useMarketplaceBadgeStatus } from '@/features/integrations/hooks/useMarketplaceQueries';
import { invalidateProductListingsAndBadges } from '@/shared/lib/query-invalidation';

import type { VintedQuickListFeedback, VintedQuickListStatus } from './useVintedQuickExportFeedback';

export function useVintedQuickExportPolling(
  productId: string,
  localFeedback: VintedQuickListFeedback | null,
  setFeedbackStatus: (status: VintedQuickListStatus | null) => void
): void {
  const queryClient = useQueryClient();
  const { status: serverBadgeStatus } = useMarketplaceBadgeStatus(
    productId,
    'vinted',
    Boolean(localFeedback)
  );

  const localStatus = localFeedback?.status;
  const isPollingRef = useRef(false);

  useEffect(() => {
    if (localStatus !== 'queued' && localStatus !== 'processing') {
      isPollingRef.current = false;
      return;
    }

    if (isPollingRef.current) return;
    isPollingRef.current = true;

    const poll = async (): Promise<void> => {
      if (!isPollingRef.current) return;

      await invalidateProductListingsAndBadges(queryClient, productId);
      
      if (serverBadgeStatus === 'active' || serverBadgeStatus === 'failed') {
        setFeedbackStatus(null);
        isPollingRef.current = false;
        return;
      }

      setTimeout(() => {
        void poll();
      }, 3000);
    };

    void poll();

    return () => {
      isPollingRef.current = false;
    };
  }, [localStatus, productId, queryClient, serverBadgeStatus, setFeedbackStatus]);
}
