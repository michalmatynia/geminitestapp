'use client';

import { useMemo } from 'react';

import {
  getKangurGameContentSetsForGame,
  getKangurGameDefinition,
  getKangurGameBuiltInInstancesForGame,
  getKangurLaunchableGameRuntimeSpecForGame,
  mergeKangurLaunchableGameRuntimeSpec,
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
  const game = useMemo(() => getKangurGameDefinition(gameId), [gameId]);
  const builtInInstance = useMemo(
    () =>
      getKangurGameBuiltInInstancesForGame(game).find((candidate) => candidate.id === instanceId) ?? null,
    [game, instanceId]
  );
  const persistedInstance = useMemo(
    () =>
      gameInstanceQuery.data?.find(
        (candidate) => candidate.id === instanceId && candidate.gameId === gameId
      ) ?? null,
    [gameId, gameInstanceQuery.data, instanceId]
  );
  const activeInstance = persistedInstance ?? builtInInstance;
  const gameContentSetQuery = useKangurGameContentSets({
    contentSetId: activeInstance?.contentSetId ?? undefined,
    enabled: Boolean(activeInstance?.contentSetId),
    gameId,
  });
  const builtInContentSet = useMemo(
    () =>
      activeInstance?.contentSetId
        ? getKangurGameContentSetsForGame(game).find(
            (candidate) => candidate.id === activeInstance.contentSetId
          ) ?? null
        : null,
    [activeInstance?.contentSetId, game]
  );
  const persistedContentSet = useMemo(
    () =>
      activeInstance?.contentSetId
        ? gameContentSetQuery.data?.find(
            (candidate) =>
              candidate.id === activeInstance.contentSetId && candidate.gameId === gameId
          ) ?? null
        : null,
    [activeInstance?.contentSetId, gameContentSetQuery.data, gameId]
  );
  const runtime = useMemo(() => {
    if (!activeInstance) {
      return null;
    }

    const defaultRuntime = getKangurLaunchableGameRuntimeSpecForGame(game);
    if (defaultRuntime?.screen !== activeInstance.launchableRuntimeId) {
      return null;
    }

    const contentSet = persistedContentSet ?? builtInContentSet;
    if (activeInstance.contentSetId && !contentSet) {
      return null;
    }

    const resolvedRuntime = mergeKangurLaunchableGameRuntimeSpec(
      defaultRuntime,
      contentSet?.rendererProps,
      activeInstance.engineOverrides
    );

    return resolvedRuntime
      ? mergeKangurLaunchableGameRuntimeSpec(resolvedRuntime, engineOverrides)
      : null;
  }, [activeInstance, builtInContentSet, engineOverrides, game, persistedContentSet]);

  const isWaitingForPersistedInstance = !activeInstance && gameInstanceQuery.isPending;
  const isWaitingForPersistedContentSet =
    Boolean(activeInstance?.contentSetId) &&
    !builtInContentSet &&
    !persistedContentSet &&
    gameContentSetQuery.isPending;

  if (isWaitingForPersistedInstance || isWaitingForPersistedContentSet) {
    return <div data-testid='kangur-launchable-game-instance-runtime-loading' />;
  }

  if (!runtime) {
    return <div data-testid='kangur-launchable-game-instance-runtime-missing' />;
  }

  return <KangurLaunchableGameRuntime onFinish={onFinish} runtime={runtime} />;
}

export default KangurLaunchableGameInstanceRuntime;
