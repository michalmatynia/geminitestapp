import { useEffect, useRef } from 'react';
import { InteractionManager } from 'react-native';
import type { KangurMobileDeveloperConfig } from '../config/mobileDeveloperConfig.shared';
import { scheduleInitialAuthRefreshFrame } from './authBootHelpers';

const AUTH_INITIAL_BACKGROUND_REFRESH_FALLBACK_TIMEOUT_MS = 220;

export function useAuthBootEffect({
  shouldBlockInitialSessionRefresh,
  setIsLoadingAuth,
  refreshSession,
}: {
  shouldBlockInitialSessionRefresh: boolean;
  setIsLoadingAuth: (isLoading: boolean) => void;
  refreshSession: (options: { blockUI: boolean }) => Promise<void>;
}): void {
  useEffect(() => {
    let isDisposed = false;
    let hasScheduledRefresh = false;
    let fallbackTimeoutId: ReturnType<typeof setTimeout> | null = null;
    let cancelFrame: () => void = () => {};
    let interactionTask: { cancel: () => void } | null = null;

    if (shouldBlockInitialSessionRefresh) {
      setIsLoadingAuth(true);
      refreshSession({
        blockUI: true,
      }).catch(() => {});
    } else {
      const clearFallbackTimeout = (): void => {
        if (fallbackTimeoutId !== null) {
          clearTimeout(fallbackTimeoutId);
          fallbackTimeoutId = null;
        }
      };

      const scheduleRefresh = (): void => {
        if (!isDisposed && !hasScheduledRefresh) {
          hasScheduledRefresh = true;
          clearFallbackTimeout();
          cancelFrame = scheduleInitialAuthRefreshFrame(() => {
            if (!isDisposed) {
              refreshSession({
                blockUI: false,
              }).catch(() => {});
            }
          });
        }
      };

      interactionTask = InteractionManager.runAfterInteractions(
        scheduleRefresh,
      );
      fallbackTimeoutId = setTimeout(
        scheduleRefresh,
        AUTH_INITIAL_BACKGROUND_REFRESH_FALLBACK_TIMEOUT_MS,
      );
    }

    return () => {
      isDisposed = true;
      if (fallbackTimeoutId !== null) {
        clearTimeout(fallbackTimeoutId);
      }
      if (interactionTask !== null) {
        interactionTask.cancel();
      }
      cancelFrame();
    };
  }, [shouldBlockInitialSessionRefresh, setIsLoadingAuth, refreshSession]);
}

export function useDeveloperAutoSignIn({
  developerAutoSignInEnabled,
  isLoadingAuth,
  isAuthenticated,
  developerConfig,
  signInWithLearnerCredentials,
}: {
  developerAutoSignInEnabled: boolean;
  isLoadingAuth: boolean;
  isAuthenticated: boolean;
  developerConfig: KangurMobileDeveloperConfig;
  signInWithLearnerCredentials: (loginName: string, password: string) => Promise<void>;
}): { hasAttemptedDeveloperAutoSignIn: boolean } {
  const hasAttemptedDeveloperAutoSignInRef = useRef(false);

  useEffect(() => {
    if (
      developerAutoSignInEnabled &&
      !isLoadingAuth &&
      !isAuthenticated &&
      !hasAttemptedDeveloperAutoSignInRef.current
    ) {
      const { learnerLoginName, learnerPassword } = developerConfig;
      if (learnerLoginName !== null && learnerPassword !== null) {
        hasAttemptedDeveloperAutoSignInRef.current = true;
        signInWithLearnerCredentials(
          learnerLoginName,
          learnerPassword,
        ).catch(() => {});
      }
    }
  }, [
    developerAutoSignInEnabled,
    developerConfig,
    isLoadingAuth,
    isAuthenticated,
    signInWithLearnerCredentials,
  ]);

  return { hasAttemptedDeveloperAutoSignIn: hasAttemptedDeveloperAutoSignInRef.current };
}
