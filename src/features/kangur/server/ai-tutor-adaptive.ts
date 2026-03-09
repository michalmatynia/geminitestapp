import 'server-only';

import type {
  ContextRegistryResolutionBundle,
  ContextRuntimeDocument,
} from '@/shared/contracts/ai-context-registry';
import { getKangurAssignmentRepository, getKangurProgressRepository, getKangurScoreRepository } from '@/features/kangur/server';
import { evaluateKangurAssignment } from '@/features/kangur/services/kangur-assignments';
import { resolveKangurAiTutorRuntimeDocuments } from '@/features/kangur/server/context-registry';
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
  KangurRoutePage,
} from '@/shared/contracts/kangur';
import type {
  KangurAiTutorConversationContext,
  KangurAiTutorCoachingFrame,
  KangurAiTutorCoachingMode,
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
  coachingFrame: KangurAiTutorCoachingFrame | null;
};

const COACHING_MODE_INSTRUCTIONS: Record<KangurAiTutorCoachingMode, string> = {
  hint_ladder:
    'Use a hint ladder: give one small next step or one checkpoint question, then stop.',
  misconception_check:
    'Diagnose the misunderstanding first: explain the concept simply before asking for the next attempt.',
  review_reflection:
    'Use review reflection: explain what happened, name one improvement, and finish with one retry idea.',
  next_best_action:
    'Recommend exactly one concrete Kangur action that best matches the learner context.',
};

const buildKangurAiTutorCoachingFrame = (input: {
  context: KangurAiTutorConversationContext | undefined;
  averageAccuracy: number;
  weakMasteryPercent: number;
}): KangurAiTutorCoachingFrame => {
  const { context, averageAccuracy, weakMasteryPercent } = input;
  const hasSelectedExcerpt =
    Boolean(context?.selectedText) ||
    context?.focusKind === 'selection' ||
    context?.promptMode === 'selected_text';

  if (context?.interactionIntent === 'review' || context?.answerRevealed) {
    return {
      mode: 'review_reflection',
      label: 'Omow po probie',
      description:
        'Podsumuj probe, nazwij jedna poprawke i zakoncz sugestia ponownej proby.',
      rationale: context?.answerRevealed
        ? 'Odpowiedz jest juz odslonieta, wiec tutor powinien skupic sie na spokojnym omowieniu.'
        : 'To dobry moment na refleksje po probie i jedna konkretna poprawke.',
    };
  }

  if (context?.interactionIntent === 'next_step') {
    return {
      mode: 'next_best_action',
      label: 'Nastepny krok',
      description: 'Wskaz jedna konkretna aktywnosc Kangur jako najlepszy dalszy ruch.',
      rationale: 'Najwiecej wartosci da teraz jedna jasna aktywnosc, a nie kilka opcji naraz.',
    };
  }

  if (
    hasSelectedExcerpt ||
    context?.promptMode === 'explain' ||
    context?.interactionIntent === 'explain'
  ) {
    return {
      mode: 'misconception_check',
      label: 'Sprawdz rozumienie',
      description: 'Najpierw wyjasnij pojecie i sprawdz, co uczen rozumie blednie.',
      rationale: hasSelectedExcerpt
        ? 'Uczen wskazal konkretny fragment, wiec trzeba najpierw sprawdzic rozumienie.'
        : 'Najpierw trzeba uchwycic blad w rozumieniu pojecia, zanim padnie kolejna wskazowka.',
    };
  }

  if (
    context?.promptMode === 'hint' ||
    context?.interactionIntent === 'hint' ||
    context?.surface === 'test' ||
    context?.surface === 'game' ||
    context?.focusKind === 'question' ||
    averageAccuracy < 70 ||
    weakMasteryPercent < 60
  ) {
    return {
      mode: 'hint_ladder',
      label: 'Jeden trop',
      description: 'Daj tylko jeden maly krok albo pytanie kontrolne, bez pelnego rozwiazania.',
      rationale:
        context?.surface === 'test' || context?.surface === 'game'
          ? 'Uczen jest w trakcie proby, wiec tutor powinien prowadzic bardzo malymi krokami.'
          : 'Nizsza skutecznosc sugeruje prace malymi krokami zamiast pelnego wyjasnienia naraz.',
    };
  }

  return {
    mode: 'misconception_check',
    label: 'Sprawdz rozumienie',
    description: 'Najpierw wyjasnij pojecie i sprawdz, co uczen rozumie blednie.',
    rationale: 'Krotka diagnoza rozumienia daje lepszy kolejny krok niz szybka odpowiedz.',
  };
};

