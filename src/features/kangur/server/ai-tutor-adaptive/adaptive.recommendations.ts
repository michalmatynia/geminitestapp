import type {
  KangurAssignmentSnapshot,
} from '@/features/kangur/shared/contracts/kangur';
import type {
  KangurAiTutorConversationContext,
  KangurAiTutorFollowUpAction,
  KangurAiTutorCoachingMode,
} from '@/features/kangur/shared/contracts/kangur-ai-tutor';
import type {
  KangurLearnerRecommendation,
  KangurLessonMasteryInsight,
} from '@/features/kangur/shared/contracts/kangur-profile';
import {
  ASSIGNMENT_PRIORITY_ORDER,
  ASSIGNMENT_STATUS_ORDER,
  QUICK_START_OPERATIONS,
} from './adaptive.constants';
import {
  buildTrainingQueryFromLessonComponent,
  isCompletedFollowUpMatch,
  matchesLessonComponent,
  resolveLessonFocusTitle,
  resolvePracticeDifficulty,
} from './adaptive.utils';
import type { KangurCompletedFollowUp, KangurLessonFocusCandidate } from './adaptive.contracts';
export type { KangurRoutePage } from '@/features/kangur/shared/contracts/kangur';

export const sortAssignments = (
  left: KangurAssignmentSnapshot,
  right: KangurAssignmentSnapshot
): number => {
  const priorityDiff =
    ASSIGNMENT_PRIORITY_ORDER[left.priority] - ASSIGNMENT_PRIORITY_ORDER[right.priority];
  if (priorityDiff !== 0) return priorityDiff;

  const statusDiff =
    ASSIGNMENT_STATUS_ORDER[left.progress.status] - ASSIGNMENT_STATUS_ORDER[right.progress.status];
  if (statusDiff !== 0) return statusDiff;

  return Date.parse(right.updatedAt) - Date.parse(left.updatedAt);
};

export const pickRelevantAssignment = (
  assignments: KangurAssignmentSnapshot[],
  context: KangurAiTutorConversationContext | undefined
): KangurAssignmentSnapshot | null => {
  if (assignments.length === 0) return null;
  if (context?.assignmentId) {
    const exact = assignments.find((assignment) => assignment.id === context.assignmentId);
    if (exact) return exact;
  }
  if (context?.surface === 'lesson') {
    const lessonMatch = assignments.find(
      (assignment) =>
        assignment.target.type === 'lesson' &&
        matchesLessonComponent(assignment.target.lessonComponentId, [
          context.contentId,
          context.focusId,
        ])
    );
    if (lessonMatch) return lessonMatch;
  }
  if (context?.surface === 'test' || context?.surface === 'game') {
    return assignments.find((assignment) => assignment.target.type === 'practice') ?? assignments[0] ?? null;
  }
  return assignments[0] ?? null;
};

export const formatRecommendation = (recommendation: KangurLearnerRecommendation): string => {
  const queryBits = recommendation.action.query
    ? Object.entries(recommendation.action.query)
      .map(([key, value]) => `${key}=${value}`)
      .join(', ')
    : null;

  return [
    recommendation.title,
    recommendation.description,
    `Action: ${recommendation.action.label} on ${recommendation.action.page}.`,
    queryBits ? `Route focus: ${queryBits}.` : null,
  ]
    .filter(Boolean)
    .join(' ');
};

export const formatAssignmentSummary = (assignment: KangurAssignmentSnapshot): string => {
  const targetSummary =
    assignment.target.type === 'lesson'
      ? `Lesson target: ${assignment.target.lessonComponentId}.`
      : `Practice target: ${assignment.target.operation}.`;

  return [
    assignment.title,
    assignment.description,
    targetSummary,
    `Progress: ${assignment.progress.summary}`,
  ]
    .filter(Boolean)
    .join(' ');
};

export const buildFollowUpActionKey = (action: KangurAiTutorFollowUpAction): string => {
  const serializedQuery = action.query
    ? Object.entries(action.query)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, value]) => `${key}=${value}`)
      .join('&')
    : '';
  return `${action.page}:${serializedQuery}`;
};

export const toAssignmentFollowUpAction = (
  assignment: KangurAssignmentSnapshot,
  averageAccuracy: number
): KangurAiTutorFollowUpAction => {
  if (assignment.target.type === 'lesson') {
    return {
      id: `assignment:${assignment.id}`,
      label: 'Otwórz lekcje',
      page: 'Lessons',
      query: {
        focus: assignment.target.lessonComponentId,
      },
      reason: assignment.title,
    };
  }

  const query: Record<string, string> = QUICK_START_OPERATIONS.has(assignment.target.operation)
    ? {
      quickStart: 'operation',
      operation: assignment.target.operation,
      difficulty: resolvePracticeDifficulty(averageAccuracy),
    }
    : {
      quickStart: 'training',
    };

  return {
    id: `assignment:${assignment.id}`,
    label: 'Uruchom trening',
    page: 'Game',
    query,
    reason: assignment.title,
  };
};

