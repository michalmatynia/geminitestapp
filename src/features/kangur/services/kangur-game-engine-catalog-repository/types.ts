import type {
  KangurGameCatalogListInput,
} from '@/features/kangur/services/kangur-game-catalog-repository/types';
import type {
  KangurGameEngineCatalogEntry,
  KangurGameEngineCatalogFacets,
} from '@/features/kangur/games';

export type KangurGameEngineCatalogListInput = KangurGameCatalogListInput;

export type KangurGameEngineCatalogRepository = {
  listCatalog: (
    input?: KangurGameEngineCatalogListInput
  ) => Promise<KangurGameEngineCatalogEntry[]>;
  listCatalogFacets: (
    input?: KangurGameEngineCatalogListInput
  ) => Promise<KangurGameEngineCatalogFacets>;
};
