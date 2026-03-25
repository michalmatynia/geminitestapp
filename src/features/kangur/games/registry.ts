import type {
  KangurGameDefinition,
  KangurGameEngineId,
  KangurGameId,
} from '@/shared/contracts/kangur-games';
import type {
  KangurLessonActivityId,
  KangurLessonComponentId,
} from '@/features/kangur/shared/contracts/kangur';

import { createDefaultKangurGames } from './defaults';

const isDefined = <T>(value: T | undefined): value is T => value !== undefined;

export const KANGUR_GAME_LIBRARY = Object.freeze(
  createDefaultKangurGames().reduce<Record<KangurGameId, KangurGameDefinition>>((acc, game) => {
    acc[game.id] = game;
    return acc;
  }, {} as Record<KangurGameId, KangurGameDefinition>)
);

export const KANGUR_GAME_ORDER = Object.freeze(
  Object.values(KANGUR_GAME_LIBRARY)
    .slice()
    .sort((left, right) => left.sortOrder - right.sortOrder || left.title.localeCompare(right.title))
    .map((game) => game.id)
);

export const KANGUR_GAME_LIBRARY_LIST = Object.freeze(
  KANGUR_GAME_ORDER.map((gameId) => KANGUR_GAME_LIBRARY[gameId]).filter(isDefined)
);

export const KANGUR_GAME_ID_BY_LESSON_ACTIVITY_ID = Object.freeze(
  KANGUR_GAME_LIBRARY_LIST.reduce<Partial<Record<KangurLessonActivityId, KangurGameId>>>(
    (acc, game) => {
      game.activityIds.forEach((activityId) => {
        acc[activityId] = game.id;
      });
      return acc;
    },
    {}
  )
);

export const KANGUR_GAME_IDS_BY_LESSON_COMPONENT_ID = Object.freeze(
  KANGUR_GAME_LIBRARY_LIST.reduce<Partial<Record<KangurLessonComponentId, KangurGameId[]>>>(
    (acc, game) => {
      game.lessonComponentIds.forEach((componentId) => {
        const existing = acc[componentId] ?? [];
        acc[componentId] = [...existing, game.id];
      });
      return acc;
    },
    {}
  )
);

export const KANGUR_GAME_IDS_BY_ENGINE_ID = Object.freeze(
  KANGUR_GAME_LIBRARY_LIST.reduce<Partial<Record<KangurGameEngineId, KangurGameId[]>>>(
    (acc, game) => {
      const existing = acc[game.engineId] ?? [];
      acc[game.engineId] = [...existing, game.id];
      return acc;
    },
    {}
  )
);

export const getKangurGameDefinition = (gameId: KangurGameId): KangurGameDefinition => {
  const game = KANGUR_GAME_LIBRARY[gameId];
  if (!game) {
    throw new Error(`Missing Kangur game definition for "${gameId}".`);
  }

  return game;
};

export const getKangurGamesForLessonComponent = (
  componentId: KangurLessonComponentId
): KangurGameDefinition[] =>
  (KANGUR_GAME_IDS_BY_LESSON_COMPONENT_ID[componentId] ?? []).map((gameId) =>
    getKangurGameDefinition(gameId)
  );

export const getKangurGamesForEngine = (
  engineId: KangurGameEngineId
): KangurGameDefinition[] =>
  (KANGUR_GAME_IDS_BY_ENGINE_ID[engineId] ?? []).map((gameId) => getKangurGameDefinition(gameId));

export const getKangurGameForLessonActivity = (
  activityId: KangurLessonActivityId
): KangurGameDefinition | null => {
  const gameId = KANGUR_GAME_ID_BY_LESSON_ACTIVITY_ID[activityId];
  return gameId ? getKangurGameDefinition(gameId) : null;
};
