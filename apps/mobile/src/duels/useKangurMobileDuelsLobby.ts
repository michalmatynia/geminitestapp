import { useState, useMemo, useCallback } from 'react';
import type { KangurAuthSession } from '@kangur/platform';
import { useKangurMobileAuth } from '../auth/KangurMobileAuthContext';
import { useKangurMobileI18n } from '../i18n/kangurMobileI18n';
import { useKangurMobileRuntime } from '../providers/KangurRuntimeContext';
import {
  MOBILE_DUEL_DEFAULT_DIFFICULTY,
  MOBILE_DUEL_DEFAULT_OPERATION,
  MOBILE_DUEL_DEFAULT_SERIES_BEST_OF,
} from './mobileDuelDefaults';
import type {
  KangurDuelDifficulty,
  KangurDuelOperation,
} from '@kangur/contracts/kangur-duels';
import { 
  useLobbyQuery, 
  usePresenceQuery, 
  useOpponentsQuery, 
  useLeaderboardQuery, 
  useSearchQuery,
  toQueryErrorMessage,
  type UseKangurMobileDuelsLobbyResult,
  type KangurMobileDuelModeFilter,
  type KangurMobileDuelSeriesBestOf,
  type DuelApiClient
} from './useKangurMobileDuelsLobbyQueries';

export type {
  UseKangurMobileDuelsLobbyResult,
  KangurMobileDuelModeFilter,
  KangurMobileDuelSeriesBestOf
};

interface DuelLobbyFilters {
  modeFilter: KangurMobileDuelModeFilter;
  setModeFilter: (mode: KangurMobileDuelModeFilter) => void;
  operation: KangurDuelOperation;
  setOperation: (operation: KangurDuelOperation) => void;
  difficulty: KangurDuelDifficulty;
  setDifficulty: (difficulty: KangurDuelDifficulty) => void;
  seriesBestOf: KangurMobileDuelSeriesBestOf;
  setSeriesBestOf: (seriesBestOf: KangurMobileDuelSeriesBestOf) => void;
}

function useDuelLobbyFilters(): DuelLobbyFilters {
  const [modeFilter, setModeFilter] = useState<KangurMobileDuelModeFilter>('all');
  const [operation, setOperation] = useState<KangurDuelOperation>(MOBILE_DUEL_DEFAULT_OPERATION);
  const [difficulty, setDifficulty] = useState<KangurDuelDifficulty>(MOBILE_DUEL_DEFAULT_DIFFICULTY);
  const [seriesBestOf, setSeriesBestOf] = useState<KangurMobileDuelSeriesBestOf>(MOBILE_DUEL_DEFAULT_SERIES_BEST_OF);

  return {
    modeFilter,
    setModeFilter,
    operation,
    setOperation,
    difficulty,
    setDifficulty,
    seriesBestOf,
    setSeriesBestOf,
  };
}

interface DuelLobbySearchState {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  searchSubmittedQuery: string;
  submitSearch: () => void;
  clearSearch: () => void;
}

function useDuelLobbySearchState(): DuelLobbySearchState {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchSubmittedQuery, setSearchSubmittedQuery] = useState('');

  const submitSearch = useCallback(() => {
    setSearchSubmittedQuery(searchQuery);
  }, [searchQuery]);

  const clearSearch = useCallback(() => {
    setSearchQuery('');
    setSearchSubmittedQuery('');
  }, []);

  return {
    searchQuery,
    setSearchQuery,
    searchSubmittedQuery,
    submitSearch,
    clearSearch,
  };
}

function getLearnerIdentity(session: KangurAuthSession): string {
  return session.user?.activeLearner?.id ?? session.user?.email ?? session.user?.id ?? 'guest';
}

function getEntries<T>(data: { entries?: T[] } | undefined): T[] {
  return data?.entries ?? [];
}

import type { UseQueryResult } from '@tanstack/react-query';
import type { 
  KangurDuelLobbyResponse, 
  KangurDuelLobbyPresenceResponse, 
  KangurDuelOpponentsResponse, 
  KangurDuelLeaderboardResponse, 
  KangurDuelSearchResponse 
} from '@kangur/contracts/kangur-duels';

type LobbyQueries = {
  lobby: UseQueryResult<KangurDuelLobbyResponse>;
  presence: UseQueryResult<KangurDuelLobbyPresenceResponse>;
  opponents: UseQueryResult<KangurDuelOpponentsResponse>;
  leaderboard: UseQueryResult<KangurDuelLeaderboardResponse>;
  search: UseQueryResult<KangurDuelSearchResponse>;
};

