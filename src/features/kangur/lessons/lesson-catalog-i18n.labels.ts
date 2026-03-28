import type {
  KangurLessonAgeGroup,
  KangurLessonSubject,
} from '@/features/kangur/shared/contracts/kangur';

export const ENGLISH_LESSON_SECTION_LABELS: Record<string, string> = {
  alphabet_rysuj_litery: 'Trace the letters',
  alphabet_syllables: 'Syllables and words',
  alphabet_first_words: 'First words',
  alphabet_matching: 'Match the letters',
  alphabet_sequence: 'Letter order',
  art_colors: 'Colors',
  art_colors_harmony: 'Harmony of colors',
  art_shapes: 'Shapes',
  art_shapes_basic: 'Basic shapes',
  music_scale: 'Scale',
  music_diatonic_scale: 'Diatonic scale',
  geometry_shapes: 'Geometric shapes',
  maths_time: 'Time',
  maths_arithmetic: 'Arithmetic',
  maths_geometry: 'Geometry',
  maths_logic: 'Logical thinking',
  english_basics_section: 'Basics',
  english_grammar: 'Grammar',
  english_grammar_pronouns: 'Pronouns',
  english_grammar_sentence_structure: 'Sentence structure',
  english_grammar_subject_verb_agreement: 'Subject-verb agreement',
  english_grammar_articles: 'Articles',
  english_grammar_adjectives: 'Adjectives',
  english_grammar_adverbs: 'Adverbs',
  english_grammar_adverbs_frequency: 'Adverbs of frequency',
  english_grammar_prepositions: 'Prepositions',
};

export const GERMAN_LESSON_SECTION_LABELS: Record<string, string> = {
  alphabet_rysuj_litery: 'Buchstaben nachspuren',
  alphabet_syllables: 'Silben und Woerter',
  alphabet_first_words: 'Erste Woerter',
  alphabet_matching: 'Buchstaben zuordnen',
  alphabet_sequence: 'Buchstabenreihenfolge',
  art_colors: 'Farben',
  art_colors_harmony: 'Farbharmonie',
  art_shapes: 'Formen',
  art_shapes_basic: 'Grundformen',
  music_scale: 'Tonleiter',
  music_diatonic_scale: 'Diatonische Tonleiter',
  geometry_shapes: 'Geometrische Formen',
  maths_time: 'Zeit',
  maths_arithmetic: 'Arithmetik',
  maths_geometry: 'Geometrie',
  maths_logic: 'Logisches Denken',
  english_basics_section: 'Grundlagen',
  english_grammar: 'Grammatik',
  english_grammar_pronouns: 'Pronomen',
  english_grammar_sentence_structure: 'Satzbau',
  english_grammar_subject_verb_agreement: 'Subjekt-Verb-Kongruenz',
  english_grammar_articles: 'Artikel',
  english_grammar_adjectives: 'Adjektive',
  english_grammar_adverbs: 'Adverbien',
  english_grammar_adverbs_frequency: 'Adverbien der Haeufigkeit',
  english_grammar_prepositions: 'Praepositionen',
};

export const UKRAINIAN_LESSON_SECTION_LABELS: Record<string, string> = {
  alphabet_rysuj_litery: 'Обводь літери',
  alphabet_syllables: 'Склади і слова',
  alphabet_first_words: 'Перші слова',
  alphabet_matching: 'Добери літери',
  alphabet_sequence: 'Порядок літер',
  art_colors: 'Кольори',
  art_colors_harmony: 'Гармонія кольорів',
  art_shapes: 'Форми',
  art_shapes_basic: 'Базові форми',
  music_scale: 'Гама',
  music_diatonic_scale: 'Діатонічна гама',
  geometry_shapes: 'Геометричні фігури',
  maths_time: 'Час',
  maths_arithmetic: 'Арифметика',
  maths_geometry: 'Геометрія',
  maths_logic: 'Логічне мислення',
  english_basics_section: 'Основи',
  english_grammar: 'Граматика',
  english_grammar_pronouns: 'Займенники',
  english_grammar_sentence_structure: 'Будова речення',
  english_grammar_subject_verb_agreement: 'Узгодження підмета і присудка',
  english_grammar_articles: 'Артиклі',
  english_grammar_adjectives: 'Прикметники',
  english_grammar_adverbs: 'Прислівники',
  english_grammar_adverbs_frequency: 'Прислівники частоти',
  english_grammar_prepositions: 'Прийменники',
};

export const ENGLISH_LESSON_SECTION_TYPE_LABELS: Record<string, string> = {
  Gra: 'Game',
  Lekcja: 'Lesson',
  Section: 'Section',
  Subsection: 'Subsection',
};

export const GERMAN_LESSON_SECTION_TYPE_LABELS: Record<string, string> = {
  Gra: 'Spiel',
  Lekcja: 'Lektion',
  Section: 'Abschnitt',
  Subsection: 'Unterabschnitt',
};

export const UKRAINIAN_LESSON_SECTION_TYPE_LABELS: Record<string, string> = {
  Gra: 'Гра',
  Lekcja: 'Урок',
  Section: 'Розділ',
  Subsection: 'Підрозділ',
};

export const ENGLISH_SUBJECT_LABELS: Record<KangurLessonSubject, string> = {
  alphabet: 'Alphabet',
  art: 'Art',
  music: 'Music',
  geometry: 'Shapes',
  maths: 'Maths',
  english: 'English',
  web_development: 'Web Development',
  agentic_coding: 'Agentic Coding',
};

export const GERMAN_SUBJECT_LABELS: Record<KangurLessonSubject, string> = {
  alphabet: 'Alphabet',
  art: 'Kunst',
  music: 'Musik',
  geometry: 'Formen',
  maths: 'Mathe',
  english: 'Englisch',
  web_development: 'Webentwicklung',
  agentic_coding: 'Agentic Coding',
};

export const UKRAINIAN_SUBJECT_LABELS: Record<KangurLessonSubject, string> = {
  alphabet: 'Абетка',
  art: 'Мистецтво',
  music: 'Музика',
  geometry: 'Фігури',
  maths: 'Математика',
  english: 'Англійська',
  web_development: 'Веброзробка',
  agentic_coding: 'Агентне програмування',
};

export const ENGLISH_AGE_GROUP_LABELS: Record<KangurLessonAgeGroup, string> = {
  six_year_old: 'Age 6',
  ten_year_old: 'Age 10',
  grown_ups: 'Adults',
};

export const GERMAN_AGE_GROUP_LABELS: Record<KangurLessonAgeGroup, string> = {
  six_year_old: '6 Jahre',
  ten_year_old: '10 Jahre',
  grown_ups: 'Erwachsene',
};

export const UKRAINIAN_AGE_GROUP_LABELS: Record<KangurLessonAgeGroup, string> = {
  six_year_old: '6 років',
  ten_year_old: '10 років',
  grown_ups: 'Дорослі',
};
