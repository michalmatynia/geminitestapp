import {
  useKangurMobileHomeLessonMastery,
  type KangurMobileHomeLessonMasteryItem,
} from '../home/useKangurMobileHomeLessonMastery';

export type KangurMobileResultsLessonMasteryItem = KangurMobileHomeLessonMasteryItem;

type UseKangurMobileResultsLessonMasteryResult = {
  masteredLessons: number;
  strongest: KangurMobileResultsLessonMasteryItem[];
  trackedLessons: number;
  weakest: KangurMobileResultsLessonMasteryItem[];
  lessonsNeedingPractice: number;
};

export const useKangurMobileResultsLessonMastery =
  (): UseKangurMobileResultsLessonMasteryResult => {
    const mastery = useKangurMobileHomeLessonMastery();

    return {
      masteredLessons: mastery.masteredLessons,
      strongest: mastery.strongest,
      trackedLessons: mastery.trackedLessons,
      weakest: mastery.weakest,
      lessonsNeedingPractice: mastery.lessonsNeedingPractice,
    };
  };
