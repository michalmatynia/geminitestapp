import type {
  KangurLessonActivityBlock,
  KangurLessonActivityId,
  KangurLessonActivityType,
} from '@/features/kangur/shared/contracts/kangur';
import {
  getKangurGameCatalogEntryForLessonActivity,
  getKangurLessonActivityRuntimeSpec,
} from '@/features/kangur/games';
import type { KangurLessonActivityRuntimeSpec } from '@/shared/contracts/kangur-games';

type KangurLessonActivityDefinition = {
  id: KangurLessonActivityId;
  type: KangurLessonActivityType;
  label: string;
  title: string;
  description: string;
  gameId?: string;
  engineId?: string;
  defaultVariantId?: string;
  lessonActivityRuntimeId?: KangurLessonActivityId;
  lessonActivityRuntime?: KangurLessonActivityRuntimeSpec | null;
};

const withGameScaffoldMetadata = (
  definition: Omit<
    KangurLessonActivityDefinition,
    'defaultVariantId' | 'engineId' | 'gameId'
  >
): KangurLessonActivityDefinition => {
  const entry = getKangurGameCatalogEntryForLessonActivity(definition.id);
  const lessonActivityRuntime =
    entry?.lessonActivityRuntime ?? getKangurLessonActivityRuntimeSpec(definition.id);

  return {
    ...definition,
    gameId: entry?.game.id,
    engineId: entry?.game.engineId,
    defaultVariantId: entry?.lessonVariant?.id ?? entry?.defaultVariant?.id,
    lessonActivityRuntimeId: lessonActivityRuntime?.activityId,
    lessonActivityRuntime,
  };
};

// ---------------------------------------------------------------------------
// Lazy-initialized lesson activity definitions — deferred to first access
// so pages that don't need lesson activities skip the game catalog indexing.
// ---------------------------------------------------------------------------

type KangurLessonActivityRawEntry = Omit<
  KangurLessonActivityDefinition,
  'defaultVariantId' | 'engineId' | 'gameId'
>;

const KANGUR_LESSON_ACTIVITY_RAW_ENTRIES: readonly KangurLessonActivityRawEntry[] = [
  {
    id: 'adding-ball',
    type: 'practice-drag-drop',
    label: 'Adding ball game',
    title: 'Gra z piłkami',
    description: 'Ćwicz dodawanie, przesuwając piłki i rozwiązując zadania krok po kroku.',
  },
  {
    id: 'adding-synthesis',
    type: 'practice-rhythm',
    label: 'Adding synthesis game',
    title: 'Synteza dodawania',
    description: 'Uderzaj w poprawny tor odpowiedzi, gdy działanie zbliża się do linii rytmu.',
  },
  {
    id: 'subtracting-game',
    type: 'practice-drag-drop',
    label: 'Subtracting game',
    title: 'Gra z odejmowaniem',
    description:
      'Przeciągaj i zabieraj obiekty, aby szybciej liczyć odejmowanie.',
  },
  {
    id: 'multiplication-array',
    type: 'practice-tap-select',
    label: 'Multiplication array game',
    title: 'Gra z grupami',
    description: 'Buduj grupy elementów i odkrywaj mnożenie przez układy oraz powtarzanie.',
  },
  {
    id: 'multiplication-quiz',
    type: 'practice-multiple-choice',
    label: 'Multiplication quiz',
    title: 'Quiz tabliczki',
    description: 'Sprawdź tabliczkę mnożenia w krótkim quizie z szybkimi pytaniami.',
  },
  {
    id: 'division-game',
    type: 'practice-multiple-choice',
    label: 'Division game',
    title: 'Gra z dzieleniem',
    description: 'Ćwicz dzielenie i rozdzielanie elementów w zadaniach interaktywnych.',
  },
  {
    id: 'geometry-drawing',
    type: 'training-drawing',
    label: 'Geometry drawing game',
    title: 'Rysuj figury',
    description: 'Rysuj kształty i sprawdzaj, jak dobrze rozpoznajesz figury geometryczne.',
  },
  {
    id: 'calendar-interactive',
    type: 'practice-calendar-interactive',
    label: 'Calendar interactive game',
    title: 'Gra z kalendarzem',
    description: 'Ćwicz daty, miesiące i dni tygodnia w interaktywnym kalendarzu.',
  },
  {
    id: 'clock-training',
    type: 'training-clock',
    label: 'Clock training game',
    title: 'Ćwiczenie z zegarem',
    description:
      'Ćwicz osobno godziny, minuty i pełny czas na zegarze analogowym w sekcjach treningowych.',
  },
];

