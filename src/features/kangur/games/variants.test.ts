import { describe, expect, it } from 'vitest';

import {
  createKangurGameCatalogEntries,
  createKangurGameVariantCatalogEntries,
  filterKangurGameVariantCatalogEntries,
} from '@/features/kangur/games';

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

  it('attaches lesson-stage runtimes to serialized lesson-stage variants', () => {
    const entry = createKangurGameVariantCatalogEntries(createKangurGameCatalogEntries()).find(
      (candidate) => candidate.variant.id === 'logical_classification_lab.lesson-stage'
    );

    expect(entry?.isLessonVariant).toBe(true);
    expect(entry?.lessonStageRuntime?.rendererId).toBe('logical_classification_game');
    expect(entry?.lessonActivityRuntime).toBeNull();
    expect(entry?.launchableRuntime).toBeNull();
  });

  it('attaches the alphabet sequence lesson-stage runtime to the six-year-old stage variant', () => {
    const entry = createKangurGameVariantCatalogEntries(createKangurGameCatalogEntries()).find(
      (candidate) => candidate.variant.id === 'alphabet_letter_order.lesson-stage'
    );

    expect(entry?.isLessonVariant).toBe(true);
    expect(entry?.lessonStageRuntime).toMatchObject({
      runtimeId: 'alphabet_letter_order_lesson_stage',
      rendererId: 'logical_patterns_workshop_game',
      engineId: 'pattern-sequence-engine',
      rendererProps: {
        patternSetId: 'alphabet_letter_order',
      },
    });
    expect(entry?.lessonActivityRuntime).toBeNull();
    expect(entry?.launchableRuntime).toBeNull();
  });

  it('attaches geometry lesson-stage runtimes to drawing lesson variants', () => {
    const entries = createKangurGameVariantCatalogEntries(createKangurGameCatalogEntries());
    const workshopEntry = entries.find(
      (candidate) => candidate.variant.id === 'geometry_shape_workshop.lesson-stage'
    );
    const entry = entries.find(
      (candidate) => candidate.variant.id === 'geometry_symmetry_studio.lesson-stage'
    );

    expect(workshopEntry?.isLessonVariant).toBe(false);
    expect(workshopEntry?.lessonStageRuntime).toMatchObject({
      runtimeId: 'geometry_shape_workshop_lesson_stage',
      rendererId: 'geometry_drawing_game',
      engineId: 'shape-drawing-engine',
    });
    expect(entry?.isLessonVariant).toBe(true);
    expect(entry?.lessonStageRuntime?.rendererId).toBe('geometry_symmetry_game');
    expect(entry?.lessonStageRuntime?.engineId).toBe('symmetry-drawing-engine');
  });

  it('attaches the sentence-builder lesson-stage runtime to the english lesson variant', () => {
    const entry = createKangurGameVariantCatalogEntries(createKangurGameCatalogEntries()).find(
      (candidate) => candidate.variant.id === 'english_sentence_builder.lesson-stage'
    );

    expect(entry?.isLessonVariant).toBe(true);
    expect(entry?.lessonStageRuntime?.rendererId).toBe('english_sentence_structure_game');
    expect(entry?.lessonStageRuntime?.engineId).toBe('sentence-builder-engine');
  });

  it('attaches shared lesson-stage runtimes to the seeded agentic stage variants', () => {
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

    expect(promptTrimEntry?.lessonStageRuntime).toMatchObject({
      runtimeId: 'agentic_prompt_trim_lesson_stage',
      rendererId: 'agentic_prompt_trim_game',
      engineId: 'token-trim-engine',
    });
    expect(approvalGateEntry?.lessonStageRuntime).toMatchObject({
      runtimeId: 'agentic_approval_gate_lesson_stage',
      rendererId: 'agentic_approval_gate_game',
      engineId: 'classification-engine',
    });
    expect(reasoningRouterEntry?.lessonStageRuntime).toMatchObject({
      runtimeId: 'agentic_reasoning_router_lesson_stage',
      rendererId: 'agentic_reasoning_router_game',
      engineId: 'classification-engine',
    });
    expect(surfaceMatchEntry?.lessonStageRuntime).toMatchObject({
      runtimeId: 'agentic_surface_match_lesson_stage',
      rendererId: 'agentic_surface_match_game',
      engineId: 'classification-engine',
    });
  });

  it('attaches shared lesson-stage runtimes to the seeded six-year-old art and music stage variants', () => {
    const entries = createKangurGameVariantCatalogEntries(createKangurGameCatalogEntries());
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
      (candidate) => candidate.variant.id === 'music_melody_repeat.lesson-stage'
    );
    const freePlayEntry = entries.find(
      (candidate) => candidate.variant.id === 'music_piano_roll_free_play.lesson-stage'
    );

    expect(artEntry?.lessonStageRuntime).toMatchObject({
      runtimeId: 'art_shape_rotation_puzzle_lesson_stage',
      rendererId: 'art_shapes_rotation_gap_game',
      engineId: 'shape-recognition-engine',
    });
    expect(geometrySpotterEntry?.lessonStageRuntime).toMatchObject({
      runtimeId: 'geometry_shape_spotter_lesson_stage',
      rendererId: 'shape_recognition_stage_game',
      engineId: 'shape-recognition-engine',
    });
    expect(geometryDrawingEntry?.lessonStageRuntime).toMatchObject({
      runtimeId: 'geometry_shape_drawing_lesson_stage',
      rendererId: 'geometry_drawing_game',
      engineId: 'shape-drawing-engine',
      rendererProps: {
        activityKey: 'training:geometry_shape_recognition:draw',
        lessonKey: 'geometry_shape_recognition',
        operation: 'geometry',
        shapeIds: ['circle', 'oval', 'triangle', 'diamond', 'square', 'rectangle'],
        showDifficultySelector: false,
      },
    });
    expect(melodyEntry?.lessonStageRuntime).toMatchObject({
      runtimeId: 'music_melody_repeat_lesson_stage',
      rendererId: 'music_melody_repeat_game',
      engineId: 'melody-repeat-engine',
    });
    expect(freePlayEntry?.lessonStageRuntime).toMatchObject({
      runtimeId: 'music_piano_roll_free_play_lesson_stage',
      rendererId: 'music_piano_roll_free_play_game',
      engineId: 'piano-roll-engine',
    });
  });

  it('attaches shared lesson-stage runtimes to the seeded arithmetic stage variants', () => {
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

    expect(addingBallEntry?.lessonStageRuntime).toMatchObject({
      runtimeId: 'adding_ball_lesson_stage',
      rendererId: 'adding_ball_game',
      engineId: 'quantity-drag-engine',
      rendererProps: {
        finishLabelVariant: 'topics',
      },
    });
    expect(addingSynthesisEntry?.lessonStageRuntime).toMatchObject({
      runtimeId: 'adding_synthesis_lesson_stage',
      rendererId: 'adding_synthesis_game',
      engineId: 'rhythm-answer-engine',
    });
    expect(multiplicationArrayEntry?.lessonStageRuntime).toMatchObject({
      runtimeId: 'multiplication_array_lesson_stage',
      rendererId: 'multiplication_array_game',
      engineId: 'array-builder-engine',
      rendererProps: {
        finishLabelVariant: 'topics',
      },
    });
    expect(subtractingEntry?.lessonStageRuntime).toMatchObject({
      runtimeId: 'subtracting_garden_lesson_stage',
      rendererId: 'subtracting_garden_game',
      engineId: 'quantity-drag-engine',
      rendererProps: {
        finishLabelVariant: 'topics',
      },
    });
    expect(divisionEntry?.lessonStageRuntime).toMatchObject({
      runtimeId: 'division_groups_lesson_stage',
      rendererId: 'division_groups_game',
      engineId: 'choice-quiz-engine',
      rendererProps: {
        finishLabelVariant: 'topics',
      },
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
