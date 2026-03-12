import type {
  KangurAddXpResult,
  KangurProgressState,
  KangurRewardBreakdownEntry,
  KangurXpRewards,
} from '@/features/kangur/ui/types';
import {
  createDefaultKangurProgressState,
  normalizeKangurProgressState,
  type KangurActivityStatsEntry,
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
  track: 'onboarding' | 'consistency' | 'mastery' | 'variety' | 'challenge' | 'xp' | 'quest';
  progress: (progress: KangurProgressState) => {
    current: number;
    target: number;
    summary: string;
  };
};

type KangurLessonPracticeReward = {
  xp: number;
  scorePercent: number;
  progressUpdates: Partial<KangurProgressState>;
  breakdown: KangurRewardBreakdownEntry[];
};

type KangurRewardProfile = 'game' | 'lesson_practice' | 'training' | 'lesson_completion';

type KangurRewardCounterKey = 'clockPerfect' | 'calendarPerfect' | 'geometryPerfect';

type KangurRewardInput = {
  activityKey: string;
  profile: KangurRewardProfile;
  correctAnswers?: number;
  totalQuestions?: number;
  scorePercentOverride?: number;
  lessonKey?: string;
  operation?: string | null;
  difficulty?: string | null;
  durationSeconds?: number | null;
  strongThresholdPercent?: number;
  countsAsGame?: boolean;
  countsAsLessonCompletion?: boolean;
  followsRecommendation?: boolean;
  perfectCounterKey?: KangurRewardCounterKey;
  playedAt?: string;
};

type KangurRewardProfileConfig = {
  baseXp: number;
  minimumXp: number;
  perfectBonus: number;
  firstActivityBonus: number;
  improvementBonus: number;
  allowsSpeedBonus: boolean;
  allowsStreakBonus: boolean;
};

export type KangurProgressActivitySummary = {
  key: string;
  label: string;
  sessionsPlayed: number;
  perfectSessions: number;
  totalXpEarned: number;
  averageXpPerSession: number;
  averageAccuracy: number;
  bestScorePercent: number;
  currentStreak: number;
  bestStreak: number;
};

export type KangurBadgeProgress = {
  current: number;
  target: number;
  summary: string;
  isUnlocked: boolean;
  progressPercent: number;
};

export type KangurBadgeStatus = KangurBadge & KangurBadgeProgress;
export type KangurBadgeTrackKey = KangurBadge['track'];

export type KangurBadgeTrackSummary = {
  key: KangurBadgeTrackKey;
  label: string;
  emoji: string;
  unlockedCount: number;
  totalCount: number;
  progressPercent: number;
  nextBadge: KangurBadgeStatus | null;
  badges: KangurBadgeStatus[];
};

export type KangurRecommendedSessionMomentum = {
  completedSessions: number;
  progressPercent: number;
  summary: string;
  nextBadgeName: string | null;
};

export type KangurRecommendedSessionProjection = {
  current: KangurRecommendedSessionMomentum;
  projected: KangurRecommendedSessionMomentum;
};

type KangurVisibleBadgeOptions = {
  maxLocked?: number;
  minimumLockedProgressPercent?: number;
};

