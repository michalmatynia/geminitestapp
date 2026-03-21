import {
  KANGUR_LEADERBOARD_OPERATION_OPTIONS,
  KANGUR_LEADERBOARD_USER_OPTIONS,
  filterKangurLeaderboardScores,
  getKangurLeaderboardOperationInfo,
  type KangurLeaderboardItem,
  type KangurLeaderboardUserFilter,
} from '@kangur/core';
import { useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';

import { useKangurMobileAuth } from '../auth/KangurMobileAuthContext';
import { useKangurMobileI18n } from '../i18n/kangurMobileI18n';
import { useKangurMobileRuntime } from '../providers/KangurRuntimeContext';
import { formatKangurMobileScoreOperation } from '../scores/mobileScoreSummary';

type UseKangurMobileLeaderboardOptions = {
  enabled?: boolean;
  limit?: number;
};

type UseKangurMobileLeaderboardResult = {
  error: string | null;
  isLoadingAuth: boolean;
  isLoading: boolean;
  isRestoringAuth: boolean;
  items: KangurLeaderboardItem[];
  operationFilter: string;
  operationOptions: typeof KANGUR_LEADERBOARD_OPERATION_OPTIONS;
  refresh: () => Promise<void>;
  userFilter: KangurLeaderboardUserFilter;
  userOptions: typeof KANGUR_LEADERBOARD_USER_OPTIONS;
  visibleCount: number;
  setOperationFilter: (value: string) => void;
  setUserFilter: (value: KangurLeaderboardUserFilter) => void;
};

const LEADERBOARD_MEDALS = ['🥇', '🥈', '🥉'] as const;

const getKangurMobileLeaderboardUserFilterLabel = (
  value: KangurLeaderboardUserFilter,
  locale: ReturnType<typeof useKangurMobileI18n>['locale'],
): string => {
  if (value === 'registered') {
    return {
      de: 'Angemeldet',
      en: 'Registered',
      pl: 'Zalogowani',
    }[locale];
  }

  if (value === 'anonymous') {
    return {
      de: 'Anonym',
      en: 'Anonymous',
      pl: 'Anonimowi',
    }[locale];
  }

  return {
    de: 'Alle',
    en: 'All',
    pl: 'Wszyscy',
  }[locale];
};

const getKangurMobileLeaderboardAccountLabel = (
  isRegistered: boolean,
  locale: ReturnType<typeof useKangurMobileI18n>['locale'],
): string =>
  isRegistered
    ? {
        de: 'Angemeldet',
        en: 'Registered',
        pl: 'Zalogowany',
      }[locale]
    : {
        de: 'Anonym',
        en: 'Anonymous',
        pl: 'Anonim',
      }[locale];

export const useKangurMobileLeaderboard = (
  options: UseKangurMobileLeaderboardOptions = {},
): UseKangurMobileLeaderboardResult => {
  const { copy, locale } = useKangurMobileI18n();
  const enabled = options.enabled ?? true;
  const limit =
    typeof options.limit === 'number' && options.limit > 0
      ? Math.round(options.limit)
      : 10;
  const { apiClient, apiBaseUrl } = useKangurMobileRuntime();
  const { isLoadingAuth, session } = useKangurMobileAuth();
  const [operationFilter, setOperationFilter] = useState('all');
  const [userFilter, setUserFilter] =
    useState<KangurLeaderboardUserFilter>('all');
  const isRestoringAuth =
    isLoadingAuth && session.status !== 'authenticated';

  const scoresQuery = useQuery({
    enabled,
    queryKey: ['kangur-mobile', 'leaderboard', apiBaseUrl],
    queryFn: async () =>
      apiClient.listScores(
        {
          sort: '-score',
          limit: 100,
        },
        {
          cache: 'no-store',
        },
      ),
    staleTime: 30_000,
  });

  const visibleScores = useMemo(
    () =>
      filterKangurLeaderboardScores(scoresQuery.data ?? [], {
        limit,
        operationFilter,
        userFilter,
      }),
    [limit, operationFilter, scoresQuery.data, userFilter],
  );

  const operationOptions = useMemo(
    () =>
      KANGUR_LEADERBOARD_OPERATION_OPTIONS.map((option) => ({
        ...option,
        label:
          option.id === 'all'
            ? copy({
                de: 'Alle',
                en: 'All',
                pl: 'Wszystkie',
              })
            : formatKangurMobileScoreOperation(option.id, locale),
      })),
    [copy, locale],
  );

  const userOptions = useMemo(
    () =>
      KANGUR_LEADERBOARD_USER_OPTIONS.map((option) => ({
        ...option,
        label: getKangurMobileLeaderboardUserFilterLabel(option.id, locale),
      })),
    [locale],
  );

  const items = useMemo(
    () =>
      visibleScores.map((score, index) => {
        const operationInfo = getKangurLeaderboardOperationInfo(score.operation);
        const operationLabel = formatKangurMobileScoreOperation(
          score.operation,
          locale,
        );
        const isRegistered = Boolean(score.created_by);
        const isCurrentUser =
          (Boolean(session.user?.activeLearner?.id) &&
            score.learner_id === session.user?.activeLearner?.id) ||
          (Boolean(session.user?.email) && score.created_by === session.user?.email);
        const accountLabel = getKangurMobileLeaderboardAccountLabel(
          isRegistered,
          locale,
        );

        return {
          accountLabel,
          currentUserBadgeLabel: copy({
            de: 'Du',
            en: 'You',
            pl: 'Ty',
          }),
          id: score.id,
          isCurrentUser,
          isMedal: index < LEADERBOARD_MEDALS.length,
          isRegistered,
          metaLabel: `${operationInfo.emoji} ${operationLabel} · ${accountLabel}`,
          operationEmoji: operationInfo.emoji,
          operationLabel,
          operationSummary: `${operationInfo.emoji} ${operationLabel}`,
          playerName: score.player_name,
          rank: index + 1,
          rankLabel: LEADERBOARD_MEDALS[index] ?? `${index + 1}.`,
          scoreLabel: `${score.score}/${score.total_questions}`,
          timeLabel: `${score.time_taken}s`,
        } satisfies KangurLeaderboardItem;
      }),
    [copy, locale, session.user?.activeLearner?.id, session.user?.email, visibleScores],
  );

  return {
    error:
      scoresQuery.error instanceof Error
        ? copy({
            de: 'Die Ergebnisse konnten nicht geladen werden.',
            en: 'Could not load the results.',
            pl: 'Nie udało się pobrać wyników.',
          })
        : null,
    isLoadingAuth,
    isLoading: isRestoringAuth || scoresQuery.isLoading,
    isRestoringAuth,
    items,
    operationFilter,
    operationOptions,
    refresh: async () => {
      await scoresQuery.refetch();
    },
    setOperationFilter,
    setUserFilter,
    userFilter,
    userOptions,
    visibleCount: visibleScores.length,
  };
};
