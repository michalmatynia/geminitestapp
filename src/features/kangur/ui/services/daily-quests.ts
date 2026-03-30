import type {
  KangurLessonSubject,
  KangurProgressState,
} from '@/features/kangur/shared/contracts/kangur';
import { kangurLessonSubjectSchema } from '@/features/kangur/shared/contracts/kangur';
import { DEFAULT_KANGUR_SUBJECT } from '@/features/kangur/lessons/lesson-catalog-metadata';
import { getLocalizedKangurLessonTitle } from '@/features/kangur/lessons/lesson-catalog-i18n';
import type {
  KangurAssignmentPlan,
  KangurAssignmentQuestMetric,
  KangurDailyQuestClaimResult,
  KangurDailyQuestProgress,
  KangurDailyQuestState,
} from '@/features/kangur/shared/contracts/kangur-quests';

import { buildKangurAssignments } from './assignments';
import { withKangurClientErrorSync } from '@/features/kangur/observability/client';
import {
  translateKangurProgressWithFallback,
  type KangurProgressTranslate,
} from './progress-i18n';
import { normalizeSiteLocale } from '@/shared/lib/i18n/site-locale';

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
  locale?: string | null;
  now?: Date;
  ownerKey: string | null;
  persist?: boolean;
  subject: KangurLessonSubject;
  translate?: KangurProgressTranslate;
};

type KangurDailyQuestFallbackCopy = {
  progress: {
    gamesPlayed: (current: number, target: number) => string;
    lessonsCompleted: (current: number, target: number) => string;
    lessonMastery: (current: number, target: number) => string;
  };
  expiresToday: string;
  reward: {
    claimed: (xp: number) => string;
    locked: (xp: number) => string;
    ready: (xp: number) => string;
  };
};

const getDailyQuestFallbackCopy = (
  locale: string | null | undefined
): KangurDailyQuestFallbackCopy => {
  const normalizedLocale = normalizeSiteLocale(locale);

  if (normalizedLocale === 'uk') {
    return {
      progress: {
        gamesPlayed: (current, target) => `${current}/${target} раунд сьогодні`,
        lessonsCompleted: (current, target) => `${current}/${target} урок сьогодні`,
        lessonMastery: (current, target) => `${current}% / ${target}% опанування`,
      },
      expiresToday: 'Спливає сьогодні',
      reward: {
        claimed: (xp) => `Нагороду отримано +${xp} XP`,
        locked: (xp) => `Нагорода +${xp} XP`,
        ready: (xp) => `Нагорода готова +${xp} XP`,
      },
    };
  }

  if (normalizedLocale === 'de') {
    return {
      progress: {
        gamesPlayed: (current, target) => `${current}/${target} Runde heute`,
        lessonsCompleted: (current, target) => `${current}/${target} Lektion heute`,
        lessonMastery: (current, target) => `${current}% / ${target}% Beherrschung`,
      },
      expiresToday: 'Lauft heute ab',
      reward: {
        claimed: (xp) => `Belohnung abgeholt +${xp} XP`,
        locked: (xp) => `Belohnung +${xp} XP`,
        ready: (xp) => `Belohnung bereit +${xp} XP`,
      },
    };
  }

  if (normalizedLocale === 'en') {
    return {
      progress: {
        gamesPlayed: (current, target) => `${current}/${target} round today`,
        lessonsCompleted: (current, target) => `${current}/${target} lesson today`,
        lessonMastery: (current, target) => `${current}% / ${target}% mastery`,
      },
      expiresToday: 'Expires today',
      reward: {
        claimed: (xp) => `Reward claimed +${xp} XP`,
        locked: (xp) => `Reward +${xp} XP`,
        ready: (xp) => `Reward ready +${xp} XP`,
      },
    };
  }

  return {
    progress: {
      gamesPlayed: (current, target) => `${current}/${target} runda dzisiaj`,
      lessonsCompleted: (current, target) => `${current}/${target} lekcja dzisiaj`,
      lessonMastery: (current, target) => `${current}% / ${target}% opanowania`,
    },
    expiresToday: 'Wygasa dzisiaj',
    reward: {
      claimed: (xp) => `Nagroda odebrana +${xp} XP`,
      locked: (xp) => `Nagroda +${xp} XP`,
      ready: (xp) => `Nagroda gotowa +${xp} XP`,
    },
  };
};

