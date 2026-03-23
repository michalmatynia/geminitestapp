'use client';

import { AnimatePresence } from 'framer-motion';
import { useTranslations } from 'next-intl';
import { useKangurDocsTooltips } from '@/features/kangur/docs/tooltips';
import { KangurTopNavigationController } from '@/features/kangur/ui/components/KangurTopNavigationController';
import type { KangurPrimaryNavigationProps } from '@/features/kangur/ui/components/KangurPrimaryNavigation';
import { KangurAiTutorSessionSync } from '@/features/kangur/ui/context/KangurAiTutorContext';
import { KangurStandardPageLayout } from '@/features/kangur/ui/components/KangurStandardPageLayout';
import { useKangurLoginModal } from '@/features/kangur/ui/context/KangurLoginModalContext';
import { useLessons, LessonsProvider } from './lessons/LessonsContext';
import { LessonsCatalog } from './lessons/Lessons.Catalog';
import { ActiveLessonView } from './lessons/Lessons.ActiveLesson';

function LessonsContent() {
  const pageTranslations = useTranslations('KangurLessonsPage');
  const {
    auth,
    basePath,
    activeLesson,
    activeLessonId,
    lessonAssignmentsByComponent,
    completedLessonAssignmentsByComponent,
    guestPlayerName,
    setGuestPlayerName,
  } = useLessons();
  const { openLoginModal } = useKangurLoginModal();

  const { user, logout } = auth;
  const { enabled: docsTooltipsEnabled } = useKangurDocsTooltips('lessons');

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

  const navigation: KangurPrimaryNavigationProps = {
    basePath,
    canManageLearners: Boolean(user?.canManageLearners),
    currentPage: 'Lessons' as const,
    guestPlayerName: user ? undefined : guestPlayerName,
    isAuthenticated: Boolean(user),
    onGuestPlayerNameChange: user ? undefined : setGuestPlayerName,
    onLogin: openLoginModal,
    onLogout: () => logout(false),
  };

  return (
    <>
      <KangurAiTutorSessionSync 
        learnerId={user?.activeLearner?.id ?? null} 
        sessionContext={lessonTutorContext} 
      />
      <KangurStandardPageLayout
        tone='learn'
        id='kangur-lessons-page'
        skipLinkTargetId='kangur-lessons-main'
        docsRootId='kangur-lessons-page'
        docsTooltipsEnabled={docsTooltipsEnabled}
        navigation={<KangurTopNavigationController navigation={navigation} />}
        containerProps={{
          as: 'section',
          'data-kangur-route-main': true,
          id: 'kangur-lessons-main',
          className: 'flex flex-col items-center',
        }}
      >
        <AnimatePresence mode='wait'>
          {activeLesson ? (
            <ActiveLessonView key={activeLessonId} />
          ) : (
            <LessonsCatalog key='catalog' />
          )}
        </AnimatePresence>
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
