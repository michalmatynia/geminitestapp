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
import { getKangurLaunchableGameRuntimeSpec } from '@/features/kangur/games/launchable-runtime-specs';
import { KangurGameQuizStage } from '@/features/kangur/ui/components/KangurGameQuizStage';
import { KANGUR_LAUNCHABLE_GAME_SCREENS } from '@/features/kangur/ui/services/game-launch';
import type { KangurGameScreen } from '@/features/kangur/ui/types';

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
  returnToGameHomeLabel: string;
};

type LaunchableGameRendererConfig = {
  Component: ComponentType<any>;
};

const resolveLaunchableGameRendererProps = (
  context: LaunchableGameRendererContext
): Record<string, unknown> => {
  const props: Record<string, unknown> = {
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

  return props;
};

const KANGUR_LAUNCHABLE_GAME_RENDERERS: Record<
  KangurLaunchableGameRuntimeRendererId,
  LaunchableGameRendererConfig
> = {
  adding_ball_game: { Component: AddingBallGame },
  calendar_training_game: { Component: CalendarTrainingGame },
  clock_training_game: { Component: ClockTrainingGame },
  division_game: { Component: DivisionGame },
  english_parts_of_speech_game: { Component: EnglishPartsOfSpeechGame },
  english_sentence_structure_game: { Component: EnglishSentenceStructureGame },
  geometry_drawing_game: { Component: GeometryDrawingGame },
  logical_analogies_relation_game: { Component: LogicalAnalogiesRelationGame },
  logical_classification_game: { Component: LogicalClassificationGame },
  logical_patterns_workshop_game: { Component: LogicalPatternsWorkshopGame },
  multiplication_game: { Component: MultiplicationGame },
  subtracting_game: { Component: SubtractingGame },
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
  const ScreenComponent = renderer.Component;
  const backScreen = runtime.stage.backScreen as KangurGameScreen | undefined;

  return (
    <KangurGameQuizStage
      accent={runtime.stage.accent}
      backScreen={backScreen}
      description={runtime.stage.description}
      icon={runtime.stage.icon}
      screen={runtime.screen}
      shellTestId={runtime.stage.shellTestId}
      title={runtime.stage.title}
    >
      {({ handleHome }) => (
        <ScreenComponent
          {...resolveLaunchableGameRendererProps({
            finishLabelProp: runtime.finishLabelProp,
            finishMode: runtime.finishMode,
            handleHome,
            returnToGameHomeLabel: translations('returnToGameHome'),
          })}
        />
      )}
    </KangurGameQuizStage>
  );
};

export type KangurLaunchableGameScreenComponentConfig = {
  className: string;
  Component: ComponentType<any>;
  runtime: KangurLaunchableGameRuntimeSpec;
};

const createLaunchableGameScreenComponentConfig = (
  screen: KangurLaunchableGameScreen
): KangurLaunchableGameScreenComponentConfig => {
  const runtime = getKangurLaunchableGameRuntimeSpec(screen);
  const Component: ComponentType = (): React.JSX.Element => (
    <KangurConfigurableLaunchableGameScreen runtime={runtime} />
  );

  Component.displayName = `KangurLaunchableGameScreen(${screen})`;

  return {
    className: runtime.className,
    Component,
    runtime,
  };
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
