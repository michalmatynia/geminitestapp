import {
  useKangurMobileHomeLessonMastery,
  type KangurMobileHomeLessonMasteryItem,
} from '../home/useKangurMobileHomeLessonMastery';

export type KangurMobileDailyPlanLessonMasteryItem = KangurMobileHomeLessonMasteryItem;

type UseKangurMobileDailyPlanLessonMasteryResult = {
  masteredLessons: number;
  strongest: KangurMobileDailyPlanLessonMasteryItem[];
  trackedLessons: number;
  weakest: KangurMobileDailyPlanLessonMasteryItem[];
  lessonsNeedingPractice: number;
};

export const useKangurMobileDailyPlanLessonMastery =
  (): UseKangurMobileDailyPlanLessonMasteryResult => {
    const mastery = useKangurMobileHomeLessonMastery();

    return {
      masteredLessons: mastery.masteredLessons,
      strongest: mastery.strongest,
      trackedLessons: mastery.trackedLessons,
      weakest: mastery.weakest,
      lessonsNeedingPractice: mastery.lessonsNeedingPractice,
    };
  };
