import {
  createDefaultKangurProgressState,
  normalizeKangurProgressState,
} from '@/shared/contracts/kangur';
import type { KangurProgressState } from '@/features/kangur/ui/types';
import {
  KANGUR_PROGRESS_STORAGE_KEY,
  KANGUR_PROGRESS_OWNER_STORAGE_KEY,
  KANGUR_PROGRESS_EVENT_NAME,
} from './progress.contracts';

const DEFAULT_PROGRESS: KangurProgressState = createDefaultKangurProgressState();
const DEFAULT_PROGRESS_RAW = JSON.stringify(DEFAULT_PROGRESS);

let cachedProgressSnapshot: KangurProgressState = { ...DEFAULT_PROGRESS };
let cachedProgressRaw: string | null = DEFAULT_PROGRESS_RAW;
const SERVER_PROGRESS_SNAPSHOT: KangurProgressState = { ...DEFAULT_PROGRESS };

const progressListeners = new Set<(progress: KangurProgressState) => void>();

function cloneProgress(progress: KangurProgressState): KangurProgressState {
  return {
    ...progress,
    badges: [...progress.badges],
    operationsPlayed: [...progress.operationsPlayed],
    lessonMastery: Object.fromEntries(
      Object.entries(progress.lessonMastery).map(([key, value]) => [key, { ...value }])
    ),
    activityStats: Object.fromEntries(
      Object.entries(progress.activityStats ?? {}).map(([key, value]) => [key, { ...value }])
    ),
  };
}

const updateCachedProgressSnapshot = (progress: unknown): KangurProgressState => {
  const normalized = normalizeKangurProgressState(progress);
  cachedProgressSnapshot = cloneProgress(normalized);
  cachedProgressRaw = JSON.stringify(cachedProgressSnapshot);
  return cachedProgressSnapshot;
};

const updateCachedProgressSnapshotFromStorageRaw = (raw: string): KangurProgressState => {
  const snapshot = updateCachedProgressSnapshot(JSON.parse(raw));
  cachedProgressRaw = raw;
  return snapshot;
};

export function emitProgressChange(progress: KangurProgressState): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(KANGUR_PROGRESS_EVENT_NAME, { detail: progress }));
  }
  progressListeners.forEach((listener) => listener(progress));
}

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

