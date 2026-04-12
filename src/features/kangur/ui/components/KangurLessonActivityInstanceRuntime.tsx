'use client';

import { useMemo } from 'react';

import {
  getKangurGameBuiltInInstancesForGame,
  getKangurGameContentSetsForGame,
  getKangurGameDefinition,
  getKangurLessonActivityRuntimeSpecForGame,
} from '@/features/kangur/games';
import { useKangurGameContentSets } from '@/features/kangur/ui/hooks/useKangurGameContentSets';
import { useKangurGameInstances } from '@/features/kangur/ui/hooks/useKangurGameInstances';
import type { KangurGameRuntimeRendererProps } from '@/shared/contracts/kangur-game-runtime-renderer-props';
import type { KangurGameInstanceId } from '@/shared/contracts/kangur-game-instances';
import type { KangurGameId } from '@/shared/contracts/kangur-games';

import { KangurLessonActivityRuntime } from './KangurLessonActivityRuntime';
import { KangurLessonActivityRuntimeProvider } from './lesson-runtime/KangurLessonActivityBlock';

type KangurGameInstancesQuery = ReturnType<typeof useKangurGameInstances>;
type KangurGameContentSetsQuery = ReturnType<typeof useKangurGameContentSets>;
type KangurLessonActivityInstance = NonNullable<KangurGameInstancesQuery['data']>[number] | null;
type KangurLessonActivityContentSet =
  NonNullable<KangurGameContentSetsQuery['data']>[number] | null;

const resolveKangurBuiltInGameInstance = ({
  game,
  instanceId,
}: {
  game: ReturnType<typeof getKangurGameDefinition>;
  instanceId: KangurGameInstanceId;
}): KangurLessonActivityInstance =>
  getKangurGameBuiltInInstancesForGame(game).find((candidate) => candidate.id === instanceId) ??
  null;

const resolveKangurPersistedGameInstance = ({
  gameId,
  instanceId,
  instances,
}: {
  gameId: KangurGameId;
  instanceId: KangurGameInstanceId;
  instances: KangurGameInstancesQuery['data'];
}): KangurLessonActivityInstance =>
  instances?.find((candidate) => candidate.id === instanceId && candidate.gameId === gameId) ??
  null;

const resolveKangurBuiltInContentSet = ({
  activeInstance,
  game,
}: {
  activeInstance: KangurLessonActivityInstance;
  game: ReturnType<typeof getKangurGameDefinition>;
}): KangurLessonActivityContentSet =>
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
  activeInstance: KangurLessonActivityInstance;
  contentSets: KangurGameContentSetsQuery['data'];
  gameId: KangurGameId;
}): KangurLessonActivityContentSet =>
  activeInstance?.contentSetId
    ? contentSets?.find(
        (candidate) =>
          candidate.id === activeInstance.contentSetId && candidate.gameId === gameId
      ) ?? null
    : null;

const hasKangurMissingRequiredContentSet = ({
  activeInstance,
  contentSet,
}: {
  activeInstance: KangurLessonActivityInstance;
  contentSet: KangurLessonActivityContentSet;
}): boolean => Boolean(activeInstance?.contentSetId) && !contentSet;

const mergeKangurRendererProps = (
  ...layers: Array<KangurGameRuntimeRendererProps | undefined>
): KangurGameRuntimeRendererProps | undefined => {
  const merged = layers.reduce<KangurGameRuntimeRendererProps>(
    (acc, current) => ({ ...acc, ...(current ?? {}) }),
    {}
  );

  return Object.keys(merged).length > 0 ? merged : undefined;
};

const resolveKangurLessonActivityRendererProps = ({
  activeInstance,
  builtInContentSet,
  engineOverrides,
  game,
  persistedContentSet,
}: {
  activeInstance: KangurLessonActivityInstance;
  builtInContentSet: KangurLessonActivityContentSet;
  engineOverrides: KangurGameRuntimeRendererProps | undefined;
  game: ReturnType<typeof getKangurGameDefinition>;
  persistedContentSet: KangurLessonActivityContentSet;
}) => {
  if (!activeInstance) {
    return null;
  }

  const runtime = getKangurLessonActivityRuntimeSpecForGame(game);
  if (!runtime) {
    return null;
  }

  const contentSet = persistedContentSet ?? builtInContentSet;
  if (hasKangurMissingRequiredContentSet({ activeInstance, contentSet })) {
    return null;
  }

  return mergeKangurRendererProps(
    contentSet?.rendererProps,
    activeInstance.engineOverrides,
    engineOverrides
  );
};

const isKangurLessonActivityRuntimeWaitingForInstance = ({
  activeInstance,
  isPending,
}: {
  activeInstance: KangurLessonActivityInstance;
  isPending: boolean;
}): boolean => !activeInstance && isPending;

const isKangurLessonActivityRuntimeWaitingForContentSet = ({
  activeInstance,
  builtInContentSet,
  isPending,
  persistedContentSet,
}: {
  activeInstance: KangurLessonActivityInstance;
  builtInContentSet: KangurLessonActivityContentSet;
  isPending: boolean;
  persistedContentSet: KangurLessonActivityContentSet;
}): boolean =>
  Boolean(activeInstance?.contentSetId) && !builtInContentSet && !persistedContentSet && isPending;

const KangurLessonActivityInstanceRuntimeView = ({
  isWaiting,
  rendererProps,
  runtime,
}: {
  isWaiting: boolean;
  rendererProps: KangurGameRuntimeRendererProps | null | undefined;
  runtime: ReturnType<typeof getKangurLessonActivityRuntimeSpecForGame>;
}): React.JSX.Element => {
  if (isWaiting) {
    return <div data-testid='kangur-lesson-activity-instance-runtime-loading' />;
  }

  if (!runtime) {
    return <div data-testid='kangur-lesson-activity-instance-runtime-missing' />;
  }

  return (
    <KangurLessonActivityRuntime
      rendererProps={rendererProps ?? undefined}
      runtime={runtime}
    />
  );
};

export function KangurLessonActivityInstanceRuntime({
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
  const runtime = useMemo(() => getKangurLessonActivityRuntimeSpecForGame(game), [game]);
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
  const isMissingRequiredContentSet = hasKangurMissingRequiredContentSet({
    activeInstance,
    contentSet: persistedContentSet ?? builtInContentSet,
  });
  const rendererProps = useMemo(
    () =>
      resolveKangurLessonActivityRendererProps({
        activeInstance,
        builtInContentSet,
        engineOverrides,
        game,
        persistedContentSet,
      }),
    [activeInstance, builtInContentSet, engineOverrides, game, persistedContentSet]
  );

  const isWaitingForPersistedInstance = isKangurLessonActivityRuntimeWaitingForInstance({
    activeInstance,
    isPending: gameInstanceQuery.isPending,
  });
  const isWaitingForPersistedContentSet = isKangurLessonActivityRuntimeWaitingForContentSet({
    activeInstance,
    builtInContentSet,
    isPending: gameContentSetQuery.isPending,
    persistedContentSet,
  });

  return (
    <KangurLessonActivityRuntimeProvider onFinish={onFinish}>
      <KangurLessonActivityInstanceRuntimeView
        isWaiting={isWaitingForPersistedInstance || isWaitingForPersistedContentSet}
        rendererProps={rendererProps}
        runtime={activeInstance && !isMissingRequiredContentSet ? runtime : null}
      />
    </KangurLessonActivityRuntimeProvider>
  );
}

export default KangurLessonActivityInstanceRuntime;