type KangurBadgeTrackOptions = {
  maxTracks?: number;
  minimumTrackProgressPercent?: number;
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

export const LEVELS: KangurProgressLevel[] = [
  { level: 1, minXp: 0, title: 'Raczkujący 🐣', color: 'text-gray-500' },
  { level: 2, minXp: 100, title: 'Uczeń ✏️', color: 'text-green-600' },
  { level: 3, minXp: 250, title: 'Myśliciel 🤔', color: 'text-blue-600' },
  { level: 4, minXp: 500, title: 'Liczmistrz 🔢', color: 'text-indigo-600' },
  { level: 5, minXp: 900, title: 'Matematyk 📐', color: 'text-purple-600' },
  { level: 6, minXp: 1400, title: 'Geniusz 🧠', color: 'text-yellow-600' },
  { level: 7, minXp: 2000, title: 'Legenda 🏆', color: 'text-red-600' },
];

const REWARD_PROFILE_CONFIG: Record<KangurRewardProfile, KangurRewardProfileConfig> = {
  game: {
    baseXp: 10,
    minimumXp: 10,
    perfectBonus: 12,
    firstActivityBonus: 4,
    improvementBonus: 3,
    allowsSpeedBonus: true,
    allowsStreakBonus: true,
  },
  lesson_practice: {
    baseXp: 12,
    minimumXp: 12,
    perfectBonus: 12,
    firstActivityBonus: 4,
    improvementBonus: 3,
    allowsSpeedBonus: false,
    allowsStreakBonus: true,
  },
  training: {
    baseXp: 14,
    minimumXp: 14,
    perfectBonus: 12,
    firstActivityBonus: 4,
    improvementBonus: 3,
    allowsSpeedBonus: true,
    allowsStreakBonus: true,
  },
  lesson_completion: {
    baseXp: 20,
    minimumXp: 20,
    perfectBonus: 6,
    firstActivityBonus: 8,
    improvementBonus: 0,
    allowsSpeedBonus: false,
    allowsStreakBonus: false,
  },
};

const DIFFICULTY_XP_BONUS: Record<string, number> = {
  easy: 0,
  medium: 4,
  hard: 8,
  starter: 0,
  pro: 6,
};

const MASTERY_STAGE_BONUSES = [
  { threshold: 90, xp: 4 },
  { threshold: 75, xp: 3 },
  { threshold: 60, xp: 2 },
] as const;

const GUIDED_FOCUS_BONUS = 3;

const ACTIVITY_LABELS: Record<string, string> = {
  addition: 'Dodawanie',
  subtraction: 'Odejmowanie',
  multiplication: 'Mnożenie',
  division: 'Dzielenie',
  decimals: 'Ułamki',
  powers: 'Potęgi',
  roots: 'Pierwiastki',
  mixed: 'Mieszane',
  clock: 'Nauka zegara',
  calendar: 'Nauka kalendarza',
  adding: 'Dodawanie',
  subtracting: 'Odejmowanie',
  geometry_basics: 'Podstawy geometrii',
  geometry_shapes: 'Figury geometryczne',
  geometry_symmetry: 'Symetria',
  geometry_perimeter: 'Obwod',
  logical_thinking: 'Logiczne myślenie',
};

const LESSON_KEY_TO_OPERATION: Record<string, string> = {
  adding: 'addition',
  subtracting: 'subtraction',
  multiplication: 'multiplication',
  division: 'division',
  clock: 'clock',
  calendar: 'calendar',
  geometry_basics: 'geometry',
  geometry_shapes: 'geometry',
  geometry_symmetry: 'geometry',
  geometry_perimeter: 'geometry',
};

const CLOCK_TRAINING_SECTION_LABELS: Record<string, string> = {
  hours: 'Godziny',
  minutes: 'Minuty',
  combined: 'Pełny czas',
  mixed: 'Mieszany trening',
};

const BADGE_TRACK_META: Record<KangurBadgeTrackKey, { label: string; emoji: string; order: number }> = {
  onboarding: { label: 'Start', emoji: '🚀', order: 1 },
  consistency: { label: 'Seria', emoji: '🔥', order: 2 },
  mastery: { label: 'Mistrzostwo', emoji: '🏗️', order: 3 },
  variety: { label: 'Różnorodność', emoji: '🎲', order: 4 },
  challenge: { label: 'Wyzwania', emoji: '🎯', order: 5 },
  xp: { label: 'XP', emoji: '⭐', order: 6 },
  quest: { label: 'Misje', emoji: '🧭', order: 7 },
};

const GUIDED_BADGE_IDS = new Set(['guided_step', 'guided_keeper']);

export const BADGES: KangurBadge[] = [
  {
    id: 'first_game',
    emoji: '🎮',
    name: 'Pierwsza gra',
    desc: 'Ukończ pierwszą grę',
    track: 'onboarding',
    progress: (progress) => ({
      current: progress.gamesPlayed,
      target: 1,
      summary: `${Math.min(progress.gamesPlayed, 1)}/1 gra`,
    }),
  },
  {
    id: 'perfect_10',
    emoji: '💯',
    name: 'Idealny wynik',
    desc: 'Zdobądź pełny wynik w grze',
    track: 'challenge',
    progress: (progress) => ({
      current: progress.perfectGames,
      target: 1,
      summary: `${Math.min(progress.perfectGames, 1)}/1 idealna gra`,
    }),
  },
  {
    id: 'lesson_hero',
    emoji: '📚',
    name: 'Bohater lekcji',
    desc: 'Ukończ pierwszą lekcję',
    track: 'onboarding',
    progress: (progress) => ({
      current: progress.lessonsCompleted,
      target: 1,
      summary: `${Math.min(progress.lessonsCompleted, 1)}/1 lekcja`,
    }),
  },
  {
    id: 'clock_master',
    emoji: '🕐',
    name: 'Mistrz zegara',
    desc: 'Ukończ trening zegara z wynikiem 5/5',
    track: 'mastery',
    progress: (progress) => ({
      current: progress.clockPerfect,
      target: 1,
      summary: `${Math.min(progress.clockPerfect, 1)}/1 perfect`,
    }),
  },
  {
    id: 'calendar_keeper',
    emoji: '📅',
    name: 'Mistrz kalendarza',
    desc: 'Ukończ trening kalendarza z pełnym wynikiem',
    track: 'mastery',
    progress: (progress) => ({
      current: progress.calendarPerfect,
      target: 1,
      summary: `${Math.min(progress.calendarPerfect, 1)}/1 perfect`,
    }),
  },
  {
    id: 'geometry_artist',
    emoji: '🔷',
    name: 'Artysta figur',
    desc: 'Ukończ trening figur geometrycznych z pełnym wynikiem',
    track: 'mastery',
    progress: (progress) => ({
      current: progress.geometryPerfect,
      target: 1,
      summary: `${Math.min(progress.geometryPerfect, 1)}/1 perfect`,
    }),
  },
  {
    id: 'streak_3',
    emoji: '🔥',
    name: 'Seria mocy',
    desc: 'Utrzymaj 3 mocne rundy z rzędu',
    track: 'consistency',
    progress: (progress) => ({
      current: progress.bestWinStreak ?? 0,
      target: 3,
      summary: `${Math.min(progress.bestWinStreak ?? 0, 3)}/3 w serii`,
    }),
  },
  {
    id: 'accuracy_ace',
    emoji: '🎯',
    name: 'Celny umysł',
    desc: 'Utrzymaj średnio co najmniej 85% poprawnych odpowiedzi po 25 pytaniach',
    track: 'challenge',
    progress: (progress) => {
      const totalQuestionsAnswered = progress.totalQuestionsAnswered ?? 0;
      const averageAccuracy = getAverageAccuracyPercent(progress);
      if (totalQuestionsAnswered < 25) {
        return {
          current: totalQuestionsAnswered,
          target: 25,
          summary: `${totalQuestionsAnswered}/25 pytań`,
        };
      }

      return {
        current: averageAccuracy,
        target: 85,
        summary: `${averageAccuracy}% / 85%`,
      };
    },
  },
  {
    id: 'ten_games',
    emoji: '🔟',
    name: 'Dziesiątka',
    desc: 'Zagraj 10 gier',
    track: 'consistency',
    progress: (progress) => ({
      current: progress.gamesPlayed,
      target: 10,
      summary: `${Math.min(progress.gamesPlayed, 10)}/10 gier`,
    }),
  },
  {
    id: 'xp_500',
    emoji: '⭐',
    name: 'Pół tysiąca XP',
    desc: 'Zdobądź 500 XP łącznie',
    track: 'xp',
    progress: (progress) => ({
      current: progress.totalXp,
      target: 500,
      summary: `${Math.min(progress.totalXp, 500)}/500 XP`,
    }),
  },
  {
    id: 'xp_1000',
    emoji: '🌟',
    name: 'Tysiącznik',
    desc: 'Zdobądź 1000 XP łącznie',
    track: 'xp',
    progress: (progress) => ({
      current: progress.totalXp,
      target: 1000,
      summary: `${Math.min(progress.totalXp, 1000)}/1000 XP`,
    }),
  },
  {
    id: 'quest_starter',
    emoji: '🧭',
    name: 'Odkrywca misji',
    desc: 'Ukończ pierwszą misję dnia',
    track: 'quest',
    progress: (progress) => ({
      current: progress.dailyQuestsCompleted ?? 0,
      target: 1,
      summary: `${Math.min(progress.dailyQuestsCompleted ?? 0, 1)}/1 misja`,
    }),
  },
  {
    id: 'quest_keeper',
    emoji: '🎯',
    name: 'Łowca misji',
    desc: 'Ukończ 3 misje dnia',
    track: 'quest',
    progress: (progress) => ({
      current: progress.dailyQuestsCompleted ?? 0,
      target: 3,
      summary: `${Math.min(progress.dailyQuestsCompleted ?? 0, 3)}/3 misje`,
    }),
  },
  {
    id: 'guided_step',
    emoji: '🪄',
    name: 'Pewny krok',
    desc: 'Ukończ pierwszą rundę zgodnie z rekomendacją',
    track: 'quest',
    progress: (progress) => ({
      current: progress.recommendedSessionsCompleted ?? 0,
      target: 1,
      summary: `${Math.min(progress.recommendedSessionsCompleted ?? 0, 1)}/1 runda`,
    }),
  },
  {
    id: 'guided_keeper',
    emoji: '🧭',
    name: 'Trzymam kierunek',
    desc: 'Ukończ 3 rundy zgodnie z rekomendacją',
    track: 'quest',
    progress: (progress) => ({
      current: progress.recommendedSessionsCompleted ?? 0,
      target: 3,
      summary: `${Math.min(progress.recommendedSessionsCompleted ?? 0, 3)}/3 rundy`,
    }),
  },
  {
    id: 'mastery_builder',
    emoji: '🏗️',
    name: 'Budowniczy mistrzostwa',
    desc: 'Doprowadź 3 lekcje do co najmniej 75% opanowania',
    track: 'mastery',
    progress: (progress) => {
      const masteredLessons = getMasteredLessonCount(progress, 75);
      return {
        current: masteredLessons,
        target: 3,
        summary: `${Math.min(masteredLessons, 3)}/3 lekcje`,
      };
    },
  },
  {
    id: 'variety',
    emoji: '🎲',
    name: 'Wszechstronny',
    desc: 'Zagraj 5 różnych operacji',
    track: 'variety',
    progress: (progress) => ({
      current: progress.operationsPlayed.length,
      target: 5,
      summary: `${Math.min(progress.operationsPlayed.length, 5)}/5 typów`,
    }),
  },
];

const FALLBACK_LEVEL: KangurProgressLevel = {
  level: 1,
  minXp: 0,
  title: 'Raczkujący 🐣',
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
    activityStats: Object.fromEntries(
      Object.entries(progress.activityStats ?? {}).map(([key, value]) => [key, { ...value }])
    ),
  };
}

