'use client';

import { useLocale, useTranslations } from 'next-intl';
import { hasKangurLessonDocumentContent } from '@/features/kangur/lesson-documents';
import {
  getLocalizedKangurLessonSectionLabel,
  getLocalizedKangurLessonSectionTypeLabel,
} from '@/features/kangur/lessons/lesson-catalog-i18n';
import { KangurLessonGroupAccordion } from '@/features/kangur/ui/components/KangurLessonGroupAccordion';
import { KangurLessonLibraryCard } from '@/features/kangur/ui/components/KangurLessonLibraryCard';
import KangurVisualCueContent from '@/features/kangur/ui/components/KangurVisualCueContent';
import {
  useKangurLessonsRuntimeActions,
  useKangurLessonsRuntimeState,
} from '@/features/kangur/ui/context/KangurLessonsRuntimeContext';
import { getLessonMasteryPresentation } from '@/features/kangur/ui/context/KangurLessonsRuntimeContext.shared';
import { useKangurAgeGroupFocus } from '@/features/kangur/ui/context/KangurAgeGroupFocusContext';
import {
  getKangurSixYearOldLessonGroupIcon,
  getKangurSixYearOldSubjectVisual,
} from '@/features/kangur/ui/constants/six-year-old-visuals';
import { useKangurCoarsePointer } from '@/features/kangur/ui/hooks/useKangurCoarsePointer';
import { useKangurPageContentEntry } from '@/features/kangur/ui/hooks/useKangurPageContent';
import { KangurEmptyState } from '@/features/kangur/ui/design/primitives';
import {
  KANGUR_PANEL_ROW_CLASSNAME,
} from '@/features/kangur/ui/design/tokens';
import { KangurSubjectGroupSection } from '@/features/kangur/ui/components/KangurSubjectGroupSection';
import { getKangurSubjectGroups } from '@/features/kangur/ui/constants/subject-groups';
import type { KangurLesson } from '@/features/kangur/shared/contracts/kangur';
import type { KangurLessonSection } from '@/shared/contracts/kangur-lesson-sections';
import { LESSONS_LIBRARY_LIST_CLASSNAME } from '@/features/kangur/ui/pages/lessons/Lessons.constants';

import { useMemo, useState, type JSX } from 'react';

type LessonSubsection = {
  id: string;
  label: string;
  typeLabel?: string;
  lessons: KangurLesson[];
};

type LessonGroup = {
  id: string;
  label: string;
  typeLabel?: string;
  lessons: KangurLesson[];
  subsections?: LessonSubsection[];
};

type LessonEntry =
  | { kind: 'group'; group: LessonGroup }
  | { kind: 'lesson'; lesson: KangurLesson };

type LessonsCatalogSubjectModel = {
  displayLessonGroups: LessonGroup[];
  lessonEntries: LessonEntry[];
  lessons: KangurLesson[];
  subjectVisual: ReturnType<typeof getKangurSixYearOldSubjectVisual>;
};

function buildLessonGroups(
  sections: KangurLessonSection[],
  lessons: KangurLesson[],
  locale: string,
): LessonGroup[] {
  if (sections.length === 0) return [];
  const lessonByComponent = new Map(lessons.map((l) => [l.componentId, l]));
  return sections
    .map((section): LessonGroup => {
      const groupLessons = section.componentIds
        .map((id) => lessonByComponent.get(id))
        .filter((l): l is KangurLesson => Boolean(l));
      const subsections = section.subsections
        .filter((sub) => sub.enabled)
        .map((sub) => ({
          id: sub.id,
          label: getLocalizedKangurLessonSectionLabel(sub.id, locale, sub.label),
          typeLabel: sub.typeLabel
            ? getLocalizedKangurLessonSectionTypeLabel(locale, sub.typeLabel)
            : undefined,
          lessons: sub.componentIds
            .map((id) => lessonByComponent.get(id))
            .filter((l): l is KangurLesson => Boolean(l)),
        }))
        .filter((sub) => sub.lessons.length > 0);
      return {
        id: section.id,
        label: getLocalizedKangurLessonSectionLabel(section.id, locale, section.label),
        typeLabel: section.typeLabel
          ? getLocalizedKangurLessonSectionTypeLabel(locale, section.typeLabel)
          : undefined,
        lessons: groupLessons,
        subsections: subsections.length > 0 ? subsections : undefined,
      };
    })
    .filter((g) => (g.subsections ? g.subsections.length > 0 : g.lessons.length > 0));
}

