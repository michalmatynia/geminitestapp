import type { KangurLessonSubject } from '@/features/kangur/shared/contracts/kangur';

export type KangurSubjectFocusRepository = {
  getSubjectFocus: (learnerId: string) => Promise<KangurLessonSubject | null>;
  saveSubjectFocus: (
    learnerId: string,
    subject: KangurLessonSubject
  ) => Promise<KangurLessonSubject>;
};
