import { describe, expect, it } from 'vitest';

import { kangurGameLibraryCoverageSchema } from '@/shared/contracts/kangur-games';
import {
  KANGUR_GAME_LIBRARY_LESSON_COMPONENT_IDS,
  KANGUR_GROWN_UP_GAME_LIBRARY_LESSON_COMPONENT_IDS,
  KANGUR_LAUNCHABLE_GAME_LIBRARY_LESSON_COMPONENT_IDS,
  KANGUR_SIX_YEAR_OLD_GAME_LIBRARY_LESSON_COMPONENT_IDS,
  KANGUR_TEN_YEAR_OLD_GAME_LIBRARY_LESSON_COMPONENT_IDS,
  createKangurGameLibraryCoverage,
  createKangurGameLibraryCoverageGroups,
  createKangurGameLibraryCoverageStatusMap,
  getKangurGameLibraryLessonCoverageStatusFromMap,
  hasKangurGameLibraryCoverageForLessonComponent,
  hasKangurLaunchableGameCoverageForLessonComponent,
  isKangurGameLibraryLessonComponent,
  resolveKangurGameLibraryLessonCoverageStatus,
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

    expect(KANGUR_LAUNCHABLE_GAME_LIBRARY_LESSON_COMPONENT_IDS).toEqual(
      expect.arrayContaining(['english_adverbs', 'english_adverbs_frequency'])
    );
    expect(missingLaunchCoverage).toEqual([]);
  });

  it('keeps migrated lessons inside shared library coverage', () => {
    expect(isKangurGameLibraryLessonComponent('art_shapes_basic')).toBe(true);
    expect(isKangurGameLibraryLessonComponent('art_colors_harmony')).toBe(true);
    expect(isKangurGameLibraryLessonComponent('music_diatonic_scale')).toBe(true);
  });

  it('resolves lesson coverage status from shared coverage policy', () => {
    expect(resolveKangurGameLibraryLessonCoverageStatus('clock')).toBe('launchable');
    expect(resolveKangurGameLibraryLessonCoverageStatus('english_adverbs')).toBe('launchable');
    expect(resolveKangurGameLibraryLessonCoverageStatus('geometry_shape_recognition')).toBe(
      'launchable'
    );
    expect(resolveKangurGameLibraryLessonCoverageStatus('art_shapes_basic')).toBe('launchable');
    expect(resolveKangurGameLibraryLessonCoverageStatus('art_colors_harmony')).toBe('launchable');
    expect(resolveKangurGameLibraryLessonCoverageStatus('music_diatonic_scale')).toBe(
      'launchable'
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
    ]);
    expect(coverageGroups[0]?.uncoveredComponentIds).toEqual([]);
    expect(coverageGroups[1]?.uncoveredComponentIds).toEqual([]);
  });

  it('builds a shared lesson coverage status map from coverage groups', () => {
    const coverageStatusMap = createKangurGameLibraryCoverageStatusMap(
      createKangurGameLibraryCoverageGroups(createKangurGameCatalogEntries())
    );

    expect(getKangurGameLibraryLessonCoverageStatusFromMap('clock', coverageStatusMap)).toBe(
      'launchable'
    );
    expect(
      getKangurGameLibraryLessonCoverageStatusFromMap(
        'geometry_shape_recognition',
        coverageStatusMap
      )
    ).toBe('launchable');
    expect(
      getKangurGameLibraryLessonCoverageStatusFromMap('art_shapes_basic', coverageStatusMap)
    ).toBe('launchable');
    expect(
      getKangurGameLibraryLessonCoverageStatusFromMap(
        'webdev_react_components',
        coverageStatusMap
      )
    ).toBe('lesson_only');
  });

  it('builds a combined coverage resource from the game catalog', () => {
    const coverage = createKangurGameLibraryCoverage(createKangurGameCatalogEntries());

    expect(coverage.groups.map((group) => group.id)).toEqual([
      'library_backed',
      'launchable',
    ]);
    expect(getKangurGameLibraryLessonCoverageStatusFromMap('clock', coverage.statusMap)).toBe(
      'launchable'
    );
    expect(
      getKangurGameLibraryLessonCoverageStatusFromMap('english_adverbs', coverage.statusMap)
    ).toBe('launchable');
    expect(
      getKangurGameLibraryLessonCoverageStatusFromMap('art_shapes_basic', coverage.statusMap)
    ).toBe('launchable');
  });

  it('matches the shared DTO schema with a sparse status map', () => {
    const coverage = createKangurGameLibraryCoverage(createKangurGameCatalogEntries());

    expect(() => kangurGameLibraryCoverageSchema.parse(coverage)).not.toThrow();
  });
});
