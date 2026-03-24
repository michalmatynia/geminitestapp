import {
  createDefaultKangurProgressState,
  normalizeKangurProgressState,
  type KangurLessonSubject,
} from '@/features/kangur/shared/contracts/kangur';
import { DEFAULT_KANGUR_SUBJECT } from '@/features/kangur/lessons/lesson-catalog';
import type { KangurProgressState } from '@/features/kangur/ui/types';
import {
  KANGUR_PROGRESS_STORAGE_KEY,
  KANGUR_PROGRESS_OWNER_STORAGE_KEY,
  KANGUR_PROGRESS_EVENT_NAME,
} from './progress.contracts';
import { withKangurClientErrorSync } from '@/features/kangur/observability/client';

type KangurSubjectProgressStore = {
  version: 1;
  subjects: Record<KangurLessonSubject, KangurProgressState>;
};

type KangurProgressStorageEnvelope = {
  version: 2;
  guest: KangurSubjectProgressStore;
  owners: Record<string, KangurSubjectProgressStore>;
};

export type KangurProgressStorageOptions = {
  ownerKey?: string | null;
};

const createDefaultProgressStore = (): KangurSubjectProgressStore => ({
  version: 1,
  subjects: {
    alphabet: createDefaultKangurProgressState(),
    art: createDefaultKangurProgressState(),
    music: createDefaultKangurProgressState(),
    geometry: createDefaultKangurProgressState(),
    maths: createDefaultKangurProgressState(),
    english: createDefaultKangurProgressState(),
    web_development: createDefaultKangurProgressState(),
    agentic_coding: createDefaultKangurProgressState(),
  },
});

const DEFAULT_PROGRESS: KangurProgressState = createDefaultKangurProgressState();
const DEFAULT_PROGRESS_STORE: KangurSubjectProgressStore = createDefaultProgressStore();
const createDefaultProgressEnvelope = (): KangurProgressStorageEnvelope => ({
  version: 2,
  guest: createDefaultProgressStore(),
  owners: {},
});
const DEFAULT_PROGRESS_ENVELOPE: KangurProgressStorageEnvelope = createDefaultProgressEnvelope();
const DEFAULT_PROGRESS_RAW = JSON.stringify(DEFAULT_PROGRESS_ENVELOPE);

let currentProgressSubject: KangurLessonSubject = DEFAULT_KANGUR_SUBJECT;
let currentProgressOwnerKey: string | null = null;
let cachedProgressStore: KangurSubjectProgressStore = DEFAULT_PROGRESS_STORE;
let cachedProgressSnapshot: KangurProgressState = cloneProgress(DEFAULT_PROGRESS);
let cachedProgressSubject: KangurLessonSubject = currentProgressSubject;
let cachedProgressOwnerKey: string | null = null;
let cachedProgressEnvelope: KangurProgressStorageEnvelope = DEFAULT_PROGRESS_ENVELOPE;
let cachedProgressRaw: string | null = DEFAULT_PROGRESS_RAW;
const SERVER_PROGRESS_SNAPSHOT: KangurProgressState = cloneProgress(DEFAULT_PROGRESS);
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

const cloneProgressStore = (store: KangurSubjectProgressStore): KangurSubjectProgressStore => ({
  version: 1,
  subjects: {
    alphabet: cloneProgress(store.subjects.alphabet ?? DEFAULT_PROGRESS),
    art: cloneProgress(store.subjects.art ?? DEFAULT_PROGRESS),
    music: cloneProgress(store.subjects.music ?? DEFAULT_PROGRESS),
    geometry: cloneProgress(store.subjects.geometry ?? DEFAULT_PROGRESS),
    maths: cloneProgress(store.subjects.maths ?? DEFAULT_PROGRESS),
    english: cloneProgress(store.subjects.english ?? DEFAULT_PROGRESS),
    web_development: cloneProgress(store.subjects.web_development ?? DEFAULT_PROGRESS),
    agentic_coding: cloneProgress(store.subjects.agentic_coding ?? DEFAULT_PROGRESS),
  },
});

