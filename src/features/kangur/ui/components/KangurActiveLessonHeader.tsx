'use client';

import { createContext, useContext, useEffect, useRef, type RefObject } from 'react';

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
  assignmentSectionSummary?: string;
  assignmentSectionTitle?: string;
  assignmentRef?: RefObject<HTMLDivElement | null>;
  descriptionOverride?: string;
  headerTestId: string;
  headerActionsTestId: string;
  iconTestId: string;
  priorityChipTestId: string;
  completedChipTestId: string;
  onBack?: () => void;
  backButtonLabel?: string;
  titleOverride?: string;
};

type KangurActiveLessonHeaderContextValue = {
  lesson: KangurLesson;
  lessonDocument: KangurLessonDocument;
  lessonContentRef: RefObject<HTMLElement | null>;
  activeLessonAssignment?: KangurAssignmentSnapshot | null;
  completedActiveLessonAssignment?: KangurAssignmentSnapshot | null;
  assignmentSectionSummary?: string;
  assignmentSectionTitle?: string;
  assignmentRef?: RefObject<HTMLDivElement | null>;
  headerActionsTestId: string;
  iconTestId: string;
  priorityChipTestId: string;
  completedChipTestId: string;
  onBack?: () => void;
  backButtonLabel: string;
  displayTitle: string;
  displayDescription: string;
  subsectionSummary: ReturnType<typeof useKangurLessonSubsectionSummary>;
  subsectionTypeLabel: string;
};

const KangurActiveLessonHeaderContext = createContext<KangurActiveLessonHeaderContextValue | null>(null);

const useKangurActiveLessonHeaderContext = () => {
  const value = useContext(KangurActiveLessonHeaderContext);
  if (!value) {
    throw new Error('KangurActiveLessonHeader context is unavailable.');
  }
  return value;
};

function KangurActiveLessonHeaderActions(): React.JSX.Element {
  const { onBack, backButtonLabel, lesson, lessonDocument, lessonContentRef, headerActionsTestId } =
    useKangurActiveLessonHeaderContext();

  return (
    <div className='flex flex-wrap items-start gap-3 sm:items-center' data-testid={headerActionsTestId}>
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
      <KangurActiveLessonHeaderBody />
      <KangurActiveLessonHeaderIcon />
    </div>
  );
}

function KangurActiveLessonHeaderBody(): React.JSX.Element {
  const {
    displayTitle,
    displayDescription,
    subsectionSummary,
    subsectionTypeLabel,
    activeLessonAssignment,
    completedActiveLessonAssignment,
    assignmentSectionSummary,
    assignmentSectionTitle,
    assignmentRef,
    priorityChipTestId,
    completedChipTestId,
  } = useKangurActiveLessonHeaderContext();
  const assignmentStateChip = activeLessonAssignment ? (
    <KangurStatusChip
      accent='rose'
      className='uppercase tracking-[0.14em]'
      data-testid={priorityChipTestId}
      size='sm'
    >
      Priorytet Rodzica
    </KangurStatusChip>
  ) : completedActiveLessonAssignment ? (
    <KangurStatusChip
      accent='emerald'
      className='uppercase tracking-[0.14em]'
      data-testid={completedChipTestId}
      size='sm'
    >
      Ukończone dla rodzica
    </KangurStatusChip>
  ) : null;

  return (
    <div className='min-w-0 flex-1'>
      {subsectionSummary ? (
        <div className='flex min-w-0 items-start gap-2.5 sm:items-center'>
          <div
            className='soft-card flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl border text-lg shadow-sm'
            style={{ borderColor: 'var(--kangur-soft-card-border)' }}
          >
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
            <p className='mt-0.5 text-xs [color:var(--kangur-page-muted-text)]'>
              {displayDescription}
            </p>
          </div>
        </div>
      ) : (
        <>
          <KangurHeadline accent='slate' as='h2' size='md'>
            {displayTitle}
          </KangurHeadline>
          <p className='mt-1 text-sm [color:var(--kangur-page-muted-text)]'>
            {displayDescription}
          </p>
        </>
      )}
      {assignmentStateChip ? (
        <div ref={assignmentRef} className='mt-3 flex max-w-xl flex-col items-start gap-1.5'>
          {assignmentSectionTitle ? (
            <div className='text-[11px] font-bold uppercase tracking-[0.14em] [color:var(--kangur-page-muted-text)]'>
              {assignmentSectionTitle}
            </div>
          ) : null}
          {assignmentStateChip}
          {assignmentSectionSummary ? (
            <p className='text-xs leading-relaxed [color:var(--kangur-page-muted-text)]'>
              {assignmentSectionSummary}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function KangurActiveLessonHeaderIcon(): React.JSX.Element {
  const { iconTestId, lesson } = useKangurActiveLessonHeaderContext();

  return (
    <div className='ml-auto flex shrink-0 justify-end'>
      <KangurGradientIconTile data-testid={iconTestId} gradientClass={lesson.color} size='lg'>
        {lesson.emoji}
      </KangurGradientIconTile>
    </div>
  );
}

export function KangurActiveLessonHeader({
  lesson,
  lessonDocument,
  lessonContentRef,
  activeLessonAssignment = null,
  completedActiveLessonAssignment = null,
  assignmentSectionSummary,
  assignmentSectionTitle,
  assignmentRef,
  descriptionOverride,
  headerTestId,
  headerActionsTestId,
  iconTestId,
  priorityChipTestId,
  completedChipTestId,
  onBack,
  backButtonLabel = 'Wróć do listy lekcji',
  titleOverride,
}: KangurActiveLessonHeaderProps): React.JSX.Element {
  const subsectionSummary = useKangurLessonSubsectionSummary();
  const lessonHeaderTestId = headerTestId;
  const displayTitle = subsectionSummary?.title ?? titleOverride ?? lesson.title;
  const displayDescription = subsectionSummary?.description ?? descriptionOverride ?? lesson.description;
  const subsectionTypeLabel = subsectionSummary?.isGame ? 'Gra' : 'Lekcja';
  const headerAnchorRef = useRef<HTMLDivElement | null>(null);
  const subsectionAnchorKey = subsectionSummary
    ? `${subsectionSummary.isGame ? 'game' : 'lesson'}:${subsectionSummary.title}:${subsectionSummary.description}`
    : null;
  const contextValue: KangurActiveLessonHeaderContextValue = {
    lesson,
    lessonDocument,
    lessonContentRef,
    activeLessonAssignment,
    completedActiveLessonAssignment,
    assignmentSectionSummary,
    assignmentSectionTitle,
    assignmentRef,
    headerActionsTestId,
    iconTestId,
    priorityChipTestId,
    completedChipTestId,
    onBack,
    backButtonLabel,
    displayTitle,
    displayDescription,
    subsectionSummary,
    subsectionTypeLabel,
  };

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
      <KangurActiveLessonHeaderContext.Provider value={contextValue}>
        <KangurGlassPanel
          className='w-full'
          data-testid={lessonHeaderTestId}
          padding='md'
          surface='mistStrong'
          variant='soft'
        >
          <KangurActiveLessonHeaderActions />
        </KangurGlassPanel>
      </KangurActiveLessonHeaderContext.Provider>
    </div>
  );
}
