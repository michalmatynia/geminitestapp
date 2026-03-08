'use client';

import type {
  KangurAuthAdapter,
  KangurAuthPort,
  KangurAuthSession,
} from '@kangur/platform';
import {
  createAnonymousKangurAuthSession,
  createAuthenticatedKangurAuthSession,
} from '@kangur/platform';

import { getKangurPlatform } from '@/features/kangur/services/kangur-platform';
import { isKangurAuthStatusError } from '@/features/kangur/services/status-errors';

type BrowserKangurAuthAdapterOptions = {
  authPort?: KangurAuthPort;
  resolveCurrentUrl?: () => string;
};

const resolveDefaultCurrentUrl = (): string => window.location.href;

export const createBrowserKangurAuthAdapter = (
  options: BrowserKangurAuthAdapterOptions = {},
): KangurAuthAdapter => {
  const authPort = options.authPort ?? getKangurPlatform().auth;
  const resolveCurrentUrl = options.resolveCurrentUrl ?? resolveDefaultCurrentUrl;

  const getSession = async (): Promise<KangurAuthSession> => {
    try {
      const user = await authPort.me();
      return createAuthenticatedKangurAuthSession(user, 'web-session');
    } catch (error) {
      if (isKangurAuthStatusError(error)) {
        return createAnonymousKangurAuthSession('web-session');
      }
      throw error;
    }
  };

  const signIn = async (input?: { returnUrl?: string }): Promise<KangurAuthSession> => {
    authPort.redirectToLogin(input?.returnUrl ?? resolveCurrentUrl());
    return createAnonymousKangurAuthSession('web-session');
  };

  const signOut = async (input?: { returnUrl?: string }): Promise<KangurAuthSession> => {
    await authPort.logout(input?.returnUrl);
    return createAnonymousKangurAuthSession('web-session');
  };

  return {
    getSession,
    signIn,
    signOut,
  };
};
