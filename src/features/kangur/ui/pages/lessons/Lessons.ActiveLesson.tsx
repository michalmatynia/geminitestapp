import { motion } from 'framer-motion';
import { ChevronsLeft } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useCallback } from 'react';
import {
  hasKangurLessonDocumentContent,
} from '@/features/kangur/lesson-documents';
import { KangurActiveLessonHeader } from '@/features/kangur/ui/components/KangurActiveLessonHeader';
import { KangurLessonDocumentRenderer } from '@/features/kangur/ui/components/KangurLessonDocumentRenderer';
import { KangurLessonNavigationWidget } from '@/features/kangur/ui/components/KangurLessonNavigationWidget';
import KangurVisualCueContent from '@/features/kangur/ui/components/KangurVisualCueContent';
import { useKangurAgeGroupFocus } from '@/features/kangur/ui/context/KangurAgeGroupFocusContext';
import { KangurLessonNavigationProvider } from '@/features/kangur/ui/context/KangurLessonNavigationContext';
import {
  KangurButton,
  KangurGlassPanel,
  KangurStatusChip,
  KangurSummaryPanel,
} from '@/features/kangur/ui/design/primitives';
import { LESSON_COMPONENTS } from '@/features/kangur/lessons/lesson-ui-registry';
import { useLessons } from './LessonsContext';
import { useKangurPageContentEntry } from '@/features/kangur/ui/hooks/useKangurPageContent';
import {
  LESSON_NAV_ANCHOR_ID,
  LESSONS_ACTIVE_LAYOUT_CLASSNAME,
  LESSONS_ACTIVE_SECTION_CLASSNAME,
  LESSONS_ACTIVE_STACK_GAP_CLASSNAME,
} from './Lessons.constants';
import { useKangurMobileBreakpoint } from '@/features/kangur/ui/hooks/useKangurMobileBreakpoint';

