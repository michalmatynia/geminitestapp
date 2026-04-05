import type { KangurProgressState, KangurScore } from '@kangur/contracts/kangur';

import { KANGUR_LESSON_CATALOG } from './lesson-catalog';
import {
  getLocalizedKangurCoreLessonTitle,
  getLocalizedKangurCoreLevelTitle,
  getLocalizedKangurCoreOperationInfo,
  getLocalizedKangurCoreWeekdayLabel,
  localizeKangurCoreText,
  normalizeKangurCoreLocale,
  type KangurCoreLocale,
} from './profile-i18n';
import { resolvePreferredKangurPracticeOperation } from './practice';
import {
  KANGUR_BADGES,
  getCurrentKangurLevel,
  getNextKangurLevel,
} from './progress-metadata';

const DAY_IN_MS = 24 * 60 * 60 * 1000;
export const KANGUR_PROFILE_DEFAULT_DAILY_GOAL_GAMES = 3;

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

const compareDateKeysDesc = (left: string, right: string): number =>
  toDateAtLocalMidnight(right).getTime() - toDateAtLocalMidnight(left).getTime();

const toUniqueScoreDateKeys = (scores: KangurScore[]): string[] =>
  Array.from(
    new Set(
      scores
        .map((score) => parseDateOrNull(score.created_date))
        .filter((date): date is Date => Boolean(date))
        .map((date) => toLocalDateKey(date)),
    ),
  ).sort(compareDateKeysDesc);

const computeLongestStreakDays = (dateKeys: string[]): number => {
  let longestStreakDays = 1;
  let rolling = 1;

  for (let index = 1; index < dateKeys.length; index += 1) {
    const prev = toDateAtLocalMidnight(dateKeys[index - 1]!);
    const next = toDateAtLocalMidnight(dateKeys[index]!);
    const diffDays = Math.round((prev.getTime() - next.getTime()) / DAY_IN_MS);

    rolling = diffDays === 1 ? rolling + 1 : 1;
    longestStreakDays = Math.max(longestStreakDays, rolling);
  }

  return longestStreakDays;
};

const canContinueCurrentStreak = (latestDateKey: string, now: Date): boolean => {
  const todayDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const latestDate = toDateAtLocalMidnight(latestDateKey);
  const latestDiffDays = Math.round((todayDate.getTime() - latestDate.getTime()) / DAY_IN_MS);

  return latestDiffDays === 0 || latestDiffDays === 1;
};

const computeCurrentStreakDays = (dateKeys: string[], now: Date): number => {
  if (dateKeys.length === 0 || !canContinueCurrentStreak(dateKeys[0]!, now)) {
    return 0;
  }

  let currentStreakDays = 1;

  for (let index = 1; index < dateKeys.length; index += 1) {
    const prev = toDateAtLocalMidnight(dateKeys[index - 1]!);
    const next = toDateAtLocalMidnight(dateKeys[index]!);
    const diffDays = Math.round((prev.getTime() - next.getTime()) / DAY_IN_MS);

    if (diffDays !== 1) {
      break;
    }

    currentStreakDays += 1;
  }

  return currentStreakDays;
};

export type KangurOperationPerformance = {
  operation: string;
  label: string;
  emoji: string;
  attempts: number;
  averageAccuracy: number;
  averageScore: number;
  bestScore: number;
};

export type KangurRecentSession = {
  id: string;
  operation: string;
  operationLabel: string;
  operationEmoji: string;
  createdAt: string;
  score: number;
  totalQuestions: number;
  accuracyPercent: number;
  timeTakenSeconds: number;
};

export type KangurWeeklyActivityPoint = {
  dateKey: string;
  label: string;
  games: number;
  averageAccuracy: number;
};

export type KangurLearnerRecommendationPriority = 'high' | 'medium' | 'low';

export type KangurLearnerRecommendationAction = {
  label: string;
  page: 'Game' | 'Lessons' | 'ParentDashboard' | 'LearnerProfile';
  query?: Record<string, string>;
};

export type KangurLearnerRecommendation = {
  id: string;
  title: string;
  description: string;
  priority: KangurLearnerRecommendationPriority;
  action: KangurLearnerRecommendationAction;
};

