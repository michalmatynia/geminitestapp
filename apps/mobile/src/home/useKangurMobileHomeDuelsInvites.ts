import type { KangurDuelLobbyEntry } from '@kangur/contracts-duels';
import { useQuery } from '@tanstack/react-query';
import { useEffect, useMemo } from 'react';

import { useKangurMobileAuth } from '../auth/KangurMobileAuthContext';
import { useKangurMobileI18n } from '../i18n/kangurMobileI18n';
import { useKangurMobileRuntime } from '../providers/KangurRuntimeContext';
import {
  buildKangurMobileHomeDuelLobbyQueryKey,
  MOBILE_HOME_DUEL_LOBBY_POLL_MS,
  MOBILE_HOME_DUEL_LOBBY_QUERY_LIMIT,
} from './homeDuelLobbyQuery';
import {
  persistKangurMobileHomeDuelInvites,
  resolvePersistedKangurMobileHomeDuelInvites,
} from './persistedKangurMobileHomeDuelInvites';

const MOBILE_HOME_DUELS_INVITES_DISPLAY_LIMIT = 4;

type UseKangurMobileHomeDuelsInvitesResult = {
  error: string | null;
  invites: KangurDuelLobbyEntry[];
  isDeferred: boolean;
  isAuthenticated: boolean;
  isLoading: boolean;
  outgoingChallenges: KangurDuelLobbyEntry[];
  isRestoringAuth: boolean;
  refresh: () => Promise<void>;
};

type UseKangurMobileHomeDuelsInvitesOptions = {
  enabled?: boolean;
};

const toInviteErrorMessage = (
  error: unknown,
  copy: ReturnType<typeof useKangurMobileI18n>['copy'],
): string | null => {
  if (!error) {
    return null;
  }

  if (typeof error === 'object' && error && 'status' in error) {
    const status = (error as { status?: number }).status;

    if (status === 401) {
      return copy({
        de: 'Melde dich an, um private Duelleinladungen zu laden.',
        en: 'Sign in to load private duel invites.',
        pl: 'Zaloguj się, aby pobrać prywatne zaproszenia do pojedynków.',
      });
    }
  }

  if (!(error instanceof Error)) {
    return copy({
      de: 'Die Duelleinladungen konnten nicht geladen werden.',
      en: 'Could not load duel invites.',
      pl: 'Nie udało się pobrać zaproszeń do pojedynków.',
    });
  }

  const message = error.message.trim();
  if (!message) {
    return copy({
      de: 'Die Duelleinladungen konnten nicht geladen werden.',
      en: 'Could not load duel invites.',
      pl: 'Nie udało się pobrać zaproszeń do pojedynków.',
    });
  }

  const normalized = message.toLowerCase();
  if (normalized === 'failed to fetch' || normalized.includes('networkerror')) {
    return copy({
      de: 'Die Duelleinladungen konnten nicht geladen werden.',
      en: 'Could not load duel invites.',
      pl: 'Nie udało się pobrać zaproszeń do pojedynków.',
    });
  }

  return message;
};

export const useKangurMobileHomeDuelsInvites = ({
  enabled = true,
}: UseKangurMobileHomeDuelsInvitesOptions = {}): UseKangurMobileHomeDuelsInvitesResult => {
  const { copy } = useKangurMobileI18n();
  const { apiBaseUrl, apiClient, storage } = useKangurMobileRuntime();
  const { isLoadingAuth, session } = useKangurMobileAuth();
  const learnerIdentity =
    session.user?.activeLearner?.id ??
    session.user?.email ??
    session.user?.id ??
    'guest';
  const activeLearnerId = session.user?.activeLearner?.id ?? session.user?.id ?? null;
  const isAuthenticated = session.status === 'authenticated';
  const isRestoringAuth = isLoadingAuth && !isAuthenticated;
  const isQueryEnabled = enabled && isAuthenticated;
  const isDeferred = isAuthenticated && !isRestoringAuth && !isQueryEnabled;
  const lobbyQueryKey = buildKangurMobileHomeDuelLobbyQueryKey(
    apiBaseUrl,
    learnerIdentity,
    'private',
  );
  const persistedPrivateEntries = useMemo(
    () =>
      isAuthenticated
        ? resolvePersistedKangurMobileHomeDuelInvites({
            learnerIdentity,
            storage,
          })
        : null,
    [isAuthenticated, learnerIdentity, storage],
  );

  const invitesQuery = useQuery({
    enabled: isQueryEnabled,
    queryKey: lobbyQueryKey,
    queryFn: async () =>
      apiClient.listDuelLobby(
        {
          limit: MOBILE_HOME_DUEL_LOBBY_QUERY_LIMIT,
          visibility: 'private',
        },
        { cache: 'no-store' },
      ),
    refetchInterval: MOBILE_HOME_DUEL_LOBBY_POLL_MS,
    staleTime: 10_000,
  });

  const privateEntries = useMemo(
    () =>
      (invitesQuery.data?.entries ?? [])
        .filter((entry) => entry.visibility === 'private')
        .sort((left, right) => Date.parse(right.updatedAt) - Date.parse(left.updatedAt))
        .slice(0, MOBILE_HOME_DUEL_LOBBY_QUERY_LIMIT),
    [invitesQuery.data?.entries],
  );
  const hasResolvedLivePrivateLobby =
    isQueryEnabled &&
    !invitesQuery.isLoading &&
    !invitesQuery.error &&
    invitesQuery.data !== undefined;
  const resolvedPrivateEntries =
    hasResolvedLivePrivateLobby ? privateEntries : persistedPrivateEntries ?? privateEntries;

  useEffect(() => {
    if (!hasResolvedLivePrivateLobby) {
      return;
    }

    persistKangurMobileHomeDuelInvites({
      entries: privateEntries,
      learnerIdentity,
      storage,
    });
  }, [hasResolvedLivePrivateLobby, learnerIdentity, privateEntries, storage]);

  const invites = useMemo(
    () =>
      resolvedPrivateEntries
        .filter((entry) => entry.host.learnerId !== activeLearnerId)
        .slice(0, MOBILE_HOME_DUELS_INVITES_DISPLAY_LIMIT),
    [activeLearnerId, resolvedPrivateEntries],
  );
  const outgoingChallenges = useMemo(
    () =>
      resolvedPrivateEntries
        .filter((entry) => entry.host.learnerId === activeLearnerId)
        .slice(0, MOBILE_HOME_DUELS_INVITES_DISPLAY_LIMIT),
    [activeLearnerId, resolvedPrivateEntries],
  );

  return {
    error: toInviteErrorMessage(invitesQuery.error, copy),
    invites,
    isDeferred,
    isAuthenticated,
    isLoading: isRestoringAuth || (isQueryEnabled && invitesQuery.isLoading),
    outgoingChallenges,
    isRestoringAuth,
    refresh: async () => {
      if (!isQueryEnabled) {
        return;
      }

      await invitesQuery.refetch();
    },
  };
};
