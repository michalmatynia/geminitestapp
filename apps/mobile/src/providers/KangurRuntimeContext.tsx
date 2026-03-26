import { createKangurApiClient } from '@kangur/api-client';
import {
  KANGUR_PROFILE_DEFAULT_DAILY_GOAL_GAMES,
  createKangurProgressStore,
  type KangurProgressStore,
} from '@kangur/core';
import type { KangurClientStorageAdapter } from '@kangur/platform';
import {
  createContext,
  useContext,
  useState,
  type PropsWithChildren,
} from 'react';
import { Platform } from 'react-native';

import {
  KANGUR_MOBILE_ACTIVE_LEARNER_STORAGE_KEY,
  KANGUR_MOBILE_AUTH_BEARER_TOKEN_STORAGE_KEY,
} from '../auth/mobileAuthStorageKeys';
import {
  buildPersistedKangurMobileHomeLessonCheckpointSnapshot,
  persistKangurMobileHomeLessonCheckpoints,
  resolveKangurMobileHomeLessonCheckpointIdentity,
} from '../home/persistedKangurMobileHomeLessonCheckpoints';
import {
  persistKangurMobileCsrfTokenFromHeaders,
  resolveKangurMobileCsrfRequestToken,
} from '../auth/mobileCsrfToken';
import { resolveKangurMobilePublicConfig } from '../config/mobilePublicConfig';
import { createMobileDevelopmentKangurStorage } from '../storage/createMobileDevelopmentKangurStorage';

type KangurApiBaseUrlSource =
  | 'env'
  | 'android-emulator-default'
  | 'localhost-default';

const KANGUR_ACTIVE_LEARNER_HEADER = 'x-kangur-learner-id';

type KangurMobileRuntime = {
  apiBaseUrl: string;
  apiBaseUrlSource: KangurApiBaseUrlSource;
  apiClient: ReturnType<typeof createKangurApiClient>;
  defaultDailyGoalGames: number;
  progressStore: KangurProgressStore;
  storage: KangurClientStorageAdapter;
};

const KangurRuntimeContext = createContext<KangurMobileRuntime | null>(null);

const normalizeApiBaseUrl = (value: string | undefined): string | null => {
  const trimmed = value?.trim();
  if (!trimmed) {
    return null;
  }

  return trimmed.replace(/\/$/, '');
};

const readWebCookieValue = (name: string): string | null => {
  if (typeof document === 'undefined') {
    return null;
  }

  const cookiePrefix = `${name}=`;
  const rawCookie = document.cookie
    .split(';')
    .map((entry) => entry.trim())
    .find((entry) => entry.startsWith(cookiePrefix));

  if (!rawCookie) {
    return null;
  }

  return decodeURIComponent(rawCookie.slice(cookiePrefix.length));
};

const resolveDefaultApiBaseUrl = (): Pick<
  KangurMobileRuntime,
  'apiBaseUrl' | 'apiBaseUrlSource'
> => {
  if (Platform.OS === 'android') {
    return {
      apiBaseUrl: 'http://10.0.2.2:3000',
      apiBaseUrlSource: 'android-emulator-default',
    };
  }

  return {
    apiBaseUrl: 'http://localhost:3000',
    apiBaseUrlSource: 'localhost-default',
  };
};

const createKangurMobileRuntime = (): KangurMobileRuntime => {
  const configuredApiBaseUrl = normalizeApiBaseUrl(
    resolveKangurMobilePublicConfig().apiUrl ?? undefined,
  );

  const apiBaseUrlState = configuredApiBaseUrl
    ? {
        apiBaseUrl: configuredApiBaseUrl,
        apiBaseUrlSource: 'env' as const,
      }
    : resolveDefaultApiBaseUrl();

  const storage = createMobileDevelopmentKangurStorage();
  const baseProgressStore = createKangurProgressStore({
    storage,
    progressStorageKey: 'sprycio_progress',
    ownerStorageKey: 'sprycio_progress_owner',
  });

  return {
    ...apiBaseUrlState,
    apiClient: createKangurApiClient({
      baseUrl: apiBaseUrlState.apiBaseUrl,
      credentials: 'include',
      fetchImpl: fetch,
      getHeaders: () => {
        const headers = new Headers();
        const activeLearnerId = storage.getItem(
          KANGUR_MOBILE_ACTIVE_LEARNER_STORAGE_KEY,
        );
        const bearerToken = storage.getItem(
          KANGUR_MOBILE_AUTH_BEARER_TOKEN_STORAGE_KEY,
        );

        if (activeLearnerId) {
          headers.set(KANGUR_ACTIVE_LEARNER_HEADER, activeLearnerId);
        }
        if (bearerToken) {
          headers.set('Authorization', `Bearer ${bearerToken}`);
        }
        const csrfToken = resolveKangurMobileCsrfRequestToken({
          storage,
          webCookieToken: readWebCookieValue('csrf-token'),
        });
        if (csrfToken) {
          headers.set('x-csrf-token', csrfToken);
        }

        return headers;
      },
      onResponse: (response) => {
        persistKangurMobileCsrfTokenFromHeaders(storage, response.headers);
      },
    }),
    defaultDailyGoalGames: KANGUR_PROFILE_DEFAULT_DAILY_GOAL_GAMES,
    progressStore: {
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
    },
    storage,
  };
};

export function KangurRuntimeProvider({
  children,
}: PropsWithChildren): React.JSX.Element {
  const [runtime] = useState(createKangurMobileRuntime);

  return (
    <KangurRuntimeContext.Provider value={runtime}>
      {children}
    </KangurRuntimeContext.Provider>
  );
}

export function useKangurMobileRuntime(): KangurMobileRuntime {
  const runtime = useContext(KangurRuntimeContext);

  if (!runtime) {
    throw new Error(
      'useKangurMobileRuntime must be used inside KangurRuntimeProvider.'
    );
  }

  return runtime;
}