export type KangurLessonMasteryInsight = {
  componentId: string;
  title: string;
  emoji: string;
  masteryPercent: number;
  attempts: number;
  bestScorePercent: number;
  lastScorePercent: number;
  lastCompletedAt: string | null;
};

export type KangurLessonMasteryInsights = {
  weakest: KangurLessonMasteryInsight[];
  strongest: KangurLessonMasteryInsight[];
  trackedLessons: number;
  masteredLessons: number;
  lessonsNeedingPractice: number;
};

export type KangurLearnerProfileSnapshot = {
  totalXp: number;
  gamesPlayed: number;
  lessonsCompleted: number;
  perfectGames: number;
  totalBadges: number;
  unlockedBadges: number;
  unlockedBadgeIds: string[];
  level: ReturnType<typeof getCurrentKangurLevel>;
  nextLevel: ReturnType<typeof getNextKangurLevel>;
  levelProgressPercent: number;
  averageAccuracy: number;
  bestAccuracy: number;
  currentStreakDays: number;
  longestStreakDays: number;
  lastPlayedAt: string | null;
  dailyGoalGames: number;
  todayGames: number;
  dailyGoalPercent: number;
  operationPerformance: KangurOperationPerformance[];
  recentSessions: KangurRecentSession[];
  weeklyActivity: KangurWeeklyActivityPoint[];
  recommendations: KangurLearnerRecommendation[];
};

export type BuildKangurLearnerProfileSnapshotInput = {
  progress: KangurProgressState;
  scores: KangurScore[];
  dailyGoalGames: number;
  locale?: string | null | undefined;
  now?: Date | undefined;
};

const getRecommendationActionLabel = (
  key: 'openLesson' | 'practiceNow' | 'playToday',
  locale: KangurCoreLocale,
): string => {
  if (key === 'openLesson') {
    return localizeKangurCoreText(
      {
        de: 'Lektion öffnen',
        en: 'Open lesson',
        pl: 'Otwórz lekcję',
      },
      locale,
    );
  }

  if (key === 'playToday') {
    return localizeKangurCoreText(
      {
        de: 'Heute spielen',
        en: 'Play today',
        pl: 'Zagraj dzis',
      },
      locale,
    );
  }

  return localizeKangurCoreText(
    {
      de: 'Jetzt trainieren',
      en: 'Practice now',
      pl: 'Trenuj teraz',
    },
    locale,
  );
};

const normalizeScoresDesc = (scores: KangurScore[]): KangurScore[] =>
  [...scores].sort((left, right) => {
    const leftDate = parseDateOrNull(left.created_date);
    const rightDate = parseDateOrNull(right.created_date);
    const leftTs = leftDate?.getTime() ?? 0;
    const rightTs = rightDate?.getTime() ?? 0;
    return rightTs - leftTs;
  });

const computeStreaks = (
  scores: KangurScore[],
  now: Date,
): {
  currentStreakDays: number;
  longestStreakDays: number;
  lastPlayedAt: string | null;
} => {
  if (scores.length === 0) {
    return { currentStreakDays: 0, longestStreakDays: 0, lastPlayedAt: null };
  }

  const uniqueDateKeys = toUniqueScoreDateKeys(scores);

  if (uniqueDateKeys.length === 0) {
    return { currentStreakDays: 0, longestStreakDays: 0, lastPlayedAt: null };
  }

  return {
    currentStreakDays: computeCurrentStreakDays(uniqueDateKeys, now),
    longestStreakDays: computeLongestStreakDays(uniqueDateKeys),
    lastPlayedAt: scores[0]?.created_date ?? null,
  };
};

const computeOperationPerformance = (
  scores: KangurScore[],
  locale: KangurCoreLocale,
): KangurOperationPerformance[] => {
  const buckets = new Map<
    string,
    {
      attempts: number;
      scoreSum: number;
      accuracySum: number;
      bestAccuracy: number;
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
    };
    bucket.attempts += 1;
    bucket.scoreSum += score.score;
    bucket.accuracySum += accuracy;
    bucket.bestAccuracy = Math.max(bucket.bestAccuracy, accuracy);
    buckets.set(score.operation, bucket);
  });

  return Array.from(buckets.entries())
    .map(([operation, bucket]): KangurOperationPerformance => {
      const operationInfo = getLocalizedKangurCoreOperationInfo(operation, locale);
      return {
        operation,
        label: operationInfo.label,
        emoji: operationInfo.emoji,
        attempts: bucket.attempts,
        averageAccuracy: toPercent(bucket.accuracySum / bucket.attempts),
        averageScore: Math.round((bucket.scoreSum / bucket.attempts) * 10) / 10,
        bestScore: toPercent(bucket.bestAccuracy),
      };
    })
    .sort((left, right) => right.averageAccuracy - left.averageAccuracy);
};

