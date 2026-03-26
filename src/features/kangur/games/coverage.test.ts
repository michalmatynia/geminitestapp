import { describe, expect, it } from 'vitest';

import {
  KANGUR_GAME_LIBRARY_LESSON_COMPONENT_IDS,
  KANGUR_GROWN_UP_GAME_LIBRARY_LESSON_COMPONENT_IDS,
  KANGUR_LAUNCHABLE_GAME_LIBRARY_LESSON_COMPONENT_IDS,
  KANGUR_OPERATION_SELECTOR_FALLBACK_LESSON_COMPONENT_IDS,
  KANGUR_SIX_YEAR_OLD_GAME_LIBRARY_LESSON_COMPONENT_IDS,
  KANGUR_TEN_YEAR_OLD_GAME_LIBRARY_LESSON_COMPONENT_IDS,
  createKangurGameLibraryCoverageGroups,
  hasKangurGameLibraryCoverageForLessonComponent,
  hasKangurLaunchableGameCoverageForLessonComponent,
  isKangurGameLibraryLessonComponent,
  resolveKangurGameLibraryLessonCoverageStatus,
  shouldRouteKangurLessonComponentToOperationSelector,
} from './coverage';
import { createKangurGameCatalogEntries } from './catalog';

describe('kangur game coverage', () => {
  it('keeps game-library lesson component ids unique across cohorts', () => {
    expect(new Set(KANGUR_GAME_LIBRARY_LESSON_COMPONENT_IDS).size).toBe(
      KANGUR_GAME_LIBRARY_LESSON_COMPONENT_IDS.length
    );
  });

  it('keeps the six-year-old and grown-up lesson cohorts inside the shared games library', () => {
    expect(KANGUR_SIX_YEAR_OLD_GAME_LIBRARY_LESSON_COMPONENT_IDS).toEqual(
      expect.arrayContaining([
        'alphabet_basics',
        'art_colors_harmony',
        'art_shapes_basic',
        'geometry_shape_recognition',
        'music_diatonic_scale',
      ])
    );
    expect(KANGUR_GROWN_UP_GAME_LIBRARY_LESSON_COMPONENT_IDS).toEqual(
      expect.arrayContaining([
        'agentic_coding_codex_5_4',
        'agentic_coding_codex_5_4_models',
        'agentic_coding_codex_5_4_ai_documentation',
        'agentic_coding_codex_5_4_rollout',
      ])
    );
    expect(KANGUR_TEN_YEAR_OLD_GAME_LIBRARY_LESSON_COMPONENT_IDS).toEqual(
      expect.arrayContaining([
        'clock',
        'geometry_basics',
        'logical_analogies',
        'english_sentence_structure',
      ])
    );
  });

  it('keeps all declared game-library lesson components backed by shared catalog entries', () => {
    const uncovered = KANGUR_GAME_LIBRARY_LESSON_COMPONENT_IDS.filter(
      (componentId) => !hasKangurGameLibraryCoverageForLessonComponent(componentId)
    );

    expect(uncovered).toEqual([]);
  });

  it('keeps all declared launchable lesson components backed by fullscreen game routes', () => {
    const missingLaunchCoverage = KANGUR_LAUNCHABLE_GAME_LIBRARY_LESSON_COMPONENT_IDS.filter(
      (componentId) => !hasKangurLaunchableGameCoverageForLessonComponent(componentId)
    );

    expect(missingLaunchCoverage).toEqual([]);
  });

  it('separates library-backed coverage from selector-only fallback routing', () => {
    expect(isKangurGameLibraryLessonComponent('art_shapes_basic')).toBe(true);
    expect(shouldRouteKangurLessonComponentToOperationSelector('art_shapes_basic')).toBe(true);

    expect(isKangurGameLibraryLessonComponent('art_colors_harmony')).toBe(true);
    expect(shouldRouteKangurLessonComponentToOperationSelector('art_colors_harmony')).toBe(true);

    expect(KANGUR_OPERATION_SELECTOR_FALLBACK_LESSON_COMPONENT_IDS).toEqual([
      'art_colors_harmony',
      'art_shapes_basic',
      'music_diatonic_scale',
    ]);
  });

  it('resolves lesson coverage status from shared coverage policy', () => {
    expect(resolveKangurGameLibraryLessonCoverageStatus('clock')).toBe('launchable');
    expect(resolveKangurGameLibraryLessonCoverageStatus('geometry_shape_recognition')).toBe(
      'library_backed'
    );
    expect(resolveKangurGameLibraryLessonCoverageStatus('art_shapes_basic')).toBe(
      'selector_fallback'
    );
    expect(resolveKangurGameLibraryLessonCoverageStatus('webdev_react_components')).toBe(
      'lesson_only'
    );
  });

  it('builds shared coverage groups from the game catalog', () => {
    const coverageGroups = createKangurGameLibraryCoverageGroups(
      createKangurGameCatalogEntries()
    );

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
  });
});
