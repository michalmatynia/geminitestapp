import type {
  KangurGameEngineId,
  KangurGameEngineImplementation,
  KangurGameEngineImplementationOwnership,
} from '@/shared/contracts/kangur-games';
import {
  KANGUR_MUSIC_PIANO_ROLL_ENGINE_IMPLEMENTATIONS,
} from './music-piano-roll-contract';

export type {
  KangurGameEngineImplementation,
  KangurGameEngineImplementationOwnership,
} from '@/shared/contracts/kangur-games';

export type KangurGameEngineImplementationFilter = {
  engineId?: KangurGameEngineId;
  ownership?: KangurGameEngineImplementationOwnership;
};

export const KANGUR_GAME_ENGINE_IMPLEMENTATIONS: readonly KangurGameEngineImplementation[] = [
  {
    engineId: 'clock-dial-engine',
    ownership: 'shared_runtime',
    runtimeIds: ['clock_training_game', 'ClockTrainingStageGame'],
    summary:
      'Clock practice now runs through shared lesson and fullscreen engine surfaces, with lesson usage stored as reusable instances instead of lesson-local wrappers.',
  },
  {
    engineId: 'calendar-grid-engine',
    ownership: 'shared_runtime',
    runtimeIds: ['calendar_interactive_game', 'CalendarInteractiveStageGame', 'calendar_training_game'],
    summary:
      'Calendar practice is extracted into shared lesson and fullscreen engine surfaces, with reusable instances replacing lesson-local runtime wiring.',
  },
  {
    engineId: 'quantity-drag-engine',
    ownership: 'shared_runtime',
    runtimeIds: ['adding_ball_game', 'subtracting_garden_game'],
    summary:
      'Quantity drag mechanics already live in reusable arithmetic game components shared across addition and subtraction variants.',
  },
  {
    engineId: 'rhythm-answer-engine',
    ownership: 'shared_runtime',
    runtimeIds: ['adding_synthesis_game'],
    summary:
      'Rhythm-based answer rounds now flow through a dedicated shared component and fullscreen runtime that can back more fluency variants.',
  },
  {
    engineId: 'array-builder-engine',
    ownership: 'shared_runtime',
    runtimeIds: ['multiplication_array_game'],
    summary:
      'Array construction already uses a standalone shared game component prepared for multiplication-focused variants.',
  },
  {
    engineId: 'choice-quiz-engine',
    ownership: 'shared_runtime',
    runtimeIds: ['division_groups_game', 'multiplication_game', 'division_game'],
    summary:
      'Choice-based arithmetic practice is handled by extracted shared quiz components rather than lesson-local wiring.',
  },
  {
    engineId: 'symbol-tracing-engine',
    ownership: 'shared_runtime',
    runtimeIds: ['AlphabetBasicsLesson', 'AlphabetCopyLesson', 'useKangurDrawingEngine'],
    summary:
      'Tracing lessons now share the extracted Kangur drawing runtime instead of each lesson owning its own canvas input lifecycle.',
  },
  {
    engineId: 'shape-drawing-engine',
    ownership: 'shared_runtime',
    runtimeIds: ['geometry_drawing_game', 'useKangurDrawingEngine'],
    summary:
      'Shape sketching runs on the shared Kangur drawing runtime with geometry-specific prompts and evaluation layered on top.',
  },
  {
    engineId: 'symmetry-drawing-engine',
    ownership: 'shared_runtime',
    runtimeIds: ['GeometrySymmetryGame', 'useKangurDrawingEngine'],
    summary:
      'Symmetry drawing reuses the shared Kangur drawing runtime while keeping its axis and mirror evaluation logic separate.',
  },
  {
    engineId: 'perimeter-drawing-engine',
    ownership: 'shared_runtime',
    runtimeIds: ['GeometryPerimeterDrawingGame', 'useKangurDrawingEngine'],
    summary:
      'Perimeter drawing uses the same shared Kangur drawing runtime with grid-specific scoring and answer selection layered on top.',
  },
  {
    engineId: 'pattern-sequence-engine',
    ownership: 'shared_runtime',
    runtimeIds: ['logical_patterns_workshop_game', 'AgenticSequenceGame'],
    summary:
      'Pattern sequencing now flows through shared logic runtimes, including the reusable workshop renderer and its launchable instance-backed lesson uses.',
  },
  {
    engineId: 'classification-engine',
    ownership: 'shared_runtime',
    runtimeIds: [
      'logical_classification_game',
      'english_parts_of_speech_game',
      'EnglishPrepositionsSortGame',
      'AgenticApprovalGateGame',
      'AgenticReasoningRouterGame',
      'AgenticSurfaceMatchGame',
      'AgenticAssignmentGame',
      'AgenticSortGame',
    ],
    summary:
      'Classification mechanics are already implemented through reusable shared runtimes across logic, grammar, and adult routing games.',
  },
  {
    engineId: 'relation-match-engine',
    ownership: 'shared_runtime',
    runtimeIds: ['logical_analogies_relation_game'],
    summary:
      'Analogy and relation matching already flow through a dedicated shared game component.',
  },
  {
    engineId: 'sentence-builder-engine',
    ownership: 'shared_runtime',
    runtimeIds: [
      'EnglishSubjectVerbAgreementGame',
      'EnglishAdjectivesSceneGame',
      'EnglishAdverbsFrequencyRoutineGame',
      'EnglishArticlesDragDropGame',
      'EnglishPrepositionsGame',
      'EnglishPrepositionsOrderGame',
      'EnglishPronounsWarmupGame',
      'english_sentence_structure_game',
    ],
    summary:
      'English grammar rounds now flow through shared sentence-building runtimes reused across lesson, library, and fullscreen surfaces.',
  },
  {
    engineId: 'color-harmony-engine',
    ownership: 'shared_runtime',
    runtimeIds: ['ColorHarmonyGame'],
    summary:
      'Color harmony now runs through a reusable shared palette-matching component instead of staying embedded in one lesson shell.',
  },
  {
    engineId: 'letter-match-engine',
    ownership: 'shared_runtime',
    runtimeIds: ['AlphabetLiteracyGame'],
    summary:
      'Letter matching now uses a single shared literacy runtime that powers launchable instances across first words and uppercase-lowercase pairing.',
  },
  ...KANGUR_MUSIC_PIANO_ROLL_ENGINE_IMPLEMENTATIONS,
  {
    engineId: 'shape-recognition-engine',
    ownership: 'shared_runtime',
    runtimeIds: ['ArtShapesRotationGapGame', 'ShapeRecognitionGame'],
    summary:
      'Shape recognition now uses shared runtime components for both art rotation and geometry spotting variants.',
  },
  {
    engineId: 'diagram-sketch-engine',
    ownership: 'shared_runtime',
    runtimeIds: ['AgenticDiagramFillGame', 'AgenticDrawGame', 'useKangurDrawingEngine'],
    summary:
      'Adult diagram, checkpoint tracing, and workflow sketching reuse the shared Kangur drawing runtime with task-specific evaluation layered on top.',
  },
  {
    engineId: 'token-trim-engine',
    ownership: 'shared_runtime',
    runtimeIds: ['AgenticPromptTrimGame', 'AgenticTrimGame'],
    summary:
      'Prompt trimming is already implemented through reusable shared runtime components rather than lesson-specific code.',
  },
];

