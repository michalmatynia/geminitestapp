'use client';

import { useMemo } from 'react';

import {
  getKangurGameDefinition,
  resolveKangurLaunchableGameRuntimeForPersistedInstance,
} from '@/features/kangur/games';
import { useKangurGameContentSets } from '@/features/kangur/ui/hooks/useKangurGameContentSets';
import { useKangurGameInstances } from '@/features/kangur/ui/hooks/useKangurGameInstances';
import {
  isKangurLaunchableGameScreen,
  type KangurLaunchableGameScreen,
} from '@/features/kangur/ui/services/game-launch';
import type { KangurGameScreen } from '@/features/kangur/ui/types';
import type {
  KangurGameContentSet,
  KangurGameInstance,
} from '@/shared/contracts/kangur-game-instances';

import { getKangurLaunchableGameScreenComponentConfig } from './Game.launchable-screens';

export type GameLaunchableRuntime =
  ReturnType<typeof getKangurLaunchableGameScreenComponentConfig>['runtime'];

const resolveLaunchableGameInstanceQueryEnabled = ({
  launchableGameInstanceId,
  screen,
}: {
  launchableGameInstanceId?: string | null;
  screen: KangurGameScreen;
}): boolean => isKangurLaunchableGameScreen(screen) && Boolean(launchableGameInstanceId);

const resolveLaunchableGameContentSetsQueryEnabled = ({
  contentSetId,
  screen,
}: {
  contentSetId?: string | null;
  screen: KangurGameScreen;
}): boolean => isKangurLaunchableGameScreen(screen) && Boolean(contentSetId);

const resolveLaunchableGameRuntimeLoading = ({
  activeLaunchableGameInstance,
  launchableGameContentSetsPending,
  launchableGameInstanceId,
  launchableGameInstancePending,
  screen,
}: {
  activeLaunchableGameInstance: { contentSetId?: string | null } | null;
  launchableGameContentSetsPending: boolean;
  launchableGameInstanceId?: string | null;
  launchableGameInstancePending: boolean;
  screen: KangurGameScreen;
}): boolean =>
  isKangurLaunchableGameScreen(screen) &&
  Boolean(launchableGameInstanceId) &&
  (launchableGameInstancePending ||
    (Boolean(activeLaunchableGameInstance?.contentSetId) && launchableGameContentSetsPending));

const resolveActiveLaunchableGameRuntime = ({
  activeLaunchableGameInstance,
  contentSets,
  launchableGameInstanceId,
  screen,
}: {
  activeLaunchableGameInstance: {
    contentSetId: KangurGameInstance['contentSetId'];
    engineOverrides?: KangurGameInstance['engineOverrides'];
    gameId: KangurGameInstance['gameId'];
    launchableRuntimeId: KangurGameInstance['launchableRuntimeId'];
  } | null;
  contentSets: readonly KangurGameContentSet[] | null | undefined;
  launchableGameInstanceId?: string | null;
  screen: KangurGameScreen;
}): GameLaunchableRuntime | null => {
  if (!isKangurLaunchableGameScreen(screen)) {
    return null;
  }

  const defaultRuntime = getKangurLaunchableGameScreenComponentConfig(screen).runtime;
  if (!launchableGameInstanceId) {
    return defaultRuntime;
  }

  if (!activeLaunchableGameInstance) {
    return null;
  }

  if (activeLaunchableGameInstance.launchableRuntimeId !== screen) {
    return null;
  }

  const game = getKangurGameDefinition(activeLaunchableGameInstance.gameId);
  return resolveKangurLaunchableGameRuntimeForPersistedInstance(
    game,
    {
      ...activeLaunchableGameInstance,
      engineOverrides: activeLaunchableGameInstance.engineOverrides ?? {},
      launchableRuntimeId: screen,
    },
    contentSets
  );
};

export function useGameLaunchableRuntime(input: {
  launchableGameInstanceId?: string | null;
  screen: KangurGameScreen;
}): {
  activeLaunchableGameRuntime: GameLaunchableRuntime | null;
  launchableGameRuntimeLoading: boolean;
} {
  const { launchableGameInstanceId, screen } = input;
  const launchableGameInstanceQuery = useKangurGameInstances({
    enabled: resolveLaunchableGameInstanceQueryEnabled({
      launchableGameInstanceId,
      screen,
    }),
    enabledOnly: true,
    instanceId: launchableGameInstanceId ?? undefined,
  });
  const activeLaunchableGameInstance = launchableGameInstanceQuery.data?.[0] ?? null;
  const launchableGameContentSetsQuery = useKangurGameContentSets({
    contentSetId: activeLaunchableGameInstance?.contentSetId ?? undefined,
    enabled: resolveLaunchableGameContentSetsQueryEnabled({
      contentSetId: activeLaunchableGameInstance?.contentSetId,
      screen,
    }),
    gameId: activeLaunchableGameInstance?.gameId,
  });
  const activeLaunchableGameRuntime = useMemo(
    () =>
      resolveActiveLaunchableGameRuntime({
        activeLaunchableGameInstance,
        contentSets: launchableGameContentSetsQuery.data,
        launchableGameInstanceId,
        screen,
      }),
    [
      activeLaunchableGameInstance,
      launchableGameContentSetsQuery.data,
      launchableGameInstanceId,
      screen,
    ]
  );

  return {
    activeLaunchableGameRuntime,
    launchableGameRuntimeLoading: resolveLaunchableGameRuntimeLoading({
      activeLaunchableGameInstance,
      launchableGameContentSetsPending: launchableGameContentSetsQuery.isPending,
      launchableGameInstanceId,
      launchableGameInstancePending: launchableGameInstanceQuery.isPending,
      screen,
    }),
  };
}
