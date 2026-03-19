import type {
  KangurLessonSubject,
  KangurProgressState,
} from '@/features/kangur/shared/contracts/kangur';
import { kangurLessonSubjectSchema } from '@/features/kangur/shared/contracts/kangur';
import { DEFAULT_KANGUR_SUBJECT } from '@/features/kangur/lessons/lesson-catalog';
import type {
  KangurAssignmentPlan,
  KangurAssignmentQuestMetric,
  KangurDailyQuestClaimResult,
  KangurDailyQuestProgress,
  KangurDailyQuestState,
} from '@/features/kangur/shared/contracts/kangur-quests';

import { buildKangurAssignments } from './assignments';
import { getProgressSubject, loadProgressOwnerKey } from './progress';
import { withKangurClientErrorSync } from '@/features/kangur/observability/client';
import {
  translateKangurProgressWithFallback,
  type KangurProgressTranslate,
} from './progress-i18n';

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
  subject?: KangurLessonSubject;
};

type KangurDailyQuestOptions = {
  now?: Date;
  ownerKey?: string | null;
  persist?: boolean;
  subject?: KangurLessonSubject;
  translate?: KangurProgressTranslate;
};

const canUseStorage = (): boolean => typeof window !== 'undefined' && Boolean(window.localStorage);

const resolveQuestSubject = (options?: KangurDailyQuestOptions): KangurLessonSubject =>
  options?.subject ?? getProgressSubject();

const buildDailyQuestStorageKey = (subject: KangurLessonSubject): string =>
  `${KANGUR_DAILY_QUEST_STORAGE_KEY}:${subject}`;

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
  const subjectValid =
    candidate.subject === undefined ||
    kangurLessonSubjectSchema.safeParse(candidate.subject).success;
  return (
    candidate.version === 1 &&
    typeof candidate.dateKey === 'string' &&
    typeof candidate.createdAt === 'string' &&
    typeof candidate.expiresAt === 'string' &&
    (candidate.claimedAt === null || typeof candidate.claimedAt === 'string' || candidate.claimedAt === undefined) &&
    typeof candidate.baselineGamesPlayed === 'number' &&
    typeof candidate.baselineLessonsCompleted === 'number' &&
    Boolean(candidate.assignment?.id) &&
    isQuestMetric(candidate.assignment?.questMetric) &&
    subjectValid
  );
};

const normalizeStoredQuest = (
  stored: KangurDailyQuestStoredState,
  subject: KangurLessonSubject
): KangurDailyQuestStoredState => {
  const normalizedSubject = kangurLessonSubjectSchema.safeParse(stored.subject).success
    ? (stored.subject as KangurLessonSubject)
    : subject;
  return {
    ...stored,
    subject: normalizedSubject,
  };
};

const loadStoredDailyQuest = (
  subject: KangurLessonSubject,
  options?: { persist?: boolean }
): KangurDailyQuestStoredState | null => {
  if (!canUseStorage()) {
    return null;
  }

  return withKangurClientErrorSync(
    {
      source: 'kangur.daily-quests',
      action: 'load-storage',
      description: 'Loads the daily quest state from local storage.',
    },
    () => {
      const subjectKey = buildDailyQuestStorageKey(subject);
      const raw =
        window.localStorage.getItem(subjectKey) ||
        (subject === 'maths' ? window.localStorage.getItem(KANGUR_DAILY_QUEST_STORAGE_KEY) : null);
      if (!raw) {
        return null;
      }

      const parsed = JSON.parse(raw) as unknown;
      if (!isStoredQuestState(parsed)) {
        return null;
      }

      const normalized = normalizeStoredQuest(parsed, subject);
      if (normalized.subject !== subject) {
        return null;
      }

      if (options?.persist !== false) {
        window.localStorage.setItem(subjectKey, JSON.stringify(normalized));
        if (subject === 'maths') {
          window.localStorage.removeItem(KANGUR_DAILY_QUEST_STORAGE_KEY);
        }
      }

      return normalized;
    },
    { fallback: null }
  );
};

const saveStoredDailyQuest = (quest: KangurDailyQuestStoredState): void => {
  if (!canUseStorage()) {
    return;
  }

  const subject = kangurLessonSubjectSchema.safeParse(quest.subject).success
    ? (quest.subject as KangurLessonSubject)
    : DEFAULT_KANGUR_SUBJECT;
  const storageKey = buildDailyQuestStorageKey(subject);

  withKangurClientErrorSync(
    {
      source: 'kangur.daily-quests',
      action: 'save-storage',
      description: 'Persists the daily quest state to local storage.',
    },
    () => {
      window.localStorage.setItem(
        storageKey,
        JSON.stringify({
          ...quest,
          subject,
        })
      );
    },
    {
      // Ignore local storage write failures so the widget stays non-blocking.
      fallback: undefined,
    }
  );
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
  ownerKey: string | null,
  subject: KangurLessonSubject
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
  subject,
});

