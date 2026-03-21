import type {
  KangurDuelDifficulty,
  KangurDuelLeaderboardEntry,
  KangurDuelLobbyEntry,
  KangurDuelLobbyPresenceEntry,
  KangurDuelMode,
  KangurDuelOpponentEntry,
  KangurDuelOperation,
  KangurDuelSearchEntry,
} from '@kangur/contracts';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';

import { useKangurMobileAuth } from '../auth/KangurMobileAuthContext';
import {
  useKangurMobileI18n,
  type KangurMobileLocalizedValue,
} from '../i18n/kangurMobileI18n';
import { useKangurMobileRuntime } from '../providers/KangurRuntimeContext';
import {
  MOBILE_DUEL_DEFAULT_DIFFICULTY,
  MOBILE_DUEL_DEFAULT_OPERATION,
  MOBILE_DUEL_DEFAULT_QUESTION_COUNT,
  MOBILE_DUEL_DEFAULT_SERIES_BEST_OF,
  MOBILE_DUEL_DEFAULT_TIME_PER_QUESTION_SEC,
} from './mobileDuelDefaults';

const MOBILE_DUEL_LOBBY_LIMIT = 12;
const MOBILE_DUEL_PRESENCE_LIMIT = 24;
const MOBILE_DUEL_OPPONENT_LIMIT = 6;
const MOBILE_DUEL_SEARCH_LIMIT = 6;
const MOBILE_DUEL_LEADERBOARD_LIMIT = 6;
const MOBILE_DUEL_LEADERBOARD_LOOKBACK_DAYS = 14;
const MOBILE_DUEL_LOBBY_POLL_MS = 15_000;
const MOBILE_DUEL_PRESENCE_POLL_MS = 20_000;

type KangurMobileDuelModeFilter = 'all' | KangurDuelMode;
type KangurMobileDuelSeriesBestOf = 1 | 3 | 5 | 7 | 9;
type KangurMobileDuelCreateOverrides = {
  difficulty?: KangurDuelDifficulty;
  operation?: KangurDuelOperation;
  seriesBestOf?: KangurMobileDuelSeriesBestOf;
};

type UseKangurMobileDuelsLobbyResult = {
  actionError: string | null;
  createPrivateChallenge: (
    opponentLearnerId: string,
    overrides?: KangurMobileDuelCreateOverrides,
  ) => Promise<string | null>;
  createPublicChallenge: (
    overrides?: KangurMobileDuelCreateOverrides,
  ) => Promise<string | null>;
  createQuickMatch: (
    overrides?: KangurMobileDuelCreateOverrides,
  ) => Promise<string | null>;
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
  setDifficulty: (value: KangurDuelDifficulty) => void;
  setModeFilter: (value: KangurMobileDuelModeFilter) => void;
  setOperation: (value: KangurDuelOperation) => void;
  setSeriesBestOf: (value: KangurMobileDuelSeriesBestOf) => void;
  setSearchQuery: (value: string) => void;
  submitSearch: () => void;
  clearSearch: () => void;
  visiblePublicEntries: KangurDuelLobbyEntry[];
};

