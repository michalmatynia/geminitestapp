import { type UseQueryResult } from '@tanstack/react-query';
import type { KangurDuelLobbyEntry, KangurDuelLobbyResponse, KangurDuelStatus } from '@kangur/contracts/kangur-duels';

import { useKangurMobileAuth } from '../auth/KangurMobileAuthContext';
import { useKangurMobileRuntime } from '../providers/KangurRuntimeContext';
import {
  buildKangurMobileHomeDuelLobbyQueryKey,
  MOBILE_HOME_DUEL_LOBBY_POLL_MS,
  MOBILE_HOME_DUEL_LOBBY_QUERY_LIMIT,
} from './homeDuelLobbyQuery';
import type { DuelApiClient } from '../duels/useKangurMobileDuelsLobbyQueries';
import type { KangurUser } from '@kangur/platform';
import { useKangurMobileQueryV2 } from '../query/kangurMobileQueryFactories';

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

function isSpotlightEntry(entry: KangurDuelLobbyEntry): boolean {
  return entry.visibility === 'public' &&
    (entry.status === 'waiting' || entry.status === 'ready' || entry.status === 'in_progress');
}

function compareEntries(l: KangurDuelLobbyEntry, r: KangurDuelLobbyEntry): number {
    const delta = DUEL_SPOTLIGHT_STATUS_PRIORITY[l.status] - DUEL_SPOTLIGHT_STATUS_PRIORITY[r.status];
    return delta !== 0 ? delta : Date.parse(r.updatedAt) - Date.parse(l.updatedAt);
}

function processSpotlightEntries(data: KangurDuelLobbyEntry[] | undefined): KangurDuelLobbyEntry[] {
    const raw = data ?? [];
    const filtered = raw.filter(isSpotlightEntry);
    return filtered.sort(compareEntries).slice(0, MOBILE_HOME_DUELS_SPOTLIGHT_LIMIT);
}

async function fetchLobby(apiClient: DuelApiClient): Promise<KangurDuelLobbyResponse> {
    return await apiClient.listDuelLobby(
        { limit: MOBILE_HOME_DUEL_LOBBY_QUERY_LIMIT, visibility: 'public' },
        { cache: 'no-store' }
    );
}

function resolveLearnerIdentity(user: KangurUser | null): string {
    if (!user) return 'guest';
    return user.activeLearner?.id ?? user.email ?? user.id;
}

function getError(error: unknown): string | null {
    return error instanceof Error ? error.message : null;
}

async function refreshSpotlight(enabled: boolean, query: UseQueryResult<KangurDuelLobbyResponse, Error>): Promise<void> {
    if (enabled) await query.refetch();
}

export const useKangurMobileHomeDuelsSpotlight = (options: UseKangurMobileHomeDuelsSpotlightOptions = {}): UseKangurMobileHomeDuelsSpotlightResult => {
  const enabled = options.enabled ?? true;
  const { apiBaseUrl, apiClient } = useKangurMobileRuntime();
  const { session } = useKangurMobileAuth();
  const learnerIdentity = resolveLearnerIdentity(session.user);

  const queryKey = buildKangurMobileHomeDuelLobbyQueryKey(apiBaseUrl, learnerIdentity, 'public');
  const spotlightQuery: UseQueryResult<KangurDuelLobbyResponse, Error> = useKangurMobileQueryV2<KangurDuelLobbyResponse>({
    enabled,
    queryKey,
    queryFn: () => fetchLobby(apiClient as DuelApiClient),
    refetchInterval: MOBILE_HOME_DUEL_LOBBY_POLL_MS,
    staleTime: 30_000,
    meta: {
      source: 'kangur.mobile.home.duels.spotlight',
      operation: 'list',
      resource: 'kangur.mobile.home.duels.spotlight',
      queryKey,
      description: 'Loads Kangur mobile home duel spotlight entries.',
      tags: ['kangur-mobile', 'home', 'duels'],
    },
  });

  const entries = processSpotlightEntries(spotlightQuery.data?.entries);
  return {
      entries,
      error: getError(spotlightQuery.error),
      isLoading: enabled && spotlightQuery.isLoading,
      refresh: () => refreshSpotlight(enabled, spotlightQuery)
  };
};
