'use client';

import { useMemo } from 'react';

import {
  getKangurGameDefinition,
  mergeKangurLaunchableGameRuntimeSpec,
  resolveKangurLaunchableGameRuntimeForPersistedInstance,
} from '@/features/kangur/games';
import { useKangurGameContentSets } from '@/features/kangur/ui/hooks/useKangurGameContentSets';
import { useKangurGameInstances } from '@/features/kangur/ui/hooks/useKangurGameInstances';
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
  const gameInstanceQuery = useKangurGameInstances({
    enabledOnly: true,
    gameId,
    instanceId,
  });
  const activeInstance = gameInstanceQuery.data?.[0] ?? null;
  const gameContentSetQuery = useKangurGameContentSets({
    contentSetId: activeInstance?.contentSetId ?? undefined,
    enabled: Boolean(activeInstance?.contentSetId),
    gameId,
  });
  const runtime = useMemo(() => {
    const game = getKangurGameDefinition(gameId);
    const resolvedRuntime = activeInstance
      ? resolveKangurLaunchableGameRuntimeForPersistedInstance(
          game,
          activeInstance,
          gameContentSetQuery.data
        )
      : null;

    return resolvedRuntime
      ? mergeKangurLaunchableGameRuntimeSpec(resolvedRuntime, engineOverrides)
      : null;
  }, [activeInstance, engineOverrides, gameContentSetQuery.data, gameId]);

  if (
    gameInstanceQuery.isPending ||
    (Boolean(activeInstance?.contentSetId) && gameContentSetQuery.isPending)
  ) {
    return <div data-testid='kangur-launchable-game-instance-runtime-loading' />;
  }

  if (!runtime) {
    return <div data-testid='kangur-launchable-game-instance-runtime-missing' />;
  }

  return <KangurLaunchableGameRuntime onFinish={onFinish} runtime={runtime} />;
}

export default KangurLaunchableGameInstanceRuntime;
