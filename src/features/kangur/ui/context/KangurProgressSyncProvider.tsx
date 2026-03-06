'use client';

import { useEffect, useRef, type ReactNode } from 'react';

import { createDefaultKangurProgressState } from '@/shared/contracts/kangur';
import { logKangurClientError } from '@/features/kangur/observability/client';
import { getKangurPlatform } from '@/features/kangur/services/kangur-platform';
import type { KangurProgressRecord, KangurUser } from '@/features/kangur/services/ports';
import { useKangurAuth } from '@/features/kangur/ui/context/KangurAuthContext';
import {
  areProgressStatesEqual,
  loadProgress,
  loadProgressOwnerKey,
  mergeProgressStates,
  saveProgress,
  saveProgressOwnerKey,
  subscribeToProgress,
} from '@/features/kangur/ui/services/progress';

const kangurPlatform = getKangurPlatform();

const isStatusError = (value: unknown): value is { status: number } =>
  typeof value === 'object' &&
  value !== null &&
  'status' in value &&
  typeof (value as { status?: unknown }).status === 'number';

const resolveUserProgressKey = (user: KangurUser | null): string | null => {
  const email = user?.email?.trim().toLowerCase();
  if (email) {
    return email;
  }

  const id = user?.id?.trim();
  return id && id.length > 0 ? id : null;
};

const serializeProgress = (progress: KangurProgressRecord): string => JSON.stringify(progress);

export function KangurProgressSyncProvider({
  children,
}: {
  children: ReactNode;
}): React.JSX.Element {
  const { isAuthenticated, isLoadingAuth, user } = useKangurAuth();
  const userKey = resolveUserProgressKey(user);
  const lastSyncedProgressRef = useRef<string | null>(null);
  const syncStateRef = useRef<'idle' | 'loading' | 'ready'>('idle');

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

        lastSyncedProgressRef.current = serializeProgress(mergedProgress);
      } catch (error: unknown) {
        if (cancelled) {
          return;
        }

        if (isStatusError(error) && (error.status === 401 || error.status === 403)) {
          syncStateRef.current = 'idle';
          return;
        }

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
          if (isStatusError(error) && (error.status === 401 || error.status === 403)) {
            syncStateRef.current = 'idle';
            return;
          }

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