const canUseStorage = (): boolean => typeof window !== 'undefined' && Boolean(window.localStorage);

const normalizeQuestOwnerKey = (ownerKey: string | null | undefined): string | null => {
  const normalized = typeof ownerKey === 'string' ? ownerKey.trim() : '';
  return normalized.length > 0 ? normalized : null;
};

const buildDailyQuestStorageKey = (
  subject: KangurLessonSubject,
  ownerKey?: string | null
): string => `${KANGUR_DAILY_QUEST_STORAGE_KEY}:${subject}:${normalizeQuestOwnerKey(ownerKey) ?? 'guest'}`;

const buildLegacyDailyQuestStorageKey = (subject: KangurLessonSubject): string =>
  `${KANGUR_DAILY_QUEST_STORAGE_KEY}:${subject}`;

const getDailyQuestStorageCandidates = (
  subject: KangurLessonSubject,
  ownerKey: string | null
): string[] => {
  const keys = [buildDailyQuestStorageKey(subject, ownerKey), buildLegacyDailyQuestStorageKey(subject)];
  if (subject === 'maths') {
    keys.push(KANGUR_DAILY_QUEST_STORAGE_KEY);
  }

  return Array.from(new Set(keys));
};

const clearLegacyDailyQuestStorageKeys = (subject: KangurLessonSubject): void => {
  if (!canUseStorage()) {
    return;
  }

  window.localStorage.removeItem(buildLegacyDailyQuestStorageKey(subject));
  if (subject === 'maths') {
    window.localStorage.removeItem(KANGUR_DAILY_QUEST_STORAGE_KEY);
  }
};

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

const resolveQuestOwnerKey = (ownerKey: string | null): string | null =>
  normalizeQuestOwnerKey(ownerKey);

const isQuestMetric = (
  value: KangurAssignmentPlan['questMetric']
): value is KangurAssignmentQuestMetric => Boolean(value);

const hasStoredQuestSubject = (
  candidate: Partial<KangurDailyQuestStoredState>
): boolean =>
  candidate.subject === undefined || kangurLessonSubjectSchema.safeParse(candidate.subject).success;

const hasStoredQuestClaimedAt = (
  candidate: Partial<KangurDailyQuestStoredState>
): boolean =>
  candidate.claimedAt === null ||
  typeof candidate.claimedAt === 'string' ||
  candidate.claimedAt === undefined;

const hasStoredQuestMetadata = (
  candidate: Partial<KangurDailyQuestStoredState>
): boolean =>
  candidate.version === 1 &&
  typeof candidate.dateKey === 'string' &&
  typeof candidate.createdAt === 'string' &&
  typeof candidate.expiresAt === 'string' &&
  hasStoredQuestClaimedAt(candidate) &&
  typeof candidate.baselineGamesPlayed === 'number' &&
  typeof candidate.baselineLessonsCompleted === 'number';

const hasStoredQuestAssignment = (
  candidate: Partial<KangurDailyQuestStoredState>
): boolean => Boolean(candidate.assignment?.id) && isQuestMetric(candidate.assignment?.questMetric);

