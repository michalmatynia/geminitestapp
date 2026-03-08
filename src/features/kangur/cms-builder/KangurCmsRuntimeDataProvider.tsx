'use client';

import React, { useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';

import { CmsRuntimeProvider } from '@/features/cms/public';
import { getKangurPageHref } from '@/features/kangur/config/routing';
import {
  buildKangurAssignmentHref,
  formatKangurAssignmentOperationLabel,
  getKangurAssignmentActionLabel,
  selectKangurPriorityAssignments,
} from '@/features/kangur/ui/services/delegated-assignments';
import { BADGES, getCurrentLevel, getNextLevel } from '@/features/kangur/ui/services/progress';
import { useKangurAuth } from '@/features/kangur/ui/context/KangurAuthContext';
import {
  useOptionalKangurGameRuntime,
} from '@/features/kangur/ui/context/KangurGameRuntimeContext';
import {
  useOptionalKangurLearnerProfileRuntime,
} from '@/features/kangur/ui/context/KangurLearnerProfileRuntimeContext';
import {
  useOptionalKangurParentDashboardRuntime,
} from '@/features/kangur/ui/context/KangurParentDashboardRuntimeContext';
import { useOptionalKangurLessonsRuntime } from '@/features/kangur/ui/context/KangurLessonsRuntimeContext';
import { useOptionalKangurRouteTransition } from '@/features/kangur/ui/context/KangurRouteTransitionContext';
import { useOptionalKangurRouting } from '@/features/kangur/ui/context/KangurRoutingContext';
import { useKangurAssignments } from '@/features/kangur/ui/hooks/useKangurAssignments';
import { useKangurLeaderboardState } from '@/features/kangur/ui/hooks/useKangurLeaderboardState';
import { useKangurOperationSelectorState } from '@/features/kangur/ui/hooks/useKangurOperationSelectorState';
import { useKangurProgressState } from '@/features/kangur/ui/hooks/useKangurProgressState';
import { useKangurTrainingSetupState } from '@/features/kangur/ui/hooks/useKangurTrainingSetupState';
import type { KangurGameScreen } from '@/features/kangur/ui/types';
import type { KangurPracticeAssignmentOperation } from '@/shared/contracts/kangur';

const resolveResultStars = (percent: number): number =>
  percent >= 90 ? 3 : percent >= 60 ? 2 : 1;

const resolveResultMessage = (percent: number): string => {
  if (percent === 100) {
    return 'Idealny wynik! Jestes gwiazda matematyki.';
  }

  if (percent >= 80) {
    return 'Niesamowita robota! Tak trzymaj.';
  }

  if (percent >= 60) {
    return 'Dobra robota! Cwiczenie czyni mistrza.';
  }

  return 'Probuj dalej. Dasz rade.';
};

const resolveResultTitle = (playerName: string): string => {
  const normalizedName = playerName.trim();
  return `Swietna robota, ${normalizedName || 'Graczu'}!`;
};

const resolveAssignmentPriorityLabel = (priority: 'high' | 'medium' | 'low'): string => {
  if (priority === 'high') {
    return 'Priorytet wysoki';
  }

  if (priority === 'medium') {
    return 'Priorytet sredni';
  }

  return 'Priorytet niski';
};

const resolvePracticeAssignmentHelperLabel = (
  screen: KangurGameScreen,
  operation: KangurPracticeAssignmentOperation
): string => {
  if (screen === 'training' || screen === 'playing') {
    return 'W tej sesji realizujesz przydzielone zadanie.';
  }

  return `Najblizszy priorytet w praktyce: ${formatKangurAssignmentOperationLabel(operation)}.`;
};

export function KangurCmsRuntimeDataProvider({
  children,
}: {
  children: React.ReactNode;
}): React.ReactNode {
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
      router.push(href);
    },
    [routeTransition, router]
  );
  const progressRuntime = useMemo(() => {
    const currentLevel = getCurrentLevel(progress.totalXp);
    const nextLevel = getNextLevel(progress.totalXp);
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
      currentLevelTitle: currentLevel.title,
      gamesPlayedLabel: String(progress.gamesPlayed),
      lessonsCompletedLabel: String(progress.lessonsCompleted),
      levelProgressPercent,
      levelSummary: `Poziom ${currentLevel.level} · ${progress.totalXp} XP lacznie`,
      nextLevelNumber: nextLevel?.level ?? null,
      totalXpLabel: `${progress.totalXp} XP lacznie`,
      xpIntoLevel,
      xpIntoLevelLabel: `${xpIntoLevel} XP`,
      xpToNextLevel,
      xpToNextLevelLabel: nextLevel
        ? `Do poziomu ${nextLevel.level}: ${xpToNextLevel} XP`
        : 'Maksymalny poziom!',
    };
  }, [progress]);
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
        actionLabel: getKangurAssignmentActionLabel(assignment),
        description: assignment.description,
        id: assignment.id,
        openAssignment: (): void => {
          pushKangurRoute(buildKangurAssignmentHref(routing?.basePath ?? '', assignment));
        },
        priorityLabel: resolveAssignmentPriorityLabel(assignment.priority),
        progressLabel: assignment.progress.summary,
        progressPercent: assignment.progress.percent,
        title: assignment.title,
      })),
    [priorityAssignments, pushKangurRoute, routing?.basePath]
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
          ? getKangurAssignmentActionLabel(homeSpotlightAssignment)
          : 'Wroc do praktyki',
        description:
          homeSpotlightAssignment?.description?.trim() || 'Wroc do praktyki i kontynuuj wyzwanie.',
        hasAssignment: Boolean(homeSpotlightAssignment),
        openAssignment: openHomeSpotlightAssignment,
        priorityLabel: homeSpotlightAssignment
          ? resolveAssignmentPriorityLabel(homeSpotlightAssignment.priority)
          : 'Sesja praktyki',
        progressLabel: homeSpotlightAssignment?.progress.summary ?? '0% ukonczono',
        progressPercent: homeSpotlightAssignment?.progress.percent ?? 0,
        title: homeSpotlightAssignment?.title ?? 'Kontynuuj praktyke',
      },
      priorityAssignments: {
        count: priorityAssignmentItems.length,
        countLabel: `${priorityAssignmentItems.length} zadan`,
        hasItems: priorityAssignmentItems.length > 0,
        items: priorityAssignmentItems,
      },
      activePracticeAssignmentBanner: {
        actionLabel: game.activePracticeAssignment
          ? getKangurAssignmentActionLabel(game.activePracticeAssignment)
          : 'Wroc do praktyki',
        description:
          game.activePracticeAssignment?.description?.trim() ||
          'Wroc do praktyki i kontynuuj wyzwanie.',
        hasAssignment: Boolean(game.activePracticeAssignment),
        helperLabel: game.activePracticeAssignment
          ? resolvePracticeAssignmentHelperLabel(
            game.screen,
            game.activePracticeAssignment.target.operation
          )
          : 'Nastepny krok w praktyce.',
        openAssignment: openActivePracticeAssignment,
        priorityLabel: game.activePracticeAssignment
          ? resolveAssignmentPriorityLabel(game.activePracticeAssignment.priority)
          : 'Sesja praktyki',
        progressLabel: game.activePracticeAssignment?.progress.summary ?? '0% ukonczono',
        progressPercent: game.activePracticeAssignment?.progress.percent ?? 0,
        title: game.activePracticeAssignment?.title ?? 'Kontynuuj praktyke',
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
        greetingLabel: `Czesc, ${game.playerName || 'Graczu'}! 👋`,
        operations: {
          items: operationSelector.operations.map((item) => ({
            actionLabel: item.actionLabel,
            description: item.description,
            displayLabel: item.displayLabel,
            emoji: item.emoji,
            hasPriorityAssignment: item.hasPriorityAssignment,
            id: item.id,
            label: item.label,
            priorityLabel: item.priorityLabel,
            select: item.select,
            statusLabel: item.statusLabel,
          })),
        },
      },
      result: {
        accuracyLabel: `${resultPercent}%`,
        assignmentActionLabel: resultAssignment
          ? getKangurAssignmentActionLabel(resultAssignment)
          : 'Wroc do praktyki',
        assignmentDescription:
          resultAssignment?.description?.trim() || 'Wroc do praktyki i kontynuuj wyzwanie.',
        assignmentEyebrow: resultAssignment
          ? resultAssignment.progress.status === 'completed'
            ? 'Ukonczone zadanie od rodzica'
            : 'Zadanie od rodzica'
          : 'Dalsza praktyka',
        assignmentProgressLabel: resultAssignment?.progress.summary ?? 'Brak aktywnego zadania.',
        assignmentProgressPercent: resultAssignment?.progress.percent ?? 0,
        assignmentTitle: resultAssignment?.title ?? 'Kontynuuj praktyke',
        hasAssignment: Boolean(resultAssignment),
        message: resolveResultMessage(resultPercent),
        operationLabel: formatKangurAssignmentOperationLabel(game.operation ?? 'mixed'),
        openAssignment: openResultAssignment,
        percent: resultPercent,
        percentLabel: `${resultPercent}%`,
        scoreLabel: `${game.score} / ${game.totalQuestions}`,
        stars: resultStars,
        starsLabel: `${resultStars} / 3 gwiazdki`,
        timeTakenLabel: `${game.timeTaken}s`,
        title: resolveResultTitle(game.playerName),
      },
    };
  }, [
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
