import 'server-only';

import { getKangurAssignmentRepository, getKangurProgressRepository, getKangurScoreRepository } from '@/features/kangur/server';
import { resolveKangurAiTutorRuntimeDocuments } from '@/features/kangur/server/context-registry';
import { evaluateKangurAssignment } from '@/features/kangur/services/kangur-assignments';
import { KANGUR_LESSON_LIBRARY } from '@/features/kangur/settings';
import {
  buildKangurLearnerProfileSnapshot,
  buildLessonMasteryInsights,
  type KangurLearnerRecommendation,
  type KangurLessonMasteryInsight,
} from '@/features/kangur/ui/services/profile';
import type {
  ContextRegistryResolutionBundle,
  ContextRuntimeDocument,
} from '@/shared/contracts/ai-context-registry';
import type {
  KangurAssignmentSnapshot,
  KangurAssignmentProgressStatus,
  KangurLessonComponentId,
  KangurPracticeAssignmentOperation,
  KangurRoutePage,
} from '@/shared/contracts/kangur';
import type {
  KangurAiTutorConversationContext,
  KangurAiTutorCoachingFrame,
  KangurAiTutorCoachingMode,
  KangurAiTutorFollowUpAction,
  KangurAiTutorLearnerMemory,
} from '@/shared/contracts/kangur-ai-tutor';
import { ErrorSystem } from '@/shared/utils/observability/error-system';

import {
  appendCoachingFrameInstructions,
  buildKangurAiTutorCoachingFrame,
} from './ai-tutor-coaching-frame';

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
const LESSON_COMPONENT_IDS = new Set<KangurLessonComponentId>(
  Object.keys(KANGUR_LESSON_LIBRARY) as KangurLessonComponentId[]
);
const PRACTICE_OPERATION_TO_LESSON_COMPONENT: Partial<
  Record<KangurPracticeAssignmentOperation, KangurLessonComponentId>
> = {
  addition: 'adding',
  subtraction: 'subtracting',
  multiplication: 'multiplication',
  division: 'division',
  clock: 'clock',
};
const LESSON_COMPONENT_TO_PRACTICE_OPERATION: Partial<
  Record<KangurLessonComponentId, KangurPracticeAssignmentOperation>
> = {
  adding: 'addition',
  subtracting: 'subtraction',
  multiplication: 'multiplication',
  division: 'division',
  clock: 'clock',
};
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

type KangurCompletedFollowUp = {
  label: string;
  reason: string | null;
  page: KangurRoutePage | null;
};

type KangurLessonFocusCandidate = {
  componentId: KangurLessonComponentId;
  title: string | null;
};

const normalizeComparableValue = (value: string | null | undefined): string | null => {
  if (typeof value !== 'string') {
    return null;
  }

  const normalized = value.trim().toLowerCase();
  return normalized.length > 0 ? normalized : null;
};

const normalizeLessonComponentCandidate = (
  value: string | null | undefined
): KangurLessonComponentId | null => {
  const normalizedValue = normalizeComparableValue(value);
  if (!normalizedValue) {
    return null;
  }

  const withoutLessonPrefix = normalizedValue.startsWith('lesson-')
    ? normalizedValue.slice('lesson-'.length)
    : normalizedValue;
  if (LESSON_COMPONENT_IDS.has(withoutLessonPrefix as KangurLessonComponentId)) {
    return withoutLessonPrefix as KangurLessonComponentId;
  }

  return (
    PRACTICE_OPERATION_TO_LESSON_COMPONENT[
      withoutLessonPrefix as KangurPracticeAssignmentOperation
    ] ?? null
  );
};

const resolveLessonFocusTitle = (
  componentId: KangurLessonComponentId,
  preferredTitle?: string | null
): string => preferredTitle?.trim() || KANGUR_LESSON_LIBRARY[componentId].title;

const buildTrainingQueryFromLessonComponent = (
  componentId: KangurLessonComponentId,
  averageAccuracy: number
): Record<string, string> => {
  const operation = LESSON_COMPONENT_TO_PRACTICE_OPERATION[componentId];
  if (!operation) {
    return {
      quickStart: 'training',
    };
  }

  return {
    quickStart: 'operation',
    operation,
    difficulty: resolvePracticeDifficulty(averageAccuracy),
  };
};

