import type {
  KangurDuelLobbyEntry,
  KangurDuelStatus,
} from '@kangur/contracts';
import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';

import { useKangurMobileI18n } from '../i18n/kangurMobileI18n';
import { useKangurMobileRuntime } from '../providers/KangurRuntimeContext';

const MOBILE_HOME_DUELS_SPOTLIGHT_LIMIT = 4;
const MOBILE_HOME_DUELS_SPOTLIGHT_QUERY_LIMIT = 8;
const MOBILE_HOME_DUELS_SPOTLIGHT_POLL_MS = 20_000;

type UseKangurMobileHomeDuelsSpotlightResult = {
  entries: KangurDuelLobbyEntry[];
  error: string | null;
  isLoading: boolean;
  refresh: () => Promise<void>;
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
  if (!error) {
    return null;
  }

  if (!(error instanceof Error)) {
    return copy({
      de: 'Aktive Duelle aus der Lobby konnten nicht geladen werden.',
      en: 'Could not load active duels from the lobby.',
      pl: 'Nie udało się pobrać aktywnych pojedynków z lobby.',
    });
  }

  const message = error.message.trim();
  if (!message) {
    return copy({
      de: 'Aktive Duelle aus der Lobby konnten nicht geladen werden.',
      en: 'Could not load active duels from the lobby.',
      pl: 'Nie udało się pobrać aktywnych pojedynków z lobby.',
    });
  }

  const normalized = message.toLowerCase();
  if (normalized === 'failed to fetch' || normalized.includes('networkerror')) {
    return copy({
      de: 'Die Verbindung zur Kangur-API konnte nicht hergestellt werden.',
      en: 'Could not connect to the Kangur API.',
      pl: 'Nie udało się połączyć z API Kangura.',
    });
  }

  return message;
};

const isSpotlightEntry = (entry: KangurDuelLobbyEntry): boolean =>
  entry.visibility === 'public' &&
  (entry.status === 'waiting' ||
    entry.status === 'ready' ||
    entry.status === 'in_progress');

export const useKangurMobileHomeDuelsSpotlight =
  (): UseKangurMobileHomeDuelsSpotlightResult => {
    const { copy } = useKangurMobileI18n();
    const { apiBaseUrl, apiClient } = useKangurMobileRuntime();

    const spotlightQuery = useQuery({
      queryKey: [
        'kangur-mobile',
        'home',
        'duels-spotlight',
        apiBaseUrl,
      ] as const,
      queryFn: async () =>
        apiClient.listDuelLobby(
          { limit: MOBILE_HOME_DUELS_SPOTLIGHT_QUERY_LIMIT },
          { cache: 'no-store' },
        ),
      refetchInterval: MOBILE_HOME_DUELS_SPOTLIGHT_POLL_MS,
      staleTime: 10_000,
    });

    const entries = useMemo(
      () =>
        (spotlightQuery.data?.entries ?? [])
          .filter((entry) => isSpotlightEntry(entry))
          .sort((left, right) => {
            const statusPriority =
              DUEL_SPOTLIGHT_STATUS_PRIORITY[left.status] -
              DUEL_SPOTLIGHT_STATUS_PRIORITY[right.status];

            if (statusPriority !== 0) {
              return statusPriority;
            }

            return (
              Date.parse(right.updatedAt) - Date.parse(left.updatedAt)
            );
          })
          .slice(0, MOBILE_HOME_DUELS_SPOTLIGHT_LIMIT),
      [spotlightQuery.data?.entries],
    );

    return {
      entries,
      error: toSpotlightErrorMessage(spotlightQuery.error, copy),
      isLoading: spotlightQuery.isLoading,
      refresh: async () => {
        await spotlightQuery.refetch();
      },
    };
  };
