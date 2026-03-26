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
    runtimeIds: ['clock_training_game'],
    summary:
      'Clock practice already runs through a shared runtime component reused across lesson blocks and fullscreen play.',
  },
  {
    engineId: 'calendar-grid-engine',
    ownership: 'shared_runtime',
    runtimeIds: ['calendar_interactive_game', 'calendar_training_game'],
    summary:
      'Calendar practice is extracted into shared lesson and fullscreen runtime components instead of staying embedded in one lesson shell.',
  },
  {
    engineId: 'quantity-drag-engine',
    ownership: 'shared_runtime',
    runtimeIds: [
      'adding_ball_lesson_stage',
      'subtracting_garden_lesson_stage',
      'adding_ball_game',
      'subtracting_garden_game',
    ],
    summary:
      'Quantity drag mechanics already live in reusable arithmetic game components and serialized lesson-stage runtimes shared across addition and subtraction variants.',
  },
  {
    engineId: 'rhythm-answer-engine',
    ownership: 'shared_runtime',
    runtimeIds: ['adding_synthesis_lesson_stage', 'adding_synthesis_game'],
    summary:
      'Rhythm-based answer rounds are already implemented in a dedicated shared component and lesson-stage runtime that can back more fluency variants.',
  },
  {
    engineId: 'array-builder-engine',
    ownership: 'shared_runtime',
    runtimeIds: ['multiplication_array_lesson_stage', 'multiplication_array_game'],
    summary:
      'Array construction already uses a standalone shared game component and serialized lesson-stage runtime prepared for multiplication-focused variants.',
  },
  {
    engineId: 'choice-quiz-engine',
    ownership: 'shared_runtime',
    runtimeIds: ['division_groups_lesson_stage', 'division_groups_game', 'multiplication_game', 'division_game'],
    summary:
      'Choice-based arithmetic practice is already handled by extracted shared quiz components and serialized lesson-stage runtimes rather than lesson-local wiring.',
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
    runtimeIds: [
      'geometry_shape_drawing_lesson_stage',
      'geometry_drawing_game',
      'useKangurDrawingEngine',
    ],
    summary:
      'Shape sketching runs on the shared Kangur drawing runtime with geometry-specific prompts and evaluation layered on top.',
  },
  {
    engineId: 'symmetry-drawing-engine',
    ownership: 'shared_runtime',
    runtimeIds: [
      'geometry_symmetry_studio_lesson_stage',
      'GeometrySymmetryGame',
      'useKangurDrawingEngine',
    ],
    summary:
      'Symmetry drawing reuses the shared Kangur drawing runtime while keeping its axis and mirror evaluation logic separate.',
  },
  {
    engineId: 'perimeter-drawing-engine',
    ownership: 'shared_runtime',
    runtimeIds: [
      'geometry_perimeter_trainer_lesson_stage',
      'GeometryPerimeterDrawingGame',
      'useKangurDrawingEngine',
    ],
    summary:
      'Perimeter drawing uses the same shared Kangur drawing runtime with grid-specific scoring and answer selection layered on top.',
  },
  {
    engineId: 'pattern-sequence-engine',
    ownership: 'mixed_runtime',
    runtimeIds: [
      'logical_patterns_workshop_lesson_stage',
      'logical_patterns_workshop_game',
      'AgenticSequenceGame',
      'AlphabetSequenceLesson',
    ],
    summary:
      'Pattern sequencing is partly consolidated into shared logic runtimes, but the alphabet sequence variant is still lesson-embedded.',
  },
  {
    engineId: 'classification-engine',
    ownership: 'shared_runtime',
    runtimeIds: [
      'agentic_approval_gate_lesson_stage',
      'agentic_reasoning_router_lesson_stage',
      'logical_classification_lab_lesson_stage',
      'logical_classification_game',
      'english_parts_of_speech_sort_lesson_stage',
      'english_parts_of_speech_game',
      'AgenticApprovalGateGame',
      'AgenticReasoningRouterGame',
      'AgenticAssignmentGame',
      'AgenticSortGame',
    ],
    summary:
      'Classification mechanics are already implemented through reusable shared runtimes across logic, grammar, and adult routing games.',
  },
  {
    engineId: 'relation-match-engine',
    ownership: 'shared_runtime',
    runtimeIds: [
      'logical_analogies_relations_lesson_stage',
      'logical_analogies_relation_game',
    ],
    summary:
      'Analogy and relation matching already flow through a dedicated shared game component.',
  },
  {
    engineId: 'sentence-builder-engine',
    ownership: 'shared_runtime',
    runtimeIds: ['english_sentence_builder_lesson_stage', 'english_sentence_structure_game'],
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
    runtimeIds: ['music_melody_repeat_lesson_stage', 'MusicMelodyRepeatGame'],
    summary:
      'Melody repetition is already implemented as a reusable shared music game component.',
  },
  {
    engineId: 'piano-roll-engine',
    ownership: 'shared_runtime',
    runtimeIds: ['music_piano_roll_free_play_lesson_stage', 'MusicPianoRollFreePlayGame'],
    summary:
      'Piano exploration already uses a shared runtime component that can be embedded without lesson-specific engine code.',
  },
  {
    engineId: 'shape-recognition-engine',
    ownership: 'mixed_runtime',
    runtimeIds: [
      'art_shape_rotation_puzzle_lesson_stage',
      'ArtShapesRotationGapGame',
      'ShapeRecognitionGame',
    ],
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
    runtimeIds: ['agentic_prompt_trim_lesson_stage', 'AgenticPromptTrimGame', 'AgenticTrimGame'],
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
