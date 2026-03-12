'use client';

import type { ComponentProps } from 'react';

import type { KangurAssignmentSnapshot } from '@/features/kangur/services/ports';
import { KangurAssignmentPriorityChip } from '@/features/kangur/ui/components/KangurAssignmentPriorityChip';
import { KangurIconSummaryOptionCard } from '@/features/kangur/ui/components/KangurIconSummaryOptionCard';
import type { LessonMasteryPresentation } from '@/features/kangur/ui/context/KangurLessonsRuntimeContext.shared';
import {
  KangurGradientIconTile,
  KangurStatusChip,
} from '@/features/kangur/ui/design/primitives';
import type { KangurLesson } from '@/shared/contracts/kangur';
import { cn } from '@/shared/utils';

type KangurLessonLibraryCardProps = {
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

export function KangurLessonLibraryCard({
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
}: KangurLessonLibraryCardProps): React.JSX.Element {
  const footerChips = [
    lesson.contentMode === 'document' && hasDocumentContent ? (
      <KangurStatusChip key='document-content' accent='sky' className='uppercase tracking-[0.14em]' size='sm'>
        Wlasna zawartosc
      </KangurStatusChip>
    ) : null,
    lessonAssignment ? (
      <KangurStatusChip key='lesson-assignment' accent='rose' className='uppercase tracking-[0.14em]' size='sm'>
        Priorytet rodzica
      </KangurStatusChip>
    ) : completedLessonAssignment ? (
      <KangurStatusChip
        key='completed-assignment'
        accent='emerald'
        className='uppercase tracking-[0.14em]'
        size='sm'
      >
        Ukonczone dla rodzica
      </KangurStatusChip>
    ) : null,
  ].filter(Boolean);

  return (
    <KangurIconSummaryOptionCard
      accent='indigo'
      aside={
        <>
          <KangurStatusChip
            accent={masteryPresentation.badgeAccent}
            className='uppercase tracking-[0.14em]'
            size='sm'
          >
            {masteryPresentation.statusLabel}
          </KangurStatusChip>
          {lessonAssignment ? (
            <KangurAssignmentPriorityChip
              accent='rose'
              className='uppercase tracking-[0.14em]'
              priority={lessonAssignment.priority}
              size='sm'
            />
          ) : completedLessonAssignment ? (
            <KangurStatusChip
              accent='emerald'
              className='uppercase tracking-[0.14em]'
              size='sm'
            >
              Zadanie zamkniete
            </KangurStatusChip>
          ) : null}
        </>
      }
      asideClassName={cn(
        'flex flex-wrap items-center gap-2 sm:flex-col sm:items-end',
        statusGroupClassName
      )}
      buttonClassName={cn(
        'w-full text-left max-sm:pr-16 max-sm:pb-16',
        buttonClassName
      )}
      contentClassName={contentClassName}
      data-doc-id={dataDocId}
      data-testid={itemTestId}
      description={lesson.description}
      emphasis={emphasis}
      footer={
        <>
          {footerChips.length > 0 ? <div className='flex flex-wrap gap-2'>{footerChips}</div> : null}
          <div className='mt-3 text-xs font-medium [color:var(--kangur-page-muted-text)]'>
            {masteryPresentation.summaryLabel}
          </div>
          {lessonAssignment ? (
            <div className='mt-2 text-xs font-semibold text-rose-600'>
              {lessonAssignment.description}
            </div>
          ) : completedLessonAssignment ? (
            <div className='mt-2 text-xs font-semibold text-emerald-600'>
              Zadanie od rodzica zostalo juz wykonane. {completedLessonAssignment.progress.summary}
            </div>
          ) : null}
        </>
      }
      headerClassName='flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between'
      icon={
        <KangurGradientIconTile data-testid={iconTestId} gradientClass={lesson.color} size='lg'>
          {lesson.emoji}
        </KangurGradientIconTile>
      }
      layoutClassName='w-full'
      onClick={onSelect}
      title={lesson.title}
      titleClassName='text-lg sm:text-xl'
    />
  );
}
