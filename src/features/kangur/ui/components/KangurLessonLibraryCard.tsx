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
import KangurVisualCueContent from '@/features/kangur/ui/components/KangurVisualCueContent';
import { useKangurAgeGroupFocus } from '@/features/kangur/ui/context/KangurAgeGroupFocusContext';
import type { LessonMasteryPresentation } from '@/features/kangur/ui/context/KangurLessonsRuntimeContext.shared';
import {
  KANGUR_SIX_YEAR_OLD_ASSIGNMENT_ICON,
  KANGUR_SIX_YEAR_OLD_COMPLETED_ASSIGNMENT_ICON,
  KANGUR_SIX_YEAR_OLD_CUSTOM_CONTENT_ICON,
  getKangurSixYearOldMasteryIcon,
} from '@/features/kangur/ui/constants/six-year-old-visuals';
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

type KangurLessonLibraryCardTranslationKey =
  | 'ariaLabel'
  | 'closedAssignment'
  | 'completedAssignmentSummary'
  | 'completedForParent'
  | 'customContent'
  | 'parentPriority';

type KangurLessonLibraryCardTranslations = (
  key: KangurLessonLibraryCardTranslationKey,
  values?: Record<string, string | number>
) => string;

// ── Lesson Library Card Sub-components ───────────────────────────────────────

