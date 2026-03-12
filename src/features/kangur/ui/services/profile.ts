import type { KangurScoreRecord } from '@/features/kangur/services/ports';
import { KANGUR_LESSON_LIBRARY } from '@/features/kangur/settings';
import {
  getCurrentLevel,
  getNextLevel,
  getProgressBadges,
  getProgressAverageAccuracy,
  getProgressBestAccuracy,
  getRecommendedSessionMomentum,
} from '@/features/kangur/ui/services/progress';
import type {
  KangurAssignmentPriority,
  KangurProgressState,
  KangurRouteAction,
} from '@/shared/contracts/kangur';

const OPERATION_LABELS: Record<string, { label: string; emoji: string }> = {
  addition: { label: 'Dodawanie', emoji: '➕' },
  subtraction: { label: 'Odejmowanie', emoji: '➖' },
  multiplication: { label: 'Mnozenie', emoji: '✖️' },
  division: { label: 'Dzielenie', emoji: '➗' },
  decimals: { label: 'Ulamki', emoji: '🔢' },
  powers: { label: 'Potegi', emoji: '⚡' },
  roots: { label: 'Pierwiastki', emoji: '√' },
  clock: { label: 'Zegar', emoji: '🕐' },
  calendar: { label: 'Kalendarz', emoji: '📅' },
  geometry: { label: 'Geometria', emoji: '🔷' },
  logical: { label: 'Logika', emoji: '🧩' },
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
const ACTIVITY_PRIMARY_TO_OPERATION: Record<string, string> = {
  adding: 'addition',
  addition: 'addition',
  subtracting: 'subtraction',
  subtraction: 'subtraction',
  multiplication: 'multiplication',
  division: 'division',
  decimals: 'decimals',
  powers: 'powers',
  roots: 'roots',
  mixed: 'mixed',
  clock: 'clock',
  calendar: 'calendar',
  geometry: 'geometry',
  geometry_basics: 'geometry',
  geometry_shapes: 'geometry',
  geometry_symmetry: 'geometry',
  geometry_perimeter: 'geometry',
  logical_thinking: 'logical',
  logical_patterns: 'logical',
  logical_classification: 'logical',
  logical_reasoning: 'logical',
  logical_analogies: 'logical',
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

const buildPracticeRecommendationAction = (
  operation: string | null,
  averageAccuracy: number
): KangurRouteAction => {
  if (!operation || !QUICK_START_OPERATIONS.has(operation)) {
    return {
      label: 'Uruchom trening',
      page: 'Game',
      query: {
        quickStart: 'training',
      },
    };
  }

  return {
    label: 'Uruchom trening',
    page: 'Game',
    query: {
      quickStart: 'operation',
      operation,
      difficulty: resolvePracticeDifficulty(averageAccuracy),
    },
  };
};

export type KangurOperationPerformance = {
  operation: string;
  label: string;
  emoji: string;
  attempts: number;
  averageAccuracy: number;
  averageScore: number;
  bestScore: number;
  totalXpEarned: number;
  averageXpPerSession: number;
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
  xpEarned: number | null;
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
  todayXpEarned: number;
  weeklyXpEarned: number;
  averageXpPerSession: number;
  recommendedSessionsCompleted: number;
  recommendedSessionProgressPercent: number;
  recommendedSessionSummary: string;
  recommendedSessionNextBadgeName: string | null;
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

const resolveOperationFromActivityKey = (activityKey: string): string | null => {
  const parts = activityKey.split(':');
  const primary = (parts[1] ?? parts[0] ?? '').trim();
  if (!primary) {
    return null;
  }

  return ACTIVITY_PRIMARY_TO_OPERATION[primary] ?? (OPERATION_LABELS[primary] ? primary : primary);
};

const computeOperationPerformance = (
  scores: KangurScoreRecord[],
  progress: KangurProgressState
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
      const operationInfo = OPERATION_LABELS[operation] ?? { label: operation, emoji: '❓' };
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
  todayXpEarned: number;
  weeklyXpEarned: number;
  averageXpPerSession: number;
  operationPerformance: KangurOperationPerformance[];
  progress: KangurProgressState;
}): KangurLearnerRecommendation[] => {
  const recommendations: KangurLearnerRecommendation[] = [];
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
  const weakestLessonEntry = buildLessonMasteryInsights(input.progress, 1).weakest[0] ?? null;
  const xpMomentumTarget = Math.max(20, input.averageXpPerSession);

  if (weakestOperation && weakestOperation.averageAccuracy < 75) {
    recommendations.push({
      id: 'focus_weakest_operation',
      title: `Skup się na: ${weakestOperation.label}`,
      description: `Wykonaj 2 krótkie sesje ${weakestOperation.label.toLowerCase()} i celuj w min. 80% poprawności.`,
      priority: 'high',
      action: {
        label: 'Otwórz lekcję',
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
      title: 'Stabilizuj skuteczność',
      description: 'Przez 3 gry wybieraj tryb średni i skup się na dokładności zamiast na czasie.',
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
      title: `Powtórz lekcję: ${weakestLessonEntry.title}`,
      description: `Aktualne opanowanie to ${weakestLessonEntry.masteryPercent}%. Jedna powtórka tej lekcji podniesie stabilność.`,
      priority: weakestLessonEntry.masteryPercent < 60 ? 'high' : 'medium',
      action: {
        label: 'Otwórz lekcję',
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
          ? `Brakuje tylko 1 gry do dziennego celu. Dziś masz już +${input.todayXpEarned} XP.`
          : `Brakuje ${remainingDailyGames} gier do dziennego celu. Dziś masz już +${input.todayXpEarned} XP.`,
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

  if (
    remainingDailyGames === 0 &&
    input.todayXpEarned < xpMomentumTarget &&
    input.averageAccuracy >= 70
  ) {
    recommendations.push({
      id: 'boost_xp_momentum',
      title: 'Podkręć dzisiejsze XP',
      description: highestYieldOperation
        ? `Cel gier jest już zamknięty, ale dziś wpadło tylko +${input.todayXpEarned} XP. Jedna mocniejsza sesja ${highestYieldOperation.label.toLowerCase()} zwykle daje około ${highestYieldOperation.averageXpPerSession} XP na próbę.`
        : `Cel gier jest już zamknięty, ale dziś wpadło tylko +${input.todayXpEarned} XP. Jedna mocniejsza sesja treningowa powinna dowieźć ponad ${xpMomentumTarget} XP.`,
      priority: 'medium',
      action: buildPracticeRecommendationAction(
        highestYieldOperation?.operation ?? null,
        highestYieldOperation?.averageAccuracy ?? input.averageAccuracy
      ),
    });
  }

  if (input.currentStreakDays < 2) {
    recommendations.push({
      id: 'streak_bootstrap',
      title: 'Zbuduj serię',
      description: 'Zagraj także jutro, aby uruchomić serię kolejnych dni.',
      priority: 'medium',
      action: {
        label: 'Zagraj dziś',
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
      description: momentumOperation
        ? `Świetna forma. W 7 dni zebrano +${input.weeklyXpEarned} XP. Dorzuć 1 sesję ${momentumOperation.label.toLowerCase()} dla utrwalenia.`
        : `Świetna forma. W 7 dni zebrano +${input.weeklyXpEarned} XP. Kontynuuj dzisiejszy rytm nauki.`,
      priority: 'low',
      action: buildPracticeRecommendationAction(
        momentumOperation?.operation ?? null,
        momentumOperation?.averageAccuracy ?? input.averageAccuracy
      ),
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
  const operationPerformance = computeOperationPerformance(normalizedScores, input.progress);
  const weeklyActivity = computeWeeklyActivity(normalizedScores, now);
  const recentSessions = computeRecentSessions(normalizedScores);
  const xpAnalytics = computeXpAnalytics(normalizedScores, input.progress, now);
  const recommendedSessionMomentum = getRecommendedSessionMomentum(input.progress);
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
  const badgeStatuses = getProgressBadges(input.progress);
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
    recommendedSessionSummary: recommendedSessionMomentum.summary,
    recommendedSessionNextBadgeName: recommendedSessionMomentum.nextBadgeName,
    operationPerformance,
    recentSessions,
    weeklyActivity,
    recommendations,
  };
};
