'use client';

import React, { useCallback, useEffect, useMemo, useState, type ComponentProps } from 'react';
import { useTranslations } from 'next-intl';

import { useOptionalKangurRouteTransitionState } from '@/features/kangur/ui/context/KangurRouteTransitionContext';
import { useKangurRoutePageReady } from '@/features/kangur/ui/hooks/useKangurRoutePageReady';
import { KangurStandardPageLayout } from '@/features/kangur/ui/components/KangurStandardPageLayout';
import { KangurTopNavigationController } from '@/features/kangur/ui/components/primary-navigation/KangurTopNavigationController';
import type { KangurPrimaryNavigationProps } from '@/features/kangur/ui/components/primary-navigation/KangurPrimaryNavigation.types';
import { useKangurLoginModalActions } from '@/features/kangur/ui/context/KangurLoginModalContext';
import {
  LessonsProvider,
  useLessons,
} from './lessons/LessonsContext';
import { LessonsCatalog } from './lessons/Lessons.Catalog';
import {
  LazyActiveLessonView,
} from './lessons/LazyActiveLessonView';
import { LazyLessonsDeferredEnhancements } from './lessons/LazyLessonsDeferredEnhancements';
import {
  useLessonsActiveLessonRenderSnapshot,
  type LessonsActiveLessonSnapshot,
} from './lessons/Lessons.hooks';
import {
  resolveLessonsActiveLessonAssignments,
  resolveLessonsIsRouteTransitionIdle,
  resolveLessonsTutorContext,
} from './lessons/Lessons.utils';

const LESSONS_DEFERRED_ENHANCEMENTS_IDLE_TIMEOUT_MS = 120;

type LessonsTutorSessionContext = ComponentProps<typeof LazyLessonsDeferredEnhancements>['sessionContext'];

function LessonsRouteShellReadyReporter() {
  const routeTransitionState = useOptionalKangurRouteTransitionState();
  const isLessonsLibraryTransitionReady =
    routeTransitionState?.transitionPhase === 'waiting_for_ready' &&
    routeTransitionState.activeTransitionPageKey === 'Lessons' &&
    routeTransitionState.activeTransitionSkeletonVariant !== 'lessons-focus';

  useKangurRoutePageReady({
    pageKey: 'Lessons',
    ready: isLessonsLibraryTransitionReady,
  });

  return null;
}

function useLessonsPageNavigation(input: {
  basePath: string;
  guestPlayerName: string;
  logout: (redirect?: boolean) => void;
  openLoginModal: () => void;
  setGuestPlayerName: (value: string) => void;
  user: ReturnType<typeof useLessons>['user'];
}): KangurPrimaryNavigationProps {
  const { basePath, guestPlayerName, logout, openLoginModal, setGuestPlayerName, user } = input;
  const handleLogout = useCallback(() => {
    logout(false);
  }, [logout]);

  return useMemo(
    () => ({
      basePath,
      canManageLearners: Boolean(user?.canManageLearners),
      currentPage: 'Lessons' as const,
      guestPlayerName: user ? undefined : guestPlayerName,
      isAuthenticated: Boolean(user),
      onGuestPlayerNameChange: user ? undefined : setGuestPlayerName,
      onLogin: openLoginModal,
      onLogout: handleLogout,
    }),
    [basePath, guestPlayerName, handleLogout, openLoginModal, setGuestPlayerName, user]
  );
}

