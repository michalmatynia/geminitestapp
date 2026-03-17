import { KANGUR_LESSON_LIBRARY } from '@/features/kangur/settings';
import type {
  KangurAssignmentProgressStatus,
  KangurLessonComponentId,
  KangurPracticeAssignmentOperation,
} from '@/features/kangur/shared/contracts/kangur';

export const KANGUR_AI_TUTOR_DAILY_GOAL_GAMES = 3;
export const KANGUR_AI_TUTOR_RECENT_SCORE_LIMIT = 24;

export const QUICK_START_OPERATIONS = new Set<KangurPracticeAssignmentOperation>([
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

export const LESSON_COMPONENT_IDS = new Set<KangurLessonComponentId>(
  Object.keys(KANGUR_LESSON_LIBRARY) as KangurLessonComponentId[]
);

export const PRACTICE_OPERATION_TO_LESSON_COMPONENT: Partial<
  Record<KangurPracticeAssignmentOperation, KangurLessonComponentId>
> = {
  addition: 'adding',
  subtraction: 'subtracting',
  multiplication: 'multiplication',
  division: 'division',
  clock: 'clock',
};

export const LESSON_COMPONENT_TO_PRACTICE_OPERATION: Partial<
  Record<KangurLessonComponentId, KangurPracticeAssignmentOperation>
> = {
  adding: 'addition',
  subtracting: 'subtraction',
  multiplication: 'multiplication',
  division: 'division',
  clock: 'clock',
};

export const ASSIGNMENT_PRIORITY_ORDER = {
  high: 0,
  medium: 1,
  low: 2,
} as const;

export const ASSIGNMENT_STATUS_ORDER: Record<KangurAssignmentProgressStatus, number> = {
  not_started: 0,
  in_progress: 1,
  completed: 2,
};