const mergeUniqueStrings = (values: string[]): string[] => Array.from(new Set(values));
const clampPercent = (value: number): number => Math.max(0, Math.min(100, Math.round(value)));
const clampCounter = (value: number): number => Math.max(0, Math.round(value));
const formatSessionCountLabel = (count: number): string => {
  const normalizedCount = Math.abs(Math.trunc(count));
  const lastTwoDigits = normalizedCount % 100;
  const lastDigit = normalizedCount % 10;
  const noun =
    normalizedCount === 1
      ? 'sesja'
      : lastTwoDigits >= 12 && lastTwoDigits <= 14
        ? 'sesji'
        : lastDigit >= 2 && lastDigit <= 4
          ? 'sesje'
          : 'sesji';

  return `${count} ${noun}`;
};

const createEmptyActivityStatsEntry = (): KangurActivityStatsEntry => ({
  sessionsPlayed: 0,
  perfectSessions: 0,
  totalCorrectAnswers: 0,
  totalQuestionsAnswered: 0,
  totalXpEarned: 0,
  bestScorePercent: 0,
  lastScorePercent: 0,
  currentStreak: 0,
  bestStreak: 0,
  lastPlayedAt: null,
});

const getActivityStatsEntry = (
  progress: KangurProgressState,
  activityKey: string
): KangurActivityStatsEntry => progress.activityStats?.[activityKey] ?? createEmptyActivityStatsEntry();

function getAverageAccuracyPercent(progress: KangurProgressState): number {
  const totalQuestionsAnswered = progress.totalQuestionsAnswered ?? 0;
  if (totalQuestionsAnswered <= 0) {
    return 0;
  }

  return clampPercent(((progress.totalCorrectAnswers ?? 0) / totalQuestionsAnswered) * 100);
}

const resolveActivityTokenLabel = (token: string): string =>
  ACTIVITY_LABELS[token] ?? token.replace(/_/g, ' ').trim();

