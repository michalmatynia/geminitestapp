import { ChevronLeft, ChevronRight } from 'lucide-react';

import { useKangurLessonSubsectionNavigationActive } from '@/features/kangur/ui/context/KangurLessonNavigationContext';
import { useOptionalKangurLessonsRuntime } from '@/features/kangur/ui/context/KangurLessonsRuntimeContext';
import { KangurButton, KangurPanelIntro } from '@/features/kangur/ui/design/primitives';
import type { KangurLesson } from '@/shared/contracts/kangur';

import type { JSX } from 'react';

type KangurLessonNavigationWidgetProps = {
  prevLesson?: KangurLesson | null;
  nextLesson?: KangurLesson | null;
  onSelectLesson?: (lessonId: string) => void;
  sectionSummary?: string;
  sectionTitle?: string;
};

export function KangurLessonNavigationWidget({
  prevLesson: overridePrevLesson,
  nextLesson: overrideNextLesson,
  onSelectLesson,
  sectionSummary,
  sectionTitle,
}: KangurLessonNavigationWidgetProps = {}): JSX.Element | null {
  const runtime = useOptionalKangurLessonsRuntime();
  const isSubsectionNavigationActive = useKangurLessonSubsectionNavigationActive();
  const prevLesson = overridePrevLesson ?? runtime?.prevLesson ?? null;
  const nextLesson = overrideNextLesson ?? runtime?.nextLesson ?? null;
  const handleSelectLesson = onSelectLesson ?? runtime?.selectLesson;

  if (isSubsectionNavigationActive || !handleSelectLesson || (!prevLesson && !nextLesson)) {
    return null;
  }

  return (
    <nav
      className='mx-auto mt-2 flex w-full max-w-[44rem] flex-col gap-3'
      aria-label='Nawigacja między lekcjami'
    >
      {sectionTitle || sectionSummary ? (
        <KangurPanelIntro
          description={sectionSummary}
          title={sectionTitle}
          titleAs='h3'
          titleClassName='text-base font-bold tracking-[-0.02em]'
        />
      ) : null}
      <div className='flex w-full flex-col gap-3 sm:flex-row sm:flex-wrap sm:justify-between'>
        {prevLesson ? (
          <KangurButton
            onClick={() => handleSelectLesson(prevLesson.id)}
            className='w-full justify-between [background:color-mix(in_srgb,var(--kangur-soft-card-background)_72%,var(--kangur-page-background))] [color:var(--kangur-page-text)] hover:[background:color-mix(in_srgb,var(--kangur-soft-card-background)_82%,var(--kangur-page-background))] hover:[color:var(--kangur-page-text)] sm:max-w-[21rem] sm:flex-1 sm:basis-[19rem] sm:justify-start'
            size='lg'
            variant='surface'
            data-doc-id='lessons_prev_next'
            aria-label={`Poprzednia lekcja: ${prevLesson.title}`}
          >
            <ChevronLeft className='h-4 w-4 flex-shrink-0' aria-hidden='true' />
            <span className='min-w-0 truncate'>{prevLesson.title}</span>
          </KangurButton>
        ) : null}

        {nextLesson ? (
          <KangurButton
            onClick={() => handleSelectLesson(nextLesson.id)}
            className='w-full justify-between [background:color-mix(in_srgb,var(--kangur-soft-card-background)_72%,var(--kangur-page-background))] [color:var(--kangur-page-text)] hover:[background:color-mix(in_srgb,var(--kangur-soft-card-background)_82%,var(--kangur-page-background))] hover:[color:var(--kangur-page-text)] sm:ml-auto sm:max-w-[21rem] sm:flex-1 sm:basis-[19rem] sm:justify-end'
            size='lg'
            variant='surface'
            data-doc-id='lessons_prev_next'
            aria-label={`Następna lekcja: ${nextLesson.title}`}
          >
            <span className='min-w-0 truncate'>{nextLesson.title}</span>
            <ChevronRight className='h-4 w-4 flex-shrink-0' aria-hidden='true' />
          </KangurButton>
        ) : null}
      </div>
    </nav>
  );
}
