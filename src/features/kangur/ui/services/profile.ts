import type { KangurScoreRecord } from '@kangur/platform';
import { getLocalizedKangurLessonTitle } from '@/features/kangur/lessons/lesson-catalog-i18n';
import { KANGUR_LESSON_LIBRARY } from '@/features/kangur/settings';
import type {
  KangurLearnerProfileSnapshot,
  KangurLearnerRecommendation,
  KangurLessonMasteryInsight,
  KangurLessonMasteryInsights,
  KangurOperationPerformance,
  KangurRecentSession,
  KangurWeeklyActivityPoint,
} from '@/features/kangur/shared/contracts/kangur-profile';
import {
  getCurrentLevel,
  getNextLevel,
  getProgressBadges,
  getProgressAverageAccuracy,
  getProgressBestAccuracy,
  getRecommendedSessionMomentum,
} from '@/features/kangur/ui/services/progress';
import type {
  KangurProgressState,
  KangurRouteAction,
} from '@/features/kangur/shared/contracts/kangur';
import { resolveKangurOperationFallbackInfo } from '@/features/kangur/ui/services/kangur-operation-fallbacks';
import {
  ACTIVITY_PRIMARY_TO_OPERATION,
  QUICK_START_OPERATIONS,
} from '@/features/kangur/ui/services/profile.constants';
import {
  getKangurLearnerProfileFallbackCopy,
  type KangurLearnerProfileFallbackCopy,
} from '@/features/kangur/ui/services/profile.copy';
import { normalizeSiteLocale } from '@/shared/lib/i18n/site-locale';

export type {
  KangurLearnerProfileSnapshot,
  KangurLearnerRecommendation,
  KangurLessonMasteryInsight,
  KangurLessonMasteryInsights,
  KangurOperationPerformance,
  KangurRecentSession,
  KangurWeeklyActivityPoint,
} from '@/features/kangur/shared/contracts/kangur-profile';

type KangurLearnerProfileTranslationValue = string | number;

export type KangurLearnerProfileTranslate = (
  key: string,
  values?: Record<string, KangurLearnerProfileTranslationValue>
) => string;

export const translateKangurLearnerProfileWithFallback = (
  translate: KangurLearnerProfileTranslate | undefined,
  key: string,
  fallback: string,
  values?: Record<string, KangurLearnerProfileTranslationValue>
): string => {
  if (!translate) {
    return fallback;
  }

  const translated = translate(key, values);
  return translated === key || translated.endsWith(`.${key}`) ? fallback : translated;
};

const DAY_IN_MS = 24 * 60 * 60 * 1000;

