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

type KangurGameInstancesQuery = ReturnType<typeof useKangurGameInstances>;
type KangurGameContentSetsQuery = ReturnType<typeof useKangurGameContentSets>;
type KangurLaunchableInstance = NonNullable<KangurGameInstancesQuery['data']>[number] | null;
type KangurLaunchableContentSet = NonNullable<KangurGameContentSetsQuery['data']>[number] | null;

const resolveKangurBuiltInGameInstance = ({
  game,
  instanceId,
}: {
  game: ReturnType<typeof getKangurGameDefinition>;
  instanceId: KangurGameInstanceId;
}): KangurLaunchableInstance =>
  getKangurGameBuiltInInstancesForGame(game).find((candidate) => candidate.id === instanceId) ?? null;

const resolveKangurPersistedGameInstance = ({
  gameId,
  instanceId,
  instances,
}: {
  gameId: KangurGameId;
  instanceId: KangurGameInstanceId;
  instances: KangurGameInstancesQuery['data'];
}): KangurLaunchableInstance =>
  instances?.find((candidate) => candidate.id === instanceId && candidate.gameId === gameId) ?? null;

const resolveKangurBuiltInContentSet = ({
  activeInstance,
  game,
}: {
  activeInstance: KangurLaunchableInstance;
  game: ReturnType<typeof getKangurGameDefinition>;
}): KangurLaunchableContentSet =>
  activeInstance?.contentSetId
    ? getKangurGameContentSetsForGame(game).find(
        (candidate) => candidate.id === activeInstance.contentSetId
      ) ?? null
    : null;

const resolveKangurPersistedContentSet = ({
  activeInstance,
  contentSets,
  gameId,
}: {
  activeInstance: KangurLaunchableInstance;
  contentSets: KangurGameContentSetsQuery['data'];
  gameId: KangurGameId;
}): KangurLaunchableContentSet =>
  activeInstance?.contentSetId
    ? contentSets?.find(
        (candidate) =>
          candidate.id === activeInstance.contentSetId && candidate.gameId === gameId
      ) ?? null
    : null;

const resolveKangurDefaultLaunchableRuntime = ({
  activeInstance,
  game,
}: {
  activeInstance: KangurLaunchableInstance;
  game: ReturnType<typeof getKangurGameDefinition>;
}) => {
  if (!activeInstance) {
    return null;
  }

  const defaultRuntime = getKangurLaunchableGameRuntimeSpecForGame(game);
  return defaultRuntime?.screen === activeInstance.launchableRuntimeId ? defaultRuntime : null;
};

const hasKangurMissingRequiredContentSet = ({
  activeInstance,
  contentSet,
}: {
  activeInstance: KangurLaunchableInstance;
  contentSet: KangurLaunchableContentSet;
}): boolean => Boolean(activeInstance?.contentSetId) && !contentSet;

const mergeKangurLaunchableRuntime = ({
  activeInstance,
  contentSet,
  defaultRuntime,
  engineOverrides,
}: {
  activeInstance: KangurLaunchableInstance;
  contentSet: KangurLaunchableContentSet;
  defaultRuntime: NonNullable<ReturnType<typeof getKangurLaunchableGameRuntimeSpecForGame>>;
  engineOverrides: KangurGameRuntimeRendererProps | undefined;
}) => {
  const mergedRuntime = mergeKangurLaunchableGameRuntimeSpec(
    defaultRuntime,
    contentSet?.rendererProps,
    activeInstance?.engineOverrides
  );

  return mergedRuntime
    ? mergeKangurLaunchableGameRuntimeSpec(mergedRuntime, engineOverrides)
    : null;
};

