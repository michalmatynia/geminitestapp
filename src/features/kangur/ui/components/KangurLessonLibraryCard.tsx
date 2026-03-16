import React, { type AriaAttributes, type ComponentProps } from 'react';

import type { KangurAssignmentSnapshot } from '@/features/kangur/services/ports';
import { KangurAssignmentPriorityChip } from '@/features/kangur/ui/components/KangurAssignmentPriorityChip';
import { KangurIconSummaryOptionCard } from '@/features/kangur/ui/components/KangurIconSummaryOptionCard';
import { KangurIconSummaryCardContent } from '@/features/kangur/ui/components/KangurIconSummaryCardContent';
import type { LessonMasteryPresentation } from '@/features/kangur/ui/context/KangurLessonsRuntimeContext.shared';
import {
  KangurGradientIconTile,
  KangurStatusChip,
} from '@/features/kangur/ui/design/primitives';
import type { KangurLesson } from '@/features/kangur/shared/contracts/kangur';
import { cn } from '@/features/kangur/utils/cn';

// ── Lesson Library Card Sub-components ───────────────────────────────────────

export function KangurLessonLibraryCardAside({
  masteryPresentation,
  lessonAssignment,
  completedLessonAssignment,
  className,
}: {
  masteryPresentation: LessonMasteryPresentation;
  lessonAssignment: KangurAssignmentSnapshot | null;
  completedLessonAssignment: KangurAssignmentSnapshot | null;
  className?: string;
}): React.JSX.Element {
  const masteryAccent = masteryPresentation.badgeAccent;
  const assignmentPriority = lessonAssignment?.priority;

  return (
    <div className={cn('flex flex-wrap items-start gap-2 sm:flex-col sm:items-end', className)}>
      <KangurStatusChip
        accent={masteryAccent}
        className='uppercase tracking-[0.14em]'
        size='sm'
      >
        {masteryPresentation.statusLabel}
      </KangurStatusChip>
      {lessonAssignment ? (
        <KangurAssignmentPriorityChip
          accent='rose'
          className='uppercase tracking-[0.14em]'
          priority={assignmentPriority ?? 'medium'}
          size='sm'
        />
      ) : completedLessonAssignment ? (
        <KangurStatusChip accent='emerald' className='uppercase tracking-[0.14em]' size='sm'>
          Zadanie zamknięte
        </KangurStatusChip>
      ) : null}
    </div>
  );
}

export function KangurLessonLibraryCardFooter({
  lesson,
  hasDocumentContent,
  lessonAssignment,
  completedLessonAssignment,
  masteryPresentation,
}: {
  lesson: KangurLesson;
  hasDocumentContent: boolean;
  lessonAssignment: KangurAssignmentSnapshot | null;
  completedLessonAssignment: KangurAssignmentSnapshot | null;
  masteryPresentation: LessonMasteryPresentation;
}): React.JSX.Element {
  const footerChips = [
    lesson.contentMode === 'document' && hasDocumentContent ? (
      <KangurStatusChip
        key='document-content'
        accent='sky'
        className='uppercase tracking-[0.14em]'
        size='sm'
      >
        Wlasna zawartosc
      </KangurStatusChip>
    ) : null,
    lessonAssignment ? (
      <KangurStatusChip
        key='lesson-assignment'
        accent='rose'
        className='uppercase tracking-[0.14em]'
        size='sm'
      >
        Priorytet rodzica
      </KangurStatusChip>
    ) : completedLessonAssignment ? (
      <KangurStatusChip
        key='completed-assignment'
        accent='emerald'
        className='uppercase tracking-[0.14em]'
        size='sm'
      >
        Ukończone dla rodzica
      </KangurStatusChip>
    ) : null,
  ].filter(Boolean);

  return (
    <>
      {footerChips.length > 0 ? <div className='flex flex-wrap gap-2'>{footerChips}</div> : null}
      <div className='mt-3 break-words text-xs font-medium [color:var(--kangur-page-muted-text)]'>
        {masteryPresentation.summaryLabel}
      </div>
      {lessonAssignment ? (
        <div className='mt-2 break-words text-xs font-semibold text-rose-600'>
          {lessonAssignment.description}
        </div>
      ) : completedLessonAssignment ? (
        <div className='mt-2 break-words text-xs font-semibold text-emerald-600'>
          Zadanie od rodzica zostało już wykonane. {completedLessonAssignment.progress.summary}
        </div>
      ) : null}
    </>
  );
}

// ── Main Card Component ──────────────────────────────────────────────────────

type KangurLessonLibraryCardProps = {
  ariaCurrent?: AriaAttributes['aria-current'];
  buttonClassName?: string;
  completedLessonAssignment: KangurAssignmentSnapshot | null;
  contentClassName?: string;
  dataDocId?: string;
  hasDocumentContent?: boolean;
  iconTestId?: string;
  itemTestId?: string;
  lesson: KangurLesson;
  lessonAssignment: KangurAssignmentSnapshot | null;
  masteryPresentation: LessonMasteryPresentation;
  onSelect: () => void;
  statusGroupClassName?: string;
} & Pick<ComponentProps<typeof KangurIconSummaryOptionCard>, 'emphasis'>;

export function KangurLessonLibraryCard(props: KangurLessonLibraryCardProps): React.JSX.Element {
  const {
    ariaCurrent,
    buttonClassName,
    completedLessonAssignment,
    contentClassName,
    dataDocId,
    emphasis = 'neutral',
    hasDocumentContent = false,
    iconTestId,
    itemTestId,
    lesson,
    lessonAssignment,
    masteryPresentation,
    onSelect,
    statusGroupClassName,
  } = props;

  return (
    <KangurIconSummaryOptionCard
      accent='indigo'
      buttonClassName={cn('w-full text-left', buttonClassName)}
      aria-label={`Lekcja: ${lesson.title}`}
      aria-current={ariaCurrent}
      data-doc-id={dataDocId}
      data-testid={itemTestId}
      emphasis={emphasis}
      onClick={onSelect}
    >
      <KangurIconSummaryCardContent
        aside={
          <KangurLessonLibraryCardAside
            className={statusGroupClassName}
            completedLessonAssignment={completedLessonAssignment}
            lessonAssignment={lessonAssignment}
            masteryPresentation={masteryPresentation}
          />
        }
        asideClassName='w-full self-start sm:ml-auto sm:w-auto'
        className='w-full'
        contentClassName={contentClassName}
        description={lesson.description}
        footer={
          <KangurLessonLibraryCardFooter
            completedLessonAssignment={completedLessonAssignment}
            hasDocumentContent={hasDocumentContent}
            lesson={lesson}
            lessonAssignment={lessonAssignment}
            masteryPresentation={masteryPresentation}
          />
        }
        headerClassName='flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between'
        icon={
          <KangurGradientIconTile
            data-testid={iconTestId}
            gradientClass={lesson.color}
            size='lg'
            role='presentation'
            aria-hidden='true'
          >
            {lesson.emoji}
          </KangurGradientIconTile>
        }
        title={lesson.title}
        titleAs='h2'
        titleClassName='text-lg sm:text-xl'
      />
    </KangurIconSummaryOptionCard>
  );
}
