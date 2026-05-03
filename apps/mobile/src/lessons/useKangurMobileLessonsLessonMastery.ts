import {
  useKangurMobileHomeLessonMastery,
  type KangurMobileHomeLessonMasteryItem,
} from '../home/useKangurMobileHomeLessonMastery';

export type KangurMobileLessonsLessonMasteryItem = KangurMobileHomeLessonMasteryItem;

export type UseKangurMobileLessonsLessonMasteryResult = {
  masteredLessons: number;
  strongest: KangurMobileLessonsLessonMasteryItem[];
  trackedLessons: number;
  weakest: KangurMobileLessonsLessonMasteryItem[];
  lessonsNeedingPractice: number;
};

export const useKangurMobileLessonsLessonMastery =
  (): UseKangurMobileLessonsLessonMasteryResult => {
    const mastery = useKangurMobileHomeLessonMastery();

    return {
      masteredLessons: mastery.masteredLessons,
      strongest: mastery.strongest,
      trackedLessons: mastery.trackedLessons,
      weakest: mastery.weakest,
      lessonsNeedingPractice: mastery.lessonsNeedingPractice,
    };
  };
