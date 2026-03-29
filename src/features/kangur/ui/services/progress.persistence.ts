import {
  createDefaultKangurProgressState,
  normalizeKangurProgressState,
  type KangurLessonSubject,
} from '@/features/kangur/shared/contracts/kangur';
import { DEFAULT_KANGUR_SUBJECT } from '@/features/kangur/lessons/lesson-catalog-metadata';
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

const PROGRESS_SUBJECT_KEYS = [
  'alphabet',
  'art',
  'music',
  'geometry',
  'maths',
  'english',
  'web_development',
  'agentic_coding',
] as const satisfies readonly KangurLessonSubject[];

type LessonMasteryEntry = KangurProgressState['lessonMastery'][string];
type ActivityStatsRecord = NonNullable<KangurProgressState['activityStats']>;
type ActivityStatEntry = ActivityStatsRecord[string];
type LessonPanelProgressMap = NonNullable<KangurProgressState['lessonPanelProgress']>;
type LessonPanelSectionMap = LessonPanelProgressMap[string];
type LessonPanelSectionEntry = LessonPanelSectionMap[string];
type LessonPanelTimes = NonNullable<LessonPanelSectionEntry['panelTimes']>;
type ProgressScalarFields = Omit<
  KangurProgressState,
  'activityStats' | 'lessonMastery' | 'openedTasks' | 'lessonPanelProgress'
>;
type MergePairResult<T extends object> = { leftEntry: T; rightEntry: T } | { mergedEntry: T | null };
type LessonPanelSessionMergeInput = {
  fallbackSessionEntry: LessonPanelSectionEntry;
  isSameSession: boolean;
  latestSessionEntry: LessonPanelSectionEntry;
  leftEntry: LessonPanelSectionEntry;
  rightEntry: LessonPanelSectionEntry;
};
type LessonPanelSectionMergeContext = LessonPanelSessionMergeInput & {
  fallbackEntry: LessonPanelSectionEntry;
  latestEntry: LessonPanelSectionEntry;
};
type LessonPanelSessionTimestampKey = 'sessionStartedAt' | 'sessionUpdatedAt';

