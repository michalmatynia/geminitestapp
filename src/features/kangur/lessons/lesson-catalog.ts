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
  },
  {
    id: 'maths',
    label: 'Matematyka',
    shortLabel: 'Matematyka',
    sortOrder: 2,
  },
  {
    id: 'english',
    label: 'Angielski',
    shortLabel: 'Angielski',
    sortOrder: 3,
  },
  {
    id: 'web_development',
    label: 'Web Development',
    shortLabel: 'Web Dev',
    sortOrder: 4,
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
