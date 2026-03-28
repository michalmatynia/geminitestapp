import type {
  KangurGameDefinition,
  KangurGameEngineCategory,
  KangurGameEngineDefinition,
  KangurGameEngineId,
  KangurGameEngineImplementationOwnership,
  KangurGameId,
  KangurLessonActivityRuntimeSpec,
  KangurGameMechanic,
  KangurGameStatus,
  KangurGameSurface,
  KangurGameVariant,
  KangurGameVariantSurface,
  KangurLaunchableGameRuntimeSpec,
  KangurLaunchableGameScreen,
} from '@/shared/contracts/kangur-games';
import {
  KANGUR_LAUNCHABLE_GAME_SCREENS,
  KANGUR_GAME_ENGINE_CATEGORIES,
  KANGUR_GAME_ENGINE_IMPLEMENTATION_OWNERSHIPS,
} from '@/shared/contracts/kangur-games';
import type {
  KangurLessonAgeGroup,
  KangurLessonActivityId,
  KangurLessonComponentId,
  KangurLessonSubject,
} from '@/features/kangur/shared/contracts/kangur';
import { KANGUR_LESSON_ACTIVITY_IDS } from '@/features/kangur/shared/contracts/kangur';

import { createDefaultKangurGameEngines } from './engines';
import { getOptionalKangurGameEngineImplementation } from './engine-implementations';
import { createDefaultKangurGames } from './defaults';
import { getKangurLaunchableGameRuntimeSpec } from './launchable-runtime-specs';
import { getKangurLessonActivityRuntimeSpec } from './lesson-activity-runtime-specs';

export { KANGUR_LAUNCHABLE_GAME_SCREENS };
export type { KangurLaunchableGameScreen };

export const isKangurLaunchableGameScreen = (
  value: string | null | undefined
): value is KangurLaunchableGameScreen =>
  Boolean(
    value && KANGUR_LAUNCHABLE_GAME_SCREENS.includes(value as KangurLaunchableGameScreen)
  );

export type KangurLaunchableGameContentId = `game:${KangurLaunchableGameScreen}`;

export const getKangurLaunchableGameContentId = (
  screen: KangurLaunchableGameScreen
): KangurLaunchableGameContentId => `game:${screen}`;

export const KANGUR_LAUNCHABLE_GAME_CONTENT_IDS: readonly KangurLaunchableGameContentId[] =
  KANGUR_LAUNCHABLE_GAME_SCREENS.map((screen) => getKangurLaunchableGameContentId(screen));

export const isKangurLaunchableGameContentId = (
  value: string | null | undefined
): value is KangurLaunchableGameContentId =>
  Boolean(
    value &&
      KANGUR_LAUNCHABLE_GAME_CONTENT_IDS.includes(value as KangurLaunchableGameContentId)
  );

export type KangurGameCatalogEntry = {
  game: KangurGameDefinition;
  engine: KangurGameEngineDefinition | null;
  defaultVariant: KangurGameVariant | null;
  lessonVariant: KangurGameVariant | null;
  lessonActivityRuntime: KangurLessonActivityRuntimeSpec | null;
  libraryPreviewVariant: KangurGameVariant | null;
  gameScreenVariant: KangurGameVariant | null;
  launchableScreen: KangurLaunchableGameScreen | null;
  launchableRuntime: KangurLaunchableGameRuntimeSpec | null;
};

export type KangurGameCatalogFilter = {
  gameId?: KangurGameId;
  subject?: KangurLessonSubject;
  ageGroup?: KangurLessonAgeGroup;
  gameStatus?: KangurGameStatus;
  surface?: KangurGameSurface;
  lessonComponentId?: KangurLessonComponentId;
  mechanic?: KangurGameMechanic;
  engineId?: KangurGameEngineId;
  engineCategory?: KangurGameEngineCategory;
  implementationOwnership?: KangurGameEngineImplementationOwnership;
  variantSurface?: KangurGameVariantSurface;
  variantStatus?: KangurGameStatus;
  launchableOnly?: boolean;
};