const cloneProgressEnvelope = (
  envelope: KangurProgressStorageEnvelope
): KangurProgressStorageEnvelope => ({
  version: 2,
  guest: cloneProgressStore(envelope.guest ?? DEFAULT_PROGRESS_STORE),
  owners: Object.fromEntries(
    Object.entries(envelope.owners ?? {}).map(([ownerKey, store]) => [
      ownerKey,
      cloneProgressStore(store),
    ])
  ),
});

const normalizeOwnerKey = (ownerKey: string | null | undefined): string | null => {
  const normalized = typeof ownerKey === 'string' ? ownerKey.trim() : '';
  return normalized.length > 0 ? normalized : null;
};

const normalizeProgressStore = (value: unknown): KangurSubjectProgressStore => {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    const record = value as Record<string, unknown>;
    const rawSubjects = record['subjects'];
    if (rawSubjects && typeof rawSubjects === 'object' && !Array.isArray(rawSubjects)) {
      const subjectsRecord = rawSubjects as Record<string, unknown>;
      return {
        version: 1,
        subjects: {
          alphabet: normalizeKangurProgressState(subjectsRecord['alphabet']),
          art: normalizeKangurProgressState(subjectsRecord['art']),
          music: normalizeKangurProgressState(subjectsRecord['music']),
          geometry: normalizeKangurProgressState(subjectsRecord['geometry']),
          maths: normalizeKangurProgressState(subjectsRecord['maths']),
          english: normalizeKangurProgressState(subjectsRecord['english']),
          web_development: normalizeKangurProgressState(subjectsRecord['web_development']),
          agentic_coding: normalizeKangurProgressState(subjectsRecord['agentic_coding']),
        },
      };
    }
  }

  return {
    version: 1,
    subjects: {
      alphabet: createDefaultKangurProgressState(),
      art: createDefaultKangurProgressState(),
      music: createDefaultKangurProgressState(),
      geometry: createDefaultKangurProgressState(),
      maths: normalizeKangurProgressState(value),
      english: createDefaultKangurProgressState(),
      web_development: createDefaultKangurProgressState(),
      agentic_coding: createDefaultKangurProgressState(),
    },
  };
};

const normalizeProgressEnvelope = (
  value: unknown,
  legacyOwnerKey: string | null
): KangurProgressStorageEnvelope => {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    const record = value as Record<string, unknown>;
    const rawOwners = record['owners'];
    if (record['version'] === 2 && rawOwners && typeof rawOwners === 'object' && !Array.isArray(rawOwners)) {
      const ownersRecord = rawOwners as Record<string, unknown>;
      return {
        version: 2,
        guest: normalizeProgressStore(record['guest']),
        owners: Object.fromEntries(
          Object.entries(ownersRecord).map(([ownerKey, store]) => [
            ownerKey,
            normalizeProgressStore(store),
          ])
        ),
      };
    }
  }

  const legacyStore = normalizeProgressStore(value);
  const normalizedLegacyOwnerKey = normalizeOwnerKey(legacyOwnerKey);
  return normalizedLegacyOwnerKey
    ? {
        version: 2,
        guest: createDefaultProgressStore(),
        owners: {
          [normalizedLegacyOwnerKey]: legacyStore,
        },
      }
    : {
        version: 2,
        guest: legacyStore,
        owners: {},
      };
};

const getProgressStoreForOwner = (
  envelope: KangurProgressStorageEnvelope,
  ownerKey: string | null
): KangurSubjectProgressStore => {
  const normalizedOwnerKey = normalizeOwnerKey(ownerKey);
  if (!normalizedOwnerKey) {
    return envelope.guest ?? DEFAULT_PROGRESS_STORE;
  }

  return envelope.owners[normalizedOwnerKey] ?? DEFAULT_PROGRESS_STORE;
};

const setProgressStoreForOwner = (
  envelope: KangurProgressStorageEnvelope,
  ownerKey: string | null,
  store: KangurSubjectProgressStore
): KangurProgressStorageEnvelope => {
  const normalizedOwnerKey = normalizeOwnerKey(ownerKey);
  if (!normalizedOwnerKey) {
    return {
      ...envelope,
      guest: cloneProgressStore(store),
    };
  }

  return {
    ...envelope,
    owners: {
      ...envelope.owners,
      [normalizedOwnerKey]: cloneProgressStore(store),
    },
  };
};

