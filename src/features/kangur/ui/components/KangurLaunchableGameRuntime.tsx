'use client';

import dynamic from 'next/dynamic';
import { useTranslations } from 'next-intl';

import type {
  KangurLaunchableGameRuntimeFinishLabelProp,
  KangurLaunchableGameRuntimeFinishMode,
  KangurLaunchableGameRuntimeRendererId,
  KangurLaunchableGameRuntimeSpec,
} from '@/shared/contracts/kangur-games';
import type { KangurGameRuntimeRendererProps } from '@/shared/contracts/kangur-game-runtime-renderer-props';
import type {
  KangurMiniGameFinishActionProps,
  KangurMiniGameFinishProps,
  KangurMiniGameFinishVariantProps,
} from '@/features/kangur/ui/types';
import { createKangurMusicPianoRollLaunchableOnFinishRendererMap } from '@/features/kangur/ui/components/music/music-piano-roll-launchable-runtime';

const AddingBallGame = dynamic(() => import('@/features/kangur/ui/components/AddingBallGame'), {
  ssr: false,
});
const AddingSynthesisGame = dynamic(
  () => import('@/features/kangur/ui/components/AddingSynthesisGame'),
  { ssr: false }
);
const AgenticApprovalGateGame = dynamic(
  () => import('@/features/kangur/ui/components/AgenticApprovalGateGame'),
  { ssr: false }
);
const AgenticPromptTrimGame = dynamic(
  () => import('@/features/kangur/ui/components/AgenticPromptTrimGame'),
  { ssr: false }
);
const AgenticReasoningRouterGame = dynamic(
  () => import('@/features/kangur/ui/components/AgenticReasoningRouterGame'),
  { ssr: false }
);
const AgenticSurfaceMatchGame = dynamic(
  () => import('@/features/kangur/ui/components/AgenticSurfaceMatchGame'),
  { ssr: false }
);
const AlphabetLiteracyGame = dynamic(
  () => import('@/features/kangur/ui/components/AlphabetLiteracyStageGame'),
  { ssr: false }
);
const ArtShapesRotationGapGame = dynamic(
  () =>
    import('@/features/kangur/ui/components/ArtShapesRotationGapGame').then((module) => ({
      default: module.ArtShapesRotationGapGame,
    })),
  { ssr: false }
);
const CalendarTrainingGame = dynamic(
  () => import('@/features/kangur/ui/components/CalendarTrainingGame'),
  { ssr: false }
);
const ClockTrainingGame = dynamic(
  () => import('@/features/kangur/ui/components/ClockTrainingGame'),
  { ssr: false }
);
const ColorHarmonyGame = dynamic(
  () => import('@/features/kangur/ui/components/ColorHarmonyStageGame'),
  { ssr: false }
);
const DivisionGame = dynamic(() => import('@/features/kangur/ui/components/DivisionGame'), {
  ssr: false,
});
const EnglishAdjectivesSceneGame = dynamic(
  () => import('@/features/kangur/ui/components/EnglishAdjectivesSceneGame'),
  { ssr: false }
);
const EnglishAdverbsFrequencyRoutineGame = dynamic(
  () => import('@/features/kangur/ui/components/EnglishAdverbsFrequencyRoutineGame'),
  { ssr: false }
);
const EnglishArticlesDragDropGame = dynamic(
  () => import('@/features/kangur/ui/components/EnglishArticlesDragDropGame'),
  { ssr: false }
);
const EnglishPartsOfSpeechGame = dynamic(
  () => import('@/features/kangur/ui/components/EnglishPartsOfSpeechGame'),
  { ssr: false }
);
const EnglishPronounsWarmupGame = dynamic(
  () => import('@/features/kangur/ui/components/EnglishPronounsWarmupGame'),
  { ssr: false }
);
const EnglishPrepositionsGame = dynamic(
  () => import('@/features/kangur/ui/components/EnglishPrepositionsGame'),
  { ssr: false }
);
const EnglishPrepositionsOrderGame = dynamic(
  () => import('@/features/kangur/ui/components/EnglishPrepositionsOrderGame'),
  { ssr: false }
);
const EnglishPrepositionsSortGame = dynamic(
  () => import('@/features/kangur/ui/components/EnglishPrepositionsSortGame'),
  { ssr: false }
);
const EnglishSentenceStructureGame = dynamic(
  () => import('@/features/kangur/ui/components/EnglishSentenceStructureGame'),
  { ssr: false }
);
const EnglishSubjectVerbAgreementGame = dynamic(
  () => import('@/features/kangur/ui/components/EnglishSubjectVerbAgreementGame'),
  { ssr: false }
);
const GeometryDrawingGame = dynamic(
  () => import('@/features/kangur/ui/components/GeometryDrawingGame'),
  { ssr: false }
);
const LogicalAnalogiesRelationGame = dynamic(
  () => import('@/features/kangur/ui/components/LogicalAnalogiesRelationGame'),
  { ssr: false }
);
const LogicalClassificationGame = dynamic(
  () => import('@/features/kangur/ui/components/LogicalClassificationGame'),
  { ssr: false }
);
const LogicalPatternsWorkshopGame = dynamic(
  () => import('@/features/kangur/ui/components/LogicalPatternsWorkshopGame'),
  { ssr: false }
);
const MultiplicationGame = dynamic(
  () => import('@/features/kangur/ui/components/MultiplicationGame'),
  { ssr: false }
);
const ShapeRecognitionGame = dynamic(
  () => import('@/features/kangur/ui/components/ShapeRecognitionStageGame'),
  { ssr: false }
);
const SubtractingGame = dynamic(
  () => import('@/features/kangur/ui/components/SubtractingGame'),
  { ssr: false }
);