export type KangurGameCatalogFacets = {
  gameCount: number;
  games: Pick<KangurGameDefinition, 'id' | 'title' | 'sortOrder'>[];
  subjects: KangurLessonSubject[];
  ageGroups: KangurLessonAgeGroup[];
  statuses: KangurGameStatus[];
  surfaces: KangurGameSurface[];
  variantSurfaces: KangurGameVariantSurface[];
  variantStatuses: KangurGameStatus[];
  mechanics: KangurGameMechanic[];
  engineIds: KangurGameEngineId[];
  engineCategories: KangurGameEngineCategory[];
  implementationOwnerships: KangurGameEngineImplementationOwnership[];
  engines: KangurGameEngineDefinition[];
};

type CreateKangurGameCatalogInput = {
  engines?: KangurGameEngineDefinition[];
  games?: KangurGameDefinition[];
};

const isDefined = <T>(value: T | undefined): value is T => value !== undefined;

const getUniqueValues = <T>(values: T[]): T[] => Array.from(new Set(values));

const getSortedEngineCategories = (
  values: KangurGameEngineCategory[]
): KangurGameEngineCategory[] =>
  KANGUR_GAME_ENGINE_CATEGORIES.filter((category) => values.includes(category));

const getSortedImplementationOwnerships = (
  values: KangurGameEngineImplementationOwnership[]
): KangurGameEngineImplementationOwnership[] =>
  KANGUR_GAME_ENGINE_IMPLEMENTATION_OWNERSHIPS.filter((ownership) => values.includes(ownership));

const getUniqueEngines = (
  entries: KangurGameCatalogEntry[]
): KangurGameEngineDefinition[] =>
  Array.from(
    entries.reduce<Map<KangurGameEngineId, KangurGameEngineDefinition>>((map, entry) => {
      if (entry.engine) {
        map.set(entry.engine.id, entry.engine);
      }

      return map;
    }, new Map())
  )
    .map(([, engine]) => engine)
    .sort(
      (left, right) =>
        left.sortOrder - right.sortOrder || left.title.localeCompare(right.title)
    );

const getUniqueGames = (
  entries: KangurGameCatalogEntry[]
): Pick<KangurGameDefinition, 'id' | 'title' | 'sortOrder'>[] =>
  Array.from(
    entries.reduce<
      Map<KangurGameId, Pick<KangurGameDefinition, 'id' | 'title' | 'sortOrder'>>
    >((map, entry) => {
      map.set(entry.game.id, {
        id: entry.game.id,
        title: entry.game.title,
        sortOrder: entry.game.sortOrder,
      });
      return map;
    }, new Map())
  )
    .map(([, game]) => game)
    .sort(
      (left, right) =>
        left.sortOrder - right.sortOrder || left.title.localeCompare(right.title)
    );

const sortVariants = (
  left: Pick<KangurGameVariant, 'sortOrder'>,
  right: Pick<KangurGameVariant, 'sortOrder'>
): number => left.sortOrder - right.sortOrder;

const getSortedVariants = (game: KangurGameDefinition): KangurGameVariant[] =>
  game.variants.slice().sort(sortVariants);

const getGameVariantBySurface = (
  game: KangurGameDefinition,
  surface: KangurGameVariant['surface']
): KangurGameVariant | null =>
  getSortedVariants(game).find((variant) => variant.surface === surface) ?? null;

const getPreferredLessonVariant = (
  game: KangurGameDefinition
): KangurGameVariant | null => getGameVariantBySurface(game, 'lesson_inline');

const isKangurLessonActivityId = (
  value: string | null | undefined
): value is KangurLessonActivityId =>
  Boolean(value && KANGUR_LESSON_ACTIVITY_IDS.includes(value as KangurLessonActivityId));

const getKangurLessonActivityRuntimeIdFromVariant = (
  variant: Pick<KangurGameVariant, 'lessonActivityRuntimeId' | 'legacyActivityId'> | null | undefined
): KangurLessonActivityId | null => {
  if (variant?.lessonActivityRuntimeId && isKangurLessonActivityId(variant.lessonActivityRuntimeId)) {
    return variant.lessonActivityRuntimeId;
  }

  if (variant?.legacyActivityId && isKangurLessonActivityId(variant.legacyActivityId)) {
    return variant.legacyActivityId;
  }

  return null;
};

