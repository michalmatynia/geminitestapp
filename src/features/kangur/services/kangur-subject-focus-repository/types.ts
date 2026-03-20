import type { KangurLessonSubject } from '@kangur/contracts';

export type KangurSubjectFocusRepository = {
  getSubjectFocus: (learnerId: string) => Promise<KangurLessonSubject | null>;
  saveSubjectFocus: (
    learnerId: string,
    subject: KangurLessonSubject
  ) => Promise<KangurLessonSubject>;
};
