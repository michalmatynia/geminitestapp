'use client';

import type { JSX } from 'react';

import { KangurLessonDocumentRenderer } from '@/features/kangur/ui/components/KangurLessonDocumentRenderer';
import { KangurLessonNarrator } from '@/features/kangur/ui/components/KangurLessonNarrator';
import {
  KangurButton,
  KangurEmptyState,
  KangurSummaryPanel,
} from '@/features/kangur/ui/design/primitives';
import { KangurLessonNavigationProvider } from '@/features/kangur/ui/context/KangurLessonNavigationContext';
import { useKangurLessonsRuntime } from '@/features/kangur/ui/context/KangurLessonsRuntimeContext';

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
    clearActiveLesson,
  } = useKangurLessonsRuntime();

  if (!activeLesson) {
    return (
      <KangurEmptyState
        accent='indigo'
        className='w-full'
        description='Wybierz lekcje z katalogu, aby zobaczyc szczegoly i uruchomic praktyke.'
        padding='xl'
        title='Wybierz lekcje'
      />
    );
  }

  return (
    <div className='flex w-full flex-col items-center gap-4'>
      {activeLessonAssignment ? (
        <KangurSummaryPanel
          accent='rose'
          className='w-full'
          description={activeLessonAssignment.description}
          label='Priorytet rodzica'
          labelAccent='rose'
          padding='md'
          title={activeLessonAssignment.title}
          tone='accent'
        />
      ) : completedActiveLessonAssignment ? (
        <KangurSummaryPanel
          accent='emerald'
          className='w-full'
          description={`To zadanie zostalo juz wykonane. ${completedActiveLessonAssignment.progress.summary}`}
          label='Ukonczone zadanie od rodzica'
          labelAccent='emerald'
          padding='md'
          title={completedActiveLessonAssignment.title}
          tone='accent'
        />
      ) : null}

      <KangurLessonNarrator
        lesson={activeLesson}
        lessonDocument={activeLessonDocument}
        lessonContentRef={activeLessonContentRef}
      />

      <div ref={activeLessonContentRef} className='flex w-full flex-col items-center gap-4'>
        {shouldRenderLessonDocument && activeLessonDocument ? (
          <div className='w-full space-y-4'>
            <KangurSummaryPanel
              accent='sky'
              className='rounded-[30px] shadow-lg'
              description={activeLesson.description}
              label='Lesson document'
              labelAccent='sky'
              padding='lg'
              title={activeLesson.title}
            >
              <div className='mt-4 flex justify-start md:justify-end'>
                <KangurButton
                  type='button'
                  onClick={clearActiveLesson}
                  size='md'
                  variant='secondary'
                  data-doc-id='lessons_back_button'
                >
                  Wroc do listy lekcji
                </KangurButton>
              </div>
            </KangurSummaryPanel>
            <KangurLessonDocumentRenderer document={activeLessonDocument} />
          </div>
        ) : activeLesson.contentMode === 'document' && !hasActiveLessonDocumentContent ? (
          <KangurSummaryPanel
            accent='amber'
            align='center'
            className='w-full rounded-[30px] shadow-lg'
            description='This lesson is set to use custom document content, but no document blocks have been saved yet.'
            label='Lesson document'
            labelAccent='amber'
            padding='xl'
            title={activeLesson.title}
            tone='accent'
          >
            <KangurButton
              type='button'
              onClick={clearActiveLesson}
              className='mt-5'
              size='md'
              variant='secondary'
              data-doc-id='lessons_back_button'
            >
              Wroc do listy lekcji
            </KangurButton>
          </KangurSummaryPanel>
        ) : ActiveLessonComponent ? (
          <KangurLessonNavigationProvider onBack={clearActiveLesson}>
            <ActiveLessonComponent />
          </KangurLessonNavigationProvider>
        ) : null}
      </div>
    </div>
  );
}
