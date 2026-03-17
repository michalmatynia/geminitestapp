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

import type { IdLabelOptionDto } from '@/shared/contracts/base';
import { logKangurClientError } from '@/features/kangur/observability/client';
import { getKangurPlatform } from '@/features/kangur/services/kangur-platform';
import type { KangurScoreRecord, KangurUser } from '@/features/kangur/services/ports';
import { isKangurAuthStatusError } from '@/features/kangur/services/status-errors';
import { useKangurSubjectFocus } from '@/features/kangur/ui/context/KangurSubjectFocusContext';
import { resolveKangurScoreSubject, type KangurLessonSubject } from '@/shared/contracts/kangur';

const kangurPlatform = getKangurPlatform();

export type KangurLeaderboardUserFilter = 'all' | 'registered' | 'anonymous';
export type KangurLeaderboardUserFilterIcon = 'ghost' | 'user' | null;

type KangurLeaderboardOperationLabel = {
  emoji: string;
  label: string;
};

type KangurLeaderboardOperationOption = IdLabelOptionDto & { emoji: string };

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

const MATH_OPERATION_LABELS: Record<string, KangurLeaderboardOperationLabel> = {
  all: { label: 'Wszystkie', emoji: '🏆' },
  addition: { label: 'Dodawanie', emoji: '➕' },
  subtraction: { label: 'Odejmowanie', emoji: '➖' },
  multiplication: { label: 'Mnożenie', emoji: '✖️' },
  division: { label: 'Dzielenie', emoji: '➗' },
  decimals: { label: 'Ułamki', emoji: '🔢' },
  powers: { label: 'Potęgi', emoji: '⚡' },
  roots: { label: 'Pierwiastki', emoji: '√' },
  clock: { label: 'Zegar', emoji: '🕐' },
  calendar: { label: 'Kalendarz', emoji: '📅' },
  geometry: { label: 'Geometria', emoji: '🔷' },
  mixed: { label: 'Mieszane', emoji: '🎲' },
};

const ENGLISH_OPERATION_LABELS: Record<string, KangurLeaderboardOperationLabel> = {
  all: { label: 'Wszystkie', emoji: '🏆' },
  english_basics: { label: 'Podstawy', emoji: '🗣️' },
  english_parts_of_speech: { label: 'Części mowy', emoji: '🔤' },
  english_sentence_structure: { label: 'Szyk zdania', emoji: '🧩' },
  english_subject_verb_agreement: { label: 'Zgoda podmiotu', emoji: '🤝' },
  english_articles: { label: 'Przedimki', emoji: '📰' },
  english_prepositions_time_place: { label: 'Przyimki czasu i miejsca', emoji: '🧭' },
};

const ALPHABET_OPERATION_LABELS: Record<string, KangurLeaderboardOperationLabel> = {
  all: { label: 'Wszystkie', emoji: '🏆' },
  alphabet_basics: { label: 'Alfabet', emoji: '🔤' },
  alphabet_copy: { label: 'Przepisz litery', emoji: '📝' },
  alphabet_syllables: { label: 'Sylaby', emoji: '🗣️' },
};

const OPERATION_LABELS_BY_SUBJECT: Record<
  KangurLessonSubject,
  Record<string, KangurLeaderboardOperationLabel>
> = {
  maths: MATH_OPERATION_LABELS,
  english: ENGLISH_OPERATION_LABELS,
  alphabet: ALPHABET_OPERATION_LABELS,
  web_development: {
    all: { label: 'Wszystkie', emoji: '🏆' },
    webdev_react_components: { label: 'React', emoji: '⚛️' },
  },
};

const ALL_OPERATION_LABELS: Record<string, KangurLeaderboardOperationLabel> = {
  ...MATH_OPERATION_LABELS,
  ...ENGLISH_OPERATION_LABELS,
  ...ALPHABET_OPERATION_LABELS,
};

const buildOperationOptions = (subject: KangurLessonSubject): KangurLeaderboardOperationOption[] =>
  Object.entries(OPERATION_LABELS_BY_SUBJECT[subject]).map(([id, info]) => ({
    id,
    ...info,
  }));

const USER_OPTIONS: Array<IdLabelOptionDto<KangurLeaderboardUserFilter> & { icon: KangurLeaderboardUserFilterIcon }> = [
  { id: 'all', label: 'Wszyscy', icon: null },
  { id: 'registered', label: 'Zalogowani', icon: 'user' },
  { id: 'anonymous', label: 'Anonimowi', icon: 'ghost' },
];

const getOperationInfo = (operation: string): KangurLeaderboardOperationLabel =>
  ALL_OPERATION_LABELS[operation] ?? { emoji: '❓', label: operation };

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
  const { subject } = useKangurSubjectFocus();

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
          kangurPlatform.score.filter({ subject }, '-score', 100),
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
          setError('Nie udało się pobrać wyników.');
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
  }, [enabled, subject]);

  const operationOptions = useMemo(
    () => buildOperationOptions(subject),
    [subject]
  );

  useEffect(() => {
    if (operationOptions.some((option) => option.id === operationFilter)) {
      return;
    }
    setOperationFilter('all');
  }, [operationFilter, operationOptions]);

  const visibleScores = useMemo(() => {
    const filteredScores = scores.filter((score) => {
      const scoreSubject = resolveKangurScoreSubject(score);
      const subjectMatch = scoreSubject === subject;
      const operationMatch = operationFilter === 'all' || score.operation === operationFilter;
      const isRegistered = Boolean(score.created_by);
      const userMatch =
        userFilter === 'all' ||
        (userFilter === 'registered' && isRegistered) ||
        (userFilter === 'anonymous' && !isRegistered);

      return subjectMatch && operationMatch && userMatch;
    });

    return filteredScores.slice(0, limit);
  }, [limit, operationFilter, scores, subject, userFilter]);

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
    [currentUser?.activeLearner?.id, currentUser?.email, visibleScores]
  );

  const operationFilters = useMemo(
    () =>
      operationOptions.map((option) => ({
        displayLabel: `${option.emoji} ${option.label}`,
        id: option.id,
        label: option.label,
        selected: operationFilter === option.id,
        select: (): void => {
          setOperationFilter(option.id);
        },
      })),
    [operationFilter, operationOptions]
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
    emptyStateLabel: error ?? 'Brak wyników dla tych filtrow.',
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
