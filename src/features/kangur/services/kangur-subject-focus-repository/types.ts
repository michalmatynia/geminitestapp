import type { KangurLessonSubject } from '@kangur/contracts/kangur-lesson-constants';

export type KangurSubjectFocusRepository = {
  getSubjectFocus: (learnerId: string) => Promise<KangurLessonSubject | null>;
  saveSubjectFocus: (
    learnerId: string,
    subject: KangurLessonSubject
  ) => Promise<KangurLessonSubject>;
};
