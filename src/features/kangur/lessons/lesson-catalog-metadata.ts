/**
 * Lightweight lesson catalog metadata — subjects, age groups, defaults, and
 * utility functions.  Does NOT import any per-subject template catalogs, so
 * consumers that only need metadata can avoid pulling the heavy
 * `KANGUR_LESSON_LIBRARY` into their bundle.
 */
import type {
  KangurLessonAgeGroup,
  KangurLessonSubject,
} from '@/features/kangur/shared/contracts/kangur';
import type {
  KangurAgeGroupDefinition,
  KangurSubjectDefinition,
} from '@/features/kangur/lessons/lesson-types';

export const KANGUR_SUBJECTS: readonly KangurSubjectDefinition[] = [
  {
    id: 'alphabet',
    label: 'Alphabet',
    shortLabel: 'Alphabet',
    sortOrder: 1,
    default: true,
    ageGroups: ['six_year_old'],
  },
  {
    id: 'art',
    label: 'Art',
    shortLabel: 'Art',
    sortOrder: 2,
    ageGroups: ['six_year_old'],
  },
  {
    id: 'geometry',
    label: 'Maths',
    shortLabel: 'Maths',
    sortOrder: 3,
    ageGroups: ['six_year_old'],
  },
  {
    id: 'music',
    label: 'Music',
    shortLabel: 'Music',
    sortOrder: 4,
    ageGroups: ['six_year_old'],
  },
  {
    id: 'maths',
    label: 'Matematyka',
    shortLabel: 'Matematyka',
    sortOrder: 5,
    ageGroups: ['ten_year_old'],
  },
  {
    id: 'english',
    label: 'Angielski',
    shortLabel: 'Angielski',
    sortOrder: 6,
    ageGroups: ['ten_year_old'],
  },
  {
    id: 'web_development',
    label: 'Web Development',
    shortLabel: 'Web Dev',
    sortOrder: 7,
    ageGroups: ['grown_ups'],
  },
  {
    id: 'agentic_coding',
    label: 'Agentic Coding',
    shortLabel: 'Agentic',
    sortOrder: 8,
    ageGroups: ['grown_ups'],
  },
] as const;

export const KANGUR_AGE_GROUPS: readonly KangurAgeGroupDefinition[] = [
  {
    id: 'six_year_old',
    label: '6 lat',
    shortLabel: '6 lat',
    sortOrder: 1,
  },
  {
    id: 'ten_year_old',
    label: '10 lat',
    shortLabel: '10 lat',
    sortOrder: 2,
    default: true,
  },
  {
    id: 'grown_ups',
    label: 'Dorośli',
    shortLabel: 'Dorośli',
    sortOrder: 3,
  },
] as const;

export const DEFAULT_KANGUR_AGE_GROUP: KangurLessonAgeGroup =
  KANGUR_AGE_GROUPS.find((group) => group.default)?.id ?? 'six_year_old';

export const DEFAULT_KANGUR_SUBJECT: KangurLessonSubject =
  KANGUR_SUBJECTS.find((subject) => subject.default)?.id ?? 'maths';

export const KANGUR_DEFAULT_SUBJECT_BY_AGE_GROUP: Record<
  KangurLessonAgeGroup,
  KangurLessonSubject
> = {
  six_year_old: 'alphabet',
  ten_year_old: 'maths',
  grown_ups: 'agentic_coding',
};

const subjectLabelMap = new Map<KangurLessonSubject, string>(
  KANGUR_SUBJECTS.map((subject) => [subject.id, subject.label])
);

const ageGroupLabelMap = new Map<KangurLessonAgeGroup, string>(
  KANGUR_AGE_GROUPS.map((group) => [group.id, group.label])
);

export const getKangurSubjectLabel = (subject: KangurLessonSubject): string =>
  subjectLabelMap.get(subject) ?? subject;

export const getKangurAgeGroupLabel = (ageGroup: KangurLessonAgeGroup): string =>
  ageGroupLabelMap.get(ageGroup) ?? ageGroup;

// All current subjects declare their ageGroups directly, so the map can be
// built from KANGUR_SUBJECTS alone — no need to scan the heavy lesson library.
const SUBJECT_AGE_GROUPS: Map<KangurLessonSubject, readonly KangurLessonAgeGroup[]> = new Map(
  KANGUR_SUBJECTS.map((subject) => [
    subject.id,
    subject.ageGroups && subject.ageGroups.length > 0
      ? subject.ageGroups
      : [DEFAULT_KANGUR_AGE_GROUP],
  ])
);

export const getKangurSubjectAgeGroups = (
  subject: KangurLessonSubject
): readonly KangurLessonAgeGroup[] =>
  SUBJECT_AGE_GROUPS.get(subject) ?? [DEFAULT_KANGUR_AGE_GROUP];

export const doesKangurSubjectSupportAgeGroup = (
  subject: KangurLessonSubject,
  ageGroup: KangurLessonAgeGroup
): boolean => getKangurSubjectAgeGroups(subject).includes(ageGroup);

export const getKangurSubjectsForAgeGroup = (
  ageGroup: KangurLessonAgeGroup
): readonly KangurSubjectDefinition[] =>
  KANGUR_SUBJECTS.filter((subject) => doesKangurSubjectSupportAgeGroup(subject.id, ageGroup));

export const getKangurDefaultSubjectForAgeGroup = (
  ageGroup: KangurLessonAgeGroup
): KangurLessonSubject =>
  KANGUR_DEFAULT_SUBJECT_BY_AGE_GROUP[ageGroup] ?? DEFAULT_KANGUR_SUBJECT;

export const resolveKangurSubjectForAgeGroup = (
  currentSubject: KangurLessonSubject,
  ageGroup: KangurLessonAgeGroup
): KangurLessonSubject => {
  if (doesKangurSubjectSupportAgeGroup(currentSubject, ageGroup)) {
    return currentSubject;
  }

  const fallbackSubject = getKangurDefaultSubjectForAgeGroup(ageGroup);
  if (doesKangurSubjectSupportAgeGroup(fallbackSubject, ageGroup)) {
    return fallbackSubject;
  }

  const availableSubjects = getKangurSubjectsForAgeGroup(ageGroup);
  return availableSubjects[0]?.id ?? currentSubject;
};
