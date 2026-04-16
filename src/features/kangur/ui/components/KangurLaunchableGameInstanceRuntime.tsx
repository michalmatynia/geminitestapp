'use client';

import { useCallback, useEffect, useMemo, useRef } from 'react';

import {
  getKangurGameCatalogEntry,
  getKangurGameContentSetsForGame,
  getKangurGameBuiltInInstancesForGame,
  getKangurGameDefinition,
  getKangurLaunchableGameRuntimeSpecForGame,
  mergeKangurLaunchableGameRuntimeSpec,
} from '@/features/kangur/games';
import { trackKangurClientEvent } from '@/features/kangur/observability/client';
import { useKangurGameContentSets } from '@/features/kangur/ui/hooks/useKangurGameContentSets';
import { useKangurGameInstances } from '@/features/kangur/ui/hooks/useKangurGameInstances';
import type { KangurGameRuntimeRendererProps } from '@/shared/contracts/kangur-game-runtime-renderer-props';
import type { KangurGameInstanceId } from '@/shared/contracts/kangur-game-instances';
import type { KangurGameId } from '@/shared/contracts/kangur-games';

import KangurLessonActivityInstanceRuntime from './KangurLessonActivityInstanceRuntime';
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

const buildKangurLaunchableRuntimeTrackingPayload = ({
  activeInstance,
  builtInContentSet,
  engineOverrides,
  gameId,
  instanceId,
  persistedContentSet,
  persistedInstance,
  runtime,
}: {
  activeInstance: KangurLaunchableInstance;
  builtInContentSet: KangurLaunchableContentSet;
  engineOverrides: KangurGameRuntimeRendererProps | undefined;
  gameId: KangurGameId;
  instanceId: KangurGameInstanceId;
  persistedContentSet: KangurLaunchableContentSet;
  persistedInstance: KangurLaunchableInstance;
  runtime: NonNullable<ReturnType<typeof resolveKangurLaunchableRuntime>>;
}) => ({
  gameId,
  instanceId,
  runtimeScreen: runtime.screen,
  rendererId: runtime.rendererId,
  engineId: runtime.engineId ?? null,
  launchableRuntimeId: activeInstance?.launchableRuntimeId ?? runtime.screen,
  contentSetId: activeInstance?.contentSetId ?? null,
  instanceSource: persistedInstance ? 'persisted' : 'built_in',
  contentSetSource: persistedContentSet
    ? 'persisted'
    : builtInContentSet
      ? 'built_in'
      : 'none',
  hasInstanceEngineOverrides: Boolean(activeInstance?.engineOverrides),
  hasRuntimeEngineOverrides: Boolean(engineOverrides),
  hasRendererProps: Boolean(runtime.rendererProps),
});

const shouldPreferKangurLessonActivityRuntime = ({
  gameId,
  preferLessonActivityRuntime,
}: {
  gameId: KangurGameId;
  preferLessonActivityRuntime: boolean;
}): boolean => {
  if (!preferLessonActivityRuntime) {
    return false;
  }

  const entry = getKangurGameCatalogEntry(gameId);

  return Boolean(
    entry.lessonActivityRuntime && entry.launchableRuntime?.screen.endsWith('_quiz')
  );
};

export type KangurLaunchableGameRuntimeConfig = {
  engineOverrides?: KangurGameRuntimeRendererProps;
  gameId: KangurGameId;
  instanceId: KangurGameInstanceId;
  onFinish: () => void;
  preferLessonActivityRuntime?: boolean;
};

const KangurResolvedLaunchableGameInstanceRuntime = ({
  config,
}: {
  config: Omit<KangurLaunchableGameRuntimeConfig, 'preferLessonActivityRuntime'>;
}): React.JSX.Element => {
  const { engineOverrides, gameId, instanceId, onFinish } = config;
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
  const viewedRuntimeKeyRef = useRef<string | null>(null);

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
  const runtimeTrackingPayload = useMemo(
    () =>
      runtime
        ? buildKangurLaunchableRuntimeTrackingPayload({
            activeInstance,
            builtInContentSet,
            engineOverrides,
            gameId,
            instanceId,
            persistedContentSet,
            persistedInstance,
            runtime,
          })
        : null,
    [
      activeInstance,
      builtInContentSet,
      engineOverrides,
      gameId,
      instanceId,
      persistedContentSet,
      persistedInstance,
      runtime,
    ]
  );
  const runtimeTrackingKey = useMemo(
    () =>
      runtimeTrackingPayload
        ? [
            runtimeTrackingPayload.gameId,
            runtimeTrackingPayload.instanceId,
            runtimeTrackingPayload.runtimeScreen,
            runtimeTrackingPayload.rendererId,
            runtimeTrackingPayload.contentSetId ?? 'none',
            runtimeTrackingPayload.instanceSource,
            runtimeTrackingPayload.contentSetSource,
          ].join(':')
        : null,
    [runtimeTrackingPayload]
  );

  useEffect(() => {
    if (!runtimeTrackingPayload || !runtimeTrackingKey) {
      viewedRuntimeKeyRef.current = null;
      return;
    }

    if (viewedRuntimeKeyRef.current === runtimeTrackingKey) {
      return;
    }

    viewedRuntimeKeyRef.current = runtimeTrackingKey;
    trackKangurClientEvent('kangur_launchable_game_viewed', runtimeTrackingPayload);
  }, [runtimeTrackingKey, runtimeTrackingPayload]);

  const handleFinish = useCallback((): void => {
    if (runtimeTrackingPayload) {
      trackKangurClientEvent('kangur_launchable_game_finished', runtimeTrackingPayload);
    }

    onFinish();
  }, [onFinish, runtimeTrackingPayload]);

  return renderKangurLaunchableGameInstanceRuntimeState({
    isWaiting: isWaitingForPersistedInstance || isWaitingForPersistedContentSet,
    onFinish: handleFinish,
    runtime,
  });
};

export function KangurLaunchableGameInstanceRuntime(
  config: KangurLaunchableGameRuntimeConfig
): React.JSX.Element {
  const { gameId, preferLessonActivityRuntime = false } = config;
  const shouldUseLessonActivityRuntime = useMemo(
    () =>
      shouldPreferKangurLessonActivityRuntime({
        gameId,
        preferLessonActivityRuntime,
      }),
    [gameId, preferLessonActivityRuntime]
  );

  if (shouldUseLessonActivityRuntime) {
    return (
      <KangurLessonActivityInstanceRuntime
        config={config}
      />
    );
  }

  return (
    <KangurResolvedLaunchableGameInstanceRuntime
      config={config}
    />
  );
}

export default KangurLaunchableGameInstanceRuntime;
