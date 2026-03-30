'use client';

import dynamic from 'next/dynamic';
import type { ComponentType } from 'react';
import { useTranslations } from 'next-intl';

import { getOptionalKangurGameEngineDefinition } from '@/features/kangur/games/engines';
import type {
  KangurGameEngineCategory,
  KangurLaunchableGameRuntimeFinishLabelProp,
  KangurLaunchableGameRuntimeFinishMode,
  KangurLaunchableGameRuntimeSpec,
} from '@/shared/contracts/kangur-games';
import type {
  LaunchableGameCategoryRendererProps,
  LaunchableGameRendererProps,
} from '@/features/kangur/ui/components/launchable-runtime/KangurLaunchableGameRuntime.shared';

const FoundationalLaunchableGameRenderer = dynamic<LaunchableGameCategoryRendererProps>(
  () =>
    import('./launchable-runtime/KangurLaunchableGameRuntime.foundational').then(
      (module) => module.FoundationalLaunchableGameRenderer
    ),
  { ssr: false }
);

const EarlyLearningLaunchableGameRenderer = dynamic<LaunchableGameCategoryRendererProps>(
  () =>
    import('./launchable-runtime/KangurLaunchableGameRuntime.early-learning').then(
      (module) => module.EarlyLearningLaunchableGameRenderer
    ),
  { ssr: false }
);

const AdultLearningLaunchableGameRenderer = dynamic<LaunchableGameCategoryRendererProps>(
  () =>
    import('./launchable-runtime/KangurLaunchableGameRuntime.adult-learning').then(
      (module) => module.AdultLearningLaunchableGameRenderer
    ),
  { ssr: false }
);

type LaunchableGameRendererContext = {
  finishLabelProp: KangurLaunchableGameRuntimeFinishLabelProp;
  finishMode: KangurLaunchableGameRuntimeFinishMode;
  handleHome: () => void;
  rendererProps?: LaunchableGameRendererProps['rendererProps'];
  returnToGameHomeLabel: string;
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

const KANGUR_LAUNCHABLE_GAME_CATEGORY_RENDERERS = {
  adult_learning: AdultLearningLaunchableGameRenderer,
  early_learning: EarlyLearningLaunchableGameRenderer,
  foundational: FoundationalLaunchableGameRenderer,
} satisfies Record<
  KangurGameEngineCategory,
  ComponentType<LaunchableGameCategoryRendererProps>
>;

const resolveLaunchableGameRuntimeCategory = (
  engineId: KangurLaunchableGameRuntimeSpec['engineId']
): KangurGameEngineCategory => {
  if (!engineId) {
    throw new Error('Launchable game runtime is missing an engineId.');
  }

  const engineDefinition = getOptionalKangurGameEngineDefinition(engineId);

  if (!engineDefinition) {
    throw new Error(`Missing Kangur game engine definition for "${engineId}".`);
  }

  return engineDefinition.category;
};

export function KangurLaunchableGameRuntime({
  onFinish,
  runtime,
}: {
  onFinish: () => void;
  runtime: KangurLaunchableGameRuntimeSpec;
}): React.JSX.Element {
  const translations = useTranslations('KangurGameWidgets');
  const category = resolveLaunchableGameRuntimeCategory(runtime.engineId);
  const CategoryRenderer = KANGUR_LAUNCHABLE_GAME_CATEGORY_RENDERERS[category];

  return (
    <CategoryRenderer
      rendererId={runtime.rendererId}
      rendererProps={resolveLaunchableGameRendererProps({
        finishLabelProp: runtime.finishLabelProp,
        finishMode: runtime.finishMode,
        handleHome: onFinish,
        rendererProps: runtime.rendererProps,
        returnToGameHomeLabel: translations('returnToGameHome'),
      })}
    />
  );
}

export default KangurLaunchableGameRuntime;
