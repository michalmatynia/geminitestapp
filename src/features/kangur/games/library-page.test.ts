import { describe, expect, it } from 'vitest';

import {
  createDefaultKangurGames,
  createKangurGameCatalogEntries,
  createKangurGameLibraryPageDataFromCatalog,
  createKangurGameLibraryPageDataFromGames,
} from '@/features/kangur/games';

describe('kangur game library page data', () => {
  it('combines filtered overview data with global coverage and filter options', () => {
    const globalCatalogEntries = createKangurGameCatalogEntries();
    const pageData = createKangurGameLibraryPageDataFromCatalog({
      filter: {
        subject: 'maths',
      },
      globalCatalogEntries,
    });

    expect(pageData.overview.metrics.visibleGameCount).toBeGreaterThan(0);
    expect(pageData.overview.subjectGroups.map((group) => group.subject.id)).toEqual(['maths']);
    expect(
      pageData.engineOverview.engineGroups.every((group) =>
        group.subjects.every((subject) => subject === 'maths')
      )
    ).toBe(true);
    expect(pageData.coverage.groups.map((group) => group.id)).toEqual([
      'library_backed',
      'launchable',
    ]);
    expect(pageData.coverage.statusMap.division).toBe('launchable');
    expect(pageData.coverage.statusMap.art_shapes_basic).toBe('launchable');
    expect(pageData.catalogFacets.gameCount).toBe(globalCatalogEntries.length);
    expect(pageData.catalogFacets.games).toHaveLength(globalCatalogEntries.length);
    expect(pageData.catalogFacets.games.some((game) => game.id === 'division_groups')).toBe(true);
    expect(
      pageData.catalogFacets.games.some((game) => game.id === 'english_sentence_builder')
    ).toBe(true);
    expect(
      pageData.overview.subjectGroups.flatMap((group) =>
        group.entries.map((entry) => entry.game.id)
      )
    ).not.toContain('english_sentence_builder');
    expect(pageData.engineFilterOptions.engineCount).toBeGreaterThan(0);
    expect(
      pageData.engineFilterOptions.engines.some((engine) => engine.id === 'sentence-builder-engine')
    ).toBe(true);
    expect(pageData.engineOverview.engineGroups.some((group) => group.engineId === 'sentence-builder-engine')).toBe(
      false
    );
    expect(pageData.serializationAudit.runtimeBearingVariantCount).toBeGreaterThan(0);
    expect(pageData.serializationAudit.legacyLaunchFallbackGameCount).toBe(0);
    expect(pageData.serializationAudit.issues).toEqual([]);
    expect(pageData.serializationAudit.allEnginesSharedRuntime).toBe(true);
  });

  it('builds the same filtered page shape from raw games', () => {
    const games = createDefaultKangurGames();
    const pageData = createKangurGameLibraryPageDataFromGames({
      filter: {
        subject: 'maths',
      },
      games,
    });

    expect(pageData.overview.subjectGroups.map((group) => group.subject.id)).toEqual(['maths']);
    expect(pageData.catalogFacets.gameCount).toBe(games.length);
    expect(pageData.catalogFacets.games).toHaveLength(games.length);
    expect(pageData.engineOverview.engineGroups.length).toBeGreaterThan(0);
    expect(pageData.serializationAudit.compatibilityFallbackVariantCount).toBe(0);
    expect(pageData.serializationAudit.legacyLaunchFallbackGameCount).toBe(0);
    expect(pageData.serializationAudit.issues).toEqual([]);
  });
});
