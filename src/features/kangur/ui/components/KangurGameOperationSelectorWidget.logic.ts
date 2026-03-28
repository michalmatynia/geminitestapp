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
} from '@/features/kangur/games';
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

export const resolveActivityRecommendationTarget = (
  activityKey: string | null | undefined,
  averageAccuracy: number
): KangurOperationSelectorRecommendationTarget | null => {
  if (!activityKey) {
    return null;
  }

  const parts = activityKey.split(':');
  const primary = (parts[1] ?? parts[0] ?? '').trim();
  if (!primary) {
    return null;
  }

  if (primary === 'calendar') {
    return { kind: 'screen', screen: 'calendar_quiz' };
  }
  if (
    primary === 'geometry' ||
    (primary.startsWith('geometry_') && primary !== 'geometry_shape_recognition')
  ) {
    return { kind: 'screen', screen: 'geometry_quiz' };
  }

  return resolveLessonRecommendationTarget(primary, averageAccuracy);
};

export const resolveActionRecommendationTarget = (
  action: KangurRouteAction | undefined,
  progress: KangurProgressState
): KangurOperationSelectorRecommendationTarget | null => {
  if (!action) {
    return null;
  }

  const averageAccuracy = getProgressAverageAccuracy(progress);
  if (action.page === 'Game') {
    const quickStart = action.query?.['quickStart'];
    if (quickStart === 'training') {
      return { kind: 'training' };
    }
    if (quickStart === 'screen') {
      const requestedScreen = action.query?.['screen'] ?? null;
      return isKangurGameScreen(requestedScreen)
        ? { kind: 'screen', screen: requestedScreen }
        : null;
    }
    if (quickStart === 'operation') {
      const requestedOperation = action.query?.['operation'] ?? null;
      const difficulty = action.query?.['difficulty'];
      if (requestedOperation === 'mixed') {
        return { kind: 'training' };
      }
      if (
        requestedOperation &&
        [
          'addition',
          'subtraction',
          'multiplication',
          'division',
          'decimals',
          'powers',
          'roots',
          'clock',
        ].includes(requestedOperation)
      ) {
        return {
          kind: 'operation',
          difficulty:
            difficulty === 'easy' || difficulty === 'medium' || difficulty === 'hard'
              ? (difficulty as KangurDifficulty)
              : resolveRecommendationDifficulty(averageAccuracy),
          operation: requestedOperation as KangurOperation,
        };
      }
    }
  }

  if (action.page === 'Lessons') {
    return resolveLessonRecommendationTarget(action.query?.['focus'], averageAccuracy);
  }

  return null;
};

