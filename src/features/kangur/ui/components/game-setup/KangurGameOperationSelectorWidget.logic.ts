import {
  KANGUR_LESSON_LIBRARY,
} from '@/features/kangur/settings';
import { getLocalizedKangurLessonTitle } from '@/features/kangur/lessons/lesson-catalog-i18n';
import {
  type KangurRecommendationLocalizer,
  resolveLocalizedRecommendationActivityLabel,
  translateRecommendationWithFallback,
  type RecommendationTranslate,
} from '@/features/kangur/ui/services/recommendation-i18n';
import { getKangurLaunchableGameScreenForLessonComponent } from '@/features/kangur/ui/services/game-launch';
import {
  getProgressAverageAccuracy,
  getProgressBadgeTrackSummaries,
  getProgressTopActivities,
  getRecommendedSessionMomentum,
} from '@/features/kangur/ui/services/progress';
import type { KangurProgressTranslate } from '@/features/kangur/ui/services/progress-i18n';
import type {
  KangurDifficulty,
  KangurGameScreen,
  KangurOperation,
  KangurProgressState,
} from '@/features/kangur/ui/types';
import { isKangurGameScreen } from '@/features/kangur/ui/context/KangurGameRuntimeContext.shared';
import type {
  KangurLessonComponentId,
  KangurRouteAction,
} from '@/features/kangur/shared/contracts/kangur';
import type { KangurDailyQuestState } from '@/features/kangur/shared/contracts/kangur-quests';
import type {
  OperationSelectorFallbackCopy,
  KangurOperationSelectorRecommendationTarget,
  KangurOperationSelectorRecommendation,
} from './KangurGameOperationSelectorWidget.types';

export const OPERATION_LESSON_QUIZ_SCREENS: Partial<Record<KangurOperation, KangurGameScreen>> = {
  addition: 'addition_quiz',
  subtraction: 'subtraction_quiz',
  multiplication: 'multiplication_quiz',
  division: 'division_quiz',
  clock: 'clock_quiz',
};

const LESSON_COMPONENT_OPERATION_TARGETS: Partial<Record<KangurLessonComponentId, KangurOperation>> =
  {
    clock: 'clock',
    adding: 'addition',
    subtracting: 'subtraction',
    multiplication: 'multiplication',
    division: 'division',
  };

const KANGUR_RECOMMENDED_OPERATIONS = new Set<KangurOperation>([
  'addition',
  'subtraction',
  'multiplication',
  'division',
  'decimals',
  'powers',
  'roots',
  'clock',
]);

type RecommendationActionDescriptor = {
  fallback: string;
  key: string;
};

type OperationSelectorTopActivity = ReturnType<typeof getProgressTopActivities>[number];

type OperationSelectorTopActivityContext = {
  activity: OperationSelectorTopActivity | null;
  activityLabel: string | null;
  normalizedActivityLabel: string;
  target: KangurOperationSelectorRecommendationTarget;
};

const resolveRecommendationTopActivity = (
  progress: KangurProgressState,
  progressTranslate?: KangurProgressTranslate
): OperationSelectorTopActivity | null =>
  getProgressTopActivities(progress, 1, { translate: progressTranslate })[0] ?? null;

const resolveRecommendationTopActivityLabel = (
  activity: OperationSelectorTopActivity | null,
  translate?: RecommendationTranslate
): string | null =>
  activity
    ? resolveLocalizedRecommendationActivityLabel({
        activityKey: activity.key,
        fallbackLabel: activity.label,
        translate,
      })
    : null;

const resolveRecommendationTopActivityTarget = (
  progress: KangurProgressState,
  activity: OperationSelectorTopActivity | null
): KangurOperationSelectorRecommendationTarget =>
  resolveActivityRecommendationTarget(
    activity?.key,
    activity?.averageAccuracy ?? getProgressAverageAccuracy(progress)
  ) ?? { kind: 'training' };

