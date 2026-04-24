import type { KangurPracticeCompletionResult } from '@kangur/core';
import type { KangurMobileLocale } from '../i18n/kangurMobileI18n';
import type { KangurMobileTone } from '../shared/KangurMobileUi';
import type { PracticeScoreSyncState } from './practiceScoreSyncState';
import type { useKangurMobilePracticeLessonMastery } from './useKangurMobilePracticeLessonMastery';
import type { useKangurMobilePracticeAssignments } from './useKangurMobilePracticeAssignments';
import type { useKangurMobilePracticeBadges } from './useKangurMobilePracticeBadges';
import type { useKangurMobilePracticeDuels } from './useKangurMobilePracticeDuels';
import type { useKangurMobilePracticeRecentResults } from './useKangurMobilePracticeRecentResults';
import type { useKangurPracticeSyncProof } from './useKangurPracticeSyncProof';
import type { useKangurMobileLessonCheckpoints } from '../lessons/useKangurMobileLessonCheckpoints';

export interface PracticeCompletionCardProps {
  completion: KangurPracticeCompletionResult;
  completionLessonAction: React.ReactNode;
  copy: (value: Record<string, string>) => string;
  correctAnswers: number;
  lessonCheckpoints: ReturnType<typeof useKangurMobileLessonCheckpoints>;
  lessonFocusSummary: string | null;
  lessonMastery: ReturnType<typeof useKangurMobilePracticeLessonMastery>;
  locale: KangurMobileLocale;
  localeTag: string;
  openDuelSession: (sessionId: string) => void;
  practiceAssignments: ReturnType<typeof useKangurMobilePracticeAssignments>;
  practiceBadges: ReturnType<typeof useKangurMobilePracticeBadges>;
  practiceDuels: ReturnType<typeof useKangurMobilePracticeDuels>;
  practiceModeHistoryHref: string;
  practiceRecentResults: ReturnType<typeof useKangurMobilePracticeRecentResults>;
  practiceSyncProof: ReturnType<typeof useKangurPracticeSyncProof>;
  profileHref: string;
  questionsLength: number;
  restart: () => void;
  resultsHistoryHref: string;
  scoreSyncAppearance: KangurMobileTone | null;
  scoreSyncState: PracticeScoreSyncState | null;
  shouldShowSyncProof: boolean;
  strongestLesson: ReturnType<typeof useKangurMobilePracticeLessonMastery>['strongest'][number] | null;
  weakestLesson: ReturnType<typeof useKangurMobilePracticeLessonMastery>['weakest'][number] | null;
}
