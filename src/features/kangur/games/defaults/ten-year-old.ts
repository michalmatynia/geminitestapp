import type { KangurGameDefinition } from '@/shared/contracts/kangur-games';
import { TEN_YEAR_OLD_MATH_GAMES } from './ten-year-old/math-games';
import { TEN_YEAR_OLD_ENGLISH_GAMES } from './ten-year-old/english-games';

export const KANGUR_TEN_YEAR_OLD_GAMES: readonly KangurGameDefinition[] = [
  ...TEN_YEAR_OLD_MATH_GAMES,
  ...TEN_YEAR_OLD_ENGLISH_GAMES,
];