export const resolveRecommendationDifficulty = (accuracy: number): KangurDifficulty => {
  if (accuracy >= 85) {
    return 'hard';
  }
  if (accuracy >= 70) {
    return 'medium';
  }
  return 'easy';
};

export const resolveLessonRecommendationTarget = (
  componentId: string | null | undefined,
  averageAccuracy: number
): KangurOperationSelectorRecommendationTarget | null => {
  if (!componentId) {
    return null;
  }

  const difficulty = resolveRecommendationDifficulty(averageAccuracy);

  const operationTarget =
    LESSON_COMPONENT_OPERATION_TARGETS[componentId as KangurLessonComponentId] ?? null;
  if (operationTarget) {
    return { kind: 'operation', difficulty, operation: operationTarget };
  }

  const launchScreen = getKangurLaunchableGameScreenForLessonComponent(
    componentId as KangurLessonComponentId
  );
  if (launchScreen) {
    return { kind: 'screen', screen: launchScreen };
  }

  return { kind: 'training' };
};

const isGeometryActivityRecommendationKey = (primary: string): boolean =>
  primary === 'geometry' ||
  (primary.startsWith('geometry_') && primary !== 'geometry_shape_recognition');

const resolveActivityRecommendationPrimary = (
  activityKey: string | null | undefined
): string | null => {
  if (!activityKey) {
    return null;
  }

  const parts = activityKey.split(':');
  const primary = (parts[1] ?? parts[0] ?? '').trim();

  return primary.length > 0 ? primary : null;
};

const resolveActivityQuizScreenTarget = (
  primary: string
): KangurOperationSelectorRecommendationTarget | null => {
  if (primary === 'calendar') {
    return { kind: 'screen', screen: 'calendar_quiz' };
  }

  if (isGeometryActivityRecommendationKey(primary)) {
    return { kind: 'screen', screen: 'geometry_quiz' };
  }

  return null;
};

export const resolveActivityRecommendationTarget = (
  activityKey: string | null | undefined,
  averageAccuracy: number
): KangurOperationSelectorRecommendationTarget | null => {
  const primary = resolveActivityRecommendationPrimary(activityKey);
  if (!primary) {
    return null;
  }

  const screenTarget = resolveActivityQuizScreenTarget(primary);
  if (screenTarget) {
    return screenTarget;
  }

  return resolveLessonRecommendationTarget(primary, averageAccuracy);
};

const resolveRequestedGameScreenTarget = (
  requestedScreen: string | null | undefined
): KangurOperationSelectorRecommendationTarget | null =>
  isKangurGameScreen(requestedScreen) ? { kind: 'screen', screen: requestedScreen } : null;

const isRecommendedOperation = (
  requestedOperation: string | null | undefined
): requestedOperation is KangurOperation =>
  Boolean(requestedOperation) && KANGUR_RECOMMENDED_OPERATIONS.has(requestedOperation as KangurOperation);

const resolveRequestedOperationDifficulty = (
  difficulty: string | null | undefined,
  averageAccuracy: number
): KangurDifficulty =>
  difficulty === 'easy' || difficulty === 'medium' || difficulty === 'hard'
    ? difficulty
    : resolveRecommendationDifficulty(averageAccuracy);

const resolveRequestedOperationTarget = (
  requestedOperation: string | null | undefined,
  difficulty: string | null | undefined,
  averageAccuracy: number
): KangurOperationSelectorRecommendationTarget | null => {
  if (requestedOperation === 'mixed') {
    return { kind: 'training' };
  }

  if (!isRecommendedOperation(requestedOperation)) {
    return null;
  }

  return {
    kind: 'operation',
    difficulty: resolveRequestedOperationDifficulty(difficulty, averageAccuracy),
    operation: requestedOperation,
  };
};

const resolveGameActionQuickStartTarget = (
  query: NonNullable<KangurRouteAction['query']>,
  averageAccuracy: number
): KangurOperationSelectorRecommendationTarget | null => {
  const quickStart = query['quickStart'];

  if (quickStart === 'training') {
    return { kind: 'training' };
  }

  if (quickStart === 'screen') {
    return resolveRequestedGameScreenTarget(query['screen'] ?? null);
  }

  if (quickStart === 'operation') {
    return resolveRequestedOperationTarget(
      query['operation'] ?? null,
      query['difficulty'],
      averageAccuracy
    );
  }

  return null;
};

