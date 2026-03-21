import {
  useKangurMobileHomeLessonMastery,
  type KangurMobileHomeLessonMasteryItem,
} from '../home/useKangurMobileHomeLessonMastery';

export type KangurMobileProfileLessonMasteryItem = KangurMobileHomeLessonMasteryItem;

type UseKangurMobileProfileLessonMasteryResult = {
  masteredLessons: number;
  strongest: KangurMobileProfileLessonMasteryItem[];
  trackedLessons: number;
  weakest: KangurMobileProfileLessonMasteryItem[];
  lessonsNeedingPractice: number;
};

export const useKangurMobileProfileLessonMastery =
  (): UseKangurMobileProfileLessonMasteryResult => {
    const mastery = useKangurMobileHomeLessonMastery();

    return {
      masteredLessons: mastery.masteredLessons,
      strongest: mastery.strongest,
      trackedLessons: mastery.trackedLessons,
      weakest: mastery.weakest,
      lessonsNeedingPractice: mastery.lessonsNeedingPractice,
    };
  };
