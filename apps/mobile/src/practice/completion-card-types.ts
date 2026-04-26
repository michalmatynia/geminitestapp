import type { KangurPracticeCompletionResult } from '@kangur/core';
import type { KangurMobileLocale } from '../i18n/kangurMobileI18n';
import type { KangurMobileTone } from '../shared/KangurMobileUi';
import type { PracticeScoreSyncState } from './practiceScoreSyncState';
import { type KangurMobilePracticeLessonMasteryItem } from './useKangurMobilePracticeLessonMastery';
import { type KangurMobilePracticeAssignmentItem } from './useKangurMobilePracticeAssignments';
import { type KangurMobilePracticeBadgeItem } from './useKangurMobilePracticeBadges';
import { type KangurMobilePracticeDuelItem } from './useKangurMobilePracticeDuels';
import { type KangurMobilePracticeRecentResultItem } from './useKangurMobilePracticeRecentResults';
import { type KangurPracticeSyncProofSnapshot } from './practiceSyncProofLogic';
import { type KangurMobileLessonCheckpointItem } from '../lessons/useKangurMobileLessonCheckpoints';

export interface PracticeCompletionCardProps {
  completion: KangurPracticeCompletionResult;
  completionLessonAction: React.ReactNode;
  copy: (value: Record<string, string>) => string;
  correctAnswers: number;
  lessonCheckpoints: { recentCheckpoints: KangurMobileLessonCheckpointItem[] };
  lessonFocusSummary: string | null;
  lessonMastery: {
      masteredLessons: number;
      strongest: KangurMobilePracticeLessonMasteryItem[];
      trackedLessons: number;
      weakest: KangurMobilePracticeLessonMasteryItem[];
      lessonsNeedingPractice: number;
  };
  locale: KangurMobileLocale;
  localeTag: string;
  openDuelSession: (sessionId: string) => void;
  practiceAssignments: { assignmentItems: KangurMobilePracticeAssignmentItem[] };
  practiceBadges: { unlockedBadges: number, totalBadges: number, remainingBadges: number, recentBadges: KangurMobilePracticeBadgeItem[] };
  practiceDuels: { duels: KangurMobilePracticeDuelItem[] };
  practiceModeHistoryHref: string;
  practiceRecentResults: { recentResults: KangurMobilePracticeRecentResultItem[] };
  practiceSyncProof: KangurPracticeSyncProofSnapshot;
  profileHref: string;
  questionsLength: number;
  restart: () => void;
  resultsHistoryHref: string;
  scoreSyncAppearance: KangurMobileTone | null;
  scoreSyncState: PracticeScoreSyncState | null;
  shouldShowSyncProof: boolean;
  strongestLesson: KangurMobilePracticeLessonMasteryItem | null;
  weakestLesson: KangurMobilePracticeLessonMasteryItem | null;
}
