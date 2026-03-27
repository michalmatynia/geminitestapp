import type {
  KangurGameContentSet,
  KangurGameContentSetId,
  KangurGameInstance,
  KangurGameInstanceId,
} from '@/shared/contracts/kangur-game-instances';
import { kangurGameInstanceSchema } from '@/shared/contracts/kangur-game-instances';
import type {
  KangurGameDefinition,
  KangurLaunchableGameRuntimeSpec,
} from '@/shared/contracts/kangur-games';

import { getKangurGameContentSetsForGame } from './content-sets';
import { getKangurLaunchableGameRuntimeSpecForGame } from './catalog';

const createBuiltInGameInstance = (
  game: KangurGameDefinition,
  runtime: KangurLaunchableGameRuntimeSpec,
  contentSet: KangurGameContentSet,
  input?: Partial<
    Pick<
      KangurGameInstance,
      'description' | 'emoji' | 'enabled' | 'engineOverrides' | 'sortOrder' | 'title'
    >
  >
): KangurGameInstance =>
  kangurGameInstanceSchema.parse({
    id: getKangurDefaultGameInstanceId(game.id),
    gameId: game.id,
    launchableRuntimeId: runtime.screen,
    contentSetId: contentSet.id,
    title: input?.title ?? `${game.title} default`,
    description:
      input?.description ??
      `Uses the default ${game.title} engine configuration and starter content feed.`,
    emoji: input?.emoji ?? game.emoji,
    enabled: input?.enabled ?? true,
    sortOrder: input?.sortOrder ?? 1,
    engineOverrides: input?.engineOverrides ?? {},
  });

export const getKangurDefaultGameInstanceId = (gameId: string): KangurGameInstanceId =>
  `${gameId}:instance:default`;

export const getKangurGameBuiltInInstancesForGame = (
  game: KangurGameDefinition
): KangurGameInstance[] => {
  const runtime = getKangurLaunchableGameRuntimeSpecForGame(game);
  if (!runtime) {
    return [];
  }

  const [defaultContentSet] = getKangurGameContentSetsForGame(game);
  if (!defaultContentSet) {
    return [];
  }

  switch (game.id) {
    case 'music_melody_repeat':
      return [
        createBuiltInGameInstance(game, runtime, defaultContentSet, {
          description:
            'Default melody-repeat lesson/library instance backed by the shared music engine.',
          title: 'Melody repeat default',
        }),
      ];
    case 'music_piano_roll_free_play':
      return [
        createBuiltInGameInstance(game, runtime, defaultContentSet, {
          description:
            'Default piano-roll free-play instance backed by the shared music engine.',
          title: 'Piano roll free play default',
        }),
      ];
    default:
      return [createBuiltInGameInstance(game, runtime, defaultContentSet)];
  }
};

export const mergeKangurGameInstancesForGame = (
  game: KangurGameDefinition,
  customInstances?: readonly KangurGameInstance[] | null
): KangurGameInstance[] => {
  const builtInInstances = getKangurGameBuiltInInstancesForGame(game);
  const merged = new Map<KangurGameInstanceId, KangurGameInstance>();

  for (const instance of builtInInstances) {
    merged.set(instance.id, instance);
  }

  for (const instance of customInstances ?? []) {
    if (instance.gameId !== game.id) {
      continue;
    }

    merged.set(instance.id, instance);
  }

  return [...merged.values()].sort(
    (left, right) =>
      left.sortOrder - right.sortOrder ||
      left.title.localeCompare(right.title) ||
      left.id.localeCompare(right.id)
  );
};

export const getKangurGameInstanceForGame = (
  game: KangurGameDefinition,
  instanceId: KangurGameInstanceId | null | undefined,
  customInstances?: readonly KangurGameInstance[] | null
): KangurGameInstance | null => {
  const instances = mergeKangurGameInstancesForGame(game, customInstances);
  if (instances.length === 0) {
    return null;
  }

  if (!instanceId) {
    return instances[0] ?? null;
  }

  return instances.find((instance) => instance.id === instanceId) ?? null;
};