export function getKangurProgressServerSnapshot(): KangurProgressState {
  return SERVER_PROGRESS_SNAPSHOT;
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
  const activityStatsKeys = new Set([
    ...Object.keys(left.activityStats ?? {}),
    ...Object.keys(right.activityStats ?? {}),
  ]);
  const activityStats: KangurProgressState['activityStats'] = {};
  
  const leftActivityEntries = Object.values(left.activityStats ?? {});
  const rightActivityEntries = Object.values(right.activityStats ?? {});

  const leftLatestActivityTimestamp = leftActivityEntries.length > 0
    ? Math.max(...leftActivityEntries.map((entry) => entry.lastPlayedAt ? Date.parse(entry.lastPlayedAt) || 0 : 0))
    : 0;
    
  const rightLatestActivityTimestamp = rightActivityEntries.length > 0
    ? Math.max(...rightActivityEntries.map((entry) => entry.lastPlayedAt ? Date.parse(entry.lastPlayedAt) || 0 : 0))
    : 0;

  const latestRepeatSide =
    rightLatestActivityTimestamp > leftLatestActivityTimestamp
      ? right
      : leftLatestActivityTimestamp > rightLatestActivityTimestamp
        ? left
        : (right.lastRewardedActivityKey ? right : left);

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

    const leftTimestamp = leftEntry.lastPlayedAt ? Date.parse(leftEntry.lastPlayedAt) : 0;
    const rightTimestamp = rightEntry.lastPlayedAt ? Date.parse(rightEntry.lastPlayedAt) : 0;
    const latestEntry = rightTimestamp >= leftTimestamp ? rightEntry : leftEntry;
    const fallbackTimestamp = latestEntry === rightEntry ? leftTimestamp : rightTimestamp;
    const fallbackEntry = latestEntry === rightEntry ? leftEntry : rightEntry;

    lessonMastery[key] = {
      attempts: Math.max(leftEntry.attempts, rightEntry.attempts),
      bestScorePercent: Math.max(leftEntry.bestScorePercent, rightEntry.bestScorePercent),
      masteryPercent: Math.max(leftEntry.masteryPercent, rightEntry.masteryPercent),
      lastPlayedAt:
        latestEntry.lastPlayedAt ??
        (fallbackTimestamp > 0 ? fallbackEntry.lastPlayedAt : null) ??
        null,
    };
  }

  for (const key of activityStatsKeys) {
    const leftEntry = left.activityStats?.[key];
    const rightEntry = right.activityStats?.[key];

    if (!leftEntry && rightEntry) {
      activityStats[key] = { ...rightEntry };
      continue;
    }

    if (leftEntry && !rightEntry) {
      activityStats[key] = { ...leftEntry };
      continue;
    }

    if (!leftEntry || !rightEntry) {
      continue;
    }

    const leftTimestamp = leftEntry.lastPlayedAt ? Date.parse(leftEntry.lastPlayedAt) : 0;
    const rightTimestamp = rightEntry.lastPlayedAt ? Date.parse(rightEntry.lastPlayedAt) : 0;
    const latestEntry = rightTimestamp >= leftTimestamp ? rightEntry : leftEntry;
    const fallbackEntry = latestEntry === rightEntry ? leftEntry : rightEntry;

    activityStats[key] = {
      sessionsPlayed: Math.max(leftEntry.sessionsPlayed, rightEntry.sessionsPlayed),
      perfectSessions: Math.max(leftEntry.perfectSessions, rightEntry.perfectSessions),
      totalCorrectAnswers: Math.max(leftEntry.totalCorrectAnswers, rightEntry.totalCorrectAnswers),
      totalQuestionsAnswered: Math.max(
        leftEntry.totalQuestionsAnswered,
        rightEntry.totalQuestionsAnswered
      ),
      totalXpEarned: Math.max(leftEntry.totalXpEarned, rightEntry.totalXpEarned),
      bestScorePercent: Math.max(leftEntry.bestScorePercent, rightEntry.bestScorePercent),
      lastScorePercent: latestEntry.lastScorePercent,
      currentStreak: latestEntry.currentStreak,
      bestStreak: Math.max(leftEntry.bestStreak, rightEntry.bestStreak),
      lastPlayedAt: latestEntry.lastPlayedAt ?? fallbackEntry.lastPlayedAt,
    };
  }

  return {
    totalXp: Math.max(left.totalXp, right.totalXp),
    gamesPlayed: Math.max(left.gamesPlayed, right.gamesPlayed),
    perfectGames: Math.max(left.perfectGames, right.perfectGames),
    lessonsCompleted: Math.max(left.lessonsCompleted, right.lessonsCompleted),
    clockPerfect: Math.max(left.clockPerfect ?? 0, right.clockPerfect ?? 0),
    calendarPerfect: Math.max(left.calendarPerfect ?? 0, right.calendarPerfect ?? 0),
    geometryPerfect: Math.max(left.geometryPerfect ?? 0, right.geometryPerfect ?? 0),
    recommendedSessionsCompleted: Math.max(
      left.recommendedSessionsCompleted ?? 0,
      right.recommendedSessionsCompleted ?? 0
    ),
    dailyQuestsCompleted: Math.max(left.dailyQuestsCompleted ?? 0, right.dailyQuestsCompleted ?? 0),
    totalCorrectAnswers: Math.max(left.totalCorrectAnswers ?? 0, right.totalCorrectAnswers ?? 0),
    totalQuestionsAnswered: Math.max(
      left.totalQuestionsAnswered ?? 0,
      right.totalQuestionsAnswered ?? 0
    ),
    currentWinStreak: latestRepeatSide.currentWinStreak,
    bestWinStreak: Math.max(left.bestWinStreak ?? 0, right.bestWinStreak ?? 0),
    badges: Array.from(new Set([...left.badges, ...right.badges])),
    operationsPlayed: Array.from(new Set([...left.operationsPlayed, ...right.operationsPlayed])),
    lessonMastery,
    activityStats,
    lastRewardedActivityKey: latestRepeatSide.lastRewardedActivityKey,
    currentActivityRepeatStreak: latestRepeatSide.currentActivityRepeatStreak,
  };
}
