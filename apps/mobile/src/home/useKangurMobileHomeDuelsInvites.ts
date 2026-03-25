import type { KangurDuelLobbyEntry } from '@kangur/contracts';
import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';

import { useKangurMobileAuth } from '../auth/KangurMobileAuthContext';
import { useKangurMobileI18n } from '../i18n/kangurMobileI18n';
import { useKangurMobileRuntime } from '../providers/KangurRuntimeContext';
import {
  buildKangurMobileHomeDuelLobbyQueryKey,
  MOBILE_HOME_DUEL_LOBBY_POLL_MS,
  MOBILE_HOME_DUEL_LOBBY_QUERY_LIMIT,
} from './homeDuelLobbyQuery';

const MOBILE_HOME_DUELS_INVITES_DISPLAY_LIMIT = 4;

type UseKangurMobileHomeDuelsInvitesResult = {
  error: string | null;
  invites: KangurDuelLobbyEntry[];
  isAuthenticated: boolean;
  isLoading: boolean;
  outgoingChallenges: KangurDuelLobbyEntry[];
  isRestoringAuth: boolean;
  refresh: () => Promise<void>;
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

export const useKangurMobileHomeDuelsInvites =
  (): UseKangurMobileHomeDuelsInvitesResult => {
    const { copy } = useKangurMobileI18n();
    const { apiBaseUrl, apiClient } = useKangurMobileRuntime();
    const { isLoadingAuth, session } = useKangurMobileAuth();
    const learnerIdentity =
      session.user?.activeLearner?.id ??
      session.user?.email ??
      session.user?.id ??
      'guest';
    const activeLearnerId = session.user?.activeLearner?.id ?? session.user?.id ?? null;
    const isAuthenticated = session.status === 'authenticated';
    const isRestoringAuth = isLoadingAuth && !isAuthenticated;
    const lobbyQueryKey = buildKangurMobileHomeDuelLobbyQueryKey(
      apiBaseUrl,
      learnerIdentity,
    );

    const invitesQuery = useQuery({
      enabled: isAuthenticated,
      queryKey: lobbyQueryKey,
      queryFn: async () =>
        apiClient.listDuelLobby(
          { limit: MOBILE_HOME_DUEL_LOBBY_QUERY_LIMIT },
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
    const invites = useMemo(
      () =>
        privateEntries
          .filter((entry) => entry.host.learnerId !== activeLearnerId)
          .slice(0, MOBILE_HOME_DUELS_INVITES_DISPLAY_LIMIT),
      [activeLearnerId, privateEntries],
    );
    const outgoingChallenges = useMemo(
      () =>
        privateEntries
          .filter((entry) => entry.host.learnerId === activeLearnerId)
          .slice(0, MOBILE_HOME_DUELS_INVITES_DISPLAY_LIMIT),
      [activeLearnerId, privateEntries],
    );

    return {
      error: toInviteErrorMessage(invitesQuery.error, copy),
      invites,
      isAuthenticated,
      isLoading: isRestoringAuth || invitesQuery.isLoading,
      outgoingChallenges,
      isRestoringAuth,
      refresh: async () => {
        await invitesQuery.refetch();
      },
    };
  };