const isStoredQuestState = (value: unknown): value is KangurDailyQuestStoredState => {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as Partial<KangurDailyQuestStoredState>;
  return (
    hasStoredQuestMetadata(candidate) &&
    hasStoredQuestAssignment(candidate) &&
    hasStoredQuestSubject(candidate)
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

const readStoredDailyQuestCandidate = (
  storageKey: string,
  subject: KangurLessonSubject
): KangurDailyQuestStoredState | null => {
  const raw = window.localStorage.getItem(storageKey);
  if (!raw) {
    return null;
  }

  const parsed = JSON.parse(raw) as unknown;
  return isStoredQuestState(parsed) ? normalizeStoredQuest(parsed, subject) : null;
};

const matchesStoredDailyQuestScope = (
  normalized: KangurDailyQuestStoredState,
  ownerKey: string | null,
  subject: KangurLessonSubject
): boolean =>
  normalized.subject === subject && normalizeQuestOwnerKey(normalized.ownerKey) === ownerKey;

const persistNormalizedStoredDailyQuest = ({
  normalized,
  persist,
  scopedStorageKey,
  storageKey,
  subject,
}: {
  normalized: KangurDailyQuestStoredState;
  persist?: boolean;
  scopedStorageKey: string;
  storageKey: string;
  subject: KangurLessonSubject;
}): void => {
  if (persist === false) {
    return;
  }

  window.localStorage.setItem(scopedStorageKey, JSON.stringify(normalized));
  if (storageKey !== scopedStorageKey) {
    clearLegacyDailyQuestStorageKeys(subject);
  }
};

const readStoredDailyQuestFromStorage = ({
  ownerKey,
  persist,
  subject,
}: {
  ownerKey: string | null;
  persist?: boolean;
  subject: KangurLessonSubject;
}): KangurDailyQuestStoredState | null => {
  const scopedStorageKey = buildDailyQuestStorageKey(subject, ownerKey);
  for (const storageKey of getDailyQuestStorageCandidates(subject, ownerKey)) {
    const normalized = readStoredDailyQuestCandidate(storageKey, subject);
    if (!normalized || !matchesStoredDailyQuestScope(normalized, ownerKey, subject)) {
      continue;
    }

    persistNormalizedStoredDailyQuest({
      normalized,
      persist,
      scopedStorageKey,
      storageKey,
      subject,
    });
    return normalized;
  }

  return null;
};

const loadStoredDailyQuest = (
  subject: KangurLessonSubject,
  ownerKey: string | null,
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
    () => readStoredDailyQuestFromStorage({ ownerKey, persist: options?.persist, subject }),
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
  const storageKey = buildDailyQuestStorageKey(subject, quest.ownerKey);

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

const buildQuestProgressStatus = (
  current: number,
  target: number
): KangurDailyQuestProgress['status'] =>
  current >= target ? 'completed' : current > 0 ? 'in_progress' : 'not_started';

const buildQuestProgressState = ({
  current,
  summary,
  target,
}: {
  current: number;
  summary: string;
  target: number;
}): KangurDailyQuestProgress => ({
  current,
  target,
  percent: Math.min(100, Math.round((Math.min(current, target) / target) * 100)),
  summary,
  status: buildQuestProgressStatus(current, target),
});

const buildTranslatedQuestProgress = ({
  clampCurrentForLabel = true,
  current,
  fallbackSummary,
  summaryKey,
  target,
  translate,
}: {
  clampCurrentForLabel?: boolean;
  current: number;
  fallbackSummary: string;
  summaryKey:
    | 'dailyQuest.progress.gamesPlayed'
    | 'dailyQuest.progress.lessonsCompleted'
    | 'dailyQuest.progress.lessonMastery';
  target: number;
  translate?: KangurProgressTranslate;
}): KangurDailyQuestProgress =>
  buildQuestProgressState({
    current,
    target,
    summary: translateKangurProgressWithFallback(translate, summaryKey, fallbackSummary, {
      current: clampCurrentForLabel ? Math.min(current, target) : current,
      target,
    }),
  });

const resolveQuestProgress = (
  metric: KangurAssignmentQuestMetric,
  stored: KangurDailyQuestStoredState,
  progress: KangurProgressState,
  fallbackCopy: KangurDailyQuestFallbackCopy,
  translate?: KangurProgressTranslate
): KangurDailyQuestProgress => {
  if (metric.kind === 'games_played') {
    const current = Math.max(0, progress.gamesPlayed - stored.baselineGamesPlayed);
    const target = Math.max(1, metric.targetDelta);
    return buildTranslatedQuestProgress({
      current,
      target,
      summaryKey: 'dailyQuest.progress.gamesPlayed',
      fallbackSummary: fallbackCopy.progress.gamesPlayed(Math.min(current, target), target),
      translate,
    });
  }

  if (metric.kind === 'lessons_completed') {
    const current = Math.max(0, progress.lessonsCompleted - stored.baselineLessonsCompleted);
    const target = Math.max(1, metric.targetDelta);
    return buildTranslatedQuestProgress({
      current,
      target,
      summaryKey: 'dailyQuest.progress.lessonsCompleted',
      fallbackSummary: fallbackCopy.progress.lessonsCompleted(Math.min(current, target), target),
      translate,
    });
  }

  const current = Math.max(
    0,
    progress.lessonMastery[metric.lessonComponentId]?.masteryPercent ?? 0
  );
  const target = Math.max(1, metric.targetPercent);
  return buildTranslatedQuestProgress({
    clampCurrentForLabel: false,
    current,
    target,
    summaryKey: 'dailyQuest.progress.lessonMastery',
    fallbackSummary: fallbackCopy.progress.lessonMastery(current, target),
    translate,
  });
};

const toDailyQuestState = (
  stored: KangurDailyQuestStoredState,
  progress: KangurProgressState,
  fallbackCopy: KangurDailyQuestFallbackCopy,
  translate?: KangurProgressTranslate
): KangurDailyQuestState => {
  const progressState = resolveQuestProgress(
    stored.assignment.questMetric!,
    stored,
    progress,
    fallbackCopy,
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
      fallbackCopy.expiresToday
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
              fallbackCopy.reward.claimed(rewardXp),
              { xp: rewardXp }
            )
          : rewardStatus === 'ready'
            ? translateKangurProgressWithFallback(
                translate,
                'dailyQuest.reward.ready',
                fallbackCopy.reward.ready(rewardXp),
                { xp: rewardXp }
              )
            : translateKangurProgressWithFallback(
                translate,
                'dailyQuest.reward.locked',
                fallbackCopy.reward.locked(rewardXp),
                { xp: rewardXp }
              ),
    },
  };
};

export const getCurrentKangurDailyQuest = (
  progress: KangurProgressState,
  options: KangurDailyQuestOptions
): KangurDailyQuestState | null => {
  const fallbackCopy = getDailyQuestFallbackCopy(options.locale);
  const { now = new Date(), persist = true } = options;
  const { subject } = options;
  const ownerKey = resolveQuestOwnerKey(options.ownerKey);
  const dateKey = toLocalDateKey(now);
  const stored = loadStoredDailyQuest(subject, ownerKey, { persist });

  if (stored?.dateKey === dateKey && stored.ownerKey === ownerKey) {
    return toDailyQuestState(stored, progress, fallbackCopy, options.translate);
  }

  const candidate = selectDailyQuestCandidate(
    buildKangurAssignments(progress, 3, {
      locale: options.locale,
      resolveLessonTitle: (componentId, fallbackTitle) =>
        getLocalizedKangurLessonTitle(componentId, options.locale, fallbackTitle),
    }),
    dateKey,
    ownerKey
  );
  if (!candidate) {
    return null;
  }

  const nextStored = createStoredQuest(progress, candidate, now, ownerKey, subject);
  if (persist) {
    saveStoredDailyQuest(nextStored);
  }
  return toDailyQuestState(nextStored, progress, fallbackCopy, options.translate);
};

export const getKangurDailyQuestStorageKey = (
  subject: KangurLessonSubject,
  ownerKey: string | null
): string => buildDailyQuestStorageKey(subject, resolveQuestOwnerKey(ownerKey));

const shouldUseCurrentQuestFallback = (
  stored: KangurDailyQuestStoredState | null,
  dateKey: string,
  ownerKey: string | null
): boolean => stored?.dateKey !== dateKey || stored?.ownerKey !== ownerKey;

const canClaimQuestReward = ({
  quest,
  rewardXp,
  stored,
}: {
  quest: KangurDailyQuestState;
  rewardXp: number;
  stored: KangurDailyQuestStoredState;
}): boolean => quest.progress.status === 'completed' && !stored.claimedAt && rewardXp > 0;

export const claimCurrentKangurDailyQuestReward = (
  progress: KangurProgressState,
  options: KangurDailyQuestOptions
): KangurDailyQuestClaimResult => {
  const fallbackCopy = getDailyQuestFallbackCopy(options.locale);
  const { now = new Date() } = options;
  const { subject } = options;
  const ownerKey = resolveQuestOwnerKey(options.ownerKey);
  const dateKey = toLocalDateKey(now);
  const stored = loadStoredDailyQuest(subject, ownerKey, { persist: options.persist });

  if (shouldUseCurrentQuestFallback(stored, dateKey, ownerKey)) {
    return {
      quest: getCurrentKangurDailyQuest(progress, { ...options, persist: false }),
      xpAwarded: 0,
    };
  }
  if (!stored) {
    return {
      quest: getCurrentKangurDailyQuest(progress, { ...options, persist: false }),
      xpAwarded: 0,
    };
  }

  const quest = toDailyQuestState(stored, progress, fallbackCopy, options.translate);
  const rewardXp = Math.max(0, stored.assignment.rewardXp ?? 0);
  if (!canClaimQuestReward({ quest, rewardXp, stored })) {
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
    quest: toDailyQuestState(claimedStored, progress, fallbackCopy, options.translate),
    xpAwarded: rewardXp,
  };
};