export function KangurLessonsCatalogWidget(): JSX.Element {
  const locale = useLocale();
  const pageTranslations = useTranslations('KangurLessonsPage');
  const widgetTranslations = useTranslations('KangurLessonsWidgets');
  const masteryTranslations = useTranslations('KangurLessonsWidgets.mastery');
  const { ageGroup } = useKangurAgeGroupFocus();
  const subjectGroups = getKangurSubjectGroups(locale);
  const { entry: emptyStateContent } = useKangurPageContentEntry('lessons-list-empty-state');
  const isCoarsePointer = useKangurCoarsePointer();
  const {
    orderedLessons,
    lessonSections,
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
  const isSixYearOld = ageGroup === 'six_year_old';

  const lessonCardStateById = useMemo(
    () =>
      new Map(
        orderedLessons.map((lesson) => {
          const lessonAssignment = lessonAssignmentsByComponent.get(lesson.componentId) ?? null;
          return [
            lesson.id,
            {
              completedLessonAssignment: !lessonAssignment
                ? (completedLessonAssignmentsByComponent.get(lesson.componentId) ?? null)
                : null,
              hasDocumentContent: hasKangurLessonDocumentContent(lessonDocuments[lesson.id]),
              lessonAssignment,
              masteryPresentation: getLessonMasteryPresentation(
                lesson,
                progress,
                masteryTranslations
              ),
            },
          ] as const;
        })
      ),
    [
      completedLessonAssignmentsByComponent,
      lessonAssignmentsByComponent,
      lessonDocuments,
      masteryTranslations,
      orderedLessons,
      progress,
    ]
  );

  const renderLessonCard = (lesson: (typeof orderedLessons)[number]) => {
    const lessonCardState = lessonCardStateById.get(lesson.id);
    if (!lessonCardState) {
      return null;
    }

    const isActive = activeLessonId === lesson.id;

    return (
      <div key={lesson.id} role='listitem' className='w-full'>
        <KangurLessonLibraryCard
          ariaCurrent={isActive ? 'page' : undefined}
          buttonClassName={`kangur-lessons-panel ${KANGUR_PANEL_ROW_CLASSNAME} items-start rounded-[26px] p-4 sm:rounded-[30px] sm:p-5`}
          completedLessonAssignment={lessonCardState.completedLessonAssignment}
          contentClassName='w-full'
          emphasis={isActive ? 'accent' : 'neutral'}
          hasDocumentContent={lessonCardState.hasDocumentContent}
          iconTestId={`lessons-catalog-icon-${lesson.id}`}
          isCoarsePointer={isCoarsePointer}
          isSixYearOld={isSixYearOld}
          itemTestId={`lessons-catalog-item-${lesson.id}`}
          lesson={lesson}
          lessonAssignment={lessonCardState.lessonAssignment}
          locale={locale}
          masteryPresentation={lessonCardState.masteryPresentation}
          onSelect={() => selectLesson(lesson.id)}
          statusGroupClassName='w-full items-start max-[420px]:flex-col sm:w-auto sm:flex-col sm:items-end'
          translations={widgetTranslations}
        />
      </div>
    );
  };

  if (orderedLessons.length === 0) {
    return (
        <KangurEmptyState
          accent='indigo'
          className='w-full'
        description={emptyStateContent?.summary ?? widgetTranslations('emptyDescription')}
          padding='xl'
        title={emptyStateContent?.title ?? pageTranslations('emptyTitle')}
        />
    );
  }

  const lessonsBySubject = useMemo(
    () =>
      new Map(
        subjectGroups.map((group) => [
          group.value,
          orderedLessons.filter((lesson) => lesson.subject === group.value),
        ])
      ),
    [orderedLessons, subjectGroups]
  );

  const subjectModels = useMemo(
    () =>
      new Map(
        subjectGroups.map((group) => {
          const groupLessons = lessonsBySubject.get(group.value) ?? [];
          const subjectSections = lessonSections.filter((section) => section.subject === group.value);
          const displayLessonGroups = buildLessonGroups(subjectSections, groupLessons, locale);
          const lessonGroupById = new Map(displayLessonGroups.map((lessonGroup) => [
            lessonGroup.id,
            lessonGroup,
          ]));
          const lessonGroupIdByComponent = new Map<string, string>();

          displayLessonGroups.forEach((lessonGroup) => {
            const groupedLessons = lessonGroup.subsections
              ? lessonGroup.subsections.flatMap((subsection) => subsection.lessons)
              : lessonGroup.lessons;
            groupedLessons.forEach((lesson) => {
              lessonGroupIdByComponent.set(lesson.componentId, lessonGroup.id);
            });
          });

          const lessonEntries: LessonEntry[] = [];
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

          return [
            group.value,
            {
              displayLessonGroups,
              lessonEntries,
              lessons: groupLessons,
              subjectVisual: getKangurSixYearOldSubjectVisual(group.value),
            } satisfies LessonsCatalogSubjectModel,
          ] as const;
        })
      ),
    [lessonSections, lessonsBySubject, locale, subjectGroups]
  );

  return (
    <div className={LESSONS_LIBRARY_LIST_CLASSNAME} aria-label='Lista lekcji'>
      {subjectGroups.map((group) => {
        const subjectModel = subjectModels.get(group.value);
        if (!subjectModel || subjectModel.lessons.length === 0) {
          return null;
        }

        return (
          <KangurSubjectGroupSection
            key={group.value}
            ariaLabel={`${group.label} lessons`}
            label={
              isSixYearOld ? (
                <span
                  className='inline-flex items-center gap-2'
                  data-testid={`lessons-catalog-subject-label-${group.value}`}
                >
                  <span
                    aria-hidden='true'
                    className='text-lg leading-none'
                    data-testid={`lessons-catalog-subject-icon-${group.value}`}
                  >
                    {subjectModel.subjectVisual.icon}
                  </span>
                  <span>{group.label}</span>
                </span>
              ) : (
                group.label
              )
            }
          >
            <div className={LESSONS_LIBRARY_LIST_CLASSNAME} role='list'>
              {subjectModel.lessonEntries.map((entry) => {
                if (entry.kind === 'group') {
                  const groupKey = `${group.value}:${entry.group.id}`;
                  const isExpanded = expandedLessonGroupId === groupKey;
                  const groupHasSubsections = Boolean(entry.group.subsections?.length);

                  return (
                    <div key={groupKey} role='listitem' className='w-full'>
                      <KangurLessonGroupAccordion
                        accordionId={groupKey}
                        fallbackTypeLabel={
                          isSixYearOld ? (
                            <KangurVisualCueContent
                              icon={getKangurSixYearOldLessonGroupIcon(groupHasSubsections)}
                              iconClassName='text-base'
                              iconTestId={`lessons-catalog-group-type-icon-${groupKey}`}
                              label={pageTranslations('groupTypeLabel')}
                            />
                          ) : (
                            pageTranslations('groupTypeLabel')
                          )
                        }
                        isExpanded={isExpanded}
                        isCoarsePointer={isCoarsePointer}
                        label={
                          isSixYearOld ? (
                            <span
                              className='inline-flex items-center gap-2'
                              data-testid={`lessons-catalog-group-label-${groupKey}`}
                            >
                              <span
                                aria-hidden='true'
                                className='text-lg leading-none'
                                data-testid={`lessons-catalog-group-icon-${groupKey}`}
                              >
                                {getKangurSixYearOldLessonGroupIcon(groupHasSubsections)}
                              </span>
                              <span>{entry.group.label}</span>
                            </span>
                          ) : (
                            entry.group.label
                          )
                        }
                        onToggle={() => setExpandedLessonGroupId(isExpanded ? null : groupKey)}
                        typeLabel={
                          entry.group.typeLabel
                            ? isSixYearOld
                              ? (
                                  <KangurVisualCueContent
                                    detail={subjectModel.subjectVisual.detail}
                                    detailClassName='text-sm'
                                    detailTestId={`lessons-catalog-group-type-detail-${groupKey}`}
                                    icon={subjectModel.subjectVisual.icon}
                                    iconClassName='text-base'
                                    iconTestId={`lessons-catalog-group-type-icon-${groupKey}`}
                                    label={entry.group.typeLabel}
                                  />
                                )
                              : entry.group.typeLabel
                            : undefined
                        }
                        contentProps={{ role: 'list' }}
                      >
                        {groupHasSubsections ? (
                          entry.group.subsections?.map((subsection) => (
                            <div
                              key={subsection.id}
                              className={LESSONS_LIBRARY_LIST_CLASSNAME}
                              role='listitem'
                            >
                              <div className={LESSONS_LIBRARY_LIST_CLASSNAME} role='list'>
                                {subsection.lessons.map((lesson) => renderLessonCard(lesson))}
                              </div>
                            </div>
                          ))
                        ) : (
                          entry.group.lessons.map((lesson) => renderLessonCard(lesson))
                        )}
                      </KangurLessonGroupAccordion>
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
