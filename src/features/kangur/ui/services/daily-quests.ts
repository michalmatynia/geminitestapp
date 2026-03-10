import type { KangurProgressState } from '@/shared/contracts/kangur';

import {
  buildKangurAssignments,
  type KangurAssignmentPlan,
  type KangurAssignmentQuestMetric,
} from './assignments';
import { loadProgressOwnerKey } from './progress';

const KANGUR_DAILY_QUEST_STORAGE_KEY = 'kangur_daily_quest_v1';

type KangurDailyQuestStoredState = {
  version: 1;
  dateKey: string;
  ownerKey: string | null;
  createdAt: string;
  expiresAt: string;
  claimedAt: string | null;
  baselineGamesPlayed: number;
  baselineLessonsCompleted: number;
  assignment: KangurAssignmentPlan;
};

export type KangurDailyQuestProgress = {
  current: number;
  target: number;
  percent: number;
  summary: string;
  status: 'not_started' | 'in_progress' | 'completed';
};

export type KangurDailyQuestState = {
  assignment: KangurAssignmentPlan;
  createdAt: string;
  dateKey: string;
  expiresAt: string;
  expiresLabel: string;
  progress: KangurDailyQuestProgress;
  reward: {
    xp: number;
    status: 'locked' | 'ready' | 'claimed';
    label: string;
  };
};

export type KangurDailyQuestClaimResult = {
  quest: KangurDailyQuestState | null;
  xpAwarded: number;
};

type KangurDailyQuestOptions = {
  now?: Date;
  ownerKey?: string | null;
  persist?: boolean;
};

const canUseStorage = (): boolean => typeof window !== 'undefined' && Boolean(window.localStorage);