export const getRecommendationActionLabel = (
  target: KangurOperationSelectorRecommendationTarget,
  fallbackCopy: OperationSelectorFallbackCopy,
  translate?: RecommendationTranslate
): string => {
  const operationLabels: Partial<Record<KangurOperation, { fallback: string; key: string }>> = {
    addition: { fallback: fallbackCopy.recommendation.actions.playAddition, key: 'operationSelector.actions.playAddition' },
    subtraction: { fallback: fallbackCopy.recommendation.actions.playSubtraction, key: 'operationSelector.actions.playSubtraction' },
    multiplication: { fallback: fallbackCopy.recommendation.actions.playMultiplication, key: 'operationSelector.actions.playMultiplication' },
    division: { fallback: fallbackCopy.recommendation.actions.playDivision, key: 'operationSelector.actions.playDivision' },
    clock: { fallback: fallbackCopy.recommendation.actions.playClock, key: 'operationSelector.actions.playClock' },
    mixed: { fallback: fallbackCopy.recommendation.actions.startMixedTraining, key: 'operationSelector.actions.startMixedTraining' },
    decimals: { fallback: fallbackCopy.recommendation.actions.playFractions, key: 'operationSelector.actions.playFractions' },
    powers: { fallback: fallbackCopy.recommendation.actions.playPowers, key: 'operationSelector.actions.playPowers' },
    roots: { fallback: fallbackCopy.recommendation.actions.playRoots, key: 'operationSelector.actions.playRoots' },
  };

  if (target.kind === 'training') {
    return translateRecommendationWithFallback(
      translate,
      'operationSelector.actions.startMixedTraining',
      fallbackCopy.recommendation.actions.startMixedTraining
    );
  }

  if (target.kind === 'screen') {
    if (target.screen === 'calendar_quiz') {
      return translateRecommendationWithFallback(
        translate,
        'operationSelector.actions.practiceCalendar',
        fallbackCopy.recommendation.actions.practiceCalendar
      );
    }
    if (target.screen === 'geometry_quiz') {
      return translateRecommendationWithFallback(
        translate,
        'operationSelector.actions.practiceGeometry',
        fallbackCopy.recommendation.actions.practiceGeometry
      );
    }
    if (target.screen === 'subtraction_quiz') {
      return translateRecommendationWithFallback(
        translate,
        'operationSelector.actions.practiceSubtraction',
        fallbackCopy.recommendation.actions.practiceSubtraction
      );
    }
    if (target.screen === 'division_quiz') {
      return translateRecommendationWithFallback(
        translate,
        'operationSelector.actions.practiceDivision',
        fallbackCopy.recommendation.actions.practiceDivision
      );
    }
    if (target.screen === 'multiplication_quiz') {
      return translateRecommendationWithFallback(
        translate,
        'operationSelector.actions.practiceMultiplication',
        fallbackCopy.recommendation.actions.practiceMultiplication
      );
    }
    return translateRecommendationWithFallback(
      translate,
      'operationSelector.actions.playNow',
      fallbackCopy.recommendation.actions.playNow
    );
  }

  const operationLabel = operationLabels[target.operation];
  return operationLabel
    ? translateRecommendationWithFallback(translate, operationLabel.key, operationLabel.fallback)
    : translateRecommendationWithFallback(
        translate,
        'operationSelector.actions.playNow',
        fallbackCopy.recommendation.actions.playNow
      );
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
  const topActivity = getProgressTopActivities(progress, 1, progressLocalizer)[0] ?? null;
  const activityLabel = topActivity
    ? resolveLocalizedRecommendationActivityLabel({
        activityKey: topActivity.key,
        fallbackLabel: topActivity.label,
        translate,
      })
    : null;

  if (!track?.nextBadge) {
    return null;
  }

  const target =
    resolveActivityRecommendationTarget(
      topActivity?.key,
      topActivity?.averageAccuracy ?? getProgressAverageAccuracy(progress)
    ) ?? ({ kind: 'training' } as const);

  return finalizeRecommendation({
    accent: 'violet',
    description: topActivity
      ? translateRecommendationWithFallback(
          translate,
          'operationSelector.track.descriptionWithActivity',
          fallbackCopy.recommendation.track.descriptionWithActivity(
            track.label,
            activityLabel?.toLowerCase() ?? ''
          ),
          {
            activity: activityLabel?.toLowerCase() ?? '',
            track: track.label,
          }
        )
      : translateRecommendationWithFallback(
          translate,
          'operationSelector.track.descriptionDefault',
          fallbackCopy.recommendation.track.descriptionDefault(track.label),
          { track: track.label }
        ),
    label: translateRecommendationWithFallback(
      translate,
      'operationSelector.track.label',
      fallbackCopy.recommendation.track.label
    ),
    target,
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

  const topActivity = getProgressTopActivities(progress, 1, progressLocalizer)[0] ?? null;
  const activityLabel = topActivity
    ? resolveLocalizedRecommendationActivityLabel({
        activityKey: topActivity.key,
        fallbackLabel: topActivity.label,
        translate,
      })
    : null;
  const target =
    resolveActivityRecommendationTarget(
      topActivity?.key,
      topActivity?.averageAccuracy ?? getProgressAverageAccuracy(progress)
    ) ?? ({ kind: 'training' } as const);

  return finalizeRecommendation({
    accent: 'sky',
    description: topActivity
      ? translateRecommendationWithFallback(
          translate,
          'operationSelector.guided.descriptionWithActivity',
          fallbackCopy.recommendation.guided.descriptionWithActivity(
            guidedMomentum.summary,
            activityLabel?.toLowerCase() ?? '',
            guidedMomentum.nextBadgeName
          ),
          {
            activity: activityLabel?.toLowerCase() ?? '',
            nextBadgeName: guidedMomentum.nextBadgeName,
            summary: guidedMomentum.summary,
          }
        )
      : translateRecommendationWithFallback(
          translate,
          'operationSelector.guided.descriptionDefault',
          fallbackCopy.recommendation.guided.descriptionDefault(
            guidedMomentum.summary,
            guidedMomentum.nextBadgeName
          ),
          {
            nextBadgeName: guidedMomentum.nextBadgeName,
            summary: guidedMomentum.summary,
          }
        ),
    label: translateRecommendationWithFallback(
      translate,
      'operationSelector.guided.label',
      fallbackCopy.recommendation.guided.label
    ),
    target,
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

export const getOperationSelectorRecommendation = (
  progress: KangurProgressState,
  quest: KangurDailyQuestState | null,
  fallbackCopy: OperationSelectorFallbackCopy,
  localizer?: KangurRecommendationLocalizer
): KangurOperationSelectorRecommendation | null =>
  getQuestRecommendation(quest, progress, fallbackCopy, localizer?.translate) ??
  getWeakestLessonRecommendation(progress, fallbackCopy, localizer) ??
  getGuidedRecommendation(progress, fallbackCopy, localizer?.translate, localizer?.progressTranslate) ??
  getTrackRecommendation(progress, fallbackCopy, localizer?.translate, localizer?.progressTranslate) ??
  getFallbackRecommendation(progress, fallbackCopy, localizer?.translate, localizer?.progressTranslate);
