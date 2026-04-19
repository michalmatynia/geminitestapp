import type { KangurAuthAdapter, KangurAuthSession, KangurAuthTransitionInput } from '@kangur/platform';
import type { QueryClient } from '@tanstack/react-query';
import { useState, useRef, useEffect } from 'react';
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

export const useKangurMobileAuthActions = ({
  authAdapter,
  initialSession,
  locale,
  queryClient,
  setAuthError,
}: UseKangurMobileAuthActionsOptions) => {
  const [session, setSession] = useState<KangurAuthSession>(initialSession);
  const sessionRef = useRef(session);
  const [isLoadingAuth, setIsLoadingAuth] = useState(false);

  useEffect(() => {
    sessionRef.current = session;
  }, [session]);

  const applyResolvedSession = async (
    nextSession: KangurAuthSession,
  ): Promise<void> => {
    const previousSession = sessionRef.current;
    if (
      hasKangurMobileAuthSessionPayloadChanged(previousSession, nextSession)
    ) {
      sessionRef.current = nextSession;
      setSession(nextSession);
    }

    if (
      hasKangurMobileAuthQueryIdentityChanged(previousSession, nextSession)
    ) {
      await invalidateKangurMobileAuthQueries(queryClient);
    }
  };

  const refreshSession = async (
    options: {
      blockUI?: boolean;
    } = {},
  ): Promise<void> => {
    const shouldBlockUI = options.blockUI !== false;
    if (shouldBlockUI) {
      setIsLoadingAuth(true);
    }

    try {
      setAuthError(null);
      const nextSession = await authAdapter.getSession();
      await applyResolvedSession(nextSession);
    } catch (error) {
      setAuthError(toAuthErrorMessage(error, locale));
    } finally {
      if (shouldBlockUI) {
        setIsLoadingAuth(false);
      }
    }
  };

  const signIn = async (input?: KangurAuthTransitionInput): Promise<void> => {
    setIsLoadingAuth(true);
    try {
      setAuthError(null);
      const nextSession = await authAdapter.signIn(input);
      await applyResolvedSession(nextSession);
    } catch (error) {
      setAuthError(toAuthErrorMessage(error, locale));
    } finally {
      setIsLoadingAuth(false);
    }
  };

  const signOut = async (): Promise<void> => {
    setIsLoadingAuth(true);
    try {
      setAuthError(null);
      const nextSession = await authAdapter.signOut();
      await applyResolvedSession(nextSession);
    } catch (error) {
      setAuthError(toAuthErrorMessage(error, locale));
    } finally {
      setIsLoadingAuth(false);
    }
  };

  const signInWithLearnerCredentials = async (
    loginName: string,
    password: string,
  ): Promise<void> =>
    signIn({
      learnerCredentials: {
        loginName,
        password,
      },
    });

  return {
    isLoadingAuth,
    refreshSession,
    session,
    setIsLoadingAuth,
    signIn,
    signInWithLearnerCredentials,
    signOut,
  };
};
