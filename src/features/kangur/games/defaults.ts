import type { KangurGameDefinition } from '@/shared/contracts/kangur-games';

import { cloneKangurGameDefinition } from './defaults/factories';
import { KANGUR_GROWN_UP_GAMES } from './defaults/grown-ups';
import { KANGUR_SIX_YEAR_OLD_GAMES } from './defaults/six-year-old';
import { KANGUR_TEN_YEAR_OLD_GAMES } from './defaults/ten-year-old';

export const KANGUR_DEFAULT_GAMES: readonly KangurGameDefinition[] = [
  ...KANGUR_SIX_YEAR_OLD_GAMES,
  ...KANGUR_TEN_YEAR_OLD_GAMES,
  ...KANGUR_GROWN_UP_GAMES,
];

export const createDefaultKangurGames = (): KangurGameDefinition[] =>
  KANGUR_DEFAULT_GAMES.map(cloneKangurGameDefinition);
