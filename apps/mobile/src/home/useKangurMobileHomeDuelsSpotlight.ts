import type { KangurDuelLobbyEntry, KangurDuelStatus } from '@kangur/contracts/kangur-duels';
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

const MOBILE_HOME_DUELS_SPOTLIGHT_LIMIT = 4;

type UseKangurMobileHomeDuelsSpotlightResult = {
  entries: KangurDuelLobbyEntry[];
  error: string | null;
  isLoading: boolean;
  refresh: () => Promise<void>;
};

type UseKangurMobileHomeDuelsSpotlightOptions = {
  enabled?: boolean;
};

const DUEL_SPOTLIGHT_STATUS_PRIORITY: Record<KangurDuelStatus, number> = {
  aborted: 5,
  completed: 4,
  created: 3,
  in_progress: 0,
  ready: 1,
  waiting: 2,
};

const toSpotlightErrorMessage = (
  error: unknown,
  copy: ReturnType<typeof useKangurMobileI18n>['copy'],
): string | null => {
  if (error === null || error === undefined || error === false) {
    return null;
  }

  const fallbackMsg = copy({
    de: 'Aktive Duelle aus der Lobby konnten nicht geladen werden.',
    en: 'Could not load active duels from the lobby.',
    pl: 'Nie udało się pobrać aktywnych pojedynków z lobby.',
  });

  if (!(error instanceof Error)) {
    return fallbackMsg;
  }

  const message = error.message.trim();
  if (message === '') {
    return fallbackMsg;
  }

  const normalized = message.toLowerCase();
  if (normalized === 'failed to fetch' || normalized.includes('networkerror')) {
    return fallbackMsg;
  }

  return message;
};

const isSpotlightEntry = (entry: KangurDuelLobbyEntry): boolean =>
  entry.visibility === 'public' &&
  (entry.status === 'waiting' ||
    entry.status === 'ready' ||
    entry.status === 'in_progress');

export const useKangurMobileHomeDuelsSpotlight = ({
  enabled = true,
}: UseKangurMobileHomeDuelsSpotlightOptions = {}): UseKangurMobileHomeDuelsSpotlightResult => {
  const { copy } = useKangurMobileI18n();
  const { apiBaseUrl, apiClient } = useKangurMobileRuntime();
  const { session } = useKangurMobileAuth();
  const learnerIdentity = session.user?.activeLearner?.id ?? session.user?.email ?? session.user?.id ?? 'guest';

  const spotlightQuery = useQuery({
    enabled,
    queryKey: buildKangurMobileHomeDuelLobbyQueryKey(apiBaseUrl, learnerIdentity, 'public'),
    queryFn: async () => apiClient.listDuelLobby({ limit: MOBILE_HOME_DUEL_LOBBY_QUERY_LIMIT, visibility: 'public' }, { cache: 'no-store' }),
    refetchInterval: MOBILE_HOME_DUEL_LOBBY_POLL_MS,
    staleTime: 10_000,
  });

  const entries = useMemo(
    () => (spotlightQuery.data?.entries ?? [])
        .filter((e) => isSpotlightEntry(e))
        .sort((l, r) => {
          const statusPriority = DUEL_SPOTLIGHT_STATUS_PRIORITY[l.status] - DUEL_SPOTLIGHT_STATUS_PRIORITY[r.status];
          if (statusPriority !== 0) return statusPriority;
          return Date.parse(r.updatedAt) - Date.parse(l.updatedAt);
        })
        .slice(0, MOBILE_HOME_DUELS_SPOTLIGHT_LIMIT),
    [spotlightQuery.data?.entries],
  );

  return {
    entries,
    error: toSpotlightErrorMessage(spotlightQuery.error, copy),
    isLoading: enabled && spotlightQuery.isLoading,
    refresh: async () => { if (enabled) await spotlightQuery.refetch(); },
  };
};
