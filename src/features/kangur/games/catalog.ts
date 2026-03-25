import type {
  KangurGameDefinition,
  KangurGameEngineCategory,
  KangurGameEngineDefinition,
  KangurGameEngineId,
  KangurGameId,
  KangurGameMechanic,
  KangurGameStatus,
  KangurGameSurface,
  KangurGameVariant,
  KangurGameVariantSurface,
} from '@/shared/contracts/kangur-games';
import { KANGUR_GAME_ENGINE_CATEGORIES } from '@/shared/contracts/kangur-games';
import type {
  KangurLessonAgeGroup,
  KangurLessonActivityId,
  KangurLessonComponentId,
  KangurLessonSubject,
} from '@/features/kangur/shared/contracts/kangur';

import { createDefaultKangurGameEngines } from './engines';
import { createDefaultKangurGames } from './defaults';

export const KANGUR_LAUNCHABLE_GAME_SCREENS = [
  'calendar_quiz',
  'geometry_quiz',
  'clock_quiz',
  'addition_quiz',
  'subtraction_quiz',
  'multiplication_quiz',
  'division_quiz',
  'logical_patterns_quiz',
  'logical_classification_quiz',
  'logical_analogies_quiz',
  'english_sentence_quiz',
  'english_parts_of_speech_quiz',
] as const;

export type KangurLaunchableGameScreen = (typeof KANGUR_LAUNCHABLE_GAME_SCREENS)[number];

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
  libraryPreviewVariant: KangurGameVariant | null;
  gameScreenVariant: KangurGameVariant | null;
  launchableScreen: KangurLaunchableGameScreen | null;
};

export type KangurGameCatalogFilter = {
  subject?: KangurLessonSubject;
  ageGroup?: KangurLessonAgeGroup;
  gameStatus?: KangurGameStatus;
  surface?: KangurGameSurface;
  lessonComponentId?: KangurLessonComponentId;
  mechanic?: KangurGameMechanic;
  engineId?: KangurGameEngineId;
  engineCategory?: KangurGameEngineCategory;
  variantSurface?: KangurGameVariantSurface;
  variantStatus?: KangurGameStatus;
  launchableOnly?: boolean;
};

export type KangurGameCatalogFacets = {
  gameCount: number;
  subjects: KangurLessonSubject[];
  ageGroups: KangurLessonAgeGroup[];
  statuses: KangurGameStatus[];
  surfaces: KangurGameSurface[];
  variantSurfaces: KangurGameVariantSurface[];
  variantStatuses: KangurGameStatus[];
  mechanics: KangurGameMechanic[];
  engineIds: KangurGameEngineId[];
  engineCategories: KangurGameEngineCategory[];
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

export const getKangurLaunchableGameVariant = (
  game: KangurGameDefinition
): KangurGameVariant | null =>
  getSortedVariants(game).find(
    (variant) =>
      variant.surface === 'game_screen' &&
      variant.status === 'active' &&
      isKangurLaunchableGameScreen(variant.legacyScreenId)
  ) ?? null;

export const getKangurLaunchableGameScreen = (
  game: KangurGameDefinition
): KangurLaunchableGameScreen | null => {
  const variant = getKangurLaunchableGameVariant(game);

  if (variant?.legacyScreenId && isKangurLaunchableGameScreen(variant.legacyScreenId)) {
    return variant.legacyScreenId;
  }

  return game.legacyScreenIds.find(isKangurLaunchableGameScreen) ?? null;
};

const createKangurGameCatalogEntry = (
  game: KangurGameDefinition,
  engine: KangurGameEngineDefinition | null
): KangurGameCatalogEntry => ({
  game,
  engine,
  defaultVariant: getSortedVariants(game)[0] ?? null,
  lessonVariant:
    getGameVariantBySurface(game, 'lesson_inline') ?? getGameVariantBySurface(game, 'lesson_stage'),
  libraryPreviewVariant: getGameVariantBySurface(game, 'library_preview'),
  gameScreenVariant: getGameVariantBySurface(game, 'game_screen'),
  launchableScreen: getKangurLaunchableGameScreen(game),
});

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
  engines: getUniqueEngines(entries),
});

export const KANGUR_GAME_CATALOG = Object.freeze(
  createKangurGameCatalogEntries().reduce<Record<KangurGameId, KangurGameCatalogEntry>>(
    (acc, entry) => {
      acc[entry.game.id] = entry;
      return acc;
    },
    {} as Record<KangurGameId, KangurGameCatalogEntry>
  )
);

export const KANGUR_GAME_CATALOG_LIST = Object.freeze(
  Object.values(KANGUR_GAME_CATALOG)
    .slice()
    .sort(
      (left, right) =>
        left.game.sortOrder - right.game.sortOrder || left.game.title.localeCompare(right.game.title)
    )
);

export const KANGUR_GAME_CATALOG_BY_LESSON_ACTIVITY_ID = Object.freeze(
  KANGUR_GAME_CATALOG_LIST.reduce<Partial<Record<KangurLessonActivityId, KangurGameId>>>(
    (acc, entry) => {
      entry.game.activityIds.forEach((activityId) => {
        acc[activityId] = entry.game.id;
      });
      return acc;
    },
    {}
  )
);

export const KANGUR_GAME_CATALOG_IDS_BY_ENGINE_ID = Object.freeze(
  KANGUR_GAME_CATALOG_LIST.reduce<Partial<Record<KangurGameEngineId, KangurGameId[]>>>(
    (acc, entry) => {
      const existing = acc[entry.game.engineId] ?? [];
      acc[entry.game.engineId] = [...existing, entry.game.id];
      return acc;
    },
    {}
  )
);

export const KANGUR_GAME_CATALOG_IDS_BY_LESSON_COMPONENT_ID = Object.freeze(
  KANGUR_GAME_CATALOG_LIST.reduce<Partial<Record<KangurLessonComponentId, KangurGameId[]>>>(
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

const createDefaultKangurGameCatalogSnapshot = (): KangurGameCatalogEntry[] =>
  createKangurGameCatalogEntries();

export const getKangurGameCatalogEntry = (gameId: KangurGameId): KangurGameCatalogEntry => {
  const entry = createDefaultKangurGameCatalogSnapshot().find(
    (candidate) => candidate.game.id === gameId
  );

  if (!entry) {
    throw new Error(`Missing Kangur game catalog entry for "${gameId}".`);
  }

  return entry;
};

export const getKangurGameCatalogEntryForLessonActivity = (
  activityId: KangurLessonActivityId
): KangurGameCatalogEntry | null =>
  createDefaultKangurGameCatalogSnapshot().find((entry) =>
    entry.game.activityIds.includes(activityId)
  ) ?? null;

export const getKangurGameCatalogEntriesForEngine = (
  engineId: KangurGameEngineId
): KangurGameCatalogEntry[] =>
  createDefaultKangurGameCatalogSnapshot().filter((entry) => entry.game.engineId === engineId);

export const getKangurGameCatalogEntriesForLessonComponent = (
  componentId: KangurLessonComponentId
): KangurGameCatalogEntry[] =>
  createDefaultKangurGameCatalogSnapshot().filter((entry) =>
    entry.game.lessonComponentIds.includes(componentId)
  );
