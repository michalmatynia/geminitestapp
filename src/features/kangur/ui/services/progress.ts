import {
  createDefaultKangurProgressState,
  normalizeKangurProgressState,
  type KangurLessonMasteryEntry,
} from '@/shared/contracts/kangur';

import type {
  KangurAddXpResult,
  KangurProgressState,
  KangurXpRewards,
} from '@/features/kangur/ui/types';

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

export const KANGUR_PROGRESS_STORAGE_KEY = 'mathblast_progress';
export const KANGUR_PROGRESS_OWNER_STORAGE_KEY = 'mathblast_progress_owner';
export const KANGUR_PROGRESS_EVENT_NAME = 'kangur-progress-changed';

const DEFAULT_PROGRESS: KangurProgressState = createDefaultKangurProgressState();
const progressListeners = new Set<(progress: KangurProgressState) => void>();
let cachedProgressSnapshot: KangurProgressState = cloneProgress(DEFAULT_PROGRESS);
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

export const LEVELS: KangurProgressLevel[] = [
  { level: 1, minXp: 0, title: 'Raczkujacy 🐣', color: 'text-gray-500' },
  { level: 2, minXp: 100, title: 'Uczen ✏️', color: 'text-green-600' },
  { level: 3, minXp: 250, title: 'Mysliciel 🤔', color: 'text-blue-600' },
  { level: 4, minXp: 500, title: 'Liczmistrz 🔢', color: 'text-indigo-600' },
  { level: 5, minXp: 900, title: 'Matematyk 📐', color: 'text-purple-600' },
  { level: 6, minXp: 1400, title: 'Geniusz 🧠', color: 'text-yellow-600' },
  { level: 7, minXp: 2000, title: 'Legenda 🏆', color: 'text-red-600' },
];

export const BADGES: KangurBadge[] = [
  {
    id: 'first_game',
    emoji: '🎮',
    name: 'Pierwsza gra',
    desc: 'Ukoncz pierwsza gre',
    condition: (progress) => progress.gamesPlayed >= 1,
  },
  {
    id: 'perfect_10',
    emoji: '💯',
    name: 'Idealny wynik',
    desc: 'Zdobadz 10/10 w grze',
    condition: (progress) => progress.perfectGames >= 1,
  },
  {
    id: 'lesson_hero',
    emoji: '📚',
    name: 'Bohater lekcji',
    desc: 'Ukoncz pierwsza lekcje',
    condition: (progress) => progress.lessonsCompleted >= 1,
  },
  {
    id: 'clock_master',
    emoji: '🕐',
    name: 'Mistrz zegara',
    desc: 'Ukoncz trening zegara z 5/5',
    condition: (progress) => progress.clockPerfect >= 1,
  },
  {
    id: 'geometry_artist',
    emoji: '🔷',
    name: 'Artysta figur',
    desc: 'Ukoncz trening figur geometrycznych na pelny wynik',
    condition: (progress) => progress.geometryPerfect >= 1,
  },
  {
    id: 'ten_games',
    emoji: '🔟',
    name: 'Dziesiatka',
    desc: 'Zagraj 10 gier',
    condition: (progress) => progress.gamesPlayed >= 10,
  },
  {
    id: 'xp_500',
    emoji: '⭐',
    name: 'Pol tysiaca XP',
    desc: 'Zdobadz 500 XP lacznie',
    condition: (progress) => progress.totalXp >= 500,
  },
  {
    id: 'xp_1000',
    emoji: '🌟',
    name: 'Tysiacznik',
    desc: 'Zdobadz 1000 XP lacznie',
    condition: (progress) => progress.totalXp >= 1000,
  },
  {
    id: 'variety',
    emoji: '🎲',
    name: 'Wszechstronny',
    desc: 'Zagraj 5 roznych operacji',
    condition: (progress) => progress.operationsPlayed.length >= 5,
  },
];

const FALLBACK_LEVEL: KangurProgressLevel = {
  level: 1,
  minXp: 0,
  title: 'Raczkujacy 🐣',
  color: 'text-gray-500',
};

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
  const snapshot = cloneProgress(progress);
  progressListeners.forEach((listener) => listener(snapshot));

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(KANGUR_PROGRESS_EVENT_NAME, { detail: snapshot }));
  }
};

const updateCachedProgressSnapshot = (progress: unknown): KangurProgressState => {
  const normalized = normalizeKangurProgressState(progress);
  cachedProgressSnapshot = cloneProgress(normalized);
  cachedProgressRaw = JSON.stringify(cachedProgressSnapshot);
  return cachedProgressSnapshot;
};

const updateCachedProgressSnapshotFromStorageRaw = (raw: string): KangurProgressState => {
  const snapshot = updateCachedProgressSnapshot(JSON.parse(raw));
  // Preserve the exact storage payload so repeated reads don't re-normalize solely due key order.
  cachedProgressRaw = raw;
  return snapshot;
};

export function loadProgress(): KangurProgressState {
  if (typeof window === 'undefined') {
    return cachedProgressSnapshot;
  }

  try {
    const raw = localStorage.getItem(KANGUR_PROGRESS_STORAGE_KEY);
    if (!raw) {
      if (cachedProgressRaw !== DEFAULT_PROGRESS_RAW) {
        return updateCachedProgressSnapshot(DEFAULT_PROGRESS);
      }
      return cachedProgressSnapshot;
    }
    if (raw !== cachedProgressRaw) {
      return updateCachedProgressSnapshotFromStorageRaw(raw);
    }
    return cachedProgressSnapshot;
  } catch {
    return updateCachedProgressSnapshot(DEFAULT_PROGRESS);
  }
}

export function saveProgress(progress: KangurProgressState): void {
  const normalized = updateCachedProgressSnapshot(progress);
  if (typeof window === 'undefined') {
    return;
  }

  localStorage.setItem(
    KANGUR_PROGRESS_STORAGE_KEY,
    cachedProgressRaw ?? JSON.stringify(normalized)
  );
  emitProgressChange(normalized);
}

export function loadProgressOwnerKey(): string | null {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const raw = localStorage.getItem(KANGUR_PROGRESS_OWNER_STORAGE_KEY)?.trim() ?? '';
    return raw.length > 0 ? raw : null;
  } catch {
    return null;
  }
}

export function saveProgressOwnerKey(ownerKey: string | null): void {
  if (typeof window === 'undefined') {
    return;
  }

  const normalized = typeof ownerKey === 'string' ? ownerKey.trim() : '';
  if (!normalized) {
    localStorage.removeItem(KANGUR_PROGRESS_OWNER_STORAGE_KEY);
    return;
  }

  localStorage.setItem(KANGUR_PROGRESS_OWNER_STORAGE_KEY, normalized);
}

export function subscribeToProgress(listener: (progress: KangurProgressState) => void): () => void {
  progressListeners.add(listener);
  return () => {
    progressListeners.delete(listener);
  };
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
    if (!progress.badges.includes(badge.id) && badge.condition(progress)) {
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
