import type { KangurLessonComponentId, KangurLessonSubject } from '@/features/kangur/shared/contracts/kangur';
import type { KangurSubjectDefinition, KangurLessonTemplate } from '@/features/kangur/lessons/lesson-types';
import { ENGLISH_LESSON_COMPONENT_ORDER, ENGLISH_LESSON_TEMPLATES } from './subjects/english/catalog';
import { MATHS_LESSON_COMPONENT_ORDER, MATHS_LESSON_TEMPLATES } from './subjects/maths/catalog';

export const KANGUR_SUBJECTS: readonly KangurSubjectDefinition[] = [
  {
    id: 'maths',
    label: 'Matematyka',
    shortLabel: 'Matematyka',
    sortOrder: 1,
    default: true,
  },
  {
    id: 'english',
    label: 'Angielski',
    shortLabel: 'Angielski',
    sortOrder: 2,
  },
] as const;

const subjectLabelMap = new Map<KangurLessonSubject, string>(
  KANGUR_SUBJECTS.map((subject) => [subject.id, subject.label])
);

export const getKangurSubjectLabel = (subject: KangurLessonSubject): string =>
  subjectLabelMap.get(subject) ?? subject;

export const KANGUR_LESSON_COMPONENT_ORDER = [
  ...MATHS_LESSON_COMPONENT_ORDER,
  ...ENGLISH_LESSON_COMPONENT_ORDER,
] as const satisfies readonly KangurLessonComponentId[];

export const KANGUR_LESSON_LIBRARY: Record<KangurLessonComponentId, KangurLessonTemplate> = {
  ...MATHS_LESSON_TEMPLATES,
  ...ENGLISH_LESSON_TEMPLATES,
};