const resolveGameActionRecommendationTarget = (
  action: KangurRouteAction,
  averageAccuracy: number
): KangurOperationSelectorRecommendationTarget | null =>
  resolveGameActionQuickStartTarget(action.query ?? {}, averageAccuracy);

export const resolveActionRecommendationTarget = (
  action: KangurRouteAction | undefined,
  progress: KangurProgressState
): KangurOperationSelectorRecommendationTarget | null => {
  if (!action) {
    return null;
  }

  const averageAccuracy = getProgressAverageAccuracy(progress);
  if (action.page === 'Game') {
    return resolveGameActionRecommendationTarget(action, averageAccuracy);
  }

  if (action.page === 'Lessons') {
    return resolveLessonRecommendationTarget(action.query?.['focus'], averageAccuracy);
  }

  return null;
};

const resolveRecommendationActionDescriptor = (
  target: KangurOperationSelectorRecommendationTarget,
  fallbackCopy: OperationSelectorFallbackCopy
): RecommendationActionDescriptor => {
  if (target.kind === 'training') {
    return {
      fallback: fallbackCopy.recommendation.actions.startMixedTraining,
      key: 'operationSelector.actions.startMixedTraining',
    };
  }

  if (target.kind === 'screen') {
    const screenDescriptors: Partial<Record<KangurGameScreen, RecommendationActionDescriptor>> = {
      calendar_quiz: {
        fallback: fallbackCopy.recommendation.actions.practiceCalendar,
        key: 'operationSelector.actions.practiceCalendar',
      },
      division_quiz: {
        fallback: fallbackCopy.recommendation.actions.practiceDivision,
        key: 'operationSelector.actions.practiceDivision',
      },
      geometry_quiz: {
        fallback: fallbackCopy.recommendation.actions.practiceGeometry,
        key: 'operationSelector.actions.practiceGeometry',
      },
      multiplication_quiz: {
        fallback: fallbackCopy.recommendation.actions.practiceMultiplication,
        key: 'operationSelector.actions.practiceMultiplication',
      },
      subtraction_quiz: {
        fallback: fallbackCopy.recommendation.actions.practiceSubtraction,
        key: 'operationSelector.actions.practiceSubtraction',
      },
    };

    return (
      screenDescriptors[target.screen] ?? {
        fallback: fallbackCopy.recommendation.actions.playNow,
        key: 'operationSelector.actions.playNow',
      }
    );
  }

  const operationDescriptors: Partial<Record<KangurOperation, RecommendationActionDescriptor>> = {
    addition: {
      fallback: fallbackCopy.recommendation.actions.playAddition,
      key: 'operationSelector.actions.playAddition',
    },
    subtraction: {
      fallback: fallbackCopy.recommendation.actions.playSubtraction,
      key: 'operationSelector.actions.playSubtraction',
    },
    multiplication: {
      fallback: fallbackCopy.recommendation.actions.playMultiplication,
      key: 'operationSelector.actions.playMultiplication',
    },
    division: {
      fallback: fallbackCopy.recommendation.actions.playDivision,
      key: 'operationSelector.actions.playDivision',
    },
    clock: {
      fallback: fallbackCopy.recommendation.actions.playClock,
      key: 'operationSelector.actions.playClock',
    },
    mixed: {
      fallback: fallbackCopy.recommendation.actions.startMixedTraining,
      key: 'operationSelector.actions.startMixedTraining',
    },
    decimals: {
      fallback: fallbackCopy.recommendation.actions.playFractions,
      key: 'operationSelector.actions.playFractions',
    },
    powers: {
      fallback: fallbackCopy.recommendation.actions.playPowers,
      key: 'operationSelector.actions.playPowers',
    },
    roots: {
      fallback: fallbackCopy.recommendation.actions.playRoots,
      key: 'operationSelector.actions.playRoots',
    },
  };

  return (
    operationDescriptors[target.operation] ?? {
      fallback: fallbackCopy.recommendation.actions.playNow,
      key: 'operationSelector.actions.playNow',
    }
  );
};