const getKangurLaunchableRuntimeIdFromVariant = (
  variant: Pick<KangurGameVariant, 'launchableRuntimeId' | 'legacyScreenId'> | null | undefined
): KangurLaunchableGameScreen | null => {
  if (variant?.launchableRuntimeId && isKangurLaunchableGameScreen(variant.launchableRuntimeId)) {
    return variant.launchableRuntimeId;
  }

  if (variant?.legacyScreenId && isKangurLaunchableGameScreen(variant.legacyScreenId)) {
    return variant.legacyScreenId;
  }

  return null;
};

export const getKangurLaunchableGameVariant = (
  game: KangurGameDefinition
): KangurGameVariant | null =>
  getSortedVariants(game).find(
    (variant) =>
      variant.surface === 'game_screen' &&
      variant.status === 'active' &&
      Boolean(getKangurLaunchableRuntimeIdFromVariant(variant))
  ) ?? null;

export const getKangurLaunchableGameRuntimeSpecForVariant = (
  variant: KangurGameVariant
): KangurLaunchableGameRuntimeSpec | null => {
  const runtimeId = getKangurLaunchableRuntimeIdFromVariant(variant);

  return runtimeId ? getKangurLaunchableGameRuntimeSpec(runtimeId) : null;
};

export const getKangurLessonActivityRuntimeSpecForVariant = (
  variant: KangurGameVariant
): KangurLessonActivityRuntimeSpec | null => {
  const runtimeId = getKangurLessonActivityRuntimeIdFromVariant(variant);

  return runtimeId ? getKangurLessonActivityRuntimeSpec(runtimeId) : null;
};

export const getKangurLessonActivityRuntimeSpecForGame = (
  game: KangurGameDefinition
): KangurLessonActivityRuntimeSpec | null => {
  const lessonVariant = getPreferredLessonVariant(game);

  if (lessonVariant) {
    return getKangurLessonActivityRuntimeSpecForVariant(lessonVariant);
  }

  const fallbackRuntimeId = game.activityIds.find(isKangurLessonActivityId) ?? null;

  return fallbackRuntimeId ? getKangurLessonActivityRuntimeSpec(fallbackRuntimeId) : null;
};

export const getKangurLaunchableGameRuntimeSpecForGame = (
  game: KangurGameDefinition
): KangurLaunchableGameRuntimeSpec | null => {
  const variantRuntime = getKangurLaunchableGameVariant(game);

  if (variantRuntime) {
    return getKangurLaunchableGameRuntimeSpecForVariant(variantRuntime);
  }

  const fallbackRuntimeId = game.legacyScreenIds.find(isKangurLaunchableGameScreen) ?? null;

  return fallbackRuntimeId ? getKangurLaunchableGameRuntimeSpec(fallbackRuntimeId) : null;
};

export const getKangurLaunchableGameScreen = (
  game: KangurGameDefinition
): KangurLaunchableGameScreen | null => getKangurLaunchableGameRuntimeSpecForGame(game)?.screen ?? null;

const createKangurGameCatalogEntry = (
  game: KangurGameDefinition,
  engine: KangurGameEngineDefinition | null
): KangurGameCatalogEntry => {
  const defaultVariant = getSortedVariants(game)[0] ?? null;
  const lessonVariant = getPreferredLessonVariant(game);
  const lessonActivityRuntime = getKangurLessonActivityRuntimeSpecForGame(game);
  const libraryPreviewVariant = getGameVariantBySurface(game, 'library_preview');
  const gameScreenVariant = getGameVariantBySurface(game, 'game_screen');
  const launchableRuntime = getKangurLaunchableGameRuntimeSpecForGame(game);

  return {
    game,
    engine,
    defaultVariant,
    lessonVariant,
    lessonActivityRuntime,
    libraryPreviewVariant,
    gameScreenVariant,
    launchableScreen: launchableRuntime?.screen ?? null,
    launchableRuntime,
  };
};

