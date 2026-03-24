'use client';

import { useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { ChevronLeft, ChevronRight, Printer } from 'lucide-react';

import KangurVisualCueContent from '@/features/kangur/ui/components/KangurVisualCueContent';
import { useKangurAgeGroupFocus } from '@/features/kangur/ui/context/KangurAgeGroupFocusContext';
import { useKangurLessonSubsectionNavigationActive } from '@/features/kangur/ui/context/KangurLessonNavigationContext';
import { useOptionalKangurLessonsRuntime } from '@/features/kangur/ui/context/KangurLessonsRuntimeContext';
import { KangurButton, KangurPanelIntro } from '@/features/kangur/ui/design/primitives';
import { useKangurCoarsePointer } from '@/features/kangur/ui/hooks/useKangurCoarsePointer';
import {
  LESSONS_SELECTOR_NAV_BUTTON_ROW_CLASSNAME,
  LESSONS_SELECTOR_NAV_LAYOUT_CLASSNAME,
} from '@/features/kangur/ui/pages/lessons/Lessons.constants';
import type { KangurLesson } from '@/features/kangur/shared/contracts/kangur';
import { cn } from '@/features/kangur/shared/utils';

import type { JSX } from 'react';

type KangurLessonNavigationWidgetProps = {
  prevLesson?: KangurLesson | null;
  nextLesson?: KangurLesson | null;
  onSelectLesson?: (lessonId: string) => void;
  onPrintLesson?: () => void;
  sectionSummary?: string;
  sectionTitle?: string;
  align?: 'center' | 'start';
};

export function KangurLessonNavigationWidget({
  prevLesson: overridePrevLesson,
  nextLesson: overrideNextLesson,
  onSelectLesson,
  onPrintLesson,
  sectionSummary,
  sectionTitle,
  align = 'center',
}: KangurLessonNavigationWidgetProps = {}): JSX.Element | null {
  const translations = useTranslations('KangurLessonsWidgets.navigation');
  const isCoarsePointer = useKangurCoarsePointer();
  const runtime = useOptionalKangurLessonsRuntime();
  const isSubsectionNavigationActive = useKangurLessonSubsectionNavigationActive();
  const { ageGroup } = useKangurAgeGroupFocus();
  const prevLesson = overridePrevLesson ?? runtime?.prevLesson ?? null;
  const nextLesson = overrideNextLesson ?? runtime?.nextLesson ?? null;
  const handleSelectLesson = onSelectLesson ?? runtime?.selectLesson;
  const handlePrintLesson = useCallback(() => {
    onPrintLesson?.();
  }, [onPrintLesson]);
  const panelDescription = sectionSummary;
  const panelTitle = sectionTitle;
  const isSixYearOld = ageGroup === 'six_year_old';

  if (isSubsectionNavigationActive || !handleSelectLesson) {
    return null;
  }

  const navClassName = cn(
    LESSONS_SELECTOR_NAV_LAYOUT_CLASSNAME,
    align === 'start' ? 'kangur-lesson-nav-inline' : null
  );
  const buttonGroupClassName = cn(
    LESSONS_SELECTOR_NAV_BUTTON_ROW_CLASSNAME,
    align === 'start'
      ? 'justify-start sm:w-full sm:self-auto'
      : null
  );

  return (
    <nav
      className={navClassName}
      aria-label={translations('ariaLabel')}
    >
      {sectionTitle || sectionSummary ? (
        <KangurPanelIntro
          description={panelDescription}
          title={panelTitle}
          titleAs='h3'
          titleClassName='text-base font-bold tracking-[-0.02em]'
        />
      ) : null}
      <div
        className={buttonGroupClassName}
        role='group'
        aria-label={translations('ariaLabel')}
      >
        <KangurButton
          onClick={prevLesson ? () => handleSelectLesson(prevLesson.id) : undefined}
          disabled={!prevLesson}
          className={cn(
            'flex-1 justify-center px-4 shadow-sm [border-color:var(--kangur-soft-card-border)] disabled:opacity-35 sm:flex-none',
            isCoarsePointer ? 'min-h-11 touch-manipulation select-none active:scale-[0.97]' : null
          )}
          size='sm'
          variant='surface'
          data-doc-id='lessons_prev_next'
          aria-label={
            prevLesson
              ? translations('previousLesson', { title: prevLesson.title })
              : translations('noPreviousLesson')
          }
          title={
            prevLesson
              ? translations('previousLesson', { title: prevLesson.title })
              : translations('noPreviousLesson')
          }
        >
          <ChevronLeft className='h-4 w-4 flex-shrink-0' aria-hidden='true' />
          {isSixYearOld ? (
            <KangurVisualCueContent
              icon='🔙'
              iconClassName='text-base'
              iconTestId='kangur-lesson-nav-prev-icon'
              label={translations('previousShort')}
            />
          ) : (
            <span className='text-xs font-semibold text-slate-600 sm:hidden'>
              {translations('previousShort')}
            </span>
          )}
          <span className='sr-only'>{prevLesson?.title ?? translations('noPreviousLesson')}</span>
        </KangurButton>

        <KangurButton
          onClick={nextLesson ? () => handleSelectLesson(nextLesson.id) : undefined}
          disabled={!nextLesson}
          className={cn(
            'flex-1 justify-center px-4 shadow-sm [border-color:var(--kangur-soft-card-border)] disabled:opacity-35 sm:flex-none',
            isCoarsePointer ? 'min-h-11 touch-manipulation select-none active:scale-[0.97]' : null
          )}
          size='sm'
          variant='surface'
          data-doc-id='lessons_prev_next'
          aria-label={
            nextLesson
              ? translations('nextLesson', { title: nextLesson.title })
              : translations('noNextLesson')
          }
          title={
            nextLesson
              ? translations('nextLesson', { title: nextLesson.title })
              : translations('noNextLesson')
          }
        >
          {isSixYearOld ? (
            <KangurVisualCueContent
              icon='🔜'
              iconClassName='text-base'
              iconTestId='kangur-lesson-nav-next-icon'
              label={translations('nextShort')}
            />
          ) : (
            <span className='text-xs font-semibold text-slate-600 sm:hidden'>
              {translations('nextShort')}
            </span>
          )}
          <span className='sr-only'>{nextLesson?.title ?? translations('noNextLesson')}</span>
          <ChevronRight className='h-4 w-4 flex-shrink-0' aria-hidden='true' />
        </KangurButton>

        {onPrintLesson ? (
          <KangurButton
            onClick={handlePrintLesson}
            className={cn(
              'flex-1 justify-center px-4 shadow-sm [border-color:var(--kangur-soft-card-border)] sm:flex-none',
              isCoarsePointer ? 'min-h-11 touch-manipulation select-none active:scale-[0.97]' : null
            )}
            size='sm'
            variant='surface'
            data-testid='kangur-lesson-nav-print-button'
            aria-label={translations('printLesson')}
            title={translations('printLesson')}
          >
            {isSixYearOld ? (
              <KangurVisualCueContent
                icon='🖨️'
                iconClassName='text-base'
                iconTestId='kangur-lesson-nav-print-icon'
                label={translations('printShort')}
              />
            ) : (
              <>
                <Printer className='h-4 w-4 flex-shrink-0' aria-hidden='true' />
                <span className='text-xs font-semibold text-slate-600'>
                  {translations('printShort')}
                </span>
              </>
            )}
          </KangurButton>
        ) : null}
      </div>
    </nav>
  );
}