function renderKangurLessonLibraryCardAside({
  translations,
  masteryPresentation,
  lessonAssignment,
  completedLessonAssignment,
  isSixYearOld,
  className,
}: {
  translations: (key: 'parentPriority' | 'closedAssignment') => string;
  masteryPresentation: LessonMasteryPresentation;
  lessonAssignment: KangurAssignmentSnapshot | null;
  completedLessonAssignment: KangurAssignmentSnapshot | null;
  isSixYearOld: boolean;
  className?: string;
}): React.JSX.Element {
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
        aria-label={masteryPresentation.statusLabel}
        className='uppercase tracking-[0.14em]'
        data-testid='lesson-library-mastery-chip'
        size='sm'
      >
        {isSixYearOld ? (
          <KangurVisualCueContent
            icon={getKangurSixYearOldMasteryIcon(masteryAccent)}
            iconClassName='text-base'
            iconTestId='lesson-library-mastery-chip-icon'
            label={masteryPresentation.statusLabel}
          />
        ) : (
          masteryPresentation.statusLabel
        )}
      </KangurStatusChip>
      {lessonAssignment ? (
        <KangurAssignmentPriorityChip
          accent='rose'
          aria-label={assignmentPriority ? translations('parentPriority') : undefined}
          className='uppercase tracking-[0.14em]'
          data-testid='lesson-library-assignment-chip'
          labelOverride={
            isSixYearOld ? (
              <KangurVisualCueContent
                icon={KANGUR_SIX_YEAR_OLD_ASSIGNMENT_ICON}
                iconClassName='text-base'
                iconTestId='lesson-library-assignment-chip-icon'
                label={translations('parentPriority')}
              />
            ) : undefined
          }
          priority={assignmentPriority ?? 'medium'}
          size='sm'
        />
      ) : completedLessonAssignment ? (
        <KangurStatusChip
          accent='emerald'
          aria-label={translations('closedAssignment')}
          className='uppercase tracking-[0.14em]'
          data-testid='lesson-library-completed-chip'
          size='sm'
        >
          {isSixYearOld ? (
            <KangurVisualCueContent
              icon={KANGUR_SIX_YEAR_OLD_COMPLETED_ASSIGNMENT_ICON}
              iconClassName='text-base'
              iconTestId='lesson-library-completed-chip-icon'
              label={translations('closedAssignment')}
            />
          ) : (
            translations('closedAssignment')
          )}
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
  isSixYearOld,
  translations,
}: {
  lesson: KangurLesson;
  hasDocumentContent: boolean;
  lessonAssignment: KangurAssignmentSnapshot | null;
  completedLessonAssignment: KangurAssignmentSnapshot | null;
  masteryPresentation: LessonMasteryPresentation;
  isSixYearOld: boolean;
  translations: KangurLessonLibraryCardTranslations;
}): React.JSX.Element {
  const footerChips = [
    lesson.contentMode === 'document' && hasDocumentContent ? (
      <KangurStatusChip
        key='document-content'
        accent='sky'
        aria-label={translations('customContent')}
        className='uppercase tracking-[0.14em]'
        data-testid='lesson-library-custom-content-chip'
        size='sm'
      >
        {isSixYearOld ? (
          <KangurVisualCueContent
            icon={KANGUR_SIX_YEAR_OLD_CUSTOM_CONTENT_ICON}
            iconClassName='text-base'
            iconTestId='lesson-library-custom-content-chip-icon'
            label={translations('customContent')}
          />
        ) : (
          translations('customContent')
        )}
      </KangurStatusChip>
    ) : null,
    lessonAssignment ? (
      <KangurStatusChip
        key='lesson-assignment'
        accent='rose'
        aria-label={translations('parentPriority')}
        className='uppercase tracking-[0.14em]'
        data-testid='lesson-library-footer-assignment-chip'
        size='sm'
      >
        {isSixYearOld ? (
          <KangurVisualCueContent
            icon={KANGUR_SIX_YEAR_OLD_ASSIGNMENT_ICON}
            iconClassName='text-base'
            iconTestId='lesson-library-footer-assignment-chip-icon'
            label={translations('parentPriority')}
          />
        ) : (
          translations('parentPriority')
        )}
      </KangurStatusChip>
    ) : completedLessonAssignment ? (
      <KangurStatusChip
        key='completed-assignment'
        accent='emerald'
        aria-label={translations('completedForParent')}
        className='uppercase tracking-[0.14em]'
        data-testid='lesson-library-footer-completed-chip'
        size='sm'
      >
        {isSixYearOld ? (
          <KangurVisualCueContent
            icon={KANGUR_SIX_YEAR_OLD_COMPLETED_ASSIGNMENT_ICON}
            iconClassName='text-base'
            iconTestId='lesson-library-footer-completed-chip-icon'
            label={translations('completedForParent')}
          />
        ) : (
          translations('completedForParent')
        )}
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
  locale?: string;
  masteryPresentation: LessonMasteryPresentation;
  onSelect: () => void;
  statusGroupClassName?: string;
  translations?: KangurLessonLibraryCardTranslations;
  isCoarsePointer?: boolean;
  isSixYearOld?: boolean;
} & Pick<ComponentProps<typeof KangurIconSummaryOptionCard>, 'emphasis'>;

type KangurLessonLibraryCardResolvedProps = Omit<
  KangurLessonLibraryCardProps,
  'isCoarsePointer' | 'isSixYearOld' | 'locale' | 'translations'
> & {
  isCoarsePointer: boolean;
  isSixYearOld: boolean;
  locale: string;
  translations: KangurLessonLibraryCardTranslations;
};

function KangurLessonLibraryCardResolved(
  props: KangurLessonLibraryCardResolvedProps
): React.JSX.Element {
  const {
    ariaCurrent,
    buttonClassName,
    completedLessonAssignment,
    contentClassName,
    dataDocId,
    emphasis = 'neutral',
    hasDocumentContent = false,
    iconTestId,
    isCoarsePointer,
    isSixYearOld,
    itemTestId,
    lesson,
    lessonAssignment,
    locale,
    masteryPresentation,
    onSelect,
    statusGroupClassName,
    translations,
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
        isCoarsePointer && 'min-h-12 px-4 touch-manipulation select-none active:scale-[0.985]',
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
          renderKangurLessonLibraryCardAside({
            className: statusGroupClassName,
            completedLessonAssignment,
            isSixYearOld,
            lessonAssignment,
            masteryPresentation,
            translations,
          })
        }
        asideClassName='w-full self-start sm:ml-auto sm:w-auto'
        className='w-full max-[480px]:flex-col'
        contentClassName={contentClassName}
        description={localizedDescription}
        footer={
          <KangurLessonLibraryCardFooter
            completedLessonAssignment={completedLessonAssignment}
            hasDocumentContent={hasDocumentContent}
            isSixYearOld={isSixYearOld}
            lesson={lesson}
            lessonAssignment={lessonAssignment}
            masteryPresentation={masteryPresentation}
            translations={translations}
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

function KangurLessonLibraryCardWithContext(
  props: KangurLessonLibraryCardProps
): React.JSX.Element {
  const locale = useLocale();
  const translations = useTranslations('KangurLessonsWidgets.libraryCard');
  const isCoarsePointer = useKangurCoarsePointer();
  const { ageGroup } = useKangurAgeGroupFocus();
  return (
    <KangurLessonLibraryCardResolved
      {...props}
      isCoarsePointer={Boolean(isCoarsePointer)}
      isSixYearOld={ageGroup === 'six_year_old'}
      locale={locale}
      translations={translations}
    />
  );
}

export function KangurLessonLibraryCard(props: KangurLessonLibraryCardProps): React.JSX.Element {
  if (
    props.locale !== undefined &&
    props.translations !== undefined &&
    props.isCoarsePointer !== undefined &&
    props.isSixYearOld !== undefined
  ) {
    const {
      isCoarsePointer,
      isSixYearOld,
      locale,
      translations,
      ...resolvedProps
    } = props;
    return (
      <KangurLessonLibraryCardResolved
        {...resolvedProps}
        isCoarsePointer={isCoarsePointer}
        isSixYearOld={isSixYearOld}
        locale={locale}
        translations={translations}
      />
    );
  }

  return <KangurLessonLibraryCardWithContext {...props} />;
}
