'use client';

import { ChevronDown } from 'lucide-react';
import { hasKangurLessonDocumentContent } from '@/features/kangur/lesson-documents';
import { KangurLessonLibraryCard } from '@/features/kangur/ui/components/KangurLessonLibraryCard';
import {
  useKangurLessonsRuntimeActions,
  useKangurLessonsRuntimeState,
} from '@/features/kangur/ui/context/KangurLessonsRuntimeContext';
import { getLessonMasteryPresentation } from '@/features/kangur/ui/context/KangurLessonsRuntimeContext.shared';
import { useKangurPageContentEntry } from '@/features/kangur/ui/hooks/useKangurPageContent';
import { KangurEmptyState, KangurGlassPanel } from '@/features/kangur/ui/design/primitives';
import {
  KANGUR_LESSON_PANEL_GAP_CLASSNAME,
  KANGUR_PANEL_ROW_CLASSNAME,
} from '@/features/kangur/ui/design/tokens';
import { KangurSubjectGroupSection } from '@/features/kangur/ui/components/KangurSubjectGroupSection';
import { KANGUR_SUBJECT_GROUPS } from '@/features/kangur/ui/constants/subject-groups';
import { ALPHABET_LESSON_GROUPS } from '@/features/kangur/lessons/subjects/alphabet/catalog';
import { WEB_DEVELOPMENT_LESSON_GROUPS } from '@/features/kangur/lessons/subjects/web-development/catalog';
import type { KangurLessonComponentId } from '@/features/kangur/shared/contracts/kangur';

import { useState, type JSX } from 'react';

type LessonGroupDefinition = {
  id: string;
  label: string;
  typeLabel?: string;
  componentIds: readonly KangurLessonComponentId[];
};

const LESSON_GROUP_DEFINITIONS_BY_SUBJECT: Record<string, readonly LessonGroupDefinition[]> = {
  alphabet: ALPHABET_LESSON_GROUPS,
  web_development: WEB_DEVELOPMENT_LESSON_GROUPS,
};

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
  const [expandedLessonGroupId, setExpandedLessonGroupId] = useState<string | null>(null);

  const renderLessonCard = (lesson: (typeof orderedLessons)[number]) => {
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
          buttonClassName={`kangur-lessons-panel ${KANGUR_PANEL_ROW_CLASSNAME} items-start rounded-[26px] p-4 sm:rounded-[30px] sm:p-5`}
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
          statusGroupClassName='w-full items-start max-[420px]:flex-col sm:w-auto sm:flex-col sm:items-end'
        />
      </div>
    );
  };

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

        const lessonGroupDefinitions = LESSON_GROUP_DEFINITIONS_BY_SUBJECT[group.value] ?? [];
        const lessonGroups = lessonGroupDefinitions
          .map((lessonGroup) => {
            const lessonByComponent = new Map(groupLessons.map((lesson) => [lesson.componentId, lesson]));
            return {
              ...lessonGroup,
              lessons: lessonGroup.componentIds
                .map((componentId) => lessonByComponent.get(componentId))
                .filter(
                  (lesson): lesson is (typeof groupLessons)[number] => Boolean(lesson)
                ),
            };
          })
          .filter((lessonGroup) => lessonGroup.lessons.length > 0);

        const allowSingleLessonGroups = group.value === 'web_development';
        const displayLessonGroups = allowSingleLessonGroups
          ? lessonGroups
          : lessonGroups.filter((lessonGroup) => lessonGroup.lessons.length > 1);

        type LessonEntry =
          | { kind: 'group'; group: (typeof displayLessonGroups)[number] }
          | { kind: 'lesson'; lesson: (typeof groupLessons)[number] };

        const lessonEntries: LessonEntry[] = [];
        const lessonGroupById = new Map(displayLessonGroups.map((lessonGroup) => [
          lessonGroup.id,
          lessonGroup,
        ]));
        const lessonGroupIdByComponent = new Map<string, string>();

        displayLessonGroups.forEach((lessonGroup) => {
          lessonGroup.lessons.forEach((lesson) => {
            lessonGroupIdByComponent.set(lesson.componentId, lessonGroup.id);
          });
        });

        const usedGroupIds = new Set<string>();
        groupLessons.forEach((lesson) => {
          const lessonGroupId = lessonGroupIdByComponent.get(lesson.componentId);
          if (lessonGroupId) {
            if (!usedGroupIds.has(lessonGroupId)) {
              const lessonGroup = lessonGroupById.get(lessonGroupId);
              if (lessonGroup) {
                lessonEntries.push({ kind: 'group', group: lessonGroup });
              }
              usedGroupIds.add(lessonGroupId);
            }
            return;
          }
          lessonEntries.push({ kind: 'lesson', lesson });
        });

        return (
          <KangurSubjectGroupSection
            key={group.value}
            ariaLabel={`${group.label} lessons`}
            label={group.label}
          >
            <div className={`flex flex-col ${KANGUR_LESSON_PANEL_GAP_CLASSNAME}`} role='list'>
              {lessonEntries.map((entry) => {
                if (entry.kind === 'group') {
                  const groupKey = `${group.value}:${entry.group.id}`;
                  const isExpanded = expandedLessonGroupId === groupKey;

                  return (
                    <div key={groupKey} role='listitem' className='w-full'>
                      <KangurGlassPanel className='w-full' padding='lg' surface='playField'>
                        <button
                          type='button'
                          onClick={() => setExpandedLessonGroupId(isExpanded ? null : groupKey)}
                          className='flex w-full items-center justify-between gap-3 text-left'
                        >
                          <div className='min-w-0'>
                            <div className='text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500'>
                              {entry.group.typeLabel ?? 'Grupa'}
                            </div>
                            <div className='mt-1 text-lg font-semibold text-slate-900'>
                              {entry.group.label}
                            </div>
                          </div>
                          <ChevronDown
                            aria-hidden='true'
                            className={`h-5 w-5 text-slate-600 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                          />
                        </button>
                        {isExpanded && (
                          <div
                            className={`mt-4 flex w-full flex-col ${KANGUR_LESSON_PANEL_GAP_CLASSNAME}`}
                            role='list'
                          >
                            {entry.group.lessons.map((lesson) => renderLessonCard(lesson))}
                          </div>
                        )}
                      </KangurGlassPanel>
                    </div>
                  );
                }

                return renderLessonCard(entry.lesson);
              })}
            </div>
          </KangurSubjectGroupSection>
        );
      })}
    </div>
  );
}
