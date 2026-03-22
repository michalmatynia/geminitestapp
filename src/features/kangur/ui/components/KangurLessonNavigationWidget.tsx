'use client';

import { useTranslations } from 'next-intl';
import { ChevronLeft, ChevronRight } from 'lucide-react';

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
  sectionSummary?: string;
  sectionTitle?: string;
  align?: 'center' | 'start';
};

export function KangurLessonNavigationWidget({
  prevLesson: overridePrevLesson,
  nextLesson: overrideNextLesson,
  onSelectLesson,
  sectionSummary,
  sectionTitle,
  align = 'center',
}: KangurLessonNavigationWidgetProps = {}): JSX.Element | null {
  const translations = useTranslations('KangurLessonsWidgets.navigation');
  const isCoarsePointer = useKangurCoarsePointer();
  const runtime = useOptionalKangurLessonsRuntime();
  const isSubsectionNavigationActive = useKangurLessonSubsectionNavigationActive();
  const prevLesson = overridePrevLesson ?? runtime?.prevLesson ?? null;
  const nextLesson = overrideNextLesson ?? runtime?.nextLesson ?? null;
  const handleSelectLesson = onSelectLesson ?? runtime?.selectLesson;
  const panelDescription = sectionSummary;
  const panelTitle = sectionTitle;

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
          <span className='text-xs font-semibold text-slate-600 sm:hidden'>{translations('previousShort')}</span>
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
          <span className='text-xs font-semibold text-slate-600 sm:hidden'>{translations('nextShort')}</span>
          <span className='sr-only'>{nextLesson?.title ?? translations('noNextLesson')}</span>
          <ChevronRight className='h-4 w-4 flex-shrink-0' aria-hidden='true' />
        </KangurButton>
      </div>
    </nav>
  );
}
