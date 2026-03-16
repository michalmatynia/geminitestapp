
import { KangurActiveLessonHeader } from '@/features/kangur/ui/components/KangurActiveLessonHeader';
import { KangurLessonDocumentRenderer } from '@/features/kangur/ui/components/KangurLessonDocumentRenderer';
import { KangurLessonNavigationProvider } from '@/features/kangur/ui/context/KangurLessonNavigationContext';
import {
  useKangurLessonsRuntimeActions,
  useKangurLessonsRuntimeState,
} from '@/features/kangur/ui/context/KangurLessonsRuntimeContext';
import {
  KangurEmptyState,
  KangurGlassPanel,
  KangurSummaryPanel,
} from '@/features/kangur/ui/design/primitives';
import { KANGUR_PANEL_GAP_CLASSNAME } from '@/features/kangur/ui/design/tokens';

import type { JSX } from 'react';

export function KangurActiveLessonPanelWidget(): JSX.Element {
  const {
    activeLesson,
    activeLessonAssignment,
    completedActiveLessonAssignment,
    activeLessonDocument,
    ActiveLessonComponent,
    shouldRenderLessonDocument,
    hasActiveLessonDocumentContent,
    activeLessonContentRef,
  } = useKangurLessonsRuntimeState();
  const {
    clearActiveLesson,
  } = useKangurLessonsRuntimeActions();

  if (!activeLesson) {
    return (
      <KangurEmptyState
        accent='indigo'
        className='w-full'
        description='Wybierz lekcje z katalogu, aby zobaczyć szczegóły i uruchomić praktykę.'
        padding='xl'
        title='Wybierz lekcje'
      />
    );
  }

  return (
    <KangurLessonNavigationProvider onBack={clearActiveLesson}>
      <div className={`flex w-full flex-col items-center ${KANGUR_PANEL_GAP_CLASSNAME}`}>
        <KangurActiveLessonHeader
          lesson={activeLesson}
          lessonDocument={activeLessonDocument}
          lessonContentRef={activeLessonContentRef}
          activeLessonAssignment={activeLessonAssignment}
          completedActiveLessonAssignment={completedActiveLessonAssignment}
          headerTestId='active-lesson-widget-header'
          headerActionsTestId='active-lesson-widget-header-icon-actions'
          iconTestId={`active-lesson-widget-icon-${activeLesson.id}`}
          priorityChipTestId='active-lesson-widget-parent-priority-chip'
          completedChipTestId='active-lesson-widget-parent-completed-chip'
          onBack={clearActiveLesson}
        />

        <div
          ref={activeLessonContentRef}
          className={`flex w-full flex-col items-center ${KANGUR_PANEL_GAP_CLASSNAME}`}
        >
          {shouldRenderLessonDocument && activeLessonDocument ? (
            <div className='w-full space-y-4'>
              <KangurGlassPanel surface='solid' variant='soft'>
                <KangurSummaryPanel
                  accent='sky'
                  className='w-full'
                  data-testid='active-lesson-document-summary'
                  description={activeLesson.description}
                  label='Lesson document'
                  labelAccent='sky'
                  padding='lg'
                  title={activeLesson.title}
                  tone='accent'
                />
              </KangurGlassPanel>
              <KangurLessonDocumentRenderer document={activeLessonDocument} />
            </div>
          ) : activeLesson.contentMode === 'document' && !hasActiveLessonDocumentContent ? (
            <KangurGlassPanel className='w-full' surface='solid' variant='soft'>
              <KangurSummaryPanel
                accent='amber'
                align='center'
                className='w-full'
                data-testid='active-lesson-empty-document-summary'
                description='This lesson is set to use custom document content, but no document blocks have been saved yet.'
                label='Lesson document'
                labelAccent='amber'
                padding='xl'
                title={activeLesson.title}
                tone='accent'
              />
            </KangurGlassPanel>
          ) : ActiveLessonComponent ? (
            <ActiveLessonComponent />
          ) : null}
        </div>
      </div>
    </KangurLessonNavigationProvider>
  );
}