let _lessonActivityDefinitions: Record<KangurLessonActivityId, KangurLessonActivityDefinition> | null = null;

const getLessonActivityDefinitions = (): Record<KangurLessonActivityId, KangurLessonActivityDefinition> => {
  if (!_lessonActivityDefinitions) {
    _lessonActivityDefinitions = KANGUR_LESSON_ACTIVITY_RAW_ENTRIES.reduce<
      Record<KangurLessonActivityId, KangurLessonActivityDefinition>
    >(
      (acc, entry) => {
        acc[entry.id] = withGameScaffoldMetadata(entry);
        return acc;
      },
      {} as Record<KangurLessonActivityId, KangurLessonActivityDefinition>
    );
  }
  return _lessonActivityDefinitions;
};

export const KANGUR_LESSON_ACTIVITY_DEFINITIONS: Record<
  KangurLessonActivityId,
  KangurLessonActivityDefinition
> = new Proxy(
  {} as Record<KangurLessonActivityId, KangurLessonActivityDefinition>,
  {
    get: (_target, prop, receiver) => Reflect.get(getLessonActivityDefinitions(), prop, receiver),
    has: (_target, prop) => Reflect.has(getLessonActivityDefinitions(), prop),
    ownKeys: () => Reflect.ownKeys(getLessonActivityDefinitions()),
    getOwnPropertyDescriptor: (_target, prop) =>
      Reflect.getOwnPropertyDescriptor(getLessonActivityDefinitions(), prop),
  }
);

let _lessonActivityOptions: { value: KangurLessonActivityId; label: string }[] | null = null;

export const KANGUR_LESSON_ACTIVITY_OPTIONS: { value: KangurLessonActivityId; label: string }[] =
  new Proxy([] as { value: KangurLessonActivityId; label: string }[], {
    get: (_target, prop, receiver) => {
      if (!_lessonActivityOptions) {
        _lessonActivityOptions = Object.values(getLessonActivityDefinitions()).map(
          (definition) => ({
            value: definition.id,
            label: definition.label,
          })
        );
      }
      return Reflect.get(_lessonActivityOptions, prop, receiver);
    },
    has: (_target, prop) => {
      if (!_lessonActivityOptions) {
        _lessonActivityOptions = Object.values(getLessonActivityDefinitions()).map(
          (definition) => ({
            value: definition.id,
            label: definition.label,
          })
        );
      }
      return Reflect.has(_lessonActivityOptions, prop);
    },
    ownKeys: () => {
      if (!_lessonActivityOptions) {
        _lessonActivityOptions = Object.values(getLessonActivityDefinitions()).map(
          (definition) => ({
            value: definition.id,
            label: definition.label,
          })
        );
      }
      return Reflect.ownKeys(_lessonActivityOptions);
    },
    getOwnPropertyDescriptor: (_target, prop) => {
      if (!_lessonActivityOptions) {
        _lessonActivityOptions = Object.values(getLessonActivityDefinitions()).map(
          (definition) => ({
            value: definition.id,
            label: definition.label,
          })
        );
      }
      return Reflect.getOwnPropertyDescriptor(_lessonActivityOptions, prop);
    },
  });

export const getKangurLessonActivityDefinition = (
  activityId: KangurLessonActivityId
): KangurLessonActivityDefinition => KANGUR_LESSON_ACTIVITY_DEFINITIONS[activityId];

export const applyKangurLessonActivityDefaults = (
  activityId: KangurLessonActivityId
): Pick<KangurLessonActivityBlock, 'activityId' | 'title' | 'description'> => {
  const definition = getKangurLessonActivityDefinition(activityId);
  return {
    activityId,
    title: definition.title,
    description: definition.description,
  };
};

export const retargetKangurLessonActivityBlock = (
  block: KangurLessonActivityBlock,
  activityId: KangurLessonActivityId
): KangurLessonActivityBlock => {
  if (block.activityId === activityId) {
    return block;
  }

  const previousDefinition = getKangurLessonActivityDefinition(block.activityId);
  const nextDefinition = getKangurLessonActivityDefinition(activityId);

  const shouldReplaceTitle = !block.title.trim() || block.title.trim() === previousDefinition.title;
  const shouldReplaceDescription =
    !block.description?.trim() || block.description.trim() === previousDefinition.description;

  return {
    ...block,
    activityId,
    title: shouldReplaceTitle ? nextDefinition.title : block.title,
    description: shouldReplaceDescription ? nextDefinition.description : block.description,
  };
};
