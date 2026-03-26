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
    expect(pageData.coverage.groups[0]?.entries.length).toBe(globalCatalogEntries.length);
    expect(pageData.catalogFacets.gameCount).toBe(globalCatalogEntries.length);
    expect(pageData.engineFilterOptions.engineCount).toBeGreaterThan(0);
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
    expect(pageData.engineOverview.engineGroups.length).toBeGreaterThan(0);
  });
});
