'use client';

import { useMemo } from 'react';

import {
  getKangurGameDefinition,
  getKangurGameInstanceForGame,
  mergeKangurLaunchableGameRuntimeSpec,
  resolveKangurLaunchableGameRuntimeForInstance,
} from '@/features/kangur/games';
import type { KangurGameRuntimeRendererProps } from '@/shared/contracts/kangur-game-runtime-renderer-props';
import type { KangurGameInstanceId } from '@/shared/contracts/kangur-game-instances';
import type { KangurGameId } from '@/shared/contracts/kangur-games';

import KangurLaunchableGameRuntime from './KangurLaunchableGameRuntime';

export function KangurLaunchableGameInstanceRuntime({
  engineOverrides,
  gameId,
  instanceId,
  onFinish,
}: {
  engineOverrides?: KangurGameRuntimeRendererProps;
  gameId: KangurGameId;
  instanceId: KangurGameInstanceId;
  onFinish: () => void;
}): React.JSX.Element {
  const runtime = useMemo(() => {
    const game = getKangurGameDefinition(gameId);
    const instance = getKangurGameInstanceForGame(game, instanceId);
    const resolvedRuntime = instance
      ? resolveKangurLaunchableGameRuntimeForInstance(game, instance)
      : null;

    return resolvedRuntime
      ? mergeKangurLaunchableGameRuntimeSpec(resolvedRuntime, engineOverrides)
      : null;
  }, [engineOverrides, gameId, instanceId]);

  if (!runtime) {
    return <div data-testid='kangur-launchable-game-instance-runtime-missing' />;
  }

  return <KangurLaunchableGameRuntime onFinish={onFinish} runtime={runtime} />;
}

export default KangurLaunchableGameInstanceRuntime;