const computeWeeklyActivity = (
  scores: KangurScore[],
  now: Date,
  locale: KangurCoreLocale,
): KangurWeeklyActivityPoint[] => {
  const daysToDisplay = 7;
  const buckets = new Map<string, { games: number; accuracySum: number }>();

  scores.forEach((score) => {
    const parsed = parseDateOrNull(score.created_date);
    if (!parsed) {
      return;
    }
    const dateKey = toLocalDateKey(parsed);
    const bucket = buckets.get(dateKey) ?? { games: 0, accuracySum: 0 };
    const total = Math.max(1, score.total_questions || 1);
    bucket.games += 1;
    bucket.accuracySum += (score.correct_answers / total) * 100;
    buckets.set(dateKey, bucket);
  });

  const result: KangurWeeklyActivityPoint[] = [];
  for (let offset = daysToDisplay - 1; offset >= 0; offset -= 1) {
    const day = new Date(now.getFullYear(), now.getMonth(), now.getDate() - offset);
    const dateKey = toLocalDateKey(day);
    const bucket = buckets.get(dateKey);
    const avg = bucket && bucket.games > 0 ? toPercent(bucket.accuracySum / bucket.games) : 0;
    result.push({
      dateKey,
      label: getLocalizedKangurCoreWeekdayLabel(day.getDay(), locale) || dateKey,
      games: bucket?.games ?? 0,
      averageAccuracy: avg,
    });
  }

  return result;
};

const computeRecentSessions = (
  scores: KangurScore[],
  locale: KangurCoreLocale,
): KangurRecentSession[] =>
  scores.slice(0, 8).map((score): KangurRecentSession => {
    const operationInfo = getLocalizedKangurCoreOperationInfo(score.operation, locale);
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
    };
  });

type LessonMasteryEntry = {
  componentId: string;
  masteryPercent: number;
  attempts: number;
  bestScorePercent: number;
  lastScorePercent: number;
  lastCompletedAt: string | null;
};

const compareWeakestLessonMasteryEntries = (
  left: LessonMasteryEntry,
  right: LessonMasteryEntry,
): number => {
  if (left.masteryPercent !== right.masteryPercent) {
    return left.masteryPercent - right.masteryPercent;
  }
  if (left.lastScorePercent !== right.lastScorePercent) {
    return left.lastScorePercent - right.lastScorePercent;
  }
  return right.attempts - left.attempts;
};

const compareStrongestLessonMasteryEntries = (
  left: LessonMasteryEntry,
  right: LessonMasteryEntry,
): number => {
  if (left.masteryPercent !== right.masteryPercent) {
    return right.masteryPercent - left.masteryPercent;
  }
  if (left.bestScorePercent !== right.bestScorePercent) {
    return right.bestScorePercent - left.bestScorePercent;
  }
  return right.attempts - left.attempts;
};

const insertBoundedLessonMasteryEntry = (
  entries: LessonMasteryEntry[],
  candidateEntry: LessonMasteryEntry,
  limit: number,
  compareEntries: (left: LessonMasteryEntry, right: LessonMasteryEntry) => number,
): void => {
  const insertIndex = entries.findIndex((entry) => compareEntries(candidateEntry, entry) < 0);

  if (insertIndex === -1) {
    entries.push(candidateEntry);
  } else {
    entries.splice(insertIndex, 0, candidateEntry);
  }

  if (entries.length > limit) {
    entries.length = limit;
  }
};

const localizeLessonMasteryEntry = (
  entry: LessonMasteryEntry,
  locale: KangurCoreLocale,
): KangurLessonMasteryInsight => {
  const lesson = KANGUR_LESSON_CATALOG[entry.componentId];

  return {
    ...entry,
    title: getLocalizedKangurCoreLessonTitle(entry.componentId, locale, lesson?.title),
    emoji: lesson?.emoji ?? '📘',
  };
};

