'use client';

import { useLocale, useTranslations } from 'next-intl';
import { createContext, useContext, type RefObject } from 'react';

import {
  getLocalizedKangurLessonDescription,
  getLocalizedKangurLessonTitle,
} from '@/features/kangur/lessons/lesson-catalog-i18n';
import type { KangurAssignmentSnapshot } from '@kangur/platform';
import { KangurLessonNarrator } from '@/features/kangur/ui/components/KangurLessonNarrator';
import {
  KangurButton,
  KangurGlassPanel,
  KangurGradientIconTile,
  KangurHeadline,
  KangurPanelRow,
  KangurStatusChip,
} from '@/features/kangur/ui/design/primitives';
import type { KangurLesson, KangurLessonDocument } from '@/features/kangur/shared/contracts/kangur';

type KangurActiveLessonHeaderProps = {
  lesson: KangurLesson;
  lessonDocument: KangurLessonDocument | null;
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
  lessonDocument: KangurLessonDocument | null;
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
};

const KangurActiveLessonHeaderContext = createContext<KangurActiveLessonHeaderContextValue | null>(null);

const useKangurActiveLessonHeaderContext = (): KangurActiveLessonHeaderContextValue => {
  const value = useContext(KangurActiveLessonHeaderContext);
  if (!value) {
    throw new Error('KangurActiveLessonHeader context is unavailable.');
  }
  return value;
};

const resolveHeaderCopy = (value: string | null | undefined): string | null => {
  const normalized = value?.trim();
  return normalized && normalized.length > 0 ? normalized : null;
};

function KangurActiveLessonHeaderActions(): React.JSX.Element {
  const translations = useTranslations('KangurLessonsWidgets.activeHeader');
  const {
    onBack,
    backButtonLabel,
    displayDescription,
    displayTitle,
    lesson,
    lessonDocument,
    lessonContentRef,
    headerActionsTestId,
  } = useKangurActiveLessonHeaderContext();

  return (
    <KangurPanelRow
      className='w-full sm:flex-wrap sm:items-center'
      data-testid={headerActionsTestId}
    >
      {onBack ? (
        <KangurButton
          onClick={onBack}
          size='sm'
          type='button'
          variant='surface'
          className='w-full justify-center sm:w-auto sm:justify-start touch-manipulation select-none min-h-11 active:scale-[0.98]'
        >
          {backButtonLabel}
        </KangurButton>
      ) : null}
      <KangurLessonNarrator
        className='shrink-0'
        descriptionOverride={displayDescription}
        lesson={lesson}
        lessonDocument={lessonDocument}
        lessonContentRef={lessonContentRef}
        displayMode='icon'
        loadingLabel={translations('narrator.loading')}
        pauseLabel={translations('narrator.pause')}
        readLabel={translations('narrator.read')}
        resumeLabel={translations('narrator.resume')}
        showFeedback
        titleOverride={displayTitle}
      />
      <KangurActiveLessonHeaderBody />
      <KangurActiveLessonHeaderIcon />
    </KangurPanelRow>
  );
}

function KangurActiveLessonHeaderBody(): React.JSX.Element {
  const translations = useTranslations('KangurLessonsWidgets.activeHeader');
  const {
    displayTitle,
    displayDescription,
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
      {translations('parentPriority')}
    </KangurStatusChip>
  ) : completedActiveLessonAssignment ? (
    <KangurStatusChip
      accent='emerald'
      className='uppercase tracking-[0.14em]'
      data-testid={completedChipTestId}
      size='sm'
    >
      {translations('completedForParent')}
    </KangurStatusChip>
  ) : null;

  return (
    <div className='min-w-0 flex-1'>
      <KangurHeadline accent='slate' as='h2' size='md'>
        {displayTitle}
      </KangurHeadline>
      <p className='mt-1 break-words text-sm [color:var(--kangur-page-muted-text)]'>
        {displayDescription}
      </p>
      {assignmentStateChip ? (
        <div ref={assignmentRef} className='mt-3 flex max-w-xl flex-col items-start gap-1.5'>
          {assignmentSectionTitle ? (
            <div className='break-words text-[11px] font-bold uppercase tracking-[0.14em] [color:var(--kangur-page-muted-text)]'>
              {assignmentSectionTitle}
            </div>
          ) : null}
          {assignmentStateChip}
          {assignmentSectionSummary ? (
            <p className='break-words text-xs leading-relaxed [color:var(--kangur-page-muted-text)]'>
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
    <div className='order-first flex w-full shrink-0 justify-center sm:order-none sm:ml-auto sm:w-auto sm:justify-end'>
      <KangurGradientIconTile
        data-testid={iconTestId}
        gradientClass={lesson.color}
        size='lg'
        role='presentation'
        aria-hidden='true'
      >
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
  backButtonLabel,
  titleOverride,
}: KangurActiveLessonHeaderProps): React.JSX.Element {
  const locale = useLocale();
  const translations = useTranslations('KangurLessonsWidgets.activeHeader');
  const localizedLessonTitle = getLocalizedKangurLessonTitle(lesson.componentId, locale, lesson.title);
  const localizedLessonDescription = getLocalizedKangurLessonDescription(
    lesson.componentId,
    locale,
    lesson.description
  );
  const lessonHeaderTestId = headerTestId;
  const resolvedBackButtonLabel = backButtonLabel ?? translations('backToLessons');
  const displayTitle =
    resolveHeaderCopy(titleOverride) ??
    resolveHeaderCopy(localizedLessonTitle) ??
    translations('fallbackTitle');
  const displayDescription =
    resolveHeaderCopy(descriptionOverride) ??
    resolveHeaderCopy(localizedLessonDescription) ??
    '';
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
    backButtonLabel: resolvedBackButtonLabel,
    displayTitle,
    displayDescription,
  };

  return (
    <div className='w-full'>
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
