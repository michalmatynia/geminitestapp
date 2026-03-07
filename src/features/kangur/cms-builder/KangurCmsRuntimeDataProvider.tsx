'use client';

import React, { useCallback, useMemo } from 'react';

import { CmsRuntimeProvider } from '@/features/cms/components/frontend/CmsRuntimeContext';
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
import { useOptionalKangurRouting } from '@/features/kangur/ui/context/KangurRoutingContext';
import { useKangurAssignments } from '@/features/kangur/ui/hooks/useKangurAssignments';
import { useKangurProgressState } from '@/features/kangur/ui/hooks/useKangurProgressState';

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

export function KangurCmsRuntimeDataProvider({
  children,
}: {
  children: React.ReactNode;
}): React.ReactNode {
  const auth = useKangurAuth();
  const routing = useOptionalKangurRouting();
  const progress = useKangurProgressState();
  const game = useOptionalKangurGameRuntime();
  const lessons = useOptionalKangurLessonsRuntime();
  const learnerProfile = useOptionalKangurLearnerProfileRuntime();
  const parentDashboard = useOptionalKangurParentDashboardRuntime();
  const { assignments: delegatedAssignments, error: assignmentsError, isLoading: isLoadingAssignments } =
    useKangurAssignments({
      enabled: routing?.pageKey === 'Game' && auth.isAuthenticated,
      query: {
        includeArchived: false,
      },
    });
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
  const homeSpotlightAssignment = useMemo(() => {
    if (isLoadingAssignments || assignmentsError) {
      return null;
    }

    return selectKangurPriorityAssignments(delegatedAssignments, 1)[0] ?? null;
  }, [assignmentsError, delegatedAssignments, isLoadingAssignments]);
  const openHomeSpotlightAssignment = useCallback((): void => {
    if (typeof window === 'undefined' || !homeSpotlightAssignment) {
      return;
    }

    window.location.href = buildKangurAssignmentHref(routing?.basePath ?? '', homeSpotlightAssignment);
  }, [homeSpotlightAssignment, routing?.basePath]);
  const openResultAssignment = useCallback((): void => {
    if (typeof window === 'undefined' || !game?.resultPracticeAssignment) {
      return;
    }

    window.location.href = buildKangurAssignmentHref(
      routing?.basePath ?? '',
      game.resultPracticeAssignment
    );
  }, [game?.resultPracticeAssignment, routing?.basePath]);
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
          : 'Kontynuuj zadanie',
        description:
          homeSpotlightAssignment?.description?.trim() || 'Wroc do zadania i kontynuuj wyzwanie.',
        hasAssignment: Boolean(homeSpotlightAssignment),
        openAssignment: openHomeSpotlightAssignment,
        priorityLabel: homeSpotlightAssignment
          ? resolveAssignmentPriorityLabel(homeSpotlightAssignment.priority)
          : 'Priorytet wysoki',
        progressLabel: homeSpotlightAssignment?.progress.summary ?? '0% ukonczono',
        progressPercent: homeSpotlightAssignment?.progress.percent ?? 0,
        title: homeSpotlightAssignment?.title ?? 'Zadanie od rodzica',
      },
      result: {
        accuracyLabel: `${resultPercent}%`,
        assignmentActionLabel: resultAssignment
          ? getKangurAssignmentActionLabel(resultAssignment)
          : 'Kontynuuj zadanie',
        assignmentDescription:
          resultAssignment?.description?.trim() || 'Wroc do zadania i kontynuuj wyzwanie.',
        assignmentEyebrow: resultAssignment
          ? resultAssignment.progress.status === 'completed'
            ? 'Ukonczone zadanie od rodzica'
            : 'Zadanie od rodzica'
          : 'Zadanie od rodzica',
        assignmentProgressLabel: resultAssignment?.progress.summary ?? 'Brak aktywnego zadania.',
        assignmentProgressPercent: resultAssignment?.progress.percent ?? 0,
        assignmentTitle: resultAssignment?.title ?? 'Priorytetowe zadanie',
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
  }, [game, homeSpotlightAssignment, openHomeSpotlightAssignment, openResultAssignment]);
  const navigateToPage = useCallback(
    (pageKey: unknown): void => {
      if (typeof window === 'undefined' || typeof pageKey !== 'string' || pageKey.trim().length === 0) {
        return;
      }

      window.location.href = getKangurPageHref(pageKey.trim(), routing?.basePath);
    },
    [routing?.basePath]
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
