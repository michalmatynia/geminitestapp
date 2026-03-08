'use client';

import type { RefObject } from 'react';

import type { KangurAssignmentSnapshot } from '@/features/kangur/services/ports';
import type { KangurLessonDocument } from '@/features/kangur/ui/context/KangurLessonsRuntimeContext.shared';
import { KangurLessonNarrator } from '@/features/kangur/ui/components/KangurLessonNarrator';
import {
  KangurButton,
  KangurGlassPanel,
  KangurGradientIconTile,
  KangurHeadline,
  KangurStatusChip,
} from '@/features/kangur/ui/design/primitives';
import type { KangurLesson } from '@/shared/contracts/kangur';

type KangurActiveLessonHeaderProps = {
  lesson: KangurLesson;
  lessonDocument: KangurLessonDocument;
  lessonContentRef: RefObject<HTMLElement | null>;
  activeLessonAssignment?: KangurAssignmentSnapshot | null;
  completedActiveLessonAssignment?: KangurAssignmentSnapshot | null;
  assignmentRef?: RefObject<HTMLDivElement | null>;
  headerTestId: string;
  headerActionsTestId: string;
  iconTestId: string;
  priorityChipTestId: string;
  completedChipTestId: string;
  onBack?: () => void;
  backButtonLabel?: string;
};

export function KangurActiveLessonHeader({
  lesson,
  lessonDocument,
  lessonContentRef,
  activeLessonAssignment = null,
  completedActiveLessonAssignment = null,
  assignmentRef,
  headerTestId,
  headerActionsTestId,
  iconTestId,
  priorityChipTestId,
  completedChipTestId,
  onBack,
  backButtonLabel = 'Wróć do listy lekcji',
}: KangurActiveLessonHeaderProps): React.JSX.Element {
  return (
    <KangurGlassPanel
      className='w-full'
      data-testid={headerTestId}
      padding='lg'
      surface='mistStrong'
      variant='soft'
    >
      <div className='flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between'>
        <div className='flex flex-col gap-4 sm:flex-row sm:items-center'>
          <div className='flex items-center gap-3' data-testid={headerActionsTestId}>
            <KangurGradientIconTile
              data-testid={iconTestId}
              gradientClass={lesson.color}
              size='lg'
            >
              {lesson.emoji}
            </KangurGradientIconTile>
            <KangurLessonNarrator
              className='w-auto shrink-0'
              lesson={lesson}
              lessonDocument={lessonDocument}
              lessonContentRef={lessonContentRef}
              loadingLabel='Przygotowywanie...'
              pauseLabel='Pauza'
              readLabel='Czytaj'
              resumeLabel='Wznow'
            />
          </div>
          <div className='min-w-0'>
            <KangurHeadline accent='slate' as='h2' size='md'>
              {lesson.title}
            </KangurHeadline>
            <p className='mt-1 text-sm text-slate-500'>{lesson.description}</p>
            {activeLessonAssignment ? (
              <div ref={assignmentRef} className='mt-3 inline-flex'>
                <KangurStatusChip
                  accent='rose'
                  className='uppercase tracking-[0.14em]'
                  data-testid={priorityChipTestId}
                  size='sm'
                >
                  Priorytet Rodzica
                </KangurStatusChip>
              </div>
            ) : completedActiveLessonAssignment ? (
              <KangurStatusChip
                accent='emerald'
                className='mt-3 uppercase tracking-[0.14em]'
                data-testid={completedChipTestId}
                size='sm'
              >
                Ukonczone dla rodzica
              </KangurStatusChip>
            ) : null}
          </div>
        </div>
        {onBack ? (
          <div className='flex justify-start lg:justify-end'>
            <KangurButton onClick={onBack} size='sm' variant='surface'>
              {backButtonLabel}
            </KangurButton>
          </div>
        ) : null}
      </div>
    </KangurGlassPanel>
  );
}
