import type {
  KangurLaunchableGameRuntimeSpec,
  KangurLaunchableGameRuntimeFinishLabelProp,
  KangurLaunchableGameRuntimeFinishMode,
  KangurLaunchableGameScreen,
} from '@/shared/contracts/kangur-games';
import { kangurLaunchableGameRuntimeSpecSchema } from '@/shared/contracts/kangur-games';
import {
  KANGUR_MUSIC_PIANO_ROLL_LAUNCHABLE_RUNTIME_CONFIGS,
  KANGUR_MUSIC_PIANO_ROLL_LAUNCHABLE_RUNTIME_IDS,
} from './music-piano-roll-contract';

type KangurLaunchableGameRuntimeSpecInput = Omit<
  KangurLaunchableGameRuntimeSpec,
  'finishMode' | 'finishLabelProp' | 'className'
> & {
  finishMode?: KangurLaunchableGameRuntimeFinishMode;
  finishLabelProp?: KangurLaunchableGameRuntimeFinishLabelProp;
  className?: string;
};

const createLaunchableGameRuntimeSpec = (
  spec: KangurLaunchableGameRuntimeSpecInput
): KangurLaunchableGameRuntimeSpec => kangurLaunchableGameRuntimeSpecSchema.parse(spec);

const createMusicPianoRollLaunchableRuntimeSpec = ({
  engineId,
  rendererId,
  screen,
  shell,
}: {
  engineId: KangurLaunchableGameRuntimeSpec['engineId'];
  rendererId: KangurLaunchableGameRuntimeSpec['rendererId'];
  screen: KangurLaunchableGameScreen;
  shell: Pick<KangurLaunchableGameRuntimeSpec['shell'], 'icon' | 'shellTestId'>;
}): KangurLaunchableGameRuntimeSpec =>
  createLaunchableGameRuntimeSpec({
    kind: 'launchable_game_screen',
    screen,
    engineId,
    rendererId,
    finishMode: 'return_to_game_home',
    finishLabelProp: 'finishLabel',
    shell: {
      accent: 'sky',
      ...shell,
    },
  });

const KANGUR_MUSIC_PIANO_ROLL_LAUNCHABLE_RUNTIME_SPECS = Object.fromEntries(
  Object.values(KANGUR_MUSIC_PIANO_ROLL_LAUNCHABLE_RUNTIME_CONFIGS).map((config) => [
    config.screen,
    createMusicPianoRollLaunchableRuntimeSpec(config),
  ])
) as Record<
  (typeof KANGUR_MUSIC_PIANO_ROLL_LAUNCHABLE_RUNTIME_IDS)[keyof typeof KANGUR_MUSIC_PIANO_ROLL_LAUNCHABLE_RUNTIME_IDS],
  KangurLaunchableGameRuntimeSpec
>;