const createDefaultProgressStore = (): KangurSubjectProgressStore => ({
  version: 1,
  subjects: Object.fromEntries(
    PROGRESS_SUBJECT_KEYS.map((subject) => [subject, createDefaultKangurProgressState()])
  ) as Record<KangurLessonSubject, KangurProgressState>,
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

const cloneProgressSubjects = (
  subjects: Partial<Record<KangurLessonSubject, KangurProgressState>>
): Record<KangurLessonSubject, KangurProgressState> =>
  Object.fromEntries(
    PROGRESS_SUBJECT_KEYS.map((subject) => [
      subject,
      cloneProgress(subjects[subject] ?? DEFAULT_PROGRESS),
    ])
  ) as Record<KangurLessonSubject, KangurProgressState>;

const cloneProgressStore = (store: KangurSubjectProgressStore): KangurSubjectProgressStore => ({
  version: 1,
  subjects: cloneProgressSubjects(store.subjects),
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

const normalizeProgressSubjects = (
  subjectsRecord: Record<string, unknown>,
  fallbackMathsValue?: unknown
): Record<KangurLessonSubject, KangurProgressState> =>
  Object.fromEntries(
    PROGRESS_SUBJECT_KEYS.map((subject) => [
      subject,
      normalizeKangurProgressState(
        subject === 'maths' && fallbackMathsValue !== undefined
          ? fallbackMathsValue
          : subjectsRecord[subject]
      ),
    ])
  ) as Record<KangurLessonSubject, KangurProgressState>;

const normalizeProgressStore = (value: unknown): KangurSubjectProgressStore => {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    const record = value as Record<string, unknown>;
    const rawSubjects = record['subjects'];
    if (rawSubjects && typeof rawSubjects === 'object' && !Array.isArray(rawSubjects)) {
      const subjectsRecord = rawSubjects as Record<string, unknown>;
      return {
        version: 1,
        subjects: normalizeProgressSubjects(subjectsRecord),
      };
    }
  }

  return {
    version: 1,
    subjects: normalizeProgressSubjects({}, value),
  };
};

const isVersion2ProgressEnvelopeRecord = (
  value: unknown
): value is { guest: unknown; owners: Record<string, unknown>; version: 2 } => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return false;
  }

  const record = value as Record<string, unknown>;
  const rawOwners = record['owners'];
  return (
    record['version'] === 2 &&
    Boolean(rawOwners) &&
    typeof rawOwners === 'object' &&
    !Array.isArray(rawOwners)
  );
};

const normalizeProgressOwnerStores = (
  ownersRecord: Record<string, unknown>
): Record<string, KangurSubjectProgressStore> =>
  Object.fromEntries(
    Object.entries(ownersRecord).map(([ownerKey, store]) => [
      ownerKey,
      normalizeProgressStore(store),
    ])
  );

const buildLegacyProgressEnvelope = (
  value: unknown,
  legacyOwnerKey: string | null
): KangurProgressStorageEnvelope => {
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

const normalizeProgressEnvelope = (
  value: unknown,
  legacyOwnerKey: string | null
): KangurProgressStorageEnvelope => {
  if (isVersion2ProgressEnvelopeRecord(value)) {
    return {
      version: 2,
      guest: normalizeProgressStore(value.guest),
      owners: normalizeProgressOwnerStores(value.owners),
    };
  }
  return buildLegacyProgressEnvelope(value, legacyOwnerKey);
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
  const normalized = typeof ownerKey === 'string' ? ownerKey.trim() : '';
  setProgressOwnerKey(normalized || null);

  if (typeof window === 'undefined') {
    return;
  }

  if (!progressPersistenceEnabled) {
    return;
  }

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

const resolveLatestTimestampFromActivityStats = (
  activityStats: ActivityStatsRecord | undefined
): number => {
  const activityEntries = Object.values(activityStats ?? {});
  return activityEntries.length > 0
    ? Math.max(...activityEntries.map((entry) => parseTimestamp(entry.lastPlayedAt)))
    : 0;
};

const resolveLatestRepeatProgressState = (
  left: KangurProgressState,
  right: KangurProgressState
): KangurProgressState => {
  const leftLatestActivityTimestamp = resolveLatestTimestampFromActivityStats(left.activityStats);
  const rightLatestActivityTimestamp = resolveLatestTimestampFromActivityStats(right.activityStats);

  if (rightLatestActivityTimestamp > leftLatestActivityTimestamp) {
    return right;
  }
  if (leftLatestActivityTimestamp > rightLatestActivityTimestamp) {
    return left;
  }
  return right.lastRewardedActivityKey ? right : left;
};

const resolveLatestAndFallbackEntries = <T>(
  leftEntry: T,
  rightEntry: T,
  leftTimestamp: number,
  rightTimestamp: number
): { fallbackEntry: T; latestEntry: T } => {
  const latestEntry = rightTimestamp >= leftTimestamp ? rightEntry : leftEntry;
  return {
    latestEntry,
    fallbackEntry: latestEntry === rightEntry ? leftEntry : rightEntry,
  };
};

const resolveMergePair = <T extends object>(
  leftEntry: T | undefined,
  rightEntry: T | undefined
): MergePairResult<T> => {
  if (!leftEntry) {
    return { mergedEntry: rightEntry ? { ...rightEntry } : null };
  }
  if (!rightEntry) {
    return { mergedEntry: { ...leftEntry } };
  }
  return { leftEntry, rightEntry };
};

const resolveMergedTimestampValue = (
  latestValue: string | null | undefined,
  fallbackValue: string | null | undefined,
  timestamps: readonly number[]
): string | null => {
  if (latestValue) {
    return latestValue;
  }
  return timestamps.some((timestamp) => timestamp > 0) ? fallbackValue ?? null : null;
};

const mergeLessonMasteryEntry = (
  leftEntry: LessonMasteryEntry | undefined,
  rightEntry: LessonMasteryEntry | undefined
): LessonMasteryEntry | null => {
  const resolvedEntries = resolveMergePair(leftEntry, rightEntry);
  if ('mergedEntry' in resolvedEntries) {
    return resolvedEntries.mergedEntry;
  }
  const { leftEntry: requiredLeftEntry, rightEntry: requiredRightEntry } = resolvedEntries;

  const leftTimestamp = parseTimestamp(requiredLeftEntry.lastCompletedAt);
  const rightTimestamp = parseTimestamp(requiredRightEntry.lastCompletedAt);
  const { latestEntry, fallbackEntry } = resolveLatestAndFallbackEntries(
    requiredLeftEntry,
    requiredRightEntry,
    leftTimestamp,
    rightTimestamp
  );

  return {
    attempts: Math.max(requiredLeftEntry.attempts, requiredRightEntry.attempts),
    completions: Math.max(requiredLeftEntry.completions, requiredRightEntry.completions),
    bestScorePercent: Math.max(
      requiredLeftEntry.bestScorePercent,
      requiredRightEntry.bestScorePercent
    ),
    lastScorePercent: latestEntry.lastScorePercent,
    masteryPercent: Math.max(requiredLeftEntry.masteryPercent, requiredRightEntry.masteryPercent),
    lastCompletedAt: resolveMergedTimestampValue(
      latestEntry.lastCompletedAt,
      fallbackEntry.lastCompletedAt,
      [leftTimestamp, rightTimestamp]
    ),
  };
};

const mergeLessonMasteryRecord = (
  left: KangurProgressState,
  right: KangurProgressState
): KangurProgressState['lessonMastery'] => {
  const lessonMasteryKeys = new Set([
    ...Object.keys(left.lessonMastery),
    ...Object.keys(right.lessonMastery),
  ]);
  const lessonMastery: KangurProgressState['lessonMastery'] = {};

  for (const key of lessonMasteryKeys) {
    const mergedEntry = mergeLessonMasteryEntry(left.lessonMastery[key], right.lessonMastery[key]);
    if (mergedEntry) {
      lessonMastery[key] = mergedEntry;
    }
  }

  return lessonMastery;
};

const mergeActivityStatsEntry = (
  leftEntry: ActivityStatEntry | undefined,
  rightEntry: ActivityStatEntry | undefined
): ActivityStatEntry | null => {
  if (!leftEntry && rightEntry) {
    return { ...rightEntry };
  }
  if (leftEntry && !rightEntry) {
    return { ...leftEntry };
  }
  if (!leftEntry || !rightEntry) {
    return null;
  }

  const leftTimestamp = parseTimestamp(leftEntry.lastPlayedAt);
  const rightTimestamp = parseTimestamp(rightEntry.lastPlayedAt);
  const { latestEntry, fallbackEntry } = resolveLatestAndFallbackEntries(
    leftEntry,
    rightEntry,
    leftTimestamp,
    rightTimestamp
  );

  return {
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
};

const mergeActivityStatsRecord = (
  left: KangurProgressState,
  right: KangurProgressState
): KangurProgressState['activityStats'] => {
  const activityStatsKeys = new Set([
    ...Object.keys(left.activityStats ?? {}),
    ...Object.keys(right.activityStats ?? {}),
  ]);
  const activityStats: KangurProgressState['activityStats'] = {};

  for (const key of activityStatsKeys) {
    const mergedEntry = mergeActivityStatsEntry(left.activityStats?.[key], right.activityStats?.[key]);
    if (mergedEntry) {
      activityStats[key] = mergedEntry;
    }
  }

  return activityStats;
};

const resolveMergedProgressCount = (
  leftValue: number | undefined,
  rightValue: number | undefined
): number => Math.max(leftValue ?? 0, rightValue ?? 0);

const mergeUniqueProgressValues = (leftValues: string[], rightValues: string[]): string[] =>
  Array.from(new Set([...leftValues, ...rightValues]));

const mergeBaseProgressCounts = (
  left: KangurProgressState,
  right: KangurProgressState
): Pick<ProgressScalarFields, 'totalXp' | 'gamesPlayed' | 'perfectGames' | 'lessonsCompleted'> => ({
  totalXp: Math.max(left.totalXp, right.totalXp),
  gamesPlayed: Math.max(left.gamesPlayed, right.gamesPlayed),
  perfectGames: Math.max(left.perfectGames, right.perfectGames),
  lessonsCompleted: Math.max(left.lessonsCompleted, right.lessonsCompleted),
});

const mergeOptionalProgressCounts = (
  left: KangurProgressState,
  right: KangurProgressState
): Pick<
  ProgressScalarFields,
  | 'clockPerfect'
  | 'calendarPerfect'
  | 'geometryPerfect'
  | 'recommendedSessionsCompleted'
  | 'dailyQuestsCompleted'
  | 'totalCorrectAnswers'
  | 'totalQuestionsAnswered'
  | 'bestWinStreak'
> => ({
  clockPerfect: resolveMergedProgressCount(left.clockPerfect, right.clockPerfect),
  calendarPerfect: resolveMergedProgressCount(left.calendarPerfect, right.calendarPerfect),
  geometryPerfect: resolveMergedProgressCount(left.geometryPerfect, right.geometryPerfect),
  recommendedSessionsCompleted: resolveMergedProgressCount(
    left.recommendedSessionsCompleted,
    right.recommendedSessionsCompleted
  ),
  dailyQuestsCompleted: resolveMergedProgressCount(
    left.dailyQuestsCompleted,
    right.dailyQuestsCompleted
  ),
  totalCorrectAnswers: resolveMergedProgressCount(
    left.totalCorrectAnswers,
    right.totalCorrectAnswers
  ),
  totalQuestionsAnswered: resolveMergedProgressCount(
    left.totalQuestionsAnswered,
    right.totalQuestionsAnswered
  ),
  bestWinStreak: resolveMergedProgressCount(left.bestWinStreak, right.bestWinStreak),
});

const mergeProgressCollections = (
  left: KangurProgressState,
  right: KangurProgressState
): Pick<ProgressScalarFields, 'badges' | 'operationsPlayed'> => ({
  badges: mergeUniqueProgressValues(left.badges, right.badges),
  operationsPlayed: mergeUniqueProgressValues(left.operationsPlayed, right.operationsPlayed),
});

const mergeRepeatProgressFields = (
  latestRepeatSide: KangurProgressState
): Pick<
  ProgressScalarFields,
  'currentWinStreak' | 'lastRewardedActivityKey' | 'currentActivityRepeatStreak'
> => ({
  currentWinStreak: latestRepeatSide.currentWinStreak,
  lastRewardedActivityKey: latestRepeatSide.lastRewardedActivityKey,
  currentActivityRepeatStreak: latestRepeatSide.currentActivityRepeatStreak,
});

const mergeProgressScalarFields = (
  left: KangurProgressState,
  right: KangurProgressState,
  latestRepeatSide: KangurProgressState
): ProgressScalarFields => ({
  ...mergeBaseProgressCounts(left, right),
  ...mergeOptionalProgressCounts(left, right),
  ...mergeProgressCollections(left, right),
  ...mergeRepeatProgressFields(latestRepeatSide),
});

export function mergeProgressStates(
  primary: KangurProgressState,
  secondary: KangurProgressState
): KangurProgressState {
  const left = normalizeKangurProgressState(primary);
  const right = normalizeKangurProgressState(secondary);
  const lessonMastery = mergeLessonMasteryRecord(left, right);
  const activityStats = mergeActivityStatsRecord(left, right);
  const openedTasks = mergeOpenedTasks(left.openedTasks ?? [], right.openedTasks ?? []);
  const lessonPanelProgress = mergeLessonPanelProgress(
    left.lessonPanelProgress ?? {},
    right.lessonPanelProgress ?? {}
  );
  const latestRepeatSide = resolveLatestRepeatProgressState(left, right);

  return {
    ...mergeProgressScalarFields(left, right, latestRepeatSide),
    lessonMastery,
    openedTasks,
    lessonPanelProgress,
    activityStats,
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

  lessonKeys.forEach((lessonKey) => {
    const leftSections = left[lessonKey] ?? {};
    const rightSections = right[lessonKey] ?? {};
    const sectionKeys = new Set([...Object.keys(leftSections), ...Object.keys(rightSections)]);
    const mergedSections: NonNullable<KangurProgressState['lessonPanelProgress']>[string] = {};

    sectionKeys.forEach((sectionId) => {
      const mergedEntry = mergeLessonPanelSectionEntry(
        leftSections[sectionId],
        rightSections[sectionId]
      );
      if (mergedEntry) {
        mergedSections[sectionId] = mergedEntry;
      }
    });

    if (Object.keys(mergedSections).length > 0) {
      merged[lessonKey] = mergedSections;
    }
  });

  return merged;
};

const mergePanelTimes = (
  leftTimes: LessonPanelTimes,
  rightTimes: LessonPanelTimes
): LessonPanelTimes => {
  const panelKeys = new Set([...Object.keys(leftTimes), ...Object.keys(rightTimes)]);
  const mergedTimes: LessonPanelTimes = {};

  panelKeys.forEach((panelKey) => {
    const mergedEntry = mergePanelTimeEntry(leftTimes[panelKey], rightTimes[panelKey]);
    if (mergedEntry) {
      mergedTimes[panelKey] = mergedEntry;
    }
  });

  return mergedTimes;
};

const mergePanelTimeEntry = (
  leftPanel: LessonPanelTimes[string] | undefined,
  rightPanel: LessonPanelTimes[string] | undefined
): LessonPanelTimes[string] | null => {
  const resolvedEntries = resolveMergePair(leftPanel, rightPanel);
  if ('mergedEntry' in resolvedEntries) {
    return resolvedEntries.mergedEntry;
  }
  const { leftEntry, rightEntry } = resolvedEntries;

  const title = rightEntry.title ?? leftEntry.title;
  return {
    seconds: Math.max(leftEntry.seconds, rightEntry.seconds),
    ...(title ? { title } : {}),
  };
};

const resolveLatestSectionEntries = (
  leftEntry: LessonPanelSectionEntry,
  rightEntry: LessonPanelSectionEntry
): {
  fallbackEntry: LessonPanelSectionEntry;
  latestEntry: LessonPanelSectionEntry;
} =>
  resolveLatestAndFallbackEntries(
    leftEntry,
    rightEntry,
    parseTimestamp(leftEntry.lastViewedAt),
    parseTimestamp(rightEntry.lastViewedAt)
  );

const resolveLatestSessionEntries = (
  leftEntry: LessonPanelSectionEntry,
  rightEntry: LessonPanelSectionEntry
): {
  fallbackSessionEntry: LessonPanelSectionEntry;
  latestSessionEntry: LessonPanelSectionEntry;
} => {
  const leftUpdatedAt = parseTimestamp(leftEntry.sessionUpdatedAt ?? leftEntry.lastViewedAt);
  const rightUpdatedAt = parseTimestamp(rightEntry.sessionUpdatedAt ?? rightEntry.lastViewedAt);
  const { latestEntry, fallbackEntry } = resolveLatestAndFallbackEntries(
    leftEntry,
    rightEntry,
    leftUpdatedAt,
    rightUpdatedAt
  );

  return {
    latestSessionEntry: latestEntry,
    fallbackSessionEntry: fallbackEntry,
  };
};

const areMatchingLessonPanelSessions = (
  leftEntry: LessonPanelSectionEntry,
  rightEntry: LessonPanelSectionEntry
): boolean => {
  const leftSessionId = leftEntry.sessionId?.trim() || null;
  const rightSessionId = rightEntry.sessionId?.trim() || null;
  return leftSessionId !== null && leftSessionId === rightSessionId;
};

const resolveNonEmptyPanelTimes = (
  panelTimes: LessonPanelTimes | undefined
): LessonPanelTimes | undefined =>
  panelTimes && Object.keys(panelTimes).length > 0 ? panelTimes : undefined;

const resolveSameSessionPanelTimes = (
  leftEntry: LessonPanelSectionEntry,
  rightEntry: LessonPanelSectionEntry
): LessonPanelTimes | undefined =>
  resolveNonEmptyPanelTimes(mergePanelTimes(leftEntry.panelTimes ?? {}, rightEntry.panelTimes ?? {}));

const resolveFallbackPanelTimes = (
  latestSessionEntry: LessonPanelSectionEntry,
  fallbackSessionEntry: LessonPanelSectionEntry
): LessonPanelTimes | undefined =>
  resolveNonEmptyPanelTimes(
    latestSessionEntry.panelTimes ?? fallbackSessionEntry.panelTimes ?? undefined
  );

const resolveMergedPanelTimes = (input: LessonPanelSessionMergeInput): LessonPanelTimes | undefined =>
  input.isSameSession
    ? resolveSameSessionPanelTimes(input.leftEntry, input.rightEntry)
    : resolveFallbackPanelTimes(input.latestSessionEntry, input.fallbackSessionEntry);

const hasTimestampValue = (value: string | null | undefined): value is string =>
  value !== null && value !== undefined;

const resolvePreferredTimestampValue = (
  leftValue: string | null | undefined,
  rightValue: string | null | undefined,
  preference: 'earliest' | 'latest'
): string | null => {
  const candidates = [leftValue, rightValue]
    .filter(hasTimestampValue)
    .map((value) => ({ value, timestamp: parseTimestamp(value) }));

  if (candidates.length === 0) {
    return null;
  }
  if (candidates.length === 1) {
    return candidates[0]?.value ?? null;
  }

  const [leftCandidate, rightCandidate] = candidates;
  if (!leftCandidate || !rightCandidate) {
    return leftCandidate?.value ?? rightCandidate?.value ?? null;
  }
  const useLeftCandidate =
    preference === 'earliest'
      ? leftCandidate.timestamp <= rightCandidate.timestamp
      : leftCandidate.timestamp >= rightCandidate.timestamp;
  return useLeftCandidate ? leftCandidate.value : rightCandidate.value;
};

const resolveLatestSessionTimestampValue = (
  latestSessionEntry: LessonPanelSectionEntry,
  fallbackSessionEntry: LessonPanelSectionEntry,
  key: LessonPanelSessionTimestampKey
): string | null => latestSessionEntry[key] ?? fallbackSessionEntry[key] ?? null;

const resolveMergedSessionTimestampValue = (
  input: LessonPanelSessionMergeInput,
  key: LessonPanelSessionTimestampKey,
  preference: 'earliest' | 'latest'
): string | null =>
  input.isSameSession
    ? resolvePreferredTimestampValue(input.leftEntry[key], input.rightEntry[key], preference)
    : resolveLatestSessionTimestampValue(input.latestSessionEntry, input.fallbackSessionEntry, key);

const resolveMergedSessionStartedAt = (input: LessonPanelSessionMergeInput): string | null =>
  resolveMergedSessionTimestampValue(input, 'sessionStartedAt', 'earliest');

const resolveMergedSessionUpdatedAt = (input: LessonPanelSessionMergeInput): string | null =>
  resolveMergedSessionTimestampValue(input, 'sessionUpdatedAt', 'latest');

const resolveMergedLessonPanelSessionId = (
  input: LessonPanelSessionMergeInput
): string | undefined => {
  if (input.isSameSession) {
    return input.leftEntry.sessionId?.trim() || input.rightEntry.sessionId?.trim() || undefined;
  }
  return input.latestSessionEntry.sessionId ?? input.fallbackSessionEntry.sessionId ?? undefined;
};

const withMergedPanelTimes = (
  entry: LessonPanelSectionEntry,
  panelTimes: LessonPanelTimes | undefined
): LessonPanelSectionEntry => (panelTimes ? { ...entry, panelTimes } : entry);

const buildMergedLessonPanelSectionEntry = (
  input: LessonPanelSectionMergeContext
): LessonPanelSectionEntry =>
  withMergedPanelTimes(
    {
      viewedCount: Math.max(input.leftEntry.viewedCount, input.rightEntry.viewedCount),
      totalCount: Math.max(input.leftEntry.totalCount, input.rightEntry.totalCount),
      lastViewedAt: input.latestEntry.lastViewedAt ?? input.fallbackEntry.lastViewedAt ?? null,
      label: input.latestEntry.label ?? input.fallbackEntry.label,
      sessionId: resolveMergedLessonPanelSessionId(input),
      sessionStartedAt: resolveMergedSessionStartedAt(input),
      sessionUpdatedAt: resolveMergedSessionUpdatedAt(input),
    },
    resolveMergedPanelTimes(input)
  );

const mergeLessonPanelSectionEntry = (
  leftEntry: LessonPanelSectionEntry | undefined,
  rightEntry: LessonPanelSectionEntry | undefined
): LessonPanelSectionEntry | null => {
  const resolvedEntries = resolveMergePair(leftEntry, rightEntry);
  if ('mergedEntry' in resolvedEntries) {
    return resolvedEntries.mergedEntry;
  }
  const { leftEntry: requiredLeftEntry, rightEntry: requiredRightEntry } = resolvedEntries;

  const { latestEntry, fallbackEntry } = resolveLatestSectionEntries(
    requiredLeftEntry,
    requiredRightEntry
  );
  const { latestSessionEntry, fallbackSessionEntry } = resolveLatestSessionEntries(
    requiredLeftEntry,
    requiredRightEntry
  );

  return buildMergedLessonPanelSectionEntry({
    leftEntry: requiredLeftEntry,
    rightEntry: requiredRightEntry,
    latestEntry,
    fallbackEntry,
    latestSessionEntry,
    fallbackSessionEntry,
    isSameSession: areMatchingLessonPanelSessions(requiredLeftEntry, requiredRightEntry),
  });
};
