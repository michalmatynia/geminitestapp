import type { KangurQuestionChoice, KangurProgressState } from '@/shared/contracts/kangur';
export type { KangurExamQuestion, KangurQuestionChoice } from '@/shared/contracts/kangur';
export type { KangurLessonMasteryEntry, KangurProgressState } from '@/shared/contracts/kangur';

export type KangurGameScreen =
  | 'home'
  | 'training'
  | 'kangur_setup'
  | 'kangur'
  | 'calendar_quiz'
  | 'geometry_quiz'
  | 'subtraction_quiz'
  | 'multiplication_quiz'
  | 'division_quiz'
  | 'operation'
  | 'playing'
  | 'result';

export type KangurDifficulty = 'easy' | 'medium' | 'hard';

export type KangurDifficultyOption = {
  displayLabel: string;
  id: KangurDifficulty;
  label: string;
  metaLabel: string;
  selected: boolean;
  select: () => void;
};

export type KangurOperation =
  | 'addition'
  | 'subtraction'
  | 'multiplication'
  | 'division'
  | 'decimals'
  | 'powers'
  | 'roots'
  | 'clock'
  | 'mixed';

export type KangurQuestion = {
  question: string;
  answer: KangurQuestionChoice;
  choices: KangurQuestionChoice[];
  category?: KangurOperation;
};

export type KangurDifficultyConfigEntry = {
  label: string;
  emoji: string;
  range: number;
  timeLimit: number;
};

export type KangurDifficultyConfig = Record<KangurDifficulty, KangurDifficultyConfigEntry>;

export type KangurXpRewards = {
  correct_answer: number;
  perfect_game: number;
  great_game: number;
  good_game: number;
  lesson_completed: number;
  clock_training_perfect: number;
  clock_training_good: number;
  geometry_training_perfect: number;
  geometry_training_good: number;
};

export type KangurRewardBreakdownEntry = {
  kind: string;
  label: string;
  xp: number;
};

export type KangurXpToastBadgeHint = {
  emoji: string;
  name: string;
  summary: string;
};

export type KangurSessionRecommendationHint = {
  description?: string;
  label: string;
  source: 'kangur_setup' | 'operation_selector' | 'training_setup';
  title: string;
};

export type KangurXpToastQuestHint = {
  title: string;
  summary: string;
  xpAwarded: number;
};

export type KangurXpToastRecommendationHint = {
  label: string;
  summary: string;
  title: string;
};

export type KangurXpToastState = {
  visible: boolean;
  xpGained: number;
  newBadges: string[];
  breakdown?: KangurRewardBreakdownEntry[];
  nextBadge?: KangurXpToastBadgeHint | null;
  dailyQuest?: KangurXpToastQuestHint | null;
  recommendation?: KangurXpToastRecommendationHint | null;
};

export type KangurAddXpResult = {
  updated: KangurProgressState;
  newBadges: string[];
  xpGained: number;
};

export type KangurTrainingSelection = {
  categories: KangurOperation[];
  count: number;
  difficulty: KangurDifficulty;
};

export type KangurSessionStartOptions = {
  recommendation?: KangurSessionRecommendationHint | null;
};

export type KangurMode = string;
