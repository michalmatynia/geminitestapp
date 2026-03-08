export type KangurLessonCatalogEntry = {
  title: string;
  emoji: string;
};

export const KANGUR_LESSON_CATALOG: Record<string, KangurLessonCatalogEntry> = {
  clock: { title: 'Nauka zegara', emoji: '🕐' },
  calendar: { title: 'Nauka kalendarza', emoji: '📅' },
  adding: { title: 'Dodawanie', emoji: '➕' },
  subtracting: { title: 'Odejmowanie', emoji: '➖' },
  multiplication: { title: 'Mnozenie', emoji: '✖️' },
  division: { title: 'Dzielenie', emoji: '➗' },
  geometry_basics: { title: 'Podstawy geometrii', emoji: '📐' },
  geometry_shapes: { title: 'Figury geometryczne', emoji: '🔷' },
  geometry_symmetry: { title: 'Symetria', emoji: '🪞' },
  geometry_perimeter: { title: 'Obwód figur', emoji: '📏' },
  logical_thinking: { title: 'Myslenie logiczne', emoji: '🧠' },
  logical_patterns: { title: 'Wzorce i ciagi', emoji: '🔢' },
  logical_classification: { title: 'Klasyfikacja', emoji: '📦' },
  logical_reasoning: { title: 'Wnioskowanie', emoji: '💡' },
  logical_analogies: { title: 'Analogie', emoji: '🔗' },
};
