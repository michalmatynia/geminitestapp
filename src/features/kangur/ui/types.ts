import type {
  KangurLessonMasteryEntry as SharedKangurLessonMasteryEntry,
  KangurProgressState as SharedKangurProgressState,
} from '@/shared/contracts/kangur';

export type KangurGameScreen =
  | 'home'
  | 'training'
  | 'kangur_setup'
  | 'kangur'
  | 'calendar_quiz'
  | 'geometry_quiz'
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

export type KangurQuestionChoice = number | string;

export type KangurQuestion = {
  question: string;
  answer: KangurQuestionChoice;
  choices: KangurQuestionChoice[];
  category?: KangurOperation;
};

export type KangurExamQuestion = {
  id: string;
  question: string;
  choices: KangurQuestionChoice[];
  answer: KangurQuestionChoice;
  explanation?: string;
  image?: string | null;
  choiceDescriptions?: string[];
};

export type KangurDifficultyConfigEntry = {
  label: string;
  emoji: string;
  range: number;
  timeLimit: number;
};

export type KangurDifficultyConfig = Record<KangurDifficulty, KangurDifficultyConfigEntry>;

export type KangurLessonMasteryEntry = SharedKangurLessonMasteryEntry;
export type KangurProgressState = SharedKangurProgressState;

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

export type KangurXpToastState = {
  visible: boolean;
  xpGained: number;
  newBadges: string[];
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

export type KangurMode = string;