const resolveRewardOperation = ({
  operation,
  lessonKey,
  activityKey,
}: {
  operation?: string | null;
  lessonKey?: string | null;
  activityKey?: string | null;
}): string | null => {
  const normalizedOperation = operation?.trim();
  if (normalizedOperation) {
    return normalizedOperation;
  }

  const normalizedLessonKey = lessonKey?.trim();
  if (normalizedLessonKey) {
    return LESSON_KEY_TO_OPERATION[normalizedLessonKey] ?? normalizedLessonKey;
  }

  const normalizedActivityKey = activityKey?.trim();
  if (!normalizedActivityKey) {
    return null;
  }

  const [, rawPrimary = ''] = normalizedActivityKey.split(':');
  const normalizedPrimary = rawPrimary.trim();
  if (!normalizedPrimary) {
    return null;
  }

  return LESSON_KEY_TO_OPERATION[normalizedPrimary] ?? normalizedPrimary;
};

export const formatKangurProgressActivityLabel = (activityKey: string): string => {
  const [kind = '', rawPrimary = '', rawSecondary = ''] = activityKey.split(':');
  const primary = resolveActivityTokenLabel(rawPrimary);

  if (kind === 'game') {
    return `Gra: ${primary}`;
  }

  if (kind === 'lesson_practice') {
    return `Ćwiczenie: ${primary}`;
  }

  if (kind === 'training') {
    if (rawPrimary === 'clock') {
      const sectionLabel = CLOCK_TRAINING_SECTION_LABELS[rawSecondary] ?? resolveActivityTokenLabel(rawSecondary);
      return `Trening zegara: ${sectionLabel}`;
    }

    return `Trening: ${primary}`;
  }

  if (kind === 'lesson_completion') {
    return `Lekcja: ${primary}`;
  }

  return resolveActivityTokenLabel(activityKey);
};

export const getProgressAverageAccuracy = (progress: KangurProgressState): number =>
  getAverageAccuracyPercent(progress);

export const getProgressAverageXpPerSession = (progress: KangurProgressState): number => {
  if (progress.gamesPlayed <= 0) {
    return 0;
  }

  return clampCounter(progress.totalXp / progress.gamesPlayed);
};

const getActivityAverageXpPerSession = (entry: KangurActivityStatsEntry): number => {
  if (entry.sessionsPlayed <= 0) {
    return 0;
  }

  return clampCounter(entry.totalXpEarned / entry.sessionsPlayed);
};

export const getProgressBestAccuracy = (progress: KangurProgressState): number => {
  const activityStats = Object.values(progress.activityStats ?? {});
  if (activityStats.length === 0) {
    return getAverageAccuracyPercent(progress);
  }

  return Math.max(...activityStats.map((entry) => entry.bestScorePercent));
};

export const getMasteredLessonCount = (
  progress: KangurProgressState,
  minimumMasteryPercent = 75
): number =>
  Object.values(progress.lessonMastery).filter(
    (entry) => entry.masteryPercent >= clampPercent(minimumMasteryPercent)
  ).length;

export const getProgressTopActivities = (
  progress: KangurProgressState,
  limit = 3
): KangurProgressActivitySummary[] =>
  Object.entries(progress.activityStats ?? {})
    .map(([key, value]) => ({
      key,
      label: formatKangurProgressActivityLabel(key),
      sessionsPlayed: value.sessionsPlayed,
      perfectSessions: value.perfectSessions,
      totalXpEarned: value.totalXpEarned,
      averageXpPerSession: getActivityAverageXpPerSession(value),
      averageAccuracy:
        value.totalQuestionsAnswered > 0
          ? clampPercent((value.totalCorrectAnswers / value.totalQuestionsAnswered) * 100)
          : value.bestScorePercent,
      bestScorePercent: value.bestScorePercent,
      currentStreak: value.currentStreak,
      bestStreak: value.bestStreak,
    }))
    .sort((left, right) => {
      if (left.sessionsPlayed !== right.sessionsPlayed) {
        return right.sessionsPlayed - left.sessionsPlayed;
      }
      if (left.totalXpEarned !== right.totalXpEarned) {
        return right.totalXpEarned - left.totalXpEarned;
      }
      if (left.averageAccuracy !== right.averageAccuracy) {
        return right.averageAccuracy - left.averageAccuracy;
      }
      return right.bestScorePercent - left.bestScorePercent;
    })
    .slice(0, Math.max(1, Math.floor(limit)));

export const getBadgeProgress = (
  progress: KangurProgressState,
  badge: KangurBadge
): KangurBadgeProgress => {
  const details = badge.progress(progress);
  const target = Math.max(1, Math.round(details.target));
  const current = Math.max(0, Math.round(details.current));

  return {
    current,
    target,
    summary: details.summary,
    isUnlocked: current >= target,
    progressPercent: clampPercent((Math.min(current, target) / target) * 100),
  };
};

export const getProgressBadges = (progress: KangurProgressState): KangurBadgeStatus[] =>
  BADGES.map((badge) => ({
    ...badge,
    ...getBadgeProgress(progress, badge),
  }));

export const getVisibleProgressBadges = (
  progress: KangurProgressState,
  options: KangurVisibleBadgeOptions = {}
): KangurBadgeStatus[] => {
  const { maxLocked = 3, minimumLockedProgressPercent = 25 } = options;
  const badgeStatuses = getProgressBadges(progress);
  const visibleLockedBadgeIds = new Set(
    badgeStatuses
      .filter(
        (badge) =>
          !badge.isUnlocked &&
          badge.current > 0 &&
          badge.progressPercent >= minimumLockedProgressPercent
      )
      .sort((left, right) => {
        if (left.progressPercent !== right.progressPercent) {
          return right.progressPercent - left.progressPercent;
        }

        const leftRemaining = Math.max(0, left.target - left.current);
        const rightRemaining = Math.max(0, right.target - right.current);
        if (leftRemaining !== rightRemaining) {
          return leftRemaining - rightRemaining;
        }

        return left.target - right.target;
      })
      .slice(0, Math.max(0, Math.floor(maxLocked)))
      .map((badge) => badge.id)
  );

  return badgeStatuses.filter((badge) => badge.isUnlocked || visibleLockedBadgeIds.has(badge.id));
};

