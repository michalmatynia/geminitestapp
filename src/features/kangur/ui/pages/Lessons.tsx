'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useKangurDocsTooltips } from '@/features/kangur/docs/tooltips';
import { KangurTopNavigationController } from '@/features/kangur/ui/components/KangurTopNavigationController';
import type { KangurPrimaryNavigationProps } from '@/features/kangur/ui/components/KangurPrimaryNavigation';
import { KangurAiTutorSessionSync } from '@/features/kangur/ui/context/KangurAiTutorContext';
import { LazyAnimatePresence } from '@/features/kangur/ui/components/LazyAnimatePresence';
import { KangurStandardPageLayout } from '@/features/kangur/ui/components/KangurStandardPageLayout';
import { useKangurLoginModal } from '@/features/kangur/ui/context/KangurLoginModalContext';
import { useLessons, LessonsProvider } from './lessons/LessonsContext';
import { LessonsCatalog } from './lessons/Lessons.Catalog';
import { ActiveLessonView } from './lessons/Lessons.ActiveLesson';

function LessonsDeferredDocsTooltips({
  onResolved,
}: {
  onResolved: (enabled: boolean) => void;
}) {
  const { enabled } = useKangurDocsTooltips('lessons');

  useEffect(() => {
    onResolved(enabled);
  }, [enabled, onResolved]);

  return null;
}

function LessonsContent() {
  const pageTranslations = useTranslations('KangurLessonsPage');
  const {
    auth,
    basePath,
    activeLesson,
    activeLessonId,
    lessonDocuments,
    lessonAssignmentsByComponent,
    completedLessonAssignmentsByComponent,
    orderedLessons,
    isSecretLessonActive,
    isActiveLessonDocumentLoading,
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
            lessonDocuments,
            lessonAssignmentsByComponent,
            completedLessonAssignmentsByComponent,
            orderedLessons,
            isSecretLessonActive,
            progress,
            isActiveLessonDocumentLoading,
          }
        : undefined,
    [
      activeLesson,
      activeLessonId,
      completedLessonAssignmentsByComponent,
      isActiveLessonDocumentLoading,
      isSecretLessonActive,
      lessonAssignmentsByComponent,
      lessonDocuments,
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
    if (activeLesson || isDeferredEnhancementsReady) {
      return;
    }

    if (typeof window === 'undefined') {
      setIsDeferredEnhancementsReady(true);
      return;
    }

    let timeoutId: number | null = null;
    const frameId =
      typeof window.requestAnimationFrame === 'function'
        ? window.requestAnimationFrame(() => {
            setIsDeferredEnhancementsReady(true);
          })
        : window.setTimeout(() => {
            timeoutId = null;
            setIsDeferredEnhancementsReady(true);
          }, 0);

    return () => {
      if (timeoutId !== null) {
        window.clearTimeout(timeoutId);
        return;
      }

      if (typeof window.cancelAnimationFrame === 'function') {
        window.cancelAnimationFrame(frameId);
      } else {
        window.clearTimeout(frameId);
      }
    };
  }, [activeLesson, isDeferredEnhancementsReady]);

  return (
    <>
      {isDeferredEnhancementsReady ? (
        <LessonsDeferredDocsTooltips onResolved={handleDeferredDocsTooltipsResolved} />
      ) : null}
      {isDeferredEnhancementsReady ? (
        <KangurAiTutorSessionSync
          learnerId={user?.activeLearner?.id ?? null}
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
            <ActiveLessonView
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
    <LessonsProvider>
      <LessonsContent />
    </LessonsProvider>
  );
}
