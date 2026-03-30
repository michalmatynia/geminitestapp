// ---------------------------------------------------------------------------
// Selective re-exports — avoids pulling the entire module tree when consumers
// only need a few symbols. Internal test files still use `from './catalog'`
// style imports for full access.
// ---------------------------------------------------------------------------

// catalog.ts — core catalog types, constants, and lookup functions
export type { KangurGameCatalogEntry, KangurGameCatalogFilter, KangurLaunchableGameContentId, KangurLaunchableGameScreen } from './catalog';
export {
  KANGUR_GAME_CATALOG,
  KANGUR_GAME_CATALOG_LIST,
  KANGUR_GAME_CATALOG_BY_LESSON_ACTIVITY_ID,
  KANGUR_GAME_CATALOG_IDS_BY_ENGINE_ID,
  KANGUR_GAME_CATALOG_IDS_BY_LESSON_COMPONENT_ID,
  KANGUR_LAUNCHABLE_GAME_CONTENT_IDS,
  KANGUR_LAUNCHABLE_GAME_SCREENS,
  createKangurGameCatalogEntries,
  filterKangurGameCatalogEntries,
  getKangurGameCatalogEntry,
  getKangurGameCatalogEntryForLessonActivity,
  getKangurGameCatalogEntriesForEngine,
  getKangurGameCatalogEntriesForLessonComponent,
  getKangurGameCatalogFacets,
  getKangurLessonActivityRuntimeSpecForGame,
  getKangurLaunchableGameContentId,
  getKangurLaunchableGameRuntimeSpecForGame,
  getKangurLaunchableGameScreen,
  getKangurLaunchableGameVariant,
  isKangurLaunchableGameContentId,
  isKangurLaunchableGameScreen,
} from './catalog';

// coverage.ts
export type { KangurGameLibraryLessonCoverageStatus } from './coverage';
export {
  getKangurGameLibraryLessonCoverageStatusFromMap,
} from './coverage';

// defaults.ts
export { createDefaultKangurGames } from './defaults';

// engines.ts
export * from './engines';

// engine-implementations.ts
export * from './engine-implementations';

// engine-catalog.ts
export * from './engine-catalog';

// serialization-audit.ts
export * from './serialization-audit';

// library-overview.ts
export * from './library-overview';

// library-page.ts
export type { KangurGameLibraryPageData } from './library-page';
export { createKangurGameLibraryPageDataFromCatalog, createKangurGameLibraryPageDataFromGames } from './library-page';

// music-piano-roll-contract.ts
export * from './music-piano-roll-contract';

// content-sets.ts
export * from './content-sets';

// instances.ts
export * from './instances';

// launchable-runtime-resolution.ts
export * from './launchable-runtime-resolution';

// Runtime specs
export * from './launchable-runtime-specs';
export * from './lesson-activity-runtime-specs';

// registry.ts
export * from './registry';

// variants.ts
export * from './variants';
