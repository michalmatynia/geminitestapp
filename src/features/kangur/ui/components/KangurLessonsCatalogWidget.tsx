'use client';

import type { JSX } from 'react';

import { hasKangurLessonDocumentContent } from '@/features/kangur/lesson-documents';
import {
  KangurEmptyState,
  KangurGradientIconTile,
  KangurOptionCardButton,
  KangurStatusChip,
} from '@/features/kangur/ui/design/primitives';
import { getLessonMasteryPresentation } from '@/features/kangur/ui/context/KangurLessonsRuntimeContext.shared';
import {
  useKangurLessonsRuntimeActions,
  useKangurLessonsRuntimeState,
} from '@/features/kangur/ui/context/KangurLessonsRuntimeContext';

export function KangurLessonsCatalogWidget(): JSX.Element {
  const {
    orderedLessons,
    lessonDocuments,
    progress,
    activeLessonId,
    lessonAssignmentsByComponent,
    completedLessonAssignmentsByComponent,
  } = useKangurLessonsRuntimeState();
  const {
    selectLesson,
  } = useKangurLessonsRuntimeActions();

  if (orderedLessons.length === 0) {
    return (
      <KangurEmptyState
        accent='indigo'
        className='w-full'
        description='Wlacz lekcje w panelu admina, aby pojawily sie tutaj.'
        padding='xl'
        title='Brak aktywnych lekcji'
      />
    );
  }

  return (
    <div className='flex flex-col gap-4'>
      {orderedLessons.map((lesson) => {
        const masteryPresentation = getLessonMasteryPresentation(lesson, progress);
        const lessonAssignment = lessonAssignmentsByComponent.get(lesson.componentId) ?? null;
        const completedLessonAssignment = !lessonAssignment
          ? completedLessonAssignmentsByComponent.get(lesson.componentId) ?? null
          : null;
        const isActive = activeLessonId === lesson.id;

        return (
          <KangurOptionCardButton
            accent='indigo'
            key={lesson.id}
            className='flex w-full items-start gap-4 rounded-[30px] p-5 text-left'
            data-testid={`lessons-catalog-item-${lesson.id}`}
            emphasis={isActive ? 'accent' : 'neutral'}
            onClick={() => selectLesson(lesson.id)}
            type='button'
          >
            <KangurGradientIconTile
              data-testid={`lessons-catalog-icon-${lesson.id}`}
              gradientClass={lesson.color}
              size='lg'
            >
              {lesson.emoji}
            </KangurGradientIconTile>
            <div className='flex-1'>
              <div className='flex items-start justify-between gap-3'>
                <div>
                  <div className='text-xl font-extrabold text-slate-800'>{lesson.title}</div>
                  <div className='mt-0.5 text-sm text-slate-500'>{lesson.description}</div>
                  {lesson.contentMode === 'document' &&
                  hasKangurLessonDocumentContent(lessonDocuments[lesson.id]) ? (
                      <KangurStatusChip
                        accent='sky'
                        className='mt-2 uppercase tracking-[0.14em]'
                        size='sm'
                      >
                        Wlasna zawartosc
                      </KangurStatusChip>
                    ) : null}
                  {lessonAssignment ? (
                    <KangurStatusChip
                      accent='rose'
                      className='mt-2 uppercase tracking-[0.14em]'
                      size='sm'
                    >
                      Priorytet rodzica
                    </KangurStatusChip>
                  ) : completedLessonAssignment ? (
                    <KangurStatusChip
                      accent='emerald'
                      className='mt-2 uppercase tracking-[0.14em]'
                      size='sm'
                    >
                      Ukonczone dla rodzica
                    </KangurStatusChip>
                  ) : null}
                </div>
                <div className='flex flex-col items-end gap-2'>
                  <KangurStatusChip
                    accent={masteryPresentation.badgeAccent}
                    className='whitespace-nowrap uppercase tracking-[0.14em]'
                    size='sm'
                  >
                    {masteryPresentation.statusLabel}
                  </KangurStatusChip>
                  {lessonAssignment ? (
                    <KangurStatusChip
                      accent='rose'
                      className='whitespace-nowrap uppercase tracking-[0.14em]'
                      size='sm'
                    >
                      {lessonAssignment.priority === 'high'
                        ? 'Priorytet wysoki'
                        : lessonAssignment.priority === 'medium'
                          ? 'Priorytet sredni'
                          : 'Priorytet niski'}
                    </KangurStatusChip>
                  ) : completedLessonAssignment ? (
                    <KangurStatusChip
                      accent='emerald'
                      className='whitespace-nowrap uppercase tracking-[0.14em]'
                      size='sm'
                    >
                      Zadanie zamkniete
                    </KangurStatusChip>
                  ) : null}
                </div>
              </div>
              <div className='mt-3 text-xs font-medium text-slate-500'>
                {masteryPresentation.summaryLabel}
              </div>
              {lessonAssignment ? (
                <div className='mt-2 text-xs font-semibold text-rose-600'>
                  {lessonAssignment.description}
                </div>
              ) : completedLessonAssignment ? (
                <div className='mt-2 text-xs font-semibold text-emerald-600'>
                  Zadanie od rodzica zostalo juz wykonane.{' '}
                  {completedLessonAssignment.progress.summary}
                </div>
              ) : null}
            </div>
          </KangurOptionCardButton>
        );
      })}
    </div>
  );
}
