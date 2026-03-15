import type {
  KangurAssignmentSnapshot,
  KangurLesson,
  KangurLessonDocument,
} from '@/shared/contracts/kangur';
import type {
  KangurTestQuestionStore,
  KangurTestSuite,
} from '@/shared/contracts/kangur-tests';
import type {
  KangurLearnerProfileSnapshot,
  buildLessonMasteryInsights,
} from '@/features/kangur/ui/services/profile';
import type { getKangurProgressRepository } from '@/features/kangur/services/kangur-progress-repository';
import type { getKangurScoreRepository } from '@/features/kangur/services/kangur-score-repository';

export type KangurRecommendationSectionItem = {
  id: string;
  title: string;
  description: string;
  priority: string;
  actionLabel: string;
  actionPage: string;
  actionQuery?: Record<string, string>;
};

export type KangurAssignmentSectionItem = {
  id: string;
  title: string;
  description: string;
  priority: string;
  targetType: string;
  progressSummary: string;
  actionLabel: string;
  actionPage: string;
  actionQuery?: Record<string, string>;
};

export type LessonDocumentSnippetCard = {
  id: string;
  text: string;
  explanation: string | null;
};

export type KangurRegistryBaseData = {
  learnerId: string;
  learnerDisplayName: string | null;
  ownerUserId: string | null;
  progress: Awaited<ReturnType<Awaited<ReturnType<typeof getKangurProgressRepository>>['getProgress']>>;
  scores: Awaited<ReturnType<Awaited<ReturnType<typeof getKangurScoreRepository>>['listScores']>>;
  snapshot: KangurLearnerProfileSnapshot;
  lessons: KangurLesson[];
  lessonsById: Map<string, KangurLesson>;
  lessonDocuments: Record<string, KangurLessonDocument>;
  testSuites: KangurTestSuite[];
  testSuitesById: Map<string, KangurTestSuite>;
  questionStore: KangurTestQuestionStore;
  evaluatedAssignments: KangurAssignmentSnapshot[];
  activeAssignments: KangurAssignmentSnapshot[];
  masteryInsights: ReturnType<typeof buildLessonMasteryInsights>;
};

export const ASSIGNMENT_PRIORITY_ORDER = {
  high: 0,
  medium: 1,
  low: 2,
} as const;

export const ASSIGNMENT_STATUS_ORDER = {
  not_started: 0,
  in_progress: 1,
  completed: 2,
} as const;

export const KANGUR_AI_TUTOR_DAILY_GOAL_GAMES = 3;
export const KANGUR_AI_TUTOR_RECENT_SCORE_LIMIT = 24;

export const QUICK_START_OPERATIONS = new Set([
  'addition',
  'subtraction',
  'multiplication',
  'division',
  'decimals',
  'powers',
  'roots',
  'clock',
  'mixed',
]);
