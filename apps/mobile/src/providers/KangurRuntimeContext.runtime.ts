import { createKangurApiClient } from '@kangur/api-client';
import {
  KANGUR_PROFILE_DEFAULT_DAILY_GOAL_GAMES,
  createKangurProgressStore,
  type KangurProgressStore,
} from '@kangur/core';
import type { KangurClientStorageAdapter } from '@kangur/platform';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

import {
  KANGUR_MOBILE_ACTIVE_LEARNER_STORAGE_KEY,
  KANGUR_MOBILE_AUTH_BEARER_TOKEN_STORAGE_KEY,
} from '../auth/mobileAuthStorageKeys';
import {
  persistKangurMobileCsrfTokenFromHeaders,
  resolveKangurMobileCsrfRequestToken,
} from '../auth/mobileCsrfToken';
import { resolveKangurMobilePublicConfig } from '../config/mobilePublicConfig';
import {
  buildPersistedKangurMobileHomeLessonCheckpointSnapshot,
  persistKangurMobileHomeLessonCheckpoints,
  resolveKangurMobileHomeLessonCheckpointIdentity,
} from '../home/persistedKangurMobileHomeLessonCheckpoints';
import { createMobileDevelopmentKangurStorage } from '../storage/createMobileDevelopmentKangurStorage';
import {
  extractExpoDevelopmentHost,
  resolveKangurMobileApiBaseUrl,
} from './kangurRuntimeApiBaseUrl';
import {
  KANGUR_ACTIVE_LEARNER_HEADER,
  type KangurMobileRuntime,
} from './KangurRuntimeContext.shared';

const KANGUR_PROGRESS_STORAGE_KEY = 'sprycio_progress';
const KANGUR_PROGRESS_OWNER_STORAGE_KEY = 'sprycio_progress_owner';

export const readWebCookieValue = (name: string): string | null => {
  if (typeof document === 'undefined' || document === null) {
    return null;
  }

  const cookiePrefix = `${name}=`;
  const rawCookie = document.cookie
    .split(';')
    .map((entry) => entry.trim())
    .find((entry) => entry.startsWith(cookiePrefix));

  return rawCookie ? decodeURIComponent(rawCookie.slice(cookiePrefix.length)) : null;
};

export const buildKangurMobileRuntimeHeaders = (
  storage: KangurClientStorageAdapter,
  webCookieToken: string | null
): Headers => {
  const headers = new Headers();
  const activeLearnerId = storage.getItem(KANGUR_MOBILE_ACTIVE_LEARNER_STORAGE_KEY);
  const bearerToken = storage.getItem(KANGUR_MOBILE_AUTH_BEARER_TOKEN_STORAGE_KEY);

  if (activeLearnerId !== null) {
    headers.set(KANGUR_ACTIVE_LEARNER_HEADER, activeLearnerId);
  }
  if (bearerToken !== null) {
    headers.set('Authorization', `Bearer ${bearerToken}`);
  }

  const csrfToken = resolveKangurMobileCsrfRequestToken({
    storage,
    webCookieToken,
  });
  if (csrfToken !== null) {
    headers.set('x-csrf-token', csrfToken);
  }

  return headers;
};

export const createTrackedKangurMobileProgressStore = (
  baseProgressStore: KangurProgressStore,
  storage: KangurClientStorageAdapter
): KangurProgressStore => ({
  ...baseProgressStore,
  saveProgress: (progress) => {
    const normalizedProgress = baseProgressStore.saveProgress(progress);

    persistKangurMobileHomeLessonCheckpoints({
      learnerIdentity: resolveKangurMobileHomeLessonCheckpointIdentity(storage),
      snapshot: buildPersistedKangurMobileHomeLessonCheckpointSnapshot({
        progress: normalizedProgress,
      }),
      storage,
    });

    return normalizedProgress;
  },
});

const createKangurMobileApiBaseUrlState = (): ReturnType<typeof resolveKangurMobileApiBaseUrl> =>
  resolveKangurMobileApiBaseUrl({
    configuredApiBaseUrl: resolveKangurMobilePublicConfig().apiUrl ?? null,
    developmentHost: extractExpoDevelopmentHost({
      hostUri: (Constants.expoConfig?.hostUri ?? Constants.platform?.hostUri ?? null),
      linkingUri: Constants.linkingUri ?? null,
    }),
    platformOs: Platform.OS,
  });

const createKangurMobileApiClient = (
  apiBaseUrl: string,
  storage: KangurClientStorageAdapter
): ReturnType<typeof createKangurApiClient> =>
  createKangurApiClient({
    baseUrl: apiBaseUrl,
    credentials: 'include',
    fetchImpl: fetch,
    getHeaders: () => buildKangurMobileRuntimeHeaders(storage, readWebCookieValue('csrf-token')),
    onResponse: (response) => {
      persistKangurMobileCsrfTokenFromHeaders(storage, response.headers);
    },
  });

export const createKangurMobileRuntime = (): KangurMobileRuntime => {
  const apiBaseUrlState = createKangurMobileApiBaseUrlState();
  const storage = createMobileDevelopmentKangurStorage();
  const baseProgressStore = createKangurProgressStore({
    storage,
    progressStorageKey: KANGUR_PROGRESS_STORAGE_KEY,
    ownerStorageKey: KANGUR_PROGRESS_OWNER_STORAGE_KEY,
  });

  return {
    ...apiBaseUrlState,
    apiClient: createKangurMobileApiClient(apiBaseUrlState.apiBaseUrl, storage),
    defaultDailyGoalGames: KANGUR_PROFILE_DEFAULT_DAILY_GOAL_GAMES,
    progressStore: createTrackedKangurMobileProgressStore(baseProgressStore, storage),
    storage,
  };
};
