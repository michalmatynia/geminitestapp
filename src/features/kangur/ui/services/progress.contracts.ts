import type {
  KangurRewardBreakdownEntry,
  KangurProgressState,
  KangurXpRewards,
} from '@/features/kangur/ui/types';
import type { KangurProgressLevel } from '@/features/kangur/shared/contracts/kangur-profile';

export type { KangurProgressLevel } from '@/features/kangur/shared/contracts/kangur-profile';

export type KangurBadgeTrackKey =
  | 'onboarding'
  | 'consistency'
  | 'mastery'
  | 'variety'
  | 'challenge'
  | 'xp'
  | 'quest'
  | 'english';

export type KangurBadge = {
  id: string;
  emoji: string;
  name: string;
  desc: string;
  track: KangurBadgeTrackKey;
  progress: (progress: KangurProgressState) => {
    current: number;
    target: number;
    summary: string;
  };
};

export type KangurLessonPracticeReward = {
  xp: number;
  scorePercent: number;
  progressUpdates: Partial<KangurProgressState>;
  breakdown: KangurRewardBreakdownEntry[];
};

export type KangurRewardProfile =
  | 'game'
  | 'lesson_practice'
  | 'training'
  | 'lesson_completion';

export type KangurRewardCounterKey = 'clockPerfect' | 'calendarPerfect' | 'geometryPerfect';

export type KangurRewardInput = {
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

export type KangurRewardProfileConfig = {
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

export type KangurVisibleBadgeOptions = {
  maxLocked?: number;
  minimumLockedProgressPercent?: number;
};

export type KangurBadgeTrackOptions = {
  maxTracks?: number;
  minimumTrackProgressPercent?: number;
};

export const KANGUR_PROGRESS_STORAGE_KEY = 'sprycio_progress';
export const KANGUR_PROGRESS_OWNER_STORAGE_KEY = 'sprycio_progress_owner';
export const KANGUR_PROGRESS_EVENT_NAME = 'kangur-progress-changed';

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

export const FALLBACK_LEVEL: KangurProgressLevel = LEVELS[0]!;

export const REWARD_PROFILE_CONFIG: Record<KangurRewardProfile, KangurRewardProfileConfig> = {
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

export const ACTIVITY_LABELS: Record<string, string> = {
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
  logical_patterns: 'Wzorce',
  logical_classification: 'Klasyfikacja',
  logical_reasoning: 'Wnioskowanie',
  logical_analogies: 'Analogie',
  logical: 'Logika',
};

export const LESSON_KEY_TO_OPERATION: Record<string, string> = {
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
  logical_thinking: 'logical',
  logical_patterns: 'logical',
  logical_classification: 'logical',
  logical_reasoning: 'logical',
  logical_analogies: 'logical',
};

export const CLOCK_TRAINING_SECTION_LABELS: Record<string, string> = {
  hours: 'Godziny',
  minutes: 'Minuty',
  combined: 'Pełny czas',
  mixed: 'Mieszany trening',
};

export const BADGE_TRACK_META: Record<
  KangurBadgeTrackKey,
  { label: string; emoji: string; order: number }
> = {
  onboarding: { label: 'Start', emoji: '🚀', order: 1 },
  consistency: { label: 'Seria', emoji: '🔥', order: 2 },
  mastery: { label: 'Mistrzostwo', emoji: '🏗️', order: 3 },
  variety: { label: 'Różnorodność', emoji: '🎲', order: 4 },
  challenge: { label: 'Wyzwania', emoji: '🎯', order: 5 },
  xp: { label: 'XP', emoji: '⭐', order: 6 },
  quest: { label: 'Misje', emoji: '🧭', order: 7 },
  english: { label: 'Angielski', emoji: '🇬🇧', order: 8 },
};

export const getBadgeTrackMeta = (
  key: KangurBadgeTrackKey
): { label: string; emoji: string; order: number } => BADGE_TRACK_META[key];

export const GUIDED_BADGE_IDS = new Set(['guided_step', 'guided_keeper']);
