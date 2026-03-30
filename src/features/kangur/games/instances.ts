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
import { KANGUR_MUSIC_PIANO_ROLL_BUILT_IN_INSTANCE_CONFIGS } from './music-piano-roll-contract';

const getKangurBuiltInInstanceSuffix = (
  gameId: string,
  contentSetId: KangurGameContentSetId | null | undefined
): string => {
  if (!contentSetId) {
    return 'default';
  }

  const gameScopedPrefix = `${gameId}:`;

  if (contentSetId.startsWith(gameScopedPrefix)) {
    return contentSetId.slice(gameScopedPrefix.length) || 'default';
  }

  return contentSetId;
};

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
    id: getKangurBuiltInGameInstanceId(game.id, contentSet.id),
    gameId: game.id,
    launchableRuntimeId: runtime.screen,
    contentSetId: contentSet.id,
    title: input?.title ?? `${game.title} · ${contentSet.label}`,
    description:
      input?.description ??
      `Uses the shared ${game.title} engine with the "${contentSet.label}" content feed.`,
    emoji: input?.emoji ?? game.emoji,
    enabled: input?.enabled ?? true,
    sortOrder: input?.sortOrder ?? 1,
    engineOverrides: input?.engineOverrides ?? {},
  });

export const getKangurDefaultGameInstanceId = (gameId: string): KangurGameInstanceId =>
  `${gameId}:instance:default`;

export const getKangurBuiltInGameInstanceId = (
  gameId: string,
  contentSetId?: KangurGameContentSetId | null
): KangurGameInstanceId =>
  `${gameId}:instance:${getKangurBuiltInInstanceSuffix(gameId, contentSetId)}`;

export const getKangurGameBuiltInInstancesForGame = (
  game: KangurGameDefinition
): KangurGameInstance[] => {
  const runtime = getKangurLaunchableGameRuntimeSpecForGame(game);
  if (!runtime) {
    return [];
  }

  const builtInContentSets = getKangurGameContentSetsForGame(game);
  const [defaultContentSet] = builtInContentSets;

  if (!defaultContentSet) {
    return [];
  }

  const musicBuiltInInstanceConfig =
    KANGUR_MUSIC_PIANO_ROLL_BUILT_IN_INSTANCE_CONFIGS[
      game.id as keyof typeof KANGUR_MUSIC_PIANO_ROLL_BUILT_IN_INSTANCE_CONFIGS
    ];

  if (musicBuiltInInstanceConfig) {
    const musicContentSet =
      builtInContentSets.find((contentSet) => contentSet.id === musicBuiltInInstanceConfig.contentSetId) ??
      defaultContentSet;

    return [
      createBuiltInGameInstance(game, runtime, musicContentSet, {
        description: musicBuiltInInstanceConfig.description,
        title: musicBuiltInInstanceConfig.title,
      }),
    ];
  }

  return builtInContentSets.map((contentSet, index) =>
    createBuiltInGameInstance(game, runtime, contentSet, {
      sortOrder: index + 1,
      title:
        contentSet.contentKind === 'default_content'
          ? `${game.title} default`
          : `${game.title} · ${contentSet.label}`,
    })
  );
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
