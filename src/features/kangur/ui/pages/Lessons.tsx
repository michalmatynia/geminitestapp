'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import type { KangurPrimaryNavigationProps } from '@/features/kangur/ui/components/KangurPrimaryNavigation';
import { KangurTopNavigationController } from '@/features/kangur/ui/components/KangurTopNavigationController';
import { LazyAnimatePresence } from '@/features/kangur/ui/components/LazyAnimatePresence';
import { KangurStandardPageLayout } from '@/features/kangur/ui/components/KangurStandardPageLayout';
import { useKangurLoginModal } from '@/features/kangur/ui/context/KangurLoginModalContext';
import { useOptionalKangurRouteTransitionState } from '@/features/kangur/ui/context/KangurRouteTransitionContext';
import { useKangurRoutePageReady } from '@/features/kangur/ui/hooks/useKangurRoutePageReady';
import { LessonsProvider, useLessons } from './lessons/LessonsContext';
import { LessonsCatalog } from './lessons/Lessons.Catalog';
import { LazyActiveLessonView } from './lessons/LazyActiveLessonView';
import { LazyLessonsDeferredEnhancements } from './lessons/LazyLessonsDeferredEnhancements';

const LESSONS_DEFERRED_ENHANCEMENTS_IDLE_TIMEOUT_MS = 120;

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

function LessonsContent() {
  const pageTranslations = useTranslations('KangurLessonsPage');
  const routeTransitionState = useOptionalKangurRouteTransitionState();
  const {
    auth,
    basePath,
    activeLesson,
    activeLessonId,
    lessonAssignmentsByComponent,
    completedLessonAssignmentsByComponent,
    orderedLessons,
    isSecretLessonActive,
    progress,
    guestPlayerName,
    setGuestPlayerName,
  } = useLessons();
  const { openLoginModal } = useKangurLoginModal();
  const [isDeferredEnhancementsReady, setIsDeferredEnhancementsReady] = useState(
    Boolean(activeLesson)
  );
  const [docsTooltipsEnabled, setDocsTooltipsEnabled] = useState(false);

  const { user, logout } = auth;
  const isRouteTransitionIdle =
    routeTransitionState?.transitionPhase == null ||
    routeTransitionState.transitionPhase === 'idle';
  const handleLogout = useCallback(() => {
    logout(false);
  }, [logout]);
  const handleDeferredDocsTooltipsResolved = useCallback((enabled: boolean) => {
    setDocsTooltipsEnabled((current) => (current === enabled ? current : enabled));
  }, []);

  const activeLessonAssignment = activeLesson
    ? (lessonAssignmentsByComponent.get(activeLesson.componentId) ?? null)
    : null;
  const completedActiveLessonAssignment =
    activeLesson && !activeLessonAssignment
      ? (completedLessonAssignmentsByComponent.get(activeLesson.componentId) ?? null)
      : null;

  const lessonTutorContext = {
    surface: 'lesson' as const,
    contentId: activeLesson?.id ?? 'lesson:list',
    title: activeLesson?.title ?? pageTranslations('pageTitle'),
    assignmentId: activeLessonAssignment?.id ?? completedActiveLessonAssignment?.id,
  };

  const activeLessonRenderSnapshot = useMemo(
    () =>
      activeLesson
        ? {
            activeLesson,
            activeLessonId: activeLessonId ?? activeLesson.id,
            lessonAssignmentsByComponent,
            completedLessonAssignmentsByComponent,
            orderedLessons,
            isSecretLessonActive,
            progress,
          }
        : undefined,
    [
      activeLesson,
      activeLessonId,
      completedLessonAssignmentsByComponent,
      isSecretLessonActive,
      lessonAssignmentsByComponent,
      orderedLessons,
      progress,
    ]
  );

  const navigation = useMemo<KangurPrimaryNavigationProps>(
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
    [
      basePath,
      guestPlayerName,
      handleLogout,
      openLoginModal,
      setGuestPlayerName,
      user,
    ]
  );

  useEffect(() => {
    if (isDeferredEnhancementsReady) {
      return;
    }

    if (typeof window === 'undefined') {
      setIsDeferredEnhancementsReady(true);
      return;
    }

    if (activeLesson) {
      setIsDeferredEnhancementsReady(true);
      return;
    }

    if (!isRouteTransitionIdle) {
      return;
    }

    if (typeof window.requestIdleCallback === 'function') {
      const idleId = window.requestIdleCallback(
        () => {
          setIsDeferredEnhancementsReady(true);
        },
        {
          timeout: LESSONS_DEFERRED_ENHANCEMENTS_IDLE_TIMEOUT_MS,
        }
      );

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
  }, [activeLesson, isDeferredEnhancementsReady, isRouteTransitionIdle]);

  return (
    <>
      {isDeferredEnhancementsReady ? (
        <LazyLessonsDeferredEnhancements
          learnerId={user?.activeLearner?.id ?? null}
          onDocsTooltipsResolved={handleDeferredDocsTooltipsResolved}
          sessionContext={lessonTutorContext}
        />
      ) : null}
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
        {activeLesson ? (
          <LazyAnimatePresence mode='wait'>
            <LazyActiveLessonView
              key={activeLessonId ?? activeLesson.id}
              snapshot={activeLessonRenderSnapshot}
            />
          </LazyAnimatePresence>
        ) : (
          <LessonsCatalog />
        )}
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
