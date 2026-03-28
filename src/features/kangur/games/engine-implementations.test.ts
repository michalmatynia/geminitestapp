import { describe, expect, it } from 'vitest';

import {
  KANGUR_GAME_ENGINE_IMPLEMENTATIONS,
  KANGUR_MUSIC_PIANO_ROLL_ENGINE_IMPLEMENTATIONS,
  KANGUR_MUSIC_PIANO_ROLL_ENGINE_IDS,
  KANGUR_MUSIC_PIANO_ROLL_RUNTIME_COMPONENT_IDS,
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

  it('tracks which engine families are shared-runtime versus still lesson-embedded', () => {
    expect(getKangurGameEngineImplementation('shape-drawing-engine').ownership).toBe(
      'shared_runtime'
    );
    expect(getKangurGameEngineImplementation('symbol-tracing-engine').ownership).toBe(
      'shared_runtime'
    );
    expect(getKangurGameEngineImplementation('pattern-sequence-engine').ownership).toBe(
      'shared_runtime'
    );
    expect(getKangurGameEngineImplementation('shape-recognition-engine').ownership).toBe(
      'shared_runtime'
    );
    expect(getKangurGameEngineImplementation('letter-match-engine').ownership).toBe(
      'shared_runtime'
    );
    expect(getKangurGameEngineImplementation('color-harmony-engine').ownership).toBe(
      'shared_runtime'
    );
  });

  it('resolves runtime component identifiers for extracted engine families', () => {
    expect(getKangurGameEngineImplementation('calendar-grid-engine').runtimeIds).toEqual([
      'calendar_interactive_game',
      'CalendarInteractiveLessonGame',
      'calendar_training_game',
    ]);
    expect(getKangurGameEngineImplementation('clock-dial-engine').runtimeIds).toEqual([
      'clock_training_game',
      'ClockTrainingLessonGame',
    ]);
    expect(getKangurGameEngineImplementation('quantity-drag-engine').runtimeIds).toEqual([
      'adding_ball_game',
      'subtracting_garden_game',
    ]);
    expect(getKangurGameEngineImplementation('rhythm-answer-engine').runtimeIds).toEqual([
      'adding_synthesis_game',
    ]);
    expect(getKangurGameEngineImplementation('array-builder-engine').runtimeIds).toEqual([
      'multiplication_array_game',
    ]);
    expect(getKangurGameEngineImplementation('classification-engine').runtimeIds).toEqual([
      'logical_classification_game',
      'english_parts_of_speech_game',
      'EnglishPrepositionsSortGame',
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
      'GeometrySymmetryGame',
      'useKangurDrawingEngine',
    ]);
    expect(getKangurGameEngineImplementation('perimeter-drawing-engine').runtimeIds).toEqual([
      'GeometryPerimeterDrawingGame',
      'useKangurDrawingEngine',
    ]);
    expect(getKangurGameEngineImplementation('shape-drawing-engine').runtimeIds).toEqual([
      'geometry_drawing_game',
      'useKangurDrawingEngine',
    ]);
    expect(getKangurGameEngineImplementation('sentence-builder-engine').runtimeIds).toEqual([
      'EnglishSubjectVerbAgreementGame',
      'EnglishAdjectivesSceneGame',
      'EnglishComparativesSuperlativesCrownGame',
      'EnglishAdverbsActionStudioGame',
      'EnglishAdverbsFrequencyRoutineGame',
      'EnglishArticlesDragDropGame',
      'EnglishPrepositionsGame',
      'EnglishPrepositionsOrderGame',
      'EnglishPronounsWarmupGame',
      'english_sentence_structure_game',
    ]);
    expect(getKangurGameEngineImplementation('choice-quiz-engine').runtimeIds).toEqual([
      'division_groups_game',
      'multiplication_game',
      'division_game',
    ]);
    expect(getKangurGameEngineImplementation('pattern-sequence-engine').runtimeIds).toEqual([
      'logical_patterns_workshop_game',
      'AgenticSequenceGame',
    ]);
    expect(
      getKangurGameEngineImplementation(KANGUR_MUSIC_PIANO_ROLL_ENGINE_IDS.repeat).runtimeIds
    ).toEqual([
      KANGUR_MUSIC_PIANO_ROLL_RUNTIME_COMPONENT_IDS.repeat,
    ]);
    expect(
      getKangurGameEngineImplementation(KANGUR_MUSIC_PIANO_ROLL_ENGINE_IDS.freePlay).runtimeIds
    ).toEqual([
      KANGUR_MUSIC_PIANO_ROLL_RUNTIME_COMPONENT_IDS.freePlay,
    ]);
    expect(getKangurGameEngineImplementation('shape-recognition-engine').runtimeIds).toEqual([
      'ArtShapesRotationGapGame',
      'ShapeRecognitionGame',
    ]);
    expect(getKangurGameEngineImplementation('letter-match-engine').runtimeIds).toEqual([
      'AlphabetLiteracyGame',
    ]);
    expect(getKangurGameEngineImplementation('color-harmony-engine').runtimeIds).toEqual([
      'ColorHarmonyGame',
    ]);
    expect(getKangurGameEngineImplementation('symbol-tracing-engine').runtimeIds).toEqual([
      'AlphabetBasicsLesson',
      'AlphabetCopyLesson',
      'useKangurDrawingEngine',
    ]);
    expect(getKangurGameEngineImplementation('token-trim-engine').runtimeIds).toEqual([
      'AgenticPromptTrimGame',
      'AgenticTrimGame',
    ]);
    expect(
      KANGUR_MUSIC_PIANO_ROLL_ENGINE_IMPLEMENTATIONS.map((entry) =>
        getKangurGameEngineImplementation(entry.engineId)
      )
    ).toEqual(KANGUR_MUSIC_PIANO_ROLL_ENGINE_IMPLEMENTATIONS);
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
      'ClockTrainingLessonGame',
    ]);
  });
});