const appendCoachingFrameInstructions = (
  lines: string[],
  coachingFrame: KangurAiTutorCoachingFrame
): void => {
  lines.push(
    `Structured coaching mode: ${coachingFrame.mode}. ${COACHING_MODE_INSTRUCTIONS[coachingFrame.mode]}`
  );

  if (coachingFrame.rationale) {
    lines.push(`Mode rationale: ${coachingFrame.rationale}`);
  }
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

  if (context?.surface === 'test' || context?.surface === 'game') {
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

const asRecord = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;

const readStringFact = (
  document: ContextRuntimeDocument | null | undefined,
  key: string
): string | null => {
  const value = document?.facts?.[key];
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
};

const readNumberFact = (
  document: ContextRuntimeDocument | null | undefined,
  key: string
): number | null => {
  const value = document?.facts?.[key];
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
};

const readSectionItems = (
  document: ContextRuntimeDocument | null | undefined,
  sectionId: string
): Record<string, unknown>[] => {
  const section = document?.sections?.find((entry) => entry.id === sectionId);
  return Array.isArray(section?.items)
    ? section.items.filter((item): item is Record<string, unknown> => Boolean(asRecord(item)))
    : [];
};

const readActionPage = (value: unknown): KangurRoutePage | null => {
  switch (value) {
    case 'Game':
    case 'Lessons':
    case 'ParentDashboard':
    case 'LearnerProfile':
      return value;
    default:
      return null;
  }
};

const toFollowUpActionFromItem = (
  item: Record<string, unknown> | null,
  options?: {
    idPrefix?: string;
    labelKey?: string;
    pageKey?: string;
    queryKey?: string;
    reasonKey?: string;
  }
): KangurAiTutorFollowUpAction | null => {
  if (!item) {
    return null;
  }

  const label = typeof item[options?.labelKey ?? 'actionLabel'] === 'string'
    ? String(item[options?.labelKey ?? 'actionLabel']).trim()
    : '';
  const page = readActionPage(item[options?.pageKey ?? 'actionPage']);
  if (!label || !page) {
    return null;
  }

  const reasonRaw = item[options?.reasonKey ?? 'title'];
  const queryRaw = item[options?.queryKey ?? 'actionQuery'];
  const queryRecord = asRecord(queryRaw);
  const queryEntries = queryRecord ? Object.entries(queryRecord) : [];
  const query = queryEntries.length > 0
    ? queryEntries.reduce<Record<string, string>>((acc, [key, value]) => {
      if (typeof value !== 'string') {
        return acc;
      }

      const trimmedValue = value.trim();
      if (!trimmedValue) {
        return acc;
      }

      acc[key] = trimmedValue;
      return acc;
    }, {})
    : undefined;
  const rawId =
    typeof item['id'] === 'string' && item['id'].trim().length > 0
      ? item['id'].trim()
      : `${options?.idPrefix ?? 'context'}:${page}:${label.toLowerCase()}`;

  return {
    id: `${options?.idPrefix ?? 'context'}:${rawId}`,
    label,
    page,
    ...(query && Object.keys(query).length > 0 ? { query } : {}),
    ...(typeof reasonRaw === 'string' && reasonRaw.trim().length > 0
      ? { reason: reasonRaw.trim() }
      : {}),
  };
};

const formatRecommendationItem = (item: Record<string, unknown>): string => {
  const title = typeof item['title'] === 'string' ? item['title'].trim() : '';
  const description = typeof item['description'] === 'string' ? item['description'].trim() : '';
  const action = toFollowUpActionFromItem(item, {
    idPrefix: 'recommendation',
  });

  return [
    title,
    description,
    action ? `Action: ${action.label} on ${action.page}.` : null,
    action?.query
      ? `Route focus: ${Object.entries(action.query)
        .map(([key, value]) => `${key}=${value}`)
        .join(', ')}.`
      : null,
  ]
    .filter(Boolean)
    .join(' ');
};

const buildAdaptiveGuidanceFromRegistry = (input: {
  context?: KangurAiTutorConversationContext;
  registryBundle: ContextRegistryResolutionBundle;
}): KangurAiTutorAdaptiveGuidance => {
  const { learnerSnapshot, loginActivity, surfaceContext, assignmentContext } =
    resolveKangurAiTutorRuntimeDocuments(input.registryBundle, input.context);
  const weakLessons = readSectionItems(learnerSnapshot, 'weak_lessons');
  const recentSessions = readSectionItems(learnerSnapshot, 'recent_sessions');
  const recommendations = readSectionItems(learnerSnapshot, 'recommendations');
  const activeAssignments = readSectionItems(learnerSnapshot, 'active_assignments');
  const relevantWeakLesson =
    weakLessons.find((lesson) =>
      matchesLessonComponent(String(lesson['componentId'] ?? ''), [
        input.context?.contentId,
        input.context?.focusId,
      ])
    ) ??
    weakLessons[0] ??
    null;
  const latestSession = recentSessions[0] ?? null;
  const topRecommendation = recommendations[0] ?? null;
  const relevantAssignment =
    (assignmentContext ? asRecord(assignmentContext.facts) : null) ??
    activeAssignments[0] ??
    null;
  const averageAccuracy = readNumberFact(learnerSnapshot, 'averageAccuracy') ?? 0;
  const todayGames = readNumberFact(learnerSnapshot, 'todayGames') ?? 0;
  const dailyGoalGames = readNumberFact(learnerSnapshot, 'dailyGoalGames') ?? 0;
  const currentStreakDays = readNumberFact(learnerSnapshot, 'currentStreakDays') ?? 0;
  const learnerSummary = readStringFact(learnerSnapshot, 'learnerSummary');
  const learnerSignInCount7d = readNumberFact(loginActivity, 'learnerSignInCount7d');
  const parentLoginCount7d = readNumberFact(loginActivity, 'parentLoginCount7d');
  const assignmentSummary =
    (typeof relevantAssignment?.['assignmentSummary'] === 'string'
      ? String(relevantAssignment['assignmentSummary']).trim()
      : null) ?? readStringFact(surfaceContext, 'assignmentSummary');
  const followUpActions =
    input.context?.interactionIntent === 'next_step' || input.context?.interactionIntent === 'review'
      ? [
        toFollowUpActionFromItem(relevantAssignment, {
          idPrefix: 'assignment',
        }),
        toFollowUpActionFromItem(topRecommendation, {
          idPrefix: 'recommendation',
        }),
      ].filter((action): action is KangurAiTutorFollowUpAction => Boolean(action))
      : [];
  const lines: string[] = [];

  if (learnerSummary) {
    lines.push(`Adaptive learner snapshot: ${learnerSummary}`);
  } else {
    lines.push(
      `Adaptive learner snapshot: average accuracy ${averageAccuracy}%, daily goal ${todayGames}/${dailyGoalGames}, streak ${currentStreakDays} days.`
    );
  }

  if (learnerSignInCount7d !== null && learnerSignInCount7d <= 1) {
    lines.push(
      'Engagement signal: the learner has signed into Kangur at most once in the last 7 days, so prefer a very small restart step.'
    );
  }

  if (parentLoginCount7d !== null && parentLoginCount7d === 0) {
    lines.push(
      'Support signal: the parent has not logged into Kangur in the last 7 days, so avoid depending on immediate parent follow-up.'
    );
  }

  if (relevantWeakLesson) {
    const title = typeof relevantWeakLesson['title'] === 'string' ? relevantWeakLesson['title'] : '';
    const masteryPercent =
      typeof relevantWeakLesson['masteryPercent'] === 'number'
        ? relevantWeakLesson['masteryPercent']
        : null;
    if (title && masteryPercent !== null) {
      lines.push(
        matchesLessonComponent(String(relevantWeakLesson['componentId'] ?? ''), [
          input.context?.contentId,
          input.context?.focusId,
        ])
          ? `Current lesson is a weaker area: ${title} at ${masteryPercent}% mastery.`
          : `Weak lesson area: ${title} at ${masteryPercent}% mastery.`
      );
    }
  }

  if (latestSession) {
    const operationLabel =
      typeof latestSession['operationLabel'] === 'string' ? latestSession['operationLabel'] : '';
    const accuracyPercent =
      typeof latestSession['accuracyPercent'] === 'number' ? latestSession['accuracyPercent'] : null;
    if (operationLabel && accuracyPercent !== null) {
      lines.push(
        `Most recent practice: ${operationLabel} at ${accuracyPercent}% accuracy.`
      );
    }
  }

  if (topRecommendation) {
    lines.push(`Top adaptive recommendation: ${formatRecommendationItem(topRecommendation)}`);
  }

  if (assignmentSummary) {
    lines.push(`Relevant active assignment: ${assignmentSummary}`);
  }

  const weakMasteryPercent =
    typeof relevantWeakLesson?.['masteryPercent'] === 'number'
      ? relevantWeakLesson['masteryPercent']
      : 100;
  const coachingFrame = buildKangurAiTutorCoachingFrame({
    context: input.context,
    averageAccuracy,
    weakMasteryPercent,
  });
  if (averageAccuracy < 70 || weakMasteryPercent < 60) {
    lines.push(
      'Adaptive tutoring stance: use smaller reasoning steps, ask one checkpoint question at a time, and confirm understanding before moving on.'
    );
  } else if (averageAccuracy >= 85) {
    lines.push(
      'Adaptive tutoring stance: keep hints concise, let the learner do more of the work, and use challenge-style follow-up questions.'
    );
  }
  appendCoachingFrameInstructions(lines, coachingFrame);

  if (input.context?.interactionIntent === 'next_step') {
    lines.push(
      relevantAssignment
        ? `When suggesting the next step, anchor it to this assignment and give exactly one concrete Kangur action: ${String(relevantAssignment['title'] ?? 'current assignment')}.`
        : topRecommendation
          ? 'When suggesting the next step, anchor it to the top recommendation and give exactly one concrete Kangur action.'
          : 'When suggesting the next step, give exactly one concrete Kangur action that targets the weakest area.'
    );
  }

  if (
    input.context?.interactionIntent === 'review' &&
    typeof latestSession?.['operationLabel'] === 'string'
  ) {
    lines.push(
      `When reviewing mistakes, connect the explanation to the learner's recent ${String(latestSession['operationLabel'])} result and point out one thing to retry next.`
    );
  }

  return {
    instructions: lines.join('\n'),
    followUpActions,
    coachingFrame,
  };
};

export async function buildKangurAiTutorAdaptiveGuidance({
  learnerId,
  context,
  registryBundle,
}: {
  learnerId: string;
  context?: KangurAiTutorConversationContext;
  registryBundle?: ContextRegistryResolutionBundle | null;
}): Promise<KangurAiTutorAdaptiveGuidance> {
  try {
    if (registryBundle?.documents.length) {
      return buildAdaptiveGuidanceFromRegistry({
        context,
        registryBundle,
      });
    }

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
    const weakMasteryPercent = relevantWeakLesson?.masteryPercent ?? 100;
    const coachingFrame = buildKangurAiTutorCoachingFrame({
      context,
      averageAccuracy: snapshot.averageAccuracy,
      weakMasteryPercent,
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
      weakMasteryPercent < 60
    ) {
      lines.push(
        'Adaptive tutoring stance: use smaller reasoning steps, ask one checkpoint question at a time, and confirm understanding before moving on.'
      );
    } else if (snapshot.averageAccuracy >= 85) {
      lines.push(
        'Adaptive tutoring stance: keep hints concise, let the learner do more of the work, and use challenge-style follow-up questions.'
      );
    }
    appendCoachingFrameInstructions(lines, coachingFrame);

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
      coachingFrame,
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
      coachingFrame: null,
    };
  }
}

export async function buildKangurAiTutorAdaptiveInstructions(input: {
  learnerId: string;
  context?: KangurAiTutorConversationContext;
  registryBundle?: ContextRegistryResolutionBundle | null;
}): Promise<string> {
  const guidance = await buildKangurAiTutorAdaptiveGuidance(input);
  return guidance.instructions;
}