export const getProgressBadgeTrackSummaries = (
  progress: KangurProgressState,
  options: KangurBadgeTrackOptions = {}
): KangurBadgeTrackSummary[] => {
  const { maxTracks = 4, minimumTrackProgressPercent = 25 } = options;
  const badgeStatuses = getProgressBadges(progress);
  const trackSummaries = Object.entries(BADGE_TRACK_META)
    .map(([key, meta]) => {
      const badges = badgeStatuses.filter((badge) => badge.track === key);
      const unlockedCount = badges.filter((badge) => badge.isUnlocked).length;
      const nextBadge =
        badges
          .filter((badge) => !badge.isUnlocked)
          .sort((left, right) => {
            if (left.progressPercent !== right.progressPercent) {
              return right.progressPercent - left.progressPercent;
            }

            const leftRemaining = Math.max(0, left.target - left.current);
            const rightRemaining = Math.max(0, right.target - right.current);
            if (leftRemaining !== rightRemaining) {
              return leftRemaining - rightRemaining;
            }

            return left.target - right.target;
          })[0] ?? null;
      const progressPercent =
        badges.length > 0
          ? clampPercent(
            badges.reduce((sum, badge) => sum + badge.progressPercent, 0) / badges.length
          )
          : 0;

      return {
        key: key as KangurBadgeTrackKey,
        label: meta.label,
        emoji: meta.emoji,
        unlockedCount,
        totalCount: badges.length,
        progressPercent,
        nextBadge,
        badges,
      };
    })
    .filter((track) => {
      if (track.totalCount === 0) {
        return false;
      }

      if (track.unlockedCount > 0) {
        return true;
      }

      return Boolean(
        track.nextBadge &&
          track.nextBadge.current > 0 &&
          track.nextBadge.progressPercent >= minimumTrackProgressPercent
      );
    })
    .sort((left, right) => {
      const leftMeta = BADGE_TRACK_META[left.key];
      const rightMeta = BADGE_TRACK_META[right.key];

      if (left.unlockedCount !== right.unlockedCount) {
        return right.unlockedCount - left.unlockedCount;
      }
      if (left.progressPercent !== right.progressPercent) {
        return right.progressPercent - left.progressPercent;
      }
      return leftMeta.order - rightMeta.order;
    });

  return trackSummaries.slice(0, Math.max(0, Math.floor(maxTracks)));
};

export const getNextLockedBadge = (progress: KangurProgressState): KangurBadgeStatus | null =>
  getProgressBadges(progress)
    .filter((badge) => !badge.isUnlocked)
    .sort((left, right) => {
      if (left.progressPercent !== right.progressPercent) {
        return right.progressPercent - left.progressPercent;
      }

      const leftRemaining = Math.max(0, left.target - left.current);
      const rightRemaining = Math.max(0, right.target - right.current);
      if (leftRemaining !== rightRemaining) {
        return leftRemaining - rightRemaining;
      }

      return left.target - right.target;
    })[0] ?? null;

export const getRecommendedSessionMomentum = (
  progress: KangurProgressState
): KangurRecommendedSessionMomentum => {
  const completedSessions = progress.recommendedSessionsCompleted ?? 0;
  const guidedBadges = getProgressBadges(progress).filter((badge) => GUIDED_BADGE_IDS.has(badge.id));
  const nextBadge = guidedBadges.find((badge) => !badge.isUnlocked) ?? null;
  const maxTarget = guidedBadges.reduce(
    (currentMax, badge) => Math.max(currentMax, badge.target),
    0
  );

  if (nextBadge) {
    return {
      completedSessions,
      progressPercent: nextBadge.progressPercent,
      summary: nextBadge.summary,
      nextBadgeName: nextBadge.name,
    };
  }

  return {
    completedSessions,
    progressPercent: 100,
    summary:
      maxTarget > 0
        ? `${Math.min(completedSessions, maxTarget)}/${maxTarget} rundy`
        : formatSessionCountLabel(completedSessions),
    nextBadgeName: null,
  };
};

export const getRecommendedSessionProjection = (
  progress: KangurProgressState,
  additionalCompletedSessions = 1
): KangurRecommendedSessionProjection => {
  const safeAdditionalCompletedSessions = Math.max(0, Math.floor(additionalCompletedSessions));

  return {
    current: getRecommendedSessionMomentum(progress),
    projected: getRecommendedSessionMomentum({
      ...progress,
      recommendedSessionsCompleted:
        (progress.recommendedSessionsCompleted ?? 0) + safeAdditionalCompletedSessions,
    }),
  };
};

const getAccuracyBonus = (scorePercent: number): number => {
  if (scorePercent >= 100) {
    return 18;
  }
  if (scorePercent >= 90) {
    return 14;
  }
  if (scorePercent >= 75) {
    return 10;
  }
  if (scorePercent >= 60) {
    return 6;
  }
  if (scorePercent >= 40) {
    return 2;
  }
  return 0;
};

const getDifficultyBonus = (difficulty?: string | null): number => {
  if (!difficulty) {
    return 0;
  }

  return DIFFICULTY_XP_BONUS[difficulty] ?? 0;
};

const getSpeedBonus = (durationSeconds?: number | null, totalQuestions?: number): number => {
  if (!durationSeconds || !totalQuestions || totalQuestions <= 0) {
    return 0;
  }

  const secondsPerQuestion = durationSeconds / totalQuestions;
  if (secondsPerQuestion <= 4) {
    return 8;
  }
  if (secondsPerQuestion <= 7) {
    return 5;
  }
  if (secondsPerQuestion <= 10) {
    return 3;
  }
  if (secondsPerQuestion <= 14) {
    return 1;
  }
  return 0;
};

