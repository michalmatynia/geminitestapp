import type {
  KangurAssignmentPriority,
  KangurProgressState,
  KangurRouteAction,
} from '@/shared/contracts/kangur';
import type { KangurScoreRecord } from '@/features/kangur/services/ports';
import { KANGUR_LESSON_LIBRARY } from '@/features/kangur/settings';
import { BADGES, getCurrentLevel, getNextLevel } from '@/features/kangur/ui/services/progress';

const OPERATION_LABELS: Record<string, { label: string; emoji: string }> = {
  addition: { label: 'Dodawanie', emoji: '➕' },
  subtraction: { label: 'Odejmowanie', emoji: '➖' },
  multiplication: { label: 'Mnozenie', emoji: '✖️' },
  division: { label: 'Dzielenie', emoji: '➗' },
  decimals: { label: 'Ulamki', emoji: '🔢' },
  powers: { label: 'Potegi', emoji: '⚡' },
  roots: { label: 'Pierwiastki', emoji: '√' },
  clock: { label: 'Zegar', emoji: '🕐' },
  mixed: { label: 'Mieszane', emoji: '🎲' },
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

export type KangurLearnerRecommendation = {
  id: string;
  title: string;
  description: string;
  priority: KangurAssignmentPriority;
  action: KangurRouteAction;
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
  level: ReturnType<typeof getCurrentLevel>;
  nextLevel: ReturnType<typeof getNextLevel>;
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

type BuildProfileSnapshotInput = {
  progress: KangurProgressState;
  scores: KangurScoreRecord[];
  dailyGoalGames: number;
  now?: Date | undefined;
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

const computeOperationPerformance = (scores: KangurScoreRecord[]): KangurOperationPerformance[] => {
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
      const operationInfo = OPERATION_LABELS[operation] ?? { label: operation, emoji: '❓' };
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
  scores: KangurScoreRecord[],
  now: Date
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

  const dayLabels = ['niedz.', 'pon.', 'wt.', 'sr.', 'czw.', 'pt.', 'sob.'];
  const result: KangurWeeklyActivityPoint[] = [];
  for (let offset = daysToDisplay - 1; offset >= 0; offset -= 1) {
    const day = new Date(now.getFullYear(), now.getMonth(), now.getDate() - offset);
    const dateKey = toLocalDateKey(day);
    const bucket = buckets.get(dateKey);
    const avg = bucket && bucket.games > 0 ? toPercent(bucket.accuracySum / bucket.games) : 0;
    result.push({
      dateKey,
      label: dayLabels[day.getDay()] ?? dateKey,
      games: bucket?.games ?? 0,
      averageAccuracy: avg,
    });
  }

  return result;
};

const computeRecentSessions = (scores: KangurScoreRecord[]): KangurRecentSession[] =>
  scores.slice(0, 8).map((score): KangurRecentSession => {
    const operationInfo = OPERATION_LABELS[score.operation] ?? {
      label: score.operation,
      emoji: '❓',
    };
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

const resolveLessonMasteryEntries = (progress: KangurProgressState): KangurLessonMasteryInsight[] =>
  Object.entries(progress.lessonMastery)
    .map(([componentId, mastery]) => {
      const lesson = KANGUR_LESSON_LIBRARY[componentId as keyof typeof KANGUR_LESSON_LIBRARY];
      if (!lesson) {
        return null;
      }

      return {
        componentId,
        title: lesson.title,
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
  limit = 3
): KangurLessonMasteryInsights => {
  const entries = resolveLessonMasteryEntries(progress);
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

const buildRecommendations = (input: {
  averageAccuracy: number;
  currentStreakDays: number;
  dailyGoalGames: number;
  todayGames: number;
  operationPerformance: KangurOperationPerformance[];
  progress: KangurProgressState;
}): KangurLearnerRecommendation[] => {
  const recommendations: KangurLearnerRecommendation[] = [];
  const remainingDailyGames = Math.max(0, input.dailyGoalGames - input.todayGames);
  const weakestOperation = input.operationPerformance.at(-1) ?? null;
  const strongestOperation = input.operationPerformance[0] ?? null;
  const weakestLessonEntry = buildLessonMasteryInsights(input.progress, 1).weakest[0] ?? null;

  if (weakestOperation && weakestOperation.averageAccuracy < 75) {
    recommendations.push({
      id: 'focus_weakest_operation',
      title: `Skup sie na: ${weakestOperation.label}`,
      description: `Wykonaj 2 krotkie sesje ${weakestOperation.label.toLowerCase()} i celuj w min. 80% poprawnosci.`,
      priority: 'high',
      action: {
        label: 'Otworz lekcje',
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
      title: 'Stabilizuj skutecznosc',
      description: 'Przez 3 gry wybieraj tryb sredni i skup sie na dokladnosci zamiast czasie.',
      priority: 'high',
      action: {
        label: 'Uruchom trening',
        page: 'Game',
        query: {
          quickStart: 'training',
        },
      },
    });
  }

  if (weakestLessonEntry && weakestLessonEntry.masteryPercent < 80) {
    recommendations.push({
      id: 'strengthen_lesson_mastery',
      title: `Powtorz lekcje: ${weakestLessonEntry.title}`,
      description: `Aktualne opanowanie to ${weakestLessonEntry.masteryPercent}%. Jedna powtorka tej lekcji podniesie stabilnosc.`,
      priority: weakestLessonEntry.masteryPercent < 60 ? 'high' : 'medium',
      action: {
        label: 'Otworz lekcje',
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
      title: 'Domknij dzienny cel',
      description:
        remainingDailyGames === 1
          ? 'Brakuje tylko 1 gry do dziennego celu.'
          : `Brakuje ${remainingDailyGames} gier do dziennego celu.`,
      priority: 'medium',
      action: {
        label: 'Zagraj teraz',
        page: 'Game',
        query: {
          quickStart: 'training',
        },
      },
    });
  }

  if (input.currentStreakDays < 2) {
    recommendations.push({
      id: 'streak_bootstrap',
      title: 'Zbuduj serie',
      description: 'Zagraj takze jutro, aby uruchomic serie kolejnych dni.',
      priority: 'medium',
      action: {
        label: 'Zagraj dzis',
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
      title: 'Utrzymaj tempo',
      description: strongestOperation
        ? `Swietna forma. Dorzuc 1 sesje ${strongestOperation.label.toLowerCase()} dla utrwalenia.`
        : 'Swietna forma. Kontynuuj dzisiejszy rytm nauki.',
      priority: 'low',
      action: {
        label: 'Kontynuuj gre',
        page: 'Game',
        query: {
          quickStart: 'training',
        },
      },
    });
  }

  return recommendations.slice(0, 3);
};

export const buildKangurLearnerProfileSnapshot = (
  input: BuildProfileSnapshotInput
): KangurLearnerProfileSnapshot => {
  const now = input.now ?? new Date();
  const normalizedScores = normalizeScoresDesc(input.scores);
  const level = getCurrentLevel(input.progress.totalXp);
  const nextLevel = getNextLevel(input.progress.totalXp);
  const xpIntoLevel = input.progress.totalXp - level.minXp;
  const xpNeeded = nextLevel ? Math.max(1, nextLevel.minXp - level.minXp) : 1;
  const levelProgressPercent = nextLevel ? toPercent((xpIntoLevel / xpNeeded) * 100) : 100;
  const streaks = computeStreaks(normalizedScores, now);
  const operationPerformance = computeOperationPerformance(normalizedScores);
  const weeklyActivity = computeWeeklyActivity(normalizedScores, now);
  const recentSessions = computeRecentSessions(normalizedScores);
  const accuracyValues = normalizedScores.map(
    (score) => (score.correct_answers / Math.max(1, score.total_questions || 1)) * 100
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
  const unlockedBadgeIds = BADGES.filter((badge) => input.progress.badges.includes(badge.id)).map(
    (badge) => badge.id
  );
  const recommendations = buildRecommendations({
    averageAccuracy,
    currentStreakDays: streaks.currentStreakDays,
    dailyGoalGames,
    todayGames,
    operationPerformance,
    progress: input.progress,
  });

  return {
    totalXp: input.progress.totalXp,
    gamesPlayed: input.progress.gamesPlayed,
    lessonsCompleted: input.progress.lessonsCompleted,
    perfectGames: input.progress.perfectGames,
    totalBadges: BADGES.length,
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