export const getRecommendationActionLabel = (
  target: KangurOperationSelectorRecommendationTarget,
  fallbackCopy: OperationSelectorFallbackCopy,
  translate?: RecommendationTranslate
): string => {
  const descriptor = resolveRecommendationActionDescriptor(target, fallbackCopy);

  return translateRecommendationWithFallback(translate, descriptor.key, descriptor.fallback);
};

export const finalizeRecommendation = (
  draft: Omit<
    KangurOperationSelectorRecommendation,
    'actionLabel' | 'recommendedOperation' | 'recommendedScreen'
  >,
  fallbackCopy: OperationSelectorFallbackCopy,
  translate?: RecommendationTranslate
): KangurOperationSelectorRecommendation => ({
  ...draft,
  actionLabel: getRecommendationActionLabel(draft.target, fallbackCopy, translate),
  recommendedOperation: draft.target.kind === 'operation' ? draft.target.operation : null,
  recommendedScreen: draft.target.kind === 'screen' ? draft.target.screen : null,
});

export const getQuestRecommendation = (
  quest: KangurDailyQuestState | null,
  progress: KangurProgressState,
  fallbackCopy: OperationSelectorFallbackCopy,
  translate?: RecommendationTranslate
): KangurOperationSelectorRecommendation | null => {
  if (!quest?.assignment) {
    return null;
  }

  const target = resolveActionRecommendationTarget(quest.assignment.action, progress);
  if (!target) {
    return null;
  }

  return finalizeRecommendation({
    accent: quest.progress.status === 'completed' ? 'emerald' : 'indigo',
    description:
      quest.assignment.progressLabel ??
      quest.progress.summary ??
      quest.assignment.description,
    label:
      quest.assignment.questLabel ??
      translateRecommendationWithFallback(
        translate,
        'operationSelector.quest.label',
        fallbackCopy.recommendation.questLabel
      ),
    target,
    title: quest.assignment.title,
  }, fallbackCopy, translate);
};

export const getWeakestLessonRecommendation = (
  progress: KangurProgressState,
  fallbackCopy: OperationSelectorFallbackCopy,
  localizer?: KangurRecommendationLocalizer
): KangurOperationSelectorRecommendation | null => {
  const translate = localizer?.translate;
  const weakestLesson = Object.entries(progress.lessonMastery ?? {})
    .filter(([, entry]) => entry.attempts > 0 && entry.masteryPercent < 80)
    .sort((left, right) => left[1].masteryPercent - right[1].masteryPercent)[0];

  if (!weakestLesson) {
    return null;
  }

  const [componentId, entry] = weakestLesson;
  const lesson = KANGUR_LESSON_LIBRARY[componentId as KangurLessonComponentId];
  const target = resolveLessonRecommendationTarget(
    componentId,
    getProgressAverageAccuracy(progress)
  );
  if (!lesson || !target) {
    return null;
  }
  const lessonTitle = getLocalizedKangurLessonTitle(componentId, localizer?.locale, lesson.title);

  return finalizeRecommendation({
    accent: entry.masteryPercent < 60 ? 'rose' : 'amber',
    description: translateRecommendationWithFallback(
      translate,
      'operationSelector.weakestLesson.description',
      fallbackCopy.recommendation.weakestLesson.description(entry.masteryPercent),
      {
        masteryPercent: entry.masteryPercent,
      }
    ),
    label: translateRecommendationWithFallback(
      translate,
      'operationSelector.weakestLesson.label',
      fallbackCopy.recommendation.weakestLesson.label
    ),
    target,
    title: translateRecommendationWithFallback(
      translate,
      'operationSelector.weakestLesson.title',
      fallbackCopy.recommendation.weakestLesson.title(lessonTitle),
      { title: lessonTitle }
    ),
  }, fallbackCopy, translate);
};

