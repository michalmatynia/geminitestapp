'use client';

import type { ComponentProps } from 'react';

import AddingBallGame from '@/features/kangur/ui/components/AddingBallGame';
import AddingSynthesisGame from '@/features/kangur/ui/components/AddingSynthesisGame';
import AgenticApprovalGateGame from '@/features/kangur/ui/components/AgenticApprovalGateGame';
import AgenticReasoningRouterGame from '@/features/kangur/ui/components/AgenticReasoningRouterGame';
import AgenticSurfaceMatchGame from '@/features/kangur/ui/components/AgenticSurfaceMatchGame';
import CalendarTrainingGame from '@/features/kangur/ui/components/CalendarTrainingGame';
import ClockTrainingGame from '@/features/kangur/ui/components/ClockTrainingGame';
import DivisionGame from '@/features/kangur/ui/components/DivisionGame';
import EnglishAdjectivesSceneGame from '@/features/kangur/ui/components/EnglishAdjectivesSceneGame';
import EnglishAdverbsActionStudioGame from '@/features/kangur/ui/components/EnglishAdverbsActionStudioGame';
import EnglishAdverbsFrequencyRoutineGame from '@/features/kangur/ui/components/EnglishAdverbsFrequencyRoutineGame';
import EnglishArticlesDragDropGame from '@/features/kangur/ui/components/EnglishArticlesDragDropGame';
import EnglishComparativesSuperlativesCrownGame from '@/features/kangur/ui/components/EnglishComparativesSuperlativesCrownGame';
import EnglishPartsOfSpeechGame from '@/features/kangur/ui/components/EnglishPartsOfSpeechGame';
import EnglishPrepositionsGame from '@/features/kangur/ui/components/EnglishPrepositionsGame';
import EnglishPrepositionsOrderGame from '@/features/kangur/ui/components/EnglishPrepositionsOrderGame';
import EnglishPrepositionsSortGame from '@/features/kangur/ui/components/EnglishPrepositionsSortGame';
import EnglishPronounsWarmupGame from '@/features/kangur/ui/components/EnglishPronounsWarmupGame';
import EnglishSentenceStructureGame from '@/features/kangur/ui/components/EnglishSentenceStructureGame';
import EnglishSubjectVerbAgreementGame from '@/features/kangur/ui/components/EnglishSubjectVerbAgreementGame';
import GeometryDrawingGame from '@/features/kangur/ui/components/GeometryDrawingGame';
import LogicalAnalogiesRelationGame from '@/features/kangur/ui/components/LogicalAnalogiesRelationGame';
import LogicalClassificationGame from '@/features/kangur/ui/components/LogicalClassificationGame';
import LogicalPatternsWorkshopGame from '@/features/kangur/ui/components/LogicalPatternsWorkshopGame';
import MultiplicationArrayGame from '@/features/kangur/ui/components/MultiplicationArrayGame';
import MultiplicationGame from '@/features/kangur/ui/components/MultiplicationGame';
import SubtractingGame from '@/features/kangur/ui/components/SubtractingGame';
import type { KangurLaunchableGameRuntimeRendererId } from '@/shared/contracts/kangur-games';
import type {
  LaunchableGameCategoryRendererProps,
  LaunchableGameRendererConfig,
  LaunchableGameRendererProps,
} from './KangurLaunchableGameRuntime.shared';

const toLessonPlayFinishLabelVariant = (
  finishLabelVariant: LaunchableGameRendererProps['finishLabelVariant']
): LaunchableGameRendererProps['finishLabelVariant'] | undefined =>
  finishLabelVariant === 'play'
    ? 'play'
    : finishLabelVariant === 'lesson'
      ? 'lesson'
      : undefined;

type GeometryDrawingGameProps = ComponentProps<typeof GeometryDrawingGame>;

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