const resolveKangurLaunchableRuntime = ({
  activeInstance,
  builtInContentSet,
  engineOverrides,
  game,
  persistedContentSet,
}: {
  activeInstance: KangurLaunchableInstance;
  builtInContentSet: KangurLaunchableContentSet;
  engineOverrides: KangurGameRuntimeRendererProps | undefined;
  game: ReturnType<typeof getKangurGameDefinition>;
  persistedContentSet: KangurLaunchableContentSet;
}) => {
  const defaultRuntime = resolveKangurDefaultLaunchableRuntime({ activeInstance, game });
  if (!activeInstance || !defaultRuntime) {
    return null;
  }

  const contentSet = persistedContentSet ?? builtInContentSet;
  if (hasKangurMissingRequiredContentSet({ activeInstance, contentSet })) {
    return null;
  }

  return mergeKangurLaunchableRuntime({
    activeInstance,
    contentSet,
    defaultRuntime,
    engineOverrides,
  });
};

const isKangurLaunchableRuntimeWaitingForInstance = ({
  activeInstance,
  isPending,
}: {
  activeInstance: KangurLaunchableInstance;
  isPending: boolean;
}): boolean => !activeInstance && isPending;

const isKangurLaunchableRuntimeWaitingForContentSet = ({
  activeInstance,
  builtInContentSet,
  isPending,
  persistedContentSet,
}: {
  activeInstance: KangurLaunchableInstance;
  builtInContentSet: KangurLaunchableContentSet;
  isPending: boolean;
  persistedContentSet: KangurLaunchableContentSet;
}): boolean =>
  Boolean(activeInstance?.contentSetId) && !builtInContentSet && !persistedContentSet && isPending;

const renderKangurLaunchableGameInstanceRuntimeState = ({
  isWaiting,
  onFinish,
  runtime,
}: {
  isWaiting: boolean;
  onFinish: () => void;
  runtime: ReturnType<typeof resolveKangurLaunchableRuntime>;
}): React.JSX.Element => {
  if (isWaiting) {
    return <div data-testid='kangur-launchable-game-instance-runtime-loading' />;
  }

  if (!runtime) {
    return <div data-testid='kangur-launchable-game-instance-runtime-missing' />;
  }

  return <KangurLaunchableGameRuntime onFinish={onFinish} runtime={runtime} />;
};

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
    () => resolveKangurBuiltInGameInstance({ game, instanceId }),
    [game, instanceId]
  );
  const persistedInstance = useMemo(
    () =>
      resolveKangurPersistedGameInstance({
        gameId,
        instanceId,
        instances: gameInstanceQuery.data,
      }),
    [gameId, gameInstanceQuery.data, instanceId]
  );
  const activeInstance = persistedInstance ?? builtInInstance;
  const gameContentSetQuery = useKangurGameContentSets({
    contentSetId: activeInstance?.contentSetId ?? undefined,
    enabled: Boolean(activeInstance?.contentSetId),
    gameId,
  });
  const builtInContentSet = useMemo(
    () => resolveKangurBuiltInContentSet({ activeInstance, game }),
    [activeInstance?.contentSetId, game]
  );
  const persistedContentSet = useMemo(
    () =>
      resolveKangurPersistedContentSet({
        activeInstance,
        contentSets: gameContentSetQuery.data,
        gameId,
      }),
    [activeInstance?.contentSetId, gameContentSetQuery.data, gameId]
  );
  const runtime = useMemo(
    () =>
      resolveKangurLaunchableRuntime({
        activeInstance,
        builtInContentSet,
        engineOverrides,
        game,
        persistedContentSet,
      }),
    [activeInstance, builtInContentSet, engineOverrides, game, persistedContentSet]
  );

  const isWaitingForPersistedInstance = isKangurLaunchableRuntimeWaitingForInstance({
    activeInstance,
    isPending: gameInstanceQuery.isPending,
  });
  const isWaitingForPersistedContentSet = isKangurLaunchableRuntimeWaitingForContentSet({
    activeInstance,
    builtInContentSet,
    isPending: gameContentSetQuery.isPending,
    persistedContentSet,
  });

  return renderKangurLaunchableGameInstanceRuntimeState({
    isWaiting: isWaitingForPersistedInstance || isWaitingForPersistedContentSet,
    onFinish,
    runtime,
  });
}

export default KangurLaunchableGameInstanceRuntime;
