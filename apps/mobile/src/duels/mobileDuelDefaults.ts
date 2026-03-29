import type {
  KangurDuelDifficulty,
  KangurDuelOperation,
} from '@kangur/contracts';

export const MOBILE_DUEL_DEFAULT_OPERATION: KangurDuelOperation = 'addition';
export const MOBILE_DUEL_DEFAULT_DIFFICULTY: KangurDuelDifficulty = 'easy';
export const MOBILE_DUEL_DEFAULT_SERIES_BEST_OF = 1 as const;
export const MOBILE_DUEL_DEFAULT_QUESTION_COUNT = 5;
export const MOBILE_DUEL_DEFAULT_TIME_PER_QUESTION_SEC = 15;
