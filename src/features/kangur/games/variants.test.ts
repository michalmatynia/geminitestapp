import { describe, expect, it } from 'vitest';

import {
  createKangurGameCatalogEntries,
  createKangurGameVariantCatalogEntries,
  filterKangurGameVariantCatalogEntries,
} from '@/features/kangur/games';
import {
  KANGUR_MUSIC_PIANO_ROLL_DEFAULT_INSTANCE_IDS,
  KANGUR_MUSIC_PIANO_ROLL_ENGINE_IDS,
  KANGUR_MUSIC_PIANO_ROLL_GAME_IDS,
  KANGUR_MUSIC_PIANO_ROLL_LAUNCHABLE_RUNTIME_IDS,
  KANGUR_MUSIC_PIANO_ROLL_RENDERER_IDS,
  KANGUR_MUSIC_PIANO_ROLL_VARIANT_IDS,
} from './music-piano-roll-contract';

describe('kangur game variants', () => {
  it('flattens game variants with catalog metadata', () => {
    const entry = createKangurGameVariantCatalogEntries(createKangurGameCatalogEntries()).find(
      (candidate) => candidate.variant.id === 'clock_training.game-screen'
    );

    expect(entry?.game.id).toBe('clock_training');
    expect(entry?.engine?.id).toBe('clock-dial-engine');
    expect(entry?.isGameScreenVariant).toBe(true);
    expect(entry?.launchableScreen).toBe('clock_quiz');
    expect(entry?.launchableRuntime?.rendererId).toBe('clock_training_game');
  });

  it('keeps lesson activity runtimes attached to lesson variants only', () => {
    const entry = createKangurGameVariantCatalogEntries(createKangurGameCatalogEntries()).find(
      (candidate) => candidate.variant.id === 'clock_training.lesson-inline'
    );

    expect(entry?.isLessonVariant).toBe(true);
    expect(entry?.lessonActivityRuntime?.rendererId).toBe('clock_training_game');
    expect(entry?.launchableRuntime).toBeNull();
  });

  it('keeps stored .lesson-stage ids unbound once lessons use launchable instances', () => {
    const entry = createKangurGameVariantCatalogEntries(createKangurGameCatalogEntries()).find(
      (candidate) => candidate.variant.id === 'agentic_approval_gate.lesson-stage'
    );

    expect(entry?.isLessonVariant).toBe(false);
    expect(entry?.lessonActivityRuntime).toBeNull();
    expect(entry?.launchableRuntime).toBeNull();
  });

  it('keeps the stored six-year-old alphabet .lesson-stage ids unbound once lessons use launchable instances', () => {
    const entries = createKangurGameVariantCatalogEntries(createKangurGameCatalogEntries());
    const wordsEntry = entries.find(
      (candidate) => candidate.variant.id === 'alphabet_first_words.lesson-stage'
    );
    const matchingEntry = entries.find(
      (candidate) => candidate.variant.id === 'alphabet_letter_matching.lesson-stage'
    );
    const entry = entries.find(
      (candidate) => candidate.variant.id === 'alphabet_letter_order.lesson-stage'
    );

    expect(wordsEntry?.isLessonVariant).toBe(false);
    expect(matchingEntry?.isLessonVariant).toBe(false);
    expect(entry?.isLessonVariant).toBe(false);
    expect(entry?.lessonActivityRuntime).toBeNull();
    expect(entry?.launchableRuntime).toBeNull();
  });

  it('keeps the stored geometry .lesson-stage ids unbound once lessons use launchable instances', () => {
    const entries = createKangurGameVariantCatalogEntries(createKangurGameCatalogEntries());
    const workshopEntry = entries.find(
      (candidate) => candidate.variant.id === 'geometry_shape_workshop.lesson-stage'
    );
    const entry = entries.find(
      (candidate) => candidate.variant.id === 'geometry_symmetry_studio.lesson-stage'
    );

    expect(workshopEntry?.isLessonVariant).toBe(false);
    expect(entry?.isLessonVariant).toBe(false);
    expect(entry?.lessonActivityRuntime).toBeNull();
    expect(entry?.launchableRuntime).toBeNull();
  });

  it('keeps the stored sentence-builder .lesson-stage id unbound once lessons use launchable instances', () => {
    const entry = createKangurGameVariantCatalogEntries(createKangurGameCatalogEntries()).find(
      (candidate) => candidate.variant.id === 'english_sentence_builder.lesson-stage'
    );

    expect(entry?.isLessonVariant).toBe(false);
    expect(entry?.lessonActivityRuntime).toBeNull();
    expect(entry?.launchableRuntime).toBeNull();
  });

  it('keeps the stored seeded English grammar .lesson-stage ids unbound once lessons use launchable instances', () => {
    const entries = createKangurGameVariantCatalogEntries(createKangurGameCatalogEntries());
    const subjectVerbEntry = entries.find(
      (candidate) => candidate.variant.id === 'english_subject_verb_agreement.lesson-stage'
    );
    const adjectivesEntry = entries.find(
      (candidate) => candidate.variant.id === 'english_adjectives_scene.lesson-stage'
    );
    const adverbsActionEntry = entries.find(
      (candidate) => candidate.variant.id === 'english_adverbs_action_studio.lesson-stage'
    );
    const adverbsEntry = entries.find(
      (candidate) => candidate.variant.id === 'english_adverbs_frequency_routine.lesson-stage'
    );
    const articlesEntry = entries.find(
      (candidate) => candidate.variant.id === 'english_articles_drag_drop.lesson-stage'
    );
    const prepositionsEntry = entries.find(
      (candidate) => candidate.variant.id === 'english_prepositions_time_place.lesson-stage'
    );
    const prepositionsSortEntry = entries.find(
      (candidate) => candidate.variant.id === 'english_prepositions_sort.lesson-stage'
    );
    const prepositionsOrderEntry = entries.find(
      (candidate) => candidate.variant.id === 'english_prepositions_order.lesson-stage'
    );
    const pronounsWarmupEntry = entries.find(
      (candidate) => candidate.variant.id === 'english_pronouns_warmup.lesson-stage'
    );

    expect(subjectVerbEntry?.launchableRuntime).toBeNull();
    expect(adjectivesEntry?.launchableRuntime).toBeNull();
    expect(adverbsActionEntry?.launchableRuntime).toBeNull();
    expect(adverbsEntry?.launchableRuntime).toBeNull();
    expect(articlesEntry?.launchableRuntime).toBeNull();
    expect(prepositionsEntry?.launchableRuntime).toBeNull();
    expect(prepositionsSortEntry?.launchableRuntime).toBeNull();
    expect(prepositionsOrderEntry?.launchableRuntime).toBeNull();
    expect(pronounsWarmupEntry?.launchableRuntime).toBeNull();
  });

  it('attaches launchable runtimes to the seeded English grammar game-screen variants', () => {
    const entries = createKangurGameVariantCatalogEntries(createKangurGameCatalogEntries());
    const subjectVerbEntry = entries.find(
      (candidate) => candidate.variant.id === 'english_subject_verb_agreement.game-screen'
    );
    const adjectivesEntry = entries.find(
      (candidate) => candidate.variant.id === 'english_adjectives_scene.game-screen'
    );
    const adverbsActionEntry = entries.find(
      (candidate) => candidate.variant.id === 'english_adverbs_action_studio.game-screen'
    );
    const adverbsEntry = entries.find(
      (candidate) => candidate.variant.id === 'english_adverbs_frequency_routine.game-screen'
    );
    const articlesEntry = entries.find(
      (candidate) => candidate.variant.id === 'english_articles_drag_drop.game-screen'
    );
    const prepositionsEntry = entries.find(
      (candidate) => candidate.variant.id === 'english_prepositions_time_place.game-screen'
    );
    const prepositionsSortEntry = entries.find(
      (candidate) => candidate.variant.id === 'english_prepositions_sort.game-screen'
    );
    const prepositionsOrderEntry = entries.find(
      (candidate) => candidate.variant.id === 'english_prepositions_order.game-screen'
    );
    const pronounsWarmupEntry = entries.find(
      (candidate) => candidate.variant.id === 'english_pronouns_warmup.game-screen'
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
    expect(adverbsActionEntry?.launchableRuntime).toMatchObject({
      screen: 'english_adverbs_quiz',
      rendererId: 'english_adverbs_action_game',
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

  it('keeps the stored seeded agentic .lesson-stage ids unbound once lessons use launchable instances', () => {
    const entries = createKangurGameVariantCatalogEntries(createKangurGameCatalogEntries());
    const promptTrimEntry = entries.find(
      (candidate) => candidate.variant.id === 'agentic_prompt_trim_stage.lesson-stage'
    );
    const approvalGateEntry = entries.find(
      (candidate) => candidate.variant.id === 'agentic_approval_gate.lesson-stage'
    );
    const reasoningRouterEntry = entries.find(
      (candidate) => candidate.variant.id === 'agentic_reasoning_router.lesson-stage'
    );
    const surfaceMatchEntry = entries.find(
      (candidate) => candidate.variant.id === 'agentic_surface_match.lesson-stage'
    );

    expect(promptTrimEntry?.launchableRuntime).toBeNull();
    expect(approvalGateEntry?.launchableRuntime).toBeNull();
    expect(reasoningRouterEntry?.launchableRuntime).toBeNull();
    expect(surfaceMatchEntry?.launchableRuntime).toBeNull();
  });

  it('attaches launchable runtimes to the seeded agentic game-screen variants', () => {
    const entries = createKangurGameVariantCatalogEntries(createKangurGameCatalogEntries());
    const promptTrimEntry = entries.find(
      (candidate) => candidate.variant.id === 'agentic_prompt_trim_stage.game-screen'
    );
    const approvalGateEntry = entries.find(
      (candidate) => candidate.variant.id === 'agentic_approval_gate.game-screen'
    );
    const reasoningRouterEntry = entries.find(
      (candidate) => candidate.variant.id === 'agentic_reasoning_router.game-screen'
    );
    const surfaceMatchEntry = entries.find(
      (candidate) => candidate.variant.id === 'agentic_surface_match.game-screen'
    );

    expect(promptTrimEntry?.launchableRuntime).toMatchObject({
      screen: 'agentic_prompt_trim_quiz',
      rendererId: 'agentic_prompt_trim_game',
      engineId: 'token-trim-engine',
    });
    expect(approvalGateEntry?.launchableRuntime).toMatchObject({
      screen: 'agentic_approval_gate_quiz',
      rendererId: 'agentic_approval_gate_game',
      engineId: 'classification-engine',
    });
    expect(reasoningRouterEntry?.launchableRuntime).toMatchObject({
      screen: 'agentic_reasoning_router_quiz',
      rendererId: 'agentic_reasoning_router_game',
      engineId: 'classification-engine',
    });
    expect(surfaceMatchEntry?.launchableRuntime).toMatchObject({
      screen: 'agentic_surface_match_quiz',
      rendererId: 'agentic_surface_match_game',
      engineId: 'classification-engine',
    });
  });

  it('keeps the stored seeded six-year-old art and geometry .lesson-stage ids unbound once lessons use launchable instances', () => {
    const entries = createKangurGameVariantCatalogEntries(createKangurGameCatalogEntries());
    const colorHarmonyEntry = entries.find(
      (candidate) => candidate.variant.id === 'art_color_harmony_studio.lesson-stage'
    );
    const artEntry = entries.find(
      (candidate) => candidate.variant.id === 'art_shape_rotation_puzzle.lesson-stage'
    );
    const geometrySpotterEntry = entries.find(
      (candidate) => candidate.variant.id === 'geometry_shape_spotter.lesson-stage'
    );
    const geometryDrawingEntry = entries.find(
      (candidate) => candidate.variant.id === 'geometry_shape_drawing.lesson-stage'
    );
    const melodyEntry = entries.find(
      (candidate) =>
        candidate.variant.id === KANGUR_MUSIC_PIANO_ROLL_VARIANT_IDS.repeatLessonVariant
    );
    const freePlayEntry = entries.find(
      (candidate) =>
        candidate.variant.id === KANGUR_MUSIC_PIANO_ROLL_VARIANT_IDS.freePlayLessonVariant
    );

    expect(colorHarmonyEntry?.launchableRuntime).toBeNull();
    expect(artEntry?.launchableRuntime).toBeNull();
    expect(geometrySpotterEntry?.launchableRuntime).toBeNull();
    expect(geometryDrawingEntry?.launchableRuntime).toBeNull();
    expect(melodyEntry?.launchableRuntime).toBeNull();
    expect(freePlayEntry?.launchableRuntime).toBeNull();
  });

  it('attaches the shape spotter launchable runtime to the seeded six-year-old game-screen variant', () => {
    const entry = createKangurGameVariantCatalogEntries(createKangurGameCatalogEntries()).find(
      (candidate) => candidate.variant.id === 'geometry_shape_spotter.game-screen'
    );

    expect(entry?.launchableRuntime).toMatchObject({
      screen: 'geometry_shape_spotter_quiz',
      rendererId: 'shape_recognition_game',
      engineId: 'shape-recognition-engine',
    });
  });

  it('attaches launchable runtimes to the seeded music game-screen variants', () => {
    const entries = createKangurGameVariantCatalogEntries(createKangurGameCatalogEntries());
    const melodyEntry = entries.find(
      (candidate) => candidate.variant.id === KANGUR_MUSIC_PIANO_ROLL_VARIANT_IDS.repeatGameScreen
    );
    const freePlayEntry = entries.find(
      (candidate) => candidate.variant.id === KANGUR_MUSIC_PIANO_ROLL_VARIANT_IDS.freePlayGameScreen
    );

    expect(melodyEntry?.isGameScreenVariant).toBe(true);
    expect(melodyEntry?.launchableScreen).toBe(
      KANGUR_MUSIC_PIANO_ROLL_LAUNCHABLE_RUNTIME_IDS.repeat
    );
    expect(melodyEntry?.launchableRuntime).toMatchObject({
      screen: KANGUR_MUSIC_PIANO_ROLL_LAUNCHABLE_RUNTIME_IDS.repeat,
      rendererId: KANGUR_MUSIC_PIANO_ROLL_RENDERER_IDS.repeat,
      engineId: KANGUR_MUSIC_PIANO_ROLL_ENGINE_IDS.repeat,
    });

    expect(freePlayEntry?.isGameScreenVariant).toBe(true);
    expect(freePlayEntry?.launchableScreen).toBe(
      KANGUR_MUSIC_PIANO_ROLL_LAUNCHABLE_RUNTIME_IDS.freePlay
    );
    expect(freePlayEntry?.launchableRuntime).toMatchObject({
      screen: KANGUR_MUSIC_PIANO_ROLL_LAUNCHABLE_RUNTIME_IDS.freePlay,
      rendererId: KANGUR_MUSIC_PIANO_ROLL_RENDERER_IDS.freePlay,
      engineId: KANGUR_MUSIC_PIANO_ROLL_ENGINE_IDS.freePlay,
    });
  });

  it('attaches launchable runtimes to the seeded alphabet game-screen variants', () => {
    const entries = createKangurGameVariantCatalogEntries(createKangurGameCatalogEntries());
    const wordsEntry = entries.find(
      (candidate) => candidate.variant.id === 'alphabet_first_words.game-screen'
    );
    const matchingEntry = entries.find(
      (candidate) => candidate.variant.id === 'alphabet_letter_matching.game-screen'
    );
    const orderEntry = entries.find(
      (candidate) => candidate.variant.id === 'alphabet_letter_order.game-screen'
    );

    expect(wordsEntry?.isGameScreenVariant).toBe(true);
    expect(wordsEntry?.launchableScreen).toBe('alphabet_first_words_quiz');
    expect(wordsEntry?.launchableRuntime).toMatchObject({
      screen: 'alphabet_first_words_quiz',
      rendererId: 'alphabet_literacy_game',
      engineId: 'letter-match-engine',
    });

    expect(matchingEntry?.isGameScreenVariant).toBe(true);
    expect(matchingEntry?.launchableScreen).toBe('alphabet_letter_matching_quiz');
    expect(matchingEntry?.launchableRuntime).toMatchObject({
      screen: 'alphabet_letter_matching_quiz',
      rendererId: 'alphabet_literacy_game',
      engineId: 'letter-match-engine',
    });

    expect(orderEntry?.isGameScreenVariant).toBe(true);
    expect(orderEntry?.launchableScreen).toBe('alphabet_letter_order_quiz');
    expect(orderEntry?.launchableRuntime).toMatchObject({
      screen: 'alphabet_letter_order_quiz',
      rendererId: 'logical_patterns_workshop_game',
      engineId: 'pattern-sequence-engine',
    });
  });

  it('keeps the stored seeded arithmetic .lesson-stage ids unbound once lessons use launchable instances', () => {
    const entries = createKangurGameVariantCatalogEntries(createKangurGameCatalogEntries());
    const addingBallEntry = entries.find(
      (candidate) => candidate.variant.id === 'adding_ball.lesson-stage'
    );
    const addingSynthesisEntry = entries.find(
      (candidate) => candidate.variant.id === 'adding_synthesis.lesson-stage'
    );
    const multiplicationArrayEntry = entries.find(
      (candidate) => candidate.variant.id === 'multiplication_array.lesson-stage'
    );
    const subtractingEntry = entries.find(
      (candidate) => candidate.variant.id === 'subtracting_garden.lesson-stage'
    );
    const divisionEntry = entries.find(
      (candidate) => candidate.variant.id === 'division_groups.lesson-stage'
    );

    expect(addingBallEntry?.launchableRuntime).toBeNull();
    expect(addingSynthesisEntry?.launchableRuntime).toBeNull();
    expect(multiplicationArrayEntry?.launchableRuntime).toBeNull();
    expect(subtractingEntry?.launchableRuntime).toBeNull();
    expect(divisionEntry?.launchableRuntime).toBeNull();
  });

  it('attaches shared launchable runtimes to the seeded arithmetic game-screen variants', () => {
    const entries = createKangurGameVariantCatalogEntries(createKangurGameCatalogEntries());
    const addingEntry = entries.find((candidate) => candidate.variant.id === 'adding_ball.game-screen');
    const addingSynthesisEntry = entries.find(
      (candidate) => candidate.variant.id === 'adding_synthesis.game-screen'
    );
    const subtractingEntry = entries.find(
      (candidate) => candidate.variant.id === 'subtracting_garden.game-screen'
    );

    expect(addingEntry?.isGameScreenVariant).toBe(true);
    expect(addingEntry?.launchableScreen).toBe('addition_quiz');
    expect(addingEntry?.launchableRuntime).toMatchObject({
      screen: 'addition_quiz',
      rendererId: 'adding_ball_game',
      engineId: 'quantity-drag-engine',
    });

    expect(addingSynthesisEntry?.isGameScreenVariant).toBe(true);
    expect(addingSynthesisEntry?.launchableScreen).toBe('adding_synthesis_quiz');
    expect(addingSynthesisEntry?.launchableRuntime).toMatchObject({
      screen: 'adding_synthesis_quiz',
      rendererId: 'adding_synthesis_game',
      engineId: 'rhythm-answer-engine',
    });

    expect(subtractingEntry?.isGameScreenVariant).toBe(true);
    expect(subtractingEntry?.launchableScreen).toBe('subtraction_quiz');
    expect(subtractingEntry?.launchableRuntime).toMatchObject({
      screen: 'subtraction_quiz',
      rendererId: 'subtracting_game',
      engineId: 'quantity-drag-engine',
    });
  });

  it('filters variants by variant-specific and shared catalog attributes', () => {
    const filtered = filterKangurGameVariantCatalogEntries(
      createKangurGameVariantCatalogEntries(createKangurGameCatalogEntries()),
      {
        subject: 'english',
        variantSurface: 'game_screen',
        launchableOnly: true,
      }
    );

    expect(filtered.map((entry) => entry.variant.id)).toEqual([
      'english_subject_verb_agreement.game-screen',
      'english_going_to_plan_parade.game-screen',
      'english_adjectives_scene.game-screen',
      'english_compare_and_crown.game-screen',
      'english_adverbs_action_studio.game-screen',
      'english_adverbs_frequency_routine.game-screen',
      'english_articles_drag_drop.game-screen',
      'english_prepositions_sort.game-screen',
      'english_prepositions_time_place.game-screen',
      'english_prepositions_order.game-screen',
      'english_pronouns_warmup.game-screen',
      'english_sentence_builder.game-screen',
      'english_parts_of_speech_sort.game-screen',
    ]);
  });

  it('filters variants by engine category', () => {
    const filtered = filterKangurGameVariantCatalogEntries(
      createKangurGameVariantCatalogEntries(createKangurGameCatalogEntries()),
      {
        engineCategory: 'foundational',
        variantSurface: 'game_screen',
      }
    );

    expect(filtered.every((entry) => entry.engine?.category === 'foundational')).toBe(true);
    expect(filtered.every((entry) => entry.variant.surface === 'game_screen')).toBe(true);
    expect(filtered.map((entry) => entry.variant.id)).toEqual(
      expect.arrayContaining([
        'geometry_shape_workshop.game-screen',
        'geometry_symmetry_studio.game-screen',
        'geometry_perimeter_trainer.game-screen',
        'clock_training.game-screen',
        'english_sentence_builder.game-screen',
      ])
    );
    expect(filtered.length).toBeGreaterThanOrEqual(5);
  });

  it('filters variants by implementation ownership', () => {
    const filtered = filterKangurGameVariantCatalogEntries(
      createKangurGameVariantCatalogEntries(createKangurGameCatalogEntries()),
      {
        implementationOwnership: 'mixed_runtime',
      }
    );

    expect(filtered).toEqual([]);
    expect(filtered.some((entry) => entry.game.id === 'alphabet_letter_order')).toBe(false);
    expect(filtered.some((entry) => entry.game.id === 'clock_training')).toBe(false);
  });
});
