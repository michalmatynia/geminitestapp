import { hasKangurLessonDocumentContent } from '@/features/kangur/lesson-documents';
import { KangurLessonLibraryCard } from '@/features/kangur/ui/components/KangurLessonLibraryCard';
import {
  useKangurLessonsRuntimeActions,
  useKangurLessonsRuntimeState,
} from '@/features/kangur/ui/context/KangurLessonsRuntimeContext';
import { getLessonMasteryPresentation } from '@/features/kangur/ui/context/KangurLessonsRuntimeContext.shared';
import { useKangurPageContentEntry } from '@/features/kangur/ui/hooks/useKangurPageContent';
import { KangurEmptyState } from '@/features/kangur/ui/design/primitives';
import { KANGUR_LESSON_PANEL_GAP_CLASSNAME } from '@/features/kangur/ui/design/tokens';
import { KangurSubjectGroupSection } from '@/features/kangur/ui/components/KangurSubjectGroupSection';
import { KANGUR_SUBJECT_GROUPS } from '@/features/kangur/ui/constants/subject-groups';

import type { JSX } from 'react';

export function KangurLessonsCatalogWidget(): JSX.Element {
  const { entry: emptyStateContent } = useKangurPageContentEntry('lessons-list-empty-state');
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
        description={
          emptyStateContent?.summary ?? 'Włącz lekcje w panelu admina, aby pojawiły się tutaj.'
        }
        padding='xl'
        title={emptyStateContent?.title ?? 'Brak aktywnych lekcji'}
      />
    );
  }

  const lessonsBySubject = new Map(
    KANGUR_SUBJECT_GROUPS.map((group) => [
      group.value,
      orderedLessons.filter((lesson) => lesson.subject === group.value),
    ])
  );

  return (
    <div className={`flex flex-col ${KANGUR_LESSON_PANEL_GAP_CLASSNAME}`} aria-label='Lista lekcji'>
      {KANGUR_SUBJECT_GROUPS.map((group) => {
        const groupLessons = lessonsBySubject.get(group.value) ?? [];
        if (groupLessons.length === 0) {
          return null;
        }

        return (
          <KangurSubjectGroupSection
            key={group.value}
            ariaLabel={`${group.label} lessons`}
            label={group.label}
          >
            <div className={`flex flex-col ${KANGUR_LESSON_PANEL_GAP_CLASSNAME}`} role='list'>
              {groupLessons.map((lesson) => {
                const masteryPresentation = getLessonMasteryPresentation(lesson, progress);
                const lessonAssignment = lessonAssignmentsByComponent.get(lesson.componentId) ?? null;
                const completedLessonAssignment = !lessonAssignment
                  ? completedLessonAssignmentsByComponent.get(lesson.componentId) ?? null
                  : null;
                const isActive = activeLessonId === lesson.id;

                return (
                  <div key={lesson.id} role='listitem' className='w-full'>
                    <KangurLessonLibraryCard
                      ariaCurrent={isActive ? 'page' : undefined}
                      buttonClassName='kangur-lessons-panel flex flex-col items-start kangur-panel-gap rounded-[30px] p-5 max-sm:pr-5 max-sm:pb-5 sm:flex-row'
                      completedLessonAssignment={completedLessonAssignment}
                      contentClassName='w-full'
                      emphasis={isActive ? 'accent' : 'neutral'}
                      hasDocumentContent={hasKangurLessonDocumentContent(lessonDocuments[lesson.id])}
                      iconTestId={`lessons-catalog-icon-${lesson.id}`}
                      itemTestId={`lessons-catalog-item-${lesson.id}`}
                      lesson={lesson}
                      lessonAssignment={lessonAssignment}
                      masteryPresentation={masteryPresentation}
                      onSelect={() => selectLesson(lesson.id)}
                      statusGroupClassName='w-full items-start max-[360px]:flex-col sm:w-auto sm:flex-col sm:items-end'
                    />
                  </div>
                );
              })}
            </div>
          </KangurSubjectGroupSection>
        );
      })}
    </div>
  );
}
