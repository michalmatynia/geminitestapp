import type {
  KangurGameContentSet,
  KangurGameInstance,
} from '@/shared/contracts/kangur-game-instances';
import type {
  KangurGameDefinition,
  KangurLaunchableGameRuntimeSpec,
} from '@/shared/contracts/kangur-games';
import type { KangurGameRuntimeRendererProps } from '@/shared/contracts/kangur-game-runtime-renderer-props';
import { kangurLaunchableGameRuntimeSpecSchema } from '@/shared/contracts/kangur-games';

import { getKangurGameContentSetForGame } from './content-sets';
import { getKangurLaunchableGameRuntimeSpecForGame } from './catalog';

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

export const resolveKangurLaunchableGameRuntimeForInstance = (
  game: KangurGameDefinition,
  instance: Pick<KangurGameInstance, 'contentSetId' | 'engineOverrides' | 'launchableRuntimeId'>,
  customContentSets?: readonly KangurGameContentSet[] | null
): KangurLaunchableGameRuntimeSpec | null => {
  const defaultRuntime = getKangurLaunchableGameRuntimeSpecForGame(game);
  if (defaultRuntime?.screen !== instance.launchableRuntimeId) {
    return null;
  }

  const contentSet = getKangurGameContentSetForGame(game, instance.contentSetId, customContentSets);

  return mergeKangurLaunchableGameRuntimeSpec(
    defaultRuntime,
    contentSet?.rendererProps,
    instance.engineOverrides
  );
};
