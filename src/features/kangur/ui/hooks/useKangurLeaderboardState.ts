'use client';

import { useEffect, useMemo, useState } from 'react';

import { logKangurClientError } from '@/features/kangur/observability/client';
import { getKangurPlatform } from '@/features/kangur/services/kangur-platform';
import type { KangurScoreRecord, KangurUser } from '@/features/kangur/services/ports';
import { isKangurAuthStatusError } from '@/features/kangur/services/status-errors';

const MEDALS = ['🥇', '🥈', '🥉'] as const;
const kangurPlatform = getKangurPlatform();

export type KangurLeaderboardUserFilter = 'all' | 'registered' | 'anonymous';
export type KangurLeaderboardUserFilterIcon = 'ghost' | 'user' | null;

type KangurLeaderboardOperationLabel = {
  emoji: string;
  label: string;
};

type KangurLeaderboardOperationOption = {
  emoji: string;
  id: string;
  label: string;
};

type KangurLeaderboardUserOption = {
  icon: KangurLeaderboardUserFilterIcon;
  id: KangurLeaderboardUserFilter;
  label: string;
};

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

export type KangurLeaderboardItem = {
  accountLabel: string;
  currentUserBadgeLabel: string;
  id: string;
  isCurrentUser: boolean;
  isMedal: boolean;
  isRegistered: boolean;
  metaLabel: string;
  operationEmoji: string;
  operationLabel: string;
  operationSummary: string;
  playerName: string;
  rank: number;
  rankLabel: string;
  scoreLabel: string;
  timeLabel: string;
  xpLabel: string | null;
};

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

const OPERATION_LABELS: Record<string, KangurLeaderboardOperationLabel> = {
  all: { label: 'Wszystkie', emoji: '🏆' },
  addition: { label: 'Dodawanie', emoji: '➕' },
  subtraction: { label: 'Odejmowanie', emoji: '➖' },
  multiplication: { label: 'Mnozenie', emoji: '✖️' },
  division: { label: 'Dzielenie', emoji: '➗' },
  decimals: { label: 'Ulamki', emoji: '🔢' },
  powers: { label: 'Potegi', emoji: '⚡' },
  roots: { label: 'Pierwiastki', emoji: '√' },
  clock: { label: 'Zegar', emoji: '🕐' },
  calendar: { label: 'Kalendarz', emoji: '📅' },
  geometry: { label: 'Geometria', emoji: '🔷' },
  mixed: { label: 'Mieszane', emoji: '🎲' },
};

const OPERATION_OPTIONS: KangurLeaderboardOperationOption[] = Object.entries(OPERATION_LABELS).map(
  ([id, info]) => ({
    id,
    ...info,
  })
);

const USER_OPTIONS: KangurLeaderboardUserOption[] = [
  { id: 'all', label: 'Wszyscy', icon: null },
  { id: 'registered', label: 'Zalogowani', icon: 'user' },
  { id: 'anonymous', label: 'Anonimowi', icon: 'ghost' },
];

const getOperationInfo = (operation: string): KangurLeaderboardOperationLabel =>
  OPERATION_LABELS[operation] ?? { emoji: '❓', label: operation };

const normalizeXpEarned = (value: unknown): number | null =>
  typeof value === 'number' && Number.isFinite(value) ? Math.max(0, Math.round(value)) : null;

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
    const filteredScores = scores.filter((score) => {
      const operationMatch = operationFilter === 'all' || score.operation === operationFilter;
      const isRegistered = Boolean(score.created_by);
      const userMatch =
        userFilter === 'all' ||
        (userFilter === 'registered' && isRegistered) ||
        (userFilter === 'anonymous' && !isRegistered);

      return operationMatch && userMatch;
    });

    return filteredScores.slice(0, limit);
  }, [limit, operationFilter, scores, userFilter]);

  const items = useMemo(
    () =>
      visibleScores.map((score, index) => {
        const isRegistered = Boolean(score.created_by);
        const operationInfo = getOperationInfo(score.operation);
        const medal = index < MEDALS.length ? MEDALS[index]! : null;
        const xpEarned = normalizeXpEarned(score.xp_earned);
        const isCurrentUser =
          Boolean(currentUser?.email) && score.created_by === (currentUser?.email ?? null);

        return {
          accountLabel: isRegistered ? 'Zalogowany' : 'Anonim',
          currentUserBadgeLabel: 'Ty',
          id: score.id,
          isCurrentUser,
          isMedal: medal !== null,
          isRegistered,
          metaLabel: `${operationInfo.emoji} ${operationInfo.label} · ${isRegistered ? 'Zalogowany' : 'Anonim'}`,
          operationEmoji: operationInfo.emoji,
          operationLabel: operationInfo.label,
          operationSummary: `${operationInfo.emoji} ${operationInfo.label}`,
          playerName: score.player_name,
          rank: index + 1,
          rankLabel: medal ?? `${index + 1}.`,
          scoreLabel: `${score.score}/${score.total_questions}`,
          timeLabel: `${score.time_taken}s`,
          xpLabel: xpEarned !== null ? `+${xpEarned} XP` : null,
        };
      }),
    [currentUser?.email, visibleScores]
  );

  const operationFilters = useMemo(
    () =>
      OPERATION_OPTIONS.map((option) => ({
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
      USER_OPTIONS.map((option) => ({
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
