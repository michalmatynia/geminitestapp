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

import { persistResolvedKangurMobileLearnerSession } from './persistedKangurMobileLearnerSession';

type KangurApiClient = ReturnType<typeof createKangurApiClient>;

type CreateLearnerSessionKangurAuthAdapterOptions = {
  apiClient: KangurApiClient;
  storage: KangurClientStorageAdapter;
};

export const KANGUR_MOBILE_AUTH_ERROR_CODES = {
  missingCredentials: 'kangur.mobile.auth.missing_credentials',
  missingPersistedSession: 'kangur.mobile.auth.missing_persisted_session',
} as const;

export type KangurMobileAuthErrorCode =
  (typeof KANGUR_MOBILE_AUTH_ERROR_CODES)[keyof typeof KANGUR_MOBILE_AUTH_ERROR_CODES];

const createAnonymousLearnerSession = (): KangurAuthSession =>
  createAnonymousKangurAuthSession('native-learner-session');

const resolveStatusCode = (error: unknown): number | null =>
  typeof error === 'object' &&
  error &&
  'status' in error &&
  typeof error.status === 'number'
    ? error.status
    : null;

const persistResolvedLearnerSession = (
  storage: KangurClientStorageAdapter,
  session: KangurAuthSession,
): void => {
  persistResolvedKangurMobileLearnerSession(storage, session);
};

const createAuthAdapterError = (
  code: KangurMobileAuthErrorCode,
  message: string,
): Error & { code: KangurMobileAuthErrorCode } => {
  const error = new Error(message) as Error & { code: KangurMobileAuthErrorCode };
  error.code = code;
  return error;
};

const createMissingCredentialsError = (): Error =>
  createAuthAdapterError(
    KANGUR_MOBILE_AUTH_ERROR_CODES.missingCredentials,
    'Learner login name and password are required for native Kangur sign-in.',
  );

const createMissingPersistedSessionError = (): Error =>
  createAuthAdapterError(
    KANGUR_MOBILE_AUTH_ERROR_CODES.missingPersistedSession,
    'Learner sign-in did not produce a persisted learner session. Check cookie/session support for the current device runtime.',
  );

const resolveLearnerSession = async (
  apiClient: KangurApiClient,
  storage: KangurClientStorageAdapter,
): Promise<KangurAuthSession> => {
  try {
    const user = await apiClient.getAuthMe({
      cache: 'no-store',
      credentials: 'include',
    });
    const session = createAuthenticatedKangurAuthSession(user, 'native-learner-session');
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

const resolveAuthenticatedLearnerSession = async (
  apiClient: KangurApiClient,
  storage: KangurClientStorageAdapter,
): Promise<KangurAuthSession> => {
  const session = await resolveLearnerSession(apiClient, storage);
  if (session.status !== 'authenticated') {
    throw createMissingPersistedSessionError();
  }
  return session;
};

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === 'string' && value !== '';

export const createLearnerSessionKangurAuthAdapter = ({
  apiClient,
  storage,
}: CreateLearnerSessionKangurAuthAdapterOptions): KangurAuthAdapter => {
  return {
    getSession: () => resolveLearnerSession(apiClient, storage),
    signIn: async (input?: KangurAuthTransitionInput) => {
      const credentials = input?.learnerCredentials;
      const loginName = credentials?.loginName.trim();
      const password = credentials?.password;

      if (!isNonEmptyString(loginName) || !isNonEmptyString(password)) {
        throw createMissingCredentialsError();
      }

      await apiClient.signInLearner({ loginName, password }, { credentials: 'include' });
      return resolveAuthenticatedLearnerSession(apiClient, storage);
    },
    signOut: async () => {
      try {
        await apiClient.signOutLearner({ credentials: 'include' });
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
