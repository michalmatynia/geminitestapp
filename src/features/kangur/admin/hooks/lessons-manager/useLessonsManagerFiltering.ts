import { useMemo, useState } from 'react';
import type { KangurLesson, KangurLessonAgeGroup } from '@/features/kangur/shared/contracts/kangur';
import type { KangurLessonAuthoringFilter } from '../../types';
import { matchesKangurLessonAuthoringFilter, getKangurLessonAuthoringFilterCounts } from '../../content-creator-insights';
import { KANGUR_AGE_GROUPS } from '@/features/kangur/lessons/lesson-catalog-metadata';

export function useLessonsManagerFiltering(lessons: KangurLesson[], lessonDocuments: Record<string, any>) {
  const [authoringFilter, setAuthoringFilter] = useState<KangurLessonAuthoringFilter>('all');
  const [ageGroupFilter, setAgeGroupFilter] = useState<'all' | KangurLessonAgeGroup>('all');

  const authoringFilteredLessons = useMemo(
    () => lessons.filter((lesson) => matchesKangurLessonAuthoringFilter(authoringFilter, lesson, lessonDocuments)),
    [authoringFilter, lessonDocuments, lessons]
  );

  const filteredLessons = useMemo(
    () => authoringFilteredLessons.filter((lesson) => ageGroupFilter === 'all' ? true : lesson.ageGroup === ageGroupFilter),
    [ageGroupFilter, authoringFilteredLessons]
  );

  const authoringFilterCounts = useMemo(() => getKangurLessonAuthoringFilterCounts(lessons, lessonDocuments), [lessonDocuments, lessons]);

  const ageGroupCounts = useMemo(
    () => new Map(KANGUR_AGE_GROUPS.map((group) => [group.id, authoringFilteredLessons.filter((lesson) => lesson.ageGroup === group.id).length])),
    [authoringFilteredLessons]
  );

  const activeAgeGroupLabel = ageGroupFilter === 'all' ? 'All ages' : KANGUR_AGE_GROUPS.find((group) => group.id === ageGroupFilter)?.label ?? ageGroupFilter;

  return {
    authoringFilter, setAuthoringFilter,
    ageGroupFilter, setAgeGroupFilter,
    authoringFilteredLessons,
    filteredLessons,
    authoringFilterCounts,
    ageGroupCounts,
    activeAgeGroupLabel
  };
}
