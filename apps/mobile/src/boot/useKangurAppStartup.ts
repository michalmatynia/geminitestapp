import { useMemo } from 'react';

import { useKangurMobileAuth } from '../auth/KangurMobileAuthContext';
import { resolveKangurMobileScoreScope } from '../profile/mobileScoreScope';
import { useKangurMobileRuntime } from '../providers/KangurRuntimeContext';
import { resolvePersistedKangurMobileRecentResults } from '../scores/persistedKangurMobileRecentResults';
import { resolvePersistedKangurMobileTrainingFocus } from '../scores/persistedKangurMobileTrainingFocus';

const APP_STARTUP_RECENT_RESULTS_LIMIT = 3;

export type KangurAppStartupState = {
  bootError: string | null;
  hasCachedStartupData: boolean;
  isAuthResolved: boolean;
  isBootLoading: boolean;
};

type UseKangurAppStartupOptions = {
  includeCachedStartupData?: boolean;
};

const useCachedRecentResults = (
  includeCachedStartupData: boolean,
  scoreScopeIdentityKey: string | null,
  storage: ReturnType<typeof useKangurMobileRuntime>['storage'],
): ReturnType<typeof resolvePersistedKangurMobileRecentResults> | null => useMemo(
  () => {
    if (!includeCachedStartupData || scoreScopeIdentityKey === null) {
      return null;
    }
    return resolvePersistedKangurMobileRecentResults({
      identityKey: scoreScopeIdentityKey,
      limit: APP_STARTUP_RECENT_RESULTS_LIMIT,
      storage,
    });
  },
  [includeCachedStartupData, scoreScopeIdentityKey, storage],
);

const useCachedTrainingFocus = (
  includeCachedStartupData: boolean,
  scoreScopeIdentityKey: string | null,
  storage: ReturnType<typeof useKangurMobileRuntime>['storage'],
): ReturnType<typeof resolvePersistedKangurMobileTrainingFocus> | null => useMemo(
  () => {
    if (!includeCachedStartupData || scoreScopeIdentityKey === null) {
      return null;
    }
    return resolvePersistedKangurMobileTrainingFocus({
      identityKey: scoreScopeIdentityKey,
      storage,
    });
  },
  [includeCachedStartupData, scoreScopeIdentityKey, storage],
);

const hasTrainingFocusData = (
  trainingFocus: ReturnType<typeof resolvePersistedKangurMobileTrainingFocus> | null,
): boolean => {
  const hasStrongestOp = (trainingFocus?.strongestOperation?.length ?? 0) > 0;
  const hasWeakestOp = (trainingFocus?.weakestOperation?.length ?? 0) > 0;
  return hasStrongestOp || hasWeakestOp;
};

const hasAnyCachedData = (
  recentResults: ReturnType<typeof resolvePersistedKangurMobileRecentResults> | null,
  trainingFocus: ReturnType<typeof resolvePersistedKangurMobileTrainingFocus> | null,
): boolean => {
  const hasRecentResults = (recentResults?.length ?? 0) > 0;
  return hasRecentResults || hasTrainingFocusData(trainingFocus);
};

const useScoreScopeIdentityKey = (user: ReturnType<typeof useKangurMobileAuth>['session']['user']): string | null =>
  useMemo(() => resolveKangurMobileScoreScope(user)?.identityKey ?? null, [user]);

export function useKangurAppStartup(
  options: UseKangurAppStartupOptions = {},
): KangurAppStartupState {
  const { authError, isLoadingAuth, session } = useKangurMobileAuth();
  const { storage } = useKangurMobileRuntime();
  const includeCachedStartupData = options.includeCachedStartupData ?? false;
  const scoreScopeIdentityKey = useScoreScopeIdentityKey(session.user);

  const cachedRecentResults = useCachedRecentResults(
    includeCachedStartupData,
    scoreScopeIdentityKey,
    storage,
  );

  const cachedTrainingFocus = useCachedTrainingFocus(
    includeCachedStartupData,
    scoreScopeIdentityKey,
    storage,
  );

  const isBootLoading = isLoadingAuth && session.status !== 'authenticated';

  return {
    bootError: authError,
    hasCachedStartupData: hasAnyCachedData(cachedRecentResults, cachedTrainingFocus),
    isAuthResolved: !isBootLoading,
    isBootLoading,
  };
}
