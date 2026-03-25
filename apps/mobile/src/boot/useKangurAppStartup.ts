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

export const useKangurAppStartup = (): KangurAppStartupState => {
  const { authError, isLoadingAuth, session } = useKangurMobileAuth();
  const { storage } = useKangurMobileRuntime();
  const scoreScopeIdentityKey =
    resolveKangurMobileScoreScope(session.user)?.identityKey ?? null;
  const cachedRecentResults = useMemo(
    () =>
      scoreScopeIdentityKey
        ? resolvePersistedKangurMobileRecentResults({
            identityKey: scoreScopeIdentityKey,
            limit: APP_STARTUP_RECENT_RESULTS_LIMIT,
            storage,
          })
        : null,
    [scoreScopeIdentityKey, storage],
  );
  const cachedTrainingFocus = useMemo(
    () =>
      scoreScopeIdentityKey
        ? resolvePersistedKangurMobileTrainingFocus({
            identityKey: scoreScopeIdentityKey,
            storage,
          })
        : null,
    [scoreScopeIdentityKey, storage],
  );
  // Keep the main loader only for the blocking session-restore path.
  const isBootLoading = isLoadingAuth && session.status !== 'authenticated';

  return {
    bootError: authError,
    hasCachedStartupData: Boolean(
      cachedRecentResults?.length ||
        cachedTrainingFocus?.strongestOperation ||
        cachedTrainingFocus?.weakestOperation,
    ),
    isAuthResolved: !isBootLoading,
    isBootLoading,
  };
};