type LaunchableGameRendererContext = {
  finishLabelProp: KangurLaunchableGameRuntimeFinishLabelProp;
  finishMode: KangurLaunchableGameRuntimeFinishMode;
  handleHome: () => void;
  rendererProps?: KangurGameRuntimeRendererProps;
  returnToGameHomeLabel: string;
};

type LaunchableGameRendererProps = KangurMiniGameFinishActionProps & {
  completionPrimaryActionLabel?: string;
  finishLabel?: KangurMiniGameFinishProps['finishLabel'];
  finishLabelVariant?: KangurMiniGameFinishVariantProps['finishLabelVariant'];
  rendererProps?: KangurGameRuntimeRendererProps;
};

type LaunchableGameRendererConfig = {
  render: (props: LaunchableGameRendererProps) => React.JSX.Element;
};

const resolveLaunchableGameRendererProps = (
  context: LaunchableGameRendererContext
): LaunchableGameRendererProps => {
  const props: LaunchableGameRendererProps = {
    onFinish: context.handleHome,
  };

  if (
    context.finishLabelProp === 'finishLabelVariant' &&
    context.finishMode === 'play_variant'
  ) {
    props.finishLabelVariant = 'play';
  }

  if (
    context.finishLabelProp === 'finishLabel' &&
    context.finishMode === 'return_to_game_home'
  ) {
    props.finishLabel = context.returnToGameHomeLabel;
  }

  if (
    context.finishLabelProp === 'completionPrimaryActionLabel' &&
    context.finishMode === 'return_to_game_home'
  ) {
    props.completionPrimaryActionLabel = context.returnToGameHomeLabel;
  }

  if (context.rendererProps) {
    props.rendererProps = context.rendererProps;
  }

  return props;
};

const toLessonPlayFinishLabelVariant = (
  finishLabelVariant: LaunchableGameRendererProps['finishLabelVariant']
): KangurMiniGameFinishVariantProps['finishLabelVariant'] | undefined =>
  finishLabelVariant === 'play' ? 'play' : finishLabelVariant === 'lesson' ? 'lesson' : undefined;

const KANGUR_MUSIC_PIANO_ROLL_LAUNCHABLE_RENDERERS =
  createKangurMusicPianoRollLaunchableOnFinishRendererMap<LaunchableGameRendererProps>();

const KANGUR_LAUNCHABLE_GAME_RENDERERS: Record<
  KangurLaunchableGameRuntimeRendererId,
  LaunchableGameRendererConfig
