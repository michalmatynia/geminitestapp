import 'server-only';

import { getKangurAssignmentRepository, getKangurProgressRepository, getKangurScoreRepository } from '@/features/kangur/server';
import { evaluateKangurAssignment } from '@/features/kangur/services/kangur-assignments';
import {
  buildKangurLearnerProfileSnapshot,
  buildLessonMasteryInsights,
  type KangurLearnerRecommendation,
  type KangurLessonMasteryInsight,
} from '@/features/kangur/ui/services/profile';
import type {
  KangurAssignmentSnapshot,
  KangurAssignmentProgressStatus,
  KangurPracticeAssignmentOperation,
} from '@/shared/contracts/kangur';
import type {
  KangurAiTutorConversationContext,
  KangurAiTutorFollowUpAction,
} from '@/shared/contracts/kangur-ai-tutor';
import { ErrorSystem } from '@/shared/utils/observability/error-system';

const KANGUR_AI_TUTOR_DAILY_GOAL_GAMES = 3;
const KANGUR_AI_TUTOR_RECENT_SCORE_LIMIT = 24;
const QUICK_START_OPERATIONS = new Set<KangurPracticeAssignmentOperation>([
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
const ASSIGNMENT_PRIORITY_ORDER = {
  high: 0,
  medium: 1,
  low: 2,
} as const;
const ASSIGNMENT_STATUS_ORDER: Record<KangurAssignmentProgressStatus, number> = {
  not_started: 0,
  in_progress: 1,
  completed: 2,
};

export type KangurAiTutorAdaptiveGuidance = {
  instructions: string;
  followUpActions: KangurAiTutorFollowUpAction[];
};

const normalizeComparableValue = (value: string | null | undefined): string | null => {
  if (typeof value !== 'string') {
    return null;
  }

  const normalized = value.trim().toLowerCase();
  return normalized.length > 0 ? normalized : null;
};

const matchesLessonComponent = (
  componentId: string,
  candidates: Array<string | null | undefined>
): boolean => {
  const normalizedComponent = normalizeComparableValue(componentId);
  if (!normalizedComponent) {
    return false;
  }

  return candidates.some((candidate) => {
    const normalizedCandidate = normalizeComparableValue(candidate);
    if (!normalizedCandidate) {
      return false;
    }

    return (
      normalizedCandidate === normalizedComponent ||
      normalizedCandidate.endsWith(`-${normalizedComponent}`) ||
      normalizedCandidate.endsWith(`_${normalizedComponent}`) ||
      normalizedCandidate.endsWith(`:${normalizedComponent}`) ||
      normalizedCandidate.endsWith(`/${normalizedComponent}`)
    );
  });
};

const sortAssignments = (
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

const pickRelevantAssignment = (
  assignments: KangurAssignmentSnapshot[],
  context: KangurAiTutorConversationContext | undefined
): KangurAssignmentSnapshot | null => {
  if (assignments.length === 0) {
    return null;
  }

  if (context?.assignmentId) {
    const exact = assignments.find((assignment) => assignment.id === context.assignmentId);
    if (exact) {
      return exact;
    }
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
    if (lessonMatch) {
      return lessonMatch;
    }
  }

  if (context?.surface === 'test') {
    const practiceAssignment =
      assignments.find((assignment) => assignment.target.type === 'practice') ?? null;
    if (practiceAssignment) {
      return practiceAssignment;
    }
  }

  return assignments[0] ?? null;
};

const pickRelevantWeakLesson = (
  weakLessons: KangurLessonMasteryInsight[],
  context: KangurAiTutorConversationContext | undefined
): KangurLessonMasteryInsight | null => {
  if (weakLessons.length === 0) {
    return null;
  }

  const lessonMatch = weakLessons.find((lesson) =>
    matchesLessonComponent(lesson.componentId, [context?.contentId, context?.focusId])
  );

  return lessonMatch ?? weakLessons[0] ?? null;
};

const formatRecommendation = (recommendation: KangurLearnerRecommendation): string => {
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

const formatAssignmentSummary = (assignment: KangurAssignmentSnapshot): string => {
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

const resolvePracticeDifficulty = (averageAccuracy: number): 'easy' | 'medium' | 'hard' => {
  if (averageAccuracy >= 85) {
    return 'hard';
  }
  if (averageAccuracy >= 70) {
    return 'medium';
  }
  return 'easy';
};

const buildFollowUpActionKey = (action: KangurAiTutorFollowUpAction): string => {
  const serializedQuery = action.query
    ? Object.entries(action.query)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, value]) => `${key}=${value}`)
      .join('&')
    : '';
  return `${action.page}:${serializedQuery}`;
};

const toAssignmentFollowUpAction = (
  assignment: KangurAssignmentSnapshot,
  averageAccuracy: number
): KangurAiTutorFollowUpAction => {
  if (assignment.target.type === 'lesson') {
    return {
      id: `assignment:${assignment.id}`,
      label: 'Otworz lekcje',
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

const toRecommendationFollowUpAction = (
  recommendation: KangurLearnerRecommendation
): KangurAiTutorFollowUpAction => ({
  id: `recommendation:${recommendation.id}`,
  label: recommendation.action.label,
  page: recommendation.action.page,
  query: recommendation.action.query,
  reason: recommendation.title,
});

const buildFollowUpActions = (input: {
  context: KangurAiTutorConversationContext | undefined;
  relevantAssignment: KangurAssignmentSnapshot | null;
  topRecommendation: KangurLearnerRecommendation | null;
  averageAccuracy: number;
}): KangurAiTutorFollowUpAction[] => {
  if (
    input.context?.interactionIntent !== 'next_step' &&
    input.context?.interactionIntent !== 'review'
  ) {
    return [];
  }

  const candidates = [
    input.relevantAssignment
      ? toAssignmentFollowUpAction(input.relevantAssignment, input.averageAccuracy)
      : null,
    input.topRecommendation ? toRecommendationFollowUpAction(input.topRecommendation) : null,
  ].filter((action): action is KangurAiTutorFollowUpAction => Boolean(action));

  const seen = new Set<string>();
  const deduped: KangurAiTutorFollowUpAction[] = [];

  for (const action of candidates) {
    const key = buildFollowUpActionKey(action);
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    deduped.push(action);
    if (deduped.length >= 2) {
      break;
    }
  }

  return deduped;
};

export async function buildKangurAiTutorAdaptiveGuidance({
  learnerId,
  context,
}: {
  learnerId: string;
  context?: KangurAiTutorConversationContext;
}): Promise<KangurAiTutorAdaptiveGuidance> {
  try {
    const [progressRepository, scoreRepository, assignmentRepository] = await Promise.all([
      getKangurProgressRepository(),
      getKangurScoreRepository(),
      getKangurAssignmentRepository(),
    ]);

    const [progress, scores, assignments] = await Promise.all([
      progressRepository.getProgress(learnerId),
      scoreRepository.listScores({
        sort: '-created_date',
        limit: KANGUR_AI_TUTOR_RECENT_SCORE_LIMIT,
        filters: {
          learner_id: learnerId,
        },
      }),
      assignmentRepository.listAssignments({
        learnerKey: learnerId,
        includeArchived: false,
      }),
    ]);

    const snapshot = buildKangurLearnerProfileSnapshot({
      progress,
      scores,
      dailyGoalGames: KANGUR_AI_TUTOR_DAILY_GOAL_GAMES,
    });
    const masteryInsights = buildLessonMasteryInsights(progress, 2);
    const activeAssignments = assignments
      .map((assignment) =>
        evaluateKangurAssignment({
          assignment,
          progress,
          scores,
        })
      )
      .filter((assignment) => !assignment.archived && assignment.progress.status !== 'completed')
      .sort(sortAssignments);

    const relevantWeakLesson = pickRelevantWeakLesson(masteryInsights.weakest, context);
    const topRecommendation = snapshot.recommendations[0] ?? null;
    const relevantAssignment = pickRelevantAssignment(activeAssignments, context);
    const latestSession = snapshot.recentSessions[0] ?? null;
    const lines: string[] = [];
    const followUpActions = buildFollowUpActions({
      context,
      relevantAssignment,
      topRecommendation,
      averageAccuracy: snapshot.averageAccuracy,
    });

    lines.push(
      `Adaptive learner snapshot: average accuracy ${snapshot.averageAccuracy}%, daily goal ${snapshot.todayGames}/${snapshot.dailyGoalGames}, streak ${snapshot.currentStreakDays} days.`
    );

    if (relevantWeakLesson) {
      lines.push(
        matchesLessonComponent(relevantWeakLesson.componentId, [context?.contentId, context?.focusId])
          ? `Current lesson is a weaker area: ${relevantWeakLesson.title} at ${relevantWeakLesson.masteryPercent}% mastery.`
          : `Weak lesson area: ${relevantWeakLesson.title} at ${relevantWeakLesson.masteryPercent}% mastery.`
      );
    }

    if (latestSession) {
      lines.push(
        `Most recent practice: ${latestSession.operationLabel} at ${latestSession.accuracyPercent}% accuracy.`
      );
    }

    if (topRecommendation) {
      lines.push(`Top adaptive recommendation: ${formatRecommendation(topRecommendation)}`);
    }

    if (relevantAssignment) {
      lines.push(`Relevant active assignment: ${formatAssignmentSummary(relevantAssignment)}`);
    }

    if (
      snapshot.averageAccuracy < 70 ||
      (relevantWeakLesson?.masteryPercent ?? 100) < 60
    ) {
      lines.push(
        'Adaptive tutoring stance: use smaller reasoning steps, ask one checkpoint question at a time, and confirm understanding before moving on.'
      );
    } else if (snapshot.averageAccuracy >= 85) {
      lines.push(
        'Adaptive tutoring stance: keep hints concise, let the learner do more of the work, and use challenge-style follow-up questions.'
      );
    }

    if (context?.interactionIntent === 'next_step') {
      lines.push(
        relevantAssignment
          ? `When suggesting the next step, anchor it to this assignment and give exactly one concrete Kangur action: ${relevantAssignment.title}.`
          : topRecommendation
            ? 'When suggesting the next step, anchor it to the top recommendation and give exactly one concrete Kangur action.'
            : 'When suggesting the next step, give exactly one concrete Kangur action that targets the weakest area.'
      );
    }

    if (context?.interactionIntent === 'review' && latestSession) {
      lines.push(
        `When reviewing mistakes, connect the explanation to the learner's recent ${latestSession.operationLabel} result and point out one thing to retry next.`
      );
    }

    return {
      instructions: lines.join('\n'),
      followUpActions,
    };
  } catch (error) {
    await ErrorSystem.captureException(error, {
      service: 'kangur.ai-tutor',
      action: 'buildAdaptiveGuidance',
      learnerId,
      surface: context?.surface ?? null,
      contentId: context?.contentId ?? null,
      interactionIntent: context?.interactionIntent ?? null,
    });
    return {
      instructions: '',
      followUpActions: [],
    };
  }
}

export async function buildKangurAiTutorAdaptiveInstructions(input: {
  learnerId: string;
  context?: KangurAiTutorConversationContext;
}): Promise<string> {
  const guidance = await buildKangurAiTutorAdaptiveGuidance(input);
  return guidance.instructions;
}
