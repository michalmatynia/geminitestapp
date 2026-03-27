import type { KangurLessonSubject } from '@/features/kangur/shared/contracts/kangur';
import type { LabeledOptionDto } from '@/shared/contracts/base';
import { KANGUR_SUBJECTS } from '@/features/kangur/lessons/lesson-catalog-metadata';
import { getLocalizedKangurSubjectLabel } from '@/features/kangur/lessons/lesson-catalog-i18n';

export type KangurSubjectGroup = LabeledOptionDto<KangurLessonSubject>;

export const getKangurSubjectGroups = (
  locale?: string | null
): readonly KangurSubjectGroup[] =>
  KANGUR_SUBJECTS.map((subject) => ({
    value: subject.id,
    label: getLocalizedKangurSubjectLabel(subject.id, locale, subject.label),
  }));

export const KANGUR_SUBJECT_GROUPS: readonly KangurSubjectGroup[] = getKangurSubjectGroups('pl');
