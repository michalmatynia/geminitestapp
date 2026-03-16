import type {
  KangurAssignmentSnapshot,
  KangurLesson,
  KangurLessonComponentId,
} from '@/features/kangur/shared/contracts/kangur';
import type {
  KangurLearnerRecommendation,
  KangurLessonMasteryInsight,
  KangurRecentSession,
} from '@/features/kangur/shared/contracts/kangur-profile';
import {
  ASSIGNMENT_PRIORITY_ORDER,
  ASSIGNMENT_STATUS_ORDER,
  QUICK_START_OPERATIONS,
  type KangurAssignmentSectionItem,
  type KangurRecommendationSectionItem,
} from './kangur-registry-types';
import {} from './kangur-registry-utils';


export const sortAssignments = (
  left: KangurAssignmentSnapshot,
  right: KangurAssignmentSnapshot
): number => {
  const priorityDiff =
    ASSIGNMENT_PRIORITY_ORDER[left.priority] - ASSIGNMENT_PRIORITY_ORDER[right.priority];
  if (priorityDiff !== 0) {
    return priorityDiff;
  }
  const statusDiff =
    ASSIGNMENT_STATUS_ORDER[left.progress.status] - ASSIGNMENT_STATUS_ORDER[right.progress.status];
  if (statusDiff !== 0) {
    return statusDiff;
  }
  return Date.parse(right.updatedAt) - Date.parse(left.updatedAt);
};

export const resolvePracticeDifficulty = (averageAccuracy: number): 'easy' | 'medium' | 'hard' => {
  if (averageAccuracy >= 85) {
    return 'hard';
  }
  if (averageAccuracy >= 70) {
    return 'medium';
  }
  return 'easy';
};

export const toAssignmentAction = (
  assignment: KangurAssignmentSnapshot,
  averageAccuracy: number
): {
  actionLabel: string;
  actionPage: string;
  actionQuery?: Record<string, string>;
} => {
  if (assignment.target.type === 'lesson') {
    return {
      actionLabel: 'Otwórz lekcję',
      actionPage: 'Lessons',
      actionQuery: {
        focus: assignment.target.lessonComponentId,
      },
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
    actionLabel: 'Uruchom trening',
    actionPage: 'Game',
    actionQuery: query,
  };
};

export const toRecommendationItem = (
  recommendation: KangurLearnerRecommendation
): KangurRecommendationSectionItem => ({
  id: recommendation.id,
  title: recommendation.title,
  description: recommendation.description,
  priority: recommendation.priority,
  actionLabel: recommendation.action.label,
  actionPage: recommendation.action.page,
  ...(recommendation.action.query ? { actionQuery: recommendation.action.query } : {}),
});

export const toAssignmentItem = (
  assignment: KangurAssignmentSnapshot,
  averageAccuracy: number
): KangurAssignmentSectionItem => {
  const action = toAssignmentAction(assignment, averageAccuracy);
  return {
    id: assignment.id,
    title: assignment.title,
    description: assignment.description,
    priority: assignment.priority,
    targetType: assignment.target.type,
    progressSummary: assignment.progress.summary,
    ...action,
  };
};

export const formatAssignmentSummary = (
  assignment: KangurAssignmentSnapshot,
  averageAccuracy: number
): string => {
  const action = toAssignmentAction(assignment, averageAccuracy);
  const targetSummary =
    assignment.target.type === 'lesson'
      ? `Lesson target: ${assignment.target.lessonComponentId}.`
      : `Practice target: ${assignment.target.operation}.`;
  return [
    assignment.title,
    assignment.description,
    targetSummary,
    `Progress: ${assignment.progress.summary}`,
    `Suggested action: ${action.actionLabel} on ${action.actionPage}.`,
  ]
    .filter(Boolean)
    .join(' ');
};

export const buildRecentSessionItem = (session: KangurRecentSession): Record<string, unknown> => ({
  id: session.id,
  operation: session.operation,
  operationLabel: session.operationLabel,
  accuracyPercent: session.accuracyPercent,
  score: session.score,
  totalQuestions: session.totalQuestions,
  createdAt: session.createdAt,
  ...(session.xpEarned !== null ? { xpEarned: session.xpEarned } : {}),
});

export const buildWeakLessonItem = (lesson: KangurLessonMasteryInsight): Record<string, unknown> => ({
  componentId: lesson.componentId,
  title: lesson.title,
  masteryPercent: lesson.masteryPercent,
  attempts: lesson.attempts,
  bestScorePercent: lesson.bestScorePercent,
  lastScorePercent: lesson.lastScorePercent,
  lastCompletedAt: lesson.lastCompletedAt,
});

export const buildOrderedLessonsForNavigation = (
  lessons: KangurLesson[],
  assignments: KangurAssignmentSnapshot[]
): KangurLesson[] => {
  const activeLessonAssignments = new Map<KangurLessonComponentId, KangurAssignmentSnapshot>();

  assignments
    .filter((assignment) => assignment.progress.status !== 'completed')
    .filter(
      (assignment): assignment is KangurAssignmentSnapshot & { target: { type: 'lesson' } } =>
        assignment.target.type === 'lesson'
    )
    .forEach((assignment) => {
      const componentId = assignment.target.lessonComponentId;
      const existing = activeLessonAssignments.get(componentId);
      if (
        !existing ||
        ASSIGNMENT_PRIORITY_ORDER[assignment.priority] <
          ASSIGNMENT_PRIORITY_ORDER[existing.priority]
      ) {
        activeLessonAssignments.set(componentId, assignment);
      }
    });

  return [...lessons].sort((left, right) => {
    const leftAssignment = activeLessonAssignments.get(left.componentId);
    const rightAssignment = activeLessonAssignments.get(right.componentId);

    if (leftAssignment && !rightAssignment) {
      return -1;
    }
    if (!leftAssignment && rightAssignment) {
      return 1;
    }
    if (leftAssignment && rightAssignment) {
      const priorityDiff =
        ASSIGNMENT_PRIORITY_ORDER[leftAssignment.priority] -
        ASSIGNMENT_PRIORITY_ORDER[rightAssignment.priority];
      if (priorityDiff !== 0) {
        return priorityDiff;
      }
    }

    return left.sortOrder - right.sortOrder;
  });
};
