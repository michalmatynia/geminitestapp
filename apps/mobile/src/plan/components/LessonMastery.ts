export interface LessonMastery {
  trackedLessons: number;
  masteredLessons: number;
  lessonsNeedingPractice: number;
  weakest: Array<{ title: string; lessonHref: string }>;
  strongest: Array<{ title: string; lessonHref: string }>;
}
