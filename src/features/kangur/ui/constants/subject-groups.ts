import type { KangurLessonSubject } from '@/features/kangur/shared/contracts/kangur';
import type { LabeledOptionDto } from '@/shared/contracts/base';
import { KANGUR_SUBJECTS } from '@/features/kangur/lessons/lesson-catalog';

export type KangurSubjectGroup = LabeledOptionDto<KangurLessonSubject>;

export const KANGUR_SUBJECT_GROUPS: readonly KangurSubjectGroup[] = KANGUR_SUBJECTS.map(
  (subject) => ({
    value: subject.id,
    label: subject.label,
  })
);
