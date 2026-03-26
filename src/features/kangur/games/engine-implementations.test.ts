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
      'CalendarInteractiveGame',
      'CalendarTrainingGame',
    ]);
    expect(getKangurGameEngineImplementation('classification-engine').runtimeIds).toEqual([
      'LogicalClassificationGame',
      'EnglishPartsOfSpeechGame',
      'AgenticAssignmentGame',
      'AgenticSortGame',
    ]);
    expect(getKangurGameEngineImplementation('diagram-sketch-engine').runtimeIds).toEqual([
      'AgenticDiagramFillGame',
      'AgenticDrawGame',
      'useKangurDrawingEngine',
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
      'ClockTrainingGame',
    ]);
  });
});
