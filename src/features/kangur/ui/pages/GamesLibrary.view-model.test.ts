import { describe, expect, it } from 'vitest';

import {
  createGamesLibraryCohortGroups,
  createGamesLibraryCoverageGroups,
  createGamesLibraryDrawingGroupsFromEngineGroups,
  createGamesLibraryEngineGroups,
  createGamesLibraryImplementationGroupsFromEngineGroups,
  createGamesLibraryMetrics,
  createGamesLibraryVariantGroups,
} from './GamesLibrary.view-model';
import {
  createDefaultKangurGameEngineImplementations,
  createKangurGameCatalogEntries,
  createKangurGameVariantCatalogEntries,
} from '@/features/kangur/games';

describe('games library view model', () => {
  it('builds cohort groups in canonical age-group order', () => {
    const catalogEntries = createKangurGameCatalogEntries();
    const variantEntries = createKangurGameVariantCatalogEntries(catalogEntries);
    const groups = createGamesLibraryCohortGroups(catalogEntries, variantEntries);

    expect(groups.map((group) => group.ageGroup)).toEqual([
      'six_year_old',
      'ten_year_old',
      'grown_ups',
    ]);
    expect(groups[0]?.subjects).toEqual(['alphabet', 'art', 'geometry', 'music']);
    expect(groups[1]?.subjects).toEqual(['maths', 'english']);
    expect(groups[2]?.subjects).toEqual(['agentic_coding']);
    expect(groups[2]?.entries.map((entry) => entry.game.id)).toEqual(
      expect.arrayContaining(['agentic_brief_builder', 'agentic_reasoning_router'])
    );
  });

  it('builds metrics and engine groups from the shared catalog', () => {
    const catalogEntries = createKangurGameCatalogEntries();
    const variantEntries = createKangurGameVariantCatalogEntries(catalogEntries);
    const engineImplementations = createDefaultKangurGameEngineImplementations();
    const metrics = createGamesLibraryMetrics(catalogEntries, variantEntries);
    const engineGroups = createGamesLibraryEngineGroups(catalogEntries, engineImplementations);
    const implementationGroups = createGamesLibraryImplementationGroupsFromEngineGroups(
      engineGroups
    );
    const drawingGroups = createGamesLibraryDrawingGroupsFromEngineGroups(engineGroups);
    const variantGroups = createGamesLibraryVariantGroups(variantEntries);
    const coverageGroups = createGamesLibraryCoverageGroups(catalogEntries);

    expect(metrics.visibleGameCount).toBe(catalogEntries.length);
    expect(metrics.variantCount).toBe(variantEntries.length);
    expect(engineGroups.find((group) => group.engineId === 'classification-engine')?.subjects).toEqual(
      expect.arrayContaining(['maths', 'english', 'agentic_coding'])
    );
    expect(engineGroups.find((group) => group.engineId === 'shape-drawing-engine')?.category).toBe(
      'foundational'
    );
    expect(
      engineGroups.find((group) => group.engineId === 'classification-engine')?.implementation
        ?.ownership
    ).toBe('shared_runtime');
    expect(
      engineGroups.find((group) => group.engineId === 'pattern-sequence-engine')?.implementation
        ?.ownership
    ).toBe('mixed_runtime');
    expect(
      engineGroups.find((group) => group.engineId === 'shape-recognition-engine')?.implementation
        ?.runtimeIds
    ).toEqual(['ArtShapesRotationGapGame', 'ShapeRecognitionGame']);
    expect(
      engineGroups.find((group) => group.engineId === 'symbol-tracing-engine')?.category
    ).toBe('early_learning');
    expect(
      engineGroups.find((group) => group.engineId === 'diagram-sketch-engine')?.category
    ).toBe('adult_learning');
    expect(implementationGroups.map((group) => group.ownership)).toEqual([
      'shared_runtime',
      'mixed_runtime',
      'lesson_embedded',
    ]);
    expect(implementationGroups[0]?.engineGroups.map((group) => group.engineId)).toEqual(
      expect.arrayContaining([
        'clock-dial-engine',
        'classification-engine',
        'diagram-sketch-engine',
        'symbol-tracing-engine',
      ])
    );
    expect(implementationGroups[1]?.engineGroups.map((group) => group.engineId)).toEqual([
      'pattern-sequence-engine',
      'shape-recognition-engine',
    ]);
    expect(implementationGroups[2]?.engineGroups.map((group) => group.engineId)).toEqual([
      'color-harmony-engine',
      'letter-match-engine',
    ]);
    expect(drawingGroups.map((group) => group.engineId)).toEqual([
      'shape-drawing-engine',
      'symmetry-drawing-engine',
      'perimeter-drawing-engine',
      'symbol-tracing-engine',
      'diagram-sketch-engine',
    ]);
    expect(
      drawingGroups.find((group) => group.engineId === 'shape-drawing-engine')?.implementation
        ?.ownership
    ).toBe('shared_runtime');
    expect(drawingGroups.find((group) => group.engineId === 'shape-drawing-engine')?.entries).toHaveLength(
      2
    );
    expect(
      drawingGroups.find((group) => group.engineId === 'diagram-sketch-engine')?.ageGroups
    ).toEqual(['grown_ups']);
    expect(
      drawingGroups.find((group) => group.engineId === 'symbol-tracing-engine')?.lessonComponentIds
    ).toEqual(['alphabet_basics', 'alphabet_copy']);
    expect(
      drawingGroups.find((group) => group.engineId === 'symbol-tracing-engine')?.implementation
        ?.runtimeIds
    ).toEqual([
      'AlphabetBasicsLesson',
      'AlphabetCopyLesson',
      'useKangurDrawingEngine',
    ]);
    expect(variantGroups.map((group) => group.surface)).toEqual([
      'lesson_inline',
      'lesson_stage',
      'library_preview',
      'game_screen',
    ]);
    expect(coverageGroups.map((group) => group.id)).toEqual([
      'library_backed',
      'launchable',
      'selector_fallback',
    ]);
    expect(coverageGroups[0]?.uncoveredComponentIds).toEqual([]);
    expect(coverageGroups[1]?.uncoveredComponentIds).toEqual([]);
    expect(coverageGroups[2]?.coveredComponentIds).toEqual([
      'art_colors_harmony',
      'art_shapes_basic',
      'music_diatonic_scale',
    ]);
    expect(coverageGroups[2]?.uncoveredComponentIds).toEqual([]);
  });
});
