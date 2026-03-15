'use client';

import { useEffect, type ReactNode } from 'react';

import {
  logKangurClientError,
  trackKangurClientEvent,
} from '@/features/kangur/observability/client';
import { syncGuestKangurScores } from '@/features/kangur/services/guest-kangur-scores';
import { getKangurPlatform } from '@/features/kangur/services/kangur-platform';
import { isKangurAuthStatusError } from '@/features/kangur/services/status-errors';
import { useKangurAuth } from '@/features/kangur/ui/context/KangurAuthContext';

const kangurPlatform = getKangurPlatform();

const resolveAuthenticatedLearnerKey = (
  user: ReturnType<typeof useKangurAuth>['user']
): string | null => {
  if (user?.actorType === 'parent') {
    return null;
  }

  const activeLearnerId = user?.activeLearner?.id?.trim();
  if (activeLearnerId) {
    return activeLearnerId;
  }

  const userId = user?.id?.trim();
  return userId && userId.length > 0 ? userId : null;
};

export function KangurScoreSyncProvider({
  children,
}: {
  children: ReactNode;
}): React.JSX.Element {
  const { isAuthenticated, isLoadingAuth, user } = useKangurAuth();
  const learnerKey = resolveAuthenticatedLearnerKey(user);

  useEffect(() => {
    if (isLoadingAuth || !isAuthenticated || !learnerKey) {
      return;
    }

    let cancelled = false;

    const syncScores = async (): Promise<void> => {
      try {
        const result = await syncGuestKangurScores({
          persistScore: (payload) => kangurPlatform.score.create(payload),
        });
        if (cancelled || result.syncedCount === 0) {
          return;
        }

        trackKangurClientEvent('kangur_guest_scores_synced', {
          learnerKey,
          syncedCount: result.syncedCount,
          remainingCount: result.remainingCount,
        });
      } catch (error: unknown) {
        if (cancelled || isKangurAuthStatusError(error)) {
          return;
        }

        trackKangurClientEvent('kangur_guest_scores_sync_failed', {
          learnerKey,
          errorMessage: error instanceof Error ? error.message : 'Unknown error',
        });
        logKangurClientError(error, {
          source: 'KangurScoreSyncProvider',
          action: 'syncGuestScores',
          learnerKey,
        });
      }
    };

    void syncScores();

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, isLoadingAuth, learnerKey]);

  return <>{children}</>;
}
