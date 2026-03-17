import type {
  KangurAddXpResult,
  KangurProgressState,
} from '@/features/kangur/ui/types';
import {
  normalizeKangurProgressState,
} from '@/features/kangur/shared/contracts/kangur';

import {
  ACTIVITY_LABELS,
  CLOCK_TRAINING_SECTION_LABELS,
  LESSON_KEY_TO_OPERATION,
  LEVELS,
  FALLBACK_LEVEL,
  BADGE_TRACK_META,
  type KangurProgressLevel,
  type KangurRewardCounterKey,
  type KangurLessonPracticeReward,
  type KangurBadgeStatus,
  type KangurRecommendedSessionMomentum,
  type KangurRecommendedSessionProjection,
  type KangurProgressActivitySummary,
  type KangurBadgeTrackKey,
} from './progress.contracts';
import {
  BADGES,
  getAverageAccuracyPercent,
  getBadgeProgress,
  getProgressBadges,
} from './progress.badges';
import {
  clampCounter,
  createRewardOutcome,
} from './progress.rewards';
import {
  loadProgress,
  saveProgress,
} from './progress.persistence';

// Re-export modular parts
export * from './progress.contracts';
export * from './progress.badges';
export * from './progress.rewards';
export * from './progress.persistence';

const mergeUniqueStrings = (values: string[]): string[] => Array.from(new Set(values));

const resolveActivityTokenLabel = (token: string): string =>
  ACTIVITY_LABELS[token] ?? token.replace(/_/g, ' ').trim();

const resolveRewardOperation = ({
  operation,
  lessonKey,
  activityKey,
}: {
  operation?: string | null;
  lessonKey?: string | null;
  activityKey?: string | null;
}): string | null => {
  const normalizedOperation = operation?.trim();
  if (normalizedOperation) {
    return normalizedOperation;
  }

  const normalizedLessonKey = lessonKey?.trim();
  if (normalizedLessonKey) {
    return LESSON_KEY_TO_OPERATION[normalizedLessonKey] ?? normalizedLessonKey;
  }

  const normalizedActivityKey = activityKey?.trim();
  if (!normalizedActivityKey) {
    return null;
  }

  const [, rawPrimary = ''] = normalizedActivityKey.split(':');
  const normalizedPrimary = rawPrimary.trim();
  if (!normalizedPrimary) {
    return null;
  }

  return LESSON_KEY_TO_OPERATION[normalizedPrimary] ?? normalizedPrimary;
};

export const formatKangurProgressActivityLabel = (activityKey: string): string => {
  const [kind = '', rawPrimary = '', rawSecondary = ''] = activityKey.split(':');
  const primary = resolveActivityTokenLabel(rawPrimary);

  if (kind === 'game') {
    return `Gra: ${primary}`;
  }

  if (kind === 'lesson_practice') {
    return `Ćwiczenie: ${primary}`;
  }

  if (kind === 'training') {
    if (rawPrimary === 'clock') {
      const sectionLabel = CLOCK_TRAINING_SECTION_LABELS[rawSecondary] ?? resolveActivityTokenLabel(rawSecondary);
      return `Trening zegara: ${sectionLabel}`;
    }

    return `Trening: ${primary}`;
  }

  if (kind === 'lesson_completion') {
    return `Lekcja: ${primary}`;
  }

  return resolveActivityTokenLabel(activityKey);
};

export const getProgressAverageAccuracy = (progress: KangurProgressState): number =>
  getAverageAccuracyPercent(progress);

export const getProgressAverageXpPerSession = (progress: KangurProgressState): number => {
  if (progress.gamesPlayed <= 0) {
    return 0;
  }

  return clampCounter(progress.totalXp / progress.gamesPlayed);
};

export const getProgressBestAccuracy = (progress: KangurProgressState): number => {
  const activityStats = Object.values(progress.activityStats ?? {});
  if (activityStats.length === 0) {
    return getAverageAccuracyPercent(progress);
  }

  return Math.max(...activityStats.map((entry) => entry.bestScorePercent));
};

export function createGameReward(
  progress: KangurProgressState,
  {
    operation,
    difficulty,
    correctAnswers,
    totalQuestions,
    durationSeconds,
    followsRecommendation = false,
  }: {
    operation: string;
    difficulty?: string | null;
    correctAnswers: number;
    totalQuestions: number;
    durationSeconds?: number | null;
    followsRecommendation?: boolean;
  }
): KangurLessonPracticeReward {
  return createRewardOutcome(progress, {
    activityKey: `game:${operation.trim() || 'mixed'}`,
    profile: 'game',
    operation,
    difficulty,
    correctAnswers,
    totalQuestions,
    durationSeconds,
    countsAsGame: true,
    followsRecommendation,
    strongThresholdPercent: 70,
  });
}

