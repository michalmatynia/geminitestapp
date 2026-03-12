'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';

import { useKangurLessonSubsectionNavigationActive } from '@/features/kangur/ui/context/KangurLessonNavigationContext';
import { useOptionalKangurLessonsRuntime } from '@/features/kangur/ui/context/KangurLessonsRuntimeContext';
import { KangurButton } from '@/features/kangur/ui/design/primitives';
import type { KangurLesson } from '@/shared/contracts/kangur';

import type { JSX } from 'react';

type KangurLessonNavigationWidgetProps = {
  prevLesson?: KangurLesson | null;
  nextLesson?: KangurLesson | null;
  onSelectLesson?: (lessonId: string) => void;
};

export function KangurLessonNavigationWidget({
  prevLesson: overridePrevLesson,
  nextLesson: overrideNextLesson,
  onSelectLesson,
}: KangurLessonNavigationWidgetProps = {}): JSX.Element | null {
  const runtime = useOptionalKangurLessonsRuntime();
  const isSubsectionNavigationActive = useKangurLessonSubsectionNavigationActive();
  const prevLesson = overridePrevLesson ?? runtime?.prevLesson ?? null;
  const nextLesson = overrideNextLesson ?? runtime?.nextLesson ?? null;
  const handleSelectLesson = onSelectLesson ?? runtime?.selectLesson;

  if (isSubsectionNavigationActive || !handleSelectLesson || (!prevLesson && !nextLesson)) {
    return null;
  }

  return (
    <div className='mt-2 flex w-full flex-col gap-3 sm:flex-row'>
      {prevLesson ? (
        <KangurButton
          onClick={() => handleSelectLesson(prevLesson.id)}
          className='w-full justify-between sm:flex-1 sm:justify-start'
          size='lg'
          variant='surface'
          data-doc-id='lessons_prev_next'
        >
          <ChevronLeft className='h-4 w-4 flex-shrink-0' />
          <span className='min-w-0 truncate'>{prevLesson.title}</span>
        </KangurButton>
      ) : (
        <div className='hidden sm:block sm:flex-1' />
      )}

      {nextLesson ? (
        <KangurButton
          onClick={() => handleSelectLesson(nextLesson.id)}
          className='w-full justify-between sm:flex-1 sm:justify-end'
          size='lg'
          variant='surface'
          data-doc-id='lessons_prev_next'
        >
          <span className='min-w-0 truncate'>{nextLesson.title}</span>
          <ChevronRight className='h-4 w-4 flex-shrink-0' />
        </KangurButton>
      ) : (
        <div className='hidden sm:block sm:flex-1' />
      )}
    </div>
  );
}
