import type { Href } from 'expo-router';
import { LessonsRecentResultsSection } from './components/LessonsRecentResultsSection';
import { LessonsBadgesSection } from './components/LessonsBadgesSection';
import { LessonsMasterySection } from './components/LessonsMasterySection';
import { LessonsCheckpointsSection } from './components/LessonsCheckpointsSection';
import { LessonsAssignmentsSection } from './components/LessonsAssignmentsSection';
import { LessonsDuelsSection } from './components/LessonsDuelsSection';
import { LessonsCatalogSection } from './components/LessonsCatalogSection';
import { type useKangurMobileI18n } from '../i18n/kangurMobileI18n';
import { type useKangurMobileLessonCheckpoints } from './useKangurMobileLessonCheckpoints';
import { type useKangurMobileLessonsAssignments } from './useKangurMobileLessonsAssignments';
import { type useKangurMobileLessonsBadges } from './useKangurMobileLessonsBadges';
import { type useKangurMobileLessonsLessonMastery } from './useKangurMobileLessonsLessonMastery';
import { type useKangurMobileLessonsRecentResults } from './useKangurMobileLessonsRecentResults';
import { type useKangurMobileLessons } from './useKangurMobileLessons';
import { type UseKangurMobileLearnerDuelsSummaryResult } from '../duels/useKangurMobileLearnerDuelsSummary';

type LessonsSecondarySectionsProps = {
  copy: ReturnType<typeof useKangurMobileI18n>['copy'];
  duelSectionDescription: string;
  isPreparingLessonsView: boolean;
  lessonBadges: ReturnType<typeof useKangurMobileLessonsBadges>;
  lessonCheckpoints: ReturnType<typeof useKangurMobileLessonCheckpoints>;
  lessonDuels: UseKangurMobileLearnerDuelsSummaryResult;
  lessonFocusSummary: string | null;
  lessonMastery: ReturnType<typeof useKangurMobileLessonsLessonMastery>;
  lessonRecentResults: ReturnType<typeof useKangurMobileLessonsRecentResults>;
  lessons: ReturnType<typeof useKangurMobileLessons>['lessons'];
  lessonsAssignments: ReturnType<typeof useKangurMobileLessonsAssignments>;
  locale: ReturnType<typeof useKangurMobileI18n>['locale'];
  onOpenCatalogLesson: () => void;
  openDuelSession: (sessionId: string) => void;
  profileHref: Href;
  resultsHref: Href;
};

export function LessonsSecondarySections(props: LessonsSecondarySectionsProps): React.JSX.Element {
  return (
    <>
      <LessonsRecentResultsSection {...props} />
      <LessonsBadgesSection {...props} />
      <LessonsMasterySection {...props} />
      <LessonsCheckpointsSection {...props} />
      <LessonsAssignmentsSection {...props} />
      <LessonsDuelsSection {...props} />
      <LessonsCatalogSection {...props} />
    </>
  );
}