export const createGameSessionReward = createGameReward;

export function createTrainingReward(
  progress: KangurProgressState,
  {
    activityKey,
    lessonKey,
    correctAnswers,
    totalQuestions,
    difficulty,
    durationSeconds,
    strongThresholdPercent = 70,
    perfectCounterKey,
  }: {
    activityKey: string;
    lessonKey: string;
    correctAnswers: number;
    totalQuestions: number;
    difficulty?: string | null;
    durationSeconds?: number | null;
    strongThresholdPercent?: number;
    perfectCounterKey?: KangurRewardCounterKey;
  }
): KangurLessonPracticeReward {
  return createRewardOutcome(progress, {
    activityKey,
    profile: 'training',
    lessonKey,
    operation: resolveRewardOperation({ lessonKey, activityKey }),
    correctAnswers,
    totalQuestions,
    difficulty,
    durationSeconds,
    countsAsGame: true,
    strongThresholdPercent,
    perfectCounterKey,
  });
}

export function createLessonPracticeReward(
  progress: KangurProgressState,
  lessonKey: string,
  correctAnswers: number,
  totalQuestions: number,
  strongThresholdPercent?: number
): KangurLessonPracticeReward;
export function createLessonPracticeReward(
  progress: KangurProgressState,
  config: {
    activityKey: string;
    lessonKey: string;
    correctAnswers: number;
    totalQuestions: number;
    difficulty?: string | null;
    durationSeconds?: number | null;
    strongThresholdPercent?: number;
  }
): KangurLessonPracticeReward;
export function createLessonPracticeReward(
  progress: KangurProgressState,
  configOrLessonKey:
    | string
    | {
        activityKey: string;
        lessonKey: string;
        correctAnswers: number;
        totalQuestions: number;
        difficulty?: string | null;
        durationSeconds?: number | null;
        strongThresholdPercent?: number;
      },
  correctAnswers?: number,
  totalQuestions?: number,
  strongThresholdPercent?: number
): KangurLessonPracticeReward {
  const resolvedConfig =
    typeof configOrLessonKey === 'string'
      ? {
          activityKey: `lesson_practice:${configOrLessonKey.trim() || 'unknown'}`,
          lessonKey: configOrLessonKey,
          correctAnswers: Math.max(0, Math.round(correctAnswers ?? 0)),
          totalQuestions: Math.max(1, Math.round(totalQuestions ?? 1)),
          strongThresholdPercent,
        }
      : configOrLessonKey;

  const {
    activityKey,
    lessonKey,
    correctAnswers: resolvedCorrectAnswers,
    totalQuestions: resolvedTotalQuestions,
    difficulty,
    durationSeconds,
    strongThresholdPercent: resolvedStrongThreshold = 70,
  } = resolvedConfig;

  return createRewardOutcome(progress, {
    activityKey,
    profile: 'lesson_practice',
    lessonKey,
    operation: resolveRewardOperation({ lessonKey, activityKey }),
    correctAnswers: resolvedCorrectAnswers,
    totalQuestions: resolvedTotalQuestions,
    difficulty,
    durationSeconds,
    countsAsGame: true,
    strongThresholdPercent: resolvedStrongThreshold,
  });
}

export function createLessonCompletionReward(
  progress: KangurProgressState,
  lessonKey: string,
  scorePercent = 100
): KangurLessonPracticeReward {
  return createRewardOutcome(progress, {
    activityKey: `lesson_completion:${lessonKey.trim() || 'unknown'}`,
    profile: 'lesson_completion',
    lessonKey,
    scorePercentOverride: scorePercent,
    countsAsLessonCompletion: true,
    strongThresholdPercent: 100,
  });
}

export function getCurrentLevel(totalXp: number): KangurProgressLevel {
  let currentLevel = LEVELS[0] ?? FALLBACK_LEVEL;
  for (const level of LEVELS) {
    if (totalXp >= level.minXp) {
      currentLevel = level;
    }
  }
  return currentLevel;
}

export function getNextLevel(totalXp: number): KangurProgressLevel | null {
  for (const level of LEVELS) {
    if (totalXp < level.minXp) {
      return level;
    }
  }
  return null;
}

