import type {
  KangurRewardBreakdownEntry,
  KangurProgressState,
} from '@/features/kangur/ui/types';
import {
  type KangurActivityStatsEntry,
} from '@/features/kangur/shared/contracts/kangur';
import {
  KangurLessonPracticeReward,
  KangurRewardInput,
  type KangurRewardProfile,
  KangurRewardProfileConfig,
  REWARD_PROFILE_CONFIG,
} from './progress.contracts';
import { isProgressPersistenceEnabled } from './progress.persistence';
import { clampPercent } from './progress.badges';

export const DIFFICULTY_XP_BONUS: Record<string, number> = {
  easy: 0,
  medium: 4,
  hard: 8,
};

const ENGLISH_PROFILE_OVERRIDES: Partial<
  Record<KangurRewardProfile, Partial<KangurRewardProfileConfig>>
> = {
  lesson_practice: {
    baseXp: 14,
    minimumXp: 14,
    perfectBonus: 16,
    improvementBonus: 4,
  },
  lesson_completion: {
    baseXp: 24,
    minimumXp: 24,
    perfectBonus: 8,
  },
};

const ENGLISH_ACCURACY_BONUSES = [
  { threshold: 100, xp: 20 },
  { threshold: 95, xp: 14 },
  { threshold: 85, xp: 10 },
  { threshold: 70, xp: 6 },
  { threshold: 55, xp: 3 },
];

export const MASTERY_STAGE_BONUSES = [
  { threshold: 100, xp: 4 },
  { threshold: 75, xp: 3 },
  { threshold: 50, xp: 2 },
  { threshold: 25, xp: 1 },
];

export const clampCounter = (value: number): number => Math.max(0, Math.round(value));

export const createEmptyActivityStatsEntry = (): KangurActivityStatsEntry => ({
  sessionsPlayed: 0,
  perfectSessions: 0,
  totalCorrectAnswers: 0,
  totalQuestionsAnswered: 0,
  totalXpEarned: 0,
  bestScorePercent: 0,
  lastScorePercent: 0,
  currentStreak: 0,
  bestStreak: 0,
  lastPlayedAt: null,
});

export const getActivityStatsEntry = (
  progress: KangurProgressState,
  activityKey: string
): KangurActivityStatsEntry => progress.activityStats?.[activityKey] ?? createEmptyActivityStatsEntry();

export const getAccuracyBonus = (scorePercent: number): number => {
  if (scorePercent >= 100) {
    return 18;
  }
  if (scorePercent >= 90) {
    return 14;
  }
  if (scorePercent >= 75) {
    return 10;
  }
  if (scorePercent >= 60) {
    return 6;
  }
  if (scorePercent >= 40) {
    return 2;
  }
  return 0;
};

const getEnglishAccuracyBonus = (scorePercent: number): number => {
  for (const tier of ENGLISH_ACCURACY_BONUSES) {
    if (scorePercent >= tier.threshold) {
      return tier.xp;
    }
  }
  return 0;
};

const hasEnglishToken = (value?: string | null): boolean =>
  value?.split(':').some((token) => token.trim().toLowerCase().startsWith('english_')) ?? false;

export const getDifficultyBonus = (difficulty?: string | null): number => {
  if (!difficulty) {
    return 0;
  }

  return DIFFICULTY_XP_BONUS[difficulty] ?? 0;
};

export const getSpeedBonus = (durationSeconds?: number | null, totalQuestions?: number): number => {
  if (!durationSeconds || !totalQuestions || totalQuestions <= 0) {
    return 0;
  }

  const secondsPerQuestion = durationSeconds / totalQuestions;
  if (secondsPerQuestion <= 4) {
    return 8;
  }
  if (secondsPerQuestion <= 7) {
    return 5;
  }
  if (secondsPerQuestion <= 10) {
    return 3;
  }
  if (secondsPerQuestion <= 14) {
    return 1;
  }
  return 0;
};

export const getStreakBonus = (nextStreak: number): number => {
  if (nextStreak <= 1) {
    return 0;
  }

  return Math.min(8, (nextStreak - 1) * 2);
};

export const getVarietyBonus = (
  progress: KangurProgressState,
  operation?: string | null,
  countsAsGame?: boolean,
  passedStrongThreshold?: boolean
): number => {
  if (!countsAsGame || !operation || !passedStrongThreshold) {
    return 0;
  }

  return progress.operationsPlayed.includes(operation) ? 0 : 3;
};