const resolveQuestProgress = (
  metric: KangurAssignmentQuestMetric,
  stored: KangurDailyQuestStoredState,
  progress: KangurProgressState,
  translate?: KangurProgressTranslate
): KangurDailyQuestProgress => {
  if (metric.kind === 'games_played') {
    const current = Math.max(0, progress.gamesPlayed - stored.baselineGamesPlayed);
    const target = Math.max(1, metric.targetDelta);
    const percent = Math.min(100, Math.round((Math.min(current, target) / target) * 100));
    return {
      current,
      target,
      percent,
      summary: translateKangurProgressWithFallback(
        translate,
        'dailyQuest.progress.gamesPlayed',
        `${Math.min(current, target)}/${target} runda dzisiaj`,
        {
          current: Math.min(current, target),
          target,
        }
      ),
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
      summary: translateKangurProgressWithFallback(
        translate,
        'dailyQuest.progress.lessonsCompleted',
        `${Math.min(current, target)}/${target} lekcja dzisiaj`,
        {
          current: Math.min(current, target),
          target,
        }
      ),
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
    summary: translateKangurProgressWithFallback(
      translate,
      'dailyQuest.progress.lessonMastery',
      `${current}% / ${target}% opanowania`,
      {
        current,
        target,
      }
    ),
    status: current >= target ? 'completed' : current > 0 ? 'in_progress' : 'not_started',
  };
};

const toDailyQuestState = (
  stored: KangurDailyQuestStoredState,
  progress: KangurProgressState,
  translate?: KangurProgressTranslate
): KangurDailyQuestState => {
  const progressState = resolveQuestProgress(
    stored.assignment.questMetric!,
    stored,
    progress,
    translate
  );
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
    expiresLabel: translateKangurProgressWithFallback(
      translate,
      'dailyQuest.expiresToday',
      'Wygasa dzisiaj'
    ),
    progress: progressState,
    reward: {
      xp: rewardXp,
      status: rewardStatus,
      label:
        rewardStatus === 'claimed'
          ? translateKangurProgressWithFallback(
              translate,
              'dailyQuest.reward.claimed',
              `Nagroda odebrana +${rewardXp} XP`,
              { xp: rewardXp }
            )
          : rewardStatus === 'ready'
            ? translateKangurProgressWithFallback(
                translate,
                'dailyQuest.reward.ready',
                `Nagroda gotowa +${rewardXp} XP`,
                { xp: rewardXp }
              )
            : translateKangurProgressWithFallback(
                translate,
                'dailyQuest.reward.locked',
                `Nagroda +${rewardXp} XP`,
                { xp: rewardXp }
              ),
    },
  };
};

export const getCurrentKangurDailyQuest = (
  progress: KangurProgressState,
  options: KangurDailyQuestOptions = {}
): KangurDailyQuestState | null => {
  const { now = new Date(), persist = true } = options;
  const subject = resolveQuestSubject(options);
  const ownerKey = resolveQuestOwnerKey(options.ownerKey);
  const dateKey = toLocalDateKey(now);
  const stored = loadStoredDailyQuest(subject, { persist });

  if (stored?.dateKey === dateKey && stored.ownerKey === ownerKey) {
    return toDailyQuestState(stored, progress, options.translate);
  }

  const candidate = selectDailyQuestCandidate(buildKangurAssignments(progress, 3), dateKey, ownerKey);
  if (!candidate) {
    return null;
  }

  const nextStored = createStoredQuest(progress, candidate, now, ownerKey, subject);
  if (persist) {
    saveStoredDailyQuest(nextStored);
  }
  return toDailyQuestState(nextStored, progress, options.translate);
};

export const getKangurDailyQuestStorageKey = (
  subject?: KangurLessonSubject
): string => buildDailyQuestStorageKey(subject ?? getProgressSubject());

export const claimCurrentKangurDailyQuestReward = (
  progress: KangurProgressState,
  options: KangurDailyQuestOptions = {}
): KangurDailyQuestClaimResult => {
  const { now = new Date() } = options;
  const subject = resolveQuestSubject(options);
  const ownerKey = resolveQuestOwnerKey(options.ownerKey);
  const dateKey = toLocalDateKey(now);
  const stored = loadStoredDailyQuest(subject, { persist: options.persist });

  if (stored?.dateKey !== dateKey || stored?.ownerKey !== ownerKey) {
    return {
      quest: getCurrentKangurDailyQuest(progress, { ...options, persist: false }),
      xpAwarded: 0,
    };
  }

  const quest = toDailyQuestState(stored, progress, options.translate);
  const rewardXp = Math.max(0, stored.assignment.rewardXp ?? 0);
  if (quest.progress.status !== 'completed' || stored.claimedAt || rewardXp <= 0) {
    return { quest, xpAwarded: 0 };
  }

  const claimedStored: KangurDailyQuestStoredState = {
    ...stored,
    claimedAt: now.toISOString(),
    subject,
  };
  if (options.persist !== false) {
    saveStoredDailyQuest(claimedStored);
  }

  return {
    quest: toDailyQuestState(claimedStored, progress, options.translate),
    xpAwarded: rewardXp,
  };
};