const cloneKangurGameEngineImplementation = (
  implementation: KangurGameEngineImplementation
): KangurGameEngineImplementation => ({
  ...implementation,
  runtimeIds: implementation.runtimeIds.slice(),
});

export const createDefaultKangurGameEngineImplementations = (): KangurGameEngineImplementation[] =>
  KANGUR_GAME_ENGINE_IMPLEMENTATIONS.map(cloneKangurGameEngineImplementation);

export const filterKangurGameEngineImplementations = (
  implementations: readonly KangurGameEngineImplementation[],
  filter?: KangurGameEngineImplementationFilter
): KangurGameEngineImplementation[] => {
  let next = implementations.slice();

  if (filter?.engineId) {
    next = next.filter((implementation) => implementation.engineId === filter.engineId);
  }

  if (filter?.ownership) {
    next = next.filter((implementation) => implementation.ownership === filter.ownership);
  }

  return next.map(cloneKangurGameEngineImplementation);
};

export const getOptionalKangurGameEngineImplementation = (
  engineId: string
): KangurGameEngineImplementation | null =>
  KANGUR_GAME_ENGINE_IMPLEMENTATIONS.find((implementation) => implementation.engineId === engineId) ??
  null;

export const getKangurGameEngineImplementation = (
  engineId: KangurGameEngineId
): KangurGameEngineImplementation => {
  const implementation = getOptionalKangurGameEngineImplementation(engineId);

  if (!implementation) {
    throw new Error(`Missing Kangur game engine implementation for "${engineId}".`);
  }

  return implementation;
};
