'use client';

import { useEffect, useRef, type ReactNode } from 'react';

import {
  logKangurClientError,
  trackKangurClientEvent,
} from '@/features/kangur/observability/client';
import { getKangurPlatform } from '@/features/kangur/services/kangur-platform';
import type { KangurUser } from '@/features/kangur/services/ports';
import { isKangurAuthStatusError } from '@/features/kangur/services/status-errors';
import { useKangurAuth } from '@/features/kangur/ui/context/KangurAuthContext';
import {
  areProgressStatesEqual,
  loadProgress,
  loadProgressOwnerKey,
  mergeProgressStates,
  saveProgress,
  saveProgressOwnerKey,
  subscribeToProgress,
  setProgressPersistenceEnabled,
} from '@/features/kangur/ui/services/progress';
import {
  createDefaultKangurProgressState,
  type KangurProgressState,
} from '@/shared/contracts/kangur';

const kangurPlatform = getKangurPlatform();

const resolveUserProgressKey = (user: KangurUser | null): string | null => {
  const activeLearnerId = user?.activeLearner?.id?.trim();
  if (activeLearnerId) {
    return activeLearnerId;
  }

  if (user?.actorType === 'parent') {
    return null;
  }

  if (user?.actorType === 'learner') {
    const id = user?.id?.trim();
    return id && id.length > 0 ? id : null;
  }

  return null;
};

const serializeProgress = (progress: KangurProgressState): string => JSON.stringify(progress);

export function KangurProgressSyncProvider({
  children,
}: {
  children: ReactNode;
}): React.JSX.Element {
  const { isAuthenticated, isLoadingAuth, user } = useKangurAuth();
  const isParentWithoutLearner =
    user?.actorType === 'parent' && !user?.activeLearner?.id;
  const userKey = resolveUserProgressKey(user);
  const lastSyncedProgressRef = useRef<string | null>(null);
  const syncStateRef = useRef<'idle' | 'loading' | 'ready'>('idle');

  useEffect(() => {
    setProgressPersistenceEnabled(!isParentWithoutLearner);
  }, [isParentWithoutLearner]);

  useEffect(() => {
    if (isLoadingAuth) {
      return;
    }

    if (!isAuthenticated || !userKey) {
      syncStateRef.current = 'idle';
      lastSyncedProgressRef.current = null;
      return;
    }

    let cancelled = false;

    const hydrateProgress = async (): Promise<void> => {
      syncStateRef.current = 'loading';
      const localOwnerKey = loadProgressOwnerKey();

      if (localOwnerKey && localOwnerKey !== userKey) {
        saveProgressOwnerKey(userKey);
        saveProgress(createDefaultKangurProgressState());
      }

      try {
        const remoteProgress = await kangurPlatform.progress.get();
        if (cancelled) {
          return;
        }

        const localProgress =
          localOwnerKey && localOwnerKey !== userKey
            ? createDefaultKangurProgressState()
            : loadProgress();
        const mergedProgress = mergeProgressStates(remoteProgress, localProgress);
        const shouldUpdateLocal =
          !areProgressStatesEqual(localProgress, mergedProgress) || localOwnerKey !== userKey;
        const shouldUpdateRemote = !areProgressStatesEqual(remoteProgress, mergedProgress);

        saveProgressOwnerKey(userKey);

        if (shouldUpdateLocal) {
          saveProgress(mergedProgress);
        }

        if (shouldUpdateRemote) {
          await kangurPlatform.progress.update(mergedProgress);
          if (cancelled) {
            return;
          }
        }

        trackKangurClientEvent('kangur_progress_hydrated', {
          userKey,
          localOwnerKeyChanged: localOwnerKey !== userKey,
          updatedLocal: shouldUpdateLocal,
          updatedRemote: shouldUpdateRemote,
          totalXp: mergedProgress.totalXp,
          gamesPlayed: mergedProgress.gamesPlayed,
        });
        lastSyncedProgressRef.current = serializeProgress(mergedProgress);
      } catch (error: unknown) {
        if (cancelled) {
          return;
        }

        if (isKangurAuthStatusError(error)) {
          syncStateRef.current = 'idle';
          return;
        }

        trackKangurClientEvent('kangur_progress_hydration_failed', {
          userKey,
          errorMessage: error instanceof Error ? error.message : 'Unknown error',
        });
        logKangurClientError(error, {
          source: 'KangurProgressSyncProvider',
          action: 'hydrateProgress',
          hasUser: true,
        });
      } finally {
        if (!cancelled && syncStateRef.current !== 'idle') {
          syncStateRef.current = 'ready';
        }
      }
    };

    void hydrateProgress();

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, isLoadingAuth, userKey]);

  useEffect(() => {
    if (isLoadingAuth || !isAuthenticated || !userKey) {
      return;
    }

    const unsubscribe = subscribeToProgress((progress) => {
      if (syncStateRef.current !== 'ready') {
        return;
      }

      const serialized = serializeProgress(progress);
      if (serialized === lastSyncedProgressRef.current) {
        return;
      }

      saveProgressOwnerKey(userKey);

      void kangurPlatform.progress
        .update(progress)
        .then((savedProgress) => {
          const savedSerialized = serializeProgress(savedProgress);
          lastSyncedProgressRef.current = savedSerialized;
          if (!areProgressStatesEqual(progress, savedProgress)) {
            saveProgress(savedProgress);
          }
        })
        .catch((error: unknown) => {
          if (isKangurAuthStatusError(error)) {
            syncStateRef.current = 'idle';
            return;
          }

          trackKangurClientEvent('kangur_progress_sync_failed', {
            userKey,
            totalXp: progress.totalXp,
            gamesPlayed: progress.gamesPlayed,
            errorMessage: error instanceof Error ? error.message : 'Unknown error',
          });
          logKangurClientError(error, {
            source: 'KangurProgressSyncProvider',
            action: 'syncProgress',
            hasUser: true,
          });
        });
    });

    return unsubscribe;
  }, [isAuthenticated, isLoadingAuth, userKey]);

  return <>{children}</>;
}
