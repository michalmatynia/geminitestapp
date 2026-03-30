import { describe, expect, it } from 'vitest';

import {
  createKangurGameCatalogEntries,
  createKangurGameVariantCatalogEntries,
  createKangurGamesLibraryCohortGroups,
  createKangurGamesLibraryMetrics,
  createKangurGamesLibraryOverview,
  createKangurGamesLibrarySubjectGroups,
  createKangurGamesLibraryVariantGroups,
} from '@/features/kangur/games';

describe('kangur games library overview', () => {
  it('builds canonical subject, cohort, and variant groups from the shared catalog', () => {
    const catalogEntries = createKangurGameCatalogEntries();
    const variantEntries = createKangurGameVariantCatalogEntries(catalogEntries);
    const subjectGroups = createKangurGamesLibrarySubjectGroups(catalogEntries);
    const cohortGroups = createKangurGamesLibraryCohortGroups(catalogEntries, variantEntries);
    const variantGroups = createKangurGamesLibraryVariantGroups(variantEntries);

    expect(subjectGroups.map((group) => group.subject.id)).toEqual([
      'alphabet',
      'art',
      'geometry',
      'music',
      'maths',
      'english',
      'agentic_coding',
    ]);
    expect(cohortGroups.map((group) => group.ageGroup)).toEqual([
      'six_year_old',
      'ten_year_old',
      'grown_ups',
    ]);
    expect(cohortGroups[0]?.subjects).toEqual(['alphabet', 'art', 'geometry', 'music']);
    expect(cohortGroups[1]?.subjects).toEqual(['maths', 'english']);
    expect(cohortGroups[2]?.subjects).toEqual(['agentic_coding']);
    expect(variantGroups.map((group) => group.surface)).toEqual([
      'lesson',
      'library_preview',
      'game_screen',
    ]);
  });

  it('builds aggregate metrics and overview snapshots from the shared catalog', () => {
    const catalogEntries = createKangurGameCatalogEntries();
    const variantEntries = createKangurGameVariantCatalogEntries(catalogEntries);
    const metrics = createKangurGamesLibraryMetrics(catalogEntries, variantEntries);
    const overview = createKangurGamesLibraryOverview(catalogEntries, variantEntries);

    expect(metrics.visibleGameCount).toBe(catalogEntries.length);
    expect(metrics.variantCount).toBe(variantEntries.length);
    expect(metrics.lessonLinkedCount).toBeGreaterThan(0);
    expect(metrics.engineCount).toBeGreaterThan(0);
    expect(overview.metrics).toEqual(metrics);
    expect(overview.subjectGroups).toHaveLength(7);
    expect(overview.cohortGroups).toHaveLength(3);
    expect(overview.variantGroups).toHaveLength(3);
  });
});
