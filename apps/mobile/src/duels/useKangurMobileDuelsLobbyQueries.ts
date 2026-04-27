import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import type { 
  KangurDuelLobbyResponse, 
  KangurDuelLobbyPresenceResponse, 
  KangurDuelOpponentsResponse, 
  KangurDuelLeaderboardResponse, 
  KangurDuelSearchResponse,
  KangurDuelDifficulty,
  KangurDuelMode,
  KangurDuelOperation,
  KangurDuelLeaderboardEntry,
  KangurDuelLobbyEntry,
  KangurDuelOpponentEntry,
  KangurDuelLobbyPresenceEntry,
  KangurDuelSearchEntry
} from '@kangur/contracts/kangur-duels';
import type { KangurMobileLocalizedValue } from '../i18n/kangurMobileI18n';

const MOBILE_DUEL_LOBBY_LIMIT = 12;
const MOBILE_DUEL_PRESENCE_LIMIT = 24;
const MOBILE_DUEL_OPPONENT_LIMIT = 6;
const MOBILE_DUEL_SEARCH_LIMIT = 6;
const MOBILE_DUEL_LEADERBOARD_LIMIT = 6;
const MOBILE_DUEL_LEADERBOARD_LOOKBACK_DAYS = 14;
const MOBILE_DUEL_LOBBY_POLL_MS = 15_000;
const MOBILE_DUEL_PRESENCE_POLL_MS = 20_000;

export type KangurMobileDuelModeFilter = 'all' | KangurDuelMode;
export type KangurMobileDuelSeriesBestOf = 1 | 3 | 5 | 7 | 9;

export interface UseKangurMobileDuelsLobbyResult {
  actionError: string | null;
  createPrivateChallenge: (opponentLearnerId: string) => Promise<string | null>;
  createPublicChallenge: () => Promise<string | null>;
  createQuickMatch: () => Promise<string | null>;
  difficulty: KangurDuelDifficulty;
  inviteEntries: KangurDuelLobbyEntry[];
  isActionPending: boolean;
  isAuthenticated: boolean;
  isLoadingAuth: boolean;
  isLobbyLoading: boolean;
  isOpponentsLoading: boolean;
  isPresenceLoading: boolean;
  isRestoringAuth: boolean;
  isSearchLoading: boolean;
  joinDuel: (sessionId: string) => Promise<string | null>;
  leaderboardEntries: KangurDuelLeaderboardEntry[];
  leaderboardError: string | null;
  lobbyError: string | null;
  modeFilter: KangurMobileDuelModeFilter;
  operation: KangurDuelOperation;
  opponents: KangurDuelOpponentEntry[];
  presenceEntries: KangurDuelLobbyPresenceEntry[];
  presenceError: string | null;
  publicEntries: KangurDuelLobbyEntry[];
  refresh: () => Promise<void>;
  searchError: string | null;
  searchQuery: string;
  searchResults: KangurDuelSearchEntry[];
  searchSubmittedQuery: string;
  seriesBestOf: KangurMobileDuelSeriesBestOf;
  setDifficulty: (difficulty: KangurDuelDifficulty) => void;
  setModeFilter: (mode: KangurMobileDuelModeFilter) => void;
  setOperation: (operation: KangurDuelOperation) => void;
  setSeriesBestOf: (seriesBestOf: KangurMobileDuelSeriesBestOf) => void;
  setSearchQuery: (query: string) => void;
  submitSearch: () => void;
  clearSearch: () => void;
  visiblePublicEntries: KangurDuelLobbyEntry[];
}

export interface DuelApiClient {
  listDuelLobby: (params: { limit: number }, options: { cache: string }) => Promise<KangurDuelLobbyResponse>;
  pingDuelLobbyPresence: (params: { limit: number }, options: { cache: string }) => Promise<KangurDuelLobbyPresenceResponse>;
  listDuelOpponents: (params: { limit: number }, options: { cache: string }) => Promise<KangurDuelOpponentsResponse>;
  getDuelLeaderboard: (params: { limit: number; lookbackDays: number }, options: { cache: string }) => Promise<KangurDuelLeaderboardResponse>;
  searchDuels: (query: string, params: { limit: number }, options: { cache: string }) => Promise<KangurDuelSearchResponse>;
}

