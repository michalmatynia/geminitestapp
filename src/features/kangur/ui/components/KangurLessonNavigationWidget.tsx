import { ChevronLeft, ChevronRight } from 'lucide-react';

import { useKangurLessonSubsectionNavigationActive } from '@/features/kangur/ui/context/KangurLessonNavigationContext';
import { useOptionalKangurLessonsRuntime } from '@/features/kangur/ui/context/KangurLessonsRuntimeContext';
import { KangurButton, KangurPanelIntro } from '@/features/kangur/ui/design/primitives';
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
    'flex w-full flex-col gap-2',
    align === 'start' ? 'kangur-lesson-nav-inline' : null
  );
  const buttonGroupClassName = cn(
    'flex w-full items-center gap-2',
    align === 'start'
      ? 'justify-start'
      : 'justify-center sm:w-fit sm:self-center'
  );

  return (
    <nav
      className={navClassName}
      aria-label='Nawigacja między lekcjami'
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
        aria-label='Nawigacja między lekcjami'
      >
        <KangurButton
          onClick={prevLesson ? () => handleSelectLesson(prevLesson.id) : undefined}
          disabled={!prevLesson}
          className='flex-1 justify-center px-4 shadow-sm [border-color:var(--kangur-soft-card-border)] disabled:opacity-35 sm:flex-none'
          size='sm'
          variant='surface'
          data-doc-id='lessons_prev_next'
          aria-label={
            prevLesson ? `Poprzednia lekcja: ${prevLesson.title}` : 'Brak poprzedniej lekcji'
          }
          title={prevLesson ? `Poprzednia lekcja: ${prevLesson.title}` : 'Brak poprzedniej lekcji'}
        >
          <ChevronLeft className='h-4 w-4 flex-shrink-0' aria-hidden='true' />
          <span className='sr-only'>{prevLesson?.title ?? 'Brak poprzedniej lekcji'}</span>
        </KangurButton>

        <KangurButton
          onClick={nextLesson ? () => handleSelectLesson(nextLesson.id) : undefined}
          disabled={!nextLesson}
          className='flex-1 justify-center px-4 shadow-sm [border-color:var(--kangur-soft-card-border)] disabled:opacity-35 sm:flex-none'
          size='sm'
          variant='surface'
          data-doc-id='lessons_prev_next'
          aria-label={
            nextLesson ? `Następna lekcja: ${nextLesson.title}` : 'Brak następnej lekcji'
          }
          title={nextLesson ? `Następna lekcja: ${nextLesson.title}` : 'Brak następnej lekcji'}
        >
          <span className='sr-only'>{nextLesson?.title ?? 'Brak następnej lekcji'}</span>
          <ChevronRight className='h-4 w-4 flex-shrink-0' aria-hidden='true' />
        </KangurButton>
      </div>
    </nav>
  );
}
