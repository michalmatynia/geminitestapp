export const ACTIVITY_LABELS: Record<string, string> = {
  alphabet: 'Alphabet',
  alphabet_basics: 'Alphabet',
  alphabet_copy: 'Przepisz litery',
  alphabet_syllables: 'Sylaby i slowa',
  alphabet_words: 'Pierwsze slowa',
  alphabet_matching: 'Dopasuj litery',
  alphabet_sequence: 'Kolejnosc liter',
  geometry: 'Geometria',
  geometry_shape_recognition: 'Geometria',
  addition: 'Dodawanie',
  subtraction: 'Odejmowanie',
  multiplication: 'Mnożenie',
  division: 'Dzielenie',
  decimals: 'Ułamki',
  powers: 'Potęgi',
  roots: 'Pierwiastki',
  mixed: 'Mieszane',
  clock: 'Nauka zegara',
  calendar: 'Nauka kalendarza',
  adding: 'Dodawanie',
  subtracting: 'Odejmowanie',
  geometry_basics: 'Podstawy geometrii',
  geometry_shapes: 'Figury geometryczne',
  geometry_symmetry: 'Symetria',
  geometry_perimeter: 'Obwod',
  logical_thinking: 'Logiczne myślenie',
  logical_patterns: 'Wzorce',
  logical_classification: 'Klasyfikacja',
  logical_reasoning: 'Wnioskowanie',
  logical_analogies: 'Analogie',
  logical: 'Logika',
};

export const LESSON_KEY_TO_OPERATION: Record<string, string> = {
  alphabet_basics: 'alphabet',
  alphabet_copy: 'alphabet',
  alphabet_syllables: 'alphabet',
  alphabet_words: 'alphabet',
  alphabet_matching: 'alphabet',
  alphabet_sequence: 'alphabet',
  geometry_shape_recognition: 'geometry',
  adding: 'addition',
  subtracting: 'subtraction',
  multiplication: 'multiplication',
  division: 'division',
  clock: 'clock',
  calendar: 'calendar',
  geometry_basics: 'geometry',
  geometry_shapes: 'geometry',
  geometry_symmetry: 'geometry',
  geometry_perimeter: 'geometry',
  logical_thinking: 'logical',
  logical_patterns: 'logical',
  logical_classification: 'logical',
  logical_reasoning: 'logical',
  logical_analogies: 'logical',
};

export const CLOCK_TRAINING_SECTION_LABELS: Record<string, string> = {
  hours: 'Godziny',
  minutes: 'Minuty',
  combined: 'Pełny czas',
  mixed: 'Mieszany trening',
};

const trimOperationToken = (value?: string | null): string | null => {
  const normalizedValue = value?.trim();
  return normalizedValue ? normalizedValue : null;
};

const resolveMappedOperationToken = (value: string): string =>
  LESSON_KEY_TO_OPERATION[value] ?? value;

const resolveActivityPrimaryToken = (activityKey: string): string | null => {
  const [fallbackPrimary, rawPrimary] = activityKey.split(':');
  return activityKey.includes(':')
    ? trimOperationToken(rawPrimary)
    : trimOperationToken(fallbackPrimary);
};

export const resolveRewardOperation = ({
  operation,
  lessonKey,
  activityKey,
}: {
  operation?: string | null;
  lessonKey?: string | null;
  activityKey?: string | null;
}): string | null => {
  const normalizedOperation = trimOperationToken(operation);
  if (normalizedOperation) {
    return normalizedOperation;
  }

  const normalizedLessonKey = trimOperationToken(lessonKey);
  if (normalizedLessonKey) {
    return resolveMappedOperationToken(normalizedLessonKey);
  }

  const normalizedActivityKey = trimOperationToken(activityKey);
  if (!normalizedActivityKey) {
    return null;
  }

  const normalizedPrimary = resolveActivityPrimaryToken(normalizedActivityKey);
  return normalizedPrimary ? resolveMappedOperationToken(normalizedPrimary) : null;
};
