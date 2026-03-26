'use client';

import { useEffect, useRef, type ReactNode } from 'react';

import {
  trackKangurClientEvent,
  withKangurClientError,
} from '@/features/kangur/observability/client';
import { getKangurPlatform } from '@/features/kangur/services/kangur-platform';
import type { KangurUser } from '@kangur/platform';
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
  type KangurLessonSubject,
  type KangurProgressState,
} from '@/features/kangur/shared/contracts/kangur';
import { useKangurSubjectFocus } from '@/features/kangur/ui/context/KangurSubjectFocusContext';


const kangurPlatform = getKangurPlatform();
const KANGUR_PROGRESS_HYDRATION_CACHE_TTL_MS = 30_000;

type KangurProgressHydrationCacheEntry = {
  progress: KangurProgressState;
  fetchedAt: number;
};

const kangurProgressHydrationCache = new Map<string, KangurProgressHydrationCacheEntry>();
const kangurProgressHydrationInflight = new Map<string, Promise<KangurProgressState>>();

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

const buildKangurProgressHydrationCacheKey = (
  userKey: string,
  subject: KangurLessonSubject
): string => `${userKey}::${subject}`;

const cloneKangurProgressHydrationState = (
  progress: KangurProgressState
): KangurProgressState => structuredClone(progress);

const primeKangurProgressHydrationCache = (
  userKey: string,
  subject: KangurLessonSubject,
  progress: KangurProgressState
): void => {
  kangurProgressHydrationCache.set(buildKangurProgressHydrationCacheKey(userKey, subject), {
    progress: cloneKangurProgressHydrationState(progress),
    fetchedAt: Date.now(),
  });
};

export const clearKangurProgressHydrationCache = (): void => {
  kangurProgressHydrationCache.clear();
  kangurProgressHydrationInflight.clear();
};

const loadRemoteHydrationProgress = async (
  userKey: string,
  subject: KangurLessonSubject
): Promise<KangurProgressState> => {
  const cacheKey = buildKangurProgressHydrationCacheKey(userKey, subject);
  const cached = kangurProgressHydrationCache.get(cacheKey);
  const now = Date.now();
  if (cached && now - cached.fetchedAt < KANGUR_PROGRESS_HYDRATION_CACHE_TTL_MS) {
    return cloneKangurProgressHydrationState(cached.progress);
  }

  const inflight = kangurProgressHydrationInflight.get(cacheKey);
  if (inflight) {
    return cloneKangurProgressHydrationState(await inflight);
  }

  const inflightPromise = kangurPlatform.progress
    .get({ subject })
    .then((progress) => {
      primeKangurProgressHydrationCache(userKey, subject, progress);
      return progress;
    })
    .finally(() => {
      kangurProgressHydrationInflight.delete(cacheKey);
    });

  kangurProgressHydrationInflight.set(cacheKey, inflightPromise);
  return cloneKangurProgressHydrationState(await inflightPromise);
};

const scheduleDeferredCallback = (callback: () => void): (() => void) => {
  if (typeof globalThis.requestIdleCallback === 'function') {
    const idleCallbackId = globalThis.requestIdleCallback(() => {
      callback();
    });

    return () => {
      if (typeof globalThis.cancelIdleCallback === 'function') {
        globalThis.cancelIdleCallback(idleCallbackId);
      }
    };
  }

  const timeoutId = globalThis.setTimeout(callback, 1);
  return () => {
    globalThis.clearTimeout(timeoutId);
  };
};

