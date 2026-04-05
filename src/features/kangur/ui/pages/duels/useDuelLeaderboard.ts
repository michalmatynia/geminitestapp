'use client';

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

const abortLeaderboardRequest = (ref: React.MutableRefObject<AbortController | null>): void => {
  ref.current?.abort();
  ref.current = null;
};

const beginAbortableLeaderboardLoad = (input: {
  errorReset: () => void;
  loadingRef: React.MutableRefObject<AbortController | null>;
  setIsLoading: React.Dispatch<React.SetStateAction<boolean>>;
  showLoading: boolean;
}): AbortController => {
  if (input.loadingRef.current && input.showLoading) {
    input.loadingRef.current.abort();
  }

  const controller = new AbortController();
  input.loadingRef.current = controller;
  if (input.showLoading) {
    input.setIsLoading(true);
  }
  input.errorReset();
  return controller;
};

const finishAbortableLeaderboardLoad = (input: {
  controller: AbortController;
  loadingRef: React.MutableRefObject<AbortController | null>;
  setIsLoading: React.Dispatch<React.SetStateAction<boolean>>;
  showLoading: boolean;
}): void => {
  if (input.loadingRef.current !== input.controller) {
    return;
  }

  input.loadingRef.current = null;
  if (input.showLoading) {
    input.setIsLoading(false);
  }
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

  const handleOpponentsLoadBlocker = useCallback((): boolean => {
    if (!canPlayTools) {
      abortLeaderboardRequest(opponentsAbortRef);
      setRecentOpponents([]);
      setOpponentsError(null);
      setIsOpponentsLoading(false);
      return true;
    }

    if (!isOnline) {
      abortLeaderboardRequest(opponentsAbortRef);
      setOpponentsError('Brak połączenia z internetem.');
      setIsOpponentsLoading(false);
      return true;
    }

    return false;
  }, [canPlayTools, isOnline]);

  const handleLeaderboardLoadBlocker = useCallback((): boolean => {
    if (!isOnline) {
      abortLeaderboardRequest(leaderboardAbortRef);
      setLeaderboardError('Brak połączenia z internetem.');
      setIsLeaderboardLoading(false);
      return true;
    }

    return false;
  }, [isOnline]);

  const handleOpponentsLoadError = useCallback(
    (error: unknown, controller: AbortController): void => {
      if (isAbortLikeError(error, controller.signal)) {
        return;
      }
      setOpponentsError('Nie udało się pobrać listy rywali. Spróbuj ponownie.');
    },
    []
  );

  const handleLeaderboardLoadError = useCallback(
    (error: unknown, controller: AbortController): void => {
      if (isAbortLikeError(error, controller.signal)) {
        return;
      }
      setLeaderboardError('Nie udało się pobrać rankingu.');
    },
    []
  );

  const loadOpponents = useCallback(
    async ({ showLoading = false }: { showLoading?: boolean } = {}) => {
      if (handleOpponentsLoadBlocker()) {
        return;
      }

      const controller = beginAbortableLeaderboardLoad({
        errorReset: () => setOpponentsError(null),
        loadingRef: opponentsAbortRef,
        setIsLoading: setIsOpponentsLoading,
        showLoading,
      });

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
          onError: (err) => handleOpponentsLoadError(err, controller),
        }
      );

      finishAbortableLeaderboardLoad({
        controller,
        loadingRef: opponentsAbortRef,
        setIsLoading: setIsOpponentsLoading,
        showLoading,
      });
    },
    [handleOpponentsLoadBlocker, handleOpponentsLoadError]
  );

  const loadLeaderboard = useCallback(
    async ({ showLoading = false }: { showLoading?: boolean } = {}) => {
      if (handleLeaderboardLoadBlocker()) {
        return;
      }

      const controller = beginAbortableLeaderboardLoad({
        errorReset: () => setLeaderboardError(null),
        loadingRef: leaderboardAbortRef,
        setIsLoading: setIsLeaderboardLoading,
        showLoading,
      });

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
          onError: (err) => handleLeaderboardLoadError(err, controller),
        }
      );

      finishAbortableLeaderboardLoad({
        controller,
        loadingRef: leaderboardAbortRef,
        setIsLoading: setIsLeaderboardLoading,
        showLoading,
      });
    },
    [handleLeaderboardLoadBlocker, handleLeaderboardLoadError]
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
