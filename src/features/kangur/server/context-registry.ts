import 'server-only';
import {
  KANGUR_CONTEXT_ROOT_IDS,
  KANGUR_RUNTIME_ENTITY_TYPES,
} from '@/features/kangur/context-registry/refs';
import { parseKangurLessonDocumentStore, resolveKangurLessonDocumentPages, stripHtmlToText } from '@/features/kangur/lesson-documents';
import { listKangurLoginActivity } from '@/features/kangur/server/kangur-login-activity';
import { getKangurAssignmentRepository } from '@/features/kangur/services/kangur-assignment-repository';
import { evaluateKangurAssignment } from '@/features/kangur/services/kangur-assignments';
import { getKangurLearnerById } from '@/features/kangur/services/kangur-learner-repository';
import { getKangurProgressRepository } from '@/features/kangur/services/kangur-progress-repository';
import { getKangurScoreRepository } from '@/features/kangur/services/kangur-score-repository';
import {
  KANGUR_LESSON_DOCUMENTS_SETTING_KEY,
  KANGUR_LESSONS_SETTING_KEY,
  parseKangurLessons,
} from '@/features/kangur/settings';
import {
  hasFullyPublishedQuestionSetForSuite,
  getPublishedQuestionsForSuite,
  parseKangurTestQuestionStore,
} from '@/features/kangur/test-questions';
import { isLiveKangurTestSuite, parseKangurTestSuites } from '@/features/kangur/test-suites';
import {
  buildKangurLearnerProfileSnapshot,
  buildLessonMasteryInsights,
  type KangurLearnerProfileSnapshot,
  type KangurLearnerRecommendation,
  type KangurLessonMasteryInsight,
  type KangurRecentSession,
} from '@/features/kangur/ui/services/profile';
import type {
  ContextRegistryResolutionBundle,
  ContextRuntimeDocument,
} from '@/shared/contracts/ai-context-registry';
import type {
  KangurAssignmentSnapshot,
  KangurLesson,
  KangurLessonComponentId,
  KangurLessonDocument,
  KangurLessonMasteryEntry,
} from '@/shared/contracts/kangur';
import type { KangurAiTutorConversationContext } from '@/shared/contracts/kangur-ai-tutor';
import {
  KANGUR_TEST_QUESTIONS_SETTING_KEY,
  KANGUR_TEST_SUITES_SETTING_KEY,
} from '@/shared/contracts/kangur-tests';
import type { KangurTestQuestion, KangurTestQuestionStore, KangurTestSuite } from '@/shared/contracts/kangur-tests';
import { readStoredSettingValue } from '@/shared/lib/ai-brain/server';
const KANGUR_AI_TUTOR_DAILY_GOAL_GAMES = 3;
const KANGUR_AI_TUTOR_RECENT_SCORE_LIMIT = 24;
const QUICK_START_OPERATIONS = new Set([
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
type KangurRecommendationSectionItem = {
  id: string;
  title: string;
  description: string;
  priority: string;
  actionLabel: string;
  actionPage: string;
  actionQuery?: Record<string, string>;
};
type KangurAssignmentSectionItem = {
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
type KangurRegistryBaseData = {
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
const ASSIGNMENT_PRIORITY_ORDER = {
  high: 0,
  medium: 1,
  low: 2,
} as const;
const ASSIGNMENT_STATUS_ORDER = {
  not_started: 0,
  in_progress: 1,
  completed: 2,
} as const;
const readTrimmedString = (value: unknown): string | null => {
  if (typeof value !== 'string') {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};
const buildKangurTestResultSummaryFromContext = (
  context: KangurAiTutorConversationContext | null | undefined
): string | null => {
  if (context?.surface !== 'test') {
    return null;
  }

  const currentQuestion = readTrimmedString(context.currentQuestion);
  const questionId = readTrimmedString(context.questionId);
  if (currentQuestion || questionId || context.answerRevealed !== true) {
    return null;
  }

  return readTrimmedString(context.description);
};
const buildKangurTestReviewSummaryFromContext = (
  context: KangurAiTutorConversationContext | null | undefined
): string | null => {
  if (context?.surface !== 'test' || context.answerRevealed !== true) {
    return null;
  }

  const currentQuestion = readTrimmedString(context.currentQuestion);
  const questionId = readTrimmedString(context.questionId);
  if (!currentQuestion || !questionId) {
    return null;
  }

  return readTrimmedString(context.description);
};
const buildKangurTestSelectedChoiceFactsFromContext = (
  context: KangurAiTutorConversationContext | null | undefined
): {
  selectedChoiceLabel: string;
  selectedChoiceText?: string;
  selectedChoiceSummary: string;
} | null => {
  if (context?.surface !== 'test') {
    return null;
  }

  const selectedChoiceLabel = readTrimmedString(context.selectedChoiceLabel);
  if (!selectedChoiceLabel) {
    return null;
  }

  const selectedChoiceText = readTrimmedString(context.selectedChoiceText);
  return {
    selectedChoiceLabel,
    ...(selectedChoiceText ? { selectedChoiceText } : {}),
    selectedChoiceSummary: selectedChoiceText
      ? `Wybrana odpowiedź: ${selectedChoiceLabel} - ${selectedChoiceText}.`
      : `Wybrana odpowiedź: ${selectedChoiceLabel}.`,
  };
};
const truncate = (value: string, maxLength: number): string =>
  value.length > maxLength ? `${value.slice(0, maxLength - 3)}...` : value;
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
const resolvePracticeDifficulty = (averageAccuracy: number): 'easy' | 'medium' | 'hard' => {
  if (averageAccuracy >= 85) {
    return 'hard';
  }
  if (averageAccuracy >= 70) {
    return 'medium';
  }
  return 'easy';
};
const toAssignmentAction = (
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
const toRecommendationItem = (
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
const toAssignmentItem = (
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
const formatAssignmentSummary = (
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
const buildRecentSessionItem = (session: KangurRecentSession): Record<string, unknown> => ({
  id: session.id,
  operation: session.operation,
  operationLabel: session.operationLabel,
  accuracyPercent: session.accuracyPercent,
  score: session.score,
  totalQuestions: session.totalQuestions,
  createdAt: session.createdAt,
  ...(session.xpEarned !== null ? { xpEarned: session.xpEarned } : {}),
});
const buildWeakLessonItem = (lesson: KangurLessonMasteryInsight): Record<string, unknown> => ({
  componentId: lesson.componentId,
  title: lesson.title,
  masteryPercent: lesson.masteryPercent,
  attempts: lesson.attempts,
  bestScorePercent: lesson.bestScorePercent,
  lastScorePercent: lesson.lastScorePercent,
  lastCompletedAt: lesson.lastCompletedAt,
});
const buildOrderedLessonsForNavigation = (
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
const buildLessonNavigationSummary = (
  previousLesson: KangurLesson | null,
  nextLesson: KangurLesson | null
): string | null => {
  if (previousLesson && nextLesson) {
    return `Bez wracania do listy możesz cofnąć się do ${previousLesson.title} albo przejść dalej do ${nextLesson.title}.`;
  }
  if (previousLesson) {
    return `Bez wracania do listy możesz cofnąć się do ${previousLesson.title}.`;
  }
  if (nextLesson) {
    return `Bez wracania do listy możesz przejść dalej do ${nextLesson.title}.`;
  }
  return null;
};
const buildLoginActivitySummary = (input: {
  learnerDisplayName: string | null;
  parentLoginCount7d: number;
  learnerSignInCount7d: number;
  lastParentLoginAt: string | null;
  lastLearnerSignInAt: string | null;
}): string => {
  const learnerLabel = input.learnerDisplayName ?? 'This learner';
  const lines: string[] = [];
  if (input.lastLearnerSignInAt) {
    lines.push(`${learnerLabel} last signed into Kangur at ${input.lastLearnerSignInAt}.`);
  } else {
    lines.push(`No recent Kangur learner sign-in was recorded for ${learnerLabel}.`);
  }
  if (input.lastParentLoginAt) {
    lines.push(`The parent last logged into Kangur at ${input.lastParentLoginAt}.`);
  } else {
    lines.push('No recent Kangur parent login was recorded.');
  }
  lines.push(
    `In the last 7 days there were ${input.learnerSignInCount7d} learner sign-ins and ${input.parentLoginCount7d} parent Kangur logins.`
  );
  return lines.join(' ');
};
const buildLearnerSummary = (
  snapshot: KangurLearnerProfileSnapshot,
  activeAssignments: KangurAssignmentSnapshot[],
  masteryInsights: ReturnType<typeof buildLessonMasteryInsights>
): string =>
  [
    `Average accuracy ${snapshot.averageAccuracy}%.`,
    `Daily goal ${snapshot.todayGames}/${snapshot.dailyGoalGames}.`,
    `XP today +${snapshot.todayXpEarned}.`,
    `XP last 7 days +${snapshot.weeklyXpEarned}.`,
    `Current streak ${snapshot.currentStreakDays} days.`,
    `${activeAssignments.length} active assignments.`,
    `${masteryInsights.lessonsNeedingPractice} lessons need practice.`,
  ].join(' ');
const extractBlockSnippets = (block: KangurLessonDocument['blocks'][number]): string[] => {
  switch (block.type) {
    case 'text':
      return readTrimmedString(stripHtmlToText(block.html)) ? [stripHtmlToText(block.html)] : [];
    case 'svg':
      return [block.title, block.ttsDescription].filter((value): value is string => Boolean(readTrimmedString(value)));
    case 'image':
      return [block.title, block.caption, block.ttsDescription].filter((value): value is string =>
        Boolean(readTrimmedString(value))
      );
    case 'activity':
      return [block.title, block.description, block.ttsDescription].filter((value): value is string =>
        Boolean(readTrimmedString(value))
      );
    case 'callout':
      return [block.title, stripHtmlToText(block.html)].filter((value): value is string =>
        Boolean(readTrimmedString(value))
      );
    case 'quiz':
      return [
        block.question,
        ...block.choices.map((choice) => choice.text),
        block.explanation ?? '',
      ].filter((value): value is string => Boolean(readTrimmedString(value)));
    case 'grid':
      return block.items.flatMap((item) => extractBlockSnippets(item.block));
    default:
      return [];
  }
};
const buildLessonDocumentSnippets = (document: KangurLessonDocument | null | undefined): string[] => {
  if (!document) {
    return [];
  }
  const snippets = resolveKangurLessonDocumentPages(document).flatMap((page) => [
    page.sectionTitle ?? '',
    page.sectionDescription ?? '',
    page.title ?? '',
    page.description ?? '',
    ...page.blocks.flatMap((block) => extractBlockSnippets(block)),
  ]);
  const seen = new Set<string>();
  return snippets
    .map((snippet) => truncate(snippet.trim(), 260))
    .filter((snippet) => snippet.length > 0)
    .filter((snippet) => {
      if (seen.has(snippet)) {
        return false;
      }
      seen.add(snippet);
      return true;
    })
    .slice(0, 8);
};
const findRelevantLessonAssignment = (
  lesson: KangurLesson,
  assignments: KangurAssignmentSnapshot[],
  context?: Pick<KangurAiTutorConversationContext, 'assignmentId'>
): KangurAssignmentSnapshot | null => {
  if (context?.assignmentId) {
    const exact = assignments.find((assignment) => assignment.id === context.assignmentId);
    if (exact) {
      return exact;
    }
  }
  const active = assignments.find(
    (assignment) =>
      assignment.target.type === 'lesson' &&
      assignment.target.lessonComponentId === lesson.componentId &&
      assignment.progress.status !== 'completed'
  );
  if (active) {
    return active;
  }
  return (
    assignments.find(
      (assignment) =>
        assignment.target.type === 'lesson' &&
        assignment.target.lessonComponentId === lesson.componentId
    ) ?? null
  );
};
const buildQuestionChoiceItems = (
  question: KangurTestQuestion,
  answerRevealed: boolean
): Array<Record<string, unknown>> =>
  question.choices.map((choice) => ({
    label: choice.label,
    text: choice.text,
    ...(choice.description?.trim() ? { description: choice.description.trim() } : {}),
    ...(answerRevealed ? { isCorrect: choice.label === question.correctChoiceLabel } : {}),
  }));
const buildQuestionChoiceSummary = (question: KangurTestQuestion): string =>
  `Opcje odpowiedzi: ${question.choices
    .map((choice) =>
      [
        `${choice.label} - ${truncate(choice.text.trim(), 80)}`,
        choice.description?.trim() ? truncate(choice.description.trim(), 80) : null,
      ]
        .filter(Boolean)
        .join(': ')
    )
    .join('; ')}.`;
export const loadKangurRegistryBaseData = async (learnerId: string): Promise<KangurRegistryBaseData> => {
  const [
    learner,
    progressRepository,
    scoreRepository,
    assignmentRepository,
    rawLessons,
    rawLessonDocuments,
    rawTestSuites,
    rawTestQuestions,
  ] = await Promise.all([
    getKangurLearnerById(learnerId),
    getKangurProgressRepository(),
    getKangurScoreRepository(),
    getKangurAssignmentRepository(),
    readStoredSettingValue(KANGUR_LESSONS_SETTING_KEY),
    readStoredSettingValue(KANGUR_LESSON_DOCUMENTS_SETTING_KEY),
    readStoredSettingValue(KANGUR_TEST_SUITES_SETTING_KEY),
    readStoredSettingValue(KANGUR_TEST_QUESTIONS_SETTING_KEY),
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
  const lessons = parseKangurLessons(rawLessons);
  const lessonDocuments = parseKangurLessonDocumentStore(rawLessonDocuments);
  const testSuites = parseKangurTestSuites(rawTestSuites);
  const questionStore = parseKangurTestQuestionStore(rawTestQuestions);
  const snapshot = buildKangurLearnerProfileSnapshot({
    progress,
    scores,
    dailyGoalGames: KANGUR_AI_TUTOR_DAILY_GOAL_GAMES,
  });
  const evaluatedAssignments = assignments
    .map((assignment) =>
      evaluateKangurAssignment({
        assignment,
        progress,
        scores,
      })
    )
    .filter((assignment) => !assignment.archived)
    .sort(sortAssignments);
  return {
    learnerId,
    learnerDisplayName: learner?.displayName ?? null,
    ownerUserId: learner?.ownerUserId ?? null,
    progress,
    scores,
    snapshot,
    lessons,
    lessonsById: new Map(lessons.map((lesson) => [lesson.id, lesson])),
    lessonDocuments,
    testSuites,
    testSuitesById: new Map(testSuites.map((suite) => [suite.id, suite])),
    questionStore,
    evaluatedAssignments,
    activeAssignments: evaluatedAssignments.filter(
      (assignment) => assignment.progress.status !== 'completed'
    ),
    masteryInsights: buildLessonMasteryInsights(progress, 3),
  };
};
export const buildKangurLearnerSnapshotRuntimeDocument = async (input: {
  learnerId: string;
  data?: KangurRegistryBaseData;
}): Promise<ContextRuntimeDocument> => {
  const data = input.data ?? (await loadKangurRegistryBaseData(input.learnerId));
  const topRecommendation = data.snapshot.recommendations[0] ?? null;
  const summary = buildLearnerSummary(data.snapshot, data.activeAssignments, data.masteryInsights);
  return {
    id: `runtime:kangur:learner:${data.learnerId}`,
    kind: 'runtime_document',
    entityType: KANGUR_RUNTIME_ENTITY_TYPES.learnerSnapshot,
    title: data.learnerDisplayName
      ? `Kangur learner snapshot: ${data.learnerDisplayName}`
      : `Kangur learner snapshot: ${data.learnerId}`,
    summary,
    status: data.activeAssignments.length > 0 ? 'active' : 'ready',
    tags: ['kangur', 'learner', 'profile', 'ai-tutor'],
    relatedNodeIds: [...KANGUR_CONTEXT_ROOT_IDS.learnerSnapshot],
    timestamps: {
      updatedAt: data.snapshot.lastPlayedAt,
    },
    facts: {
      learnerId: data.learnerId,
      displayName: data.learnerDisplayName,
      averageAccuracy: data.snapshot.averageAccuracy,
      todayGames: data.snapshot.todayGames,
      todayXpEarned: data.snapshot.todayXpEarned,
      weeklyXpEarned: data.snapshot.weeklyXpEarned,
      averageXpPerSession: data.snapshot.averageXpPerSession,
      dailyGoalGames: data.snapshot.dailyGoalGames,
      currentStreakDays: data.snapshot.currentStreakDays,
      lessonsCompleted: data.snapshot.lessonsCompleted,
      activeAssignmentCount: data.activeAssignments.length,
      masteredLessons: data.masteryInsights.masteredLessons,
      lessonsNeedingPractice: data.masteryInsights.lessonsNeedingPractice,
      learnerSummary: summary,
      topRecommendationTitle: topRecommendation?.title ?? null,
      topRecommendationDescription: topRecommendation?.description ?? null,
      ...(topRecommendation
        ? {
          topRecommendationActionLabel: topRecommendation.action.label,
          topRecommendationActionPage: topRecommendation.action.page,
          ...(topRecommendation.action.query
            ? { topRecommendationActionQuery: topRecommendation.action.query }
            : {}),
        }
        : {}),
    },
    sections: [
      {
        id: 'recommendations',
        kind: 'items',
        title: 'Recommendations',
        items: data.snapshot.recommendations.slice(0, 3).map(toRecommendationItem),
      },
      {
        id: 'weak_lessons',
        kind: 'items',
        title: 'Weak lesson areas',
        items: data.masteryInsights.weakest.map(buildWeakLessonItem),
      },
      {
        id: 'recent_sessions',
        kind: 'items',
        title: 'Recent practice',
        items: data.snapshot.recentSessions.slice(0, 4).map(buildRecentSessionItem),
      },
      {
        id: 'operation_performance',
        kind: 'items',
        title: 'Performance by operation',
        items: data.snapshot.operationPerformance.slice(0, 6).map((operation) => ({
          operation: operation.operation,
          label: operation.label,
          emoji: operation.emoji,
          attempts: operation.attempts,
          averageAccuracy: operation.averageAccuracy,
          averageScore: operation.averageScore,
          bestScore: operation.bestScore,
          totalXpEarned: operation.totalXpEarned,
          averageXpPerSession: operation.averageXpPerSession,
        })),
      },
      {
        id: 'active_assignments',
        kind: 'items',
        title: 'Active assignments',
        items: data.activeAssignments.slice(0, 4).map((assignment) =>
          toAssignmentItem(assignment, data.snapshot.averageAccuracy)
        ),
      },
    ],
    provenance: {
      providerId: 'kangur',
      source: 'kangur-runtime-context',
    },
  };
};
export const buildKangurLoginActivityRuntimeDocument = async (input: {
  learnerId: string;
  data?: KangurRegistryBaseData;
}): Promise<ContextRuntimeDocument | null> => {
  const data = input.data ?? (await loadKangurRegistryBaseData(input.learnerId));
  if (!data.ownerUserId) {
    return null;
  }
  const activity = await listKangurLoginActivity({
    ownerUserId: data.ownerUserId,
    learnerId: data.learnerId,
  });
  const lastParentLoginAt = activity.lastParentLogin?.occurredAt ?? null;
  const lastLearnerSignInAt = activity.lastLearnerSignIn?.occurredAt ?? null;
  const summary = buildLoginActivitySummary({
    learnerDisplayName: data.learnerDisplayName,
    parentLoginCount7d: activity.parentLoginCount7d,
    learnerSignInCount7d: activity.learnerSignInCount7d,
    lastParentLoginAt,
    lastLearnerSignInAt,
  });
  return {
    id: `runtime:kangur:login-activity:${data.learnerId}`,
    kind: 'runtime_document',
    entityType: KANGUR_RUNTIME_ENTITY_TYPES.loginActivity,
    title: data.learnerDisplayName
      ? `Kangur login activity: ${data.learnerDisplayName}`
      : `Kangur login activity: ${data.learnerId}`,
    summary,
    status: activity.events.length > 0 ? 'active' : 'ready',
    tags: ['kangur', 'login', 'activity', 'ai-tutor'],
    relatedNodeIds: [...KANGUR_CONTEXT_ROOT_IDS.loginActivity],
    timestamps: {
      updatedAt: activity.events[0]?.occurredAt ?? null,
    },
    facts: {
      learnerId: data.learnerId,
      ownerUserId: data.ownerUserId,
      learnerDisplayName: data.learnerDisplayName,
      recentLoginActivitySummary: summary,
      lastParentKangurLoginAt: lastParentLoginAt,
      lastParentKangurLoginMethod: activity.lastParentLogin?.loginMethod ?? null,
      lastLearnerSignInAt,
      parentLoginCount7d: activity.parentLoginCount7d,
      learnerSignInCount7d: activity.learnerSignInCount7d,
    },
    sections: [
      {
        id: 'recent_login_activity',
        kind: 'items',
        title: 'Recent Kangur login activity',
        items: activity.events.map((event) => ({
          actorType: event.actorType,
          activityType: event.activityType,
          loginMethod: event.loginMethod,
          occurredAt: event.occurredAt,
          summary: event.summary,
        })),
      },
    ],
    provenance: {
      providerId: 'kangur',
      source: 'kangur-runtime-context',
    },
  };
};
export const buildKangurLessonContextRuntimeDocument = async (input: {
  learnerId: string;
  lessonId: string;
  context?: Pick<KangurAiTutorConversationContext, 'assignmentId'>;
  data?: KangurRegistryBaseData;
}): Promise<ContextRuntimeDocument | null> => {
  const data = input.data ?? (await loadKangurRegistryBaseData(input.learnerId));
  const lesson = data.lessonsById.get(input.lessonId) ?? null;
  if (!lesson) {
    return null;
  }
  const mastery: KangurLessonMasteryEntry | null =
    data.progress.lessonMastery[lesson.componentId] ?? null;
  const relevantAssignment = findRelevantLessonAssignment(lesson, data.evaluatedAssignments, input.context);
  const document = data.lessonDocuments[lesson.id] ?? null;
  const documentSnippets = buildLessonDocumentSnippets(document);
  const orderedLessons = buildOrderedLessonsForNavigation(data.lessons, data.evaluatedAssignments);
  const lessonIndex = orderedLessons.findIndex((candidate) => candidate.id === lesson.id);
  const previousLesson = lessonIndex > 0 ? orderedLessons[lessonIndex - 1] ?? null : null;
  const nextLesson =
    lessonIndex >= 0 && lessonIndex < orderedLessons.length - 1
      ? orderedLessons[lessonIndex + 1] ?? null
      : null;
  const navigationSummary = buildLessonNavigationSummary(previousLesson, nextLesson);
  const masterySummary = mastery
    ? `${lesson.title} mastery ${mastery.masteryPercent}% after ${mastery.attempts} attempts.`
    : `No mastery data yet for ${lesson.title}.`;
  const assignmentSummary = relevantAssignment
    ? formatAssignmentSummary(relevantAssignment, data.snapshot.averageAccuracy)
    : null;
  return {
    id: `runtime:kangur:lesson:${input.learnerId}:${input.lessonId}`,
    kind: 'runtime_document',
    entityType: KANGUR_RUNTIME_ENTITY_TYPES.lessonContext,
    title: lesson.title,
    summary: assignmentSummary ?? lesson.description,
    status: lesson.enabled ? 'active' : 'disabled',
    tags: ['kangur', 'lesson', 'ai-tutor'],
    relatedNodeIds: [...KANGUR_CONTEXT_ROOT_IDS.lessonContext],
    timestamps: {
      updatedAt: document?.updatedAt ?? mastery?.lastCompletedAt ?? null,
    },
    facts: {
      learnerId: input.learnerId,
      lessonId: lesson.id,
      lessonComponentId: lesson.componentId,
      title: lesson.title,
      description: lesson.description,
      masterySummary,
      ...(mastery
        ? {
          masteryPercent: mastery.masteryPercent,
          lessonAttempts: mastery.attempts,
          lessonCompletions: mastery.completions,
          lastCompletedAt: mastery.lastCompletedAt,
        }
        : {}),
      ...(assignmentSummary ? { assignmentSummary } : {}),
      ...(relevantAssignment
        ? {
          assignmentId: relevantAssignment.id,
          assignmentTitle: relevantAssignment.title,
          assignmentAction: toAssignmentAction(
            relevantAssignment,
            data.snapshot.averageAccuracy
          ),
        }
        : {}),
      ...(documentSnippets.length > 0
        ? { documentSummary: documentSnippets.join(' ') }
        : {}),
      ...(previousLesson
        ? {
          previousLessonId: previousLesson.id,
          previousLessonTitle: previousLesson.title,
        }
        : {}),
      ...(nextLesson
        ? {
          nextLessonId: nextLesson.id,
          nextLessonTitle: nextLesson.title,
        }
        : {}),
      ...(navigationSummary ? { navigationSummary } : {}),
    },
    sections: [
      {
        id: 'lesson_overview',
        kind: 'text',
        title: 'Lesson overview',
        text: [lesson.title, lesson.description].filter(Boolean).join('. '),
      },
      {
        id: 'lesson_mastery',
        kind: 'items',
        title: 'Lesson mastery',
        items: [
          {
            masteryPercent: mastery?.masteryPercent ?? null,
            attempts: mastery?.attempts ?? 0,
            completions: mastery?.completions ?? 0,
            lastCompletedAt: mastery?.lastCompletedAt ?? null,
          },
        ],
      },
      {
        id: 'lesson_assignment',
        kind: 'items',
        title: 'Related assignment',
        items: relevantAssignment
          ? [toAssignmentItem(relevantAssignment, data.snapshot.averageAccuracy)]
          : [],
      },
      {
        id: 'lesson_document',
        kind: 'text',
        title: 'Lesson content summary',
        text: documentSnippets.join('\n'),
      },
      {
        id: 'lesson_navigation',
        kind: 'items',
        title: 'Lesson navigation',
        items: [
          ...(previousLesson
            ? [
              {
                direction: 'previous',
                lessonId: previousLesson.id,
                lessonComponentId: previousLesson.componentId,
                title: previousLesson.title,
              },
            ]
            : []),
          ...(nextLesson
            ? [
              {
                direction: 'next',
                lessonId: nextLesson.id,
                lessonComponentId: nextLesson.componentId,
                title: nextLesson.title,
              },
            ]
            : []),
        ],
      },
    ],
    provenance: {
      providerId: 'kangur',
      source: 'kangur-runtime-context',
    },
  };
};
export const buildKangurTestContextRuntimeDocument = async (input: {
  learnerId: string;
  suiteId: string;
  questionId?: string | null;
  answerRevealed?: boolean;
  data?: KangurRegistryBaseData;
}): Promise<ContextRuntimeDocument | null> => {
  const data = input.data ?? (await loadKangurRegistryBaseData(input.learnerId));
  const suite = data.testSuitesById.get(input.suiteId) ?? null;
  if (!suite || !isLiveKangurTestSuite(suite)) {
    return null;
  }
  if (!hasFullyPublishedQuestionSetForSuite(data.questionStore, suite.id)) {
    return null;
  }
  const questions = getPublishedQuestionsForSuite(data.questionStore, suite.id);
  if (questions.length === 0) {
    return null;
  }
  const currentQuestion = input.questionId
    ? questions.find((question) => question.id === input.questionId) ?? null
    : null;
  const currentQuestionIndex = currentQuestion
    ? questions.findIndex((question) => question.id === currentQuestion.id)
    : -1;
  const questionProgressLabel =
    currentQuestionIndex >= 0
      ? `Pytanie ${currentQuestionIndex + 1}/${questions.length}`
      : `Ukończono ${questions.length}/${questions.length}`;
  const answerRevealed = input.answerRevealed ?? false;
  return {
    id: `runtime:kangur:test:${input.learnerId}:${suite.id}:${input.questionId?.trim() || 'summary'}:${answerRevealed ? 'revealed' : 'active'}`,
    kind: 'runtime_document',
    entityType: KANGUR_RUNTIME_ENTITY_TYPES.testContext,
    title: suite.title,
    summary:
      currentQuestion && currentQuestionIndex >= 0
        ? `Active test question ${currentQuestionIndex + 1}/${questions.length}.`
        : suite.description || `Finished test suite with ${questions.length} questions.`,
    status: currentQuestion ? 'in_progress' : 'summary',
    tags: ['kangur', 'test', 'ai-tutor'],
    relatedNodeIds: [...KANGUR_CONTEXT_ROOT_IDS.testContext],
    timestamps: undefined,
    facts: {
      learnerId: input.learnerId,
      suiteId: suite.id,
      title: suite.title,
      description: suite.description,
      questionId: currentQuestion?.id ?? null,
      currentQuestion: currentQuestion?.prompt ?? null,
      questionProgressLabel,
      answerRevealed,
      ...(currentQuestion
        ? {
          questionPointValue: currentQuestion.pointValue,
          questionChoicesSummary: buildQuestionChoiceSummary(currentQuestion),
        }
        : {}),
      ...(answerRevealed && currentQuestion
        ? {
          correctChoiceLabel: currentQuestion.correctChoiceLabel,
          correctChoiceText:
            currentQuestion.choices.find(
              (choice) => choice.label === currentQuestion.correctChoiceLabel
            )?.text ?? null,
        }
        : {}),
      ...(answerRevealed && currentQuestion?.explanation
        ? { revealedExplanation: currentQuestion.explanation }
        : {}),
    },
    sections: [
      {
        id: 'test_overview',
        kind: 'text',
        title: 'Test overview',
        text: [suite.title, suite.description].filter(Boolean).join('. '),
      },
      {
        id: 'current_question',
        kind: 'text',
        title: 'Current question',
        text: currentQuestion?.prompt ?? '',
      },
      {
        id: 'question_choices',
        kind: 'items',
        title: 'Question choices',
        items: currentQuestion ? buildQuestionChoiceItems(currentQuestion, answerRevealed) : [],
      },
      {
        id: 'question_review',
        kind: 'text',
        title: 'Question review',
        text:
          answerRevealed && currentQuestion
            ? [
              currentQuestion.explanation,
              `Correct choice: ${currentQuestion.correctChoiceLabel}.`,
            ]
              .filter(Boolean)
              .join(' ')
            : '',
      },
    ],
    provenance: {
      providerId: 'kangur',
      source: 'kangur-runtime-context',
    },
  };
};
export const buildKangurAssignmentContextRuntimeDocument = async (input: {
  learnerId: string;
  assignmentId: string;
  data?: KangurRegistryBaseData;
}): Promise<ContextRuntimeDocument | null> => {
  const data = input.data ?? (await loadKangurRegistryBaseData(input.learnerId));
  const assignment =
    data.evaluatedAssignments.find((entry) => entry.id === input.assignmentId) ?? null;
  if (!assignment) {
    return null;
  }
  const action = toAssignmentAction(assignment, data.snapshot.averageAccuracy);
  return {
    id: `runtime:kangur:assignment:${input.learnerId}:${input.assignmentId}`,
    kind: 'runtime_document',
    entityType: KANGUR_RUNTIME_ENTITY_TYPES.assignmentContext,
    title: assignment.title,
    summary: formatAssignmentSummary(assignment, data.snapshot.averageAccuracy),
    status: assignment.progress.status,
    tags: ['kangur', 'assignment', 'ai-tutor'],
    relatedNodeIds: [...KANGUR_CONTEXT_ROOT_IDS.assignmentContext],
    timestamps: {
      createdAt: assignment.createdAt,
      updatedAt: assignment.updatedAt,
      finishedAt: assignment.progress.completedAt,
    },
    facts: {
      learnerId: input.learnerId,
      assignmentId: assignment.id,
      title: assignment.title,
      description: assignment.description,
      priority: assignment.priority,
      targetType: assignment.target.type,
      progressSummary: assignment.progress.summary,
      assignmentSummary: formatAssignmentSummary(assignment, data.snapshot.averageAccuracy),
      ...action,
    },
    sections: [
      {
        id: 'assignment_progress',
        kind: 'items',
        title: 'Assignment progress',
        items: [
          {
            status: assignment.progress.status,
            percent: assignment.progress.percent,
            attemptsCompleted: assignment.progress.attemptsCompleted,
            attemptsRequired: assignment.progress.attemptsRequired,
            lastActivityAt: assignment.progress.lastActivityAt,
            completedAt: assignment.progress.completedAt,
          },
        ],
      },
      {
        id: 'assignment_action',
        kind: 'items',
        title: 'Suggested action',
        items: [
          {
            actionLabel: action.actionLabel,
            actionPage: action.actionPage,
            ...(action.actionQuery ? { actionQuery: action.actionQuery } : {}),
          },
        ],
      },
    ],
    provenance: {
      providerId: 'kangur',
      source: 'kangur-runtime-context',
    },
  };
};
const buildKangurGameSurfaceRuntimeDocument = (
  context: KangurAiTutorConversationContext | null | undefined
): ContextRuntimeDocument | null => {
  if (context?.surface !== 'game') {
    return null;
  }
  const contentId = readTrimmedString(context.contentId) ?? 'game';
  const questionId = readTrimmedString(context.questionId);
  const title = readTrimmedString(context.title) ?? 'Kangur game practice';
  const description = readTrimmedString(context.description);
  const masterySummary = readTrimmedString(context.masterySummary);
  const assignmentSummary = readTrimmedString(context.assignmentSummary);
  const assignmentId = readTrimmedString(context.assignmentId);
  const currentQuestion = readTrimmedString(context.currentQuestion);
  const questionProgressLabel = readTrimmedString(context.questionProgressLabel);
  const answerRevealed = context.answerRevealed ?? false;
  const summary =
    currentQuestion && questionProgressLabel
      ? `Active game question ${questionProgressLabel}.`
      : currentQuestion
        ? 'Active game question.'
        : assignmentSummary ?? description ?? title;
  return {
    id: `runtime:kangur:game:${contentId}:${questionId ?? 'summary'}:${answerRevealed ? 'revealed' : currentQuestion ? 'active' : 'summary'}`,
    kind: 'runtime_document',
    entityType: KANGUR_RUNTIME_ENTITY_TYPES.testContext,
    title,
    summary,
    status: currentQuestion ? (answerRevealed ? 'summary' : 'in_progress') : 'active',
    tags: ['kangur', 'game', 'ai-tutor'],
    relatedNodeIds: [
      'page:kangur-game',
      'action:kangur-ai-tutor-chat',
      'policy:kangur-ai-tutor-socratic',
      'policy:kangur-ai-tutor-test-guardrails',
    ],
    facts: {
      contentId,
      title,
      answerRevealed,
      ...(description ? { description } : {}),
      ...(masterySummary ? { masterySummary } : {}),
      ...(assignmentSummary ? { assignmentSummary } : {}),
      ...(assignmentId ? { assignmentId } : {}),
      ...(questionId ? { questionId } : {}),
      ...(currentQuestion ? { currentQuestion } : {}),
      ...(questionProgressLabel ? { questionProgressLabel } : {}),
    },
    sections: [
      {
        id: 'game_overview',
        kind: 'text',
        title: 'Game overview',
        text: [title, description, masterySummary, assignmentSummary].filter(Boolean).join('\n'),
      },
      {
        id: 'current_question',
        kind: 'text',
        title: 'Current question',
        text: currentQuestion ?? '',
      },
    ],
    provenance: {
      providerId: 'kangur',
      source: 'kangur-conversation-context',
    },
  };
};
const buildKangurTestSurfaceRuntimeDocument = (
  context: KangurAiTutorConversationContext | null | undefined
): ContextRuntimeDocument | null => {
  if (context?.surface !== 'test') {
    return null;
  }

  const contentId = readTrimmedString(context.contentId) ?? 'test';
  const questionId = readTrimmedString(context.questionId);
  const title = readTrimmedString(context.title) ?? 'Kangur test';
  const currentQuestion = readTrimmedString(context.currentQuestion);
  const questionProgressLabel = readTrimmedString(context.questionProgressLabel);
  const answerRevealed = context.answerRevealed ?? false;
  const resultSummary = buildKangurTestResultSummaryFromContext(context);
  const reviewSummary = buildKangurTestReviewSummaryFromContext(context);
  const selectedChoiceFacts = buildKangurTestSelectedChoiceFactsFromContext(context);
  const summary =
    currentQuestion && questionProgressLabel
      ? `Active test question ${questionProgressLabel}.`
      : currentQuestion
        ? 'Active test question.'
        : resultSummary ?? title;

  return {
    id: `runtime:kangur:test:${contentId}:${questionId ?? 'summary'}:${answerRevealed ? 'revealed' : currentQuestion ? 'active' : 'summary'}`,
    kind: 'runtime_document',
    entityType: KANGUR_RUNTIME_ENTITY_TYPES.testContext,
    title,
    summary,
    status: currentQuestion ? (answerRevealed ? 'summary' : 'in_progress') : 'summary',
    tags: ['kangur', 'test', 'ai-tutor'],
    relatedNodeIds: [...KANGUR_CONTEXT_ROOT_IDS.testContext],
    timestamps: undefined,
    facts: {
      contentId,
      title,
      answerRevealed,
      ...(questionId ? { questionId } : {}),
      ...(selectedChoiceFacts ?? {}),
      ...(currentQuestion ? { currentQuestion } : {}),
      ...(questionProgressLabel ? { questionProgressLabel } : {}),
      ...(reviewSummary ? { reviewSummary } : {}),
      ...(resultSummary ? { resultSummary } : {}),
    },
    sections: [
      {
        id: 'test_overview',
        kind: 'text',
        title: 'Test overview',
        text: [title, reviewSummary, resultSummary].filter(Boolean).join('\n'),
      },
    ],
    provenance: {
      providerId: 'kangur',
      source: 'kangur-conversation-context',
    },
  };
};
const augmentKangurTestSurfaceRuntimeDocument = (
  document: ContextRuntimeDocument | null,
  context: KangurAiTutorConversationContext | null | undefined
): ContextRuntimeDocument | null => {
  if (document?.entityType !== KANGUR_RUNTIME_ENTITY_TYPES.testContext) {
    return document ?? null;
  }

  const resultSummary = buildKangurTestResultSummaryFromContext(context);
  const reviewSummary = buildKangurTestReviewSummaryFromContext(context);
  const selectedChoiceFacts = buildKangurTestSelectedChoiceFactsFromContext(context);
  if (!resultSummary && !reviewSummary && !selectedChoiceFacts) {
    return document;
  }

  const sections = document.sections ?? [];
  const nextResultSection =
    resultSummary === null
      ? null
      : {
        id: 'test_result',
        kind: 'text' as const,
        title: 'Test result summary',
        text: resultSummary,
      };
  const sectionsWithResult =
    nextResultSection === null
      ? sections
      : (() => {
        const existingResultSectionIndex = sections.findIndex(
          (section) => section.id === 'test_result'
        );
        return existingResultSectionIndex >= 0
          ? sections.map((section, index) =>
            index === existingResultSectionIndex ? nextResultSection : section
          )
          : [...sections, nextResultSection];
      })();
  const existingReviewSectionIndex = sectionsWithResult.findIndex(
    (section) => section.id === 'question_review'
  );
  const nextReviewSection =
    reviewSummary === null
      ? null
      : {
        id: 'question_review',
        kind: 'text' as const,
        title: 'Question review',
        text:
          [
            reviewSummary,
            selectedChoiceFacts?.selectedChoiceSummary,
            readTrimmedString(document.facts?.['revealedExplanation']),
            readTrimmedString(document.facts?.['correctChoiceLabel'])
              ? `Correct choice: ${readTrimmedString(document.facts?.['correctChoiceLabel'])}.`
              : null,
          ]
            .filter(Boolean)
            .join(' ') || reviewSummary,
      };
  const mergedSections =
    nextReviewSection === null
      ? sectionsWithResult
      : existingReviewSectionIndex >= 0
        ? sectionsWithResult.map((section, index) =>
          index === existingReviewSectionIndex ? nextReviewSection : section
        )
        : [...sectionsWithResult, nextReviewSection];

  return {
    ...document,
    facts: {
      ...(document.facts ?? {}),
      ...(selectedChoiceFacts ?? {}),
      ...(reviewSummary ? { reviewSummary } : {}),
      ...(resultSummary ? { resultSummary } : {}),
    },
    sections: mergedSections,
  };
};
export const resolveKangurAiTutorRuntimeDocuments = (
  bundle: ContextRegistryResolutionBundle | null | undefined,
  context?: KangurAiTutorConversationContext | null
): {
  learnerSnapshot: ContextRuntimeDocument | null;
  loginActivity: ContextRuntimeDocument | null;
  surfaceContext: ContextRuntimeDocument | null;
  assignmentContext: ContextRuntimeDocument | null;
} => {
  const documents = bundle?.documents ?? [];
  const bundleSurfaceContext =
    documents.find(
      (document) =>
        document.entityType === KANGUR_RUNTIME_ENTITY_TYPES.lessonContext ||
        document.entityType === KANGUR_RUNTIME_ENTITY_TYPES.testContext
    ) ?? null;
  const fallbackSurfaceContext =
    buildKangurTestSurfaceRuntimeDocument(context) ?? buildKangurGameSurfaceRuntimeDocument(context);
  return {
    learnerSnapshot:
      documents.find((document) => document.entityType === KANGUR_RUNTIME_ENTITY_TYPES.learnerSnapshot) ??
      null,
    loginActivity:
      documents.find((document) => document.entityType === KANGUR_RUNTIME_ENTITY_TYPES.loginActivity) ??
      null,
    surfaceContext: augmentKangurTestSurfaceRuntimeDocument(
      bundleSurfaceContext ?? fallbackSurfaceContext,
      context
    ),
    assignmentContext:
      documents.find(
        (document) => document.entityType === KANGUR_RUNTIME_ENTITY_TYPES.assignmentContext
      ) ?? null,
  };
};
