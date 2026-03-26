import type {
  KangurGameCatalogListInput,
} from '@/features/kangur/services/kangur-game-catalog-repository/types';
import type { KangurGamesLibraryOverview } from '@/features/kangur/games';

export type KangurGameLibraryOverviewListInput = KangurGameCatalogListInput;

export type KangurGameLibraryOverviewRepository = {
  getOverview: (
    input?: KangurGameLibraryOverviewListInput
  ) => Promise<KangurGamesLibraryOverview>;
};