export const getActivityRepeatPenalty = (
  progress: KangurProgressState,
  activityKey: string,
  countsAsGame?: boolean
): { nextRepeatStreak: number; penalty: number } => {
  if (!countsAsGame) {
    return { nextRepeatStreak: progress.currentActivityRepeatStreak ?? 0, penalty: 0 };
  }

  const nextRepeatStreak =
    progress.lastRewardedActivityKey === activityKey
      ? Math.max(1, (progress.currentActivityRepeatStreak ?? 0) + 1)
      : 1;

  if (nextRepeatStreak < 3) {
    return { nextRepeatStreak, penalty: 0 };
  }

  return {
    nextRepeatStreak,
    penalty: Math.min(6, (nextRepeatStreak - 2) * 2),
  };
};

export const getMasteryGainBonus = (
  progress: KangurProgressState,
  lessonKey: string | undefined,
  nextLessonMastery: KangurProgressState['lessonMastery'],
  passedStrongThreshold: boolean
): number => {
  const normalizedLessonKey = lessonKey?.trim();
  if (!normalizedLessonKey || !passedStrongThreshold) {
    return 0;
  }

  const currentMastery = progress.lessonMastery[normalizedLessonKey]?.masteryPercent ?? 0;
  const nextMastery = nextLessonMastery[normalizedLessonKey]?.masteryPercent ?? currentMastery;

  for (const stage of MASTERY_STAGE_BONUSES) {
    if (currentMastery < stage.threshold && nextMastery >= stage.threshold) {
      return stage.xp;
    }
  }

  if (currentMastery > 0 && nextMastery >= currentMastery + 10) {
    return 2;
  }

  return 0;
};

export const buildRewardBreakdown = (
  config: KangurRewardProfileConfig,
  {
    accuracyBonus,
    difficultyBonus,
    speedBonus,
    streakBonus,
    firstActivityBonus,
    improvementBonus,
    masteryBonus,
    varietyBonus,
    guidedFocusBonus,
    antiRepeatPenalty,
    perfectBonus,
    totalXp,
  }: {
    accuracyBonus: number;
    difficultyBonus: number;
    speedBonus: number;
    streakBonus: number;
    firstActivityBonus: number;
    improvementBonus: number;
    masteryBonus: number;
    varietyBonus: number;
    guidedFocusBonus: number;
    antiRepeatPenalty: number;
    perfectBonus: number;
    totalXp: number;
  }
): KangurRewardBreakdownEntry[] => {
  const entries: KangurRewardBreakdownEntry[] = [
    { kind: 'base', label: 'Ukończenie rundy', xp: config.baseXp },
  ];

  if (accuracyBonus > 0) {
    entries.push({ kind: 'accuracy', label: 'Skuteczność', xp: accuracyBonus });
  }
  if (difficultyBonus > 0) {
    entries.push({ kind: 'difficulty', label: 'Poziom trudności', xp: difficultyBonus });
  }
  if (speedBonus > 0) {
    entries.push({ kind: 'speed', label: 'Tempo', xp: speedBonus });
  }
  if (streakBonus > 0) {
    entries.push({ kind: 'streak', label: 'Seria', xp: streakBonus });
  }
  if (firstActivityBonus > 0) {
    entries.push({ kind: 'first_activity', label: 'Pierwsza mocna próba', xp: firstActivityBonus });
  }
  if (improvementBonus > 0) {
    entries.push({ kind: 'improvement', label: 'Poprawa wyniku', xp: improvementBonus });
  }
  if (masteryBonus > 0) {
    entries.push({ kind: 'mastery', label: 'Postęp opanowania', xp: masteryBonus });
  }
  if (varietyBonus > 0) {
    entries.push({ kind: 'variety', label: 'Nowa ścieżka', xp: varietyBonus });
  }
  if (guidedFocusBonus > 0) {
    entries.push({ kind: 'guided_focus', label: 'Polecony kierunek', xp: guidedFocusBonus });
  }
  if (perfectBonus > 0) {
    entries.push({ kind: 'perfect', label: 'Pełny wynik', xp: perfectBonus });
  }
  if (antiRepeatPenalty > 0) {
    entries.push({ kind: 'anti_repeat', label: 'Powtarzana aktywność', xp: -antiRepeatPenalty });
  }

  const breakdownTotal = entries.reduce((sum, entry) => sum + entry.xp, 0);
  if (totalXp > breakdownTotal) {
    entries.push({
      kind: 'minimum_floor',
      label: 'Minimalna nagroda',
      xp: totalXp - breakdownTotal,
    });
  }

  return entries.filter((entry) => entry.xp !== 0);
};

