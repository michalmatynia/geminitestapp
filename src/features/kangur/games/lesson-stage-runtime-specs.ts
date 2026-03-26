import type {
  KangurLessonStageGameRuntimeId,
  KangurLessonStageGameRuntimeRendererId,
  KangurLessonStageGameRuntimeSpec,
} from '@/shared/contracts/kangur-games';
import { kangurLessonStageGameRuntimeSpecSchema } from '@/shared/contracts/kangur-games';

type KangurLessonStageGameRuntimeSpecInput = Omit<KangurLessonStageGameRuntimeSpec, 'kind'>;

const createLessonStageGameRuntimeSpec = (
  spec: KangurLessonStageGameRuntimeSpecInput
): KangurLessonStageGameRuntimeSpec =>
  kangurLessonStageGameRuntimeSpecSchema.parse({
    kind: 'lesson_stage_game',
    ...spec,
  });

const createSharedLessonStageGameRuntimeSpec = (
  runtimeId: KangurLessonStageGameRuntimeId,
  rendererId: KangurLessonStageGameRuntimeRendererId,
  engineId?: string,
  rendererProps?: KangurLessonStageGameRuntimeSpec['rendererProps']
): KangurLessonStageGameRuntimeSpec =>
  createLessonStageGameRuntimeSpec({
    runtimeId,
    engineId,
    rendererId,
    rendererProps,
  });

