'use client';

import { useEffect, useRef, type RefObject } from 'react';

import type { KangurAssignmentSnapshot } from '@/features/kangur/services/ports';
import { KangurLessonNarrator } from '@/features/kangur/ui/components/KangurLessonNarrator';
import { useKangurLessonSubsectionSummary } from '@/features/kangur/ui/context/KangurLessonNavigationContext';
import type { KangurLessonDocument } from '@/features/kangur/ui/context/KangurLessonsRuntimeContext.shared';
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
  const subsectionSummary = useKangurLessonSubsectionSummary();
  const displayTitle = subsectionSummary?.title ?? lesson.title;
  const displayDescription = subsectionSummary?.description ?? lesson.description;
  const subsectionTypeLabel = subsectionSummary?.isGame ? 'Gra' : 'Lekcja';
  const headerAnchorRef = useRef<HTMLDivElement | null>(null);
  const subsectionAnchorKey = subsectionSummary
    ? `${subsectionSummary.isGame ? 'game' : 'lesson'}:${subsectionSummary.title}:${subsectionSummary.description}`
    : null;

  useEffect(() => {
    if (!subsectionAnchorKey) {
      return;
    }

    const frameId = window.requestAnimationFrame(() => {
      headerAnchorRef.current?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
    });

    return () => {
      window.cancelAnimationFrame(frameId);
    };
  }, [subsectionAnchorKey]);

  return (
    <div ref={headerAnchorRef} className='w-full'>
      <KangurGlassPanel
        className='w-full'
        data-testid={headerTestId}
        padding='md'
        surface='mistStrong'
        variant='soft'
      >
        <div
          className='flex flex-wrap items-start gap-3 sm:items-center'
          data-testid={headerActionsTestId}
        >
          {onBack ? (
            <KangurButton onClick={onBack} size='sm' variant='surface'>
              {backButtonLabel}
            </KangurButton>
          ) : null}
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
          <div className='min-w-0 flex-1'>
            {subsectionSummary ? (
              <div className='flex min-w-0 items-start gap-2.5 sm:items-center'>
                <div className='flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl border border-slate-200/80 bg-white/90 text-lg shadow-sm'>
                  {subsectionSummary.emoji}
                </div>
                <div className='min-w-0'>
                  <div className='flex min-w-0 flex-wrap items-center gap-2'>
                    <KangurStatusChip
                      accent={subsectionSummary.isGame ? 'amber' : 'sky'}
                      className='uppercase tracking-[0.12em]'
                      size='sm'
                    >
                      {subsectionTypeLabel}
                    </KangurStatusChip>
                    <KangurHeadline accent='slate' as='h2' size='sm'>
                      {displayTitle}
                    </KangurHeadline>
                  </div>
                  <p className='mt-0.5 text-xs text-slate-500'>{displayDescription}</p>
                </div>
              </div>
            ) : (
              <>
                <KangurHeadline accent='slate' as='h2' size='md'>
                  {displayTitle}
                </KangurHeadline>
                <p className='mt-1 text-sm text-slate-500'>{displayDescription}</p>
              </>
            )}
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
          <div className='ml-auto flex shrink-0 justify-end'>
            <KangurGradientIconTile
              data-testid={iconTestId}
              gradientClass={lesson.color}
              size='lg'
            >
              {lesson.emoji}
            </KangurGradientIconTile>
          </div>
        </div>
      </KangurGlassPanel>
    </div>
  );
}
