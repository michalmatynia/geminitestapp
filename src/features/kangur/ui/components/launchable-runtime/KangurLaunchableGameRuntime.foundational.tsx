'use client';

import type { ComponentProps } from 'react';

import type { KangurLaunchableGameRuntimeRendererId } from '@/shared/contracts/kangur-games';
import type {
  LaunchableGameCategoryRendererProps,
  LaunchableGameRendererConfig,
  LaunchableGameRendererProps,
} from './KangurLaunchableGameRuntime.shared';
import {
  createDynamicLaunchableGameComponent,
} from './KangurLaunchableGameRuntime.shared';

const toLessonPlayFinishLabelVariant = (
  finishLabelVariant: LaunchableGameRendererProps['finishLabelVariant']
): LaunchableGameRendererProps['finishLabelVariant'] | undefined =>
  finishLabelVariant === 'play'
    ? 'play'
    : finishLabelVariant === 'lesson'
      ? 'lesson'
      : undefined;

const AddingBallGame = createDynamicLaunchableGameComponent(
  () => import('@/features/kangur/ui/components/AddingBallGame')
);
const AddingSynthesisGame = createDynamicLaunchableGameComponent(
  () => import('@/features/kangur/ui/components/AddingSynthesisGame')
);
const AgenticApprovalGateGame = createDynamicLaunchableGameComponent(
  () => import('@/features/kangur/ui/components/AgenticApprovalGateGame')
);
const AgenticReasoningRouterGame = createDynamicLaunchableGameComponent(
  () => import('@/features/kangur/ui/components/AgenticReasoningRouterGame')
);
const AgenticSurfaceMatchGame = createDynamicLaunchableGameComponent(
  () => import('@/features/kangur/ui/components/AgenticSurfaceMatchGame')
);
const CalendarTrainingGame = createDynamicLaunchableGameComponent(
  () => import('@/features/kangur/ui/components/CalendarTrainingGame')
);
const ClockTrainingGame = createDynamicLaunchableGameComponent(
  () => import('@/features/kangur/ui/components/ClockTrainingGame')
);
const DivisionGame = createDynamicLaunchableGameComponent(
  () => import('@/features/kangur/ui/components/DivisionGame')
);
const EnglishAdjectivesSceneGame = createDynamicLaunchableGameComponent(
  () => import('@/features/kangur/ui/components/EnglishAdjectivesSceneGame')
);
const EnglishAdverbsActionStudioGame = createDynamicLaunchableGameComponent(
  () => import('@/features/kangur/ui/components/EnglishAdverbsActionStudioGame')
);
const EnglishAdverbsFrequencyRoutineGame = createDynamicLaunchableGameComponent(
  () => import('@/features/kangur/ui/components/EnglishAdverbsFrequencyRoutineGame')
);
const EnglishArticlesDragDropGame = createDynamicLaunchableGameComponent(
  () => import('@/features/kangur/ui/components/EnglishArticlesDragDropGame')
);
const EnglishComparativesSuperlativesCrownGame = createDynamicLaunchableGameComponent(
  () => import('@/features/kangur/ui/components/EnglishComparativesSuperlativesCrownGame')
);
const EnglishPartsOfSpeechGame = createDynamicLaunchableGameComponent(
  () => import('@/features/kangur/ui/components/EnglishPartsOfSpeechGame')
);
const EnglishPrepositionsGame = createDynamicLaunchableGameComponent(
  () => import('@/features/kangur/ui/components/EnglishPrepositionsGame')
);
const EnglishPrepositionsOrderGame = createDynamicLaunchableGameComponent(
  () => import('@/features/kangur/ui/components/EnglishPrepositionsOrderGame')
);
const EnglishPrepositionsSortGame = createDynamicLaunchableGameComponent(
  () => import('@/features/kangur/ui/components/EnglishPrepositionsSortGame')
);
const EnglishPronounsWarmupGame = createDynamicLaunchableGameComponent(
  () => import('@/features/kangur/ui/components/EnglishPronounsWarmupGame')
);
const EnglishSentenceStructureGame = createDynamicLaunchableGameComponent(
  () => import('@/features/kangur/ui/components/EnglishSentenceStructureGame')
);
const EnglishSubjectVerbAgreementGame = createDynamicLaunchableGameComponent(
  () => import('@/features/kangur/ui/components/EnglishSubjectVerbAgreementGame')
);
const GeometryDrawingGame = createDynamicLaunchableGameComponent(
  () => import('@/features/kangur/ui/components/GeometryDrawingGame')
);
const LogicalAnalogiesRelationGame = createDynamicLaunchableGameComponent(
  () => import('@/features/kangur/ui/components/LogicalAnalogiesRelationGame')
);
const LogicalClassificationGame = createDynamicLaunchableGameComponent(
  () => import('@/features/kangur/ui/components/LogicalClassificationGame')
);
const LogicalPatternsWorkshopGame = createDynamicLaunchableGameComponent(
  () => import('@/features/kangur/ui/components/LogicalPatternsWorkshopGame')
);
const MultiplicationArrayGame = createDynamicLaunchableGameComponent(
  () => import('@/features/kangur/ui/components/MultiplicationArrayGame')
);
const MultiplicationGame = createDynamicLaunchableGameComponent(
  () => import('@/features/kangur/ui/components/MultiplicationGame')
);
const SubtractingGame = createDynamicLaunchableGameComponent(
  () => import('@/features/kangur/ui/components/SubtractingGame')
);