const getStreakBonus = (nextStreak: number): number => {
  if (nextStreak <= 1) {
    return 0;
  }

  return Math.min(8, (nextStreak - 1) * 2);
};

const getVarietyBonus = (
  progress: KangurProgressState,
  operation?: string | null,
  countsAsGame?: boolean,
  passedStrongThreshold?: boolean
): number => {
  if (!countsAsGame || !operation || !passedStrongThreshold) {
    return 0;
  }

  return progress.operationsPlayed.includes(operation) ? 0 : 3;
};

const getActivityRepeatPenalty = (
  progress: KangurProgressState,
  activityKey: string,
  countsAsGame?: boolean
): { nextRepeatStreak: number; penalty: number } => {
  if (!countsAsGame) {
    return { nextRepeatStreak: progress.currentActivityRepeatStreak ?? 0, penalty: 0 };
  }

  const nextRepeatStreak =
    progress.lastRewardedActivityKey === activityKey
      ? Math.max(1, (progress.currentActivityRepeatStreak ?? 0) + 1)
      : 1;

  if (nextRepeatStreak < 3) {
    return { nextRepeatStreak, penalty: 0 };
  }

  return {
    nextRepeatStreak,
    penalty: Math.min(6, (nextRepeatStreak - 2) * 2),
  };
};

const getMasteryGainBonus = (
  progress: KangurProgressState,
  lessonKey: string | undefined,
  nextLessonMastery: KangurProgressState['lessonMastery'],
  passedStrongThreshold: boolean
): number => {
  const normalizedLessonKey = lessonKey?.trim();
  if (!normalizedLessonKey || !passedStrongThreshold) {
    return 0;
  }

  const currentMastery = progress.lessonMastery[normalizedLessonKey]?.masteryPercent ?? 0;
  const nextMastery = nextLessonMastery[normalizedLessonKey]?.masteryPercent ?? currentMastery;

  for (const stage of MASTERY_STAGE_BONUSES) {
    if (currentMastery < stage.threshold && nextMastery >= stage.threshold) {
      return stage.xp;
    }
  }

  if (currentMastery > 0 && nextMastery >= currentMastery + 10) {
    return 2;
  }

  return 0;
};

const buildRewardBreakdown = (
  config: KangurRewardProfileConfig,
  {
    accuracyBonus,
    difficultyBonus,
    speedBonus,
    streakBonus,
    firstActivityBonus,
    improvementBonus,
    masteryBonus,
    varietyBonus,
    guidedFocusBonus,
    antiRepeatPenalty,
    perfectBonus,
    totalXp,
  }: {
    accuracyBonus: number;
    difficultyBonus: number;
    speedBonus: number;
    streakBonus: number;
    firstActivityBonus: number;
    improvementBonus: number;
    masteryBonus: number;
    varietyBonus: number;
    guidedFocusBonus: number;
    antiRepeatPenalty: number;
    perfectBonus: number;
    totalXp: number;
  }
): KangurRewardBreakdownEntry[] => {
  const entries: KangurRewardBreakdownEntry[] = [
    { kind: 'base', label: 'Ukończenie rundy', xp: config.baseXp },
  ];

  if (accuracyBonus > 0) {
    entries.push({ kind: 'accuracy', label: 'Skuteczność', xp: accuracyBonus });
  }
  if (difficultyBonus > 0) {
    entries.push({ kind: 'difficulty', label: 'Poziom trudności', xp: difficultyBonus });
  }
  if (speedBonus > 0) {
    entries.push({ kind: 'speed', label: 'Tempo', xp: speedBonus });
  }
  if (streakBonus > 0) {
    entries.push({ kind: 'streak', label: 'Seria', xp: streakBonus });
  }
  if (firstActivityBonus > 0) {
    entries.push({ kind: 'first_activity', label: 'Pierwsza mocna próba', xp: firstActivityBonus });
  }
  if (improvementBonus > 0) {
    entries.push({ kind: 'improvement', label: 'Poprawa wyniku', xp: improvementBonus });
  }
  if (masteryBonus > 0) {
    entries.push({ kind: 'mastery', label: 'Postęp opanowania', xp: masteryBonus });
  }
  if (varietyBonus > 0) {
    entries.push({ kind: 'variety', label: 'Nowa ścieżka', xp: varietyBonus });
  }
  if (guidedFocusBonus > 0) {
    entries.push({ kind: 'guided_focus', label: 'Polecony kierunek', xp: guidedFocusBonus });
  }
  if (perfectBonus > 0) {
    entries.push({ kind: 'perfect', label: 'Pełny wynik', xp: perfectBonus });
  }
  if (antiRepeatPenalty > 0) {
    entries.push({ kind: 'anti_repeat', label: 'Powtarzana aktywność', xp: -antiRepeatPenalty });
  }

  const breakdownTotal = entries.reduce((sum, entry) => sum + entry.xp, 0);
  if (totalXp > breakdownTotal) {
    entries.push({
      kind: 'minimum_floor',
      label: 'Minimalna nagroda',
      xp: totalXp - breakdownTotal,
    });
  }

  return entries.filter((entry) => entry.xp !== 0);
};