export function checkNewBadges(progress: KangurProgressState): string[] {
  const newBadges: string[] = [];
  for (const badge of BADGES) {
    if (!progress.badges.includes(badge.id) && getBadgeProgress(progress, badge).isUnlocked) {
      newBadges.push(badge.id);
    }
  }
  return newBadges;
}

export function addXp(
  amount: number,
  extraUpdates: Partial<KangurProgressState> = {}
): KangurAddXpResult {
  const progress = loadProgress();
  const updated = normalizeKangurProgressState({
    ...progress,
    totalXp: progress.totalXp + amount,
    ...extraUpdates,
  });
  const newBadges = checkNewBadges(updated);
  updated.badges = mergeUniqueStrings([...updated.badges, ...newBadges]);
  saveProgress(updated);
  return { updated, newBadges, xpGained: amount };
}

export const getBadgeTrackMeta = (key: KangurBadgeTrackKey): { label: string; emoji: string; order: number } =>
  BADGE_TRACK_META[key];

export function getNextLockedBadge(progress: KangurProgressState): KangurBadgeStatus | null {
  const badgeStatuses = getProgressBadges(progress);
  const locked = badgeStatuses.filter(b => !b.isUnlocked);
  if (locked.length === 0) return null;
  
  return locked.sort((a, b) => {
    if (a.progressPercent !== b.progressPercent) {
      return b.progressPercent - a.progressPercent;
    }
    const aMeta = BADGE_TRACK_META[a.track];
    const bMeta = BADGE_TRACK_META[b.track];
    return (aMeta?.order ?? 99) - (bMeta?.order ?? 99);
  })[0] ?? null;
}

export function getProgressTopActivities(
  progress: KangurProgressState,
  limit = 3
): KangurProgressActivitySummary[] {
  const entries = Object.entries(progress.activityStats ?? {});
  return entries
    .map(([key, stats]) => ({
      key,
      label: formatKangurProgressActivityLabel(key),
      sessionsPlayed: stats.sessionsPlayed,
      perfectSessions: stats.perfectSessions,
      totalXpEarned: stats.totalXpEarned,
      averageXpPerSession: stats.sessionsPlayed > 0 ? Math.round(stats.totalXpEarned / stats.sessionsPlayed) : 0,
      averageAccuracy: Math.round((stats.totalCorrectAnswers / (stats.totalQuestionsAnswered || 1)) * 100),
      bestScorePercent: stats.bestScorePercent,
      currentStreak: stats.currentStreak,
      bestStreak: stats.bestStreak,
    }))
    .sort((a, b) => b.totalXpEarned - a.totalXpEarned)
    .slice(0, limit);
}

export function getRecommendedSessionMomentum(
  progress: KangurProgressState
): KangurRecommendedSessionMomentum {
  const completed = progress.recommendedSessionsCompleted ?? 0;
  const badges = getProgressBadges(progress).filter(b => ['guided_step', 'guided_keeper'].includes(b.id));
  const nextBadge = badges.find(b => !b.isUnlocked);
  
  if (!nextBadge) {
    return {
      completedSessions: completed,
      progressPercent: 100,
      summary: 'Wszystkie cele osiągnięte!',
      nextBadgeName: null,
    };
  }
  
  return {
    completedSessions: completed,
    progressPercent: nextBadge.progressPercent,
    summary: nextBadge.summary,
    nextBadgeName: nextBadge.name,
  };
}

export function getRecommendedSessionProjection(
  progress: KangurProgressState,
  isSuccessful: boolean
): KangurRecommendedSessionProjection {
  const current = getRecommendedSessionMomentum(progress);
  
  const projectedProgress = {
    ...progress,
    recommendedSessionsCompleted: (progress.recommendedSessionsCompleted ?? 0) + (isSuccessful ? 1 : 0),
  };
  
  const projected = getRecommendedSessionMomentum(projectedProgress);
  
  return { current, projected };
}

const OPENED_TASKS_LIMIT = 60;

type KangurOpenedTaskInput = {
  kind: NonNullable<KangurProgressState['openedTasks']>[number]['kind'];
  title: string;
  href: string;
  openedAt?: string | null;
};

export function recordKangurOpenedTask(input: KangurOpenedTaskInput): void {
  const title = input.title.trim();
  const href = input.href.trim();
  if (!title || !href) {
    return;
  }

  const openedAt = input.openedAt?.trim() || new Date().toISOString();
  const progress = loadProgress();
  const current = progress.openedTasks ?? [];
  const key = `${input.kind}::${href}`;

  const next = [
    { kind: input.kind, title, href, openedAt },
    ...current.filter((entry) => `${entry.kind}::${entry.href}` !== key),
  ].slice(0, OPENED_TASKS_LIMIT);

  saveProgress(
    normalizeKangurProgressState({
      ...progress,
      openedTasks: next,
    })
  );
}