export const createKangurGameCatalogEntries = (
  input?: CreateKangurGameCatalogInput
): KangurGameCatalogEntry[] => {
  const games = input?.games ?? createDefaultKangurGames();
  const engines = input?.engines ?? createDefaultKangurGameEngines();
  const engineMap = new Map(engines.map((engine) => [engine.id, engine]));

  return games
    .slice()
    .sort((left, right) => left.sortOrder - right.sortOrder || left.title.localeCompare(right.title))
    .map((game) => createKangurGameCatalogEntry(game, engineMap.get(game.engineId) ?? null));
};

export const filterKangurGameCatalogEntries = (
  entries: KangurGameCatalogEntry[],
  filter?: KangurGameCatalogFilter
): KangurGameCatalogEntry[] => {
  let next = entries;

  if (filter?.gameId) {
    next = next.filter((entry) => entry.game.id === filter.gameId);
  }

  if (filter?.subject) {
    next = next.filter((entry) => entry.game.subject === filter.subject);
  }

  if (filter?.ageGroup) {
    next = next.filter((entry) => entry.game.ageGroup === filter.ageGroup);
  }

  if (filter?.gameStatus) {
    next = next.filter((entry) => entry.game.status === filter.gameStatus);
  }

  if (filter?.surface) {
    next = next.filter((entry) => entry.game.surfaces.includes(filter.surface as KangurGameSurface));
  }

  if (filter?.lessonComponentId) {
    next = next.filter((entry) =>
      entry.game.lessonComponentIds.includes(filter.lessonComponentId as KangurLessonComponentId)
    );
  }

  if (filter?.mechanic) {
    next = next.filter((entry) =>
      (entry.engine?.mechanics ?? [entry.game.mechanic]).includes(filter.mechanic as KangurGameMechanic)
    );
  }

  if (filter?.engineId) {
    next = next.filter((entry) => entry.game.engineId === filter.engineId);
  }

  if (filter?.engineCategory) {
    next = next.filter((entry) => entry.engine?.category === filter.engineCategory);
  }

  if (filter?.implementationOwnership) {
    next = next.filter(
      (entry) =>
        getOptionalKangurGameEngineImplementation(entry.game.engineId)?.ownership ===
        filter.implementationOwnership
    );
  }

  if (filter?.variantSurface) {
    next = next.filter((entry) =>
      entry.game.variants.some((variant) => variant.surface === filter.variantSurface)
    );
  }

  if (filter?.variantStatus) {
    next = next.filter((entry) =>
      entry.game.variants.some((variant) => variant.status === filter.variantStatus)
    );
  }

  if (filter?.launchableOnly) {
    next = next.filter((entry) => Boolean(entry.launchableScreen));
  }

  return next;
};

export const getKangurGameCatalogFacets = (
  entries: KangurGameCatalogEntry[]
): KangurGameCatalogFacets => ({
  gameCount: entries.length,
  games: getUniqueGames(entries),
  subjects: getUniqueValues(entries.map((entry) => entry.game.subject)),
  ageGroups: getUniqueValues(entries.map((entry) => entry.game.ageGroup).filter(isDefined)),
  statuses: getUniqueValues(entries.map((entry) => entry.game.status)),
  surfaces: getUniqueValues(entries.flatMap((entry) => entry.game.surfaces)),
  variantSurfaces: getUniqueValues(entries.flatMap((entry) => entry.game.variants.map((variant) => variant.surface))),
  variantStatuses: getUniqueValues(entries.flatMap((entry) => entry.game.variants.map((variant) => variant.status))),
  mechanics: getUniqueValues(
    entries.flatMap((entry) => entry.engine?.mechanics ?? [entry.game.mechanic])
  ),
  engineIds: getUniqueValues(entries.map((entry) => entry.game.engineId)),
  engineCategories: getSortedEngineCategories(
    getUniqueValues(
      entries.flatMap((entry) => (entry.engine?.category ? [entry.engine.category] : []))
    )
  ),
  implementationOwnerships: getSortedImplementationOwnerships(
    getUniqueValues(
      entries.flatMap((entry) => {
        const ownership = getOptionalKangurGameEngineImplementation(entry.game.engineId)?.ownership;
        return ownership ? [ownership] : [];
      })
    )
  ),
  engines: getUniqueEngines(entries),
});

// ---------------------------------------------------------------------------
// Lazy-initialized catalog singletons — deferred to first access so pages
// that never use the game catalog avoid the indexing cost at module init.
// ---------------------------------------------------------------------------

