import React, { type AriaAttributes, type ComponentProps } from 'react';
import { useLocale, useTranslations } from 'next-intl';

import type { KangurAssignmentSnapshot } from '@kangur/platform';
import {
  getLocalizedKangurLessonDescription,
  getLocalizedKangurLessonTitle,
} from '@/features/kangur/lessons/lesson-catalog-i18n';
import { KangurAssignmentPriorityChip } from '@/features/kangur/ui/components/KangurAssignmentPriorityChip';
import { KangurIconSummaryOptionCard } from '@/features/kangur/ui/components/KangurIconSummaryOptionCard';
import { KangurIconSummaryCardContent } from '@/features/kangur/ui/components/KangurIconSummaryCardContent';
import type { LessonMasteryPresentation } from '@/features/kangur/ui/context/KangurLessonsRuntimeContext.shared';
import {
  KangurGradientIconTile,
  KangurStatusChip,
} from '@/features/kangur/ui/design/primitives';
import {
  KANGUR_PANEL_ROW_CLASSNAME,
  KANGUR_WRAP_ROW_CLASSNAME,
  KANGUR_WRAP_START_ROW_CLASSNAME,
} from '@/features/kangur/ui/design/tokens';
import { useKangurCoarsePointer } from '@/features/kangur/ui/hooks/useKangurCoarsePointer';
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
  const translations = useTranslations('KangurLessonsWidgets.libraryCard');
  const masteryAccent = masteryPresentation.badgeAccent;
  const assignmentPriority = lessonAssignment?.priority;

  return (
    <div
      className={cn(
        KANGUR_WRAP_START_ROW_CLASSNAME,
        'max-[480px]:flex-col sm:flex-col sm:items-end',
        className
      )}
    >
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
          {translations('closedAssignment')}
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
  const translations = useTranslations('KangurLessonsWidgets.libraryCard');
  const footerChips = [
    lesson.contentMode === 'document' && hasDocumentContent ? (
      <KangurStatusChip
        key='document-content'
        accent='sky'
        className='uppercase tracking-[0.14em]'
        size='sm'
      >
        {translations('customContent')}
      </KangurStatusChip>
    ) : null,
    lessonAssignment ? (
      <KangurStatusChip
        key='lesson-assignment'
        accent='rose'
        className='uppercase tracking-[0.14em]'
        size='sm'
      >
        {translations('parentPriority')}
      </KangurStatusChip>
    ) : completedLessonAssignment ? (
      <KangurStatusChip
        key='completed-assignment'
        accent='emerald'
        className='uppercase tracking-[0.14em]'
        size='sm'
      >
        {translations('completedForParent')}
      </KangurStatusChip>
    ) : null,
  ].filter(Boolean);

  return (
    <>
      {footerChips.length > 0 ? <div className={KANGUR_WRAP_ROW_CLASSNAME}>{footerChips}</div> : null}
      <div className='mt-3 break-words text-xs font-medium [color:var(--kangur-page-muted-text)]'>
        {masteryPresentation.summaryLabel}
      </div>
      {lessonAssignment ? (
        <div className='mt-2 break-words text-xs font-semibold text-rose-600'>
          {lessonAssignment.description}
        </div>
      ) : completedLessonAssignment ? (
        <div className='mt-2 break-words text-xs font-semibold text-emerald-600'>
          {translations('completedAssignmentSummary', {
            summary: completedLessonAssignment.progress.summary,
          })}
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
  const locale = useLocale();
  const translations = useTranslations('KangurLessonsWidgets.libraryCard');
  const isCoarsePointer = useKangurCoarsePointer();
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
  const localizedTitle = getLocalizedKangurLessonTitle(lesson.componentId, locale, lesson.title);
  const localizedDescription = getLocalizedKangurLessonDescription(
    lesson.componentId,
    locale,
    lesson.description
  );

  return (
    <KangurIconSummaryOptionCard
      accent='indigo'
      buttonClassName={cn(
        'w-full text-left',
        isCoarsePointer && 'min-h-11 px-4 touch-manipulation select-none active:scale-[0.97]',
        buttonClassName
      )}
      aria-label={translations('ariaLabel', { title: localizedTitle })}
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
        className='w-full max-[480px]:flex-col'
        contentClassName={contentClassName}
        description={localizedDescription}
        footer={
          <KangurLessonLibraryCardFooter
            completedLessonAssignment={completedLessonAssignment}
            hasDocumentContent={hasDocumentContent}
            lesson={lesson}
            lessonAssignment={lessonAssignment}
            masteryPresentation={masteryPresentation}
          />
        }
        headerClassName={cn(KANGUR_PANEL_ROW_CLASSNAME, 'sm:items-start sm:justify-between')}
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
        title={localizedTitle}
        titleAs='h2'
        titleClassName='text-lg sm:text-xl'
      />
    </KangurIconSummaryOptionCard>
  );
}