function useLessonsDeferredEnhancementsState(input: {
  activeLesson: ReturnType<typeof useLessons>['activeLesson'];
  canStartDeferredEnhancements: boolean;
  isRouteTransitionIdle: boolean;
}): {
  docsTooltipsEnabled: boolean;
  isDeferredEnhancementsReady: boolean;
  onDocsTooltipsResolved: (enabled: boolean) => void;
} {
  const { activeLesson, canStartDeferredEnhancements, isRouteTransitionIdle } = input;
  const [isDeferredEnhancementsReady, setIsDeferredEnhancementsReady] = useState(Boolean(activeLesson));
  const [docsTooltipsEnabled, setDocsTooltipsEnabled] = useState(false);
  const onDocsTooltipsResolved = useCallback((enabled: boolean) => {
    setDocsTooltipsEnabled((current) => (current === enabled ? current : enabled));
  }, []);

  useEffect(() => {
    if (isDeferredEnhancementsReady) {
      return;
    }

    if (typeof window === 'undefined' || activeLesson) {
      setIsDeferredEnhancementsReady(true);
      return;
    }

    if (!isRouteTransitionIdle) {
      return;
    }

    if (!canStartDeferredEnhancements) {
      return;
    }

    if (typeof window.requestIdleCallback === 'function') {
      const idleId = window.requestIdleCallback(() => {
        setIsDeferredEnhancementsReady(true);
      }, { timeout: LESSONS_DEFERRED_ENHANCEMENTS_IDLE_TIMEOUT_MS });

      return () => {
        window.cancelIdleCallback?.(idleId);
      };
    }

    const timeoutId = window.setTimeout(() => {
      setIsDeferredEnhancementsReady(true);
    }, LESSONS_DEFERRED_ENHANCEMENTS_IDLE_TIMEOUT_MS);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [activeLesson, canStartDeferredEnhancements, isDeferredEnhancementsReady, isRouteTransitionIdle]);

  return {
    docsTooltipsEnabled,
    isDeferredEnhancementsReady,
    onDocsTooltipsResolved,
  };
}

function LessonsDeferredEnhancementsGate(props: {
  isReady: boolean;
  learnerId: string | null;
  onDocsTooltipsResolved: (enabled: boolean) => void;
  sessionContext: LessonsTutorSessionContext;
}): React.JSX.Element | null {
  const { isReady, learnerId, onDocsTooltipsResolved, sessionContext } = props;
  if (!isReady) {
    return null;
  }

  return (
    <LazyLessonsDeferredEnhancements
      learnerId={learnerId}
      onDocsTooltipsResolved={onDocsTooltipsResolved}
      sessionContext={sessionContext}
    />
  );
}

function LessonsPageBody(props: {
  activeLesson: ReturnType<typeof useLessons>['activeLesson'];
  snapshot: LessonsActiveLessonSnapshot;
}): React.JSX.Element {
  const { activeLesson, snapshot } = props;

  if (!activeLesson) {
    return <LessonsCatalog />;
  }

  return (
    <LazyActiveLessonView snapshot={snapshot ?? undefined} />
  );
}

function LessonsContent() {
  const pageTranslations = useTranslations('KangurLessonsPage');
  const routeTransitionState = useOptionalKangurRouteTransitionState();
  const lessons = useLessons();
  const {
    basePath,
    activeLesson,
    activeLessonId,
    lessonAssignmentsByComponent,
    completedLessonAssignmentsByComponent,
    orderedLessons,
    isCompleteLessonsCatalogLoaded,
    isSecretLessonActive,
    progress,
    guestPlayerName,
    setGuestPlayerName,
    logout,
    user,
    isLessonSectionsLoading,
    shouldShowLessonsCatalogSkeleton,
    lessonDocument,
    activeLessonAssignmentContent,
  } = lessons;
  const { openLoginModal } = useKangurLoginModalActions();
  const isRouteTransitionIdle = resolveLessonsIsRouteTransitionIdle(routeTransitionState?.transitionPhase);
  const { activeLessonAssignment, completedActiveLessonAssignment } =
    resolveLessonsActiveLessonAssignments({
      activeLesson,
      completedLessonAssignmentsByComponent,
      lessonAssignmentsByComponent,
    });
  const lessonTutorContext = resolveLessonsTutorContext({
    activeLesson,
    activeLessonAssignment,
    completedActiveLessonAssignment,
    pageTitle: pageTranslations('pageTitle'),
  });
  const activeLessonRenderSnapshot = useLessonsActiveLessonRenderSnapshot({
    activeLesson,
    activeLessonId,
    completedLessonAssignmentsByComponent,
    isCompleteLessonsCatalogLoaded,
    isSecretLessonActive,
    lessonAssignmentsByComponent,
    orderedLessons,
    progress,
    lessonDocument,
    activeLessonAssignmentContent,
  });
  const navigation = useLessonsPageNavigation({
    basePath,
    guestPlayerName,
    logout,
    openLoginModal,
    setGuestPlayerName,
    user,
  });
  const canStartDeferredEnhancements =
    Boolean(activeLesson) || (!shouldShowLessonsCatalogSkeleton && !isLessonSectionsLoading);
  const { docsTooltipsEnabled, isDeferredEnhancementsReady, onDocsTooltipsResolved } =
    useLessonsDeferredEnhancementsState({
      activeLesson,
      canStartDeferredEnhancements,
      isRouteTransitionIdle,
    });

  return (
    <>
      <LessonsDeferredEnhancementsGate
        isReady={isDeferredEnhancementsReady}
        learnerId={user?.activeLearner?.id ?? null}
        onDocsTooltipsResolved={onDocsTooltipsResolved}
        sessionContext={lessonTutorContext}
      />
      <KangurStandardPageLayout
        tone='learn'
        id='kangur-lessons-page'
        skipLinkTargetId='kangur-lessons-main'
        docsRootId={isDeferredEnhancementsReady ? 'kangur-lessons-page' : undefined}
        docsTooltipsEnabled={docsTooltipsEnabled}
        navigation={<KangurTopNavigationController navigation={navigation} />}
        containerProps={{
          as: 'section',
          'data-kangur-route-main': true,
          id: 'kangur-lessons-main',
          className: 'flex flex-col items-center',
        }}
      >
        <LessonsPageBody
          activeLesson={activeLesson}
          snapshot={activeLessonRenderSnapshot}
        />
      </KangurStandardPageLayout>
    </>
  );
}

export default function Lessons() {
  return (
    <>
      <LessonsRouteShellReadyReporter />
      <LessonsProvider>
        <LessonsContent />
      </LessonsProvider>
    </>
  );
}
