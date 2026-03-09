import type { KangurLessonActivityBlock, KangurLessonActivityId } from '@/shared/contracts/kangur';

type KangurLessonActivityDefinition = {
  id: KangurLessonActivityId;
  label: string;
  title: string;
  description: string;
};

export const KANGUR_LESSON_ACTIVITY_DEFINITIONS: Record<
  KangurLessonActivityId,
  KangurLessonActivityDefinition
> = {
  'adding-ball': {
    id: 'adding-ball',
    label: 'Adding ball game',
    title: 'Gra z piłkami',
    description: 'Ćwicz dodawanie, przesuwając piłki i rozwiązując zadania krok po kroku.',
  },
  'adding-synthesis': {
    id: 'adding-synthesis',
    label: 'Adding synthesis game',
    title: 'Synteza dodawania',
    description: 'Uderzaj w poprawny tor odpowiedzi, gdy działanie zbliża się do linii rytmu.',
  },
  'subtracting-game': {
    id: 'subtracting-game',
    label: 'Subtracting game',
    title: 'Gra z odejmowaniem',
    description:
      'Trenuj odejmowanie w interaktywnych zadaniach z natychmiastową informacją zwrotną.',
  },
  'multiplication-array': {
    id: 'multiplication-array',
    label: 'Multiplication array game',
    title: 'Gra z grupami',
    description: 'Buduj grupy elementów i odkrywaj mnożenie przez układy oraz powtarzanie.',
  },
  'multiplication-quiz': {
    id: 'multiplication-quiz',
    label: 'Multiplication quiz',
    title: 'Quiz tabliczki',
    description: 'Sprawdź tabliczkę mnożenia w krótkim quizie z szybkimi pytaniami.',
  },
  'division-game': {
    id: 'division-game',
    label: 'Division game',
    title: 'Gra z dzieleniem',
    description: 'Ćwicz dzielenie i rozdzielanie elementów w zadaniach interaktywnych.',
  },
  'geometry-drawing': {
    id: 'geometry-drawing',
    label: 'Geometry drawing game',
    title: 'Rysuj figury',
    description: 'Rysuj kształty i sprawdzaj, jak dobrze rozpoznajesz figury geometryczne.',
  },
  'calendar-interactive': {
    id: 'calendar-interactive',
    label: 'Calendar interactive game',
    title: 'Gra z kalendarzem',
    description: 'Ćwicz daty, miesiące i dni tygodnia w interaktywnym kalendarzu.',
  },
  'clock-training': {
    id: 'clock-training',
    label: 'Clock training game',
    title: 'Ćwiczenie z zegarem',
    description:
      'Ćwicz osobno godziny, minuty i pełny czas na zegarze analogowym w sekcjach treningowych.',
  },
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
