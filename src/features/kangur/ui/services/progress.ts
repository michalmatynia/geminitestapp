import type {
  KangurAddXpResult,
  KangurProgressState,
  KangurXpRewards,
} from '@/features/kangur/ui/types';
import {
  createDefaultKangurProgressState,
  normalizeKangurProgressState,
  type KangurLessonMasteryEntry,
} from '@/shared/contracts/kangur';

type KangurProgressLevel = {
  level: number;
  minXp: number;
  title: string;
  color: string;
};

type KangurBadge = {
  id: string;
  emoji: string;
  name: string;
  desc: string;
  condition: (progress: KangurProgressState) => boolean;
};

type KangurLessonPracticeReward = {
  xp: number;
  scorePercent: number;
  progressUpdates: Partial<KangurProgressState>;
};

export const KANGUR_PROGRESS_STORAGE_KEY = 'sprycio_progress';
export const KANGUR_PROGRESS_OWNER_STORAGE_KEY = 'sprycio_progress_owner';
export const KANGUR_PROGRESS_EVENT_NAME = 'kangur-progress-changed';

const DEFAULT_PROGRESS: KangurProgressState = createDefaultKangurProgressState();
const progressListeners = new Set<(progress: KangurProgressState) => void>();
let cachedProgressSnapshot: KangurProgressState = cloneProgress(DEFAULT_PROGRESS);
const SERVER_PROGRESS_SNAPSHOT: KangurProgressState = cachedProgressSnapshot;
const DEFAULT_PROGRESS_RAW = JSON.stringify(cachedProgressSnapshot);
let cachedProgressRaw: string | null = DEFAULT_PROGRESS_RAW;

export const XP_REWARDS: KangurXpRewards = {
  correct_answer: 10,
  perfect_game: 50,
  great_game: 25,
  good_game: 10,
  lesson_completed: 40,
  clock_training_perfect: 60,
  clock_training_good: 30,
  geometry_training_perfect: 70,
  geometry_training_good: 40,
};

export const XP_REWARDS: KangurXpRewards = KANGUR_XP_REWARDS;
export const LEVELS: KangurProgressLevel[] = KANGUR_LEVELS;
export const BADGES: KangurBadge[] = KANGUR_BADGES;

function cloneProgress(progress: KangurProgressState): KangurProgressState {
  return {
    ...progress,
    badges: [...progress.badges],
    operationsPlayed: [...progress.operationsPlayed],
    lessonMastery: Object.fromEntries(
      Object.entries(progress.lessonMastery).map(([key, value]) => [key, { ...value }])
    ),
  };
}

const mergeUniqueStrings = (values: string[]): string[] => Array.from(new Set(values));
const clampPercent = (value: number): number => Math.max(0, Math.min(100, Math.round(value)));

const emitProgressChange = (progress: KangurProgressState): void => {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent(KANGUR_PROGRESS_EVENT_NAME, { detail: cloneProgress(progress) }),
    );
  }
};

const getProgressStore = () => {
  if (!kangurProgressStore) {
    kangurProgressStore = createKangurProgressStore({
      storage: getKangurClientStorage(),
      progressStorageKey: KANGUR_PROGRESS_STORAGE_KEY,
      ownerStorageKey: KANGUR_PROGRESS_OWNER_STORAGE_KEY,
    });
  }

  return kangurProgressStore;
};

export function loadProgress(): KangurProgressState {
  return getProgressStore().loadProgress();
}

export function getKangurProgressServerSnapshot(): KangurProgressState {
  return SERVER_PROGRESS_SNAPSHOT;
}

export function saveProgress(progress: KangurProgressState): void {
  const normalized = getProgressStore().saveProgress(progress);
  emitProgressChange(normalized);
}

export function loadProgressOwnerKey(): string | null {
  return getProgressStore().loadProgressOwnerKey();
}

export function saveProgressOwnerKey(ownerKey: string | null): void {
  getProgressStore().saveProgressOwnerKey(ownerKey);
}

export function subscribeToProgress(listener: (progress: KangurProgressState) => void): () => void {
  return getProgressStore().subscribeToProgress(listener);
}

export function areProgressStatesEqual(
  left: KangurProgressState,
  right: KangurProgressState
): boolean {
  return (
    JSON.stringify(normalizeKangurProgressState(left)) ===
    JSON.stringify(normalizeKangurProgressState(right))
  );
}