export function useLobbyQuery(apiClient: DuelApiClient, apiBaseUrl: string, learnerIdentity: string): UseQueryResult<KangurDuelLobbyResponse> {
  return useQuery<KangurDuelLobbyResponse>({
    queryKey: ['kangur-mobile', 'duels', 'lobby', apiBaseUrl, learnerIdentity],
    queryFn: () => apiClient.listDuelLobby({ limit: MOBILE_DUEL_LOBBY_LIMIT }, { cache: 'no-store' }),
    refetchInterval: MOBILE_DUEL_LOBBY_POLL_MS,
    staleTime: 10_000,
  });
}

export function usePresenceQuery(apiClient: DuelApiClient, apiBaseUrl: string, learnerIdentity: string, isAuthenticated: boolean): UseQueryResult<KangurDuelLobbyPresenceResponse> {
  return useQuery<KangurDuelLobbyPresenceResponse>({
    enabled: isAuthenticated,
    queryKey: ['kangur-mobile', 'duels', 'presence', apiBaseUrl, learnerIdentity],
    queryFn: () => apiClient.pingDuelLobbyPresence({ limit: MOBILE_DUEL_PRESENCE_LIMIT }, { cache: 'no-store' }),
    refetchInterval: MOBILE_DUEL_PRESENCE_POLL_MS,
    staleTime: 10_000,
  });
}

export function useOpponentsQuery(apiClient: DuelApiClient, apiBaseUrl: string, learnerIdentity: string, isAuthenticated: boolean): UseQueryResult<KangurDuelOpponentsResponse> {
  return useQuery<KangurDuelOpponentsResponse>({
    enabled: isAuthenticated,
    queryKey: ['kangur-mobile', 'duels', 'opponents', apiBaseUrl, learnerIdentity],
    queryFn: () => apiClient.listDuelOpponents({ limit: MOBILE_DUEL_OPPONENT_LIMIT }, { cache: 'no-store' }),
    staleTime: 30_000,
  });
}

export function useLeaderboardQuery(apiClient: DuelApiClient, apiBaseUrl: string): UseQueryResult<KangurDuelLeaderboardResponse> {
  return useQuery<KangurDuelLeaderboardResponse>({
    queryKey: ['kangur-mobile', 'duels', 'leaderboard', apiBaseUrl],
    queryFn: () => apiClient.getDuelLeaderboard({ limit: MOBILE_DUEL_LEADERBOARD_LIMIT, lookbackDays: MOBILE_DUEL_LEADERBOARD_LOOKBACK_DAYS }, { cache: 'no-store' }),
    staleTime: 30_000,
  });
}

export interface UseSearchQueryParams {
  apiClient: DuelApiClient;
  apiBaseUrl: string;
  learnerIdentity: string;
  isAuthenticated: boolean;
  query: string;
}

export function useSearchQuery(
  params: UseSearchQueryParams
): UseQueryResult<KangurDuelSearchResponse> {
  const { apiClient, apiBaseUrl, learnerIdentity, isAuthenticated, query } = params;
  return useQuery<KangurDuelSearchResponse>({
    enabled: isAuthenticated && query.length >= 2,
    queryKey: ['kangur-mobile', 'duels', 'search', apiBaseUrl, learnerIdentity, query],
    queryFn: () => apiClient.searchDuels(query, { limit: MOBILE_DUEL_SEARCH_LIMIT }, { cache: 'no-store' }),
    staleTime: 15_000,
  });
}

export function toQueryErrorMessage(error: unknown, fallback: string, copy: (value: KangurMobileLocalizedValue<string>) => string): string | null {
  if (error === null || error === undefined) return null;
  if (typeof error === 'object' && 'status' in error && (error as { status: number }).status === 401) {
    return copy({ de: 'Melde dich an.', en: 'Sign in.', pl: 'Zaloguj się.' });
  }
  return error instanceof Error && error.message.trim() !== '' ? error.message : fallback;
}
