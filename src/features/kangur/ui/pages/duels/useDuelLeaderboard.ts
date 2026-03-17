import { useCallback, useRef, useState } from 'react';
import {
  withKangurClientError,
} from '@/features/kangur/observability/client';
import { getKangurPlatform } from '@/features/kangur/services/kangur-platform';
import type {
  KangurDuelLeaderboardEntry,
  KangurDuelOpponentEntry,
  KangurDuelSearchEntry,
} from '@/features/kangur/shared/contracts/kangur-duels';
import { isAbortLikeError } from '@/features/kangur/shared/utils/observability/is-abort-like-error';
import {
  DUEL_LEADERBOARD_LIMIT,
  KANGUR_DUELS_DEFAULT_OPPONENTS_LIMIT,
} from './constants';

const kangurPlatform = getKangurPlatform();

export type DuelLeaderboardOptions = {
  isOnline: boolean;
  canPlayTools: boolean;
};

export function useDuelLeaderboard(options: DuelLeaderboardOptions) {
  const { isOnline, canPlayTools } = options;

  const [recentOpponents, setRecentOpponents] = useState<KangurDuelOpponentEntry[]>([]);
  const [opponentsError, setOpponentsError] = useState<string | null>(null);
  const [isOpponentsLoading, setIsOpponentsLoading] = useState(false);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults] = useState<KangurDuelSearchEntry[]>([]);
  const [searchError] = useState<string | null>(null);
  const [isSearching] = useState(false);

  const [leaderboardEntries, setLeaderboardEntries] = useState<KangurDuelLeaderboardEntry[]>([]);
  const [leaderboardError, setLeaderboardError] = useState<string | null>(null);
  const [isLeaderboardLoading, setIsLeaderboardLoading] = useState(false);

  const opponentsAbortRef = useRef<AbortController | null>(null);
  const leaderboardAbortRef = useRef<AbortController | null>(null);

  const loadOpponents = useCallback(
    async ({ showLoading = false }: { showLoading?: boolean } = {}) => {
      if (!canPlayTools) {
        opponentsAbortRef.current?.abort();
        opponentsAbortRef.current = null;
        setRecentOpponents([]);
        setOpponentsError(null);
        setIsOpponentsLoading(false);
        return;
      }

      if (!isOnline) {
        opponentsAbortRef.current?.abort();
        opponentsAbortRef.current = null;
        setOpponentsError('Brak połączenia z internetem.');
        setIsOpponentsLoading(false);
        return;
      }

      if (opponentsAbortRef.current && showLoading) {
        opponentsAbortRef.current.abort();
      }

      const controller = new AbortController();
      opponentsAbortRef.current = controller;
      if (showLoading) setIsOpponentsLoading(true);
      setOpponentsError(null);

      await withKangurClientError(
        {
          source: 'kangur-duels-leaderboard',
          action: 'recent-opponents',
          description: 'Fetch recent duel opponents.',
          context: { limit: KANGUR_DUELS_DEFAULT_OPPONENTS_LIMIT },
        },
        async () => {
          const response = await kangurPlatform.duels.recentOpponents({
            limit: KANGUR_DUELS_DEFAULT_OPPONENTS_LIMIT,
            signal: controller.signal,
          });
          setRecentOpponents(response.entries);
        },
        {
          fallback: undefined,
          shouldReport: (err) => !isAbortLikeError(err, controller.signal),
          onError: (err) => {
            if (isAbortLikeError(err, controller.signal)) return;
            setOpponentsError('Nie udało się pobrać listy rywali. Spróbuj ponownie.');
          },
        }
      );

      if (opponentsAbortRef.current === controller) {
        opponentsAbortRef.current = null;
        if (showLoading) setIsOpponentsLoading(false);
      }
    },
    [canPlayTools, isOnline]
  );

  const loadLeaderboard = useCallback(
    async ({ showLoading = false }: { showLoading?: boolean } = {}) => {
      if (!isOnline) {
        leaderboardAbortRef.current?.abort();
        leaderboardAbortRef.current = null;
        setLeaderboardError('Brak połączenia z internetem.');
        setIsLeaderboardLoading(false);
        return;
      }

      if (leaderboardAbortRef.current && showLoading) {
        leaderboardAbortRef.current.abort();
      }

      const controller = new AbortController();
      leaderboardAbortRef.current = controller;
      if (showLoading) setIsLeaderboardLoading(true);
      setLeaderboardError(null);

      await withKangurClientError(
        {
          source: 'kangur-duels-leaderboard',
          action: 'leaderboard',
          description: 'Fetch duel leaderboard entries.',
          context: { limit: DUEL_LEADERBOARD_LIMIT },
        },
        async () => {
          const response = await kangurPlatform.duels.leaderboard({
            limit: DUEL_LEADERBOARD_LIMIT,
            signal: controller.signal,
          });
          setLeaderboardEntries(response.entries);
        },
        {
          fallback: undefined,
          shouldReport: (err) => !isAbortLikeError(err, controller.signal),
          onError: (err) => {
            if (isAbortLikeError(err, controller.signal)) return;
            setLeaderboardError('Nie udało się pobrać rankingu.');
          },
        }
      );

      if (leaderboardAbortRef.current === controller) {
        leaderboardAbortRef.current = null;
        if (showLoading) setIsLeaderboardLoading(false);
      }
    },
    [isOnline]
  );

  return {
    recentOpponents,
    opponentsError,
    isOpponentsLoading,
    searchQuery,
    setSearchQuery,
    searchResults,
    searchError,
    isSearching,
    leaderboardEntries,
    leaderboardError,
    isLeaderboardLoading,
    loadOpponents,
    loadLeaderboard,
  };
}