export function mergeProgressStates(
  primary: KangurProgressState,
  secondary: KangurProgressState
): KangurProgressState {
  const left = normalizeKangurProgressState(primary);
  const right = normalizeKangurProgressState(secondary);
  const lessonMasteryKeys = new Set([
    ...Object.keys(left.lessonMastery),
    ...Object.keys(right.lessonMastery),
  ]);
  const lessonMastery: KangurProgressState['lessonMastery'] = {};

  for (const key of lessonMasteryKeys) {
    const leftEntry = left.lessonMastery[key];
    const rightEntry = right.lessonMastery[key];

    if (!leftEntry && rightEntry) {
      lessonMastery[key] = { ...rightEntry };
      continue;
    }

    if (leftEntry && !rightEntry) {
      lessonMastery[key] = { ...leftEntry };
      continue;
    }

    if (!leftEntry || !rightEntry) {
      continue;
    }

    const leftTimestamp = leftEntry.lastCompletedAt ? Date.parse(leftEntry.lastCompletedAt) : 0;
    const rightTimestamp = rightEntry.lastCompletedAt ? Date.parse(rightEntry.lastCompletedAt) : 0;
    const latestEntry = rightTimestamp >= leftTimestamp ? rightEntry : leftEntry;
    const fallbackTimestamp = latestEntry === rightEntry ? leftTimestamp : rightTimestamp;
    const fallbackEntry = latestEntry === rightEntry ? leftEntry : rightEntry;

    lessonMastery[key] = {
      attempts: Math.max(leftEntry.attempts, rightEntry.attempts),
      completions: Math.max(leftEntry.completions, rightEntry.completions),
      masteryPercent: latestEntry.masteryPercent,
      bestScorePercent: Math.max(leftEntry.bestScorePercent, rightEntry.bestScorePercent),
      lastScorePercent: latestEntry.lastScorePercent,
      lastCompletedAt:
        latestEntry.lastCompletedAt ??
        (fallbackTimestamp > 0 ? fallbackEntry.lastCompletedAt : null) ??
        null,
    };
  }

  return {
    totalXp: Math.max(left.totalXp, right.totalXp),
    gamesPlayed: Math.max(left.gamesPlayed, right.gamesPlayed),
    perfectGames: Math.max(left.perfectGames, right.perfectGames),
    lessonsCompleted: Math.max(left.lessonsCompleted, right.lessonsCompleted),
    clockPerfect: Math.max(left.clockPerfect, right.clockPerfect),
    calendarPerfect: Math.max(left.calendarPerfect, right.calendarPerfect),
    geometryPerfect: Math.max(left.geometryPerfect, right.geometryPerfect),
    badges: mergeUniqueStrings([...left.badges, ...right.badges]),
    operationsPlayed: mergeUniqueStrings([...left.operationsPlayed, ...right.operationsPlayed]),
    lessonMastery,
  };
}

const createEmptyLessonMasteryEntry = (): KangurLessonMasteryEntry => ({
  attempts: 0,
  completions: 0,
  masteryPercent: 0,
  bestScorePercent: 0,
  lastScorePercent: 0,
  lastCompletedAt: null,
});

export function buildLessonMasteryUpdate(
  progress: KangurProgressState,
  lessonKey: string,
  scorePercent: number,
  completedAt: string = new Date().toISOString()
): KangurProgressState['lessonMastery'] {
  const normalizedKey = lessonKey.trim();
  if (!normalizedKey) {
    return progress.lessonMastery;
  }

  const current = progress.lessonMastery[normalizedKey] ?? createEmptyLessonMasteryEntry();
  const normalizedScore = clampPercent(scorePercent);
  const nextAttempts = current.attempts + 1;

  return {
    ...progress.lessonMastery,
    [normalizedKey]: {
      attempts: nextAttempts,
      completions: current.completions + 1,
      masteryPercent: clampPercent(
        (current.masteryPercent * current.attempts + normalizedScore) / nextAttempts
      ),
      bestScorePercent: Math.max(current.bestScorePercent, normalizedScore),
      lastScorePercent: normalizedScore,
      lastCompletedAt: completedAt,
    },
  };
}

export function createLessonPracticeReward(
  progress: KangurProgressState,
  lessonKey: string,
  correctAnswers: number,
  totalQuestions: number,
  greatThresholdPercent = 60
): KangurLessonPracticeReward {
  const safeTotalQuestions = Math.max(1, totalQuestions);
  const normalizedCorrectAnswers = Math.max(0, Math.min(correctAnswers, safeTotalQuestions));
  const scorePercent = clampPercent((normalizedCorrectAnswers / safeTotalQuestions) * 100);
  const isPerfect = normalizedCorrectAnswers === safeTotalQuestions;
  const isGreat = scorePercent >= clampPercent(greatThresholdPercent);
  const xp = isPerfect
    ? XP_REWARDS.perfect_game
    : isGreat
      ? XP_REWARDS.great_game
      : XP_REWARDS.good_game;

  return {
    xp,
    scorePercent,
    progressUpdates: {
      lessonsCompleted: progress.lessonsCompleted + 1,
      lessonMastery: buildLessonMasteryUpdate(progress, lessonKey, scorePercent),
    },
  };
}

export function getCurrentLevel(totalXp: number): KangurProgressLevel {
  return getCurrentKangurLevel(totalXp);
}

export function getNextLevel(totalXp: number): KangurProgressLevel | null {
  return getNextKangurLevel(totalXp);
}

export function checkNewBadges(progress: KangurProgressState): string[] {
  return checkKangurNewBadges(progress);
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
