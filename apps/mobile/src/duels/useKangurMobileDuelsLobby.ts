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
  const searchQueryState = useSearchQuery(apiClient, apiBaseUrl, learnerIdentity, isAuthenticated, search.searchSubmittedQuery.trim());

  const lobbyEntries = useMemo(() => getEntries(lobbyQuery.data), [lobbyQuery.data]);
  const publicEntries = useMemo(() => lobbyEntries.filter((e) => e.visibility === 'public'), [lobbyEntries]);
  const inviteEntries = useMemo(() => lobbyEntries.filter((e) => e.visibility === 'private'), [lobbyEntries]);
  const visiblePublicEntries = useMemo(() => {
    const { modeFilter } = filters;
    return publicEntries.filter((e) => modeFilter === 'all' ? true : e.mode === modeFilter);
  }, [filters.modeFilter, publicEntries]);

  const refresh = useCallback(async () => {
    await Promise.all([
      lobbyQuery.refetch(),
      presenceQuery.refetch(),
      opponentsQuery.refetch(),
      leaderboardQuery.refetch()
    ]);
  }, [leaderboardQuery, lobbyQuery, opponentsQuery, presenceQuery]);

  return {
    ...filters,
    ...search,
    actionError: null,
    createPrivateChallenge: () => Promise.resolve(null),
    createPublicChallenge: () => Promise.resolve(null),
    createQuickMatch: () => Promise.resolve(null),
    inviteEntries,
    isActionPending: false,
    isAuthenticated,
    isLoadingAuth,
    isLobbyLoading: lobbyQuery.isLoading,
    isOpponentsLoading: opponentsQuery.isLoading,
    isPresenceLoading: presenceQuery.isLoading,
    isRestoringAuth: isLoadingAuth && !isAuthenticated,
    isSearchLoading: searchQueryState.isLoading,
    joinDuel: () => Promise.resolve(false),
    leaderboardEntries: getEntries(leaderboardQuery.data),
    leaderboardError: toQueryErrorMessage(leaderboardQuery.error, 'Leaderboard error', copy),
    lobbyError: toQueryErrorMessage(lobbyQuery.error, 'Lobby error', copy),
    opponents: getEntries(opponentsQuery.data),
    presenceEntries: getEntries(presenceQuery.data),
    presenceError: toQueryErrorMessage(presenceQuery.error, 'Presence error', copy),
    publicEntries,
    refresh,
    searchError: toQueryErrorMessage(searchQueryState.error, 'Search error', copy),
    searchResults: getEntries(searchQueryState.data),
    visiblePublicEntries,
  };
}
