'use client';

import {
  KANGUR_LEADERBOARD_OPERATION_OPTIONS,
  KANGUR_LEADERBOARD_USER_OPTIONS,
  buildKangurLeaderboardItems,
  filterKangurLeaderboardScores,
  type KangurLeaderboardItem as SharedKangurLeaderboardItem,
  type KangurLeaderboardUserFilter as SharedKangurLeaderboardUserFilter,
  type KangurLeaderboardUserFilterIcon as SharedKangurLeaderboardUserFilterIcon,
} from '@kangur/core';
import { useEffect, useMemo, useState } from 'react';

import { logKangurClientError } from '@/features/kangur/observability/client';
import { getKangurPlatform } from '@/features/kangur/services/kangur-platform';
import type { KangurScoreRecord, KangurUser } from '@/features/kangur/services/ports';
import { isKangurAuthStatusError } from '@/features/kangur/services/status-errors';

const kangurPlatform = getKangurPlatform();

export type KangurLeaderboardUserFilter = SharedKangurLeaderboardUserFilter;
export type KangurLeaderboardUserFilterIcon =
  SharedKangurLeaderboardUserFilterIcon;

export type KangurLeaderboardFilterItem = {
  displayLabel: string;
  id: string;
  label: string;
  selected: boolean;
  select: () => void;
};

export type KangurLeaderboardUserFilterItem = KangurLeaderboardFilterItem & {
  icon: KangurLeaderboardUserFilterIcon;
};

export type KangurLeaderboardItem = SharedKangurLeaderboardItem;

type UseKangurLeaderboardStateOptions = {
  enabled?: boolean;
  limit?: number;
};

type UseKangurLeaderboardStateResult = {
  currentUser: KangurUser | null;
  emptyStateLabel: string;
  error: string | null;
  items: KangurLeaderboardItem[];
  loading: boolean;
  operationFilter: string;
  operationFilters: KangurLeaderboardFilterItem[];
  scores: KangurScoreRecord[];
  userFilter: KangurLeaderboardUserFilter;
  userFilters: KangurLeaderboardUserFilterItem[];
  visibleScores: KangurScoreRecord[];
};

export const useKangurLeaderboardState = (
  options: UseKangurLeaderboardStateOptions = {}
): UseKangurLeaderboardStateResult => {
  const enabled = options.enabled ?? true;
  const limit = typeof options.limit === 'number' && options.limit > 0 ? Math.round(options.limit) : 10;
  const [scores, setScores] = useState<KangurScoreRecord[]>([]);
  const [loading, setLoading] = useState(enabled);
  const [operationFilter, setOperationFilter] = useState('all');
  const [userFilter, setUserFilter] = useState<KangurLeaderboardUserFilter>('all');
  const [currentUser, setCurrentUser] = useState<KangurUser | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isActive = true;

    if (!enabled) {
      setScores([]);
      setCurrentUser(null);
      setError(null);
      setLoading(false);
      return () => {
        isActive = false;
      };
    }

    const loadScores = async (): Promise<void> => {
      setLoading(true);
      setError(null);

      try {
        const [userResult, scoreRows] = await Promise.allSettled([
          kangurPlatform.auth.me(),
          kangurPlatform.score.list('-score', 100),
        ]);

        if (!isActive) {
          return;
        }

        if (userResult.status === 'fulfilled') {
          setCurrentUser(userResult.value);
        } else {
          if (!isKangurAuthStatusError(userResult.reason)) {
            logKangurClientError(userResult.reason, {
              source: 'useKangurLeaderboardState',
              action: 'loadCurrentUser',
            });
          }
          setCurrentUser(null);
        }

        if (scoreRows.status === 'fulfilled') {
          setScores(scoreRows.value);
          setError(null);
        } else {
          logKangurClientError(scoreRows.reason, {
            source: 'useKangurLeaderboardState',
            action: 'loadScores',
          });
          setScores([]);
          setError('Nie udalo sie pobrac wynikow.');
        }
      } finally {
        if (isActive) {
          setLoading(false);
        }
      }
    };

    void loadScores();

    return () => {
      isActive = false;
    };
  }, [enabled]);

  const visibleScores = useMemo(() => {
    return filterKangurLeaderboardScores(scores, {
      limit,
      operationFilter,
      userFilter,
    });
  }, [limit, operationFilter, scores, userFilter]);

  const items = useMemo(
    () =>
      buildKangurLeaderboardItems({
        currentUserEmail: currentUser?.email ?? null,
        currentLearnerId: currentUser?.activeLearner?.id ?? null,
        scores: visibleScores,
      }),
    [currentUser?.activeLearner?.id, currentUser?.email, visibleScores]
  );

  const operationFilters = useMemo(
    () =>
      KANGUR_LEADERBOARD_OPERATION_OPTIONS.map((option) => ({
        displayLabel: `${option.emoji} ${option.label}`,
        id: option.id,
        label: option.label,
        selected: operationFilter === option.id,
        select: (): void => {
          setOperationFilter(option.id);
        },
      })),
    [operationFilter]
  );

  const userFilters = useMemo(
    () =>
      KANGUR_LEADERBOARD_USER_OPTIONS.map((option) => ({
        displayLabel: option.label,
        icon: option.icon,
        id: option.id,
        label: option.label,
        selected: userFilter === option.id,
        select: (): void => {
          setUserFilter(option.id);
        },
      })),
    [userFilter]
  );

  return {
    currentUser,
    emptyStateLabel: error ?? 'Brak wynikow dla tych filtrow.',
    error,
    items,
    loading,
    operationFilter,
    operationFilters,
    scores,
    userFilter,
    userFilters,
    visibleScores,
  };
};
