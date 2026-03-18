import { motion } from 'framer-motion';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { useCallback, useEffect } from 'react';
import {
  hasKangurLessonDocumentContent,
} from '@/features/kangur/lesson-documents';
import { KangurActiveLessonHeader } from '@/features/kangur/ui/components/KangurActiveLessonHeader';
import { KangurLessonDocumentRenderer } from '@/features/kangur/ui/components/KangurLessonDocumentRenderer';
import { KangurLessonNavigationWidget } from '@/features/kangur/ui/components/KangurLessonNavigationWidget';
import { KangurLessonNavigationProvider } from '@/features/kangur/ui/context/KangurLessonNavigationContext';
import {
  KangurButton,
  KangurGlassPanel,
  KangurStatusChip,
  KangurSummaryPanel,
} from '@/features/kangur/ui/design/primitives';
import {
  KANGUR_PANEL_GAP_CLASSNAME,
} from '@/features/kangur/ui/design/tokens';
import { LESSON_COMPONENTS } from '@/features/kangur/lessons/lesson-ui-registry';
import { useLessons } from './LessonsContext';
import { useKangurPageContentEntry } from '@/features/kangur/ui/hooks/useKangurPageContent';
import { LESSON_NAV_ANCHOR_ID } from './Lessons.constants';
import { useKangurMobileBreakpoint } from '@/features/kangur/ui/hooks/useKangurMobileBreakpoint';

export function ActiveLessonView() {
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
    activeLessonScrollRef,
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

  if (!activeLesson) return null;

  const activeIdx = orderedLessons.findIndex((l) => l.id === activeLesson.id);
  const prev = activeIdx > 0 ? orderedLessons[activeIdx - 1] : null;
  const next = activeIdx >= 0 && activeIdx < orderedLessons.length - 1 ? orderedLessons[activeIdx + 1] : null;
  
  const ActiveLessonComponent = LESSON_COMPONENTS[activeLesson.componentId];
  const activeLessonDocument = lessonDocuments[activeLesson.id] ?? null;
  const hasActiveLessonDocContent = hasKangurLessonDocumentContent(activeLessonDocument);
  
  const activeLessonAssignment = lessonAssignmentsByComponent.get(activeLesson.componentId) ?? null;
  const completedActiveLessonAssignment = !activeLessonAssignment ? (completedLessonAssignmentsByComponent.get(activeLesson.componentId) ?? null) : null;

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

  const emptyDocumentTitle = activeLessonEmptyDocumentContent?.title?.trim() || activeLesson.title;
  const emptyDocumentDescription =
    activeLessonEmptyDocumentContent?.summary?.trim() ||
    'Ta lekcja ma włączony tryb dokumentu, ale nie zapisano jeszcze bloków treści.';

  void activeLessonNavigationContent;

  useEffect(() => {
    if (!isMobile || typeof document === 'undefined') return undefined;
    const html = document.documentElement;
    const body = document.body;
    const prevHtmlOverflow = html.style.overflow;
    const prevBodyOverflow = body.style.overflow;
    html.style.overflow = 'hidden';
    body.style.overflow = 'hidden';
    return () => {
      html.style.overflow = prevHtmlOverflow;
      body.style.overflow = prevBodyOverflow;
    };
  }, [isMobile, activeLesson.id]);

  useEffect(() => {
    if (!isMobile) return undefined;
    const node = activeLessonScrollRef.current;
    if (!node) return undefined;
    const preventScroll = (event: Event): void => {
      event.preventDefault();
    };
    node.addEventListener('wheel', preventScroll, { passive: false });
    node.addEventListener('touchmove', preventScroll, { passive: false });
    return () => {
      node.removeEventListener('wheel', preventScroll);
      node.removeEventListener('touchmove', preventScroll);
    };
  }, [activeLesson.id, activeLessonScrollRef, isMobile]);

  const handleScrollBy = useCallback(
    (direction: 'up' | 'down'): void => {
      const container = activeLessonScrollRef.current;
      if (!container) return;
      const step = Math.max(240, Math.round(container.clientHeight * 0.7));
      const delta = direction === 'up' ? -step : step;
      container.scrollBy({ top: delta, left: 0, behavior: 'smooth' });
    },
    [activeLessonScrollRef]
  );

  const headerSection = (
    <div ref={activeLessonHeaderRef} id='kangur-lesson-header' className='w-full max-w-5xl'>
      <KangurActiveLessonHeader
        lesson={activeLesson}
        lessonDocument={activeLessonDocument}
        lessonContentRef={activeLessonContentRef}
        activeLessonAssignment={activeLessonAssignment}
        completedActiveLessonAssignment={completedActiveLessonAssignment}
        onBack={() => handleSelectLesson(null)}
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
  );

  const navigationSection = (
    <div ref={activeLessonNavigationRef} id={LESSON_NAV_ANCHOR_ID} className='w-full max-w-5xl'>
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
      className={`w-full flex flex-col items-center ${KANGUR_PANEL_GAP_CLASSNAME}`}
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
        <div className='w-full max-w-5xl space-y-4'>
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
        <div className='w-full max-w-5xl space-y-4'>
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

  return (
    <motion.div
      key={activeLesson.id}
      data-testid='lessons-active-transition'
      initial={{ opacity: 0.92, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0.98, y: -4 }}
      transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
      className={`w-full flex flex-col items-center ${KANGUR_PANEL_GAP_CLASSNAME}`}
    >
      <KangurLessonNavigationProvider
        onBack={() => handleSelectLesson(null)}
        secretLessonPill={{ isUnlocked: isSecretLessonUnlocked, onOpen: handleOpenSecretLesson }}
      >
        {isMobile ? (
          <div className='w-full max-w-5xl flex flex-col gap-3 h-[calc(100dvh-var(--kangur-top-bar-height,88px))]'>
            <KangurButton
              fullWidth
              size='sm'
              variant='surface'
              className='justify-center shadow-sm [border-color:var(--kangur-soft-card-border)]'
              onClick={() => handleScrollBy('up')}
              aria-label='Przewiń w górę'
            >
              <ChevronUp className='h-4 w-4' aria-hidden='true' />
              Przewiń w górę
            </KangurButton>
            <div
              ref={activeLessonScrollRef}
              className={`flex-1 min-h-0 w-full flex flex-col items-center ${KANGUR_PANEL_GAP_CLASSNAME} overflow-y-auto overscroll-contain touch-none`}
              data-testid='kangur-lesson-scroll-container'
            >
              {headerSection}
              {navigationSection}
              {lessonContentSection}
            </div>
            <KangurButton
              fullWidth
              size='sm'
              variant='surface'
              className='justify-center shadow-sm [border-color:var(--kangur-soft-card-border)] pb-[calc(10px+env(safe-area-inset-bottom))]'
              onClick={() => handleScrollBy('down')}
              aria-label='Przewiń w dół'
            >
              <ChevronDown className='h-4 w-4' aria-hidden='true' />
              Przewiń w dół
            </KangurButton>
          </div>
        ) : (
          <>
            {headerSection}
            {navigationSection}
            {lessonContentSection}
          </>
        )}
      </KangurLessonNavigationProvider>
    </motion.div>
  );
}
