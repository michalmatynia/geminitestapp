import { describe, expect, it } from 'vitest';

import {
  KANGUR_GAME_ENGINE_IMPLEMENTATIONS,
  createDefaultKangurGameEngineImplementations,
  createDefaultKangurGameEngines,
  filterKangurGameEngineImplementations,
  getKangurGameEngineImplementation,
  getOptionalKangurGameEngineImplementation,
} from '@/features/kangur/games';

describe('kangur game engine implementations', () => {
  it('covers every engine family in the shared game catalog', () => {
    expect(
      KANGUR_GAME_ENGINE_IMPLEMENTATIONS.map((entry) => entry.engineId).sort()
    ).toEqual(createDefaultKangurGameEngines().map((engine) => engine.id).sort());
  });

  it('distinguishes shared, lesson-embedded, and mixed runtime ownership', () => {
    expect(getKangurGameEngineImplementation('shape-drawing-engine').ownership).toBe(
      'shared_runtime'
    );
    expect(getKangurGameEngineImplementation('symbol-tracing-engine').ownership).toBe(
      'shared_runtime'
    );
    expect(getKangurGameEngineImplementation('pattern-sequence-engine').ownership).toBe(
      'mixed_runtime'
    );
    expect(getKangurGameEngineImplementation('shape-recognition-engine').ownership).toBe(
      'mixed_runtime'
    );
  });

  it('resolves runtime component identifiers for extracted engine families', () => {
    expect(getKangurGameEngineImplementation('calendar-grid-engine').runtimeIds).toEqual([
      'calendar_interactive_game',
      'calendar_training_game',
    ]);
    expect(getKangurGameEngineImplementation('quantity-drag-engine').runtimeIds).toEqual([
      'adding_ball_lesson_stage',
      'subtracting_garden_lesson_stage',
      'adding_ball_game',
      'subtracting_garden_game',
    ]);
    expect(getKangurGameEngineImplementation('rhythm-answer-engine').runtimeIds).toEqual([
      'adding_synthesis_lesson_stage',
      'adding_synthesis_game',
    ]);
    expect(getKangurGameEngineImplementation('array-builder-engine').runtimeIds).toEqual([
      'multiplication_array_lesson_stage',
      'multiplication_array_game',
    ]);
    expect(getKangurGameEngineImplementation('classification-engine').runtimeIds).toEqual([
      'agentic_approval_gate_lesson_stage',
      'agentic_reasoning_router_lesson_stage',
      'agentic_surface_match_lesson_stage',
      'logical_classification_lab_lesson_stage',
      'logical_classification_game',
      'english_parts_of_speech_sort_lesson_stage',
      'english_parts_of_speech_game',
      'AgenticApprovalGateGame',
      'AgenticReasoningRouterGame',
      'AgenticSurfaceMatchGame',
      'AgenticAssignmentGame',
      'AgenticSortGame',
    ]);
    expect(getKangurGameEngineImplementation('diagram-sketch-engine').runtimeIds).toEqual([
      'AgenticDiagramFillGame',
      'AgenticDrawGame',
      'useKangurDrawingEngine',
    ]);
    expect(getKangurGameEngineImplementation('symmetry-drawing-engine').runtimeIds).toEqual([
      'geometry_symmetry_studio_lesson_stage',
      'GeometrySymmetryGame',
      'useKangurDrawingEngine',
    ]);
    expect(getKangurGameEngineImplementation('perimeter-drawing-engine').runtimeIds).toEqual([
      'geometry_perimeter_trainer_lesson_stage',
      'GeometryPerimeterDrawingGame',
      'useKangurDrawingEngine',
    ]);
    expect(getKangurGameEngineImplementation('shape-drawing-engine').runtimeIds).toEqual([
      'geometry_shape_drawing_lesson_stage',
      'geometry_drawing_game',
      'useKangurDrawingEngine',
    ]);
    expect(getKangurGameEngineImplementation('sentence-builder-engine').runtimeIds).toEqual([
      'english_sentence_builder_lesson_stage',
      'english_sentence_structure_game',
    ]);
    expect(getKangurGameEngineImplementation('choice-quiz-engine').runtimeIds).toEqual([
      'division_groups_lesson_stage',
      'division_groups_game',
      'multiplication_game',
      'division_game',
    ]);
    expect(getKangurGameEngineImplementation('melody-repeat-engine').runtimeIds).toEqual([
      'music_melody_repeat_lesson_stage',
      'MusicMelodyRepeatGame',
    ]);
    expect(getKangurGameEngineImplementation('piano-roll-engine').runtimeIds).toEqual([
      'music_piano_roll_free_play_lesson_stage',
      'MusicPianoRollFreePlayGame',
    ]);
    expect(getKangurGameEngineImplementation('shape-recognition-engine').runtimeIds).toEqual([
      'art_shape_rotation_puzzle_lesson_stage',
      'ArtShapesRotationGapGame',
      'ShapeRecognitionGame',
    ]);
    expect(getKangurGameEngineImplementation('symbol-tracing-engine').runtimeIds).toEqual([
      'AlphabetBasicsLesson',
      'AlphabetCopyLesson',
      'useKangurDrawingEngine',
    ]);
    expect(getKangurGameEngineImplementation('token-trim-engine').runtimeIds).toEqual([
      'agentic_prompt_trim_lesson_stage',
      'AgenticPromptTrimGame',
      'AgenticTrimGame',
    ]);
    expect(getOptionalKangurGameEngineImplementation('unknown-engine')).toBeNull();
  });

  it('clones and filters engine implementation inventory for shared consumers', () => {
    const cloned = createDefaultKangurGameEngineImplementations();
    const drawingSharedRuntime = filterKangurGameEngineImplementations(cloned, {
      ownership: 'shared_runtime',
      engineId: 'shape-drawing-engine',
    });

    expect(drawingSharedRuntime).toEqual([
      expect.objectContaining({
        engineId: 'shape-drawing-engine',
        ownership: 'shared_runtime',
      }),
    ]);

    cloned[0]?.runtimeIds.push('MutatedRuntime');

    expect(getKangurGameEngineImplementation('clock-dial-engine').runtimeIds).toEqual([
      'clock_training_game',
    ]);
  });
});
