'use client';

import type { JSX } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

import { KangurButton } from '@/features/kangur/ui/design/primitives';
import { useKangurLessonsRuntime } from '@/features/kangur/ui/context/KangurLessonsRuntimeContext';

export function KangurLessonNavigationWidget(): JSX.Element | null {
  const { prevLesson, nextLesson, selectLesson } = useKangurLessonsRuntime();

  if (!prevLesson && !nextLesson) {
    return null;
  }

  return (
    <div className='mt-2 flex w-full gap-3'>
      {prevLesson ? (
        <KangurButton
          onClick={() => selectLesson(prevLesson.id)}
          className='flex-1 justify-start'
          size='lg'
          variant='secondary'
          data-doc-id='lessons_prev_next'
        >
          <ChevronLeft className='h-4 w-4 flex-shrink-0' />
          <span>
            {prevLesson.emoji} {prevLesson.title}
          </span>
        </KangurButton>
      ) : (
        <div className='flex-1' />
      )}

      {nextLesson ? (
        <KangurButton
          onClick={() => selectLesson(nextLesson.id)}
          className='flex-1 justify-end'
          size='lg'
          variant='secondary'
          data-doc-id='lessons_prev_next'
        >
          <span>
            {nextLesson.emoji} {nextLesson.title}
          </span>
          <ChevronRight className='h-4 w-4 flex-shrink-0' />
        </KangurButton>
      ) : (
        <div className='flex-1' />
      )}
    </div>
  );
}