const syncCachedProgressScope = (ownerKey: string | null): KangurProgressState => {
  cachedProgressOwnerKey = ownerKey;
  cachedProgressStore = cloneProgressStore(getProgressStoreForOwner(cachedProgressEnvelope, ownerKey));
  cachedProgressSnapshot = cloneProgress(
    cachedProgressStore.subjects[currentProgressSubject] ?? DEFAULT_PROGRESS
  );
  cachedProgressSubject = currentProgressSubject;
  return cachedProgressSnapshot;
};

const updateCachedProgressEnvelope = (
  envelope: KangurProgressStorageEnvelope,
  ownerKey: string | null
): KangurProgressState => {
  cachedProgressEnvelope = cloneProgressEnvelope(envelope);
  cachedProgressRaw = JSON.stringify(cachedProgressEnvelope);
  return syncCachedProgressScope(ownerKey);
};

const resolveProgressOwnerKey = (options?: KangurProgressStorageOptions): string | null => {
  if (options && Object.prototype.hasOwnProperty.call(options, 'ownerKey')) {
    return normalizeOwnerKey(options.ownerKey);
  }

  return currentProgressOwnerKey;
};

const updateCachedProgressSnapshot = (
  progress: unknown,
  options?: KangurProgressStorageOptions
): KangurProgressState => {
  const ownerKey = resolveProgressOwnerKey(options);
  if (cachedProgressOwnerKey !== ownerKey) {
    syncCachedProgressScope(ownerKey);
  }
  const normalized = normalizeKangurProgressState(progress);
  const nextStore: KangurSubjectProgressStore = {
    version: 1,
    subjects: {
      ...cachedProgressStore.subjects,
      [currentProgressSubject]: normalized,
    },
  };
  return updateCachedProgressEnvelope(
    setProgressStoreForOwner(cachedProgressEnvelope, ownerKey, nextStore),
    ownerKey
  );
};

const updateCachedProgressSnapshotFromStorageRaw = (
  raw: string,
  options?: KangurProgressStorageOptions
): KangurProgressState => {
  const ownerKey = resolveProgressOwnerKey(options);
  const legacyOwnerKey = loadProgressOwnerKey();
  const envelope = normalizeProgressEnvelope(JSON.parse(raw) as unknown, legacyOwnerKey);
  const snapshot = updateCachedProgressEnvelope(envelope, ownerKey);
  const serializedEnvelope = JSON.stringify(cachedProgressEnvelope);
  if (serializedEnvelope !== raw && typeof window !== 'undefined' && progressPersistenceEnabled) {
    localStorage.setItem(KANGUR_PROGRESS_STORAGE_KEY, serializedEnvelope);
  }
  return snapshot;
};

export function emitProgressChange(progress: KangurProgressState): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(KANGUR_PROGRESS_EVENT_NAME, { detail: progress }));
  }
  progressListeners.forEach((listener) => listener(progress));
}

export function setProgressSubject(subject: KangurLessonSubject): void {
  const hasSubjectChanged = currentProgressSubject !== subject;
  if (!hasSubjectChanged) {
    return;
  }

  currentProgressSubject = subject;
  const snapshot = loadProgress();
  emitProgressChange(snapshot);
}

export function getProgressSubject(): KangurLessonSubject {
  return currentProgressSubject;
}

export function setProgressOwnerKey(ownerKey: string | null): void {
  const normalizedOwnerKey = normalizeOwnerKey(ownerKey);
  if (currentProgressOwnerKey === normalizedOwnerKey) {
    return;
  }

  currentProgressOwnerKey = normalizedOwnerKey;
  const snapshot = loadProgress({ ownerKey: normalizedOwnerKey });
  emitProgressChange(snapshot);
}

export function getProgressOwnerKey(): string | null {
  return currentProgressOwnerKey;
}

