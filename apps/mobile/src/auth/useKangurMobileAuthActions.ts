import type { KangurAuthAdapter, KangurAuthSession, KangurAuthTransitionInput } from '@kangur/platform';
import type { QueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { hasKangurMobileAuthSessionPayloadChanged } from './hasKangurMobileAuthSessionPayloadChanged';
import { hasKangurMobileAuthQueryIdentityChanged } from './hasKangurMobileAuthQueryIdentityChanged';
import { invalidateKangurMobileAuthQueries } from './invalidateKangurMobileAuthQueries';
import { toAuthErrorMessage } from './authErrorHelpers';
import type { KangurMobileLocale } from '../i18n/kangurMobileI18n';

type UseKangurMobileAuthActionsOptions = {
  authAdapter: KangurAuthAdapter;
  initialSession: KangurAuthSession;
  locale: KangurMobileLocale;
  queryClient: QueryClient;
  setAuthError: (error: string | null) => void;
};

export function useKangurMobileAuthActions({
  authAdapter,
  initialSession,
  locale,
  queryClient,
  setAuthError,
}: UseKangurMobileAuthActionsOptions): {
  isLoadingAuth: boolean;
  refreshSession: (options?: { blockUI?: boolean }) => Promise<void>;
  session: KangurAuthSession;
  setIsLoadingAuth: (isLoading: boolean) => void;
  signIn: (input?: KangurAuthTransitionInput) => Promise<void>;
  signInWithLearnerCredentials: (loginName: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
} {
  const [session, setSession] = useState<KangurAuthSession>(initialSession);
  const sessionRef = useRef(session);
  const [isLoadingAuth, setIsLoadingAuth] = useState(false);

  useEffect(() => {
    sessionRef.current = session;
  }, [session]);

  const handleAuthAction = useCallback(async (
    action: () => Promise<KangurAuthSession>,
    shouldBlockUI: boolean,
  ): Promise<void> => {
    if (shouldBlockUI) setIsLoadingAuth(true);
    try {
      setAuthError(null);
      const nextSession = await action();
      const previousSession = sessionRef.current;
      if (hasKangurMobileAuthSessionPayloadChanged(previousSession, nextSession)) {
        sessionRef.current = nextSession;
        setSession(nextSession);
      }
      if (hasKangurMobileAuthQueryIdentityChanged(previousSession, nextSession)) {
        await invalidateKangurMobileAuthQueries(queryClient);
      }
    } catch (error) {
      setAuthError(toAuthErrorMessage(error, locale));
    } finally {
      if (shouldBlockUI) setIsLoadingAuth(false);
    }
  }, [locale, queryClient, setAuthError]);

  const actions = useMemo(() => ({
    refreshSession: (options: { blockUI?: boolean } = {}) => handleAuthAction(() => authAdapter.getSession(), options.blockUI !== false),
    signIn: (input?: KangurAuthTransitionInput) => handleAuthAction(() => authAdapter.signIn(input), true),
    signOut: () => handleAuthAction(() => authAdapter.signOut(), true),
    signInWithLearnerCredentials: (loginName: string, password: string) => handleAuthAction(() => authAdapter.signIn({ learnerCredentials: { loginName, password } }), true),
  }), [authAdapter, handleAuthAction]);

  return {
    isLoadingAuth,
    session,
    setIsLoadingAuth,
    ...actions,
  };
}
