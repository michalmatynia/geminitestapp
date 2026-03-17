import type { KangurLessonSubject } from '@/features/kangur/shared/contracts/kangur';
import { KANGUR_SUBJECTS } from '@/features/kangur/lessons/lesson-catalog';

export type KangurSubjectGroup = {
  value: KangurLessonSubject;
  label: string;
};

export const KANGUR_SUBJECT_GROUPS: readonly KangurSubjectGroup[] = KANGUR_SUBJECTS.map(
  (subject) => ({
    value: subject.id,
    label: subject.label,
  })
);
