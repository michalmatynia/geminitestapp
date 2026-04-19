'use client';

import { useEffect, type ReactNode } from 'react';

import {
  trackKangurClientEvent,
  withKangurClientError,
} from '@/features/kangur/observability/client';
import { syncGuestKangurScores } from '@/features/kangur/services/guest-kangur-scores';
import { getKangurPlatform } from '@/features/kangur/services/kangur-platform';
import { isKangurAuthStatusError } from '@/features/kangur/services/status-errors';
import {
  useKangurAuthSessionState,
  useKangurAuthStatusState,
} from '@/features/kangur/ui/context/KangurAuthContext';
import { useOptionalKangurRouting } from '@/features/kangur/ui/context/KangurRoutingContext';
import { resolveKangurUserScopeKey } from '@/features/kangur/ui/context/kangur-user-scope';

const kangurPlatform = getKangurPlatform();
const HOME_GUEST_SCORE_SYNC_DELAY_MS = 2_000;

type KangurScoreSyncState = {
  cancelled: boolean;
};

type KangurScoreSyncResult = Awaited<ReturnType<typeof syncGuestKangurScores>> | null;

const reportGuestScoreSyncError = (
  error: unknown,
  learnerKey: string,
  state: KangurScoreSyncState
): void => {
  if (state.cancelled || isKangurAuthStatusError(error)) {
    return;
  }

  trackKangurClientEvent('kangur_guest_scores_sync_failed', {
    learnerKey,
    errorMessage: error instanceof Error ? error.message : 'Unknown error',
  });
};

const syncGuestScoresForLearner = async (
  learnerKey: string,
  state: KangurScoreSyncState
): Promise<KangurScoreSyncResult> =>
  withKangurClientError(
    () => ({
      source: 'kangur.score-sync',
      action: 'sync-guest-scores',
      description: 'Syncs guest Kangur scores to the authenticated account.',
      context: { learnerKey },
    }),
    async () =>
      await syncGuestKangurScores({
        persistScore: (payload) => kangurPlatform.score.create(payload),
      }),
    {
      fallback: null,
      shouldReport: () => !state.cancelled,
      onError: (error) => reportGuestScoreSyncError(error, learnerKey, state),
    }
  );

const reportCompletedGuestScoreSync = (
  learnerKey: string,
  result: KangurScoreSyncResult,
  state: KangurScoreSyncState
): void => {
  if (result === null || state.cancelled || result.syncedCount === 0) {
    return;
  }

  trackKangurClientEvent('kangur_guest_scores_synced', {
    learnerKey,
    syncedCount: result.syncedCount,
    remainingCount: result.remainingCount,
  });
};

const scheduleGuestScoreSync = (
  syncScores: () => Promise<void>,
  delayMs: number
): number => {
  if (delayMs > 0) {
    return window.setTimeout(() => {
      syncScores().catch((error: unknown) => {
        trackKangurClientEvent('kangur_guest_scores_sync_failed', {
          learnerKey: 'unknown',
          errorMessage: error instanceof Error ? error.message : 'Unknown error',
        });
      });
    }, delayMs);
  }

  const scheduleSync =
    typeof globalThis.requestIdleCallback === 'function'
      ? globalThis.requestIdleCallback
      : (cb: () => void): number => window.setTimeout(cb, 1);

  return scheduleSync(() => {
    syncScores().catch((error: unknown) => {
      trackKangurClientEvent('kangur_guest_scores_sync_failed', {
        learnerKey: 'unknown',
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
      });
    });
  });
};

const cancelGuestScoreSync = (idleHandle: number): void => {
  if (typeof globalThis.cancelIdleCallback === 'function') {
    globalThis.cancelIdleCallback(idleHandle);
    return;
  }

  window.clearTimeout(idleHandle);
};

const useGuestScoreSync = ({
  initialDelayMs,
  isAuthenticated,
  isLoadingAuth,
  learnerKey,
}: {
  initialDelayMs: number;
  isAuthenticated: boolean;
  isLoadingAuth: boolean;
  learnerKey: string | null;
}): void => {
  useEffect(() => {
    if (isLoadingAuth || !isAuthenticated || learnerKey === null) {
      return undefined;
    }

    const state: KangurScoreSyncState = { cancelled: false };

    const syncScores = async (): Promise<void> => {
      const result = await syncGuestScoresForLearner(learnerKey, state);
      reportCompletedGuestScoreSync(learnerKey, result, state);
    };

    const idleHandle = scheduleGuestScoreSync(syncScores, initialDelayMs);

    return () => {
      state.cancelled = true;
      cancelGuestScoreSync(idleHandle);
    };
  }, [initialDelayMs, isAuthenticated, isLoadingAuth, learnerKey]);
};

export function KangurScoreSyncProvider({
  children,
}: {
  children?: ReactNode;
}): React.JSX.Element | null {
  const { isAuthenticated, user } = useKangurAuthSessionState();
  const { isLoadingAuth } = useKangurAuthStatusState();
  const routing = useOptionalKangurRouting();
  const learnerKey = resolveKangurUserScopeKey(user);
  const initialDelayMs =
    routing?.embedded === false && routing.pageKey === 'Game'
      ? HOME_GUEST_SCORE_SYNC_DELAY_MS
      : 0;

  useGuestScoreSync({ initialDelayMs, isAuthenticated, isLoadingAuth, learnerKey });

  return children !== null && children !== undefined ? <>{children}</> : null;
}