let _gameCatalogMap: Readonly<Record<KangurGameId, KangurGameCatalogEntry>> | null = null;
let _gameCatalogList: readonly KangurGameCatalogEntry[] | null = null;
let _gameCatalogByLessonActivityId: Readonly<Partial<Record<KangurLessonActivityId, KangurGameId>>> | null = null;
let _gameCatalogIdsByEngineId: Readonly<Partial<Record<KangurGameEngineId, KangurGameId[]>>> | null = null;
let _gameCatalogIdsByLessonComponentId: Readonly<Partial<Record<KangurLessonComponentId, KangurGameId[]>>> | null = null;

const getGameCatalogMap = (): Readonly<Record<KangurGameId, KangurGameCatalogEntry>> => {
  if (!_gameCatalogMap) {
    _gameCatalogMap = Object.freeze(
      createKangurGameCatalogEntries().reduce<Record<KangurGameId, KangurGameCatalogEntry>>(
        (acc, entry) => {
          acc[entry.game.id] = entry;
          return acc;
        },
        {} as Record<KangurGameId, KangurGameCatalogEntry>
      )
    );
  }
  return _gameCatalogMap;
};

const getGameCatalogList = (): readonly KangurGameCatalogEntry[] => {
  if (!_gameCatalogList) {
    _gameCatalogList = Object.freeze(
      Object.values(getGameCatalogMap())
        .slice()
        .sort(
          (left, right) =>
            left.game.sortOrder - right.game.sortOrder || left.game.title.localeCompare(right.game.title)
        )
    );
  }
  return _gameCatalogList;
};

const getGameCatalogByLessonActivityId = (): Readonly<Partial<Record<KangurLessonActivityId, KangurGameId>>> => {
  if (!_gameCatalogByLessonActivityId) {
    _gameCatalogByLessonActivityId = Object.freeze(
      getGameCatalogList().reduce<Partial<Record<KangurLessonActivityId, KangurGameId>>>(
        (acc, entry) => {
          entry.game.activityIds.forEach((activityId) => {
            acc[activityId] = entry.game.id;
          });
          return acc;
        },
        {}
      )
    );
  }
  return _gameCatalogByLessonActivityId;
};

const getGameCatalogIdsByEngineId = (): Readonly<Partial<Record<KangurGameEngineId, KangurGameId[]>>> => {
  if (!_gameCatalogIdsByEngineId) {
    _gameCatalogIdsByEngineId = Object.freeze(
      getGameCatalogList().reduce<Partial<Record<KangurGameEngineId, KangurGameId[]>>>(
        (acc, entry) => {
          const existing = acc[entry.game.engineId] ?? [];
          acc[entry.game.engineId] = [...existing, entry.game.id];
          return acc;
        },
        {}
      )
    );
  }
  return _gameCatalogIdsByEngineId;
};

const getGameCatalogIdsByLessonComponentId = (): Readonly<Partial<Record<KangurLessonComponentId, KangurGameId[]>>> => {
  if (!_gameCatalogIdsByLessonComponentId) {
    _gameCatalogIdsByLessonComponentId = Object.freeze(
      getGameCatalogList().reduce<Partial<Record<KangurLessonComponentId, KangurGameId[]>>>(
        (acc, entry) => {
          entry.game.lessonComponentIds.forEach((componentId) => {
            const existing = acc[componentId] ?? [];
            acc[componentId] = [...existing, entry.game.id];
          });
          return acc;
        },
        {}
      )
    );
  }
  return _gameCatalogIdsByLessonComponentId;
};

/**
 * Thin aliases preserving the original export names.
 * Each call delegates to the lazy singleton getter — zero cost until first access.
 */
export const KANGUR_GAME_CATALOG: Readonly<Record<KangurGameId, KangurGameCatalogEntry>> =
  new Proxy({} as Record<KangurGameId, KangurGameCatalogEntry>, {
    get: (_target, prop, receiver) => Reflect.get(getGameCatalogMap(), prop, receiver) as unknown,
    has: (_target, prop) => Reflect.has(getGameCatalogMap(), prop),
    ownKeys: () => Reflect.ownKeys(getGameCatalogMap()),
    getOwnPropertyDescriptor: (_target, prop) =>
      Reflect.getOwnPropertyDescriptor(getGameCatalogMap(), prop),
  });

