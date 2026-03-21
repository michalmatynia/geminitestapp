import {
  useKangurMobileHomeLessonMastery,
  type KangurMobileHomeLessonMasteryItem,
} from '../home/useKangurMobileHomeLessonMastery';

export type KangurMobilePracticeLessonMasteryItem = KangurMobileHomeLessonMasteryItem;

type UseKangurMobilePracticeLessonMasteryResult = {
  masteredLessons: number;
  strongest: KangurMobilePracticeLessonMasteryItem[];
  trackedLessons: number;
  weakest: KangurMobilePracticeLessonMasteryItem[];
  lessonsNeedingPractice: number;
};

export const useKangurMobilePracticeLessonMastery =
  (): UseKangurMobilePracticeLessonMasteryResult => {
    const mastery = useKangurMobileHomeLessonMastery();

    return {
      masteredLessons: mastery.masteredLessons,
      strongest: mastery.strongest,
      trackedLessons: mastery.trackedLessons,
      weakest: mastery.weakest,
      lessonsNeedingPractice: mastery.lessonsNeedingPractice,
    };
  };
