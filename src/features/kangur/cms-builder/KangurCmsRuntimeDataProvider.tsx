'use client';

import { useLocale, useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import React, { useCallback, useMemo, startTransition } from 'react';
import type { TranslationValues } from 'use-intl';
import { BADGES, getCurrentLevel, getNextLevel } from '@kangur/core';

import { CmsRuntimeProvider } from '@/features/cms/public';
import { getKangurPageHref } from '@/features/kangur/config/routing';
import {
  formatKangurCmsAssignmentCountLabel,
  formatKangurCmsResultStarsLabel,
  formatKangurCmsTimeTakenLabel,
  resolveKangurCmsAssignmentPriorityLabel,
  resolveKangurCmsGreetingLabel,
  resolveKangurCmsPracticeAssignmentHelperLabel,
  resolveKangurCmsResultMessage,
  resolveKangurCmsResultTitle,
  translateKangurCmsRuntimeWithFallback,
} from '@/features/kangur/cms-builder/KangurCmsRuntimeDataProvider.i18n';
import { useKangurAuth } from '@/features/kangur/ui/context/KangurAuthContext';
import {
  useOptionalKangurGameRuntime,
} from '@/features/kangur/ui/context/KangurGameRuntimeContext';
import {
  useOptionalKangurLearnerProfileRuntime,
} from '@/features/kangur/ui/context/KangurLearnerProfileRuntimeContext';
import { useOptionalKangurLessonsRuntime } from '@/features/kangur/ui/context/KangurLessonsRuntimeContext';
import {
  useOptionalKangurParentDashboardRuntime,
} from '@/features/kangur/ui/context/KangurParentDashboardRuntimeContext';
import { useOptionalKangurRouteTransition } from '@/features/kangur/ui/context/KangurRouteTransitionContext';
import { useOptionalKangurRouting } from '@/features/kangur/ui/context/KangurRoutingContext';
import { useKangurAssignments } from '@/features/kangur/ui/hooks/useKangurAssignments';
import { useKangurLeaderboardState } from '@/features/kangur/ui/hooks/useKangurLeaderboardState';
import { useKangurOperationSelectorState } from '@/features/kangur/ui/hooks/useKangurOperationSelectorState';
import { useKangurProgressState } from '@/features/kangur/ui/hooks/useKangurProgressState';
import { useKangurTrainingSetupState } from '@/features/kangur/ui/hooks/useKangurTrainingSetupState';
import {
  buildKangurAssignmentHref,
  formatKangurAssignmentOperationLabel,
  getKangurAssignmentActionLabel,
  selectKangurPriorityAssignments,
} from '@/features/kangur/ui/services/delegated-assignments';
import {
  FALLBACK_LEVEL,
  LEVELS,
  getLocalizedKangurProgressLevelTitle,
  translateKangurProgressWithFallback,
} from '@/features/kangur/ui/services/progress';
import { normalizeSiteLocale } from '@/shared/lib/i18n/site-locale';

const resolveResultStars = (percent: number): number =>
  percent >= 90 ? 3 : percent >= 60 ? 2 : 1;

type KangurCmsRuntimeFallbackCopy = {
  completedParentEyebrow: string;
  completedPercentTemplate: string;
  continuePracticeTitle: string;
  followUpEyebrow: string;
  levelSummary: (level: number, xp: number) => string;
  maxLevelLabel: string;
  nextLevelLabel: (level: number, xp: number) => string;
  nextPracticeStep: string;
  noActiveAssignment: string;
  parentEyebrow: string;
  returnToPracticeAction: string;
  returnToPracticeDescription: string;
  selfPriority: string;
  sessionPriority: string;
  totalXpLabelTemplate: string;
  xpIntoLevelLabelTemplate: string;
};

const KANGUR_CMS_RUNTIME_FALLBACK_COPY_BY_LOCALE: Record<
  string,
  KangurCmsRuntimeFallbackCopy
> = {
  uk: {
    completedParentEyebrow: 'Виконане завдання від батьків',
    completedPercentTemplate: '{percent}% виконано',
    continuePracticeTitle: 'Продовжити практику',
    followUpEyebrow: 'Наступна практика',
    levelSummary: (level, xp) => `Рівень ${level} · ${xp} XP усього`,
    maxLevelLabel: 'Максимальний рівень!',
    nextLevelLabel: (level, xp) => `До рівня ${level}: ${xp} XP`,
    nextPracticeStep: 'Наступний крок у практиці.',
    noActiveAssignment: 'Немає активного завдання.',
    parentEyebrow: 'Завдання від батьків',
    returnToPracticeAction: 'Повернутися до практики',
    returnToPracticeDescription: 'Поверніться до практики і продовжіть виклик.',
    selfPriority: 'Власний пріоритет',
    sessionPriority: 'Сесія практики',
    totalXpLabelTemplate: '{xp} XP усього',
    xpIntoLevelLabelTemplate: '{xp} XP',
  },
  de: {
    completedParentEyebrow: 'Abgeschlossene Elternaufgabe',
    completedPercentTemplate: '{percent}% abgeschlossen',
    continuePracticeTitle: 'Praxis fortsetzen',
    followUpEyebrow: 'Weitere Praxis',
    levelSummary: (level, xp) => `Level ${level} · ${xp} XP gesamt`,
    maxLevelLabel: 'Maximales Level!',
    nextLevelLabel: (level, xp) => `Bis Level ${level}: ${xp} XP`,
    nextPracticeStep: 'Nächster Schritt in der Praxis.',
    noActiveAssignment: 'Keine aktive Aufgabe.',
    parentEyebrow: 'Elternaufgabe',
    returnToPracticeAction: 'Zurück zur Praxis',
    returnToPracticeDescription: 'Kehre zur Praxis zurück und setze die Herausforderung fort.',
    selfPriority: 'Eigene Priorität',
    sessionPriority: 'Praxisrunde',
    totalXpLabelTemplate: '{xp} XP gesamt',
    xpIntoLevelLabelTemplate: '{xp} XP',
  },
  en: {
    completedParentEyebrow: 'Completed parent assignment',
    completedPercentTemplate: '{percent}% completed',
    continuePracticeTitle: 'Continue practice',
    followUpEyebrow: 'Next practice',
    levelSummary: (level, xp) => `Level ${level} · ${xp} XP total`,
    maxLevelLabel: 'Maximum level!',
    nextLevelLabel: (level, xp) => `To level ${level}: ${xp} XP`,
    nextPracticeStep: 'Next step in practice.',
    noActiveAssignment: 'No active assignment.',
    parentEyebrow: 'Parent assignment',
    returnToPracticeAction: 'Return to practice',
    returnToPracticeDescription: 'Return to practice and continue the challenge.',
    selfPriority: 'Self priority',
    sessionPriority: 'Practice session',
    totalXpLabelTemplate: '{xp} XP total',
    xpIntoLevelLabelTemplate: '{xp} XP',
  },
  pl: {
    completedParentEyebrow: 'Ukończone zadanie od rodzica',
    completedPercentTemplate: '{percent}% ukończono',
    continuePracticeTitle: 'Kontynuuj praktykę',
    followUpEyebrow: 'Dalsza praktyka',
    levelSummary: (level, xp) => `Poziom ${level} · ${xp} XP łącznie`,
    maxLevelLabel: 'Maksymalny poziom!',
    nextLevelLabel: (level, xp) => `Do poziomu ${level}: ${xp} XP`,
    nextPracticeStep: 'Następny krok w praktyce.',
    noActiveAssignment: 'Brak aktywnego zadania.',
    parentEyebrow: 'Zadanie od rodzica',
    returnToPracticeAction: 'Wróć do praktyki',
    returnToPracticeDescription: 'Wróć do praktyki i kontynuuj wyzwanie.',
    selfPriority: 'Priorytet własny',
    sessionPriority: 'Sesja praktyki',
    totalXpLabelTemplate: '{xp} XP łącznie',
    xpIntoLevelLabelTemplate: '{xp} XP',
  },
};

const getKangurCmsRuntimeFallbackCopy = (
  locale: ReturnType<typeof normalizeSiteLocale>
): KangurCmsRuntimeFallbackCopy => {
  const primary = KANGUR_CMS_RUNTIME_FALLBACK_COPY_BY_LOCALE[locale];
  if (primary) return primary;
  const secondary = KANGUR_CMS_RUNTIME_FALLBACK_COPY_BY_LOCALE['pl'];
  if (!secondary) throw new Error('Missing primary fallback language');
  return secondary;
};

export function KangurCmsRuntimeDataProvider({
  children,
}: {
  children: React.ReactNode;
}): React.ReactNode {
  const locale = normalizeSiteLocale(useLocale());
  const cmsRuntimeTranslations = useTranslations('KangurCmsRuntime');
  const assignmentsRuntimeTranslations = useTranslations('KangurAssignmentsRuntime');
  const progressRuntimeTranslations = useTranslations('KangurLearnerProfileRuntime');
  const router = useRouter();
  const routeTransition = useOptionalKangurRouteTransition();
  const auth = useKangurAuth();
  const routing = useOptionalKangurRouting();
  const progress = useKangurProgressState();
  const game = useOptionalKangurGameRuntime();
  const lessons = useOptionalKangurLessonsRuntime();
  const learnerProfile = useOptionalKangurLearnerProfileRuntime();
  const parentDashboard = useOptionalKangurParentDashboardRuntime();
  const leaderboard = useKangurLeaderboardState({
    enabled: routing?.pageKey === 'Game',
  });
  const trainingSetup = useKangurTrainingSetupState({
    active: game?.screen === 'training',
    onStart: game?.handleStartTraining,
  });
  const operationSelector = useKangurOperationSelectorState({
    active: game?.screen === 'operation',
    onSelect: game?.handleSelectOperation,
    priorityAssignmentsByOperation: game?.practiceAssignmentsByOperation,
  });
  const { assignments: delegatedAssignments, error: assignmentsError, isLoading: isLoadingAssignments } =
    useKangurAssignments({
      enabled:
        routing?.pageKey === 'Game' &&
        (auth.canAccessParentAssignments ?? Boolean(auth.user?.activeLearner?.id)),
      query: {
        includeArchived: false,
      },
    });
  const pushKangurRoute = useCallback(
    (href: string, pageKey?: string): void => {
      routeTransition?.startRouteTransition({
        href,
        pageKey,
      });
      startTransition(() => { router.push(href); });
    },
    [routeTransition, router]
  );
  const cmsRuntimeTranslate = useCallback(
    (key: string, values?: TranslationValues): string =>
      cmsRuntimeTranslations(key, values),
    [cmsRuntimeTranslations]
  );
  const cmsRuntimeLocalizer = useMemo(
    () => ({
      locale,
      translate: cmsRuntimeTranslate,
    }),
    [cmsRuntimeTranslate, locale]
  );
  const cmsRuntimeFallbackCopy = useMemo(
    () => getKangurCmsRuntimeFallbackCopy(locale),
    [locale]
  );
  const assignmentsRuntimeLocalizer = useMemo(
    () => ({
      locale,
      translate: (
        key: string,
        values?: TranslationValues
      ): string => assignmentsRuntimeTranslations(key, values),
    }),
    [assignmentsRuntimeTranslations, locale]
  );
  const progressRuntimeTranslate = useCallback(
    (key: string, values?: TranslationValues): string =>
      progressRuntimeTranslations(key, values),
    [progressRuntimeTranslations]
  );
  const progressRuntime = useMemo(() => {
    const currentLevel = getCurrentLevel(progress.totalXp, LEVELS, FALLBACK_LEVEL);
    const nextLevel = getNextLevel(progress.totalXp, LEVELS);
    const xpIntoLevel = progress.totalXp - currentLevel.minXp;
    const xpNeeded = nextLevel ? Math.max(1, nextLevel.minXp - currentLevel.minXp) : 1;
    const levelProgressPercent = nextLevel
      ? Math.min(100, Math.round((xpIntoLevel / xpNeeded) * 100))
      : 100;
    const xpToNextLevel = nextLevel ? Math.max(0, nextLevel.minXp - progress.totalXp) : 0;
    const badgesUnlockedCount = BADGES.filter((badge) => progress.badges.includes(badge.id)).length;

    return {
      ...progress,
      badgesUnlockedCount,
      badgesUnlockedCountLabel: String(badgesUnlockedCount),
      currentLevelNumber: currentLevel.level,
      currentLevelTitle: getLocalizedKangurProgressLevelTitle({
        level: currentLevel.level,
        fallback: currentLevel.title,
        translate: progressRuntimeTranslate,
      }),
      gamesPlayedLabel: String(progress.gamesPlayed),
      lessonsCompletedLabel: String(progress.lessonsCompleted),
      levelProgressPercent,
      levelSummary: translateKangurProgressWithFallback(
        progressRuntimeTranslate,
        'overview.levelDescription',
        cmsRuntimeFallbackCopy.levelSummary(currentLevel.level, progress.totalXp),
        {
          level: currentLevel.level,
          xp: progress.totalXp,
        }
      ),
      nextLevelNumber: nextLevel?.level ?? null,
      totalXpLabel: translateKangurCmsRuntimeWithFallback(
        cmsRuntimeLocalizer,
        'progress.totalXpLabel',
        cmsRuntimeFallbackCopy.totalXpLabelTemplate,
        {
          xp: progress.totalXp,
        }
      ),
      xpIntoLevel,
      xpIntoLevelLabel: translateKangurCmsRuntimeWithFallback(
        cmsRuntimeLocalizer,
        'progress.xpIntoLevelLabel',
        cmsRuntimeFallbackCopy.xpIntoLevelLabelTemplate,
        {
          xp: xpIntoLevel,
        }
      ),
      xpToNextLevel,
      xpToNextLevelLabel: nextLevel
        ? translateKangurProgressWithFallback(
          progressRuntimeTranslate,
          'overview.nextLevel',
          cmsRuntimeFallbackCopy.nextLevelLabel(nextLevel.level, xpToNextLevel),
          {
            level: nextLevel.level,
            xp: xpToNextLevel,
          }
        )
        : translateKangurProgressWithFallback(
          progressRuntimeTranslate,
          'overview.maxLevel',
          cmsRuntimeFallbackCopy.maxLevelLabel
        ),
    };
  }, [cmsRuntimeFallbackCopy, cmsRuntimeLocalizer, progress, progressRuntimeTranslate]);
  const priorityAssignments = useMemo(() => {
    if (isLoadingAssignments || assignmentsError) {
      return [];
    }

    return selectKangurPriorityAssignments(delegatedAssignments, delegatedAssignments.length);
  }, [assignmentsError, delegatedAssignments, isLoadingAssignments]);
  const homeSpotlightAssignment = priorityAssignments[0] ?? null;
  const priorityAssignmentItems = useMemo(
    () =>
      priorityAssignments.map((assignment) => ({
        actionLabel: getKangurAssignmentActionLabel(assignment, assignmentsRuntimeLocalizer),
        description: assignment.description,
        id: assignment.id,
        openAssignment: (): void => {
          pushKangurRoute(buildKangurAssignmentHref(routing?.basePath ?? '', assignment));
        },
        priorityLabel: resolveKangurCmsAssignmentPriorityLabel(
          assignment.priority,
          cmsRuntimeLocalizer
        ),
        progressLabel: assignment.progress.summary,
        progressPercent: assignment.progress.percent,
        title: assignment.title,
      })),
    [
      assignmentsRuntimeLocalizer,
      cmsRuntimeLocalizer,
      priorityAssignments,
      pushKangurRoute,
      routing?.basePath,
    ]
  );
  const openHomeSpotlightAssignment = useCallback((): void => {
    if (!homeSpotlightAssignment) {
      return;
    }

    pushKangurRoute(buildKangurAssignmentHref(routing?.basePath ?? '', homeSpotlightAssignment));
  }, [homeSpotlightAssignment, pushKangurRoute, routing?.basePath]);
  const openResultAssignment = useCallback((): void => {
    if (!game?.resultPracticeAssignment) {
      return;
    }

    pushKangurRoute(buildKangurAssignmentHref(routing?.basePath ?? '', game.resultPracticeAssignment));
  }, [game?.resultPracticeAssignment, pushKangurRoute, routing?.basePath]);
  const openActivePracticeAssignment = useCallback((): void => {
    if (!game?.activePracticeAssignment) {
      return;
    }

    pushKangurRoute(buildKangurAssignmentHref(routing?.basePath ?? '', game.activePracticeAssignment));
  }, [game?.activePracticeAssignment, pushKangurRoute, routing?.basePath]);
  const gameRuntime = useMemo(() => {
    if (!game) {
      return null;
    }

    const resultPercent =
      game.totalQuestions > 0 ? Math.round((game.score / game.totalQuestions) * 100) : 0;
    const resultStars = resolveResultStars(resultPercent);
    const resultAssignment = game.resultPracticeAssignment;

    return {
      ...game,
      homeSpotlight: {
        actionLabel: homeSpotlightAssignment
          ? getKangurAssignmentActionLabel(homeSpotlightAssignment, assignmentsRuntimeLocalizer)
          : translateKangurCmsRuntimeWithFallback(
            cmsRuntimeLocalizer,
            'assignments.actions.returnToPractice',
            cmsRuntimeFallbackCopy.returnToPracticeAction
          ),
        description:
          homeSpotlightAssignment?.description?.trim() ||
          translateKangurCmsRuntimeWithFallback(
            cmsRuntimeLocalizer,
            'assignments.description.returnToPractice',
            cmsRuntimeFallbackCopy.returnToPracticeDescription
          ),
        hasAssignment: Boolean(homeSpotlightAssignment),
        openAssignment: openHomeSpotlightAssignment,
        priorityLabel: homeSpotlightAssignment
          ? resolveKangurCmsAssignmentPriorityLabel(
            homeSpotlightAssignment.priority,
            cmsRuntimeLocalizer
          )
          : translateKangurCmsRuntimeWithFallback(
            cmsRuntimeLocalizer,
            'assignments.priority.session',
            cmsRuntimeFallbackCopy.sessionPriority
          ),
        progressLabel: homeSpotlightAssignment?.progress.summary ??
          translateKangurCmsRuntimeWithFallback(
            cmsRuntimeLocalizer,
            'assignments.progress.completedPercent',
            cmsRuntimeFallbackCopy.completedPercentTemplate,
            { percent: 0 }
          ),
        progressPercent: homeSpotlightAssignment?.progress.percent ?? 0,
        title: homeSpotlightAssignment?.title ??
          translateKangurCmsRuntimeWithFallback(
            cmsRuntimeLocalizer,
            'assignments.title.continuePractice',
            cmsRuntimeFallbackCopy.continuePracticeTitle
          ),
      },
      priorityAssignments: {
        count: priorityAssignmentItems.length,
        countLabel: formatKangurCmsAssignmentCountLabel(
          priorityAssignmentItems.length,
          cmsRuntimeLocalizer
        ),
        hasItems: priorityAssignmentItems.length > 0,
        items: priorityAssignmentItems,
      },
      activePracticeAssignmentBanner: {
        actionLabel: game.activePracticeAssignment
          ? getKangurAssignmentActionLabel(
            game.activePracticeAssignment,
            assignmentsRuntimeLocalizer
          )
          : translateKangurCmsRuntimeWithFallback(
            cmsRuntimeLocalizer,
            'assignments.actions.returnToPractice',
            cmsRuntimeFallbackCopy.returnToPracticeAction
          ),
        description:
          game.activePracticeAssignment?.description?.trim() ||
          translateKangurCmsRuntimeWithFallback(
            cmsRuntimeLocalizer,
            'assignments.description.returnToPractice',
            cmsRuntimeFallbackCopy.returnToPracticeDescription
          ),
        hasAssignment: Boolean(game.activePracticeAssignment),
        helperLabel: game.activePracticeAssignment
          ? resolveKangurCmsPracticeAssignmentHelperLabel(
            game.screen,
            formatKangurAssignmentOperationLabel(
              game.activePracticeAssignment.target.operation,
              assignmentsRuntimeLocalizer
            ),
            cmsRuntimeLocalizer
          )
          : translateKangurCmsRuntimeWithFallback(
            cmsRuntimeLocalizer,
            'assignments.helper.nextStep',
            cmsRuntimeFallbackCopy.nextPracticeStep
          ),
        openAssignment: openActivePracticeAssignment,
        priorityLabel: game.activePracticeAssignment
          ? resolveKangurCmsAssignmentPriorityLabel(
            game.activePracticeAssignment.priority,
            cmsRuntimeLocalizer
          )
          : translateKangurCmsRuntimeWithFallback(
            cmsRuntimeLocalizer,
            'assignments.priority.session',
            cmsRuntimeFallbackCopy.sessionPriority
          ),
        progressLabel: game.activePracticeAssignment?.progress.summary ??
          translateKangurCmsRuntimeWithFallback(
            cmsRuntimeLocalizer,
            'assignments.progress.completedPercent',
            cmsRuntimeFallbackCopy.completedPercentTemplate,
            { percent: 0 }
          ),
        progressPercent: game.activePracticeAssignment?.progress.percent ?? 0,
        title: game.activePracticeAssignment?.title ??
          translateKangurCmsRuntimeWithFallback(
            cmsRuntimeLocalizer,
            'assignments.title.continuePractice',
            cmsRuntimeFallbackCopy.continuePracticeTitle
          ),
      },
      leaderboard: {
        emptyStateLabel: leaderboard.emptyStateLabel,
        hasItems: leaderboard.items.length > 0,
        isLoading: leaderboard.loading,
        items: leaderboard.items,
        operationFilters: {
          items: leaderboard.operationFilters.map((filter) => ({
            displayLabel: filter.displayLabel,
            id: filter.id,
            label: filter.label,
            select: filter.select,
            selected: filter.selected,
          })),
        },
        showEmptyState: !leaderboard.loading && leaderboard.items.length === 0,
        userFilters: {
          items: leaderboard.userFilters.map((filter) => ({
            displayLabel: filter.displayLabel,
            icon: filter.icon,
            id: filter.id,
            label: filter.label,
            select: filter.select,
            selected: filter.selected,
          })),
        },
      },
      trainingSetup: {
        categoryOptions: {
          items: trainingSetup.categoryOptions.map((option) => ({
            displayLabel: option.displayLabel,
            emoji: option.emoji,
            id: option.id,
            label: option.label,
            select: option.select,
            selected: option.selected,
          })),
        },
        countOptions: {
          items: trainingSetup.countOptions.map((option) => ({
            displayLabel: option.displayLabel,
            id: option.id,
            select: option.select,
            selected: option.selected,
            value: option.value,
          })),
        },
        difficultyOptions: {
          items: trainingSetup.difficultyOptions.map((option) => ({
            displayLabel: option.displayLabel,
            id: option.id,
            label: option.label,
            metaLabel: option.metaLabel,
            select: option.select,
            selected: option.selected,
          })),
        },
        start: trainingSetup.startTraining,
        summaryLabel: trainingSetup.summaryLabel,
        toggleAllCategories: trainingSetup.toggleAllCategories,
        toggleAllLabel: trainingSetup.toggleAllLabel,
      },
      operationSelector: {
        difficultyOptions: {
          items: operationSelector.difficultyOptions.map((option) => ({
            displayLabel: option.displayLabel,
            id: option.id,
            label: option.label,
            metaLabel: option.metaLabel,
            select: option.select,
            selected: option.selected,
          })),
        },
        greetingLabel: resolveKangurCmsGreetingLabel(game.playerName, cmsRuntimeLocalizer),
        operations: {
          items: operationSelector.operations.map((item) => ({
            actionLabel: item.actionLabel,
            description: item.description,
            displayLabel: item.displayLabel,
            emoji: item.emoji,
            hasPriorityAssignment: item.hasPriorityAssignment,
            id: item.id,
            label: item.label,
            priorityLabel: item.priority
              ? resolveKangurCmsAssignmentPriorityLabel(item.priority, cmsRuntimeLocalizer)
              : translateKangurCmsRuntimeWithFallback(
                cmsRuntimeLocalizer,
                'assignments.priority.self',
                cmsRuntimeFallbackCopy.selfPriority
              ),
            select: item.select,
            statusLabel: item.statusLabel,
          })),
        },
      },
      result: {
        accuracyLabel: `${resultPercent}%`,
        assignmentActionLabel: resultAssignment
          ? getKangurAssignmentActionLabel(resultAssignment, assignmentsRuntimeLocalizer)
          : translateKangurCmsRuntimeWithFallback(
            cmsRuntimeLocalizer,
            'assignments.actions.returnToPractice',
            cmsRuntimeFallbackCopy.returnToPracticeAction
          ),
        assignmentDescription:
          resultAssignment?.description?.trim() ||
          translateKangurCmsRuntimeWithFallback(
            cmsRuntimeLocalizer,
            'assignments.description.returnToPractice',
            cmsRuntimeFallbackCopy.returnToPracticeDescription
          ),
        assignmentEyebrow: resultAssignment
          ? resultAssignment.progress.status === 'completed'
            ? translateKangurCmsRuntimeWithFallback(
              cmsRuntimeLocalizer,
              'assignments.eyebrow.completedParent',
              cmsRuntimeFallbackCopy.completedParentEyebrow
            )
            : translateKangurCmsRuntimeWithFallback(
              cmsRuntimeLocalizer,
              'assignments.eyebrow.parent',
              cmsRuntimeFallbackCopy.parentEyebrow
            )
          : translateKangurCmsRuntimeWithFallback(
            cmsRuntimeLocalizer,
            'assignments.eyebrow.followUp',
            cmsRuntimeFallbackCopy.followUpEyebrow
          ),
        assignmentProgressLabel: resultAssignment?.progress.summary ??
          translateKangurCmsRuntimeWithFallback(
            cmsRuntimeLocalizer,
            'assignments.progress.none',
            cmsRuntimeFallbackCopy.noActiveAssignment
          ),
        assignmentProgressPercent: resultAssignment?.progress.percent ?? 0,
        assignmentTitle: resultAssignment?.title ??
          translateKangurCmsRuntimeWithFallback(
            cmsRuntimeLocalizer,
            'assignments.title.continuePractice',
            cmsRuntimeFallbackCopy.continuePracticeTitle
          ),
        hasAssignment: Boolean(resultAssignment),
        message: resolveKangurCmsResultMessage(resultPercent, cmsRuntimeLocalizer),
        operationLabel: formatKangurAssignmentOperationLabel(
          game.operation ?? 'mixed',
          assignmentsRuntimeLocalizer
        ),
        openAssignment: openResultAssignment,
        percent: resultPercent,
        percentLabel: `${resultPercent}%`,
        scoreLabel: `${game.score} / ${game.totalQuestions}`,
        stars: resultStars,
        starsLabel: formatKangurCmsResultStarsLabel(resultStars, cmsRuntimeLocalizer),
        timeTakenLabel: formatKangurCmsTimeTakenLabel(game.timeTaken, cmsRuntimeLocalizer),
        title: resolveKangurCmsResultTitle(game.playerName, cmsRuntimeLocalizer),
      },
    };
  }, [
    cmsRuntimeFallbackCopy,
    cmsRuntimeLocalizer,
    assignmentsRuntimeLocalizer,
    game,
    homeSpotlightAssignment,
    leaderboard.emptyStateLabel,
    leaderboard.items,
    leaderboard.loading,
    leaderboard.operationFilters,
    leaderboard.userFilters,
    openActivePracticeAssignment,
    openHomeSpotlightAssignment,
    openResultAssignment,
    operationSelector.difficultyOptions,
    operationSelector.operations,
    priorityAssignmentItems,
    trainingSetup.categoryOptions,
    trainingSetup.countOptions,
    trainingSetup.difficultyOptions,
    trainingSetup.startTraining,
    trainingSetup.summaryLabel,
    trainingSetup.toggleAllCategories,
    trainingSetup.toggleAllLabel,
  ]);
  const navigateToPage = useCallback(
    (pageKey: unknown): void => {
      if (typeof pageKey !== 'string' || pageKey.trim().length === 0) {
        return;
      }

      pushKangurRoute(getKangurPageHref(pageKey.trim(), routing?.basePath), pageKey.trim());
    },
    [pushKangurRoute, routing?.basePath]
  );

  const page = useMemo(
    () => ({
      basePath: routing?.basePath ?? '',
      embedded: routing?.embedded ?? false,
      key: routing?.pageKey ?? null,
      navigateToPage,
    }),
    [navigateToPage, routing?.basePath, routing?.embedded, routing?.pageKey]
  );
  const authState = useMemo(
    () => ({
      authErrorType: auth.authError?.type ?? null,
      isAuthenticated: auth.isAuthenticated,
      isLoadingAuth: auth.isLoadingAuth,
      user: auth.user,
    }),
    [auth.authError?.type, auth.isAuthenticated, auth.isLoadingAuth, auth.user]
  );
  const sources = useMemo(
    () => ({
      auth: authState,
      game: gameRuntime,
      kangur: {
        auth: authState,
        game: gameRuntime,
        learnerProfile,
        lessons,
        page,
        parentDashboard,
        progress: progressRuntime,
      },
      learnerProfile,
      lessons,
      page,
      parentDashboard,
      progress: progressRuntime,
    }),
    [authState, gameRuntime, learnerProfile, lessons, page, parentDashboard, progressRuntime]
  );

  return <CmsRuntimeProvider sources={sources}>{children}</CmsRuntimeProvider>;
}