type KangurLessonPanelProgressInput = {
  lessonKey: string;
  sectionId: string;
  viewedCount: number;
  totalCount: number;
  label?: string | null;
  viewedAt?: string | null;
};

type KangurLessonPanelTimeInput = {
  lessonKey: string;
  sectionId: string;
  panelId: string;
  seconds: number;
  panelTitle?: string | null;
  sessionId: string;
  sessionStartedAt?: string | null;
  sessionUpdatedAt?: string | null;
};

export function recordKangurLessonPanelProgress(
  input: KangurLessonPanelProgressInput
): void {
  const lessonKey = input.lessonKey.trim();
  const sectionId = input.sectionId.trim();
  if (!lessonKey || !sectionId) {
    return;
  }

  const totalCount = Math.max(0, Math.floor(input.totalCount));
  if (totalCount <= 0) {
    return;
  }

  const viewedCount = Math.min(Math.max(Math.floor(input.viewedCount), 0), totalCount);
  if (viewedCount <= 0) {
    return;
  }

  const progress = loadProgress();
  const existingLesson = progress.lessonPanelProgress?.[lessonKey] ?? {};
  const existingSection = existingLesson[sectionId];
  const lastViewedAt = input.viewedAt?.trim() || new Date().toISOString();
  const label = input.label?.trim() || existingSection?.label;
  const nextViewedCount = Math.max(existingSection?.viewedCount ?? 0, viewedCount);
  const nextTotalCount = Math.max(existingSection?.totalCount ?? 0, totalCount);

  if (
    nextViewedCount === existingSection?.viewedCount &&
    nextTotalCount === existingSection?.totalCount &&
    label === existingSection?.label
  ) {
    return;
  }

  const updatedSection = {
    viewedCount: nextViewedCount,
    totalCount: nextTotalCount,
    lastViewedAt:
      viewedCount > (existingSection?.viewedCount ?? 0)
        ? lastViewedAt
        : existingSection?.lastViewedAt ?? lastViewedAt,
    ...(label ? { label } : {}),
  };

  saveProgress(
    normalizeKangurProgressState({
      ...progress,
      lessonPanelProgress: {
        ...(progress.lessonPanelProgress ?? {}),
        [lessonKey]: {
          ...existingLesson,
          [sectionId]: updatedSection,
        },
      },
    })
  );
}

export function recordKangurLessonPanelTime(input: KangurLessonPanelTimeInput): void {
  const lessonKey = input.lessonKey.trim();
  const sectionId = input.sectionId.trim();
  const panelId = input.panelId.trim();
  const sessionId = input.sessionId.trim();
  if (!lessonKey || !sectionId || !panelId || !sessionId) {
    return;
  }

  const seconds = Math.max(0, Math.round(input.seconds));
  if (seconds <= 0) {
    return;
  }

  const progress = loadProgress();
  const existingLesson = progress.lessonPanelProgress?.[lessonKey] ?? {};
  const existingSection = existingLesson[sectionId];
  const nowIso = new Date().toISOString();
  const panelTitle = input.panelTitle?.trim() || undefined;
  const sessionUpdatedAt = input.sessionUpdatedAt?.trim() || nowIso;
  const sessionStartedAt = input.sessionStartedAt?.trim() || nowIso;
  const isSameSession = existingSection?.sessionId === sessionId;
  const existingPanelTimes = isSameSession ? (existingSection?.panelTimes ?? {}) : {};
  const existingPanel = existingPanelTimes[panelId];

  const updatedPanel = {
    seconds: Math.max(existingPanel?.seconds ?? 0, seconds),
    ...(panelTitle ? { title: panelTitle } : existingPanel?.title ? { title: existingPanel.title } : {}),
  };

  saveProgress(
    normalizeKangurProgressState({
      ...progress,
      lessonPanelProgress: {
        ...(progress.lessonPanelProgress ?? {}),
        [lessonKey]: {
          ...existingLesson,
          [sectionId]: {
            ...(existingSection ?? {
              viewedCount: 0,
              totalCount: 0,
            }),
            panelTimes: {
              ...existingPanelTimes,
              [panelId]: updatedPanel,
            },
            sessionId,
            sessionStartedAt: isSameSession
              ? existingSection?.sessionStartedAt ?? sessionStartedAt
              : sessionStartedAt,
            sessionUpdatedAt,
          },
        },
      },
    })
  );
}
