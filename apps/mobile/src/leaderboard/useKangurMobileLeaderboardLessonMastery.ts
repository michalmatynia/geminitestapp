import {
  useKangurMobileHomeLessonMastery,
  type KangurMobileHomeLessonMasteryItem,
} from '../home/useKangurMobileHomeLessonMastery';

export type KangurMobileLeaderboardLessonMasteryItem = KangurMobileHomeLessonMasteryItem;

type UseKangurMobileLeaderboardLessonMasteryResult = {
  masteredLessons: number;
  strongest: KangurMobileLeaderboardLessonMasteryItem[];
  trackedLessons: number;
  weakest: KangurMobileLeaderboardLessonMasteryItem[];
  lessonsNeedingPractice: number;
};

export const useKangurMobileLeaderboardLessonMastery =
  (): UseKangurMobileLeaderboardLessonMasteryResult => {
    const mastery = useKangurMobileHomeLessonMastery();

    return {
      masteredLessons: mastery.masteredLessons,
      strongest: mastery.strongest,
      trackedLessons: mastery.trackedLessons,
      weakest: mastery.weakest,
      lessonsNeedingPractice: mastery.lessonsNeedingPractice,
    };
  };