const toQueryErrorMessage = (
  error: unknown,
  fallback: string,
  copy: (value: KangurMobileLocalizedValue<string>) => string,
): string | null => {
  if (!error) {
    return null;
  }

  if (typeof error === 'object' && error && 'status' in error) {
    const status = (error as { status?: number }).status;

    if (status === 401) {
      return copy({
        de: 'Melde eine Lernenden-Sitzung an, um diese Ansicht zu nutzen.',
        en: 'Sign in the learner session to use this view.',
        pl: 'Zaloguj sesję ucznia, aby korzystać z tego widoku.',
      });
    }
  }

  if (!(error instanceof Error)) {
    return fallback;
  }

  const message = error.message.trim();
  if (!message) {
    return fallback;
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

export const useKangurMobileDuelsLobby =
  (): UseKangurMobileDuelsLobbyResult => {
    const { copy } = useKangurMobileI18n();
    const queryClient = useQueryClient();
    const { apiBaseUrl, apiClient } = useKangurMobileRuntime();
    const { isLoadingAuth, session } = useKangurMobileAuth();
    const [modeFilter, setModeFilter] = useState<KangurMobileDuelModeFilter>('all');
    const [operation, setOperation] = useState<KangurDuelOperation>(
      MOBILE_DUEL_DEFAULT_OPERATION,
    );
    const [difficulty, setDifficulty] = useState<KangurDuelDifficulty>(
      MOBILE_DUEL_DEFAULT_DIFFICULTY,
    );
    const [seriesBestOf, setSeriesBestOf] =
      useState<KangurMobileDuelSeriesBestOf>(MOBILE_DUEL_DEFAULT_SERIES_BEST_OF);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchSubmittedQuery, setSearchSubmittedQuery] = useState('');
    const [actionError, setActionError] = useState<string | null>(null);
    const [isActionPending, setIsActionPending] = useState(false);
    const learnerIdentity =
      session.user?.activeLearner?.id ??
      session.user?.email ??
      session.user?.id ??
      'guest';
    const isAuthenticated = session.status === 'authenticated';
    const isRestoringAuth = isLoadingAuth && !isAuthenticated;
    const normalizedSearchQuery = searchSubmittedQuery.trim();

    const lobbyQueryKey = [
      'kangur-mobile',
      'duels',
      'lobby',
      apiBaseUrl,
      learnerIdentity,
    ] as const;
    const presenceQueryKey = [
      'kangur-mobile',
      'duels',
      'presence',
      apiBaseUrl,
      learnerIdentity,
    ] as const;
    const opponentsQueryKey = [
      'kangur-mobile',
      'duels',
      'opponents',
      apiBaseUrl,
      learnerIdentity,
    ] as const;
    const leaderboardQueryKey = [
      'kangur-mobile',
      'duels',
      'leaderboard',
      apiBaseUrl,
    ] as const;
    const searchQueryKey = [
      'kangur-mobile',
      'duels',
      'search',
      apiBaseUrl,
      learnerIdentity,
      normalizedSearchQuery,
    ] as const;

    const lobbyQuery = useQuery({
      queryKey: lobbyQueryKey,
      queryFn: async () =>
        apiClient.listDuelLobby(
          { limit: MOBILE_DUEL_LOBBY_LIMIT },
          { cache: 'no-store' },
        ),
      refetchInterval: MOBILE_DUEL_LOBBY_POLL_MS,
      staleTime: 10_000,
    });

    const presenceQuery = useQuery({
      enabled: isAuthenticated,
      queryKey: presenceQueryKey,
      queryFn: async () =>
        apiClient.pingDuelLobbyPresence(
          { limit: MOBILE_DUEL_PRESENCE_LIMIT },
          { cache: 'no-store' },
        ),
      refetchInterval: MOBILE_DUEL_PRESENCE_POLL_MS,
      staleTime: 10_000,
    });

    const opponentsQuery = useQuery({
      enabled: isAuthenticated,
      queryKey: opponentsQueryKey,
      queryFn: async () =>
        apiClient.listDuelOpponents(
          { limit: MOBILE_DUEL_OPPONENT_LIMIT },
          { cache: 'no-store' },
        ),
      staleTime: 30_000,
    });

    const leaderboardQuery = useQuery({
      queryKey: leaderboardQueryKey,
      queryFn: async () =>
        apiClient.getDuelLeaderboard(
          {
            limit: MOBILE_DUEL_LEADERBOARD_LIMIT,
            lookbackDays: MOBILE_DUEL_LEADERBOARD_LOOKBACK_DAYS,
          },
          { cache: 'no-store' },
        ),
      staleTime: 30_000,
    });

    const searchQueryState = useQuery({
      enabled: isAuthenticated && normalizedSearchQuery.length >= 2,
      queryKey: searchQueryKey,
      queryFn: async () =>
        apiClient.searchDuels(
          normalizedSearchQuery,
          { limit: MOBILE_DUEL_SEARCH_LIMIT },
          { cache: 'no-store' },
        ),
      staleTime: 15_000,
    });

    const inviteEntries = useMemo(
      () =>
        (lobbyQuery.data?.entries ?? []).filter(
          (entry) => entry.visibility === 'private',
        ),
      [lobbyQuery.data?.entries],
    );
    const publicEntries = useMemo(
      () =>
        (lobbyQuery.data?.entries ?? []).filter(
          (entry) => entry.visibility === 'public',
        ),
      [lobbyQuery.data?.entries],
    );
    const visiblePublicEntries = useMemo(
      () =>
        publicEntries.filter((entry) =>
          modeFilter === 'all' ? true : entry.mode === modeFilter,
        ),
      [modeFilter, publicEntries],
    );

    const runSessionAction = async (
      action: () => Promise<{ session: { id: string } }>,
      fallbackMessage: string,
    ): Promise<string | null> => {
      setIsActionPending(true);
      setActionError(null);

      try {
        const response = await action();

        await Promise.all([
          queryClient.invalidateQueries({ queryKey: lobbyQueryKey }),
          queryClient.invalidateQueries({ queryKey: leaderboardQueryKey }),
          queryClient.invalidateQueries({ queryKey: presenceQueryKey }),
        ]);

        return response.session.id;
      } catch (error) {
        setActionError(toQueryErrorMessage(error, fallbackMessage, copy));
        return null;
      } finally {
        setIsActionPending(false);
      }
    };

    const resolveSeriesInput = (
      value: KangurMobileDuelSeriesBestOf,
    ): { seriesBestOf?: KangurMobileDuelSeriesBestOf } =>
      value > 1 ? { seriesBestOf: value } : {};

    return {
      actionError,
      createPrivateChallenge: async (opponentLearnerId, overrides) =>
        runSessionAction(
          async () =>
            apiClient.createDuel(
              {
                mode: 'challenge',
                visibility: 'private',
                opponentLearnerId,
                operation: overrides?.operation ?? operation,
                difficulty: overrides?.difficulty ?? difficulty,
                questionCount: MOBILE_DUEL_DEFAULT_QUESTION_COUNT,
                ...resolveSeriesInput(overrides?.seriesBestOf ?? seriesBestOf),
                timePerQuestionSec: MOBILE_DUEL_DEFAULT_TIME_PER_QUESTION_SEC,
              },
              { cache: 'no-store' },
            ),
          copy({
            de: 'Die private Herausforderung konnte nicht gesendet werden.',
            en: 'Could not send the private challenge.',
            pl: 'Nie udało się wysłać prywatnego wyzwania.',
          }),
        ),
      createPublicChallenge: async (overrides) =>
        runSessionAction(
          async () =>
            apiClient.createDuel(
              {
                mode: 'challenge',
                visibility: 'public',
                operation: overrides?.operation ?? operation,
                difficulty: overrides?.difficulty ?? difficulty,
                questionCount: MOBILE_DUEL_DEFAULT_QUESTION_COUNT,
                ...resolveSeriesInput(overrides?.seriesBestOf ?? seriesBestOf),
                timePerQuestionSec: MOBILE_DUEL_DEFAULT_TIME_PER_QUESTION_SEC,
              },
              { cache: 'no-store' },
            ),
          copy({
            de: 'Die öffentliche Herausforderung konnte nicht erstellt werden.',
            en: 'Could not create the public challenge.',
            pl: 'Nie udało się utworzyć publicznego wyzwania.',
          }),
        ),
      createQuickMatch: async (overrides) =>
        runSessionAction(
          async () =>
            apiClient.createDuel(
              {
                mode: 'quick_match',
                visibility: 'public',
                operation: overrides?.operation ?? operation,
                difficulty: overrides?.difficulty ?? difficulty,
                questionCount: MOBILE_DUEL_DEFAULT_QUESTION_COUNT,
                ...resolveSeriesInput(overrides?.seriesBestOf ?? seriesBestOf),
                timePerQuestionSec: MOBILE_DUEL_DEFAULT_TIME_PER_QUESTION_SEC,
              },
              { cache: 'no-store' },
            ),
          copy({
            de: 'Das schnelle Match konnte nicht erstellt werden.',
            en: 'Could not create the quick match.',
            pl: 'Nie udało się utworzyć szybkiego meczu.',
          }),
        ),
      difficulty,
      inviteEntries,
      isActionPending,
      isAuthenticated,
      isLoadingAuth,
      isLobbyLoading: lobbyQuery.isLoading,
      isOpponentsLoading: opponentsQuery.isLoading,
      isPresenceLoading: presenceQuery.isLoading,
      isRestoringAuth,
      isSearchLoading: searchQueryState.isLoading,
      joinDuel: async (sessionId) =>
        runSessionAction(
          async () =>
            apiClient.joinDuel(
              {
                sessionId,
              },
              { cache: 'no-store' },
            ),
          copy({
            de: 'Der Beitritt zum Duell ist fehlgeschlagen.',
            en: 'Could not join the duel.',
            pl: 'Nie udało się dołączyć do pojedynku.',
          }),
        ),
      leaderboardEntries: leaderboardQuery.data?.entries ?? [],
      leaderboardError: toQueryErrorMessage(
        leaderboardQuery.error,
        copy({
          de: 'Die Duellrangliste konnte nicht geladen werden.',
          en: 'Could not load the duels leaderboard.',
          pl: 'Nie udało się pobrać rankingu dueli.',
        }),
        copy,
      ),
      lobbyError: toQueryErrorMessage(
        lobbyQuery.error,
        copy({
          de: 'Die Duell-Lobby konnte nicht geladen werden.',
          en: 'Could not load the duels lobby.',
          pl: 'Nie udało się pobrać lobby pojedynków.',
        }),
        copy,
      ),
      modeFilter,
      operation,
      opponents: opponentsQuery.data?.entries ?? [],
      presenceEntries: presenceQuery.data?.entries ?? [],
      presenceError: toQueryErrorMessage(
        presenceQuery.error,
        copy({
          de: 'Die aktiven Lernenden konnten nicht geladen werden.',
          en: 'Could not load the active learners.',
          pl: 'Nie udało się pobrać aktywnych uczniów.',
        }),
        copy,
      ),
      publicEntries,
      refresh: async () => {
        await Promise.all([
          lobbyQuery.refetch(),
          leaderboardQuery.refetch(),
          ...(isAuthenticated ? [presenceQuery.refetch(), opponentsQuery.refetch()] : []),
          ...(normalizedSearchQuery.length >= 2 ? [searchQueryState.refetch()] : []),
        ]);
      },
      searchError: toQueryErrorMessage(
        searchQueryState.error,
        copy({
          de: 'Die Lernenden konnten nicht gesucht werden.',
          en: 'Could not search learners.',
          pl: 'Nie udało się wyszukać uczniów.',
        }),
        copy,
      ),
      searchQuery,
      searchResults: searchQueryState.data?.entries ?? [],
      searchSubmittedQuery: normalizedSearchQuery,
      seriesBestOf,
      setDifficulty,
      setModeFilter,
      setOperation,
      setSeriesBestOf,
      setSearchQuery,
      submitSearch: () => {
        setSearchSubmittedQuery(searchQuery.trim());
      },
      clearSearch: () => {
        setSearchQuery('');
        setSearchSubmittedQuery('');
      },
      visiblePublicEntries,
    };
  };
