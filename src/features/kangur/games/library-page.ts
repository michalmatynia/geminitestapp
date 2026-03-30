import type {
  KangurGameCatalogEntry,
  KangurGameCatalogFacets,
  KangurGameCatalogFilter,
} from './catalog';
import {
  createKangurGameCatalogEntries,
  filterKangurGameCatalogEntries,
  getKangurGameCatalogFacets,
} from './catalog';
import {
  createKangurGamesLibraryOverview,
  type KangurGamesLibraryOverview,
} from './library-overview';
import {
  createKangurGameLibraryCoverage,
  type KangurGameLibraryCoverage,
} from './coverage';
import {
  createKangurGameEngineCatalogEntries,
  createKangurGameEngineLibraryOverview,
  getKangurGameEngineCatalogFacets,
  type KangurGameEngineCatalogEntry,
  type KangurGameEngineCatalogFacets,
  type KangurGameEngineLibraryOverview,
} from './engine-catalog';
import {
  createDefaultKangurGameEngineImplementations,
  type KangurGameEngineImplementation,
} from './engine-implementations';
import {
  createKangurGameRuntimeSerializationAudit,
  type KangurGameRuntimeSerializationAudit,
} from './serialization-audit';
import {
  createKangurGameVariantCatalogEntries,
  filterKangurGameVariantCatalogEntries,
  type KangurGameVariantCatalogEntry,
} from './variants';
import type {
  KangurGameDefinition,
  KangurGameEngineDefinition,
} from '@/shared/contracts/kangur-games';

export type KangurGameLibraryPageData = {
  catalogFacets: KangurGameCatalogFacets;
  coverage: KangurGameLibraryCoverage;
  engineFilterOptions: KangurGameEngineCatalogFacets;
  engineOverview: KangurGameEngineLibraryOverview;
  overview: KangurGamesLibraryOverview;
  serializationAudit: KangurGameRuntimeSerializationAudit;
};

export type CreateKangurGameLibraryPageDataInput = {
  filteredCatalogEntries: KangurGameCatalogEntry[];
  filteredEngineEntries: KangurGameEngineCatalogEntry[];
  filteredVariantEntries: KangurGameVariantCatalogEntry[];
  globalCatalogEntries: KangurGameCatalogEntry[];
  globalEngineEntries: KangurGameEngineCatalogEntry[];
  globalVariantEntries: KangurGameVariantCatalogEntry[];
};

export type CreateKangurGameLibraryPageDataFromCatalogInput = {
  filter?: KangurGameCatalogFilter;
  globalCatalogEntries?: KangurGameCatalogEntry[];
  implementations?: KangurGameEngineImplementation[];
};

export type CreateKangurGameLibraryPageDataFromGamesInput = {
  engines?: KangurGameEngineDefinition[];
  filter?: KangurGameCatalogFilter;
  games?: KangurGameDefinition[];
  implementations?: KangurGameEngineImplementation[];
};

export const createKangurGameLibraryPageData = (
  input: CreateKangurGameLibraryPageDataInput
): KangurGameLibraryPageData => ({
  overview: createKangurGamesLibraryOverview(
    input.filteredCatalogEntries,
    input.filteredVariantEntries
  ),
  engineOverview: createKangurGameEngineLibraryOverview(input.filteredEngineEntries),
  coverage: createKangurGameLibraryCoverage(input.globalCatalogEntries),
  catalogFacets: getKangurGameCatalogFacets(input.globalCatalogEntries),
  engineFilterOptions: getKangurGameEngineCatalogFacets(input.globalEngineEntries),
  serializationAudit: createKangurGameRuntimeSerializationAudit(
    input.globalVariantEntries,
    input.globalEngineEntries
  ),
});

export const createKangurGameLibraryPageDataFromCatalog = (
  input?: CreateKangurGameLibraryPageDataFromCatalogInput
): KangurGameLibraryPageData => {
  const globalCatalogEntries = input?.globalCatalogEntries ?? createKangurGameCatalogEntries();
  const filteredCatalogEntries = filterKangurGameCatalogEntries(globalCatalogEntries, input?.filter);
  const filteredVariantEntries = filterKangurGameVariantCatalogEntries(
    createKangurGameVariantCatalogEntries(filteredCatalogEntries),
    input?.filter
  );
  const globalVariantEntries = createKangurGameVariantCatalogEntries(globalCatalogEntries);
  const implementations =
    input?.implementations ?? createDefaultKangurGameEngineImplementations();
  const filteredEngineEntries = createKangurGameEngineCatalogEntries({
    catalogEntries: filteredCatalogEntries,
    variantEntries: filteredVariantEntries,
    implementations,
  });
  const globalEngineEntries = createKangurGameEngineCatalogEntries({
    catalogEntries: globalCatalogEntries,
    variantEntries: globalVariantEntries,
    implementations,
  });

  return createKangurGameLibraryPageData({
    filteredCatalogEntries,
    filteredEngineEntries,
    filteredVariantEntries,
    globalCatalogEntries,
    globalEngineEntries,
    globalVariantEntries,
  });
};

export const createKangurGameLibraryPageDataFromGames = (
  input?: CreateKangurGameLibraryPageDataFromGamesInput
): KangurGameLibraryPageData =>
  createKangurGameLibraryPageDataFromCatalog({
    filter: input?.filter,
    globalCatalogEntries: createKangurGameCatalogEntries({
      games: input?.games,
      engines: input?.engines,
    }),
    implementations: input?.implementations,
  });