export function setProgressScope({
  subject = currentProgressSubject,
  ownerKey = currentProgressOwnerKey,
}: {
  subject?: KangurLessonSubject;
  ownerKey?: string | null;
}): void {
  const normalizedOwnerKey = normalizeOwnerKey(ownerKey);
  const hasSubjectChanged = currentProgressSubject !== subject;
  const hasOwnerChanged = currentProgressOwnerKey !== normalizedOwnerKey;

  if (!hasSubjectChanged && !hasOwnerChanged) {
    return;
  }

  currentProgressSubject = subject;
  currentProgressOwnerKey = normalizedOwnerKey;
  const snapshot = loadProgress({ ownerKey: normalizedOwnerKey });
  emitProgressChange(snapshot);
}

export function setProgressPersistenceEnabled(enabled: boolean): void {
  if (progressPersistenceEnabled === enabled) {
    return;
  }

  progressPersistenceEnabled = enabled;

  if (!enabled) {
    resetProgressStore();
  }
}

export function isProgressPersistenceEnabled(): boolean {
  return progressPersistenceEnabled;
}

export function loadProgress(options?: KangurProgressStorageOptions): KangurProgressState {
  const ownerKey = resolveProgressOwnerKey(options);
  if (cachedProgressOwnerKey !== ownerKey || cachedProgressSubject !== currentProgressSubject) {
    syncCachedProgressScope(ownerKey);
  }

  if (typeof window === 'undefined') {
    return cachedProgressSnapshot;
  }

  if (!progressPersistenceEnabled) {
    return cachedProgressSnapshot;
  }

  return withKangurClientErrorSync(
    {
      source: 'kangur.progress',
      action: 'load-storage',
      description: 'Loads the progress snapshot from local storage.',
    },
    () => {
      const raw = localStorage.getItem(KANGUR_PROGRESS_STORAGE_KEY);
      if (!raw) {
        if (cachedProgressRaw !== DEFAULT_PROGRESS_RAW) {
          return updateCachedProgressEnvelope(createDefaultProgressEnvelope(), ownerKey);
        }
        return cachedProgressSnapshot;
      }
      if (raw !== cachedProgressRaw) {
        return updateCachedProgressSnapshotFromStorageRaw(raw, { ownerKey });
      }
      return cachedProgressSnapshot;
    },
    {
      fallback: () => updateCachedProgressEnvelope(createDefaultProgressEnvelope(), ownerKey),
    }
  );
}

export function getKangurProgressServerSnapshot(): KangurProgressState {
  return SERVER_PROGRESS_SNAPSHOT;
}

export function saveProgress(
  progress: KangurProgressState,
  options?: KangurProgressStorageOptions
): void {
  const normalized = updateCachedProgressSnapshot(progress, options);
  if (typeof window === 'undefined') {
    return;
  }

  if (!progressPersistenceEnabled) {
    emitProgressChange(normalized);
    return;
  }

  localStorage.setItem(
    KANGUR_PROGRESS_STORAGE_KEY,
    cachedProgressRaw ?? JSON.stringify(cachedProgressEnvelope)
  );
  emitProgressChange(normalized);
}

export function resetProgressStore(options?: KangurProgressStorageOptions): void {
  const ownerKey = resolveProgressOwnerKey(options);
  const normalized = updateCachedProgressEnvelope(
    setProgressStoreForOwner(cachedProgressEnvelope, ownerKey, createDefaultProgressStore()),
    ownerKey
  );
  if (typeof window === 'undefined') {
    return;
  }

  if (!progressPersistenceEnabled) {
    emitProgressChange(normalized);
    return;
  }

  localStorage.setItem(
    KANGUR_PROGRESS_STORAGE_KEY,
    cachedProgressRaw ?? JSON.stringify(cachedProgressEnvelope)
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

  return withKangurClientErrorSync(
    {
      source: 'kangur.progress',
      action: 'load-owner-key',
      description: 'Loads the progress owner key from local storage.',
    },
    () => {
      const raw = localStorage.getItem(KANGUR_PROGRESS_OWNER_STORAGE_KEY)?.trim() ?? '';
      return raw.length > 0 ? raw : null;
    },
    { fallback: null }
  );
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