export const buildLessonMasteryInsights = (
  progress: KangurProgressState,
  limit = 3,
  locale?: string | null | undefined,
): KangurLessonMasteryInsights => {
  const safeLocale = normalizeKangurCoreLocale(locale);
  const safeLimit = Math.max(1, Math.floor(limit));
  const weakest: LessonMasteryEntry[] = [];
  const strongest: LessonMasteryEntry[] = [];
  let trackedLessons = 0;
  let masteredLessons = 0;
  let lessonsNeedingPractice = 0;

  for (const [componentId, mastery] of Object.entries(progress.lessonMastery)) {
    trackedLessons += 1;

    const entry: LessonMasteryEntry = {
      attempts: mastery.attempts,
      bestScorePercent: mastery.bestScorePercent,
      componentId,
      lastCompletedAt: mastery.lastCompletedAt,
      lastScorePercent: mastery.lastScorePercent,
      masteryPercent: mastery.masteryPercent,
    };

    if (entry.masteryPercent >= 80) {
      masteredLessons += 1;
    } else {
      lessonsNeedingPractice += 1;
      insertBoundedLessonMasteryEntry(
        weakest,
        entry,
        safeLimit,
        compareWeakestLessonMasteryEntries,
      );
    }

    insertBoundedLessonMasteryEntry(
      strongest,
      entry,
      safeLimit,
      compareStrongestLessonMasteryEntries,
    );
  }

  return {
    weakest: weakest.map((entry) => localizeLessonMasteryEntry(entry, safeLocale)),
    strongest: strongest.map((entry) => localizeLessonMasteryEntry(entry, safeLocale)),
    trackedLessons,
    masteredLessons,
    lessonsNeedingPractice,
  };
};