const parseCompletedFollowUp = (
  memory: KangurAiTutorLearnerMemory | null | undefined
): KangurCompletedFollowUp | null => {
  const rawAction = memory?.lastRecommendedAction?.trim();
  if (rawAction?.startsWith('Completed follow-up:') !== true) {
    return null;
  }

  const payload = rawAction.slice('Completed follow-up:'.length).trim();
  if (!payload) {
    return null;
  }

  const separatorIndex = payload.indexOf(':');
  const label =
    separatorIndex === -1 ? payload.trim() : payload.slice(0, separatorIndex).trim();
  const reason =
    separatorIndex === -1 ? null : payload.slice(separatorIndex + 1).trim() || null;
  const normalizedLabel = normalizeComparableValue(label);
  if (!normalizedLabel) {
    return null;
  }

  const intervention = memory?.lastSuccessfulIntervention?.trim();
  const pageMatch = intervention?.match(
    /\bon (Game|Lessons|ParentDashboard|LearnerProfile)\.?$/u
  );
  const pageFromIntervention =
    pageMatch?.[1] === 'Game' ||
    pageMatch?.[1] === 'Lessons' ||
    pageMatch?.[1] === 'ParentDashboard' ||
    pageMatch?.[1] === 'LearnerProfile'
      ? pageMatch[1]
      : null;
  const inferredPage =
    pageFromIntervention ??
    (normalizedLabel === 'otwórz lekcje'
      ? 'Lessons'
      : normalizedLabel === 'uruchom trening' ||
          normalizedLabel === 'zagraj teraz' ||
          normalizedLabel === 'zagraj dziś' ||
          normalizedLabel === 'kontynuuj gre'
        ? 'Game'
        : null);

  return {
    label: normalizedLabel,
    reason: normalizeComparableValue(reason),
    page: inferredPage,
  };
};

