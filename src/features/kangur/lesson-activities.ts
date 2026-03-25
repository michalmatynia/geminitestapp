import type {
  KangurLessonActivityBlock,
  KangurLessonActivityId,
  KangurLessonActivityType,
} from '@/features/kangur/shared/contracts/kangur';
import { getKangurGameForLessonActivity } from '@/features/kangur/games';

type KangurLessonActivityDefinition = {
  id: KangurLessonActivityId;
  type: KangurLessonActivityType;
  label: string;
  title: string;
  description: string;
  gameId?: string;
  engineId?: string;
  defaultVariantId?: string;
};

const withGameScaffoldMetadata = (
  definition: Omit<
    KangurLessonActivityDefinition,
    'defaultVariantId' | 'engineId' | 'gameId'
  >
): KangurLessonActivityDefinition => {
  const game = getKangurGameForLessonActivity(definition.id);

  return {
    ...definition,
    gameId: game?.id,
    engineId: game?.engineId,
    defaultVariantId: game?.variants[0]?.id,
  };
};

export const KANGUR_LESSON_ACTIVITY_DEFINITIONS: Record<
  KangurLessonActivityId,
  KangurLessonActivityDefinition
> = {
  'adding-ball': withGameScaffoldMetadata({
    id: 'adding-ball',
    type: 'practice-drag-drop',
    label: 'Adding ball game',
    title: 'Gra z piłkami',
    description: 'Ćwicz dodawanie, przesuwając piłki i rozwiązując zadania krok po kroku.',
  }),
  'adding-synthesis': withGameScaffoldMetadata({
    id: 'adding-synthesis',
    type: 'practice-rhythm',
    label: 'Adding synthesis game',
    title: 'Synteza dodawania',
    description: 'Uderzaj w poprawny tor odpowiedzi, gdy działanie zbliża się do linii rytmu.',
  }),
  'subtracting-game': withGameScaffoldMetadata({
    id: 'subtracting-game',
    type: 'practice-drag-drop',
    label: 'Subtracting game',
    title: 'Gra z odejmowaniem',
    description:
      'Przeciągaj i zabieraj obiekty, aby szybciej liczyć odejmowanie.',
  }),
  'multiplication-array': withGameScaffoldMetadata({
    id: 'multiplication-array',
    type: 'practice-tap-select',
    label: 'Multiplication array game',
    title: 'Gra z grupami',
    description: 'Buduj grupy elementów i odkrywaj mnożenie przez układy oraz powtarzanie.',
  }),
  'multiplication-quiz': withGameScaffoldMetadata({
    id: 'multiplication-quiz',
    type: 'practice-multiple-choice',
    label: 'Multiplication quiz',
    title: 'Quiz tabliczki',
    description: 'Sprawdź tabliczkę mnożenia w krótkim quizie z szybkimi pytaniami.',
  }),
  'division-game': withGameScaffoldMetadata({
    id: 'division-game',
    type: 'practice-multiple-choice',
    label: 'Division game',
    title: 'Gra z dzieleniem',
    description: 'Ćwicz dzielenie i rozdzielanie elementów w zadaniach interaktywnych.',
  }),
  'geometry-drawing': withGameScaffoldMetadata({
    id: 'geometry-drawing',
    type: 'training-drawing',
    label: 'Geometry drawing game',
    title: 'Rysuj figury',
    description: 'Rysuj kształty i sprawdzaj, jak dobrze rozpoznajesz figury geometryczne.',
  }),
  'calendar-interactive': withGameScaffoldMetadata({
    id: 'calendar-interactive',
    type: 'practice-calendar-interactive',
    label: 'Calendar interactive game',
    title: 'Gra z kalendarzem',
    description: 'Ćwicz daty, miesiące i dni tygodnia w interaktywnym kalendarzu.',
  }),
  'clock-training': withGameScaffoldMetadata({
    id: 'clock-training',
    type: 'training-clock',
    label: 'Clock training game',
    title: 'Ćwiczenie z zegarem',
    description:
      'Ćwicz osobno godziny, minuty i pełny czas na zegarze analogowym w sekcjach treningowych.',
  }),
};

export const KANGUR_LESSON_ACTIVITY_OPTIONS = Object.values(KANGUR_LESSON_ACTIVITY_DEFINITIONS).map(
  (definition) => ({
    value: definition.id,
    label: definition.label,
  })
);

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