import type { KangurMobileLocalizedValue } from '../i18n/kangurMobileI18n';

type DuelCopy = (value: KangurMobileLocalizedValue<string>) => string;

// ...

function resolveLobbyState(copy: DuelCopy, queries: LobbyQueries): Omit<UseKangurMobileDuelsLobbyResult, keyof DuelLobbyFilters | keyof DuelLobbySearchState | 'actionError' | 'createPrivateChallenge' | 'createPublicChallenge' | 'createQuickMatch' | 'inviteEntries' | 'isActionPending' | 'isAuthenticated' | 'isLoadingAuth' | 'isRestoringAuth' | 'joinDuel' | 'publicEntries' | 'refresh' | 'visiblePublicEntries'> {
  const { lobby, presence, opponents, leaderboard, search } = queries;
  return {
    isLobbyLoading: lobby.isLoading,
    isOpponentsLoading: opponents.isLoading,
    isPresenceLoading: presence.isLoading,
    isSearchLoading: search.isLoading,
    leaderboardEntries: getEntries(leaderboard.data),
    leaderboardError: toQueryErrorMessage(leaderboard.error, 'Leaderboard error', copy),
    lobbyError: toQueryErrorMessage(lobby.error, 'Lobby error', copy),
    opponents: getEntries(opponents.data),
    presenceEntries: getEntries(presence.data),
    presenceError: toQueryErrorMessage(presence.error, 'Presence error', copy),
    searchError: toQueryErrorMessage(search.error, 'Search error', copy),
    searchResults: getEntries(search.data),
  };
}

export function useKangurMobileDuelsLobby(): UseKangurMobileDuelsLobbyResult {
  const { copy } = useKangurMobileI18n();
  const { apiBaseUrl, apiClient: rawApiClient } = useKangurMobileRuntime();
  const { isLoadingAuth, session } = useKangurMobileAuth();
  const apiClient = rawApiClient as unknown as DuelApiClient;
  const filters = useDuelLobbyFilters();
  const search = useDuelLobbySearchState();
  const learnerIdentity = useMemo(() => getLearnerIdentity(session), [session]);
  const isAuthenticated = session.status === 'authenticated';
  
  const lobbyQuery = useLobbyQuery(apiClient, apiBaseUrl, learnerIdentity);
  const presenceQuery = usePresenceQuery(apiClient, apiBaseUrl, learnerIdentity, isAuthenticated);
  const opponentsQuery = useOpponentsQuery(apiClient, apiBaseUrl, learnerIdentity, isAuthenticated);
  const leaderboardQuery = useLeaderboardQuery(apiClient, apiBaseUrl);
  const searchQueryState = useSearchQuery({ apiClient, apiBaseUrl, learnerIdentity, isAuthenticated, query: search.searchSubmittedQuery.trim() });

  const lobbyEntries = useMemo(() => getEntries(lobbyQuery.data), [lobbyQuery.data]);
  const publicEntries = useMemo(() => lobbyEntries.filter((e) => e.visibility === 'public'), [lobbyEntries]);
  const inviteEntries = useMemo(() => lobbyEntries.filter((e) => e.visibility === 'private'), [lobbyEntries]);
  const visiblePublicEntries = useMemo(() => publicEntries.filter((e) => filters.modeFilter === 'all' ? true : e.mode === filters.modeFilter), [filters.modeFilter, publicEntries]);

  const refresh = useCallback(async () => {
    await Promise.all([lobbyQuery.refetch(), presenceQuery.refetch(), opponentsQuery.refetch(), leaderboardQuery.refetch()]);
  }, [leaderboardQuery, lobbyQuery, opponentsQuery, presenceQuery]);

  return {
    ...filters, ...search,
    ...resolveLobbyState(copy, { lobby: lobbyQuery, presence: presenceQuery, opponents: opponentsQuery, leaderboard: leaderboardQuery, search: searchQueryState }),
    actionError: null,
    createPrivateChallenge: () => Promise.resolve(null),
    createPublicChallenge: () => Promise.resolve(null),
    createQuickMatch: () => Promise.resolve(null),
    inviteEntries,
    isActionPending: false,
    isAuthenticated,
    isLoadingAuth,
    isRestoringAuth: isLoadingAuth && !isAuthenticated,
    joinDuel: () => Promise.resolve(null),
    publicEntries,
    refresh,
    visiblePublicEntries,
  };
}
