'use client';

import dynamic from 'next/dynamic';
import { useTranslations } from 'next-intl';
import type { ComponentType } from 'react';

import type {
  KangurLaunchableGameRuntimeFinishLabelProp,
  KangurLaunchableGameRuntimeFinishMode,
  KangurLaunchableGameRuntimeRendererId,
  KangurLaunchableGameRuntimeSpec,
  KangurLaunchableGameScreen,
} from '@/shared/contracts/kangur-games';
import type { KangurGameRuntimeRendererProps } from '@/shared/contracts/kangur-game-runtime-renderer-props';
import {
  kangurLaunchableGameRuntimeSpecSchema,
} from '@/shared/contracts/kangur-games';
import { getKangurLaunchableGameRuntimeSpec } from '@/features/kangur/games/launchable-runtime-specs';
import { renderKangurGameQuizStage } from '@/features/kangur/ui/components/KangurGameQuizStage';
import { KANGUR_LAUNCHABLE_GAME_SCREENS } from '@/features/kangur/ui/services/game-launch';
import type {
  KangurGameScreen,
  KangurMiniGameFinishActionProps,
  KangurMiniGameFinishProps,
  KangurMiniGameFinishVariantProps,
} from '@/features/kangur/ui/types';

const AddingBallGame = dynamic(() => import('@/features/kangur/ui/components/AddingBallGame'), {
  ssr: false,
});
const CalendarTrainingGame = dynamic(
  () => import('@/features/kangur/ui/components/CalendarTrainingGame'),
  { ssr: false }
);
const ClockTrainingGame = dynamic(
  () => import('@/features/kangur/ui/components/ClockTrainingGame'),
  { ssr: false }
);
const DivisionGame = dynamic(() => import('@/features/kangur/ui/components/DivisionGame'), {
  ssr: false,
});
const EnglishPartsOfSpeechGame = dynamic(
  () => import('@/features/kangur/ui/components/EnglishPartsOfSpeechGame'),
  { ssr: false }
);
const EnglishSentenceStructureGame = dynamic(
  () => import('@/features/kangur/ui/components/EnglishSentenceStructureGame'),
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
    props['finishLabelVariant'] = 'play';
  }

  if (
    context.finishLabelProp === 'finishLabel' &&
    context.finishMode === 'return_to_game_home'
  ) {
    props['finishLabel'] = context.returnToGameHomeLabel;
  }

  if (
    context.finishLabelProp === 'completionPrimaryActionLabel' &&
    context.finishMode === 'return_to_game_home'
  ) {
    props['completionPrimaryActionLabel'] = context.returnToGameHomeLabel;
  }

  if (context.rendererProps) {
    props['rendererProps'] = context.rendererProps;
  }

  return props;
};

const toLessonPlayFinishLabelVariant = (
  finishLabelVariant: LaunchableGameRendererProps['finishLabelVariant']
): KangurMiniGameFinishVariantProps['finishLabelVariant'] | undefined =>
  finishLabelVariant === 'play' ? 'play' : finishLabelVariant === 'lesson' ? 'lesson' : undefined;

const KANGUR_LAUNCHABLE_GAME_RENDERERS: Record<
  KangurLaunchableGameRuntimeRendererId,
  LaunchableGameRendererConfig
> = {
  adding_ball_game: {
    render: ({ finishLabelVariant, onFinish }) => (
      <AddingBallGame finishLabelVariant={finishLabelVariant} onFinish={onFinish} />
    ),
  },
  calendar_training_game: {
    render: ({ onFinish, rendererProps }) => (
      <CalendarTrainingGame
        onFinish={onFinish}
        section={rendererProps?.calendarSection}
      />
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
  english_parts_of_speech_game: {
    render: ({ finishLabel, onFinish }) => (
      <EnglishPartsOfSpeechGame finishLabel={finishLabel} onFinish={onFinish} />
    ),
  },
  english_sentence_structure_game: {
    render: ({ finishLabel, onFinish }) => (
      <EnglishSentenceStructureGame finishLabel={finishLabel} onFinish={onFinish} />
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

const KangurConfigurableLaunchableGameScreen = ({
  runtime,
}: {
  runtime: KangurLaunchableGameRuntimeSpec;
}): React.JSX.Element => {
  const translations = useTranslations('KangurGameWidgets');
  const renderer = getKangurLaunchableGameRendererConfig(runtime.rendererId);
  const backScreen = runtime.stage.backScreen as KangurGameScreen | undefined;
  const stageProps = {
    accent: runtime.stage.accent,
    backScreen,
    description: runtime.stage.description,
    icon: runtime.stage.icon,
    screen: runtime.screen,
    shellTestId: runtime.stage.shellTestId,
    title: runtime.stage.title,
  };

  return (
    renderKangurGameQuizStage({
      ...stageProps,
      children: ({ handleHome }) =>
        renderer.render(
          resolveLaunchableGameRendererProps({
            finishLabelProp: runtime.finishLabelProp,
            finishMode: runtime.finishMode,
            handleHome,
            rendererProps: runtime.rendererProps,
            returnToGameHomeLabel: translations('returnToGameHome'),
          })
        ),
    }) ?? <></>
  );
};

export type KangurLaunchableGameScreenComponentConfig = {
  className: string;
  Component: ComponentType<Record<string, never>>;
  runtime: KangurLaunchableGameRuntimeSpec;
};

export const createLaunchableGameScreenComponentConfigFromRuntime = (
  runtime: KangurLaunchableGameRuntimeSpec
): KangurLaunchableGameScreenComponentConfig => {
  const Component: ComponentType<Record<string, never>> = (): React.JSX.Element => (
    <KangurConfigurableLaunchableGameScreen runtime={runtime} />
  );

  Component.displayName = `KangurLaunchableGameScreen(${runtime.screen})`;

  return {
    className: runtime.className,
    Component,
    runtime,
  };
};

const createLaunchableGameScreenComponentConfig = (
  screen: KangurLaunchableGameScreen
): KangurLaunchableGameScreenComponentConfig =>
  createLaunchableGameScreenComponentConfigFromRuntime(
    getKangurLaunchableGameRuntimeSpec(screen)
  );

export const mergeKangurLaunchableGameRuntimeSpec = (
  runtime: KangurLaunchableGameRuntimeSpec,
  ...rendererPropsLayers: Array<KangurGameRuntimeRendererProps | undefined>
): KangurLaunchableGameRuntimeSpec => {
  const mergedRendererProps = rendererPropsLayers.reduce<KangurGameRuntimeRendererProps>(
    (acc, current) => ({ ...acc, ...(current ?? {}) }),
    runtime.rendererProps ?? {}
  );

  return kangurLaunchableGameRuntimeSpecSchema.parse({
    ...runtime,
    rendererProps: Object.keys(mergedRendererProps).length > 0 ? mergedRendererProps : undefined,
  });
};

export const KANGUR_LAUNCHABLE_GAME_SCREEN_COMPONENTS = Object.freeze(
  Object.fromEntries(
    KANGUR_LAUNCHABLE_GAME_SCREENS.map((screen) => [
      screen,
      createLaunchableGameScreenComponentConfig(screen),
    ])
  ) as Record<KangurLaunchableGameScreen, KangurLaunchableGameScreenComponentConfig>
);

export const getKangurLaunchableGameScreenComponentConfig = (
  screenKey: KangurLaunchableGameScreen
): KangurLaunchableGameScreenComponentConfig => {
  const config = KANGUR_LAUNCHABLE_GAME_SCREEN_COMPONENTS[screenKey];

  if (!config) {
    throw new Error(`Missing launchable game screen config for "${screenKey}".`);
  }

  return config;
};
