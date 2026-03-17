import type {
  KangurLessonAgeGroup,
  KangurLessonComponentId,
  KangurLessonSubject,
} from '@/features/kangur/shared/contracts/kangur';
import type {
  KangurAgeGroupDefinition,
  KangurSubjectDefinition,
  KangurLessonTemplate,
} from '@/features/kangur/lessons/lesson-types';
import {
  ALPHABET_LESSON_COMPONENT_ORDER,
  ALPHABET_LESSON_TEMPLATES,
} from './subjects/alphabet/catalog';
import { ENGLISH_LESSON_COMPONENT_ORDER, ENGLISH_LESSON_TEMPLATES } from './subjects/english/catalog';
import { MATHS_LESSON_COMPONENT_ORDER, MATHS_LESSON_TEMPLATES } from './subjects/maths/catalog';
import {
  WEB_DEVELOPMENT_LESSON_COMPONENT_ORDER,
  WEB_DEVELOPMENT_LESSON_TEMPLATES,
} from './subjects/web-development/catalog';

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
    id: 'maths',
    label: 'Matematyka',
    shortLabel: 'Matematyka',
    sortOrder: 2,
    ageGroups: ['ten_year_old'],
  },
  {
    id: 'english',
    label: 'Angielski',
    shortLabel: 'Angielski',
    sortOrder: 3,
    ageGroups: ['ten_year_old'],
  },
  {
    id: 'web_development',
    label: 'Web Development',
    shortLabel: 'Web Dev',
    sortOrder: 4,
    ageGroups: ['grown_ups'],
  },
] as const;

export const KANGUR_AGE_GROUPS: readonly KangurAgeGroupDefinition[] = [
  {
    id: 'six_year_old',
    label: '6 lat',
    shortLabel: '6 lat',
    sortOrder: 1,
    default: true,
  },
  {
    id: 'ten_year_old',
    label: '10 lat',
    shortLabel: '10 lat',
    sortOrder: 2,
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
  grown_ups: 'web_development',
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

export const KANGUR_LESSON_COMPONENT_ORDER = [
  ...ALPHABET_LESSON_COMPONENT_ORDER,
  ...MATHS_LESSON_COMPONENT_ORDER,
  ...ENGLISH_LESSON_COMPONENT_ORDER,
  ...WEB_DEVELOPMENT_LESSON_COMPONENT_ORDER,
] as const satisfies readonly KangurLessonComponentId[];

export const KANGUR_LESSON_LIBRARY: Record<KangurLessonComponentId, KangurLessonTemplate> = {
  ...ALPHABET_LESSON_TEMPLATES,
  ...MATHS_LESSON_TEMPLATES,
  ...ENGLISH_LESSON_TEMPLATES,
  ...WEB_DEVELOPMENT_LESSON_TEMPLATES,
};

const buildSubjectAgeGroupMap = (): Map<KangurLessonSubject, readonly KangurLessonAgeGroup[]> => {
  const map = new Map<KangurLessonSubject, Set<KangurLessonAgeGroup>>();

  Object.values(KANGUR_LESSON_LIBRARY).forEach((lesson) => {
    if (!lesson) return;
    const ageGroup = lesson.ageGroup ?? DEFAULT_KANGUR_AGE_GROUP;
    const existing = map.get(lesson.subject);
    if (existing) {
      existing.add(ageGroup);
    } else {
      map.set(lesson.subject, new Set([ageGroup]));
    }
  });

  KANGUR_SUBJECTS.forEach((subject) => {
    if (subject.ageGroups && subject.ageGroups.length > 0) {
      map.set(subject.id, new Set(subject.ageGroups));
      return;
    }
    if (!map.has(subject.id)) {
      map.set(subject.id, new Set([DEFAULT_KANGUR_AGE_GROUP]));
    }
  });

  return new Map(
    Array.from(map.entries(), ([subject, groups]) => [subject, Array.from(groups)] as const)
  );
};

const SUBJECT_AGE_GROUPS = buildSubjectAgeGroupMap();