const resolveRecommendationTopActivityContext = (
  progress: KangurProgressState,
  translate?: RecommendationTranslate,
  progressTranslate?: KangurProgressTranslate
): OperationSelectorTopActivityContext => {
  const activity = resolveRecommendationTopActivity(progress, progressTranslate);
  const activityLabel = resolveRecommendationTopActivityLabel(activity, translate);
  const target = resolveRecommendationTopActivityTarget(progress, activity);

  return {
    activity,
    activityLabel,
    normalizedActivityLabel: activityLabel?.toLowerCase() ?? '',
    target,
  };
};

const resolveTrackRecommendationDescription = (
  trackLabel: string,
  topActivityContext: OperationSelectorTopActivityContext,
  fallbackCopy: OperationSelectorFallbackCopy,
  translate?: RecommendationTranslate
): string =>
  topActivityContext.activity
    ? translateRecommendationWithFallback(
        translate,
        'operationSelector.track.descriptionWithActivity',
        fallbackCopy.recommendation.track.descriptionWithActivity(
          trackLabel,
          topActivityContext.normalizedActivityLabel
        ),
        {
          activity: topActivityContext.normalizedActivityLabel,
          track: trackLabel,
        }
      )
    : translateRecommendationWithFallback(
        translate,
        'operationSelector.track.descriptionDefault',
        fallbackCopy.recommendation.track.descriptionDefault(trackLabel),
        { track: trackLabel }
      );

const resolveGuidedRecommendationDescription = (
  summary: string,
  nextBadgeName: string,
  topActivityContext: OperationSelectorTopActivityContext,
  fallbackCopy: OperationSelectorFallbackCopy,
  translate?: RecommendationTranslate
): string =>
  topActivityContext.activity
    ? translateRecommendationWithFallback(
        translate,
        'operationSelector.guided.descriptionWithActivity',
        fallbackCopy.recommendation.guided.descriptionWithActivity(
          summary,
          topActivityContext.normalizedActivityLabel,
          nextBadgeName
        ),
        {
          activity: topActivityContext.normalizedActivityLabel,
          nextBadgeName,
          summary,
        }
      )
    : translateRecommendationWithFallback(
        translate,
        'operationSelector.guided.descriptionDefault',
        fallbackCopy.recommendation.guided.descriptionDefault(summary, nextBadgeName),
        {
          nextBadgeName,
          summary,
        }
      );

export const getTrackRecommendation = (
  progress: KangurProgressState,
  fallbackCopy: OperationSelectorFallbackCopy,
  translate?: RecommendationTranslate,
  progressTranslate?: KangurProgressTranslate
): KangurOperationSelectorRecommendation | null => {
  const progressLocalizer = { translate: progressTranslate };
  const track =
    getProgressBadgeTrackSummaries(progress, { maxTracks: 6 }, progressLocalizer).find(
      (entry) =>
        Boolean(entry.nextBadge) && (entry.unlockedCount > 0 || entry.progressPercent >= 40)
    ) ?? null;

  if (!track?.nextBadge) {
    return null;
  }

  const topActivityContext = resolveRecommendationTopActivityContext(
    progress,
    translate,
    progressTranslate
  );

  return finalizeRecommendation({
    accent: 'violet',
    description: resolveTrackRecommendationDescription(
      track.label,
      topActivityContext,
      fallbackCopy,
      translate
    ),
    label: translateRecommendationWithFallback(
      translate,
      'operationSelector.track.label',
      fallbackCopy.recommendation.track.label
    ),
    target: topActivityContext.target,
    title: translateRecommendationWithFallback(
      translate,
      'operationSelector.track.title',
      fallbackCopy.recommendation.track.title(track.label),
      { track: track.label }
    ),
  }, fallbackCopy, translate);
};