export const buildActivityStatsUpdate = (
  progress: KangurProgressState,
  activityKey: string,
  {
    scorePercent,
    correctAnswers,
    totalQuestions,
    xpEarned,
    isPerfect,
    passedStrongThreshold,
    playedAt,
  }: {
    scorePercent: number;
    correctAnswers: number;
    totalQuestions: number;
    xpEarned: number;
    isPerfect: boolean;
    passedStrongThreshold: boolean;
    playedAt: string;
  }
): KangurProgressState['activityStats'] => {
  const current = getActivityStatsEntry(progress, activityKey);
  const nextCurrentStreak = passedStrongThreshold ? current.currentStreak + 1 : 0;

  return {
    ...(progress.activityStats ?? {}),
    [activityKey]: {
      sessionsPlayed: current.sessionsPlayed + 1,
      perfectSessions: current.perfectSessions + (isPerfect ? 1 : 0),
      totalCorrectAnswers: current.totalCorrectAnswers + correctAnswers,
      totalQuestionsAnswered: current.totalQuestionsAnswered + totalQuestions,
      totalXpEarned: current.totalXpEarned + xpEarned,
      bestScorePercent: Math.max(current.bestScorePercent, scorePercent),
      lastScorePercent: scorePercent,
      currentStreak: nextCurrentStreak,
      bestStreak: Math.max(current.bestStreak, nextCurrentStreak),
      lastPlayedAt: playedAt,
    },
  };
};

export const buildLessonMasteryUpdate = (
  progress: KangurProgressState,
  lessonKey: string,
  scorePercent: number,
  playedAt: string
): KangurProgressState['lessonMastery'] => {
  const normalizedKey = lessonKey.trim();
  const current = progress.lessonMastery[normalizedKey];
  const attempts = (current?.attempts ?? 0) + 1;
  const bestScore = Math.max(current?.bestScorePercent ?? 0, scorePercent);
  const masteryPercent = clampPercent(bestScore);
  const completions = (current?.completions ?? 0) + (scorePercent >= 100 ? 1 : 0);

  return {
    ...progress.lessonMastery,
    [normalizedKey]: {
      attempts,
      completions,
      bestScorePercent: bestScore,
      lastScorePercent: scorePercent,
      masteryPercent,
      lastCompletedAt: playedAt,
    },
  };
};