const toLocalDateKey = (date: Date): string => {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const parseDateOrNull = (raw: string): Date | null => {
  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const toDateAtLocalMidnight = (value: string): Date => {
  const [yearRaw, monthRaw, dayRaw] = value.split('-');
  const year = Number(yearRaw);
  const month = Number(monthRaw);
  const day = Number(dayRaw);
  return new Date(year, month - 1, day);
};

const toPercent = (value: number): number => Math.max(0, Math.min(100, Math.round(value)));
const resolvePracticeDifficulty = (averageAccuracy: number): 'easy' | 'medium' | 'hard' => {
  if (averageAccuracy >= 85) {
    return 'hard';
  }
  if (averageAccuracy >= 70) {
    return 'medium';
  }
  return 'easy';
};

const buildPracticeRecommendationAction = (
  operation: string | null,
  averageAccuracy: number,
  fallbackCopy: KangurLearnerProfileFallbackCopy,
  translate?: KangurLearnerProfileTranslate
): KangurRouteAction => {
  const startTrainingLabel = translateKangurLearnerProfileWithFallback(
    translate,
    'recommendations.actions.startTraining',
    fallbackCopy.actions.startTraining
  );

  if (!operation || !QUICK_START_OPERATIONS.has(operation)) {
    return {
      label: startTrainingLabel,
      page: 'Game',
      query: {
        quickStart: 'training',
      },
    };
  }

  return {
    label: startTrainingLabel,
    page: 'Game',
    query: {
      quickStart: 'operation',
      operation,
      difficulty: resolvePracticeDifficulty(averageAccuracy),
    },
  };
};

type BuildProfileSnapshotInput = {
  progress: KangurProgressState;
  scores: KangurScoreRecord[];
  dailyGoalGames: number;
  now?: Date | undefined;
  locale?: string | null | undefined;
  translate?: KangurLearnerProfileTranslate | undefined;
};

const normalizeScoresDesc = (scores: KangurScoreRecord[]): KangurScoreRecord[] =>
  [...scores].sort((left, right) => {
    const leftDate = parseDateOrNull(left.created_date);
    const rightDate = parseDateOrNull(right.created_date);
    const leftTs = leftDate?.getTime() ?? 0;
    const rightTs = rightDate?.getTime() ?? 0;
    return rightTs - leftTs;
  });

const computeStreaks = (
  scores: KangurScoreRecord[],
  now: Date
): {
  currentStreakDays: number;
  longestStreakDays: number;
  lastPlayedAt: string | null;
} => {
  if (scores.length === 0) {
    return { currentStreakDays: 0, longestStreakDays: 0, lastPlayedAt: null };
  }

  const uniqueDateKeys = Array.from(
    new Set(
      scores
        .map((score) => parseDateOrNull(score.created_date))
        .filter((date): date is Date => Boolean(date))
        .map((date) => toLocalDateKey(date))
    )
  ).sort(
    (left, right) => toDateAtLocalMidnight(right).getTime() - toDateAtLocalMidnight(left).getTime()
  );

  if (uniqueDateKeys.length === 0) {
    return { currentStreakDays: 0, longestStreakDays: 0, lastPlayedAt: null };
  }

  let longestStreakDays = 1;
  let rolling = 1;
  for (let index = 1; index < uniqueDateKeys.length; index += 1) {
    const prev = toDateAtLocalMidnight(uniqueDateKeys[index - 1]!);
    const next = toDateAtLocalMidnight(uniqueDateKeys[index]!);
    const diffDays = Math.round((prev.getTime() - next.getTime()) / DAY_IN_MS);
    if (diffDays === 1) {
      rolling += 1;
    } else {
      rolling = 1;
    }
    if (rolling > longestStreakDays) {
      longestStreakDays = rolling;
    }
  }

  const todayDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const latestDate = toDateAtLocalMidnight(uniqueDateKeys[0]!);
  const latestDiffDays = Math.round((todayDate.getTime() - latestDate.getTime()) / DAY_IN_MS);
  let currentStreakDays = 0;
  if (latestDiffDays === 0 || latestDiffDays === 1) {
    currentStreakDays = 1;
    for (let index = 1; index < uniqueDateKeys.length; index += 1) {
      const prev = toDateAtLocalMidnight(uniqueDateKeys[index - 1]!);
      const next = toDateAtLocalMidnight(uniqueDateKeys[index]!);
      const diffDays = Math.round((prev.getTime() - next.getTime()) / DAY_IN_MS);
      if (diffDays !== 1) break;
      currentStreakDays += 1;
    }
  }

  return {
    currentStreakDays,
    longestStreakDays,
    lastPlayedAt: scores[0]?.created_date ?? null,
  };
};

const resolveOperationFromActivityKey = (activityKey: string): string | null => {
  const parts = activityKey.split(':');
  const primary = (parts[1] ?? parts[0] ?? '').trim();
  if (!primary) {
    return null;
  }

  return ACTIVITY_PRIMARY_TO_OPERATION[primary] ?? primary;
};

const resolveOperationInfo = (
  operation: string,
  locale: string,
  translate?: KangurLearnerProfileTranslate
): { label: string; emoji: string } => {
  const fallback = resolveKangurOperationFallbackInfo(operation, locale);

  return {
    emoji: fallback.emoji,
    label: translateKangurLearnerProfileWithFallback(
      translate,
      `activityLabels.${operation}`,
      fallback.label
    ),
  };
};

const computeOperationPerformance = (
  scores: KangurScoreRecord[],
  progress: KangurProgressState,
  locale: string,
  translate?: KangurLearnerProfileTranslate
): KangurOperationPerformance[] => {
  const buckets = new Map<
    string,
    {
      attempts: number;
      scoreSum: number;
      accuracySum: number;
      bestAccuracy: number;
      totalXpEarned: number;
      xpSamples: number;
    }
  >();

  scores.forEach((score) => {
    const total = Math.max(1, score.total_questions || 1);
    const accuracy = (score.correct_answers / total) * 100;
    const bucket = buckets.get(score.operation) ?? {
      attempts: 0,
      scoreSum: 0,
      accuracySum: 0,
      bestAccuracy: 0,
      totalXpEarned: 0,
      xpSamples: 0,
    };
    bucket.attempts += 1;
    bucket.scoreSum += score.score;
    bucket.accuracySum += accuracy;
    bucket.bestAccuracy = Math.max(bucket.bestAccuracy, accuracy);
    const normalizedXp = normalizeXpEarned(score.xp_earned);
    if (normalizedXp > 0) {
      bucket.totalXpEarned += normalizedXp;
      bucket.xpSamples += 1;
    }
    buckets.set(score.operation, bucket);
  });

  Object.entries(progress.activityStats ?? {}).forEach(([activityKey, entry]) => {
    const operation = resolveOperationFromActivityKey(activityKey);
    if (!operation || buckets.has(operation) || entry.sessionsPlayed <= 0) {
      return;
    }

    const totalQuestionsAnswered = Math.max(0, entry.totalQuestionsAnswered);
    const averageAccuracy =
      totalQuestionsAnswered > 0
        ? toPercent((entry.totalCorrectAnswers / totalQuestionsAnswered) * 100)
        : entry.bestScorePercent;

    buckets.set(operation, {
      attempts: entry.sessionsPlayed,
      scoreSum: Math.round((averageAccuracy / 100) * entry.sessionsPlayed * 10),
      accuracySum: averageAccuracy * entry.sessionsPlayed,
      bestAccuracy: entry.bestScorePercent,
      totalXpEarned: entry.totalXpEarned,
      xpSamples: entry.sessionsPlayed,
    });
  });

  return Array.from(buckets.entries())
    .map(([operation, bucket]): KangurOperationPerformance => {
      const operationInfo = resolveOperationInfo(operation, locale, translate);
      return {
        operation,
        label: operationInfo.label,
        emoji: operationInfo.emoji,
        attempts: bucket.attempts,
        averageAccuracy: toPercent(bucket.accuracySum / bucket.attempts),
        averageScore: Math.round((bucket.scoreSum / bucket.attempts) * 10) / 10,
        bestScore: toPercent(bucket.bestAccuracy),
        totalXpEarned: bucket.totalXpEarned,
        averageXpPerSession:
          bucket.xpSamples > 0 ? Math.max(0, Math.round(bucket.totalXpEarned / bucket.xpSamples)) : 0,
      };
    })
    .sort((left, right) => {
      if (right.averageAccuracy !== left.averageAccuracy) {
        return right.averageAccuracy - left.averageAccuracy;
      }
      if (right.averageXpPerSession !== left.averageXpPerSession) {
        return right.averageXpPerSession - left.averageXpPerSession;
      }
      return right.attempts - left.attempts;
    });
};

const computeWeeklyActivity = (
  scores: KangurScoreRecord[],
  now: Date,
  locale: string,
  translate?: KangurLearnerProfileTranslate
): KangurWeeklyActivityPoint[] => {
  const daysToDisplay = 7;
  const buckets = new Map<string, { games: number; accuracySum: number }>();

  scores.forEach((score) => {
    const parsed = parseDateOrNull(score.created_date);
    if (!parsed) return;
    const dateKey = toLocalDateKey(parsed);
    const bucket = buckets.get(dateKey) ?? { games: 0, accuracySum: 0 };
    const total = Math.max(1, score.total_questions || 1);
    bucket.games += 1;
    bucket.accuracySum += (score.correct_answers / total) * 100;
    buckets.set(dateKey, bucket);
  });

  const dayKeys = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
  const dayLabelFormatter = new Intl.DateTimeFormat(locale, { weekday: 'short' });
  const result: KangurWeeklyActivityPoint[] = [];
  for (let offset = daysToDisplay - 1; offset >= 0; offset -= 1) {
    const day = new Date(now.getFullYear(), now.getMonth(), now.getDate() - offset);
    const dateKey = toLocalDateKey(day);
    const bucket = buckets.get(dateKey);
    const avg = bucket && bucket.games > 0 ? toPercent(bucket.accuracySum / bucket.games) : 0;
    const dayIndex = day.getDay();
    result.push({
      dateKey,
      label: translateKangurLearnerProfileWithFallback(
        translate,
        `weeklyActivity.${dayKeys[dayIndex]}`,
        dayLabelFormatter.format(day)
      ),
      games: bucket?.games ?? 0,
      averageAccuracy: avg,
    });
  }

  return result;
};

const computeRecentSessions = (
  scores: KangurScoreRecord[],
  locale: string,
  translate?: KangurLearnerProfileTranslate
): KangurRecentSession[] =>
  scores.slice(0, 8).map((score): KangurRecentSession => {
    const operationInfo = resolveOperationInfo(score.operation, locale, translate);
    const totalQuestions = Math.max(1, score.total_questions || 1);
    return {
      id: score.id,
      operation: score.operation,
      operationLabel: operationInfo.label,
      operationEmoji: operationInfo.emoji,
      createdAt: score.created_date,
      score: score.score,
      totalQuestions,
      accuracyPercent: toPercent((score.correct_answers / totalQuestions) * 100),
      timeTakenSeconds: Math.max(0, score.time_taken || 0),
      xpEarned:
        typeof score.xp_earned === 'number' && Number.isFinite(score.xp_earned)
          ? Math.max(0, Math.round(score.xp_earned))
          : null,
    };
  });

const normalizeXpEarned = (value: unknown): number =>
  typeof value === 'number' && Number.isFinite(value) ? Math.max(0, Math.round(value)) : 0;

const computeXpAnalytics = (
  scores: KangurScoreRecord[],
  progress: KangurProgressState,
  now: Date
): {
  todayXpEarned: number;
  weeklyXpEarned: number;
  averageXpPerSession: number;
} => {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6);

  let todayXpEarned = 0;
  let weeklyXpEarned = 0;

  scores.forEach((score) => {
    const playedAt = parseDateOrNull(score.created_date);
    if (!playedAt) {
      return;
    }

    const normalizedXp = normalizeXpEarned(score.xp_earned);
    if (normalizedXp <= 0) {
      return;
    }

    const playedDay = new Date(playedAt.getFullYear(), playedAt.getMonth(), playedAt.getDate());
    if (playedDay.getTime() === today.getTime()) {
      todayXpEarned += normalizedXp;
    }
    if (playedDay.getTime() >= weekStart.getTime() && playedDay.getTime() <= today.getTime()) {
      weeklyXpEarned += normalizedXp;
    }
  });

  return {
    todayXpEarned,
    weeklyXpEarned,
    averageXpPerSession:
      progress.gamesPlayed > 0 ? Math.max(0, Math.round(progress.totalXp / progress.gamesPlayed)) : 0,
  };
};

const getLatestProgressActivityDate = (progress: KangurProgressState): string | null => {
  const timestamps = Object.values(progress.activityStats ?? {})
    .map((entry) => entry.lastPlayedAt)
    .filter((value): value is string => Boolean(value))
    .map((value) => Date.parse(value))
    .filter((value) => Number.isFinite(value));

  if (timestamps.length === 0) {
    return null;
  }

  return new Date(Math.max(...timestamps)).toISOString();
};

const resolveLessonMasteryEntries = (
  progress: KangurProgressState,
  locale?: string | null | undefined
): KangurLessonMasteryInsight[] =>
  Object.entries(progress.lessonMastery ?? {})
    .map(([componentId, mastery]) => {
      const lesson = KANGUR_LESSON_LIBRARY[componentId as keyof typeof KANGUR_LESSON_LIBRARY];
      if (!lesson) {
        return null;
      }

      return {
        componentId,
        title: getLocalizedKangurLessonTitle(componentId, locale, lesson.title),
        emoji: lesson.emoji,
        masteryPercent: mastery.masteryPercent,
        attempts: mastery.attempts,
        bestScorePercent: mastery.bestScorePercent,
        lastScorePercent: mastery.lastScorePercent,
        lastCompletedAt: mastery.lastCompletedAt,
      };
    })
    .filter((entry): entry is KangurLessonMasteryInsight => entry !== null);

export const buildLessonMasteryInsights = (
  progress: KangurProgressState,
  limit = 3,
  locale?: string | null | undefined
): KangurLessonMasteryInsights => {
  const entries = resolveLessonMasteryEntries(progress, locale);
  const safeLimit = Math.max(1, Math.floor(limit));
  const weakest = [...entries]
    .filter((entry) => entry.masteryPercent < 80)
    .sort((left, right) => {
      if (left.masteryPercent !== right.masteryPercent) {
        return left.masteryPercent - right.masteryPercent;
      }
      if (left.lastScorePercent !== right.lastScorePercent) {
        return left.lastScorePercent - right.lastScorePercent;
      }
      return right.attempts - left.attempts;
    })
    .slice(0, safeLimit);
  const strongest = [...entries]
    .sort((left, right) => {
      if (left.masteryPercent !== right.masteryPercent) {
        return right.masteryPercent - left.masteryPercent;
      }
      if (left.bestScorePercent !== right.bestScorePercent) {
        return right.bestScorePercent - left.bestScorePercent;
      }
      return right.attempts - left.attempts;
    })
    .slice(0, safeLimit);

  return {
    weakest,
    strongest,
    trackedLessons: entries.length,
    masteredLessons: entries.filter((entry) => entry.masteryPercent >= 80).length,
    lessonsNeedingPractice: entries.filter((entry) => entry.masteryPercent < 80).length,
  };
};

const localizeRecommendedSessionMomentum = (
  completedSessions: number,
  nextBadgeName: string | null,
  summary: string,
  translate?: KangurLearnerProfileTranslate
): {
  summary: string;
  nextBadgeName: string | null;
} => {
  if (!nextBadgeName) {
    return {
      nextBadgeName: null,
      summary: translateKangurLearnerProfileWithFallback(
        translate,
        'guidedMomentum.summary.complete',
        summary
      ),
    };
  }

  if (completedSessions < 1) {
    return {
      nextBadgeName: translateKangurLearnerProfileWithFallback(
        translate,
        'guidedMomentum.badges.guidedStep',
        nextBadgeName
      ),
      summary: translateKangurLearnerProfileWithFallback(
        translate,
        'guidedMomentum.summary.guidedStep',
        summary,
        {
          completed: Math.min(completedSessions, 1),
        }
      ),
    };
  }

  return {
    nextBadgeName: translateKangurLearnerProfileWithFallback(
      translate,
      'guidedMomentum.badges.guidedKeeper',
      nextBadgeName
    ),
    summary: translateKangurLearnerProfileWithFallback(
      translate,
      'guidedMomentum.summary.guidedKeeper',
      summary,
      {
        completed: Math.min(completedSessions, 3),
      }
    ),
  };
};

const buildRecommendations = (input: {
  averageAccuracy: number;
  currentStreakDays: number;
  dailyGoalGames: number;
  todayGames: number;
  todayXpEarned: number;
  weeklyXpEarned: number;
  averageXpPerSession: number;
  operationPerformance: KangurOperationPerformance[];
  progress: KangurProgressState;
  locale: string;
  translate?: KangurLearnerProfileTranslate;
}): KangurLearnerRecommendation[] => {
  const recommendations: KangurLearnerRecommendation[] = [];
  const fallbackCopy = getKangurLearnerProfileFallbackCopy(input.locale);
  const remainingDailyGames = Math.max(0, input.dailyGoalGames - input.todayGames);
  const weakestOperation = input.operationPerformance.at(-1) ?? null;
  const strongestOperation = input.operationPerformance[0] ?? null;
  const highestYieldOperation =
    [...input.operationPerformance].sort((left, right) => {
      if (right.averageXpPerSession !== left.averageXpPerSession) {
        return right.averageXpPerSession - left.averageXpPerSession;
      }
      if (right.totalXpEarned !== left.totalXpEarned) {
        return right.totalXpEarned - left.totalXpEarned;
      }
      return right.averageAccuracy - left.averageAccuracy;
    })[0] ?? null;
  const momentumOperation = highestYieldOperation ?? strongestOperation;
  const weakestLessonEntry = buildLessonMasteryInsights(input.progress, 1, input.locale).weakest[0] ?? null;
  const xpMomentumTarget = Math.max(20, input.averageXpPerSession);

  if (weakestOperation && weakestOperation.averageAccuracy < 75) {
    const operationLabel = weakestOperation.label.toLocaleLowerCase(input.locale);
    recommendations.push({
      id: 'focus_weakest_operation',
      title: translateKangurLearnerProfileWithFallback(
        input.translate,
        'recommendations.focusWeakestOperation.title',
        fallbackCopy.recommendations.focusWeakestOperation.title(weakestOperation.label),
        { operation: weakestOperation.label }
      ),
      description: translateKangurLearnerProfileWithFallback(
        input.translate,
        'recommendations.focusWeakestOperation.description',
        fallbackCopy.recommendations.focusWeakestOperation.description(operationLabel),
        { operation: operationLabel }
      ),
      priority: 'high',
      action: {
        label: translateKangurLearnerProfileWithFallback(
          input.translate,
          'recommendations.actions.openLesson',
          fallbackCopy.actions.openLesson
        ),
        page: 'Lessons',
        query: {
          focus: weakestOperation.operation,
        },
      },
    });
  }

  if (input.averageAccuracy < 70) {
    recommendations.push({
      id: 'improve_accuracy',
      title: translateKangurLearnerProfileWithFallback(
        input.translate,
        'recommendations.improveAccuracy.title',
        fallbackCopy.recommendations.improveAccuracy.title
      ),
      description: translateKangurLearnerProfileWithFallback(
        input.translate,
        'recommendations.improveAccuracy.description',
        fallbackCopy.recommendations.improveAccuracy.description
      ),
      priority: 'high',
      action: buildPracticeRecommendationAction(
        null,
        input.averageAccuracy,
        fallbackCopy,
        input.translate
      ),
    });
  }

  if (weakestLessonEntry && weakestLessonEntry.masteryPercent < 80) {
    recommendations.push({
      id: 'strengthen_lesson_mastery',
      title: translateKangurLearnerProfileWithFallback(
        input.translate,
        'recommendations.strengthenLessonMastery.title',
        fallbackCopy.recommendations.strengthenLessonMastery.title(weakestLessonEntry.title),
        { lessonTitle: weakestLessonEntry.title }
      ),
      description: translateKangurLearnerProfileWithFallback(
        input.translate,
        'recommendations.strengthenLessonMastery.description',
        fallbackCopy.recommendations.strengthenLessonMastery.description(
          weakestLessonEntry.masteryPercent
        ),
        { masteryPercent: weakestLessonEntry.masteryPercent }
      ),
      priority: weakestLessonEntry.masteryPercent < 60 ? 'high' : 'medium',
      action: {
        label: translateKangurLearnerProfileWithFallback(
          input.translate,
          'recommendations.actions.openLesson',
          fallbackCopy.actions.openLesson
        ),
        page: 'Lessons',
        query: {
          focus: weakestLessonEntry.componentId,
        },
      },
    });
  }

  if (remainingDailyGames > 0) {
    recommendations.push({
      id: 'daily_goal',
      title: translateKangurLearnerProfileWithFallback(
        input.translate,
        'recommendations.dailyGoal.title',
        fallbackCopy.recommendations.dailyGoal.title
      ),
      description:
        remainingDailyGames === 1
          ? translateKangurLearnerProfileWithFallback(
              input.translate,
              'recommendations.dailyGoal.descriptionSingle',
              fallbackCopy.recommendations.dailyGoal.descriptionSingle(input.todayXpEarned),
              { todayXpEarned: input.todayXpEarned }
            )
          : translateKangurLearnerProfileWithFallback(
              input.translate,
              'recommendations.dailyGoal.descriptionMultiple',
              fallbackCopy.recommendations.dailyGoal.descriptionMultiple(
                remainingDailyGames,
                input.todayXpEarned
              ),
              { remainingGames: remainingDailyGames, todayXpEarned: input.todayXpEarned }
            ),
      priority: 'medium',
      action: {
        label: translateKangurLearnerProfileWithFallback(
          input.translate,
          'recommendations.actions.playNow',
          fallbackCopy.actions.playNow
        ),
        page: 'Game',
        query: {
          quickStart: 'training',
        },
      },
    });
  }

  if (
    remainingDailyGames === 0 &&
    input.todayXpEarned < xpMomentumTarget &&
    input.averageAccuracy >= 70
  ) {
    recommendations.push({
      id: 'boost_xp_momentum',
      title: translateKangurLearnerProfileWithFallback(
        input.translate,
        'recommendations.boostXpMomentum.title',
        fallbackCopy.recommendations.boostXpMomentum.title
      ),
      description: highestYieldOperation
        ? (() => {
            const operationLabel = highestYieldOperation.label.toLocaleLowerCase(input.locale);
            return translateKangurLearnerProfileWithFallback(
              input.translate,
              'recommendations.boostXpMomentum.descriptionWithOperation',
              fallbackCopy.recommendations.boostXpMomentum.descriptionWithOperation(
                input.todayXpEarned,
                operationLabel,
                highestYieldOperation.averageXpPerSession
              ),
              {
                operation: operationLabel,
                todayXpEarned: input.todayXpEarned,
                averageXpPerSession: highestYieldOperation.averageXpPerSession,
              }
            );
          })()
        : translateKangurLearnerProfileWithFallback(
            input.translate,
            'recommendations.boostXpMomentum.descriptionFallback',
            fallbackCopy.recommendations.boostXpMomentum.descriptionFallback(
              input.todayXpEarned,
              xpMomentumTarget
            ),
            {
              todayXpEarned: input.todayXpEarned,
              xpMomentumTarget,
            }
          ),
      priority: 'medium',
      action: buildPracticeRecommendationAction(
        highestYieldOperation?.operation ?? null,
        highestYieldOperation?.averageAccuracy ?? input.averageAccuracy,
        fallbackCopy,
        input.translate
      ),
    });
  }

  if (input.currentStreakDays < 2) {
    recommendations.push({
      id: 'streak_bootstrap',
      title: translateKangurLearnerProfileWithFallback(
        input.translate,
        'recommendations.streakBootstrap.title',
        fallbackCopy.recommendations.streakBootstrap.title
      ),
      description: translateKangurLearnerProfileWithFallback(
        input.translate,
        'recommendations.streakBootstrap.description',
        fallbackCopy.recommendations.streakBootstrap.description
      ),
      priority: 'medium',
      action: {
        label: translateKangurLearnerProfileWithFallback(
          input.translate,
          'recommendations.actions.playToday',
          fallbackCopy.actions.playToday
        ),
        page: 'Game',
        query: {
          quickStart: 'training',
        },
      },
    });
  }

  if (recommendations.length === 0) {
    recommendations.push({
      id: 'maintain_momentum',
      title: translateKangurLearnerProfileWithFallback(
        input.translate,
        'recommendations.maintainMomentum.title',
        fallbackCopy.recommendations.maintainMomentum.title
      ),
      description: momentumOperation
        ? (() => {
            const operationLabel = momentumOperation.label.toLocaleLowerCase(input.locale);
            return translateKangurLearnerProfileWithFallback(
              input.translate,
              'recommendations.maintainMomentum.descriptionWithOperation',
              fallbackCopy.recommendations.maintainMomentum.descriptionWithOperation(
                input.weeklyXpEarned,
                operationLabel
              ),
              {
                weeklyXpEarned: input.weeklyXpEarned,
                operation: operationLabel,
              }
            );
          })()
        : translateKangurLearnerProfileWithFallback(
            input.translate,
            'recommendations.maintainMomentum.descriptionFallback',
            fallbackCopy.recommendations.maintainMomentum.descriptionFallback(
              input.weeklyXpEarned
            ),
            { weeklyXpEarned: input.weeklyXpEarned }
          ),
      priority: 'low',
      action: buildPracticeRecommendationAction(
        momentumOperation?.operation ?? null,
        momentumOperation?.averageAccuracy ?? input.averageAccuracy,
        fallbackCopy,
        input.translate
      ),
    });
  }

  return recommendations.slice(0, 3);
};

export const buildKangurLearnerProfileSnapshot = (
  input: BuildProfileSnapshotInput
): KangurLearnerProfileSnapshot => {
  const now = input.now ?? new Date();
  const locale = normalizeSiteLocale(input.locale);
  const normalizedScores = normalizeScoresDesc(input.scores);
  const progressLocalizer = { translate: input.translate };
  const level = getCurrentLevel(input.progress.totalXp, progressLocalizer);
  const nextLevel = getNextLevel(input.progress.totalXp, progressLocalizer);
  const xpIntoLevel = input.progress.totalXp - level.minXp;
  const xpNeeded = nextLevel ? Math.max(1, nextLevel.minXp - level.minXp) : 1;
  const levelProgressPercent = nextLevel ? toPercent((xpIntoLevel / xpNeeded) * 100) : 100;
  const streaks = computeStreaks(normalizedScores, now);
  const operationPerformance = computeOperationPerformance(
    normalizedScores,
    input.progress,
    locale,
    input.translate
  );
  const weeklyActivity = computeWeeklyActivity(normalizedScores, now, locale, input.translate);
  const recentSessions = computeRecentSessions(normalizedScores, locale, input.translate);
  const xpAnalytics = computeXpAnalytics(normalizedScores, input.progress, now);
  const recommendedSessionMomentum = getRecommendedSessionMomentum(
    input.progress,
    progressLocalizer
  );
  const localizedRecommendedSessionMomentum = localizeRecommendedSessionMomentum(
    recommendedSessionMomentum.completedSessions,
    recommendedSessionMomentum.nextBadgeName,
    recommendedSessionMomentum.summary,
    input.translate
  );
  const accuracyValues = normalizedScores.map(
    (score) => (score.correct_answers / Math.max(1, score.total_questions || 1)) * 100
  );
  const scoreHistoryAverageAccuracy =
    accuracyValues.length === 0
      ? 0
      : toPercent(accuracyValues.reduce((sum, value) => sum + value, 0) / accuracyValues.length);
  const scoreHistoryBestAccuracy =
    accuracyValues.length === 0 ? 0 : toPercent(Math.max(...accuracyValues));
  const progressAverageAccuracy = getProgressAverageAccuracy(input.progress);
  const progressBestAccuracy = getProgressBestAccuracy(input.progress);
  const averageAccuracy =
    (input.progress.totalQuestionsAnswered ?? 0) > 0
      ? progressAverageAccuracy
      : scoreHistoryAverageAccuracy;
  const bestAccuracy = Math.max(scoreHistoryBestAccuracy, progressBestAccuracy);
  const latestProgressActivityDate = getLatestProgressActivityDate(input.progress);
  const todayDateKey = toLocalDateKey(now);
  const todayGames = weeklyActivity.find((entry) => entry.dateKey === todayDateKey)?.games ?? 0;
  const dailyGoalGames = Math.max(1, Math.round(input.dailyGoalGames));
  const dailyGoalPercent = toPercent((todayGames / dailyGoalGames) * 100);
  const badgeStatuses = getProgressBadges(input.progress, progressLocalizer);
  const unlockedBadgeIds = badgeStatuses.filter((badge) => badge.isUnlocked).map((badge) => badge.id);
  const recommendations = buildRecommendations({
    averageAccuracy,
    currentStreakDays: streaks.currentStreakDays,
    dailyGoalGames,
    todayGames,
    todayXpEarned: xpAnalytics.todayXpEarned,
    weeklyXpEarned: xpAnalytics.weeklyXpEarned,
    averageXpPerSession: xpAnalytics.averageXpPerSession,
    operationPerformance,
    progress: input.progress,
    locale,
    translate: input.translate,
  });

  return {
    totalXp: input.progress.totalXp,
    gamesPlayed: input.progress.gamesPlayed,
    lessonsCompleted: input.progress.lessonsCompleted,
    perfectGames: input.progress.perfectGames,
    totalBadges: badgeStatuses.length,
    unlockedBadges: unlockedBadgeIds.length,
    unlockedBadgeIds,
    level,
    nextLevel,
    levelProgressPercent,
    averageAccuracy,
    bestAccuracy,
    currentStreakDays: streaks.currentStreakDays,
    longestStreakDays: streaks.longestStreakDays,
    lastPlayedAt: streaks.lastPlayedAt ?? latestProgressActivityDate,
    dailyGoalGames,
    todayGames,
    dailyGoalPercent,
    todayXpEarned: xpAnalytics.todayXpEarned,
    weeklyXpEarned: xpAnalytics.weeklyXpEarned,
    averageXpPerSession: xpAnalytics.averageXpPerSession,
    recommendedSessionsCompleted: recommendedSessionMomentum.completedSessions,
    recommendedSessionProgressPercent: recommendedSessionMomentum.progressPercent,
    recommendedSessionSummary: localizedRecommendedSessionMomentum.summary,
    recommendedSessionNextBadgeName: localizedRecommendedSessionMomentum.nextBadgeName,
    operationPerformance,
    recentSessions,
    weeklyActivity,
    recommendations,
  };
};