const buildActivityStatsUpdate = (
  progress: KangurProgressState,
  activityKey: string,
  {
    scorePercent,
    correctAnswers,
    totalQuestions,
    xpEarned,
    isPerfect,
    passedStrongThreshold,
    playedAt,
  }: {
    scorePercent: number;
    correctAnswers: number;
    totalQuestions: number;
    xpEarned: number;
    isPerfect: boolean;
    passedStrongThreshold: boolean;
    playedAt: string;
  }
): KangurProgressState['activityStats'] => {
  const current = getActivityStatsEntry(progress, activityKey);
  const nextCurrentStreak = passedStrongThreshold ? current.currentStreak + 1 : 0;

  return {
    ...(progress.activityStats ?? {}),
    [activityKey]: {
      sessionsPlayed: current.sessionsPlayed + 1,
      perfectSessions: current.perfectSessions + (isPerfect ? 1 : 0),
      totalCorrectAnswers: current.totalCorrectAnswers + correctAnswers,
      totalQuestionsAnswered: current.totalQuestionsAnswered + totalQuestions,
      totalXpEarned: current.totalXpEarned + xpEarned,
      bestScorePercent: Math.max(current.bestScorePercent, scorePercent),
      lastScorePercent: scorePercent,
      currentStreak: nextCurrentStreak,
      bestStreak: Math.max(current.bestStreak, nextCurrentStreak),
      lastPlayedAt: playedAt,
    },
  };
};

const createRewardOutcome = (
  progress: KangurProgressState,
  {
    activityKey,
    profile,
    correctAnswers = 0,
    totalQuestions = 0,
    scorePercentOverride,
    lessonKey,
    operation,
    difficulty,
    durationSeconds,
    strongThresholdPercent = 70,
    countsAsGame = false,
    countsAsLessonCompletion = false,
    followsRecommendation = false,
    perfectCounterKey,
    playedAt = new Date().toISOString(),
  }: KangurRewardInput
): KangurLessonPracticeReward => {
  const config = REWARD_PROFILE_CONFIG[profile];
  const safeTotalQuestions = Math.max(0, totalQuestions);
  const normalizedCorrectAnswers =
    safeTotalQuestions > 0
      ? Math.max(0, Math.min(correctAnswers, safeTotalQuestions))
      : Math.max(0, correctAnswers);
  const scorePercent =
    scorePercentOverride !== undefined
      ? clampPercent(scorePercentOverride)
      : clampPercent(
        safeTotalQuestions > 0 ? (normalizedCorrectAnswers / safeTotalQuestions) * 100 : 0
      );
  const isPerfect =
    safeTotalQuestions > 0
      ? normalizedCorrectAnswers === safeTotalQuestions
      : scorePercent >= 100;
  const passedStrongThreshold = scorePercent >= clampPercent(strongThresholdPercent);
  const previousActivityStats = getActivityStatsEntry(progress, activityKey);
  const nextGlobalWinStreak = config.allowsStreakBonus
    ? passedStrongThreshold
      ? (progress.currentWinStreak ?? 0) + 1
      : 0
    : (progress.currentWinStreak ?? 0);
  const nextLessonMastery = lessonKey
    ? buildLessonMasteryUpdate(progress, lessonKey, scorePercent, playedAt)
    : progress.lessonMastery;
  const accuracyBonus = getAccuracyBonus(scorePercent);
  const difficultyBonus = getDifficultyBonus(difficulty);
  const speedBonus = config.allowsSpeedBonus ? getSpeedBonus(durationSeconds, safeTotalQuestions) : 0;
  const streakBonus = config.allowsStreakBonus ? getStreakBonus(nextGlobalWinStreak) : 0;
  const firstActivityBonus =
    previousActivityStats.sessionsPlayed === 0 && scorePercent >= clampPercent(strongThresholdPercent)
      ? config.firstActivityBonus
      : 0;
  const improvementBonus =
    config.improvementBonus > 0 &&
    previousActivityStats.bestScorePercent > 0 &&
    scorePercent > previousActivityStats.bestScorePercent &&
    passedStrongThreshold
      ? config.improvementBonus
      : 0;
  const masteryBonus = getMasteryGainBonus(
    progress,
    lessonKey,
    nextLessonMastery,
    passedStrongThreshold
  );
  const varietyBonus = getVarietyBonus(progress, operation, countsAsGame, passedStrongThreshold);
  const guidedFocusBonus =
    followsRecommendation && passedStrongThreshold && countsAsGame ? GUIDED_FOCUS_BONUS : 0;
  const repeatState = getActivityRepeatPenalty(progress, activityKey, countsAsGame);

  const xp = Math.max(
    config.minimumXp,
    clampCounter(
      config.baseXp +
        accuracyBonus +
        difficultyBonus +
        speedBonus +
        streakBonus +
        firstActivityBonus +
        improvementBonus +
        masteryBonus +
        varietyBonus +
        guidedFocusBonus +
        -repeatState.penalty +
        (isPerfect ? config.perfectBonus : 0)
    )
  );
  const breakdown = buildRewardBreakdown(config, {
    accuracyBonus,
    difficultyBonus,
    speedBonus,
    streakBonus,
    firstActivityBonus,
    improvementBonus,
    masteryBonus,
    varietyBonus,
    guidedFocusBonus,
    antiRepeatPenalty: repeatState.penalty,
    perfectBonus: isPerfect ? config.perfectBonus : 0,
    totalXp: xp,
  });

  const progressUpdates: Partial<KangurProgressState> = {
    totalCorrectAnswers: (progress.totalCorrectAnswers ?? 0) + normalizedCorrectAnswers,
    totalQuestionsAnswered: (progress.totalQuestionsAnswered ?? 0) + safeTotalQuestions,
    currentWinStreak: nextGlobalWinStreak,
    bestWinStreak: config.allowsStreakBonus
      ? Math.max(progress.bestWinStreak ?? 0, nextGlobalWinStreak)
      : (progress.bestWinStreak ?? 0),
    currentActivityRepeatStreak: repeatState.nextRepeatStreak,
    lastRewardedActivityKey: activityKey,
    activityStats: buildActivityStatsUpdate(progress, activityKey, {
      scorePercent,
      correctAnswers: normalizedCorrectAnswers,
      totalQuestions: safeTotalQuestions,
      xpEarned: xp,
      isPerfect,
      passedStrongThreshold,
      playedAt,
    }),
  };

  if (lessonKey) {
    progressUpdates.lessonMastery = nextLessonMastery;
  }

  if (countsAsGame) {
    progressUpdates.gamesPlayed = progress.gamesPlayed + 1;
    progressUpdates.perfectGames = isPerfect ? progress.perfectGames + 1 : progress.perfectGames;
    progressUpdates.operationsPlayed = operation
      ? mergeUniqueStrings([...(progress.operationsPlayed ?? []), operation])
      : progress.operationsPlayed;
    if (followsRecommendation) {
      progressUpdates.recommendedSessionsCompleted =
        (progress.recommendedSessionsCompleted ?? 0) + 1;
    }
  }

  if (countsAsLessonCompletion) {
    progressUpdates.lessonsCompleted = progress.lessonsCompleted + 1;
  }

  if (perfectCounterKey) {
    progressUpdates[perfectCounterKey] = isPerfect
      ? (progress[perfectCounterKey] ?? 0) + 1
      : progress[perfectCounterKey];
  }

  return {
    xp,
    scorePercent,
    progressUpdates,
    breakdown,
  };
};

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
  const leftLatestActivityTimestamp = Math.max(
    0,
    ...Object.values(left.activityStats ?? {}).map((entry) =>
      entry.lastPlayedAt ? Date.parse(entry.lastPlayedAt) || 0 : 0
    )
  );
  const rightLatestActivityTimestamp = Math.max(
    0,
    ...Object.values(right.activityStats ?? {}).map((entry) =>
      entry.lastPlayedAt ? Date.parse(entry.lastPlayedAt) || 0 : 0
    )
  );
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
      masteryPercent: latestEntry.masteryPercent,
      bestScorePercent: Math.max(leftEntry.bestScorePercent, rightEntry.bestScorePercent),
      lastScorePercent: latestEntry.lastScorePercent,
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
      currentStreak: Math.max(leftEntry.currentStreak, rightEntry.currentStreak),
      bestStreak: Math.max(leftEntry.bestStreak, rightEntry.bestStreak),
      lastPlayedAt: latestEntry.lastPlayedAt ?? fallbackEntry.lastPlayedAt ?? null,
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
    totalCorrectAnswers: Math.max(left.totalCorrectAnswers ?? 0, right.totalCorrectAnswers ?? 0),
    totalQuestionsAnswered: Math.max(
      left.totalQuestionsAnswered ?? 0,
      right.totalQuestionsAnswered ?? 0
    ),
    dailyQuestsCompleted: Math.max(left.dailyQuestsCompleted ?? 0, right.dailyQuestsCompleted ?? 0),
    currentWinStreak: Math.max(left.currentWinStreak ?? 0, right.currentWinStreak ?? 0),
    bestWinStreak: Math.max(left.bestWinStreak ?? 0, right.bestWinStreak ?? 0),
    currentActivityRepeatStreak: latestRepeatSide.currentActivityRepeatStreak ?? 0,
    lastRewardedActivityKey: latestRepeatSide.lastRewardedActivityKey ?? null,
    recommendedSessionsCompleted: Math.max(
      left.recommendedSessionsCompleted ?? 0,
      right.recommendedSessionsCompleted ?? 0
    ),
    activityStats,
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
  return createRewardOutcome(progress, {
    activityKey: `lesson_practice:${lessonKey.trim() || 'unknown'}`,
    profile: 'lesson_practice',
    lessonKey,
    operation: resolveRewardOperation({ lessonKey }),
    correctAnswers,
    totalQuestions,
    countsAsGame: true,
    strongThresholdPercent: greatThresholdPercent,
  });
}

