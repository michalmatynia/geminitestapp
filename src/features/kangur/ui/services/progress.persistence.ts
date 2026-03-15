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
let progressPersistenceEnabled = true;

const progressListeners = new Set<(progress: KangurProgressState) => void>();

function cloneProgress(progress: KangurProgressState): KangurProgressState {
  return {
    ...progress,
    badges: [...progress.badges],
    operationsPlayed: [...progress.operationsPlayed],
    lessonMastery: Object.fromEntries(
      Object.entries(progress.lessonMastery).map(([key, value]) => [key, { ...value }])
    ),
    openedTasks: (progress.openedTasks ?? []).map((entry) => ({ ...entry })),
    lessonPanelProgress: Object.fromEntries(
      Object.entries(progress.lessonPanelProgress ?? {}).map(([lessonKey, sections]) => [
        lessonKey,
        Object.fromEntries(
          Object.entries(sections ?? {}).map(([sectionId, entry]) => [
            sectionId,
            {
              ...entry,
              ...(entry.panelTimes
                ? {
                    panelTimes: Object.fromEntries(
                      Object.entries(entry.panelTimes).map(([panelId, panel]) => [
                        panelId,
                        { ...panel },
                      ])
                    ),
                  }
                : {}),
            },
          ])
        ),
      ])
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

export function setProgressPersistenceEnabled(enabled: boolean): void {
  if (progressPersistenceEnabled === enabled) {
    return;
  }

  progressPersistenceEnabled = enabled;

  if (!enabled) {
    updateCachedProgressSnapshot(DEFAULT_PROGRESS);
    emitProgressChange(cachedProgressSnapshot);
  }
}

export function isProgressPersistenceEnabled(): boolean {
  return progressPersistenceEnabled;
}

export function loadProgress(): KangurProgressState {
  if (typeof window === 'undefined') {
    return cachedProgressSnapshot;
  }

  if (!progressPersistenceEnabled) {
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

  if (!progressPersistenceEnabled) {
    emitProgressChange(normalized);
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

  if (!progressPersistenceEnabled) {
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

  if (!progressPersistenceEnabled) {
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
  const openedTasks = mergeOpenedTasks(left.openedTasks ?? [], right.openedTasks ?? []);
  const lessonPanelProgress = mergeLessonPanelProgress(
    left.lessonPanelProgress ?? {},
    right.lessonPanelProgress ?? {}
  );
  
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

    const leftTimestamp = leftEntry.lastCompletedAt ? Date.parse(leftEntry.lastCompletedAt) : 0;
    const rightTimestamp = rightEntry.lastCompletedAt ? Date.parse(rightEntry.lastCompletedAt) : 0;
    const latestEntry = rightTimestamp >= leftTimestamp ? rightEntry : leftEntry;
    const fallbackTimestamp = latestEntry === rightEntry ? leftTimestamp : rightTimestamp;
    const fallbackEntry = latestEntry === rightEntry ? leftEntry : rightEntry;

    lessonMastery[key] = {
      attempts: Math.max(leftEntry.attempts, rightEntry.attempts),
      completions: Math.max(leftEntry.completions, rightEntry.completions),
      bestScorePercent: Math.max(leftEntry.bestScorePercent, rightEntry.bestScorePercent),
      lastScorePercent: latestEntry.lastScorePercent,
      masteryPercent: Math.max(leftEntry.masteryPercent, rightEntry.masteryPercent),
      lastCompletedAt:
        latestEntry.lastCompletedAt ??
        (fallbackTimestamp > 0 ? fallbackEntry.lastCompletedAt : null) ??
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
    openedTasks,
    lessonPanelProgress,
    activityStats,
    lastRewardedActivityKey: latestRepeatSide.lastRewardedActivityKey,
    currentActivityRepeatStreak: latestRepeatSide.currentActivityRepeatStreak,
  };
}

const OPENED_TASKS_LIMIT = 60;

const getOpenedTaskKey = (entry: { kind: string; href: string }): string =>
  `${entry.kind}::${entry.href}`;

const parseTimestamp = (value: string | null | undefined): number => {
  if (!value) {
    return 0;
  }
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? 0 : parsed;
};

const mergeOpenedTasks = (
  left: NonNullable<KangurProgressState['openedTasks']>,
  right: NonNullable<KangurProgressState['openedTasks']>
): NonNullable<KangurProgressState['openedTasks']> => {
  const merged = new Map<string, (typeof left)[number]>();

  const pushEntry = (entry: (typeof left)[number]): void => {
    const key = getOpenedTaskKey(entry);
    const existing = merged.get(key);
    if (!existing) {
      merged.set(key, entry);
      return;
    }

    const existingTimestamp = parseTimestamp(existing.openedAt);
    const nextTimestamp = parseTimestamp(entry.openedAt);
    if (nextTimestamp >= existingTimestamp) {
      merged.set(key, entry);
    }
  };

  left.forEach(pushEntry);
  right.forEach(pushEntry);

  return Array.from(merged.values())
    .sort((a, b) => parseTimestamp(b.openedAt) - parseTimestamp(a.openedAt))
    .slice(0, OPENED_TASKS_LIMIT);
};

const mergeLessonPanelProgress = (
  left: NonNullable<KangurProgressState['lessonPanelProgress']>,
  right: NonNullable<KangurProgressState['lessonPanelProgress']>
): NonNullable<KangurProgressState['lessonPanelProgress']> => {
  const lessonKeys = new Set([...Object.keys(left), ...Object.keys(right)]);
  const merged: NonNullable<KangurProgressState['lessonPanelProgress']> = {};
  const mergePanelTimes = (
    leftTimes: NonNullable<
      NonNullable<KangurProgressState['lessonPanelProgress']>[string][string]['panelTimes']
    >,
    rightTimes: NonNullable<
      NonNullable<KangurProgressState['lessonPanelProgress']>[string][string]['panelTimes']
    >
  ): NonNullable<
    NonNullable<KangurProgressState['lessonPanelProgress']>[string][string]['panelTimes']
  > => {
    const panelKeys = new Set([...Object.keys(leftTimes), ...Object.keys(rightTimes)]);
    const mergedTimes: NonNullable<
      NonNullable<KangurProgressState['lessonPanelProgress']>[string][string]['panelTimes']
    > = {};

    panelKeys.forEach((panelKey) => {
      const leftPanel = leftTimes[panelKey];
      const rightPanel = rightTimes[panelKey];

      if (!leftPanel && rightPanel) {
        mergedTimes[panelKey] = { ...rightPanel };
        return;
      }

      if (leftPanel && !rightPanel) {
        mergedTimes[panelKey] = { ...leftPanel };
        return;
      }

      if (!leftPanel || !rightPanel) {
        return;
      }

      const title = rightPanel.title ?? leftPanel.title;
      mergedTimes[panelKey] = {
        seconds: Math.max(leftPanel.seconds, rightPanel.seconds),
        ...(title ? { title } : {}),
      };
    });

    return mergedTimes;
  };

  lessonKeys.forEach((lessonKey) => {
    const leftSections = left[lessonKey] ?? {};
    const rightSections = right[lessonKey] ?? {};
    const sectionKeys = new Set([...Object.keys(leftSections), ...Object.keys(rightSections)]);
    const mergedSections: NonNullable<KangurProgressState['lessonPanelProgress']>[string] = {};

    sectionKeys.forEach((sectionId) => {
      const leftEntry = leftSections[sectionId];
      const rightEntry = rightSections[sectionId];

      if (!leftEntry && rightEntry) {
        mergedSections[sectionId] = { ...rightEntry };
        return;
      }

      if (leftEntry && !rightEntry) {
        mergedSections[sectionId] = { ...leftEntry };
        return;
      }

      if (!leftEntry || !rightEntry) {
        return;
      }

      const leftTimestamp = parseTimestamp(leftEntry.lastViewedAt);
      const rightTimestamp = parseTimestamp(rightEntry.lastViewedAt);
      const latestEntry = rightTimestamp >= leftTimestamp ? rightEntry : leftEntry;
      const fallbackEntry = latestEntry === rightEntry ? leftEntry : rightEntry;
      const leftSessionId = leftEntry.sessionId?.trim() || null;
      const rightSessionId = rightEntry.sessionId?.trim() || null;
      const leftSessionUpdatedAt = parseTimestamp(leftEntry.sessionUpdatedAt ?? leftEntry.lastViewedAt);
      const rightSessionUpdatedAt = parseTimestamp(rightEntry.sessionUpdatedAt ?? rightEntry.lastViewedAt);
      const latestSessionEntry =
        rightSessionUpdatedAt >= leftSessionUpdatedAt ? rightEntry : leftEntry;
      const fallbackSessionEntry = latestSessionEntry === rightEntry ? leftEntry : rightEntry;
      const isSameSession = leftSessionId !== null && leftSessionId === rightSessionId;

      const mergedPanelTimes = (() => {
        if (isSameSession) {
          const leftTimes = leftEntry.panelTimes ?? {};
          const rightTimes = rightEntry.panelTimes ?? {};
          const mergedTimes = mergePanelTimes(leftTimes, rightTimes);
          return Object.keys(mergedTimes).length > 0 ? mergedTimes : undefined;
        }

        const candidate = latestSessionEntry.panelTimes ?? fallbackSessionEntry.panelTimes ?? undefined;
        return candidate && Object.keys(candidate).length > 0 ? candidate : undefined;
      })();

      const resolveSessionStartedAt = (): string | null => {
        if (!isSameSession) {
          return latestSessionEntry.sessionStartedAt ?? fallbackSessionEntry.sessionStartedAt ?? null;
        }

        const leftStartedAt = parseTimestamp(leftEntry.sessionStartedAt);
        const rightStartedAt = parseTimestamp(rightEntry.sessionStartedAt);
        if (leftStartedAt === 0 && rightStartedAt === 0) {
          return leftEntry.sessionStartedAt ?? rightEntry.sessionStartedAt ?? null;
        }
        if (leftStartedAt === 0) {
          return rightEntry.sessionStartedAt ?? null;
        }
        if (rightStartedAt === 0) {
          return leftEntry.sessionStartedAt ?? null;
        }
        return leftStartedAt <= rightStartedAt
          ? leftEntry.sessionStartedAt ?? null
          : rightEntry.sessionStartedAt ?? null;
      };

      const resolveSessionUpdatedAt = (): string | null => {
        if (!isSameSession) {
          return latestSessionEntry.sessionUpdatedAt ?? fallbackSessionEntry.sessionUpdatedAt ?? null;
        }

        const leftUpdatedAt = parseTimestamp(leftEntry.sessionUpdatedAt);
        const rightUpdatedAt = parseTimestamp(rightEntry.sessionUpdatedAt);
        if (leftUpdatedAt === 0 && rightUpdatedAt === 0) {
          return leftEntry.sessionUpdatedAt ?? rightEntry.sessionUpdatedAt ?? null;
        }
        if (leftUpdatedAt === 0) {
          return rightEntry.sessionUpdatedAt ?? null;
        }
        if (rightUpdatedAt === 0) {
          return leftEntry.sessionUpdatedAt ?? null;
        }
        return leftUpdatedAt >= rightUpdatedAt
          ? leftEntry.sessionUpdatedAt ?? null
          : rightEntry.sessionUpdatedAt ?? null;
      };

      mergedSections[sectionId] = {
        viewedCount: Math.max(leftEntry.viewedCount, rightEntry.viewedCount),
        totalCount: Math.max(leftEntry.totalCount, rightEntry.totalCount),
        lastViewedAt: latestEntry.lastViewedAt ?? fallbackEntry.lastViewedAt ?? null,
        label: latestEntry.label ?? fallbackEntry.label,
        ...(mergedPanelTimes ? { panelTimes: mergedPanelTimes } : {}),
        sessionId: isSameSession
          ? leftSessionId ?? rightSessionId ?? undefined
          : latestSessionEntry.sessionId ?? fallbackSessionEntry.sessionId ?? undefined,
        sessionStartedAt: resolveSessionStartedAt(),
        sessionUpdatedAt: resolveSessionUpdatedAt(),
      };
    });

    if (Object.keys(mergedSections).length > 0) {
      merged[lessonKey] = mergedSections;
    }
  });

  return merged;
};
