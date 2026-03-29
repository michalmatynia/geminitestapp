import {
  normalizeKangurProgressState,
} from '@/features/kangur/shared/contracts/kangur';
import type { KangurProgressState } from '@/features/kangur/ui/types';

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
type MergePairResult<T extends object> =
  | { leftEntry: T; rightEntry: T }
  | { mergedEntry: T | null };
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

const resolveMergedPanelTimes = (
  input: LessonPanelSessionMergeInput
): LessonPanelTimes | undefined =>
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
