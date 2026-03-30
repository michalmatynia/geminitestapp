import { describe, expect, it } from 'vitest';

import {
  createKangurDrawingEngineCatalogEntries,
  createDefaultKangurGameEngineImplementations,
  createKangurGameCatalogEntries,
  createKangurGameEngineCatalogEntries,
  createKangurGameEngineCatalogImplementationGroups,
  createKangurGameEngineLibraryOverview,
  createKangurGameVariantCatalogEntries,
  getKangurGameEngineCatalogFacets,
  getKangurDrawingEngineCatalogEntries,
  groupKangurGameEngineCatalogEntriesByImplementationOwnership,
} from '@/features/kangur/games';

describe('kangur game engine catalog', () => {
  it('builds engine-centric entries from the shared game catalog', () => {
    const catalogEntries = createKangurGameCatalogEntries();
    const variantEntries = createKangurGameVariantCatalogEntries(catalogEntries);
    const engineEntries = createKangurGameEngineCatalogEntries({
      catalogEntries,
      variantEntries,
      implementations: createDefaultKangurGameEngineImplementations(),
    });
    const classificationEngine = engineEntries.find(
      (entry) => entry.engineId === 'classification-engine'
    );

    expect(classificationEngine).toEqual(
      expect.objectContaining({
        engineId: 'classification-engine',
        category: 'foundational',
        subjects: expect.arrayContaining(['maths', 'english', 'agentic_coding']),
      })
    );
    expect(classificationEngine?.launchableCount).toBeGreaterThan(0);
    expect(classificationEngine?.entries.length).toBeGreaterThan(5);
    expect(engineEntries.find((entry) => entry.engineId === 'shape-drawing-engine')?.entries).toHaveLength(
      2
    );
    expect(
      engineEntries.find((entry) => entry.engineId === 'shape-drawing-engine')?.variants.length
    ).toBeGreaterThan(0);
  });

  it('isolates drawing engines and groups them by implementation ownership', () => {
    const engineEntries = createKangurGameEngineCatalogEntries();
    const drawingEntries = getKangurDrawingEngineCatalogEntries(engineEntries);
    const drawingCatalogEntries = createKangurDrawingEngineCatalogEntries(engineEntries);
    const ownershipGroups = groupKangurGameEngineCatalogEntriesByImplementationOwnership(engineEntries);
    const implementationGroups = createKangurGameEngineCatalogImplementationGroups(engineEntries);
    const facets = getKangurGameEngineCatalogFacets(engineEntries);
    const overview = createKangurGameEngineLibraryOverview(engineEntries);

    expect(drawingEntries.map((entry) => entry.engineId)).toEqual([
      'shape-drawing-engine',
      'symmetry-drawing-engine',
      'perimeter-drawing-engine',
      'symbol-tracing-engine',
      'diagram-sketch-engine',
    ]);
    expect(drawingCatalogEntries.find((entry) => entry.engineId === 'shape-drawing-engine')).toEqual(
      expect.objectContaining({
        engineId: 'shape-drawing-engine',
        ageGroups: ['six_year_old', 'ten_year_old'],
        subjects: ['geometry', 'maths'],
        variantCount: expect.any(Number),
      })
    );
    expect(
      drawingCatalogEntries.find((entry) => entry.engineId === 'symbol-tracing-engine')
        ?.lessonComponentIds
    ).toEqual(['alphabet_basics', 'alphabet_copy']);
    expect(ownershipGroups.map((group) => group.ownership)).toEqual(['shared_runtime']);
    expect(ownershipGroups[0]?.engineEntries.map((entry) => entry.engineId)).toContain(
      'color-harmony-engine'
    );
    expect(implementationGroups.map((group) => group.ownership)).toEqual(['shared_runtime']);
    expect(
      implementationGroups.find((group) => group.ownership === 'shared_runtime')?.runtimeIds
    ).toEqual(
      expect.arrayContaining([
        'ColorHarmonyGame',
        'EnglishAdverbsActionStudioGame',
        'geometry_drawing_game',
        'GeometrySymmetryGame',
        'GeometryPerimeterDrawingGame',
      ])
    );
    expect(facets.engineCount).toBe(engineEntries.length);
    expect(facets.drawingEngineCount).toBe(drawingEntries.length);
    expect(facets.launchableEngineCount).toBeGreaterThan(0);
    expect(facets.lessonLinkedEngineCount).toBeGreaterThan(0);
    expect(facets.engineCategories).toEqual([
      'foundational',
      'early_learning',
      'adult_learning',
    ]);
    expect(facets.implementationOwnerships).toEqual(['shared_runtime']);
    expect(overview.engineGroups).toEqual(engineEntries);
    expect(overview.drawingGroups).toEqual(drawingCatalogEntries);
    expect(overview.implementationGroups).toEqual(implementationGroups);
    expect(overview.facets).toEqual(facets);
  });
});