export function KangurProgressSyncProvider({
  children,
}: {
  children: ReactNode;
}): React.JSX.Element {
  const { isAuthenticated, isLoadingAuth, user } = useKangurAuth();
  const { subject } = useKangurSubjectFocus();
  const isParentWithoutLearner =
    user?.actorType === 'parent' && !user?.activeLearner?.id;
  const userKey = resolveUserProgressKey(user);
  const lastSyncedProgressRef = useRef<string | null>(null);
  const syncStateRef = useRef<'idle' | 'loading' | 'ready'>('idle');

  useEffect(() => {
    lastSyncedProgressRef.current = null;
    syncStateRef.current = 'idle';
  }, [subject, userKey]);

  useEffect(() => {
    setProgressPersistenceEnabled(!isParentWithoutLearner);
  }, [isParentWithoutLearner]);

  // Eagerly initialise guest progress owner key while auth is still loading,
  // so localStorage reads resolve to the anonymous bucket immediately.
  useEffect(() => {
    if (isLoadingAuth && !userKey) {
      saveProgressOwnerKey(null);
    }
  }, [isLoadingAuth, userKey]);

  useEffect(() => {
    if (isLoadingAuth) {
      return;
    }

    if (!isAuthenticated || !userKey) {
      saveProgressOwnerKey(null);
      syncStateRef.current = 'idle';
      lastSyncedProgressRef.current = null;
      return;
    }

    let cancelled = false;
    let cancelDeferredRemoteUpdate: (() => void) | null = null;

    const hydrateProgress = async (): Promise<void> => {
      syncStateRef.current = 'loading';
      const localOwnerKey = loadProgressOwnerKey();

      try {
        const result = await withKangurClientError(
          {
            source: 'kangur.progress-sync',
            action: 'hydrate-progress',
            description: 'Hydrates Kangur progress state from the API.',
            context: { userKey, subject },
          },
          async () => {
            const remoteProgress = await loadRemoteHydrationProgress(userKey, subject);
            if (cancelled) {
              return null;
            }

            const scopedLocalProgress = loadProgress({ ownerKey: userKey });
            const guestLocalProgress =
              localOwnerKey === null ? loadProgress({ ownerKey: null }) : null;
            const localProgress = guestLocalProgress
              ? mergeProgressStates(scopedLocalProgress, guestLocalProgress)
              : scopedLocalProgress;
            const mergedProgress = mergeProgressStates(remoteProgress, localProgress);
            const shouldUpdateLocal =
              !areProgressStatesEqual(localProgress, mergedProgress) || localOwnerKey !== userKey;
            const shouldUpdateRemote = !areProgressStatesEqual(remoteProgress, mergedProgress);

            saveProgressOwnerKey(userKey);

            if (shouldUpdateLocal) {
              saveProgress(mergedProgress, { ownerKey: userKey });
            }

            return {
              mergedProgress,
              shouldUpdateLocal,
              shouldUpdateRemote,
              localOwnerKeyChanged: localOwnerKey !== userKey,
            };
          },
          {
            fallback: null,
            shouldReport: () => !cancelled,
            onError: (error) => {
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
                subject,
              });
            },
          }
        );

        if (!result || cancelled) {
          return;
        }

        trackKangurClientEvent('kangur_progress_hydrated', {
          userKey,
          localOwnerKeyChanged: result.localOwnerKeyChanged,
          updatedLocal: result.shouldUpdateLocal,
          updatedRemote: result.shouldUpdateRemote,
          totalXp: result.mergedProgress.totalXp,
          gamesPlayed: result.mergedProgress.gamesPlayed,
          subject,
        });
        lastSyncedProgressRef.current = serializeProgress(result.mergedProgress);

        if (result.shouldUpdateRemote && !cancelled) {
          cancelDeferredRemoteUpdate = scheduleDeferredCallback(() => {
            if (cancelled) {
              return;
            }
            primeKangurProgressHydrationCache(userKey, subject, result.mergedProgress);
            void kangurPlatform.progress.update(result.mergedProgress, { subject });
          });
        }
      } finally {
        if (!cancelled && syncStateRef.current === 'loading') {
          syncStateRef.current = 'ready';
        }
      }
    };

    void hydrateProgress();

    return () => {
      cancelled = true;
      cancelDeferredRemoteUpdate?.();
    };
  }, [isAuthenticated, isLoadingAuth, subject, userKey]);

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

      void (async () => {
        const savedProgress = await withKangurClientError(
          {
            source: 'kangur.progress-sync',
            action: 'sync-progress',
            description: 'Syncs Kangur progress updates to the API.',
            context: {
              userKey,
              totalXp: progress.totalXp,
              gamesPlayed: progress.gamesPlayed,
              subject,
            },
          },
          async () => await kangurPlatform.progress.update(progress, { subject }),
          {
            fallback: null,
            onError: (error) => {
              if (isKangurAuthStatusError(error)) {
                syncStateRef.current = 'idle';
                return;
              }

              trackKangurClientEvent('kangur_progress_sync_failed', {
                userKey,
                totalXp: progress.totalXp,
                gamesPlayed: progress.gamesPlayed,
                errorMessage: error instanceof Error ? error.message : 'Unknown error',
                subject,
              });
            },
          }
        );

        if (!savedProgress) {
          return;
        }

        primeKangurProgressHydrationCache(userKey, subject, savedProgress);
        const savedSerialized = serializeProgress(savedProgress);
        lastSyncedProgressRef.current = savedSerialized;
        if (!areProgressStatesEqual(progress, savedProgress)) {
          saveProgress(savedProgress, { ownerKey: userKey });
        }
      })();
    });

    return unsubscribe;
  }, [isAuthenticated, isLoadingAuth, subject, userKey]);

  return <>{children}</>;
}