const isCompletedFollowUpMatch = (
  completedFollowUp: KangurCompletedFollowUp | null,
  action: KangurAiTutorFollowUpAction | null | undefined
): boolean => {
  if (!completedFollowUp || !action) {
    return false;
  }

  const actionLabel = normalizeComparableValue(action.label);
  if (!actionLabel || actionLabel !== completedFollowUp.label) {
    return false;
  }

  if (!completedFollowUp.reason) {
    return true;
  }

  return normalizeComparableValue(action.reason) === completedFollowUp.reason;
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

const buildOrderedAssignmentCandidates = (
  assignments: KangurAssignmentSnapshot[],
  context: KangurAiTutorConversationContext | undefined
): KangurAssignmentSnapshot[] => {
  const relevantAssignment = pickRelevantAssignment(assignments, context);
  if (!relevantAssignment) {
    return assignments;
  }

  return [
    relevantAssignment,
    ...assignments.filter((assignment) => assignment.id !== relevantAssignment.id),
  ];
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

const toRecommendationFollowUpAction = (
  recommendation: KangurLearnerRecommendation
): KangurAiTutorFollowUpAction => ({
  id: `recommendation:${recommendation.id}`,
  label: recommendation.action.label,
  page: recommendation.action.page,
  query: recommendation.action.query,
  reason: recommendation.title,
});

const resolveLessonFocusFromAction = (
  action: KangurAiTutorFollowUpAction | null | undefined
): KangurLessonFocusCandidate | null => {
  const componentId = normalizeLessonComponentCandidate(action?.query?.['focus']);
  if (!componentId) {
    return null;
  }

  return {
    componentId,
    title: action?.reason?.trim() || null,
  };
};

const buildCompletedFollowUpBridgeAction = (input: {
  completedFollowUp: KangurCompletedFollowUp | null;
  lessonFocus: KangurLessonFocusCandidate | null;
  averageAccuracy: number;
}): KangurAiTutorFollowUpAction | null => {
  if (!input.completedFollowUp || !input.lessonFocus) {
    return null;
  }

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

const pickFreshCandidate = <T,>(
  candidates: T[],
  toAction: (candidate: T) => KangurAiTutorFollowUpAction | null,
  completedFollowUp: KangurCompletedFollowUp | null
): T | null => {
  for (const candidate of candidates) {
    const action = toAction(candidate);
    if (!action || isCompletedFollowUpMatch(completedFollowUp, action)) {
      continue;
    }

    return candidate;
  }

  return null;
};

const buildFollowUpActions = (input: {
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
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    deduped.push(action);
    if (input.coachingMode === 'next_best_action' || deduped.length >= 2) {
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

const resolveLessonFocusFromRegistry = (input: {
  context?: KangurAiTutorConversationContext;
  relevantWeakLesson: Record<string, unknown> | null;
  relevantAssignment: Record<string, unknown> | null;
  topRecommendation: Record<string, unknown> | null;
}): KangurLessonFocusCandidate | null => {
  const contextComponentId =
    normalizeLessonComponentCandidate(input.context?.focusId) ??
    normalizeLessonComponentCandidate(input.context?.contentId);
  if (contextComponentId) {
    return {
      componentId: contextComponentId,
      title: input.context?.title?.trim() || null,
    };
  }

  const weakLessonComponentId = normalizeLessonComponentCandidate(
    typeof input.relevantWeakLesson?.['componentId'] === 'string'
      ? String(input.relevantWeakLesson['componentId'])
      : null
  );
  if (weakLessonComponentId) {
    return {
      componentId: weakLessonComponentId,
      title:
        typeof input.relevantWeakLesson?.['title'] === 'string'
          ? String(input.relevantWeakLesson['title']).trim()
          : null,
    };
  }

  const assignmentFocus = resolveLessonFocusFromAction(
    toFollowUpActionFromItem(input.relevantAssignment, {
      idPrefix: 'assignment',
    })
  );
  if (assignmentFocus) {
    return assignmentFocus;
  }

  return resolveLessonFocusFromAction(
    toFollowUpActionFromItem(input.topRecommendation, {
      idPrefix: 'recommendation',
    })
  );
};

const resolveLessonFocusFromAdaptiveSnapshot = (input: {
  context?: KangurAiTutorConversationContext;
  relevantWeakLesson: KangurLessonMasteryInsight | null;
  relevantAssignment: KangurAssignmentSnapshot | null;
  topRecommendation: KangurLearnerRecommendation | null;
  averageAccuracy: number;
}): KangurLessonFocusCandidate | null => {
  const contextComponentId =
    normalizeLessonComponentCandidate(input.context?.focusId) ??
    normalizeLessonComponentCandidate(input.context?.contentId);
  if (contextComponentId) {
    return {
      componentId: contextComponentId,
      title: input.context?.title?.trim() || null,
    };
  }

  if (input.relevantWeakLesson) {
    const weakLessonComponentId = normalizeLessonComponentCandidate(
      input.relevantWeakLesson.componentId
    );
    if (weakLessonComponentId) {
      return {
        componentId: weakLessonComponentId,
        title: input.relevantWeakLesson.title,
      };
    }
  }

  const assignmentFocus = resolveLessonFocusFromAction(
    input.relevantAssignment
      ? toAssignmentFollowUpAction(input.relevantAssignment, input.averageAccuracy)
      : null
  );
  if (assignmentFocus) {
    return assignmentFocus;
  }

  return resolveLessonFocusFromAction(
    input.topRecommendation ? toRecommendationFollowUpAction(input.topRecommendation) : null
  );
};

const buildAdaptiveGuidanceFromRegistry = (input: {
  context?: KangurAiTutorConversationContext;
  registryBundle: ContextRegistryResolutionBundle;
  memory?: KangurAiTutorLearnerMemory | null;
}): KangurAiTutorAdaptiveGuidance => {
  const { learnerSnapshot, loginActivity, surfaceContext, assignmentContext } =
    resolveKangurAiTutorRuntimeDocuments(input.registryBundle, input.context);
  const weakLessons = readSectionItems(learnerSnapshot, 'weak_lessons');
  const recentSessions = readSectionItems(learnerSnapshot, 'recent_sessions');
  const recommendations = readSectionItems(learnerSnapshot, 'recommendations');
  const activeAssignments = readSectionItems(learnerSnapshot, 'active_assignments');
  const completedFollowUp = parseCompletedFollowUp(input.memory);
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
  const topRecommendation = pickFreshCandidate(
    recommendations,
    (item) =>
      toFollowUpActionFromItem(item, {
        idPrefix: 'recommendation',
      }),
    completedFollowUp
  );
  const relevantAssignment = pickFreshCandidate(
    [
      ...(assignmentContext ? [asRecord(assignmentContext.facts)] : []),
      ...activeAssignments,
    ].filter((item): item is Record<string, unknown> => Boolean(item)),
    (item) =>
      toFollowUpActionFromItem(item, {
        idPrefix: 'assignment',
      }),
    completedFollowUp
  );
  const averageAccuracy = readNumberFact(learnerSnapshot, 'averageAccuracy') ?? 0;
  const todayGames = readNumberFact(learnerSnapshot, 'todayGames') ?? 0;
  const todayXpEarned = readNumberFact(learnerSnapshot, 'todayXpEarned') ?? 0;
  const weeklyXpEarned = readNumberFact(learnerSnapshot, 'weeklyXpEarned') ?? 0;
  const dailyGoalGames = readNumberFact(learnerSnapshot, 'dailyGoalGames') ?? 0;
  const currentStreakDays = readNumberFact(learnerSnapshot, 'currentStreakDays') ?? 0;
  const learnerSummary = readStringFact(learnerSnapshot, 'learnerSummary');
  const learnerSignInCount7d = readNumberFact(loginActivity, 'learnerSignInCount7d');
  const parentLoginCount7d = readNumberFact(loginActivity, 'parentLoginCount7d');
  const assignmentSummary =
    (typeof relevantAssignment?.['assignmentSummary'] === 'string'
      ? String(relevantAssignment['assignmentSummary']).trim()
      : null) ?? readStringFact(surfaceContext, 'assignmentSummary');
  const lines: string[] = [];

  if (learnerSummary) {
    lines.push(`Adaptive learner snapshot: ${learnerSummary}`);
  } else {
    lines.push(
      `Adaptive learner snapshot: average accuracy ${averageAccuracy}%, daily goal ${todayGames}/${dailyGoalGames}, +${todayXpEarned} XP today, +${weeklyXpEarned} XP in the last 7 days, streak ${currentStreakDays} days.`
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
    const xpEarned =
      typeof latestSession['xpEarned'] === 'number' && Number.isFinite(latestSession['xpEarned'])
        ? Math.max(0, Math.round(latestSession['xpEarned']))
        : null;
    if (operationLabel && accuracyPercent !== null) {
      lines.push(
        xpEarned !== null
          ? `Most recent practice: ${operationLabel} at ${accuracyPercent}% accuracy for +${xpEarned} XP.`
          : `Most recent practice: ${operationLabel} at ${accuracyPercent}% accuracy.`
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
  const previousCoachingMode =
    input.context?.previousCoachingMode ?? input.memory?.lastCoachingMode ?? null;
  const coachingFrame = buildKangurAiTutorCoachingFrame({
    context: input.context,
    averageAccuracy,
    weakMasteryPercent,
    previousCoachingMode,
  });
  const bridgeAction = buildCompletedFollowUpBridgeAction({
    completedFollowUp,
    lessonFocus: resolveLessonFocusFromRegistry({
      context: input.context,
      relevantWeakLesson,
      relevantAssignment,
      topRecommendation,
    }),
    averageAccuracy,
  });
  const followUpActions =
    coachingFrame.mode === 'next_best_action' ||
    input.context?.interactionIntent === 'next_step' ||
    input.context?.interactionIntent === 'review'
      ? [
        bridgeAction,
        toFollowUpActionFromItem(relevantAssignment, {
          idPrefix: 'assignment',
        }),
        toFollowUpActionFromItem(topRecommendation, {
          idPrefix: 'recommendation',
        }),
      ]
        .filter((action): action is KangurAiTutorFollowUpAction => Boolean(action))
        .filter((action) => !isCompletedFollowUpMatch(completedFollowUp, action))
        .slice(0, coachingFrame.mode === 'next_best_action' ? 1 : 2)
      : [];
  const repeatedQuestionCount = input.context?.repeatedQuestionCount ?? 0;
  const recentHintRecoverySignal = input.context?.recentHintRecoverySignal ?? null;

  if (repeatedQuestionCount > 0) {
    lines.push(
      `Repeat signal: the learner has repeated essentially the same question ${repeatedQuestionCount + 1} times in this tutor thread, so change strategy instead of repeating the same hint.`
    );
  }
  if (recentHintRecoverySignal === 'answer_revealed') {
    lines.push(
      'Hint recovery signal: the learner reached review after the last hint. Consolidate the learning with reflection, one improvement, and one retry idea.'
    );
  } else if (recentHintRecoverySignal === 'focus_advanced') {
    lines.push(
      'Hint recovery signal: the learner advanced after the last hint. Acknowledge the progress and give one clear next step instead of restarting the same explanation.'
    );
  }
  if (previousCoachingMode && repeatedQuestionCount > 0) {
    lines.push(
      `Previous coaching mode was ${previousCoachingMode}, so do not reuse it unchanged while the learner is still stuck.`
    );
  }
  if (completedFollowUp) {
    lines.push(
      'Completed tutor follow-up in this thread: the learner already carried out the previous recommended action, so avoid repeating the same next step unless there is a clear new reason.'
    );
    if (bridgeAction) {
      lines.push(
        `Successful follow-up signal: build on that completion with one adjacent next move: ${bridgeAction.label}${bridgeAction.reason ? ` (${bridgeAction.reason})` : ''}.`
      );
    }
  }

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
      bridgeAction
        ? 'When suggesting the next step, build on the completed tutor follow-up and give exactly one adjacent Kangur action.'
        : relevantAssignment
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
  memory,
}: {
  learnerId: string;
  context?: KangurAiTutorConversationContext;
  registryBundle?: ContextRegistryResolutionBundle | null;
  memory?: KangurAiTutorLearnerMemory | null;
}): Promise<KangurAiTutorAdaptiveGuidance> {
  try {
    if (registryBundle?.documents.length) {
      return buildAdaptiveGuidanceFromRegistry({
        context,
        registryBundle,
        memory,
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
    const completedFollowUp = parseCompletedFollowUp(memory);
    const orderedAssignments = buildOrderedAssignmentCandidates(activeAssignments, context);

    const relevantWeakLesson = pickRelevantWeakLesson(masteryInsights.weakest, context);
    const topRecommendation = pickFreshCandidate(
      snapshot.recommendations,
      toRecommendationFollowUpAction,
      completedFollowUp
    );
    const relevantAssignment = pickFreshCandidate(
      orderedAssignments,
      (assignment) =>
        toAssignmentFollowUpAction(assignment, snapshot.averageAccuracy),
      completedFollowUp
    );
    const latestSession = snapshot.recentSessions[0] ?? null;
    const lines: string[] = [];
    const weakMasteryPercent = relevantWeakLesson?.masteryPercent ?? 100;
    const previousCoachingMode = context?.previousCoachingMode ?? memory?.lastCoachingMode ?? null;
    const coachingFrame = buildKangurAiTutorCoachingFrame({
      context,
      averageAccuracy: snapshot.averageAccuracy,
      weakMasteryPercent,
      previousCoachingMode,
    });
    const bridgeAction = buildCompletedFollowUpBridgeAction({
      completedFollowUp,
      lessonFocus: resolveLessonFocusFromAdaptiveSnapshot({
        context,
        relevantWeakLesson,
        relevantAssignment,
        topRecommendation,
        averageAccuracy: snapshot.averageAccuracy,
      }),
      averageAccuracy: snapshot.averageAccuracy,
    });
    const followUpActions = buildFollowUpActions({
      context,
      bridgeAction,
      relevantAssignment,
      topRecommendation,
      averageAccuracy: snapshot.averageAccuracy,
      coachingMode: coachingFrame.mode,
      completedFollowUp,
    });
    const repeatedQuestionCount = context?.repeatedQuestionCount ?? 0;
    const recentHintRecoverySignal = context?.recentHintRecoverySignal ?? null;

    lines.push(
      `Adaptive learner snapshot: average accuracy ${snapshot.averageAccuracy}%, daily goal ${snapshot.todayGames}/${snapshot.dailyGoalGames}, +${snapshot.todayXpEarned} XP today, +${snapshot.weeklyXpEarned} XP in the last 7 days, streak ${snapshot.currentStreakDays} days.`
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
        latestSession.xpEarned !== null
          ? `Most recent practice: ${latestSession.operationLabel} at ${latestSession.accuracyPercent}% accuracy for +${latestSession.xpEarned} XP.`
          : `Most recent practice: ${latestSession.operationLabel} at ${latestSession.accuracyPercent}% accuracy.`
      );
    }

    if (topRecommendation) {
      lines.push(`Top adaptive recommendation: ${formatRecommendation(topRecommendation)}`);
    }

    if (relevantAssignment) {
      lines.push(`Relevant active assignment: ${formatAssignmentSummary(relevantAssignment)}`);
    }

    if (repeatedQuestionCount > 0) {
      lines.push(
        `Repeat signal: the learner has repeated essentially the same question ${repeatedQuestionCount + 1} times in this tutor thread, so switch strategy instead of repeating the same hint.`
      );
    }
    if (recentHintRecoverySignal === 'answer_revealed') {
      lines.push(
        'Hint recovery signal: the learner reached review after the previous hint. Reflect on what happened, then name one specific adjustment.'
      );
    } else if (recentHintRecoverySignal === 'focus_advanced') {
      lines.push(
        'Hint recovery signal: the learner moved forward after the previous hint. Confirm the progress and point to one concrete next step.'
      );
    }
    if (previousCoachingMode && repeatedQuestionCount > 0) {
      lines.push(
        `Previous coaching mode was ${previousCoachingMode}, so avoid repeating it unchanged while the learner is still blocked.`
      );
    }
    if (completedFollowUp) {
      lines.push(
        'Completed tutor follow-up in this thread: the learner already carried out the previous recommended action, so avoid repeating the same next step unless there is a clear new reason.'
      );
      if (bridgeAction) {
        lines.push(
          `Successful follow-up signal: build on that completion with one adjacent next move: ${bridgeAction.label}${bridgeAction.reason ? ` (${bridgeAction.reason})` : ''}.`
        );
      }
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
        bridgeAction
          ? 'When suggesting the next step, build on the completed tutor follow-up and give exactly one adjacent Kangur action.'
          : relevantAssignment
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
