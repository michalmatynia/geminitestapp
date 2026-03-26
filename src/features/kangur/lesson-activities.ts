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
import { normalizeSiteLocale } from '@/shared/lib/i18n/site-locale';

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

type KangurLessonActivityLocalizedCopy = Pick<
  KangurLessonActivityDefinition,
  'description' | 'title'
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

const KANGUR_LESSON_ACTIVITY_COPY_BY_LOCALE: Partial<
  Record<
    ReturnType<typeof normalizeSiteLocale>,
    Partial<Record<KangurLessonActivityId, KangurLessonActivityLocalizedCopy>>
  >
> = {
  en: {
    'adding-ball': {
      title: 'Ball game',
      description: 'Practise addition by moving balls and solving step-by-step tasks.',
    },
    'adding-synthesis': {
      title: 'Addition rhythm',
      description: 'Hit the correct answer lane as the sum reaches the beat line.',
    },
    'subtracting-game': {
      title: 'Subtraction game',
      description: 'Drag and remove objects to count subtraction faster.',
    },
    'multiplication-array': {
      title: 'Group builder',
      description: 'Build groups of items and discover multiplication through arrays and repetition.',
    },
    'multiplication-quiz': {
      title: 'Times tables quiz',
      description: 'Check your multiplication tables in a short quick-fire quiz.',
    },
    'division-game': {
      title: 'Division game',
      description: 'Practise division and sharing items in interactive tasks.',
    },
    'geometry-drawing': {
      title: 'Draw shapes',
      description: 'Draw shapes and check how well you recognise geometric figures.',
    },
    'calendar-interactive': {
      title: 'Calendar game',
      description: 'Practise dates, months, and days of the week in an interactive calendar.',
    },
    'clock-training': {
      title: 'Clock practice',
      description:
        'Practise hours, minutes, and full time on the analogue clock in training sections.',
    },
  },
  de: {
    'adding-ball': {
      title: 'Ballspiel',
      description:
        'Ube Addition, indem du Balle bewegst und Aufgaben Schritt fur Schritt lost.',
    },
    'adding-synthesis': {
      title: 'Additionsrhythmus',
      description:
        'Triff die richtige Antwortspur, wenn die Aufgabe an die Taktlinie kommt.',
    },
    'subtracting-game': {
      title: 'Subtraktionsspiel',
      description: 'Ziehe Objekte weg, um Subtraktion schneller zu rechnen.',
    },
    'multiplication-array': {
      title: 'Gruppenspiel',
      description:
        'Baue Gruppen aus Elementen und entdecke Multiplikation uber Muster und Wiederholung.',
    },
    'multiplication-quiz': {
      title: 'Einmaleins-Quiz',
      description: 'Prufe das Einmaleins in einem kurzen Quiz mit schnellen Fragen.',
    },
    'division-game': {
      title: 'Divisionsspiel',
      description: 'Ube Division und das Aufteilen von Elementen in interaktiven Aufgaben.',
    },
    'geometry-drawing': {
      title: 'Formen zeichnen',
      description:
        'Zeichne Formen und prufe, wie gut du geometrische Figuren erkennst.',
    },
    'calendar-interactive': {
      title: 'Kalenderspiel',
      description: 'Ube Daten, Monate und Wochentage in einem interaktiven Kalender.',
    },
    'clock-training': {
      title: 'Uhrtraining',
      description:
        'Ube Stunden, Minuten und ganze Uhrzeiten auf der analogen Uhr in Trainingsabschnitten.',
    },
  },
  uk: {
    'adding-ball': {
      title: 'Гра з кульками',
      description: 'Тренуй додавання, пересуваючи кульки та розвʼязуючи завдання крок за кроком.',
    },
    'adding-synthesis': {
      title: 'Ритм додавання',
      description: 'Влучай у правильну доріжку відповіді, коли приклад наближається до лінії ритму.',
    },
    'subtracting-game': {
      title: 'Гра на віднімання',
      description: 'Перетягуй і прибирай предмети, щоб швидше рахувати віднімання.',
    },
    'multiplication-array': {
      title: 'Гра з групами',
      description: 'Будуй групи предметів і відкривай множення через схеми та повторення.',
    },
    'multiplication-quiz': {
      title: 'Вікторина з множення',
      description: 'Перевіряй таблицю множення в короткій вікторині з швидкими запитаннями.',
    },
    'division-game': {
      title: 'Гра на ділення',
      description: 'Тренуй ділення та розподіл предметів в інтерактивних завданнях.',
    },
    'geometry-drawing': {
      title: 'Малюй фігури',
      description: 'Малюй фігури й перевіряй, як добре ти розпізнаєш геометричні форми.',
    },
    'calendar-interactive': {
      title: 'Гра з календарем',
      description: 'Тренуй дати, місяці та дні тижня в інтерактивному календарі.',
    },
    'clock-training': {
      title: 'Тренування з годинником',
      description:
        'Тренуй окремо години, хвилини й повний час на аналоговому годиннику в навчальних секціях.',
    },
  },
};

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
      return Reflect.get(_lessonActivityOptions, prop, receiver) as unknown;
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

export const getLocalizedKangurLessonActivityDefinition = (
  activityId: KangurLessonActivityId,
  locale?: string | null
): KangurLessonActivityDefinition => {
  const definition = getKangurLessonActivityDefinition(activityId);
  const localizedCopy =
    KANGUR_LESSON_ACTIVITY_COPY_BY_LOCALE[normalizeSiteLocale(locale)]?.[activityId];

  return localizedCopy ? { ...definition, ...localizedCopy } : definition;
};

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
