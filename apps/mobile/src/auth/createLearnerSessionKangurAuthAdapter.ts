import type { createKangurApiClient } from '@kangur/api-client';
import type {
  KangurAuthAdapter,
  KangurAuthSession,
  KangurAuthTransitionInput,
  KangurClientStorageAdapter,
} from '@kangur/platform';
import {
  createAnonymousKangurAuthSession,
  createAuthenticatedKangurAuthSession,
} from '@kangur/platform';

import {
  KANGUR_MOBILE_ACTIVE_LEARNER_STORAGE_KEY,
  KANGUR_MOBILE_AUTH_BEARER_TOKEN_STORAGE_KEY,
  KANGUR_MOBILE_AUTH_STATUS_STORAGE_KEY,
} from './mobileAuthStorageKeys';

type KangurApiClient = ReturnType<typeof createKangurApiClient>;

type CreateLearnerSessionKangurAuthAdapterOptions = {
  apiClient: KangurApiClient;
  storage: KangurClientStorageAdapter;
};

const createAnonymousLearnerSession = (): KangurAuthSession =>
  createAnonymousKangurAuthSession('native-learner-session');

const resolveStatusCode = (error: unknown): number | null =>
  typeof error === 'object' &&
  error &&
  'status' in error &&
  typeof error.status === 'number'
    ? error.status
    : null;

const clearPersistedLearnerSession = (
  storage: KangurClientStorageAdapter,
): void => {
  storage.removeItem(KANGUR_MOBILE_AUTH_STATUS_STORAGE_KEY);
  storage.removeItem(KANGUR_MOBILE_AUTH_BEARER_TOKEN_STORAGE_KEY);
  storage.removeItem(KANGUR_MOBILE_ACTIVE_LEARNER_STORAGE_KEY);
};

const persistResolvedLearnerSession = (
  storage: KangurClientStorageAdapter,
  session: KangurAuthSession,
): void => {
  if (session.status !== 'authenticated') {
    clearPersistedLearnerSession(storage);
    return;
  }

  storage.setItem(KANGUR_MOBILE_AUTH_STATUS_STORAGE_KEY, 'authenticated');
  if (session.user?.activeLearner?.id) {
    storage.setItem(
      KANGUR_MOBILE_ACTIVE_LEARNER_STORAGE_KEY,
      session.user.activeLearner.id,
    );
  } else {
    storage.removeItem(KANGUR_MOBILE_ACTIVE_LEARNER_STORAGE_KEY);
  }
};

const createMissingCredentialsError = (): Error =>
  new Error('Learner login name and password are required for native Kangur sign-in.');

const createMissingPersistedSessionError = (): Error =>
  new Error(
    'Learner sign-in did not produce a persisted mobile session. Check cookie/session support for the current device runtime.',
  );

export const createLearnerSessionKangurAuthAdapter = ({
  apiClient,
  storage,
}: CreateLearnerSessionKangurAuthAdapterOptions): KangurAuthAdapter => {
  const resolveSession = async (): Promise<KangurAuthSession> => {
    try {
      const user = await apiClient.getAuthMe({
        cache: 'no-store',
        credentials: 'include',
      });
      const session = createAuthenticatedKangurAuthSession(
        user,
        'native-learner-session',
      );
      persistResolvedLearnerSession(storage, session);
      return session;
    } catch (error) {
      const status = resolveStatusCode(error);
      if (status === 401 || status === 403) {
        const anonymousSession = createAnonymousLearnerSession();
        persistResolvedLearnerSession(storage, anonymousSession);
        return anonymousSession;
      }
      throw error;
    }
  };

  const resolveAuthenticatedSession = async (): Promise<KangurAuthSession> => {
    const session = await resolveSession();
    if (session.status !== 'authenticated') {
      throw createMissingPersistedSessionError();
    }
    return session;
  };

  return {
    getSession: async () => resolveSession(),
    signIn: async (input?: KangurAuthTransitionInput) => {
      const loginName = input?.learnerCredentials?.loginName?.trim();
      const password = input?.learnerCredentials?.password;

      if (!loginName || !password) {
        throw createMissingCredentialsError();
      }

      await apiClient.signInLearner(
        {
          loginName,
          password,
        },
        {
          credentials: 'include',
        },
      );

      return resolveAuthenticatedSession();
    },
    signOut: async () => {
      try {
        await apiClient.signOutLearner({
          credentials: 'include',
        });
      } catch (error) {
        const status = resolveStatusCode(error);
        if (status !== 401 && status !== 403) {
          throw error;
        }
      }

      const anonymousSession = createAnonymousLearnerSession();
      persistResolvedLearnerSession(storage, anonymousSession);
      return anonymousSession;
    },
  };
};