> = {
  adding_ball_game: {
    render: ({ finishLabelVariant, onFinish }) => (
      <AddingBallGame finishLabelVariant={finishLabelVariant} onFinish={onFinish} />
    ),
  },
  adding_synthesis_game: {
    render: ({ onFinish }) => <AddingSynthesisGame onFinish={onFinish} />,
  },
  agentic_approval_gate_game: {
    render: ({ onFinish }) => <AgenticApprovalGateGame onFinish={onFinish} />,
  },
  agentic_prompt_trim_game: {
    render: ({ onFinish }) => <AgenticPromptTrimGame onFinish={onFinish} />,
  },
  agentic_reasoning_router_game: {
    render: ({ onFinish }) => <AgenticReasoningRouterGame onFinish={onFinish} />,
  },
  agentic_surface_match_game: {
    render: ({ onFinish }) => <AgenticSurfaceMatchGame onFinish={onFinish} />,
  },
  alphabet_literacy_game: {
    render: ({ finishLabel, onFinish, rendererProps }) => (
      <AlphabetLiteracyGame
        finishLabel={finishLabel}
        literacyMatchSetId={rendererProps?.literacyMatchSetId}
        onFinish={onFinish}
      />
    ),
  },
  art_shapes_rotation_gap_game: {
    render: ({ onFinish }) => <ArtShapesRotationGapGame onFinish={onFinish} />,
  },
  calendar_training_game: {
    render: ({ onFinish, rendererProps }) => (
      <CalendarTrainingGame onFinish={onFinish} section={rendererProps?.calendarSection} />
    ),
  },
  clock_training_game: {
    render: ({ completionPrimaryActionLabel, onFinish, rendererProps }) => (
      <ClockTrainingGame
        completionPrimaryActionLabel={completionPrimaryActionLabel}
        hideModeSwitch={rendererProps?.showClockModeSwitch === false}
        initialMode={rendererProps?.clockInitialMode}
        onFinish={onFinish}
        section={rendererProps?.clockSection}
        showHourHand={rendererProps?.showClockHourHand}
        showMinuteHand={rendererProps?.showClockMinuteHand}
        showTaskTitle={rendererProps?.showClockTaskTitle}
        showTimeDisplay={rendererProps?.showClockTimeDisplay}
      />
    ),
  },
  color_harmony_game: {
    render: ({ finishLabel, onFinish }) => <ColorHarmonyGame finishLabel={finishLabel} onFinish={onFinish} />,
  },
  division_game: {
    render: ({ finishLabelVariant, onFinish }) => (
      <DivisionGame
        finishLabelVariant={toLessonPlayFinishLabelVariant(finishLabelVariant)}
        onFinish={onFinish}
      />
    ),
  },
  english_adjectives_scene_game: {
    render: ({ finishLabel, onFinish }) => (
      <EnglishAdjectivesSceneGame finishLabel={finishLabel} onFinish={onFinish} />
    ),
  },
  english_adverbs_frequency_routine_game: {
    render: ({ finishLabel, onFinish }) => (
      <EnglishAdverbsFrequencyRoutineGame finishLabel={finishLabel} onFinish={onFinish} />
    ),
  },
  english_articles_drag_drop_game: {
    render: ({ finishLabel, onFinish }) => (
      <EnglishArticlesDragDropGame finishLabel={finishLabel} onFinish={onFinish} />
    ),
  },
  english_parts_of_speech_game: {
    render: ({ finishLabel, onFinish }) => (
      <EnglishPartsOfSpeechGame finishLabel={finishLabel} onFinish={onFinish} />
    ),
  },
  english_pronouns_warmup_game: {
    render: ({ finishLabel, onFinish }) => (
      <EnglishPronounsWarmupGame finishLabel={finishLabel} onFinish={onFinish} />
    ),
  },
  english_prepositions_game: {
    render: ({ finishLabel, onFinish }) => (
      <EnglishPrepositionsGame finishLabel={finishLabel} onFinish={onFinish} />
    ),
  },
  english_prepositions_order_game: {
    render: ({ finishLabel, onFinish }) => (
      <EnglishPrepositionsOrderGame finishLabel={finishLabel} onFinish={onFinish} />
    ),
  },
  english_prepositions_sort_game: {
    render: ({ finishLabel, onFinish }) => (
      <EnglishPrepositionsSortGame finishLabel={finishLabel} onFinish={onFinish} />
    ),
  },
  english_sentence_structure_game: {
    render: ({ finishLabel, onFinish }) => (
      <EnglishSentenceStructureGame finishLabel={finishLabel} onFinish={onFinish} />
    ),
  },
  english_subject_verb_agreement_game: {
    render: ({ finishLabel, onFinish }) => (
      <EnglishSubjectVerbAgreementGame finishLabel={finishLabel} onFinish={onFinish} />
    ),
  },
  geometry_drawing_game: {
    render: ({ finishLabel, onFinish, rendererProps }) => (
      <GeometryDrawingGame
        activityKey={rendererProps?.activityKey}
        difficultyLabelOverride={rendererProps?.difficultyLabelOverride}
        finishLabel={finishLabel ?? rendererProps?.finishLabel}
        lessonKey={rendererProps?.lessonKey}
        onFinish={onFinish}
        operation={rendererProps?.operation}
        shapeIds={rendererProps?.shapeIds}
        showDifficultySelector={rendererProps?.showDifficultySelector}
      />
    ),
  },
  logical_analogies_relation_game: {
    render: ({ finishLabel, onFinish }) => (
      <LogicalAnalogiesRelationGame finishLabel={finishLabel} onFinish={onFinish} />
    ),
  },
  logical_classification_game: {
    render: ({ finishLabel, onFinish }) => (
      <LogicalClassificationGame finishLabel={finishLabel} onFinish={onFinish} />
    ),
  },
  logical_patterns_workshop_game: {
    render: ({ finishLabel, onFinish, rendererProps }) => (
      <LogicalPatternsWorkshopGame
        finishLabel={finishLabel ?? rendererProps?.finishLabel}
        onFinish={onFinish}
        patternSetId={rendererProps?.patternSetId}
      />
    ),
  },
  multiplication_game: {
    render: ({ finishLabelVariant, onFinish }) => (
      <MultiplicationGame
        finishLabelVariant={toLessonPlayFinishLabelVariant(finishLabelVariant)}
        onFinish={onFinish}
      />
    ),
  },
  ...KANGUR_MUSIC_PIANO_ROLL_LAUNCHABLE_RENDERERS,
  shape_recognition_game: {
    render: ({ finishLabel, onFinish }) => <ShapeRecognitionGame finishLabel={finishLabel} onFinish={onFinish} />,
  },
  subtracting_game: {
    render: ({ finishLabelVariant, onFinish }) => (
      <SubtractingGame
        finishLabelVariant={toLessonPlayFinishLabelVariant(finishLabelVariant)}
        onFinish={onFinish}
      />
    ),
  },
};

const getKangurLaunchableGameRendererConfig = (
  rendererId: KangurLaunchableGameRuntimeRendererId
): LaunchableGameRendererConfig => {
  const config = KANGUR_LAUNCHABLE_GAME_RENDERERS[rendererId];

  if (!config) {
    throw new Error(`Missing launchable game renderer config for "${rendererId}".`);
  }

  return config;
};

export function KangurLaunchableGameRuntime({
  onFinish,
  runtime,
}: {
  onFinish: () => void;
  runtime: KangurLaunchableGameRuntimeSpec;
}): React.JSX.Element {
  const translations = useTranslations('KangurGameWidgets');
  const renderer = getKangurLaunchableGameRendererConfig(runtime.rendererId);

  return renderer.render(
    resolveLaunchableGameRendererProps({
      finishLabelProp: runtime.finishLabelProp,
      finishMode: runtime.finishMode,
      handleHome: onFinish,
      rendererProps: runtime.rendererProps,
      returnToGameHomeLabel: translations('returnToGameHome'),
    })
  );
}

export default KangurLaunchableGameRuntime;