const buildRecommendations = (input: {
  averageAccuracy: number;
  currentStreakDays: number;
  dailyGoalGames: number;
  todayGames: number;
  locale: KangurCoreLocale;
  operationPerformance: KangurOperationPerformance[];
  progress: KangurProgressState;
}): KangurLearnerRecommendation[] => {
  const recommendations: KangurLearnerRecommendation[] = [];
  const remainingDailyGames = Math.max(0, input.dailyGoalGames - input.todayGames);
  const weakestOperation = input.operationPerformance.at(-1) ?? null;
  const strongestOperation = input.operationPerformance[0] ?? null;
  const weakestLessonEntry = buildLessonMasteryInsights(
    input.progress,
    1,
    input.locale,
  ).weakest[0] ?? null;
  const weakestPracticeOperation = resolvePreferredKangurPracticeOperation(
    weakestOperation?.operation,
  );
  const strongestPracticeOperation = resolvePreferredKangurPracticeOperation(
    strongestOperation?.operation,
  );

  if (weakestOperation && weakestOperation.averageAccuracy < 75) {
    recommendations.push({
      id: 'focus_weakest_operation',
      title: localizeKangurCoreText(
        {
          de: `Fokus auf: ${weakestOperation.label}`,
          en: `Focus on: ${weakestOperation.label}`,
          pl: `Skup się na: ${weakestOperation.label}`,
        },
        input.locale,
      ),
      description: localizeKangurCoreText(
        {
          de: `Mache 2 kurze ${weakestOperation.label.toLowerCase()}-Sitzungen und peile mindestens 80 % Genauigkeit an.`,
          en: `Complete 2 short ${weakestOperation.label.toLowerCase()} sessions and aim for at least 80% accuracy.`,
          pl: `Wykonaj 2 krótkie sesje ${weakestOperation.label.toLowerCase()} i celuj w min. 80% poprawności.`,
        },
        input.locale,
      ),
      priority: 'high',
      action: {
        label: getRecommendationActionLabel('openLesson', input.locale),
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
      title: localizeKangurCoreText(
        {
          de: 'Trefferquote stabilisieren',
          en: 'Stabilize accuracy',
          pl: 'Stabilizuj skuteczność',
        },
        input.locale,
      ),
      description: localizeKangurCoreText(
        {
          de: 'Waehle fuer 3 Spiele den mittleren Modus und konzentriere dich mehr auf Genauigkeit als auf Zeit.',
          en: 'For 3 games, choose the medium mode and focus on accuracy instead of speed.',
          pl: 'Przez 3 gry wybieraj tryb średni i skup się na dokładności zamiast czasie.',
        },
        input.locale,
      ),
      priority: 'high',
      action: {
        label: getRecommendationActionLabel('practiceNow', input.locale),
        page: 'Game',
        query: {
          operation: weakestPracticeOperation ?? 'mixed',
          quickStart: 'training',
        },
      },
    });
  }

  if (weakestLessonEntry && weakestLessonEntry.masteryPercent < 80) {
    recommendations.push({
      id: 'strengthen_lesson_mastery',
      title: localizeKangurCoreText(
        {
          de: `Lektion wiederholen: ${weakestLessonEntry.title}`,
          en: `Review lesson: ${weakestLessonEntry.title}`,
          pl: `Powtórz lekcję: ${weakestLessonEntry.title}`,
        },
        input.locale,
      ),
      description: localizeKangurCoreText(
        {
          de: `Die aktuelle Beherrschung liegt bei ${weakestLessonEntry.masteryPercent} %. Eine Wiederholung dieser Lektion bringt mehr Stabilität.`,
          en: `Current mastery is ${weakestLessonEntry.masteryPercent}%. One review of this lesson should make the result more stable.`,
          pl: `Aktualne opanowanie to ${weakestLessonEntry.masteryPercent}%. Jedna powtórka tej lekcji podniesie stabilność.`,
        },
        input.locale,
      ),
      priority: weakestLessonEntry.masteryPercent < 60 ? 'high' : 'medium',
      action: {
        label: getRecommendationActionLabel('openLesson', input.locale),
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
      title: localizeKangurCoreText(
        {
          de: 'Tagesziel abschliessen',
          en: 'Close the daily goal',
          pl: 'Domknij dzienny cel',
        },
        input.locale,
      ),
      description:
        remainingDailyGames === 1
          ? localizeKangurCoreText(
              {
                de: 'Es fehlt nur noch 1 Spiel bis zum Tagesziel.',
                en: 'Only 1 game is missing to reach the daily goal.',
                pl: 'Brakuje tylko 1 gry do dziennego celu.',
              },
              input.locale,
            )
          : localizeKangurCoreText(
              {
                de: `Es fehlen noch ${remainingDailyGames} Spiele bis zum Tagesziel.`,
                en: `${remainingDailyGames} games are still missing to reach the daily goal.`,
                pl: `Brakuje ${remainingDailyGames} gier do dziennego celu.`,
              },
              input.locale,
            ),
      priority: 'medium',
      action: {
        label: getRecommendationActionLabel('practiceNow', input.locale),
        page: 'Game',
        query: {
          operation: weakestPracticeOperation ?? 'mixed',
          quickStart: 'training',
        },
      },
    });
  }

  if (input.currentStreakDays < 2) {
    recommendations.push({
      id: 'streak_bootstrap',
      title: localizeKangurCoreText(
        {
          de: 'Serie aufbauen',
          en: 'Build a streak',
          pl: 'Zbuduj serię',
        },
        input.locale,
      ),
      description: localizeKangurCoreText(
        {
          de: 'Spiele auch morgen, um eine Serie aufeinanderfolgender Tage zu starten.',
          en: 'Play again tomorrow to start a streak of consecutive days.',
          pl: 'Zagraj także jutro, aby uruchomić serię kolejnych dni.',
        },
        input.locale,
      ),
      priority: 'medium',
      action: {
        label: getRecommendationActionLabel('playToday', input.locale),
        page: 'Game',
        query: {
          operation: weakestPracticeOperation ?? 'mixed',
          quickStart: 'training',
        },
      },
    });
  }

  if (recommendations.length === 0) {
    recommendations.push({
      id: 'maintain_momentum',
      title: localizeKangurCoreText(
        {
          de: 'Tempo halten',
          en: 'Keep the pace',
          pl: 'Utrzymaj tempo',
        },
        input.locale,
      ),
      description: strongestOperation
        ? localizeKangurCoreText(
            {
              de: `Starke Form. Fuege 1 ${strongestOperation.label.toLowerCase()}-Sitzung zur Festigung hinzu.`,
              en: `Great form. Add 1 ${strongestOperation.label.toLowerCase()} session to reinforce it.`,
              pl: `Świetna forma. Dorzuć 1 sesję ${strongestOperation.label.toLowerCase()} dla utrwalenia.`,
            },
            input.locale,
          )
        : localizeKangurCoreText(
            {
              de: 'Starke Form. Halte den heutigen Lernrhythmus aufrecht.',
              en: 'Great form. Keep the learning rhythm going today.',
              pl: 'Świetna forma. Kontynuuj dzisiejszy rytm nauki.',
            },
            input.locale,
          ),
      priority: 'low',
      action: {
        label: getRecommendationActionLabel('practiceNow', input.locale),
        page: 'Game',
        query: {
          operation: strongestPracticeOperation ?? 'mixed',
          quickStart: 'training',
        },
      },
    });
  }

  return recommendations.slice(0, 3);
};

export const buildKangurLearnerProfileSnapshot = (
  input: BuildKangurLearnerProfileSnapshotInput,
): KangurLearnerProfileSnapshot => {
  const locale = normalizeKangurCoreLocale(input.locale);
  const now = input.now ?? new Date();
  const normalizedScores = normalizeScoresDesc(input.scores);
  const currentLevel = getCurrentKangurLevel(input.progress.totalXp);
  const upcomingLevel = getNextKangurLevel(input.progress.totalXp);
  const level = {
    ...currentLevel,
    title: getLocalizedKangurCoreLevelTitle(currentLevel.level, currentLevel.title, locale),
  };
  const nextLevel = upcomingLevel
    ? {
        ...upcomingLevel,
        title: getLocalizedKangurCoreLevelTitle(upcomingLevel.level, upcomingLevel.title, locale),
      }
    : null;
  const xpIntoLevel = input.progress.totalXp - level.minXp;
  const xpNeeded = nextLevel ? Math.max(1, nextLevel.minXp - level.minXp) : 1;
  const levelProgressPercent = nextLevel ? toPercent((xpIntoLevel / xpNeeded) * 100) : 100;
  const streaks = computeStreaks(normalizedScores, now);
  const operationPerformance = computeOperationPerformance(normalizedScores, locale);
  const weeklyActivity = computeWeeklyActivity(normalizedScores, now, locale);
  const recentSessions = computeRecentSessions(normalizedScores, locale);
  const accuracyValues = normalizedScores.map(
    (score) => (score.correct_answers / Math.max(1, score.total_questions || 1)) * 100,
  );
  const averageAccuracy =
    accuracyValues.length === 0
      ? 0
      : toPercent(accuracyValues.reduce((sum, value) => sum + value, 0) / accuracyValues.length);
  const bestAccuracy = accuracyValues.length === 0 ? 0 : toPercent(Math.max(...accuracyValues));
  const todayDateKey = toLocalDateKey(now);
  const todayGames = weeklyActivity.find((entry) => entry.dateKey === todayDateKey)?.games ?? 0;
  const dailyGoalGames = Math.max(1, Math.round(input.dailyGoalGames));
  const dailyGoalPercent = toPercent((todayGames / dailyGoalGames) * 100);
  const unlockedBadgeIds = KANGUR_BADGES.filter((badge) =>
    input.progress.badges.includes(badge.id),
  ).map((badge) => badge.id);
  const recommendations = buildRecommendations({
      averageAccuracy,
      currentStreakDays: streaks.currentStreakDays,
      dailyGoalGames,
      locale,
      todayGames,
      operationPerformance,
      progress: input.progress,
  });

  return {
    totalXp: input.progress.totalXp,
    gamesPlayed: input.progress.gamesPlayed,
    lessonsCompleted: input.progress.lessonsCompleted,
    perfectGames: input.progress.perfectGames,
    totalBadges: KANGUR_BADGES.length,
    unlockedBadges: unlockedBadgeIds.length,
    unlockedBadgeIds,
    level,
    nextLevel,
    levelProgressPercent,
    averageAccuracy,
    bestAccuracy,
    currentStreakDays: streaks.currentStreakDays,
    longestStreakDays: streaks.longestStreakDays,
    lastPlayedAt: streaks.lastPlayedAt,
    dailyGoalGames,
    todayGames,
    dailyGoalPercent,
    operationPerformance,
    recentSessions,
    weeklyActivity,
    recommendations,
  };
};