export const KANGUR_LAUNCHABLE_GAME_RUNTIME_SPECS = Object.freeze({
  agentic_approval_gate_quiz: createLaunchableGameRuntimeSpec({
    kind: 'launchable_game_screen',
    screen: 'agentic_approval_gate_quiz',
    engineId: 'classification-engine',
    rendererId: 'agentic_approval_gate_game',
    finishMode: 'return_to_game_home',
    finishLabelProp: 'finishLabel',
    shell: {
      accent: 'sky',
      icon: '🛡️',
      shellTestId: 'kangur-agentic-approval-gate-top-section',
    },
  }),
  agentic_prompt_trim_quiz: createLaunchableGameRuntimeSpec({
    kind: 'launchable_game_screen',
    screen: 'agentic_prompt_trim_quiz',
    engineId: 'token-trim-engine',
    rendererId: 'agentic_prompt_trim_game',
    finishMode: 'return_to_game_home',
    finishLabelProp: 'finishLabel',
    shell: {
      accent: 'rose',
      icon: '✂️',
      shellTestId: 'kangur-agentic-prompt-trim-top-section',
    },
  }),
  agentic_reasoning_router_quiz: createLaunchableGameRuntimeSpec({
    kind: 'launchable_game_screen',
    screen: 'agentic_reasoning_router_quiz',
    engineId: 'classification-engine',
    rendererId: 'agentic_reasoning_router_game',
    finishMode: 'return_to_game_home',
    finishLabelProp: 'finishLabel',
    shell: {
      accent: 'teal',
      icon: '🎛️',
      shellTestId: 'kangur-agentic-reasoning-router-top-section',
    },
  }),
  agentic_surface_match_quiz: createLaunchableGameRuntimeSpec({
    kind: 'launchable_game_screen',
    screen: 'agentic_surface_match_quiz',
    engineId: 'classification-engine',
    rendererId: 'agentic_surface_match_game',
    finishMode: 'return_to_game_home',
    finishLabelProp: 'finishLabel',
    shell: {
      accent: 'emerald',
      icon: '🧭',
      shellTestId: 'kangur-agentic-surface-match-top-section',
    },
  }),
  alphabet_first_words_quiz: createLaunchableGameRuntimeSpec({
    kind: 'launchable_game_screen',
    screen: 'alphabet_first_words_quiz',
    engineId: 'letter-match-engine',
    rendererId: 'alphabet_literacy_game',
    finishMode: 'return_to_game_home',
    finishLabelProp: 'finishLabel',
    shell: {
      accent: 'amber',
      icon: '📖',
      shellTestId: 'kangur-alphabet-first-words-top-section',
    },
  }),
  alphabet_letter_matching_quiz: createLaunchableGameRuntimeSpec({
    kind: 'launchable_game_screen',
    screen: 'alphabet_letter_matching_quiz',
    engineId: 'letter-match-engine',
    rendererId: 'alphabet_literacy_game',
    finishMode: 'return_to_game_home',
    finishLabelProp: 'finishLabel',
    shell: {
      accent: 'amber',
      icon: '🔤',
      shellTestId: 'kangur-alphabet-letter-matching-top-section',
    },
  }),
  alphabet_letter_order_quiz: createLaunchableGameRuntimeSpec({
    kind: 'launchable_game_screen',
    screen: 'alphabet_letter_order_quiz',
    engineId: 'pattern-sequence-engine',
    rendererId: 'logical_patterns_workshop_game',
    finishMode: 'return_to_game_home',
    finishLabelProp: 'finishLabel',
    shell: {
      accent: 'amber',
      icon: '🧠',
      shellTestId: 'kangur-alphabet-letter-order-top-section',
    },
  }),
  art_color_harmony_quiz: createLaunchableGameRuntimeSpec({
    kind: 'launchable_game_screen',
    screen: 'art_color_harmony_quiz',
    engineId: 'color-harmony-engine',
    rendererId: 'color_harmony_game',
    finishMode: 'return_to_game_home',
    finishLabelProp: 'finishLabel',
    shell: {
      accent: 'amber',
      icon: '🎨',
      shellTestId: 'kangur-art-color-harmony-top-section',
    },
  }),
  art_shape_rotation_quiz: createLaunchableGameRuntimeSpec({
    kind: 'launchable_game_screen',
    screen: 'art_shape_rotation_quiz',
    engineId: 'shape-recognition-engine',
    rendererId: 'art_shapes_rotation_gap_game',
    finishMode: 'return_to_game_home',
    finishLabelProp: 'finishLabel',
    shell: {
      accent: 'amber',
      icon: '🌀',
      shellTestId: 'kangur-art-shape-rotation-top-section',
    },
  }),
  calendar_quiz: createLaunchableGameRuntimeSpec({
    kind: 'launchable_game_screen',
    screen: 'calendar_quiz',
    engineId: 'calendar-grid-engine',
    rendererId: 'calendar_training_game',
    shell: {
      accent: 'emerald',
      icon: '📅',
      shellTestId: 'kangur-calendar-training-top-section',
    },
  }),
  geometry_quiz: createLaunchableGameRuntimeSpec({
    kind: 'launchable_game_screen',
    screen: 'geometry_quiz',
    engineId: 'shape-drawing-engine',
    rendererId: 'geometry_drawing_game',
    shell: {
      accent: 'violet',
      icon: '🔷',
      shellTestId: 'kangur-geometry-training-top-section',
    },
  }),
  geometry_shape_spotter_quiz: createLaunchableGameRuntimeSpec({
    kind: 'launchable_game_screen',
    screen: 'geometry_shape_spotter_quiz',
    engineId: 'shape-recognition-engine',
    rendererId: 'shape_recognition_game',
    finishMode: 'return_to_game_home',
    finishLabelProp: 'finishLabel',
    shell: {
      accent: 'emerald',
      icon: '🔷',
      shellTestId: 'kangur-geometry-shape-spotter-top-section',
    },
  }),
  clock_quiz: createLaunchableGameRuntimeSpec({
    kind: 'launchable_game_screen',
    screen: 'clock_quiz',
    engineId: 'clock-dial-engine',
    rendererId: 'clock_training_game',
    finishMode: 'return_to_game_home',
    finishLabelProp: 'completionPrimaryActionLabel',
    shell: {
      accent: 'indigo',
      icon: '🕐',
      shellTestId: 'kangur-clock-quiz-top-section',
    },
  }),
  ...KANGUR_MUSIC_PIANO_ROLL_LAUNCHABLE_RUNTIME_SPECS,
  addition_quiz: createLaunchableGameRuntimeSpec({
    kind: 'launchable_game_screen',
    screen: 'addition_quiz',
    engineId: 'quantity-drag-engine',
    rendererId: 'adding_ball_game',
    finishMode: 'play_variant',
    finishLabelProp: 'finishLabelVariant',
    shell: {
      accent: 'amber',
      icon: '➕',
      maxWidthClassName: 'max-w-2xl',
      shellTestId: 'kangur-addition-quiz-top-section',
    },
  }),
  adding_synthesis_quiz: createLaunchableGameRuntimeSpec({
    kind: 'launchable_game_screen',
    screen: 'adding_synthesis_quiz',
    engineId: 'rhythm-answer-engine',
    rendererId: 'adding_synthesis_game',
    finishMode: 'return_to_game_home',
    finishLabelProp: 'finishLabel',
    shell: {
      accent: 'amber',
      icon: '🎵',
      maxWidthClassName: 'max-w-[1120px]',
      shellTestId: 'kangur-adding-synthesis-quiz-top-section',
    },
  }),
  subtraction_quiz: createLaunchableGameRuntimeSpec({
    kind: 'launchable_game_screen',
    screen: 'subtraction_quiz',
    engineId: 'quantity-drag-engine',
    rendererId: 'subtracting_game',
    finishMode: 'play_variant',
    finishLabelProp: 'finishLabelVariant',
    shell: {
      accent: 'rose',
      icon: '➖',
      maxWidthClassName: 'max-w-none',
      shellTestId: 'kangur-subtraction-quiz-top-section',
    },
  }),
  multiplication_array_quiz: createLaunchableGameRuntimeSpec({
    kind: 'launchable_game_screen',
    screen: 'multiplication_array_quiz',
    engineId: 'array-builder-engine',
    rendererId: 'multiplication_array_game',
    finishMode: 'return_to_game_home',
    finishLabelProp: 'finishLabel',
    shell: {
      accent: 'violet',
      icon: '🧱',
      maxWidthClassName: 'max-w-none',
      shellTestId: 'kangur-multiplication-array-quiz-top-section',
    },
  }),
  multiplication_quiz: createLaunchableGameRuntimeSpec({
    kind: 'launchable_game_screen',
    screen: 'multiplication_quiz',
    engineId: 'choice-quiz-engine',
    rendererId: 'multiplication_game',
    finishMode: 'play_variant',
    finishLabelProp: 'finishLabelVariant',
    shell: {
      accent: 'violet',
      icon: '✖️',
      maxWidthClassName: 'max-w-none',
      shellTestId: 'kangur-multiplication-quiz-top-section',
    },
  }),
  division_quiz: createLaunchableGameRuntimeSpec({
    kind: 'launchable_game_screen',
    screen: 'division_quiz',
    engineId: 'choice-quiz-engine',
    rendererId: 'division_game',
    finishMode: 'play_variant',
    finishLabelProp: 'finishLabelVariant',
    shell: {
      accent: 'emerald',
      icon: '➗',
      maxWidthClassName: 'max-w-none',
      shellTestId: 'kangur-division-quiz-top-section',
    },
  }),
  logical_patterns_quiz: createLaunchableGameRuntimeSpec({
    kind: 'launchable_game_screen',
    screen: 'logical_patterns_quiz',
    engineId: 'pattern-sequence-engine',
    rendererId: 'logical_patterns_workshop_game',
    finishMode: 'return_to_game_home',
    finishLabelProp: 'finishLabel',
    shell: {
      accent: 'violet',
      icon: '🔢',
      shellTestId: 'kangur-logical-patterns-quiz-top-section',
    },
  }),
  logical_classification_quiz: createLaunchableGameRuntimeSpec({
    kind: 'launchable_game_screen',
    screen: 'logical_classification_quiz',
    engineId: 'classification-engine',
    rendererId: 'logical_classification_game',
    finishMode: 'return_to_game_home',
    finishLabelProp: 'finishLabel',
    shell: {
      accent: 'teal',
      icon: '📦',
      shellTestId: 'kangur-logical-classification-quiz-top-section',
    },
  }),
  logical_analogies_quiz: createLaunchableGameRuntimeSpec({
    kind: 'launchable_game_screen',
    screen: 'logical_analogies_quiz',
    engineId: 'relation-match-engine',
    rendererId: 'logical_analogies_relation_game',
    finishMode: 'return_to_game_home',
    finishLabelProp: 'finishLabel',
    shell: {
      accent: 'rose',
      icon: '🔗',
      shellTestId: 'kangur-logical-analogies-quiz-top-section',
    },
  }),
  english_subject_verb_agreement_quiz: createLaunchableGameRuntimeSpec({
    kind: 'launchable_game_screen',
    screen: 'english_subject_verb_agreement_quiz',
    engineId: 'sentence-builder-engine',
    rendererId: 'english_subject_verb_agreement_game',
    finishMode: 'return_to_game_home',
    finishLabelProp: 'finishLabel',
    shell: {
      accent: 'teal',
      icon: '⚖️',
      shellTestId: 'kangur-english-subject-verb-agreement-quiz-top-section',
    },
  }),
  english_going_to_quiz: createLaunchableGameRuntimeSpec({
    kind: 'launchable_game_screen',
    screen: 'english_going_to_quiz',
    engineId: 'sentence-builder-engine',
    rendererId: 'english_going_to_plan_parade_game',
    finishMode: 'return_to_game_home',
    finishLabelProp: 'finishLabel',
    shell: {
      accent: 'sky',
      icon: '🧳',
      shellTestId: 'kangur-english-going-to-quiz-top-section',
    },
  }),
  english_adjectives_quiz: createLaunchableGameRuntimeSpec({
    kind: 'launchable_game_screen',
    screen: 'english_adjectives_quiz',
    engineId: 'sentence-builder-engine',
    rendererId: 'english_adjectives_scene_game',
    finishMode: 'return_to_game_home',
    finishLabelProp: 'finishLabel',
    shell: {
      accent: 'indigo',
      icon: '🎨',
      shellTestId: 'kangur-english-adjectives-quiz-top-section',
    },
  }),
  english_compare_and_crown_quiz: createLaunchableGameRuntimeSpec({
    kind: 'launchable_game_screen',
    screen: 'english_compare_and_crown_quiz',
    engineId: 'sentence-builder-engine',
    rendererId: 'english_compare_and_crown_game',
    finishMode: 'return_to_game_home',
    finishLabelProp: 'finishLabel',
    shell: {
      accent: 'violet',
      icon: '👑',
      shellTestId: 'kangur-english-compare-and-crown-quiz-top-section',
    },
  }),
  english_adverbs_quiz: createLaunchableGameRuntimeSpec({
    kind: 'launchable_game_screen',
    screen: 'english_adverbs_quiz',
    engineId: 'sentence-builder-engine',
    rendererId: 'english_adverbs_action_game',
    finishMode: 'return_to_game_home',
    finishLabelProp: 'finishLabel',
    shell: {
      accent: 'violet',
      icon: '🎭',
      shellTestId: 'kangur-english-adverbs-quiz-top-section',
    },
  }),
  english_adverbs_frequency_quiz: createLaunchableGameRuntimeSpec({
    kind: 'launchable_game_screen',
    screen: 'english_adverbs_frequency_quiz',
    engineId: 'sentence-builder-engine',
    rendererId: 'english_adverbs_frequency_routine_game',
    finishMode: 'return_to_game_home',
    finishLabelProp: 'finishLabel',
    shell: {
      accent: 'sky',
      icon: '🔁',
      shellTestId: 'kangur-english-adverbs-frequency-quiz-top-section',
    },
  }),
  english_articles_quiz: createLaunchableGameRuntimeSpec({
    kind: 'launchable_game_screen',
    screen: 'english_articles_quiz',
    engineId: 'sentence-builder-engine',
    rendererId: 'english_articles_drag_drop_game',
    finishMode: 'return_to_game_home',
    finishLabelProp: 'finishLabel',
    shell: {
      accent: 'amber',
      icon: '🧲',
      shellTestId: 'kangur-english-articles-quiz-top-section',
    },
  }),
  english_prepositions_quiz: createLaunchableGameRuntimeSpec({
    kind: 'launchable_game_screen',
    screen: 'english_prepositions_quiz',
    engineId: 'sentence-builder-engine',
    rendererId: 'english_prepositions_game',
    finishMode: 'return_to_game_home',
    finishLabelProp: 'finishLabel',
    shell: {
      accent: 'rose',
      icon: '🧭',
      shellTestId: 'kangur-english-prepositions-quiz-top-section',
    },
  }),
  english_prepositions_sort_quiz: createLaunchableGameRuntimeSpec({
    kind: 'launchable_game_screen',
    screen: 'english_prepositions_sort_quiz',
    engineId: 'classification-engine',
    rendererId: 'english_prepositions_sort_game',
    finishMode: 'return_to_game_home',
    finishLabelProp: 'finishLabel',
    shell: {
      accent: 'rose',
      icon: '🧲',
      shellTestId: 'kangur-english-prepositions-sort-quiz-top-section',
    },
  }),
  english_prepositions_order_quiz: createLaunchableGameRuntimeSpec({
    kind: 'launchable_game_screen',
    screen: 'english_prepositions_order_quiz',
    engineId: 'sentence-builder-engine',
    rendererId: 'english_prepositions_order_game',
    finishMode: 'return_to_game_home',
    finishLabelProp: 'finishLabel',
    shell: {
      accent: 'rose',
      icon: '🧩',
      shellTestId: 'kangur-english-prepositions-order-quiz-top-section',
    },
  }),
  english_pronouns_warmup_quiz: createLaunchableGameRuntimeSpec({
    kind: 'launchable_game_screen',
    screen: 'english_pronouns_warmup_quiz',
    engineId: 'sentence-builder-engine',
    rendererId: 'english_pronouns_warmup_game',
    finishMode: 'return_to_game_home',
    finishLabelProp: 'finishLabel',
    shell: {
      accent: 'sky',
      icon: '⚡',
      shellTestId: 'kangur-english-pronouns-warmup-quiz-top-section',
    },
  }),
  english_sentence_quiz: createLaunchableGameRuntimeSpec({
    kind: 'launchable_game_screen',
    screen: 'english_sentence_quiz',
    engineId: 'sentence-builder-engine',
    rendererId: 'english_sentence_structure_game',
    finishMode: 'return_to_game_home',
    finishLabelProp: 'finishLabel',
    shell: {
      accent: 'violet',
      icon: '🧩',
      shellTestId: 'kangur-english-sentence-quiz-top-section',
    },
  }),
  english_parts_of_speech_quiz: createLaunchableGameRuntimeSpec({
    kind: 'launchable_game_screen',
    screen: 'english_parts_of_speech_quiz',
    engineId: 'classification-engine',
    rendererId: 'english_parts_of_speech_game',
    finishMode: 'return_to_game_home',
    finishLabelProp: 'finishLabel',
    shell: {
      accent: 'sky',
      icon: '🎮',
      shellTestId: 'kangur-english-parts-of-speech-quiz-top-section',
    },
  }),
} satisfies Record<KangurLaunchableGameScreen, KangurLaunchableGameRuntimeSpec>);

export const getKangurLaunchableGameRuntimeSpec = (
  screen: KangurLaunchableGameScreen
): KangurLaunchableGameRuntimeSpec => {
  const spec = KANGUR_LAUNCHABLE_GAME_RUNTIME_SPECS[screen];

  if (!spec) {
    throw new Error(`Missing launchable game runtime spec for "${screen}".`);
  }

  return spec;
};
