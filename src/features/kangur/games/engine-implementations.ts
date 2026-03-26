import type {
  KangurGameEngineId,
  KangurGameEngineImplementation,
  KangurGameEngineImplementationOwnership,
} from '@/shared/contracts/kangur-games';

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
    runtimeIds: ['ClockTrainingGame'],
    summary:
      'Clock practice already runs through a shared runtime component reused across lesson blocks and fullscreen play.',
  },
  {
    engineId: 'calendar-grid-engine',
    ownership: 'shared_runtime',
    runtimeIds: ['CalendarInteractiveGame', 'CalendarTrainingGame'],
    summary:
      'Calendar practice is extracted into shared lesson and fullscreen runtime components instead of staying embedded in one lesson shell.',
  },
  {
    engineId: 'quantity-drag-engine',
    ownership: 'shared_runtime',
    runtimeIds: ['AddingBallGame', 'SubtractingGardenGame'],
    summary:
      'Quantity drag mechanics already live in reusable arithmetic game components shared across addition and subtraction variants.',
  },
  {
    engineId: 'rhythm-answer-engine',
    ownership: 'shared_runtime',
    runtimeIds: ['AddingSynthesisGame'],
    summary:
      'Rhythm-based answer rounds are already implemented in a dedicated shared component that can back more fluency variants.',
  },
  {
    engineId: 'array-builder-engine',
    ownership: 'shared_runtime',
    runtimeIds: ['MultiplicationArrayGame'],
    summary:
      'Array construction already uses a standalone shared game component prepared for multiplication-focused variants.',
  },
  {
    engineId: 'choice-quiz-engine',
    ownership: 'shared_runtime',
    runtimeIds: ['MultiplicationGame', 'DivisionGroupsGame'],
    summary:
      'Choice-based arithmetic practice is already handled by extracted shared quiz components rather than lesson-local wiring.',
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
    runtimeIds: ['GeometryDrawingGame', 'useKangurDrawingEngine'],
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
    ownership: 'mixed_runtime',
    runtimeIds: ['LogicalPatternsWorkshopGame', 'AgenticSequenceGame', 'AlphabetSequenceLesson'],
    summary:
      'Pattern sequencing is partly consolidated into shared logic runtimes, but the alphabet sequence variant is still lesson-embedded.',
  },
  {
    engineId: 'classification-engine',
    ownership: 'shared_runtime',
    runtimeIds: [
      'LogicalClassificationGame',
      'EnglishPartsOfSpeechGame',
      'AgenticAssignmentGame',
      'AgenticSortGame',
    ],
    summary:
      'Classification mechanics are already implemented through reusable shared runtimes across logic, grammar, and adult routing games.',
  },
  {
    engineId: 'relation-match-engine',
    ownership: 'shared_runtime',
    runtimeIds: ['LogicalAnalogiesRelationGame'],
    summary:
      'Analogy and relation matching already flow through a dedicated shared game component.',
  },
  {
    engineId: 'sentence-builder-engine',
    ownership: 'shared_runtime',
    runtimeIds: ['EnglishSentenceStructureGame'],
    summary:
      'Sentence building is already extracted into a standalone grammar runtime shared between lesson and fullscreen surfaces.',
  },
  {
    engineId: 'color-harmony-engine',
    ownership: 'lesson_embedded',
    runtimeIds: ['ArtColorsHarmonyLesson'],
    summary:
      'Color harmony still lives inside the lesson component and has not been extracted into a reusable shared game runtime yet.',
  },
  {
    engineId: 'letter-match-engine',
    ownership: 'lesson_embedded',
    runtimeIds: ['AlphabetWordsLesson', 'AlphabetMatchingLesson'],
    summary:
      'Letter matching remains split across lesson components and still needs a single shared literacy runtime.',
  },
  {
    engineId: 'melody-repeat-engine',
    ownership: 'shared_runtime',
    runtimeIds: ['MusicMelodyRepeatGame'],
    summary:
      'Melody repetition is already implemented as a reusable shared music game component.',
  },
  {
    engineId: 'piano-roll-engine',
    ownership: 'shared_runtime',
    runtimeIds: ['MusicPianoRollFreePlayGame'],
    summary:
      'Piano exploration already uses a shared runtime component that can be embedded without lesson-specific engine code.',
  },
  {
    engineId: 'shape-recognition-engine',
    ownership: 'mixed_runtime',
    runtimeIds: ['ArtShapesRotationGapGame', 'ShapeRecognitionGame'],
    summary:
      'Shape recognition mixes one shared runtime with a geometry lesson-internal implementation that still needs extraction.',
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
