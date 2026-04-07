'use client';

import { useCallback, useState, useEffect } from 'react';

import { useMarketplaceBadgeStatus } from '@/features/integrations/hooks/useMarketplaceQueries';
import { FAILURE_STATUSES } from '../public';

export type VintedQuickListStatus =
  | 'not_started'
  | 'processing'
  | 'queued'
  | 'active'
  | 'failed'
  | 'auth_required';

export type VintedQuickListFeedback = {
  status: VintedQuickListStatus;
  runId?: string | null;
  requestId?: string | null;
  integrationId?: string | null;
  connectionId?: string | null;
  failureReason?: string | null;
};

export function useVintedQuickExportFeedback(
  productId: string,
  serverStatus?: string,
  showBadge: boolean = false
): {
  localFeedback: VintedQuickListFeedback | null;
  localFeedbackStatus: VintedQuickListStatus | null;
  setFeedbackStatus: (status: VintedQuickListStatus | null, context?: Partial<VintedQuickListFeedback>) => void;
  hasServerStatus: boolean;
  serverStatusInFlight: boolean;
  normalizedVintedStatus: VintedQuickListStatus;
} {
  const { status: badgeStatus, isFetching: serverStatusInFlight } = useMarketplaceBadgeStatus(
    productId,
    'vinted',
    showBadge
  );

  const [localFeedback, setLocalFeedback] = useState<VintedQuickListFeedback | null>(null);

  const setFeedbackStatus = useCallback(
    (status: VintedQuickListStatus | null, context: Partial<VintedQuickListFeedback> = {}) => {
      if (status === null) {
        setLocalFeedback(null);
        return;
      }
      setLocalFeedback({
        status,
        ...context,
      });
    },
    []
  );

  const normalizedVintedStatus = (badgeStatus ?? serverStatus ?? 'not_started') as VintedQuickListStatus;
  const hasServerStatus = Boolean(badgeStatus && badgeStatus !== 'not_started');

  // Sync/clear local feedback
  useEffect(() => {
    if (!localFeedback) return;
    
    // Keep local feedback if we're in an error state to allow recovery
    const isError = FAILURE_STATUSES.has(normalizedVintedStatus) || localFeedback.status === 'auth_required';
    if (isError) return;

    // Clear local feedback once server catches up to terminal active/failed
    if (badgeStatus === 'active' || badgeStatus === 'failed') {
       setLocalFeedback(null);
    }
  }, [badgeStatus, localFeedback, normalizedVintedStatus]);

  return {
    localFeedback,
    localFeedbackStatus: localFeedback?.status ?? null,
    setFeedbackStatus,
    hasServerStatus,
    serverStatusInFlight,
    normalizedVintedStatus,
  };
}
