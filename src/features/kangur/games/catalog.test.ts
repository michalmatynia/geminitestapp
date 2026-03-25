import { describe, expect, it } from 'vitest';

import {
  KANGUR_GAME_CATALOG_IDS_BY_ENGINE_ID,
  createKangurGameCatalogEntries,
  filterKangurGameCatalogEntries,
  getKangurGameCatalogEntriesForEngine,
  getKangurGameCatalogEntryForLessonActivity,
  getKangurGameCatalogFacets,
} from './catalog';

describe('kangur game catalog', () => {
  it('joins games with engine metadata and preferred variants', () => {
    const entry = createKangurGameCatalogEntries().find(
      (candidate) => candidate.game.id === 'clock_training'
    );

    expect(entry?.engine?.id).toBe('clock-dial-engine');
    expect(entry?.lessonVariant?.id).toBe('clock_training.lesson-inline');
    expect(entry?.gameScreenVariant?.id).toBe('clock_training.game-screen');
    expect(entry?.launchableScreen).toBe('clock_quiz');
  });

  it('resolves lesson activities and engine families through the catalog', () => {
    expect(getKangurGameCatalogEntryForLessonActivity('clock-training')?.game.id).toBe(
      'clock_training'
    );
    expect(getKangurGameCatalogEntryForLessonActivity('geometry-drawing')?.game.id).toBe(
      'geometry_shape_workshop'
    );
    expect(
      getKangurGameCatalogEntriesForEngine('symbol-tracing-engine').map((entry) => entry.game.id)
    ).toEqual(['alphabet_trace_letters', 'alphabet_copy_letters']);
    expect(
      getKangurGameCatalogEntriesForEngine('symmetry-drawing-engine').map((entry) => entry.game.id)
    ).toEqual(['geometry_symmetry_studio']);
    expect(
      getKangurGameCatalogEntriesForEngine('perimeter-drawing-engine').map((entry) => entry.game.id)
    ).toEqual(['geometry_perimeter_trainer']);
    expect(
      getKangurGameCatalogEntriesForEngine('classification-engine').map((entry) => entry.game.id)
    ).toEqual(
      expect.arrayContaining([
        'logical_classification_lab',
        'english_parts_of_speech_sort',
        'agentic_brief_builder',
      ])
    );
  });

  it('resolves engine families without relying on the mutable cached engine index', () => {
    const cachedIds = KANGUR_GAME_CATALOG_IDS_BY_ENGINE_ID['symbol-tracing-engine'];
    const originalIds = [...(cachedIds ?? [])];

    try {
      cachedIds?.splice(0, cachedIds.length);

      expect(
        getKangurGameCatalogEntriesForEngine('symbol-tracing-engine').map((entry) => entry.game.id)
      ).toEqual(['alphabet_trace_letters', 'alphabet_copy_letters']);
    } finally {
      cachedIds?.push(...originalIds);
    }
  });

  it('filters catalog entries by shared domain attributes', () => {
    const filtered = filterKangurGameCatalogEntries(createKangurGameCatalogEntries(), {
      subject: 'english',
      launchableOnly: true,
    });

    expect(filtered.map((entry) => entry.game.id)).toEqual([
      'english_sentence_builder',
      'english_parts_of_speech_sort',
    ]);
  });

  it('derives reusable classification facets from catalog entries', () => {
    const entries = createKangurGameCatalogEntries();
    const facets = getKangurGameCatalogFacets(entries);

    expect(facets.subjects).toEqual([
      'alphabet',
      'art',
      'geometry',
      'music',
      'maths',
      'english',
      'agentic_coding',
    ]);
    expect(facets.ageGroups).toEqual(['six_year_old', 'ten_year_old', 'grown_ups']);
    expect(facets.statuses).toEqual(['active']);
    expect(facets.gameCount).toBe(entries.length);
    expect(facets.surfaces).toEqual(['lesson', 'library', 'game']);
    expect(facets.variantSurfaces).toEqual([
      'lesson_inline',
      'library_preview',
      'lesson_stage',
      'game_screen',
    ]);
    expect(facets.variantStatuses).toEqual(['active']);
    expect(facets.engineIds).toContain('classification-engine');
    expect(facets.engineIds).toContain('symbol-tracing-engine');
    expect(facets.engineCategories).toEqual([
      'foundational',
      'early_learning',
      'adult_learning',
    ]);
    expect(facets.engines.some((engine) => engine.id === 'classification-engine')).toBe(true);
    expect(facets.mechanics).toContain('logic_relation');
  });

  it('filters catalog entries by variant-specific attributes', () => {
    const filtered = filterKangurGameCatalogEntries(createKangurGameCatalogEntries(), {
      variantSurface: 'game_screen',
      subject: 'english',
    });

    expect(filtered.map((entry) => entry.game.id)).toEqual([
      'english_sentence_builder',
      'english_parts_of_speech_sort',
    ]);
  });

  it('keeps drawing games split by their dedicated engines in the catalog', () => {
    const filtered = filterKangurGameCatalogEntries(createKangurGameCatalogEntries(), {
      mechanic: 'drawing',
    });

    expect(filtered.map((entry) => entry.game.id)).toEqual(
      expect.arrayContaining([
        'alphabet_trace_letters',
        'alphabet_copy_letters',
        'geometry_shape_drawing',
        'geometry_shape_workshop',
        'geometry_symmetry_studio',
        'geometry_perimeter_trainer',
        'agentic_loop_sketch',
        'agentic_milestone_flow',
      ])
    );
  });

  it('filters catalog entries by engine category', () => {
    const filtered = filterKangurGameCatalogEntries(createKangurGameCatalogEntries(), {
      engineCategory: 'adult_learning',
    });

    expect(filtered.every((entry) => entry.engine?.category === 'adult_learning')).toBe(true);
    expect(filtered.map((entry) => entry.game.id)).toEqual(
      expect.arrayContaining(['agentic_loop_sketch', 'agentic_milestone_flow'])
    );
    expect(filtered.length).toBeGreaterThanOrEqual(2);
  });

  it('includes six-year-old and grown-up games in the shared catalog', () => {
    const entries = createKangurGameCatalogEntries();

    expect(
      filterKangurGameCatalogEntries(entries, { ageGroup: 'six_year_old' }).map(
        (entry) => entry.game.id
      )
    ).toEqual(
      expect.arrayContaining([
        'art_color_harmony_studio',
        'alphabet_trace_letters',
        'music_melody_repeat',
        'geometry_shape_drawing',
      ])
    );
    expect(
      filterKangurGameCatalogEntries(entries, { ageGroup: 'grown_ups' }).map(
        (entry) => entry.game.id
      )
    ).toEqual(
      expect.arrayContaining([
        'agentic_brief_builder',
        'agentic_docs_hierarchy',
        'agentic_reasoning_router',
      ])
    );
  });
});