export const createRewardOutcome = (
  progress: KangurProgressState,
  {
    activityKey,
    profile,
    correctAnswers = 0,
    totalQuestions = 0,
    scorePercentOverride,
    lessonKey,
    operation,
    difficulty,
    durationSeconds,
    strongThresholdPercent = 70,
    countsAsGame = false,
    countsAsLessonCompletion = false,
    followsRecommendation = false,
    perfectCounterKey,
    playedAt = new Date().toISOString(),
  }: KangurRewardInput
): KangurLessonPracticeReward => {
  const baseConfig = REWARD_PROFILE_CONFIG[profile];
  const isEnglishReward =
    hasEnglishToken(operation) || hasEnglishToken(lessonKey) || hasEnglishToken(activityKey);
  const config = isEnglishReward
    ? { ...baseConfig, ...(ENGLISH_PROFILE_OVERRIDES[profile] ?? {}) }
    : baseConfig;
  const safeTotalQuestions = Math.max(0, totalQuestions);
  const normalizedCorrectAnswers =
    safeTotalQuestions > 0
      ? Math.max(0, Math.min(correctAnswers, safeTotalQuestions))
      : Math.max(0, correctAnswers);
  const scorePercent =
    scorePercentOverride !== undefined
      ? clampPercent(scorePercentOverride)
      : clampPercent(
        safeTotalQuestions > 0 ? (normalizedCorrectAnswers / safeTotalQuestions) * 100 : 0
      );

  if (!isProgressPersistenceEnabled()) {
    return {
      xp: 0,
      scorePercent,
      progressUpdates: {},
      breakdown: [],
    };
  }

  const isPerfect =
    safeTotalQuestions > 0
      ? normalizedCorrectAnswers === safeTotalQuestions
      : scorePercent >= 100;
  const passedStrongThreshold = scorePercent >= clampPercent(strongThresholdPercent);
  const previousActivityStats = getActivityStatsEntry(progress, activityKey);
  const nextGlobalWinStreak = config.allowsStreakBonus
    ? passedStrongThreshold
      ? (progress.currentWinStreak ?? 0) + 1
      : 0
    : (progress.currentWinStreak ?? 0);
  const nextLessonMastery = lessonKey
    ? buildLessonMasteryUpdate(progress, lessonKey, scorePercent, playedAt)
    : progress.lessonMastery;
  const accuracyBonus = isEnglishReward
    ? getEnglishAccuracyBonus(scorePercent)
    : getAccuracyBonus(scorePercent);
  const difficultyBonus = getDifficultyBonus(difficulty);
  const speedBonus = config.allowsSpeedBonus ? getSpeedBonus(durationSeconds, safeTotalQuestions) : 0;
  const streakBonus = config.allowsStreakBonus ? getStreakBonus(nextGlobalWinStreak) : 0;
  const firstActivityBonus =
    previousActivityStats.sessionsPlayed === 0 && scorePercent >= clampPercent(strongThresholdPercent)
      ? config.firstActivityBonus
      : 0;
  const improvementBonus =
    config.improvementBonus > 0 &&
    previousActivityStats.bestScorePercent > 0 &&
    scorePercent > previousActivityStats.bestScorePercent &&
    passedStrongThreshold
      ? config.improvementBonus
      : 0;
  const masteryBonus = getMasteryGainBonus(
    progress,
    lessonKey,
    nextLessonMastery,
    passedStrongThreshold
  );
  const varietyBonus = getVarietyBonus(progress, operation, countsAsGame, passedStrongThreshold);
  const guidedFocusBonus = followsRecommendation && passedStrongThreshold ? 3 : 0;
  const { nextRepeatStreak, penalty: antiRepeatPenalty } = getActivityRepeatPenalty(
    progress,
    activityKey,
    countsAsGame
  );
  const perfectBonus = isPerfect ? config.perfectBonus : 0;

  const rawXp =
    config.baseXp +
    accuracyBonus +
    difficultyBonus +
    speedBonus +
    streakBonus +
    firstActivityBonus +
    improvementBonus +
    masteryBonus +
    varietyBonus +
    guidedFocusBonus +
    perfectBonus -
    antiRepeatPenalty;

  const totalXp = Math.max(config.minimumXp, rawXp);

  const breakdown = buildRewardBreakdown(config, {
    accuracyBonus,
    difficultyBonus,
    speedBonus,
    streakBonus,
    firstActivityBonus,
    improvementBonus,
    masteryBonus,
    varietyBonus,
    guidedFocusBonus,
    antiRepeatPenalty,
    perfectBonus,
    totalXp,
  });

  const nextOperationsPlayed =
    operation && countsAsGame && passedStrongThreshold
      ? Array.from(new Set([...progress.operationsPlayed, operation]))
      : progress.operationsPlayed;

  const activityStats = buildActivityStatsUpdate(progress, activityKey, {
    scorePercent,
    correctAnswers: normalizedCorrectAnswers,
    totalQuestions: safeTotalQuestions,
    xpEarned: totalXp,
    isPerfect,
    passedStrongThreshold,
    playedAt,
  });

  const progressUpdates: Partial<KangurProgressState> = {
    totalXp: progress.totalXp + totalXp,
    totalCorrectAnswers: (progress.totalCorrectAnswers ?? 0) + normalizedCorrectAnswers,
    totalQuestionsAnswered: (progress.totalQuestionsAnswered ?? 0) + safeTotalQuestions,
    currentWinStreak: nextGlobalWinStreak,
    bestWinStreak: Math.max(progress.bestWinStreak ?? 0, nextGlobalWinStreak),
    lessonMastery: nextLessonMastery,
    activityStats,
    operationsPlayed: nextOperationsPlayed,
    lastRewardedActivityKey: countsAsGame ? activityKey : progress.lastRewardedActivityKey,
    currentActivityRepeatStreak: countsAsGame ? nextRepeatStreak : progress.currentActivityRepeatStreak,
  };

  if (countsAsGame) {
    progressUpdates.gamesPlayed = progress.gamesPlayed + 1;
    if (isPerfect) {
      progressUpdates.perfectGames = progress.perfectGames + 1;
    }
  }

  if (countsAsLessonCompletion) {
    progressUpdates.lessonsCompleted = progress.lessonsCompleted + 1;
  }

  if (isPerfect && perfectCounterKey) {
    progressUpdates[perfectCounterKey] = (progress[perfectCounterKey] ?? 0) + 1;
  }

  if (followsRecommendation && passedStrongThreshold) {
    progressUpdates.recommendedSessionsCompleted = (progress.recommendedSessionsCompleted ?? 0) + 1;
  }

  return {
    xp: totalXp,
    scorePercent,
    progressUpdates,
    breakdown,
  };
};
