'use client';

import { useCallback, useEffect, useMemo, useState, type ComponentProps } from 'react';
import { useTranslations } from 'next-intl';
import type { KangurPrimaryNavigationProps } from '@/features/kangur/ui/components/primary-navigation/KangurPrimaryNavigation.types';
import { KangurTopNavigationController } from "@/features/kangur/ui/components/primary-navigation/KangurTopNavigationController";
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

type LessonsTutorSessionContext = ComponentProps<typeof LazyLessonsDeferredEnhancements>['sessionContext'];
type LessonsActiveLessonSnapshot = ComponentProps<typeof LazyActiveLessonView>['snapshot'];

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

const resolveLessonsIsRouteTransitionIdle = (
  routeTransitionState: ReturnType<typeof useOptionalKangurRouteTransitionState>
): boolean =>
  routeTransitionState?.transitionPhase == null || routeTransitionState.transitionPhase === 'idle';

const resolveLessonsActiveLessonAssignments = ({
  activeLesson,
  completedLessonAssignmentsByComponent,
  lessonAssignmentsByComponent,
}: {
  activeLesson: ReturnType<typeof useLessons>['activeLesson'];
  completedLessonAssignmentsByComponent: ReturnType<typeof useLessons>['completedLessonAssignmentsByComponent'];
  lessonAssignmentsByComponent: ReturnType<typeof useLessons>['lessonAssignmentsByComponent'];
}): {
  activeLessonAssignment: { id?: string | null } | null;
  completedActiveLessonAssignment: { id?: string | null } | null;
} => {
  if (!activeLesson) {
    return {
      activeLessonAssignment: null,
      completedActiveLessonAssignment: null,
    };
  }

  const activeLessonAssignment = lessonAssignmentsByComponent.get(activeLesson.componentId) ?? null;

  return {
    activeLessonAssignment,
    completedActiveLessonAssignment: activeLessonAssignment
      ? null
      : (completedLessonAssignmentsByComponent.get(activeLesson.componentId) ?? null),
  };
};

const resolveLessonsTutorContext = ({
  activeLesson,
  activeLessonAssignment,
  completedActiveLessonAssignment,
  pageTitle,
}: {
  activeLesson: ReturnType<typeof useLessons>['activeLesson'];
  activeLessonAssignment: { id?: string | null } | null;
  completedActiveLessonAssignment: { id?: string | null } | null;
  pageTitle: string;
}): LessonsTutorSessionContext => ({
  surface: 'lesson',
  contentId: activeLesson?.id ?? 'lesson:list',
  title: activeLesson?.title ?? pageTitle,
  assignmentId: activeLessonAssignment?.id ?? completedActiveLessonAssignment?.id ?? undefined,
});

function useLessonsActiveLessonRenderSnapshot(input: {
  activeLesson: ReturnType<typeof useLessons>['activeLesson'];
  activeLessonId: ReturnType<typeof useLessons>['activeLessonId'];
  completedLessonAssignmentsByComponent: ReturnType<typeof useLessons>['completedLessonAssignmentsByComponent'];
  isCompleteLessonsCatalogLoaded: ReturnType<typeof useLessons>['isCompleteLessonsCatalogLoaded'];
  isSecretLessonActive: ReturnType<typeof useLessons>['isSecretLessonActive'];
  lessonAssignmentsByComponent: ReturnType<typeof useLessons>['lessonAssignmentsByComponent'];
  orderedLessons: ReturnType<typeof useLessons>['orderedLessons'];
  progress: ReturnType<typeof useLessons>['progress'];
}): LessonsActiveLessonSnapshot {
  const {
    activeLesson,
    activeLessonId,
    completedLessonAssignmentsByComponent,
    isCompleteLessonsCatalogLoaded,
    isSecretLessonActive,
    lessonAssignmentsByComponent,
    orderedLessons,
    progress,
  } = input;

  return useMemo(
    () =>
      activeLesson
        ? {
            activeLesson,
            activeLessonId: activeLessonId ?? activeLesson.id,
            lessonAssignmentsByComponent,
            completedLessonAssignmentsByComponent,
            orderedLessons,
            isCompleteLessonsCatalogLoaded,
            isSecretLessonActive,
            progress,
          }
        : undefined,
    [
      activeLesson,
      activeLessonId,
      completedLessonAssignmentsByComponent,
      isCompleteLessonsCatalogLoaded,
      isSecretLessonActive,
      lessonAssignmentsByComponent,
      orderedLessons,
      progress,
    ]
  );
}

function useLessonsPageNavigation(input: {
  basePath: string;
  guestPlayerName: string;
  logout: (redirect?: boolean) => void;
  openLoginModal: () => void;
  setGuestPlayerName: (value: string) => void;
  user: ReturnType<typeof useLessons>['auth']['user'];
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
  activeLessonId: ReturnType<typeof useLessons>['activeLessonId'];
  snapshot: LessonsActiveLessonSnapshot;
}): React.JSX.Element {
  const { activeLesson, activeLessonId, snapshot } = props;

  if (!activeLesson) {
    return <LessonsCatalog />;
  }

  return (
    <LazyAnimatePresence mode='wait'>
      <LazyActiveLessonView key={activeLessonId ?? activeLesson.id} snapshot={snapshot} />
    </LazyAnimatePresence>
  );
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
    isCompleteLessonsCatalogLoaded,
    isSecretLessonActive,
    progress,
    guestPlayerName,
    setGuestPlayerName,
    isLessonSectionsLoading,
    shouldShowLessonsCatalogSkeleton,
  } = useLessons();
  const { openLoginModal } = useKangurLoginModal();
  const { user, logout } = auth;
  const isRouteTransitionIdle = resolveLessonsIsRouteTransitionIdle(routeTransitionState);
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
          activeLessonId={activeLessonId}
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
