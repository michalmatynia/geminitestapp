import type { KangurLessonSubject } from '@/features/kangur/shared/contracts/kangur';

export type KangurSubjectGroup = {
  value: KangurLessonSubject;
  label: string;
};

export const KANGUR_SUBJECT_GROUPS: readonly KangurSubjectGroup[] = [
  { value: 'maths', label: 'Maths' },
  { value: 'english', label: 'English' },
];
