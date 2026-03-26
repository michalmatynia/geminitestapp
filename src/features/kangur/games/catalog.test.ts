import { describe, expect, it } from 'vitest';

import {
  KANGUR_GAME_CATALOG_IDS_BY_ENGINE_ID,
  createKangurGameCatalogEntries,
  filterKangurGameCatalogEntries,
  getKangurGameCatalogEntriesForEngine,
  getKangurGameCatalogEntryForLessonActivity,
  getKangurGameCatalogFacets,
  getKangurLessonActivityRuntimeSpecForGame,
  getKangurLessonActivityRuntimeSpecForVariant,
  getKangurLessonStageGameRuntimeSpecForGame,
  getKangurLessonStageGameRuntimeSpecForVariant,
  getKangurLaunchableGameRuntimeSpecForGame,
  getKangurLaunchableGameRuntimeSpecForVariant,
} from './catalog';

describe('kangur game catalog', () => {
  it('joins games with engine metadata and preferred variants', () => {
    const entry = createKangurGameCatalogEntries().find(
      (candidate) => candidate.game.id === 'clock_training'
    );

    expect(entry?.engine?.id).toBe('clock-dial-engine');
    expect(entry?.lessonVariant?.id).toBe('clock_training.lesson-inline');
    expect(entry?.lessonVariant?.lessonActivityRuntimeId).toBe('clock-training');
    expect(entry?.lessonActivityRuntime?.activityId).toBe('clock-training');
    expect(entry?.gameScreenVariant?.id).toBe('clock_training.game-screen');
    expect(entry?.launchableScreen).toBe('clock_quiz');
    expect(entry?.launchableRuntime?.screen).toBe('clock_quiz');
    expect(entry?.gameScreenVariant?.launchableRuntimeId).toBe('clock_quiz');
  });

  it('resolves lesson activity runtime specs from serialized lesson variants', () => {
    const entry = createKangurGameCatalogEntries().find(
      (candidate) => candidate.game.id === 'division_groups'
    );

    expect(entry).toBeTruthy();
    expect(entry?.lessonVariant?.lessonActivityRuntimeId).toBe('division-game');
    expect(
      entry?.lessonVariant
        ? getKangurLessonActivityRuntimeSpecForVariant(entry.lessonVariant)?.rendererId
        : null
    ).toBe('division_game');
    expect(entry ? getKangurLessonActivityRuntimeSpecForGame(entry.game)?.engineId : null).toBe(
      'choice-quiz-engine'
    );
  });

  it('keeps the lesson activity catalog fallback for older legacy-only variants', () => {
    expect(
      getKangurLessonActivityRuntimeSpecForVariant({
        id: 'legacy-division.lesson-inline',
        label: 'Legacy lesson inline',
        title: 'Legacy division lesson',
        description: 'Older stored variant using only the legacy lesson activity id.',
        surface: 'lesson_inline',
        legacyActivityId: 'division-game',
        sortOrder: 0,
        status: 'active',
      })?.rendererId
    ).toBe('division_game');
  });

  it('resolves lesson-stage runtime specs from serialized lesson-stage variants', () => {
    const entry = createKangurGameCatalogEntries().find(
      (candidate) => candidate.game.id === 'logical_patterns_workshop'
    );

    expect(entry).toBeTruthy();
    expect(entry?.lessonVariant?.lessonStageRuntimeId).toBe('logical_patterns_workshop_lesson_stage');
    expect(
      entry?.lessonVariant
        ? getKangurLessonStageGameRuntimeSpecForVariant(entry.lessonVariant)?.rendererId
        : null
    ).toBe('logical_patterns_workshop_game');
    expect(entry?.lessonStageRuntime?.runtimeId).toBe('logical_patterns_workshop_lesson_stage');
    expect(entry ? getKangurLessonStageGameRuntimeSpecForGame(entry.game)?.engineId : null).toBe(
      'pattern-sequence-engine'
    );
  });

  it('resolves the alphabet sequence lesson-stage runtime from serialized variant config', () => {
    const entry = createKangurGameCatalogEntries().find(
      (candidate) => candidate.game.id === 'alphabet_letter_order'
    );

    expect(entry).toBeTruthy();
    expect(entry?.lessonStageRuntime?.runtimeId).toBe('alphabet_letter_order_lesson_stage');
    expect(
      entry?.game.variants.find((variant) => variant.id === 'alphabet_letter_order.lesson-stage')
        ?.lessonStageRuntimeId
    ).toBe('alphabet_letter_order_lesson_stage');
    expect(entry ? getKangurLessonStageGameRuntimeSpecForGame(entry.game)?.rendererId : null).toBe(
      'logical_patterns_workshop_game'
    );
    expect(
      entry ? getKangurLessonStageGameRuntimeSpecForGame(entry.game)?.rendererProps : null
    ).toMatchObject({
      patternSetId: 'alphabet_letter_order',
    });
  });

  it('resolves the alphabet literacy lesson-stage runtime from serialized variant config', () => {
    const entry = createKangurGameCatalogEntries().find(
      (candidate) => candidate.game.id === 'alphabet_letter_matching'
    );

    expect(entry).toBeTruthy();
    expect(entry?.lessonStageRuntime?.runtimeId).toBe('alphabet_letter_matching_lesson_stage');
    expect(
      entry?.game.variants.find((variant) => variant.id === 'alphabet_letter_matching.lesson-stage')
        ?.lessonStageRuntimeId
    ).toBe('alphabet_letter_matching_lesson_stage');
    expect(entry ? getKangurLessonStageGameRuntimeSpecForGame(entry.game)?.rendererId : null).toBe(
      'alphabet_literacy_stage_game'
    );
    expect(
      entry ? getKangurLessonStageGameRuntimeSpecForGame(entry.game)?.rendererProps : null
    ).toMatchObject({
      literacyMatchSetId: 'alphabet_letter_matching',
    });
  });

  it('resolves the color harmony lesson-stage runtime from serialized variant config', () => {
    const entry = createKangurGameCatalogEntries().find(
      (candidate) => candidate.game.id === 'art_color_harmony_studio'
    );

    expect(entry).toBeTruthy();
    expect(entry?.lessonStageRuntime?.runtimeId).toBe('art_color_harmony_studio_lesson_stage');
    expect(
      entry?.game.variants.find((variant) => variant.id === 'art_color_harmony_studio.lesson-stage')
        ?.lessonStageRuntimeId
    ).toBe('art_color_harmony_studio_lesson_stage');
    expect(entry ? getKangurLessonStageGameRuntimeSpecForGame(entry.game)?.rendererId : null).toBe(
      'color_harmony_stage_game'
    );
    expect(entry ? getKangurLessonStageGameRuntimeSpecForGame(entry.game)?.engineId : null).toBe(
      'color-harmony-engine'
    );
  });

  it('resolves geometry workshop lesson-stage runtime specs from the serialized stage variant config', () => {
    const entry = createKangurGameCatalogEntries().find(
      (candidate) => candidate.game.id === 'geometry_shape_workshop'
    );

    expect(entry).toBeTruthy();
    expect(entry?.lessonStageRuntime?.runtimeId).toBe('geometry_shape_workshop_lesson_stage');
    expect(
      entry?.game.variants.find((variant) => variant.id === 'geometry_shape_workshop.lesson-stage')
        ?.lessonStageRuntimeId
    ).toBe('geometry_shape_workshop_lesson_stage');
    expect(entry ? getKangurLessonStageGameRuntimeSpecForGame(entry.game)?.engineId : null).toBe(
      'shape-drawing-engine'
    );
  });

  it('resolves launchable runtime specs from the serialized game-screen variant config', () => {
    const entry = createKangurGameCatalogEntries().find(
      (candidate) => candidate.game.id === 'english_sentence_builder'
    );

    expect(entry).toBeTruthy();
    expect(entry?.gameScreenVariant?.launchableRuntimeId).toBe('english_sentence_quiz');
    expect(
      entry?.gameScreenVariant
        ? getKangurLaunchableGameRuntimeSpecForVariant(entry.gameScreenVariant)?.rendererId
        : null
    ).toBe('english_sentence_structure_game');
    expect(entry ? getKangurLaunchableGameRuntimeSpecForGame(entry.game)?.engineId : null).toBe(
      'sentence-builder-engine'
    );
  });

  it('keeps the launchable catalog fallback for older legacy-only game-screen variants', () => {
    expect(
      getKangurLaunchableGameRuntimeSpecForVariant({
        id: 'legacy-sentence.game-screen',
        label: 'Legacy game screen',
        title: 'Legacy sentence fullscreen',
        description: 'Older stored variant using only the legacy screen id.',
        surface: 'game_screen',
        legacyScreenId: 'english_sentence_quiz',
        sortOrder: 0,
        status: 'active',
      })?.rendererId
    ).toBe('english_sentence_structure_game');
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

  it('filters catalog entries by exact game id when a deep link targets one game', () => {
    const filtered = filterKangurGameCatalogEntries(createKangurGameCatalogEntries(), {
      gameId: 'division_groups',
    });

    expect(filtered.map((entry) => entry.game.id)).toEqual(['division_groups']);
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
    expect(facets.games[0]).toEqual({
      id: entries[0]?.game.id,
      title: entries[0]?.game.title,
      sortOrder: entries[0]?.game.sortOrder,
    });
    expect(facets.games.some((game) => game.id === 'division_groups')).toBe(true);
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
    expect(facets.implementationOwnerships).toEqual(['shared_runtime']);
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

  it('filters catalog entries by implementation ownership', () => {
    const embedded = filterKangurGameCatalogEntries(createKangurGameCatalogEntries(), {
      implementationOwnership: 'lesson_embedded',
    });
    const shared = filterKangurGameCatalogEntries(createKangurGameCatalogEntries(), {
      implementationOwnership: 'shared_runtime',
    });

    expect(embedded).toEqual([]);
    expect(shared.some((entry) => entry.game.id === 'art_color_harmony_studio')).toBe(true);
    expect(shared.some((entry) => entry.game.id === 'alphabet_first_words')).toBe(true);
    expect(shared.some((entry) => entry.game.id === 'clock_training')).toBe(true);
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