type GeometryDrawingGameProps = ComponentProps<
  (typeof import('@/features/kangur/ui/components/GeometryDrawingGame'))['default']
>;

const resolveGeometryDrawingGameRendererOverrides = (
  rendererProps: LaunchableGameRendererProps['rendererProps']
): Omit<GeometryDrawingGameProps, 'finishLabel' | 'onFinish'> & {
  finishLabel?: GeometryDrawingGameProps['finishLabel'];
} => {
  const resolvedRendererProps = rendererProps ?? {};
  const {
    activityKey,
    difficultyLabelOverride,
    finishLabel,
    lessonKey,
    operation,
    shapeIds,
    showDifficultySelector,
  } = resolvedRendererProps;

  return {
    activityKey,
    difficultyLabelOverride,
    finishLabel,
    lessonKey,
    operation,
    shapeIds,
    showDifficultySelector,
  };
};

const resolveGeometryDrawingGameRendererProps = ({
  finishLabel,
  onFinish,
  rendererProps,
}: Pick<LaunchableGameRendererProps, 'finishLabel' | 'onFinish' | 'rendererProps'>): GeometryDrawingGameProps => {
  const resolvedRendererOverrides = resolveGeometryDrawingGameRendererOverrides(rendererProps);

  return {
    ...resolvedRendererOverrides,
    finishLabel: finishLabel ?? resolvedRendererOverrides.finishLabel,
    onFinish,
  };
};

const KANGUR_FOUNDATIONAL_LAUNCHABLE_GAME_RENDERERS: Partial<
  Record<KangurLaunchableGameRuntimeRendererId, LaunchableGameRendererConfig>
> = {
  adding_ball_game: {
    render: ({ finishLabelVariant, onFinish }) => (
      <AddingBallGame finishLabelVariant={finishLabelVariant} onFinish={onFinish} />
    ),
  },
  adding_synthesis_game: {
    render: ({ finishLabel, onFinish }) => (
      <AddingSynthesisGame finishLabel={finishLabel} onFinish={onFinish} />
    ),
  },
  agentic_approval_gate_game: {
    render: ({ onFinish }) => <AgenticApprovalGateGame onFinish={onFinish} />,
  },
  agentic_reasoning_router_game: {
    render: ({ onFinish }) => <AgenticReasoningRouterGame onFinish={onFinish} />,
  },
  agentic_surface_match_game: {
    render: ({ onFinish }) => <AgenticSurfaceMatchGame onFinish={onFinish} />,
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
  english_adverbs_action_game: {
    render: ({ finishLabel, onFinish }) => (
      <EnglishAdverbsActionStudioGame finishLabel={finishLabel} onFinish={onFinish} />
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
  english_compare_and_crown_game: {
    render: ({ finishLabel, onFinish }) => (
      <EnglishComparativesSuperlativesCrownGame finishLabel={finishLabel} onFinish={onFinish} />
    ),
  },
  english_going_to_plan_parade_game: {
    render: ({ finishLabel, onFinish }) => (
      <EnglishSentenceStructureGame finishLabel={finishLabel} onFinish={onFinish} />
    ),
  },
  english_parts_of_speech_game: {
    render: ({ finishLabel, onFinish }) => (
      <EnglishPartsOfSpeechGame finishLabel={finishLabel} onFinish={onFinish} />
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
  english_pronouns_warmup_game: {
    render: ({ finishLabel, onFinish }) => (
      <EnglishPronounsWarmupGame finishLabel={finishLabel} onFinish={onFinish} />
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
        {...resolveGeometryDrawingGameRendererProps({
          finishLabel,
          onFinish,
          rendererProps,
        })}
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
  multiplication_array_game: {
    render: ({ finishLabel, onFinish }) => (
      <MultiplicationArrayGame finishLabel={finishLabel} onFinish={onFinish} />
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
  subtracting_game: {
    render: ({ finishLabelVariant, onFinish }) => (
      <SubtractingGame
        finishLabelVariant={toLessonPlayFinishLabelVariant(finishLabelVariant)}
        onFinish={onFinish}
      />
    ),
  },
};

const getFoundationalLaunchableGameRendererConfig = (
  rendererId: KangurLaunchableGameRuntimeRendererId
): LaunchableGameRendererConfig => {
  const config = KANGUR_FOUNDATIONAL_LAUNCHABLE_GAME_RENDERERS[rendererId];

  if (!config) {
    throw new Error(`Missing foundational launchable renderer config for "${rendererId}".`);
  }

  return config;
};

export function FoundationalLaunchableGameRenderer({
  rendererId,
  rendererProps,
}: LaunchableGameCategoryRendererProps): React.JSX.Element {
  return getFoundationalLaunchableGameRendererConfig(rendererId).render(rendererProps);
}
