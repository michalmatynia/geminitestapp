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
  getKangurLaunchableGameRuntimeSpecForGame,
  getKangurLaunchableGameRuntimeSpecForVariant,
} from './catalog';
import {
  KANGUR_MUSIC_PIANO_ROLL_ENGINE_IDS,
  KANGUR_MUSIC_PIANO_ROLL_GAME_IDS,
  KANGUR_MUSIC_PIANO_ROLL_LAUNCHABLE_RUNTIME_IDS,
  KANGUR_MUSIC_PIANO_ROLL_RENDERER_IDS,
  KANGUR_MUSIC_PIANO_ROLL_VARIANT_IDS,
} from './music-piano-roll-contract';

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

  it('keeps the logical patterns .lesson-stage id unbound once lessons use launchable instances', () => {
    const entry = createKangurGameCatalogEntries().find(
      (candidate) => candidate.game.id === 'logical_patterns_workshop'
    );
    const variant = entry?.game.variants.find(
      (candidate) => candidate.id === 'logical_patterns_workshop.lesson-stage'
    );

    expect(entry).toBeTruthy();
    expect(variant?.surface).toBe('lesson_stage');
    expect(variant).not.toHaveProperty('launchableRuntimeId');
    expect(variant).not.toHaveProperty('lessonActivityRuntimeId');
  });

  it('keeps the alphabet sequence .lesson-stage id unbound once lessons use launchable instances', () => {
    const entry = createKangurGameCatalogEntries().find(
      (candidate) => candidate.game.id === 'alphabet_letter_order'
    );
    const variant = entry?.game.variants.find(
      (candidate) => candidate.id === 'alphabet_letter_order.lesson-stage'
    );

    expect(entry).toBeTruthy();
    expect(variant?.surface).toBe('lesson_stage');
    expect(variant).not.toHaveProperty('launchableRuntimeId');
    expect(variant).not.toHaveProperty('lessonActivityRuntimeId');
  });

  it('keeps the alphabet literacy .lesson-stage id unbound once lessons use launchable instances', () => {
    const entry = createKangurGameCatalogEntries().find(
      (candidate) => candidate.game.id === 'alphabet_letter_matching'
    );
    const variant = entry?.game.variants.find(
      (candidate) => candidate.id === 'alphabet_letter_matching.lesson-stage'
    );

    expect(entry).toBeTruthy();
    expect(variant?.surface).toBe('lesson_stage');
    expect(variant).not.toHaveProperty('launchableRuntimeId');
    expect(variant).not.toHaveProperty('lessonActivityRuntimeId');
  });

  it('keeps the color harmony .lesson-stage id unbound once lessons use launchable instances', () => {
    const entry = createKangurGameCatalogEntries().find(
      (candidate) => candidate.game.id === 'art_color_harmony_studio'
    );
    const variant = entry?.game.variants.find(
      (candidate) => candidate.id === 'art_color_harmony_studio.lesson-stage'
    );

    expect(entry).toBeTruthy();
    expect(variant?.surface).toBe('lesson_stage');
    expect(variant).not.toHaveProperty('launchableRuntimeId');
    expect(variant).not.toHaveProperty('lessonActivityRuntimeId');
  });

  it('keeps the geometry workshop .lesson-stage id unbound once lessons use launchable instances', () => {
    const entry = createKangurGameCatalogEntries().find(
      (candidate) => candidate.game.id === 'geometry_shape_workshop'
    );
    const variant = entry?.game.variants.find(
      (candidate) => candidate.id === 'geometry_shape_workshop.lesson-stage'
    );

    expect(entry).toBeTruthy();
    expect(variant?.surface).toBe('lesson_stage');
    expect(variant).not.toHaveProperty('launchableRuntimeId');
    expect(variant).not.toHaveProperty('lessonActivityRuntimeId');
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

  it('promotes shared English grammar engines into serialized game-screen variants', () => {
    const entries = createKangurGameCatalogEntries();
    const subjectVerbEntry = entries.find(
      (candidate) => candidate.game.id === 'english_subject_verb_agreement'
    );
    const adjectivesEntry = entries.find(
      (candidate) => candidate.game.id === 'english_adjectives_scene'
    );
    const adverbsEntry = entries.find(
      (candidate) => candidate.game.id === 'english_adverbs_frequency_routine'
    );
    const articlesEntry = entries.find(
      (candidate) => candidate.game.id === 'english_articles_drag_drop'
    );
    const prepositionsEntry = entries.find(
      (candidate) => candidate.game.id === 'english_prepositions_time_place'
    );
    const prepositionsSortEntry = entries.find(
      (candidate) => candidate.game.id === 'english_prepositions_sort'
    );
    const prepositionsOrderEntry = entries.find(
      (candidate) => candidate.game.id === 'english_prepositions_order'
    );
    const pronounsWarmupEntry = entries.find(
      (candidate) => candidate.game.id === 'english_pronouns_warmup'
    );

    expect(subjectVerbEntry?.launchableRuntime).toMatchObject({
      screen: 'english_subject_verb_agreement_quiz',
      rendererId: 'english_subject_verb_agreement_game',
      engineId: 'sentence-builder-engine',
    });
    expect(adjectivesEntry?.launchableRuntime).toMatchObject({
      screen: 'english_adjectives_quiz',
      rendererId: 'english_adjectives_scene_game',
      engineId: 'sentence-builder-engine',
    });
    expect(adverbsEntry?.launchableRuntime).toMatchObject({
      screen: 'english_adverbs_frequency_quiz',
      rendererId: 'english_adverbs_frequency_routine_game',
      engineId: 'sentence-builder-engine',
    });
    expect(articlesEntry?.launchableRuntime).toMatchObject({
      screen: 'english_articles_quiz',
      rendererId: 'english_articles_drag_drop_game',
      engineId: 'sentence-builder-engine',
    });
    expect(prepositionsEntry?.launchableRuntime).toMatchObject({
      screen: 'english_prepositions_quiz',
      rendererId: 'english_prepositions_game',
      engineId: 'sentence-builder-engine',
    });
    expect(prepositionsSortEntry?.launchableRuntime).toMatchObject({
      screen: 'english_prepositions_sort_quiz',
      rendererId: 'english_prepositions_sort_game',
      engineId: 'classification-engine',
    });
    expect(prepositionsOrderEntry?.launchableRuntime).toMatchObject({
      screen: 'english_prepositions_order_quiz',
      rendererId: 'english_prepositions_order_game',
      engineId: 'sentence-builder-engine',
    });
    expect(pronounsWarmupEntry?.launchableRuntime).toMatchObject({
      screen: 'english_pronouns_warmup_quiz',
      rendererId: 'english_pronouns_warmup_game',
      engineId: 'sentence-builder-engine',
    });
  });

  it('promotes music engines into serialized game-screen variants for launchable reuse', () => {
    const entries = createKangurGameCatalogEntries();
    const melodyEntry = entries.find(
      (candidate) => candidate.game.id === KANGUR_MUSIC_PIANO_ROLL_GAME_IDS.repeat
    );
    const freePlayEntry = entries.find(
      (candidate) => candidate.game.id === KANGUR_MUSIC_PIANO_ROLL_GAME_IDS.freePlay
    );

    expect(melodyEntry?.gameScreenVariant?.id).toBe(KANGUR_MUSIC_PIANO_ROLL_VARIANT_IDS.repeatGameScreen);
    expect(melodyEntry?.launchableScreen).toBe(
      KANGUR_MUSIC_PIANO_ROLL_LAUNCHABLE_RUNTIME_IDS.repeat
    );
    expect(melodyEntry?.launchableRuntime?.rendererId).toBe(
      KANGUR_MUSIC_PIANO_ROLL_RENDERER_IDS.repeat
    );
    expect(
      melodyEntry ? getKangurLaunchableGameRuntimeSpecForGame(melodyEntry.game)?.engineId : null
    ).toBe(KANGUR_MUSIC_PIANO_ROLL_ENGINE_IDS.repeat);

    expect(freePlayEntry?.gameScreenVariant?.id).toBe(KANGUR_MUSIC_PIANO_ROLL_VARIANT_IDS.freePlayGameScreen);
    expect(freePlayEntry?.launchableScreen).toBe(
      KANGUR_MUSIC_PIANO_ROLL_LAUNCHABLE_RUNTIME_IDS.freePlay
    );
    expect(freePlayEntry?.launchableRuntime?.rendererId).toBe(
      KANGUR_MUSIC_PIANO_ROLL_RENDERER_IDS.freePlay
    );
    expect(
      freePlayEntry
        ? getKangurLaunchableGameRuntimeSpecForGame(freePlayEntry.game)?.engineId
        : null
    ).toBe(KANGUR_MUSIC_PIANO_ROLL_ENGINE_IDS.freePlay);
  });

  it('promotes alphabet engines into serialized game-screen variants for launchable reuse', () => {
    const entries = createKangurGameCatalogEntries();
    const wordsEntry = entries.find((candidate) => candidate.game.id === 'alphabet_first_words');
    const matchingEntry = entries.find(
      (candidate) => candidate.game.id === 'alphabet_letter_matching'
    );
    const orderEntry = entries.find((candidate) => candidate.game.id === 'alphabet_letter_order');

    expect(wordsEntry?.gameScreenVariant?.id).toBe('alphabet_first_words.game-screen');
    expect(wordsEntry?.launchableScreen).toBe('alphabet_first_words_quiz');
    expect(wordsEntry?.launchableRuntime).toMatchObject({
      screen: 'alphabet_first_words_quiz',
      rendererId: 'alphabet_literacy_game',
      engineId: 'letter-match-engine',
    });

    expect(matchingEntry?.gameScreenVariant?.id).toBe('alphabet_letter_matching.game-screen');
    expect(matchingEntry?.launchableScreen).toBe('alphabet_letter_matching_quiz');
    expect(matchingEntry?.launchableRuntime).toMatchObject({
      screen: 'alphabet_letter_matching_quiz',
      rendererId: 'alphabet_literacy_game',
      engineId: 'letter-match-engine',
    });

    expect(orderEntry?.gameScreenVariant?.id).toBe('alphabet_letter_order.game-screen');
    expect(orderEntry?.launchableScreen).toBe('alphabet_letter_order_quiz');
    expect(orderEntry?.launchableRuntime).toMatchObject({
      screen: 'alphabet_letter_order_quiz',
      rendererId: 'logical_patterns_workshop_game',
      engineId: 'pattern-sequence-engine',
    });
  });

  it('promotes arithmetic shared engines into serialized game-screen variants for launchable reuse', () => {
    const entries = createKangurGameCatalogEntries();
    const addingEntry = entries.find((candidate) => candidate.game.id === 'adding_ball');
    const addingSynthesisEntry = entries.find(
      (candidate) => candidate.game.id === 'adding_synthesis'
    );
    const subtractingEntry = entries.find(
      (candidate) => candidate.game.id === 'subtracting_garden'
    );

    expect(addingEntry?.gameScreenVariant?.id).toBe('adding_ball.game-screen');
    expect(addingEntry?.launchableScreen).toBe('addition_quiz');
    expect(addingEntry?.launchableRuntime).toMatchObject({
      screen: 'addition_quiz',
      rendererId: 'adding_ball_game',
      engineId: 'quantity-drag-engine',
    });

    expect(addingSynthesisEntry?.gameScreenVariant?.id).toBe('adding_synthesis.game-screen');
    expect(addingSynthesisEntry?.launchableScreen).toBe('adding_synthesis_quiz');
    expect(addingSynthesisEntry?.launchableRuntime).toMatchObject({
      screen: 'adding_synthesis_quiz',
      rendererId: 'adding_synthesis_game',
      engineId: 'rhythm-answer-engine',
    });

    expect(subtractingEntry?.gameScreenVariant?.id).toBe('subtracting_garden.game-screen');
    expect(subtractingEntry?.launchableScreen).toBe('subtraction_quiz');
    expect(subtractingEntry?.launchableRuntime).toMatchObject({
      screen: 'subtraction_quiz',
      rendererId: 'subtracting_game',
      engineId: 'quantity-drag-engine',
    });
  });

  it('promotes agentic engines into serialized game-screen variants for launchable reuse', () => {
    const entries = createKangurGameCatalogEntries();
    const promptTrimEntry = entries.find((candidate) => candidate.game.id === 'agentic_prompt_trim_stage');
    const approvalGateEntry = entries.find((candidate) => candidate.game.id === 'agentic_approval_gate');
    const reasoningRouterEntry = entries.find(
      (candidate) => candidate.game.id === 'agentic_reasoning_router'
    );
    const surfaceMatchEntry = entries.find((candidate) => candidate.game.id === 'agentic_surface_match');

    expect(promptTrimEntry?.gameScreenVariant?.id).toBe('agentic_prompt_trim_stage.game-screen');
    expect(promptTrimEntry?.launchableScreen).toBe('agentic_prompt_trim_quiz');
    expect(promptTrimEntry?.launchableRuntime).toMatchObject({
      screen: 'agentic_prompt_trim_quiz',
      rendererId: 'agentic_prompt_trim_game',
      engineId: 'token-trim-engine',
    });

    expect(approvalGateEntry?.gameScreenVariant?.id).toBe('agentic_approval_gate.game-screen');
    expect(approvalGateEntry?.launchableScreen).toBe('agentic_approval_gate_quiz');
    expect(approvalGateEntry?.launchableRuntime).toMatchObject({
      screen: 'agentic_approval_gate_quiz',
      rendererId: 'agentic_approval_gate_game',
      engineId: 'classification-engine',
    });

    expect(reasoningRouterEntry?.gameScreenVariant?.id).toBe('agentic_reasoning_router.game-screen');
    expect(reasoningRouterEntry?.launchableScreen).toBe('agentic_reasoning_router_quiz');
    expect(reasoningRouterEntry?.launchableRuntime).toMatchObject({
      screen: 'agentic_reasoning_router_quiz',
      rendererId: 'agentic_reasoning_router_game',
      engineId: 'classification-engine',
    });

    expect(surfaceMatchEntry?.gameScreenVariant?.id).toBe('agentic_surface_match.game-screen');
    expect(surfaceMatchEntry?.launchableScreen).toBe('agentic_surface_match_quiz');
    expect(surfaceMatchEntry?.launchableRuntime).toMatchObject({
      screen: 'agentic_surface_match_quiz',
      rendererId: 'agentic_surface_match_game',
      engineId: 'classification-engine',
    });
  });

  it('promotes the shape spotter engine into a serialized game-screen variant for launchable reuse', () => {
    const entry = createKangurGameCatalogEntries().find(
      (candidate) => candidate.game.id === 'geometry_shape_spotter'
    );

    expect(entry?.gameScreenVariant?.id).toBe('geometry_shape_spotter.game-screen');
    expect(entry?.launchableScreen).toBe('geometry_shape_spotter_quiz');
    expect(entry?.launchableRuntime).toMatchObject({
      screen: 'geometry_shape_spotter_quiz',
      rendererId: 'shape_recognition_game',
      engineId: 'shape-recognition-engine',
    });
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
      'english_subject_verb_agreement',
      'english_adjectives_scene',
      'english_adverbs_frequency_routine',
      'english_articles_drag_drop',
      'english_prepositions_time_place',
      'english_prepositions_sort',
      'english_prepositions_order',
      'english_pronouns_warmup',
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
      'english_subject_verb_agreement',
      'english_adjectives_scene',
      'english_adverbs_frequency_routine',
      'english_articles_drag_drop',
      'english_prepositions_time_place',
      'english_prepositions_sort',
      'english_prepositions_order',
      'english_pronouns_warmup',
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
        KANGUR_MUSIC_PIANO_ROLL_GAME_IDS.repeat,
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