export const getGuidedRecommendation = (
  progress: KangurProgressState,
  fallbackCopy: OperationSelectorFallbackCopy,
  translate?: RecommendationTranslate,
  progressTranslate?: KangurProgressTranslate
): KangurOperationSelectorRecommendation | null => {
  const progressLocalizer = { translate: progressTranslate };
  const guidedMomentum = getRecommendedSessionMomentum(progress, progressLocalizer);
  if (guidedMomentum.completedSessions <= 0 || !guidedMomentum.nextBadgeName) {
    return null;
  }

  const topActivityContext = resolveRecommendationTopActivityContext(
    progress,
    translate,
    progressTranslate
  );

  return finalizeRecommendation({
    accent: 'sky',
    description: resolveGuidedRecommendationDescription(
      guidedMomentum.summary,
      guidedMomentum.nextBadgeName,
      topActivityContext,
      fallbackCopy,
      translate
    ),
    label: translateRecommendationWithFallback(
      translate,
      'operationSelector.guided.label',
      fallbackCopy.recommendation.guided.label
    ),
    target: topActivityContext.target,
    title: translateRecommendationWithFallback(
      translate,
      'operationSelector.guided.title',
      fallbackCopy.recommendation.guided.title(guidedMomentum.nextBadgeName),
      { nextBadgeName: guidedMomentum.nextBadgeName }
    ),
  }, fallbackCopy, translate);
};

export const getFallbackRecommendation = (
  progress: KangurProgressState,
  fallbackCopy: OperationSelectorFallbackCopy,
  translate?: RecommendationTranslate,
  progressTranslate?: KangurProgressTranslate
): KangurOperationSelectorRecommendation | null => {
  const topActivity = getProgressTopActivities(progress, 1, { translate: progressTranslate })[0] ?? null;
  if (!topActivity) {
    return null;
  }
  const activityLabel = resolveLocalizedRecommendationActivityLabel({
    activityKey: topActivity.key,
    fallbackLabel: topActivity.label,
    translate,
  });

  const target =
    resolveActivityRecommendationTarget(topActivity.key, topActivity.averageAccuracy) ??
    ({ kind: 'training' } as const);

  return finalizeRecommendation({
    accent: 'indigo',
    description: translateRecommendationWithFallback(
      translate,
      'operationSelector.fallback.description',
      fallbackCopy.recommendation.fallback.description(
        activityLabel,
        topActivity.averageXpPerSession
      ),
      {
        activity: activityLabel,
        averageXpPerSession: topActivity.averageXpPerSession,
      }
    ),
    label: translateRecommendationWithFallback(
      translate,
      'operationSelector.fallback.label',
      fallbackCopy.recommendation.fallback.label
    ),
    target,
    title: translateRecommendationWithFallback(
      translate,
      'operationSelector.fallback.title',
      fallbackCopy.recommendation.fallback.title(activityLabel),
      { activity: activityLabel }
    ),
  }, fallbackCopy, translate);
};

const resolveFirstRecommendation = (
  recommendations: Array<KangurOperationSelectorRecommendation | null>
): KangurOperationSelectorRecommendation | null => {
  for (const recommendation of recommendations) {
    if (recommendation) {
      return recommendation;
    }
  }

  return null;
};

export const getOperationSelectorRecommendation = (
  progress: KangurProgressState,
  quest: KangurDailyQuestState | null,
  fallbackCopy: OperationSelectorFallbackCopy,
  localizer?: KangurRecommendationLocalizer
): KangurOperationSelectorRecommendation | null =>
  resolveFirstRecommendation([
    getQuestRecommendation(quest, progress, fallbackCopy, localizer?.translate),
    getWeakestLessonRecommendation(progress, fallbackCopy, localizer),
    getGuidedRecommendation(progress, fallbackCopy, localizer?.translate, localizer?.progressTranslate),
    getTrackRecommendation(progress, fallbackCopy, localizer?.translate, localizer?.progressTranslate),
    getFallbackRecommendation(progress, fallbackCopy, localizer?.translate, localizer?.progressTranslate),
  ]);
