'use client';

import type { ComponentType } from 'react';

import type {
  KangurLaunchableGameRuntimeSpec,
  KangurLaunchableGameScreen,
} from '@/shared/contracts/kangur-games';
import { getKangurLaunchableGameRuntimeSpec } from '@/features/kangur/games/launchable-runtime-specs';
import { mergeKangurLaunchableGameRuntimeSpec } from '@/features/kangur/games/launchable-runtime-resolution';
import KangurLaunchableGameRuntime from '@/features/kangur/ui/components/KangurLaunchableGameRuntime';
import { renderKangurGameQuizShell } from '@/features/kangur/ui/components/KangurGameQuizShell';
import { KANGUR_LAUNCHABLE_GAME_SCREENS } from '@/features/kangur/ui/services/game-launch';
import type { KangurGameScreen } from '@/features/kangur/ui/types';

const KangurConfigurableLaunchableGameScreen = ({
  runtime,
}: {
  runtime: KangurLaunchableGameRuntimeSpec;
}): React.JSX.Element => {
  const backScreen = runtime.shell.backScreen as KangurGameScreen | undefined;
  const shellProps = {
    accent: runtime.shell.accent,
    backScreen,
    description: runtime.shell.description,
    icon: runtime.shell.icon,
    maxWidthClassName: runtime.shell.maxWidthClassName,
    screen: runtime.screen,
    shellTestId: runtime.shell.shellTestId,
    title: runtime.shell.title,
  };

  return (
    renderKangurGameQuizShell({
      ...shellProps,
      children: ({ handleHome }) => (
        <KangurLaunchableGameRuntime onFinish={handleHome} runtime={runtime} />
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

export { mergeKangurLaunchableGameRuntimeSpec };

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