export function ActiveLessonView() {
  const translations = useTranslations('KangurLessonsPage');
  const {
    activeLesson,
    handleSelectLesson,
    lessonDocuments,
    lessonAssignmentsByComponent,
    completedLessonAssignmentsByComponent,
    setIsActiveLessonComponentReady,
    activeLessonHeaderRef,
    activeLessonNavigationRef,
    activeLessonContentRef,
    orderedLessons,
    isSecretLessonActive,
    progress,
  } = useLessons();

  const { entry: activeLessonHeaderContent } = useKangurPageContentEntry('lessons-active-header');
  const { entry: activeLessonAssignmentContent } = useKangurPageContentEntry('lessons-active-assignment');
  const { entry: activeLessonDocumentContent } = useKangurPageContentEntry('lessons-active-document');
  const { entry: activeLessonNavigationContent } = useKangurPageContentEntry('lessons-active-navigation');
  const { entry: activeLessonEmptyDocumentContent } = useKangurPageContentEntry('lessons-active-empty-document');
  const { entry: activeLessonSecretPanelContent } = useKangurPageContentEntry('lessons-active-secret-panel');

  const isMobile = useKangurMobileBreakpoint();
  const { ageGroup } = useKangurAgeGroupFocus();
  const backToLessonsLabel = translations('mobileControls.backToLessons');
  const isSixYearOld = ageGroup === 'six_year_old';

  const secretHostLesson = orderedLessons.at(-1) ?? null;
  const masteryByComponent = progress?.lessonMastery ?? {};
  const isSecretLessonUnlocked =
    orderedLessons.length > 0 &&
    orderedLessons.every((lesson) => (masteryByComponent[lesson.componentId]?.completions ?? 0) > 0);
  const isSecretLessonHostActive = isSecretLessonActive && Boolean(activeLesson?.id === secretHostLesson?.id);
  const handleOpenSecretLesson = () => {
    if (!secretHostLesson) return;
    handleSelectLesson(secretHostLesson.id, { secret: true });
  };
  const secretHostLabel = secretHostLesson?.title ?? 'Ostatnia lekcja';

  const emptyDocumentTitle = activeLessonEmptyDocumentContent?.title?.trim() || activeLesson?.title || '';
  const emptyDocumentDescription =
    activeLessonEmptyDocumentContent?.summary?.trim() ||
    'Ta lekcja ma włączony tryb dokumentu, ale nie zapisano jeszcze bloków treści.';

  void activeLessonNavigationContent;
  const handleReturnToLessonList = useCallback((): void => {
    handleSelectLesson(null);
  }, [handleSelectLesson]);

  const handleLessonBackAction = useCallback((): void => {
    const container = activeLessonContentRef.current;
    if (!container) {
      handleReturnToLessonList();
      return;
    }
    const backButton = container.querySelector('[data-kangur-lesson-back="true"]');
    if (backButton instanceof HTMLButtonElement) {
      try {
        backButton.click();
        return;
      } catch {
        handleReturnToLessonList();
        return;
      }
    }
    handleReturnToLessonList();
  }, [activeLessonContentRef, handleReturnToLessonList]);

  if (!activeLesson) {
    return null;
  }

  const activeIdx = orderedLessons.findIndex((lesson) => lesson.id === activeLesson.id);
  const prev = activeIdx > 0 ? orderedLessons[activeIdx - 1] : null;
  const next =
    activeIdx >= 0 && activeIdx < orderedLessons.length - 1 ? orderedLessons[activeIdx + 1] : null;

  const ActiveLessonComponent = LESSON_COMPONENTS[activeLesson.componentId];
  const activeLessonDocument = lessonDocuments[activeLesson.id] ?? null;
  const hasActiveLessonDocContent = hasKangurLessonDocumentContent(activeLessonDocument);

  const activeLessonAssignment = lessonAssignmentsByComponent.get(activeLesson.componentId) ?? null;
  const completedActiveLessonAssignment = !activeLessonAssignment
    ? (completedLessonAssignmentsByComponent.get(activeLesson.componentId) ?? null)
    : null;

  const headerSection = !isMobile ? (
    <div
      ref={activeLessonHeaderRef}
      id='kangur-lesson-header'
      className={LESSONS_ACTIVE_SECTION_CLASSNAME}
    >
      <KangurActiveLessonHeader
        lesson={activeLesson}
        lessonDocument={activeLessonDocument}
        lessonContentRef={activeLessonContentRef}
        activeLessonAssignment={activeLessonAssignment}
        completedActiveLessonAssignment={completedActiveLessonAssignment}
        onBack={handleReturnToLessonList}
        titleOverride={activeLessonHeaderContent?.title ?? 'Aktywna lekcja'}
        headerTestId='active-lesson-header'
        headerActionsTestId='active-lesson-header-icon-actions'
        iconTestId={`active-lesson-icon-${activeLesson.id}`}
        priorityChipTestId='active-lesson-parent-priority-chip'
        completedChipTestId='active-lesson-parent-completed-chip'
        descriptionOverride={activeLessonHeaderContent?.summary ?? undefined}
        assignmentSectionTitle={activeLessonAssignmentContent?.title ?? undefined}
        assignmentSectionSummary={activeLessonAssignmentContent?.summary ?? undefined}
      />
    </div>
  ) : null;

  const navigationSection = (
    <div
      ref={activeLessonNavigationRef}
      id={LESSON_NAV_ANCHOR_ID}
      className={LESSONS_ACTIVE_SECTION_CLASSNAME}
    >
      <KangurLessonNavigationWidget
        nextLesson={next}
        onSelectLesson={handleSelectLesson}
        prevLesson={prev}
      />
    </div>
  );

  const lessonContentSection = (
    <div
      ref={activeLessonContentRef}
      className={`flex w-full min-w-0 flex-col items-center ${LESSONS_ACTIVE_STACK_GAP_CLASSNAME}`}
    >
      {isSecretLessonHostActive ? (
        <KangurGlassPanel
          className='flex w-full max-w-3xl flex-col items-center text-center'
          data-testid='lessons-secret-panel'
          padding='xl'
          surface='solid'
        >
          <KangurStatusChip accent='amber' data-testid='lessons-secret-pill-chip' size='sm'>
            Sekret odblokowany
          </KangurStatusChip>
          <div
            className='mt-2 text-xs font-semibold uppercase tracking-[0.22em] text-slate-500'
            data-testid='lessons-secret-host-label'
          >
            {secretHostLabel}
          </div>
          <h2 className='mt-2 text-2xl font-black text-slate-800'>
            {activeLessonSecretPanelContent?.title ?? 'Ukryty finisz'}
          </h2>
          <p className='text-sm text-slate-600'>
            {activeLessonSecretPanelContent?.summary ?? 'Sekretne zakończenie!'}
          </p>
        </KangurGlassPanel>
      ) : activeLesson.contentMode === 'document' && hasActiveLessonDocContent ? (
        <div className='w-full min-w-0 max-w-5xl space-y-4'>
          <KangurSummaryPanel
            accent='sky'
            data-testid='lessons-document-summary'
            description={activeLessonDocumentContent?.summary ?? 'Czytaj dokument.'}
            label='Lesson document'
            labelAccent='sky'
            title={activeLessonDocumentContent?.title ?? 'Materiał lekcji'}
            tone='accent'
          />
          <KangurLessonDocumentRenderer document={activeLessonDocument!} />
        </div>
      ) : activeLesson.contentMode === 'document' && !hasActiveLessonDocContent ? (
        <div className='w-full min-w-0 max-w-5xl space-y-4'>
          <KangurSummaryPanel
            accent='amber'
            align='center'
            data-testid='lessons-empty-document-summary'
            description={emptyDocumentDescription}
            label='Lesson document'
            labelAccent='amber'
            title={emptyDocumentTitle}
            tone='accent'
          />
        </div>
      ) : ActiveLessonComponent ? (
        <ActiveLessonComponent onReady={() => setIsActiveLessonComponentReady(true)} />
      ) : null}
    </div>
  );

  const topControlsSection = isMobile ? (
    <div data-testid='kangur-lesson-top-controls' className='flex w-full min-w-0 gap-2'>
      <KangurButton
        size='sm'
        variant='surface'
        className='flex-1 justify-center shadow-sm [border-color:var(--kangur-soft-card-border)]'
        data-testid='kangur-lesson-back-to-lessons'
        onClick={handleLessonBackAction}
        aria-label={backToLessonsLabel}
        title={backToLessonsLabel}
      >
        {isSixYearOld ? (
          <KangurVisualCueContent
            detail='🏠'
            detailClassName='text-base'
            detailTestId='kangur-lesson-back-to-lessons-detail'
            icon={<ChevronsLeft className='h-4 w-4' aria-hidden='true' />}
            iconTestId='kangur-lesson-back-to-lessons-icon'
            label={backToLessonsLabel}
          />
        ) : (
          <>
            <ChevronsLeft className='h-4 w-4' aria-hidden='true' />
            {backToLessonsLabel}
          </>
        )}
      </KangurButton>
    </div>
  ) : null;

  return (
    <motion.div
      key={activeLesson.id}
      data-testid='lessons-active-transition'
      initial={{ opacity: 0.92, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0.98, y: -4 }}
      transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
      className={LESSONS_ACTIVE_LAYOUT_CLASSNAME}
    >
      <KangurLessonNavigationProvider
        onBack={handleReturnToLessonList}
        secretLessonPill={{ isUnlocked: isSecretLessonUnlocked, onOpen: handleOpenSecretLesson }}
      >
        <>
          {topControlsSection}
          {headerSection}
          {navigationSection}
          {lessonContentSection}
        </>
      </KangurLessonNavigationProvider>
    </motion.div>
  );
}