export const toRecommendationFollowUpAction = (
  recommendation: KangurLearnerRecommendation
): KangurAiTutorFollowUpAction => ({
  id: `recommendation:${recommendation.id}`,
  label: recommendation.action.label,
  page: recommendation.action.page,
  query: recommendation.action.query,
  reason: recommendation.title,
});

export const buildCompletedFollowUpBridgeAction = (input: {
  completedFollowUp: KangurCompletedFollowUp | null;
  lessonFocus: KangurLessonFocusCandidate | null;
  averageAccuracy: number;
}): KangurAiTutorFollowUpAction | null => {
  if (!input.completedFollowUp || !input.lessonFocus) return null;

  const lessonTitle = resolveLessonFocusTitle(
    input.lessonFocus.componentId,
    input.lessonFocus.title
  );

  if (input.completedFollowUp.page === 'Lessons') {
    return {
      id: `bridge:lesson-to-game:${input.lessonFocus.componentId}`,
      label: 'Uruchom trening',
      page: 'Game',
      query: buildTrainingQueryFromLessonComponent(
        input.lessonFocus.componentId,
        input.averageAccuracy
      ),
      reason: `Po lekcji: ${lessonTitle}`,
    };
  }

  if (input.completedFollowUp.page === 'Game') {
    return {
      id: `bridge:game-to-lesson:${input.lessonFocus.componentId}`,
      label: 'Otwórz lekcje',
      page: 'Lessons',
      query: {
        focus: input.lessonFocus.componentId,
      },
      reason: `Po treningu: ${lessonTitle}`,
    };
  }

  return null;
};

export const pickFreshCandidate = <T,>(
  candidates: T[],
  toAction: (candidate: T) => KangurAiTutorFollowUpAction | null,
  completedFollowUp: KangurCompletedFollowUp | null
): T | null => {
  for (const candidate of candidates) {
    const action = toAction(candidate);
    if (!action || isCompletedFollowUpMatch(completedFollowUp, action)) continue;
    return candidate;
  }
  return null;
};

export const pickRelevantWeakLesson = (
  weakLessons: KangurLessonMasteryInsight[],
  context: KangurAiTutorConversationContext | undefined
): KangurLessonMasteryInsight | null => {
  if (weakLessons.length === 0) return null;
  const lessonMatch = weakLessons.find((lesson) =>
    matchesLessonComponent(lesson.componentId, [context?.contentId, context?.focusId])
  );
  return lessonMatch ?? weakLessons[0] ?? null;
};

export const buildOrderedAssignmentCandidates = (
  assignments: KangurAssignmentSnapshot[],
  context: KangurAiTutorConversationContext | undefined
): KangurAssignmentSnapshot[] => {
  const relevantAssignment = pickRelevantAssignment(assignments, context);
  if (!relevantAssignment) return assignments;
  return [
    relevantAssignment,
    ...assignments.filter((assignment) => assignment.id !== relevantAssignment.id),
  ];
};

export const buildFollowUpActions = (input: {
  context: KangurAiTutorConversationContext | undefined;
  bridgeAction: KangurAiTutorFollowUpAction | null;
  relevantAssignment: KangurAssignmentSnapshot | null;
  topRecommendation: KangurLearnerRecommendation | null;
  averageAccuracy: number;
  coachingMode: KangurAiTutorCoachingMode | null;
  completedFollowUp: KangurCompletedFollowUp | null;
}): KangurAiTutorFollowUpAction[] => {
  if (
    input.coachingMode !== 'next_best_action' &&
    input.context?.interactionIntent !== 'next_step' &&
    input.context?.interactionIntent !== 'review'
  ) {
    return [];
  }

  const candidates = [
    input.bridgeAction,
    input.relevantAssignment
      ? toAssignmentFollowUpAction(input.relevantAssignment, input.averageAccuracy)
      : null,
    input.topRecommendation ? toRecommendationFollowUpAction(input.topRecommendation) : null,
  ]
    .filter((action): action is KangurAiTutorFollowUpAction => Boolean(action))
    .filter((action) => !isCompletedFollowUpMatch(input.completedFollowUp, action));

  const seen = new Set<string>();
  const deduped: KangurAiTutorFollowUpAction[] = [];

  for (const action of candidates) {
    const key = buildFollowUpActionKey(action);
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(action);
    if (input.coachingMode === 'next_best_action' || deduped.length >= 2) break;
  }

  return deduped;
};
