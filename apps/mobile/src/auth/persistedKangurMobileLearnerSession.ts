import { kangurAuthUserSchema } from '@kangur/contracts';
import type {
  KangurAuthSession,
  KangurClientStorageAdapter,
  KangurUser,
} from '@kangur/platform';
import { createAuthenticatedKangurAuthSession } from '@kangur/platform';

import {
  KANGUR_MOBILE_ACTIVE_LEARNER_STORAGE_KEY,
  KANGUR_MOBILE_AUTH_BEARER_TOKEN_STORAGE_KEY,
  KANGUR_MOBILE_AUTH_STATUS_STORAGE_KEY,
  KANGUR_MOBILE_AUTH_USER_STORAGE_KEY,
} from './mobileAuthStorageKeys';

const readPersistedKangurMobileAuthUser = (
  storage: KangurClientStorageAdapter,
): KangurUser | null => {
  const rawUser = storage.getItem(KANGUR_MOBILE_AUTH_USER_STORAGE_KEY)?.trim() ?? '';
  if (!rawUser) {
    return null;
  }

  try {
    const parsedUser = JSON.parse(rawUser) as unknown;
    const result = kangurAuthUserSchema.safeParse(parsedUser);
    return result.success ? result.data : null;
  } catch {
    return null;
  }
};

export const resolvePersistedKangurMobileLearnerSession = (
  storage: KangurClientStorageAdapter,
): KangurAuthSession | null => {
  if (storage.getItem(KANGUR_MOBILE_AUTH_STATUS_STORAGE_KEY) !== 'authenticated') {
    return null;
  }

  const user = readPersistedKangurMobileAuthUser(storage);
  if (!user) {
    return null;
  }

  return createAuthenticatedKangurAuthSession(user, 'native-learner-session');
};

export const clearPersistedKangurMobileLearnerSession = (
  storage: KangurClientStorageAdapter,
): void => {
  storage.removeItem(KANGUR_MOBILE_AUTH_STATUS_STORAGE_KEY);
  storage.removeItem(KANGUR_MOBILE_AUTH_USER_STORAGE_KEY);
  storage.removeItem(KANGUR_MOBILE_AUTH_BEARER_TOKEN_STORAGE_KEY);
  storage.removeItem(KANGUR_MOBILE_ACTIVE_LEARNER_STORAGE_KEY);
};

export const persistResolvedKangurMobileLearnerSession = (
  storage: KangurClientStorageAdapter,
  session: KangurAuthSession,
): void => {
  if (session.status !== 'authenticated' || !session.user) {
    clearPersistedKangurMobileLearnerSession(storage);
    return;
  }

  storage.setItem(KANGUR_MOBILE_AUTH_USER_STORAGE_KEY, JSON.stringify(session.user));
  if (session.user.activeLearner?.id) {
    storage.setItem(
      KANGUR_MOBILE_ACTIVE_LEARNER_STORAGE_KEY,
      session.user.activeLearner.id,
    );
  } else {
    storage.removeItem(KANGUR_MOBILE_ACTIVE_LEARNER_STORAGE_KEY);
  }
  storage.setItem(KANGUR_MOBILE_AUTH_STATUS_STORAGE_KEY, 'authenticated');
};
