import { useState, useMemo } from 'react';
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
  KangurDuelMode,
  KangurDuelOperation,
} from '@kangur/contracts/kangur-duels';
import { 
  useLobbyQuery, 
  usePresenceQuery, 
  useOpponentsQuery, 
  useLeaderboardQuery, 
  useSearchQuery,
  type UseKangurMobileDuelsLobbyResult 
} from './useKangurMobileDuelsLobbyQueries';

export type KangurMobileDuelModeFilter = 'all' | KangurDuelMode;
export type KangurMobileDuelSeriesBestOf = 1 | 3 | 5 | 7 | 9;

export function useKangurMobileDuelsLobby(): UseKangurMobileDuelsLobbyResult {
  const { copy } = useKangurMobileI18n();
  const { apiBaseUrl, apiClient } = useKangurMobileRuntime();
  const { isLoadingAuth, session } = useKangurMobileAuth();
  
  const [modeFilter, setModeFilter] = useState<KangurMobileDuelModeFilter>('all');
  const [operation, setOperation] = useState<KangurDuelOperation>(MOBILE_DUEL_DEFAULT_OPERATION);
  const [difficulty, setDifficulty] = useState<KangurDuelDifficulty>(MOBILE_DUEL_DEFAULT_DIFFICULTY);
  const [seriesBestOf, setSeriesBestOf] = useState<KangurMobileDuelSeriesBestOf>(MOBILE_DUEL_DEFAULT_SERIES_BEST_OF);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchSubmittedQuery, setSearchSubmittedQuery] = useState('');
  const [actionError, setActionError] = useState<string | null>(null);
  const [isActionPending, setIsActionPending] = useState(false);
  
  const learnerIdentity = session.user?.activeLearner?.id ?? session.user?.email ?? session.user?.id ?? 'guest';
  const isAuthenticated = session.status === 'authenticated';
  
  const lobbyQuery = useLobbyQuery(apiClient, apiBaseUrl, learnerIdentity);
  const presenceQuery = usePresenceQuery(apiClient, apiBaseUrl, learnerIdentity, isAuthenticated);
  const opponentsQuery = useOpponentsQuery(apiClient, apiBaseUrl, learnerIdentity, isAuthenticated);
  const leaderboardQuery = useLeaderboardQuery(apiClient, apiBaseUrl);
  const searchQueryState = useSearchQuery(apiClient, apiBaseUrl, learnerIdentity, isAuthenticated, searchSubmittedQuery.trim());

  const publicEntries = useMemo(() => (lobbyQuery.data?.entries ?? []).filter((entry) => entry.visibility === 'public'), [lobbyQuery.data?.entries]);
  const visiblePublicEntries = useMemo(() => publicEntries.filter((entry) => modeFilter === 'all' ? true : entry.mode === modeFilter), [modeFilter, publicEntries]);

  // Placeholder for the extensive action logic remaining in the original hook. 
  // I will extract the action logic in the next step to keep this file clean.
  return {
    actionError,
    createPrivateChallenge: async () => null,
    createPublicChallenge: async () => null,
    createQuickMatch: async () => null,
    difficulty,
    inviteEntries: (lobbyQuery.data?.entries ?? []).filter((entry) => entry.visibility === 'private'),
    isActionPending,
    isAuthenticated,
    isLoadingAuth,
    isLobbyLoading: lobbyQuery.isLoading,
    isOpponentsLoading: opponentsQuery.isLoading,
    isPresenceLoading: presenceQuery.isLoading,
    isRestoringAuth: isLoadingAuth && !isAuthenticated,
    isSearchLoading: searchQueryState.isLoading,
    joinDuel: async () => null,
    leaderboardEntries: leaderboardQuery.data?.entries ?? [],
    leaderboardError: null,
    lobbyError: null,
    modeFilter,
    operation,
    opponents: opponentsQuery.data?.entries ?? [],
    presenceEntries: presenceQuery.data?.entries ?? [],
    presenceError: null,
    publicEntries,
    refresh: async () => {},
    searchError: null,
    searchQuery,
    searchResults: searchQueryState.data?.entries ?? [],
    searchSubmittedQuery,
    seriesBestOf,
    setDifficulty,
    setModeFilter,
    setOperation,
    setSeriesBestOf,
    setSearchQuery,
    submitSearch: () => setSearchSubmittedQuery(searchQuery),
    clearSearch: () => { setSearchQuery(''); setSearchSubmittedQuery(''); },
    visiblePublicEntries,
  };
}
