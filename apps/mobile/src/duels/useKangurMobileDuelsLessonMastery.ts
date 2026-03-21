import {
  useKangurMobileHomeLessonMastery,
  type KangurMobileHomeLessonMasteryItem,
} from '../home/useKangurMobileHomeLessonMastery';

export type KangurMobileDuelsLessonMasteryItem = KangurMobileHomeLessonMasteryItem;

type UseKangurMobileDuelsLessonMasteryResult = {
  masteredLessons: number;
  strongest: KangurMobileDuelsLessonMasteryItem[];
  trackedLessons: number;
  weakest: KangurMobileDuelsLessonMasteryItem[];
  lessonsNeedingPractice: number;
};

export const useKangurMobileDuelsLessonMastery =
  (): UseKangurMobileDuelsLessonMasteryResult => {
    const mastery = useKangurMobileHomeLessonMastery();

    return {
      masteredLessons: mastery.masteredLessons,
      strongest: mastery.strongest,
      trackedLessons: mastery.trackedLessons,
      weakest: mastery.weakest,
      lessonsNeedingPractice: mastery.lessonsNeedingPractice,
    };
  };