export const KANGUR_GAME_CATALOG_LIST: readonly KangurGameCatalogEntry[] =
  new Proxy([] as KangurGameCatalogEntry[], {
    get: (_target, prop, receiver) => Reflect.get(getGameCatalogList(), prop, receiver) as unknown,
    has: (_target, prop) => Reflect.has(getGameCatalogList(), prop),
    ownKeys: () => Reflect.ownKeys(getGameCatalogList()),
    getOwnPropertyDescriptor: (_target, prop) =>
      Reflect.getOwnPropertyDescriptor(getGameCatalogList(), prop),
  });

export const KANGUR_GAME_CATALOG_BY_LESSON_ACTIVITY_ID: Readonly<Partial<Record<KangurLessonActivityId, KangurGameId>>> =
  new Proxy({} as Partial<Record<KangurLessonActivityId, KangurGameId>>, {
    get: (_target, prop, receiver) => Reflect.get(getGameCatalogByLessonActivityId(), prop, receiver) as unknown,
    has: (_target, prop) => Reflect.has(getGameCatalogByLessonActivityId(), prop),
    ownKeys: () => Reflect.ownKeys(getGameCatalogByLessonActivityId()),
    getOwnPropertyDescriptor: (_target, prop) =>
      Reflect.getOwnPropertyDescriptor(getGameCatalogByLessonActivityId(), prop),
  });

export const KANGUR_GAME_CATALOG_IDS_BY_ENGINE_ID: Readonly<Partial<Record<KangurGameEngineId, KangurGameId[]>>> =
  new Proxy({} as Partial<Record<KangurGameEngineId, KangurGameId[]>>, {
    get: (_target, prop, receiver) => Reflect.get(getGameCatalogIdsByEngineId(), prop, receiver) as unknown,
    has: (_target, prop) => Reflect.has(getGameCatalogIdsByEngineId(), prop),
    ownKeys: () => Reflect.ownKeys(getGameCatalogIdsByEngineId()),
    getOwnPropertyDescriptor: (_target, prop) =>
      Reflect.getOwnPropertyDescriptor(getGameCatalogIdsByEngineId(), prop),
  });

export const KANGUR_GAME_CATALOG_IDS_BY_LESSON_COMPONENT_ID: Readonly<Partial<Record<KangurLessonComponentId, KangurGameId[]>>> =
  new Proxy({} as Partial<Record<KangurLessonComponentId, KangurGameId[]>>, {
    get: (_target, prop, receiver) => Reflect.get(getGameCatalogIdsByLessonComponentId(), prop, receiver) as unknown,
    has: (_target, prop) => Reflect.has(getGameCatalogIdsByLessonComponentId(), prop),
    ownKeys: () => Reflect.ownKeys(getGameCatalogIdsByLessonComponentId()),
    getOwnPropertyDescriptor: (_target, prop) =>
      Reflect.getOwnPropertyDescriptor(getGameCatalogIdsByLessonComponentId(), prop),
  });

export const getKangurGameCatalogEntry = (gameId: KangurGameId): KangurGameCatalogEntry => {
  const entry = getGameCatalogMap()[gameId];

  if (!entry) {
    throw new Error(`Missing Kangur game catalog entry for "${gameId}".`);
  }

  return entry;
};

export const getKangurGameCatalogEntryForLessonActivity = (
  activityId: KangurLessonActivityId
): KangurGameCatalogEntry | null =>
  getGameCatalogList().find((entry) =>
    entry.game.activityIds.includes(activityId)
  ) ?? null;

export const getKangurGameCatalogEntriesForEngine = (
  engineId: KangurGameEngineId
): KangurGameCatalogEntry[] =>
  getGameCatalogList().filter((entry) => entry.game.engineId === engineId);

export const getKangurGameCatalogEntriesForLessonComponent = (
  componentId: KangurLessonComponentId
): KangurGameCatalogEntry[] =>
  getGameCatalogList().filter((entry) =>
    entry.game.lessonComponentIds.includes(componentId)
  );