const toLocalDateKey = (date: Date): string => {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const buildQuestExpiry = (now: Date): string => {
  const expiry = new Date(now);
  expiry.setHours(23, 59, 59, 999);
  return expiry.toISOString();
};

const resolveQuestOwnerKey = (ownerKeyOverride?: string | null): string | null => {
  if (typeof ownerKeyOverride === 'string') {
    const normalized = ownerKeyOverride.trim();
    return normalized.length > 0 ? normalized : null;
  }

  return loadProgressOwnerKey();
};

const isQuestMetric = (
  value: KangurAssignmentPlan['questMetric']
): value is KangurAssignmentQuestMetric => Boolean(value);

const isStoredQuestState = (value: unknown): value is KangurDailyQuestStoredState => {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as Partial<KangurDailyQuestStoredState>;
  return (
    candidate.version === 1 &&
    typeof candidate.dateKey === 'string' &&
    typeof candidate.createdAt === 'string' &&
    typeof candidate.expiresAt === 'string' &&
    (candidate.claimedAt === null || typeof candidate.claimedAt === 'string' || candidate.claimedAt === undefined) &&
    typeof candidate.baselineGamesPlayed === 'number' &&
    typeof candidate.baselineLessonsCompleted === 'number' &&
    Boolean(candidate.assignment?.id) &&
    isQuestMetric(candidate.assignment?.questMetric)
  );
};

const loadStoredDailyQuest = (): KangurDailyQuestStoredState | null => {
  if (!canUseStorage()) {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(KANGUR_DAILY_QUEST_STORAGE_KEY);
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as unknown;
    return isStoredQuestState(parsed) ? parsed : null;
  } catch {
    return null;
  }
};

const saveStoredDailyQuest = (quest: KangurDailyQuestStoredState): void => {
  if (!canUseStorage()) {
    return;
  }

  try {
    window.localStorage.setItem(KANGUR_DAILY_QUEST_STORAGE_KEY, JSON.stringify(quest));
  } catch {
    // Ignore local storage write failures so the widget stays non-blocking.
  }
};

const hashDailyQuestSeed = (value: string): number =>
  Array.from(value).reduce((sum, char) => sum + char.charCodeAt(0), 0);

const selectDailyQuestCandidate = (
  candidates: KangurAssignmentPlan[],
  dateKey: string,
  ownerKey: string | null
): KangurAssignmentPlan | null => {
  const prioritized = candidates.filter((assignment) => isQuestMetric(assignment.questMetric));
  if (prioritized.length === 0) {
    return null;
  }

  const highestPriority = prioritized.find((assignment) => assignment.priority === 'high');
  if (highestPriority) {
    return highestPriority;
  }

  const rotationPool = prioritized
    .filter((assignment) => assignment.priority !== 'low')
    .slice(0, 2);
  const pool = rotationPool.length > 0 ? rotationPool : prioritized.slice(0, 2);
  const seed = hashDailyQuestSeed(`${dateKey}:${ownerKey ?? 'guest'}`);
  return pool[seed % pool.length] ?? prioritized[0] ?? null;
};

const createStoredQuest = (
  progress: KangurProgressState,
  assignment: KangurAssignmentPlan,
  now: Date,
  ownerKey: string | null
): KangurDailyQuestStoredState => ({
  version: 1,
  dateKey: toLocalDateKey(now),
  ownerKey,
  createdAt: now.toISOString(),
  expiresAt: buildQuestExpiry(now),
  claimedAt: null,
  baselineGamesPlayed: progress.gamesPlayed,
  baselineLessonsCompleted: progress.lessonsCompleted,
  assignment,
});

const resolveQuestProgress = (
  metric: KangurAssignmentQuestMetric,
  stored: KangurDailyQuestStoredState,
  progress: KangurProgressState
): KangurDailyQuestProgress => {
  if (metric.kind === 'games_played') {
    const current = Math.max(0, progress.gamesPlayed - stored.baselineGamesPlayed);
    const target = Math.max(1, metric.targetDelta);
    const percent = Math.min(100, Math.round((Math.min(current, target) / target) * 100));
    return {
      current,
      target,
      percent,
      summary: `${Math.min(current, target)}/${target} runda dzisiaj`,
      status: current >= target ? 'completed' : current > 0 ? 'in_progress' : 'not_started',
    };
  }

  if (metric.kind === 'lessons_completed') {
    const current = Math.max(0, progress.lessonsCompleted - stored.baselineLessonsCompleted);
    const target = Math.max(1, metric.targetDelta);
    const percent = Math.min(100, Math.round((Math.min(current, target) / target) * 100));
    return {
      current,
      target,
      percent,
      summary: `${Math.min(current, target)}/${target} lekcja dzisiaj`,
      status: current >= target ? 'completed' : current > 0 ? 'in_progress' : 'not_started',
    };
  }

  const current = Math.max(
    0,
    progress.lessonMastery[metric.lessonComponentId]?.masteryPercent ?? 0
  );
  const target = Math.max(1, metric.targetPercent);
  const percent = Math.min(100, Math.round((Math.min(current, target) / target) * 100));
  return {
    current,
    target,
    percent,
    summary: `${current}% / ${target}% opanowania`,
    status: current >= target ? 'completed' : current > 0 ? 'in_progress' : 'not_started',
  };
};

const toDailyQuestState = (
  stored: KangurDailyQuestStoredState,
  progress: KangurProgressState
): KangurDailyQuestState => {
  const progressState = resolveQuestProgress(stored.assignment.questMetric!, stored, progress);
  const rewardXp = Math.max(0, stored.assignment.rewardXp ?? 0);
  const rewardStatus =
    stored.claimedAt
      ? 'claimed'
      : progressState.status === 'completed'
        ? 'ready'
        : 'locked';

  return {
    assignment: stored.assignment,
    createdAt: stored.createdAt,
    dateKey: stored.dateKey,
    expiresAt: stored.expiresAt,
    expiresLabel: 'Wygasa dzisiaj',
    progress: progressState,
    reward: {
      xp: rewardXp,
      status: rewardStatus,
      label:
        rewardStatus === 'claimed'
          ? `Nagroda odebrana +${rewardXp} XP`
          : rewardStatus === 'ready'
            ? `Nagroda gotowa +${rewardXp} XP`
            : `Nagroda +${rewardXp} XP`,
    },
  };
};

export const getCurrentKangurDailyQuest = (
  progress: KangurProgressState,
  options: KangurDailyQuestOptions = {}
): KangurDailyQuestState | null => {
  const { now = new Date(), persist = true } = options;
  const ownerKey = resolveQuestOwnerKey(options.ownerKey);
  const dateKey = toLocalDateKey(now);
  const stored = loadStoredDailyQuest();

  if (stored?.dateKey === dateKey && stored.ownerKey === ownerKey) {
    return toDailyQuestState(stored, progress);
  }

  const candidate = selectDailyQuestCandidate(buildKangurAssignments(progress, 3), dateKey, ownerKey);
  if (!candidate) {
    return null;
  }

  const nextStored = createStoredQuest(progress, candidate, now, ownerKey);
  if (persist) {
    saveStoredDailyQuest(nextStored);
  }
  return toDailyQuestState(nextStored, progress);
};

export const getKangurDailyQuestStorageKey = (): string => KANGUR_DAILY_QUEST_STORAGE_KEY;

export const claimCurrentKangurDailyQuestReward = (
  progress: KangurProgressState,
  options: KangurDailyQuestOptions = {}
): KangurDailyQuestClaimResult => {
  const { now = new Date() } = options;
  const ownerKey = resolveQuestOwnerKey(options.ownerKey);
  const dateKey = toLocalDateKey(now);
  const stored = loadStoredDailyQuest();

  if (stored?.dateKey !== dateKey || stored?.ownerKey !== ownerKey) {
    return {
      quest: getCurrentKangurDailyQuest(progress, { ...options, persist: false }),
      xpAwarded: 0,
    };
  }

  const quest = toDailyQuestState(stored, progress);
  const rewardXp = Math.max(0, stored.assignment.rewardXp ?? 0);
  if (quest.progress.status !== 'completed' || stored.claimedAt || rewardXp <= 0) {
    return { quest, xpAwarded: 0 };
  }

  const claimedStored: KangurDailyQuestStoredState = {
    ...stored,
    claimedAt: now.toISOString(),
  };
  saveStoredDailyQuest(claimedStored);

  return {
    quest: toDailyQuestState(claimedStored, progress),
    xpAwarded: rewardXp,
  };
};