export const KANGUR_LESSON_STAGE_GAME_RUNTIME_SPECS = Object.freeze({
  adding_ball_lesson_stage: createSharedLessonStageGameRuntimeSpec(
    'adding_ball_lesson_stage',
    'adding_ball_game',
    'quantity-drag-engine',
    {
      finishLabelVariant: 'topics',
    }
  ),
  adding_synthesis_lesson_stage: createSharedLessonStageGameRuntimeSpec(
    'adding_synthesis_lesson_stage',
    'adding_synthesis_game',
    'rhythm-answer-engine'
  ),
  agentic_approval_gate_lesson_stage: createSharedLessonStageGameRuntimeSpec(
    'agentic_approval_gate_lesson_stage',
    'agentic_approval_gate_game',
    'classification-engine'
  ),
  agentic_prompt_trim_lesson_stage: createSharedLessonStageGameRuntimeSpec(
    'agentic_prompt_trim_lesson_stage',
    'agentic_prompt_trim_game',
    'token-trim-engine'
  ),
  agentic_reasoning_router_lesson_stage: createSharedLessonStageGameRuntimeSpec(
    'agentic_reasoning_router_lesson_stage',
    'agentic_reasoning_router_game',
    'classification-engine'
  ),
  agentic_surface_match_lesson_stage: createSharedLessonStageGameRuntimeSpec(
    'agentic_surface_match_lesson_stage',
    'agentic_surface_match_game',
    'classification-engine'
  ),
  alphabet_first_words_lesson_stage: createSharedLessonStageGameRuntimeSpec(
    'alphabet_first_words_lesson_stage',
    'alphabet_literacy_stage_game',
    'letter-match-engine',
    {
      literacyMatchSetId: 'alphabet_first_words',
    }
  ),
  alphabet_letter_matching_lesson_stage: createSharedLessonStageGameRuntimeSpec(
    'alphabet_letter_matching_lesson_stage',
    'alphabet_literacy_stage_game',
    'letter-match-engine',
    {
      literacyMatchSetId: 'alphabet_letter_matching',
    }
  ),
  alphabet_letter_order_lesson_stage: createSharedLessonStageGameRuntimeSpec(
    'alphabet_letter_order_lesson_stage',
    'logical_patterns_workshop_game',
    'pattern-sequence-engine',
    {
      patternSetId: 'alphabet_letter_order',
    }
  ),
  art_color_harmony_studio_lesson_stage: createSharedLessonStageGameRuntimeSpec(
    'art_color_harmony_studio_lesson_stage',
    'color_harmony_stage_game',
    'color-harmony-engine'
  ),
  art_shape_rotation_puzzle_lesson_stage: createSharedLessonStageGameRuntimeSpec(
    'art_shape_rotation_puzzle_lesson_stage',
    'art_shapes_rotation_gap_game',
    'shape-recognition-engine'
  ),
  calendar_interactive_days_lesson_stage: createSharedLessonStageGameRuntimeSpec(
    'calendar_interactive_days_lesson_stage',
    'calendar_interactive_stage_game',
    'calendar-grid-engine',
    {
      calendarSection: 'dni',
    }
  ),
  calendar_interactive_months_lesson_stage: createSharedLessonStageGameRuntimeSpec(
    'calendar_interactive_months_lesson_stage',
    'calendar_interactive_stage_game',
    'calendar-grid-engine',
    {
      calendarSection: 'miesiace',
    }
  ),
  calendar_interactive_dates_lesson_stage: createSharedLessonStageGameRuntimeSpec(
    'calendar_interactive_dates_lesson_stage',
    'calendar_interactive_stage_game',
    'calendar-grid-engine',
    {
      calendarSection: 'data',
    }
  ),
  clock_training_hours_lesson_stage: createSharedLessonStageGameRuntimeSpec(
    'clock_training_hours_lesson_stage',
    'clock_training_stage_game',
    'clock-dial-engine',
    {
      clockSection: 'hours',
    }
  ),
  clock_training_minutes_lesson_stage: createSharedLessonStageGameRuntimeSpec(
    'clock_training_minutes_lesson_stage',
    'clock_training_stage_game',
    'clock-dial-engine',
    {
      clockSection: 'minutes',
    }
  ),
  clock_training_combined_lesson_stage: createSharedLessonStageGameRuntimeSpec(
    'clock_training_combined_lesson_stage',
    'clock_training_stage_game',
    'clock-dial-engine',
    {
      clockSection: 'combined',
    }
  ),
  division_groups_lesson_stage: createSharedLessonStageGameRuntimeSpec(
    'division_groups_lesson_stage',
    'division_groups_game',
    'choice-quiz-engine',
    {
      finishLabelVariant: 'topics',
    }
  ),
  english_subject_verb_agreement_lesson_stage: createSharedLessonStageGameRuntimeSpec(
    'english_subject_verb_agreement_lesson_stage',
    'english_subject_verb_agreement_game'
  ),
  english_prepositions_lesson_stage: createSharedLessonStageGameRuntimeSpec(
    'english_prepositions_lesson_stage',
    'english_prepositions_game'
  ),
  english_prepositions_sort_lesson_stage: createSharedLessonStageGameRuntimeSpec(
    'english_prepositions_sort_lesson_stage',
    'english_prepositions_sort_game'
  ),
  english_prepositions_order_lesson_stage: createSharedLessonStageGameRuntimeSpec(
    'english_prepositions_order_lesson_stage',
    'english_prepositions_order_game'
  ),
  english_articles_drag_lesson_stage: createSharedLessonStageGameRuntimeSpec(
    'english_articles_drag_lesson_stage',
    'english_articles_drag_drop_game'
  ),
  english_adjectives_scene_lesson_stage: createSharedLessonStageGameRuntimeSpec(
    'english_adjectives_scene_lesson_stage',
    'english_adjectives_scene_game'
  ),
  english_adverbs_frequency_routine_lesson_stage: createSharedLessonStageGameRuntimeSpec(
    'english_adverbs_frequency_routine_lesson_stage',
    'english_adverbs_frequency_routine_game'
  ),
  english_sentence_builder_lesson_stage: createSharedLessonStageGameRuntimeSpec(
    'english_sentence_builder_lesson_stage',
    'english_sentence_structure_game',
    'sentence-builder-engine'
  ),
  geometry_symmetry_studio_lesson_stage: createSharedLessonStageGameRuntimeSpec(
    'geometry_symmetry_studio_lesson_stage',
    'geometry_symmetry_game',
    'symmetry-drawing-engine'
  ),
  geometry_perimeter_trainer_lesson_stage: createSharedLessonStageGameRuntimeSpec(
    'geometry_perimeter_trainer_lesson_stage',
    'geometry_perimeter_drawing_game',
    'perimeter-drawing-engine'
  ),
  geometry_basics_workshop_lesson_stage: createSharedLessonStageGameRuntimeSpec(
    'geometry_basics_workshop_lesson_stage',
    'geometry_basics_workshop_game'
  ),
  geometry_shape_spotter_lesson_stage: createSharedLessonStageGameRuntimeSpec(
    'geometry_shape_spotter_lesson_stage',
    'shape_recognition_stage_game',
    'shape-recognition-engine'
  ),
  geometry_shape_workshop_lesson_stage: createSharedLessonStageGameRuntimeSpec(
    'geometry_shape_workshop_lesson_stage',
    'geometry_drawing_game',
    'shape-drawing-engine'
  ),
  geometry_shape_drawing_lesson_stage: createSharedLessonStageGameRuntimeSpec(
    'geometry_shape_drawing_lesson_stage',
    'geometry_drawing_game',
    'shape-drawing-engine',
    {
      activityKey: 'training:geometry_shape_recognition:draw',
      lessonKey: 'geometry_shape_recognition',
      operation: 'geometry',
      shapeIds: ['circle', 'oval', 'triangle', 'diamond', 'square', 'rectangle'],
      showDifficultySelector: false,
    }
  ),
  logical_patterns_workshop_lesson_stage: createSharedLessonStageGameRuntimeSpec(
    'logical_patterns_workshop_lesson_stage',
    'logical_patterns_workshop_game',
    'pattern-sequence-engine'
  ),
  logical_classification_lab_lesson_stage: createSharedLessonStageGameRuntimeSpec(
    'logical_classification_lab_lesson_stage',
    'logical_classification_game',
    'classification-engine'
  ),
  logical_analogies_relations_lesson_stage: createSharedLessonStageGameRuntimeSpec(
    'logical_analogies_relations_lesson_stage',
    'logical_analogies_relation_game',
    'relation-match-engine'
  ),
  multiplication_array_lesson_stage: createSharedLessonStageGameRuntimeSpec(
    'multiplication_array_lesson_stage',
    'multiplication_array_game',
    'array-builder-engine',
    {
      finishLabelVariant: 'topics',
    }
  ),
  music_melody_repeat_lesson_stage: createSharedLessonStageGameRuntimeSpec(
    'music_melody_repeat_lesson_stage',
    'music_melody_repeat_game',
    'melody-repeat-engine'
  ),
  music_piano_roll_free_play_lesson_stage: createSharedLessonStageGameRuntimeSpec(
    'music_piano_roll_free_play_lesson_stage',
    'music_piano_roll_free_play_game',
    'piano-roll-engine'
  ),
  subtracting_garden_lesson_stage: createSharedLessonStageGameRuntimeSpec(
    'subtracting_garden_lesson_stage',
    'subtracting_garden_game',
    'quantity-drag-engine',
    {
      finishLabelVariant: 'topics',
    }
  ),
  english_parts_of_speech_sort_lesson_stage: createSharedLessonStageGameRuntimeSpec(
    'english_parts_of_speech_sort_lesson_stage',
    'english_parts_of_speech_game',
    'classification-engine'
  ),
  english_pronouns_warmup_lesson_stage: createSharedLessonStageGameRuntimeSpec(
    'english_pronouns_warmup_lesson_stage',
    'english_pronouns_warmup_game'
  ),
} satisfies Record<KangurLessonStageGameRuntimeId, KangurLessonStageGameRuntimeSpec>);

export const getKangurLessonStageGameRuntimeSpec = (
  runtimeId: KangurLessonStageGameRuntimeId
): KangurLessonStageGameRuntimeSpec => {
  const spec = KANGUR_LESSON_STAGE_GAME_RUNTIME_SPECS[runtimeId];

  if (!spec) {
    throw new Error(`Missing lesson stage game runtime spec for "${runtimeId}".`);
  }

  return spec;
};
