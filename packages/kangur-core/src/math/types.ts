import type { KangurQuestionChoice } from '@kangur/contracts/kangur';

export type KangurDifficulty = 'easy' | 'medium' | 'hard';

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
