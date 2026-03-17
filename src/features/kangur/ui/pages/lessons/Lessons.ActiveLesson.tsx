import { motion } from 'framer-motion';
import {
  hasKangurLessonDocumentContent,
} from '@/features/kangur/lesson-documents';
import { KangurActiveLessonHeader } from '@/features/kangur/ui/components/KangurActiveLessonHeader';
import { KangurLessonDocumentRenderer } from '@/features/kangur/ui/components/KangurLessonDocumentRenderer';
import { KangurLessonNavigationWidget } from '@/features/kangur/ui/components/KangurLessonNavigationWidget';
import { KangurLessonNavigationProvider } from '@/features/kangur/ui/context/KangurLessonNavigationContext';
import {
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
        <div ref={activeLessonNavigationRef} id={LESSON_NAV_ANCHOR_ID} className='w-full max-w-5xl'>
          <KangurLessonNavigationWidget nextLesson={next} onSelectLesson={handleSelectLesson} prevLesson={prev} />
        </div>
        <div ref={activeLessonContentRef} className={`w-full flex flex-col items-center ${KANGUR_PANEL_GAP_CLASSNAME}`}>
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
        {isMobile && (
          <div className='w-full max-w-5xl'>
            <KangurLessonNavigationWidget nextLesson={next} onSelectLesson={handleSelectLesson} prevLesson={prev} />
          </div>
        )}
      </KangurLessonNavigationProvider>
    </motion.div>
  );
}
