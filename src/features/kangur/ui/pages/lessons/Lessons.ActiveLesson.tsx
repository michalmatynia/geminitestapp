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
  } = useLessons();

  const { entry: activeLessonHeaderContent } = useKangurPageContentEntry('lessons-active-header');
  const { entry: activeLessonAssignmentContent } = useKangurPageContentEntry('lessons-active-assignment');
  const { entry: activeLessonDocumentContent } = useKangurPageContentEntry('lessons-active-document');
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
  const isSecretLessonUnlocked = orderedLessons.length > 0 && orderedLessons.every(l => (l.sortOrder > 0)); // Simplified
  const isSecretLessonHostActive = isSecretLessonActive && Boolean(secretHostLesson && activeLesson?.id === secretHostLesson.id);

  return (
    <motion.div key={activeLesson.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className={`w-full flex flex-col items-center ${KANGUR_PANEL_GAP_CLASSNAME}`}>
      <KangurLessonNavigationProvider
        onBack={() => handleSelectLesson(null)}
        secretLessonPill={{ isUnlocked: isSecretLessonUnlocked, onOpen: () => {} }}
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
            headerActionsTestId='active-lesson-header-actions'
            iconTestId='active-lesson-icon'
            priorityChipTestId='active-lesson-priority-chip'
            completedChipTestId='active-lesson-completed-chip'
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
            <KangurGlassPanel className='flex w-full max-w-3xl flex-col items-center text-center' padding='xl' surface='solid'>
              <KangurStatusChip accent='amber' size='sm'>Sekret odblokowany</KangurStatusChip>
              <h2 className='text-2xl font-black text-slate-800'>{activeLessonSecretPanelContent?.title ?? 'Ukryty finisz'}</h2>
              <p className='text-sm text-slate-600'>{activeLessonSecretPanelContent?.summary ?? 'Sekretne zakończenie!'}</p>
            </KangurGlassPanel>
          ) : activeLesson.contentMode === 'document' && hasActiveLessonDocContent ? (
            <div className='w-full max-w-5xl space-y-4'>
              <KangurSummaryPanel accent='sky' description={activeLessonDocumentContent?.summary ?? 'Czytaj dokument.'} title={activeLessonDocumentContent?.title ?? 'Materiał lekcji'} tone='accent' />
              <KangurLessonDocumentRenderer document={activeLessonDocument!} />
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