export function createGameSessionReward(
  progress: KangurProgressState,
  {
    operation,
    difficulty,
    correctAnswers,
    totalQuestions,
    durationSeconds,
    followsRecommendation = false,
  }: {
    operation: string;
    difficulty?: string | null;
    correctAnswers: number;
    totalQuestions: number;
    durationSeconds?: number | null;
    followsRecommendation?: boolean;
  }
): KangurLessonPracticeReward {
  return createRewardOutcome(progress, {
    activityKey: `game:${operation.trim() || 'mixed'}`,
    profile: 'game',
    operation,
    difficulty,
    correctAnswers,
    totalQuestions,
    durationSeconds,
    countsAsGame: true,
    followsRecommendation,
    strongThresholdPercent: 70,
  });
}

export function createTrainingReward(
  progress: KangurProgressState,
  {
    activityKey,
    lessonKey,
    correctAnswers,
    totalQuestions,
    difficulty,
    durationSeconds,
    strongThresholdPercent = 70,
    perfectCounterKey,
  }: {
    activityKey: string;
    lessonKey: string;
    correctAnswers: number;
    totalQuestions: number;
    difficulty?: string | null;
    durationSeconds?: number | null;
    strongThresholdPercent?: number;
    perfectCounterKey?: KangurRewardCounterKey;
  }
): KangurLessonPracticeReward {
  return createRewardOutcome(progress, {
    activityKey,
    profile: 'training',
    lessonKey,
    operation: resolveRewardOperation({ lessonKey, activityKey }),
    correctAnswers,
    totalQuestions,
    difficulty,
    durationSeconds,
    countsAsGame: true,
    strongThresholdPercent,
    perfectCounterKey,
  });
}

export function createLessonCompletionReward(
  progress: KangurProgressState,
  lessonKey: string,
  scorePercent = 100
): KangurLessonPracticeReward {
  return createRewardOutcome(progress, {
    activityKey: `lesson_completion:${lessonKey.trim() || 'unknown'}`,
    profile: 'lesson_completion',
    lessonKey,
    scorePercentOverride: scorePercent,
    countsAsLessonCompletion: true,
    strongThresholdPercent: 100,
  });
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
    if (!progress.badges.includes(badge.id) && getBadgeProgress(progress, badge).isUnlocked) {
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
