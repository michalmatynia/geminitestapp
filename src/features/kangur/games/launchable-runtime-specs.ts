import type {
  KangurLaunchableGameRuntimeSpec,
  KangurLaunchableGameRuntimeFinishLabelProp,
  KangurLaunchableGameRuntimeFinishMode,
  KangurLaunchableGameScreen,
} from '@/shared/contracts/kangur-games';
import { kangurLaunchableGameRuntimeSpecSchema } from '@/shared/contracts/kangur-games';

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

export const KANGUR_LAUNCHABLE_GAME_RUNTIME_SPECS = Object.freeze({
  calendar_quiz: createLaunchableGameRuntimeSpec({
    kind: 'launchable_game_screen',
    screen: 'calendar_quiz',
    engineId: 'calendar-grid-engine',
    rendererId: 'calendar_training_game',
    stage: {
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
    stage: {
      accent: 'violet',
      icon: '🔷',
      shellTestId: 'kangur-geometry-training-top-section',
    },
  }),
  clock_quiz: createLaunchableGameRuntimeSpec({
    kind: 'launchable_game_screen',
    screen: 'clock_quiz',
    engineId: 'clock-dial-engine',
    rendererId: 'clock_training_game',
    finishMode: 'return_to_game_home',
    finishLabelProp: 'completionPrimaryActionLabel',
    stage: {
      accent: 'indigo',
      icon: '🕐',
      shellTestId: 'kangur-clock-quiz-top-section',
    },
  }),
  addition_quiz: createLaunchableGameRuntimeSpec({
    kind: 'launchable_game_screen',
    screen: 'addition_quiz',
    engineId: 'quantity-drag-engine',
    rendererId: 'adding_ball_game',
    finishMode: 'play_variant',
    finishLabelProp: 'finishLabelVariant',
    stage: {
      accent: 'amber',
      icon: '➕',
      shellTestId: 'kangur-addition-quiz-top-section',
    },
  }),
  subtraction_quiz: createLaunchableGameRuntimeSpec({
    kind: 'launchable_game_screen',
    screen: 'subtraction_quiz',
    engineId: 'quantity-drag-engine',
    rendererId: 'subtracting_game',
    finishMode: 'play_variant',
    finishLabelProp: 'finishLabelVariant',
    stage: {
      accent: 'rose',
      icon: '➖',
      shellTestId: 'kangur-subtraction-quiz-top-section',
    },
  }),
  multiplication_quiz: createLaunchableGameRuntimeSpec({
    kind: 'launchable_game_screen',
    screen: 'multiplication_quiz',
    engineId: 'choice-quiz-engine',
    rendererId: 'multiplication_game',
    finishMode: 'play_variant',
    finishLabelProp: 'finishLabelVariant',
    stage: {
      accent: 'violet',
      icon: '✖️',
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
    stage: {
      accent: 'emerald',
      icon: '➗',
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
    stage: {
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
    stage: {
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
    stage: {
      accent: 'rose',
      icon: '🔗',
      shellTestId: 'kangur-logical-analogies-quiz-top-section',
    },
  }),
  english_sentence_quiz: createLaunchableGameRuntimeSpec({
    kind: 'launchable_game_screen',
    screen: 'english_sentence_quiz',
    engineId: 'sentence-builder-engine',
    rendererId: 'english_sentence_structure_game',
    finishMode: 'return_to_game_home',
    finishLabelProp: 'finishLabel',
    stage: {
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
    stage: {
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
