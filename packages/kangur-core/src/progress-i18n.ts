import type { KangurBadgeTrackKey } from './progress/badges';
import {
  localizeKangurCoreText,
  normalizeKangurCoreLocale,
  type KangurCoreLocale,
} from './profile-i18n';

type KangurProgressLocalizedValue = Record<KangurCoreLocale, string>;

const KANGUR_METADATA_BADGE_NAMES: Record<string, KangurProgressLocalizedValue> = {
  first_game: {
    de: 'Erstes Spiel',
    en: 'First game',
    pl: 'Pierwsza gra',
  },
  perfect_10: {
    de: 'Perfektes Ergebnis',
    en: 'Perfect score',
    pl: 'Idealny wynik',
  },
  lesson_hero: {
    de: 'Lektionsheld',
    en: 'Lesson hero',
    pl: 'Bohater lekcji',
  },
  clock_master: {
    de: 'Uhrmeister',
    en: 'Clock master',
    pl: 'Mistrz zegara',
  },
  geometry_artist: {
    de: 'Formenkuenstler',
    en: 'Shape artist',
    pl: 'Artysta figur',
  },
  ten_games: {
    de: 'Zehn Spiele',
    en: 'Ten games',
    pl: 'Dziesiatka',
  },
  xp_500: {
    de: '500 XP',
    en: '500 XP',
    pl: 'Pol tysiaca XP',
  },
  xp_1000: {
    de: '1000 XP',
    en: '1000 XP',
    pl: 'Tysiacznik',
  },
  variety: {
    de: 'Vielseitig',
    en: 'All-rounder',
    pl: 'Wszechstronny',
  },
};

const KANGUR_METADATA_BADGE_DESCRIPTIONS: Record<string, KangurProgressLocalizedValue> = {
  first_game: {
    de: 'Schliesse das erste Spiel ab',
    en: 'Complete the first game',
    pl: 'Ukończ pierwszą grę',
  },
  perfect_10: {
    de: 'Erreiche 10/10 in einem Spiel',
    en: 'Score 10/10 in a game',
    pl: 'Zdobądź 10/10 w grze',
  },
  lesson_hero: {
    de: 'Schliesse die erste Lektion ab',
    en: 'Complete the first lesson',
    pl: 'Ukończ pierwszą lekcję',
  },
  clock_master: {
    de: 'Schliesse das Uhrtraining mit 5/5 ab',
    en: 'Complete clock training with 5/5',
    pl: 'Ukończ trening zegara z 5/5',
  },
  geometry_artist: {
    de: 'Schliesse das Geometrietraining mit voller Punktzahl ab',
    en: 'Finish geometry training with a perfect score',
    pl: 'Ukończ trening figur geometrycznych na pełny wynik',
  },
  ten_games: {
    de: 'Spiele 10 Spiele',
    en: 'Play 10 games',
    pl: 'Zagraj 10 gier',
  },
  xp_500: {
    de: 'Erreiche insgesamt 500 XP',
    en: 'Reach 500 XP total',
    pl: 'Zdobadz 500 XP lacznie',
  },
  xp_1000: {
    de: 'Erreiche insgesamt 1000 XP',
    en: 'Reach 1000 XP total',
    pl: 'Zdobadz 1000 XP lacznie',
  },
  variety: {
    de: 'Spiele 5 verschiedene Operationen',
    en: 'Play 5 different operations',
    pl: 'Zagraj 5 roznych operacji',
  },
};

const KANGUR_PROGRESS_BADGE_NAMES: Record<string, KangurProgressLocalizedValue> = {
  ...KANGUR_METADATA_BADGE_NAMES,
  perfect_10: {
    de: 'Perfektes Ergebnis',
    en: 'Perfect score',
    pl: 'Idealny wynik',
  },
  lesson_hero: {
    de: 'Lektionsheld',
    en: 'Lesson hero',
    pl: 'Bohater lekcji',
  },
  clock_master: {
    de: 'Uhrmeister',
    en: 'Clock master',
    pl: 'Mistrz zegara',
  },
  geometry_artist: {
    de: 'Formenkünstler',
    en: 'Shape artist',
    pl: 'Artysta figur',
  },
  ten_games: {
    de: 'Zehn Spiele',
    en: 'Ten games',
    pl: 'Dziesiątka',
  },
  xp_500: {
    de: 'Halbes Tausend XP',
    en: 'Half a thousand XP',
    pl: 'Pół tysiąca XP',
  },
  xp_1000: {
    de: 'Tausender',
    en: 'Thousand club',
    pl: 'Tysiącznik',
  },
  variety: {
    de: 'Allrounder',
    en: 'All-rounder',
    pl: 'Wszechstronny',
  },
  calendar_keeper: {
    de: 'Kalendermeister',
    en: 'Calendar master',
    pl: 'Mistrz kalendarza',
  },
  streak_3: {
    de: 'Power-Serie',
    en: 'Power streak',
    pl: 'Seria mocy',
  },
  accuracy_ace: {
    de: 'Treffsicherer Kopf',
    en: 'Sharp mind',
    pl: 'Celny umysł',
  },
  quest_starter: {
    de: 'Missionsentdecker',
    en: 'Mission explorer',
    pl: 'Odkrywca misji',
  },
  quest_keeper: {
    de: 'Missionsjäger',
    en: 'Mission hunter',
    pl: 'Łowca misji',
  },
  guided_step: {
    de: 'Sicherer Schritt',
    en: 'Steady step',
    pl: 'Pewny krok',
  },
  guided_keeper: {
    de: 'Auf Kurs',
    en: 'Staying on course',
    pl: 'Trzymam kierunek',
  },
  mastery_builder: {
    de: 'Meisterschaftsbauer',
    en: 'Mastery builder',
    pl: 'Budowniczy mistrzostwa',
  },
  english_first_game: {
    de: 'Englisch-Start',
    en: 'English start',
    pl: 'Start z angielskim',
  },
  english_perfect: {
    de: 'Perfektes Englisch',
    en: 'Perfect English',
    pl: 'Perfekcyjny angielski',
  },
  english_pronoun_pro: {
    de: 'Pronomen-Profi',
    en: 'Pronoun Pro',
    pl: 'Pronoun Pro',
  },
  english_sorter_star: {
    de: 'Wortarten-Meister',
    en: 'Parts of speech master',
    pl: 'Mistrz części mowy',
  },
  english_sentence_builder: {
    de: 'Satzarchitekt',
    en: 'Sentence architect',
    pl: 'Architekt zdań',
  },
  english_agreement_guardian: {
    de: 'Übereinstimmungs-Wächter',
    en: 'Agreement guardian',
    pl: 'Strażnik zgodności',
  },
  english_grammar_collection: {
    de: 'Grammatik-Sammlung',
    en: 'Grammar collection',
    pl: 'Kolekcja gramatyki',
  },
  english_articles_reader: {
    de: 'Artikel-Meister',
    en: 'Article master',
    pl: 'Mistrz przedimków',
  },
  english_mastery_builder: {
    de: 'Englisch-Baumeister',
    en: 'English builder',
    pl: 'Budowniczy English',
  },
};

const KANGUR_PROGRESS_BADGE_DESCRIPTIONS: Record<string, KangurProgressLocalizedValue> = {
  ...KANGUR_METADATA_BADGE_DESCRIPTIONS,
  perfect_10: {
    de: 'Erreiche ein perfektes Ergebnis in einem Spiel',
    en: 'Get a perfect score in a game',
    pl: 'Zdobądź pełny wynik w grze',
  },
  lesson_hero: {
    de: 'Schließe die erste Lektion ab',
    en: 'Finish the first lesson',
    pl: 'Ukończ pierwszą lekcję',
  },
  clock_master: {
    de: 'Schließe das Uhrtraining mit 5/5 ab',
    en: 'Finish the clock training with a 5/5 score',
    pl: 'Ukończ trening zegara z wynikiem 5/5',
  },
  geometry_artist: {
    de: 'Schließe das Geometrie-Formentraining perfekt ab',
    en: 'Finish the geometry shapes training with a perfect score',
    pl: 'Ukończ trening figur geometrycznych z pełnym wynikiem',
  },
  ten_games: {
    de: 'Spiele 10 Spiele',
    en: 'Play 10 games',
    pl: 'Zagraj 10 gier',
  },
  xp_500: {
    de: 'Sammle insgesamt 500 XP',
    en: 'Earn 500 XP in total',
    pl: 'Zdobądź 500 XP łącznie',
  },
  xp_1000: {
    de: 'Sammle insgesamt 1000 XP',
    en: 'Earn 1000 XP in total',
    pl: 'Zdobądź 1000 XP łącznie',
  },
  variety: {
    de: 'Spiele 5 verschiedene Operationen',
    en: 'Play 5 different operations',
    pl: 'Zagraj 5 różnych operacji',
  },
  calendar_keeper: {
    de: 'Schließe das Kalendertraining perfekt ab',
    en: 'Finish the calendar training with a perfect score',
    pl: 'Ukończ trening kalendarza z pełnym wynikiem',
  },
  streak_3: {
    de: 'Halte 3 starke Runden in Folge',
    en: 'Keep 3 strong rounds in a row',
    pl: 'Utrzymaj 3 mocne rundy z rzędu',
  },
  accuracy_ace: {
    de: 'Halte nach 25 Fragen durchschnittlich mindestens 85% richtige Antworten',
    en: 'Keep an average of at least 85% correct answers after 25 questions',
    pl: 'Utrzymaj średnio co najmniej 85% poprawnych odpowiedzi po 25 pytaniach',
  },
  quest_starter: {
    de: 'Schließe die erste Tagesmission ab',
    en: 'Complete the first daily mission',
    pl: 'Ukończ pierwszą misję dnia',
  },
  quest_keeper: {
    de: 'Schließe 3 Tagesmissionen ab',
    en: 'Complete 3 daily missions',
    pl: 'Ukończ 3 misje dnia',
  },
  guided_step: {
    de: 'Schließe die erste empfohlene Runde ab',
    en: 'Complete the first round that follows the recommendation',
    pl: 'Ukończ pierwszą rundę zgodnie z rekomendacją',
  },
  guided_keeper: {
    de: 'Schließe 3 empfohlene Runden ab',
    en: 'Complete 3 rounds that follow the recommendation',
    pl: 'Ukończ 3 rundy zgodnie z rekomendacją',
  },
  mastery_builder: {
    de: 'Bringe 3 Lektionen auf mindestens 75% Meisterschaft',
    en: 'Bring 3 lessons to at least 75% mastery',
    pl: 'Doprowadź 3 lekcje do co najmniej 75% opanowania',
  },
  english_first_game: {
    de: 'Spiele das erste Englisch-Spiel',
    en: 'Play the first English game',
    pl: 'Zagraj pierwszą grę z angielskiego',
  },
  english_perfect: {
    de: 'Erreiche 100% in einem Englisch-Spiel',
    en: 'Get 100% in an English game',
    pl: 'Zdobądź 100% w grze z angielskiego',
  },
  english_pronoun_pro: {
    de: 'Erreiche 2 perfekte Ergebnisse bei Pronomen',
    en: 'Get 2 perfect scores in Pronoun Remix',
    pl: 'Zdobądź 2 perfekcyjne wyniki w Pronoun Remix',
  },
  english_sorter_star: {
    de: 'Erreiche 2 perfekte Ergebnisse bei Wortarten',
    en: 'Get 2 perfect scores in Parts of Speech',
    pl: 'Zdobądź 2 perfekcyjne wyniki w Parts of Speech',
  },
  english_sentence_builder: {
    de: 'Erreiche 80%+ und spiele 3 Sitzungen zu Satzbau',
    en: 'Reach 80%+ and play 3 Sentence Structure sessions',
    pl: 'Osiągnij 80%+ i rozegraj 3 sesje Sentence Structure',
  },
  english_agreement_guardian: {
    de: 'Erreiche ein perfektes Ergebnis bei der Subjekt-Verb-Ubereinstimmung',
    en: 'Get a perfect score in Subject-Verb Agreement',
    pl: 'Zdobądź perfekcyjny wynik w Subject-Verb Agreement',
  },
  english_grammar_collection: {
    de: 'Spiele alle Englisch-Spiele',
    en: 'Play all English games',
    pl: 'Zagraj we wszystkie gry z angielskiego',
  },
  english_articles_reader: {
    de: 'Schließe die Lektion zu Artikeln ab',
    en: 'Finish the lesson English: Articles',
    pl: 'Ukończ lekcję English: Articles',
  },
  english_mastery_builder: {
    de: 'Bringe 3 Englisch-Lektionen auf mindestens 75% Meisterschaft',
    en: 'Bring 3 English lessons to 75% mastery',
    pl: 'Doprowadź 3 lekcje z angielskiego do 75% opanowania',
  },
};

const KANGUR_PROGRESS_BADGE_TRACK_LABELS: Record<
  KangurBadgeTrackKey,
  KangurProgressLocalizedValue
> = {
  onboarding: {
    de: 'Start',
    en: 'Start',
    pl: 'Start',
  },
  consistency: {
    de: 'Serie',
    en: 'Streak',
    pl: 'Seria',
  },
  mastery: {
    de: 'Beherrschung',
    en: 'Mastery',
    pl: 'Mistrzostwo',
  },
  variety: {
    de: 'Vielfalt',
    en: 'Variety',
    pl: 'Różnorodność',
  },
  challenge: {
    de: 'Herausforderungen',
    en: 'Challenges',
    pl: 'Wyzwania',
  },
  xp: {
    de: 'XP',
    en: 'XP',
    pl: 'XP',
  },
  quest: {
    de: 'Missionen',
    en: 'Quests',
    pl: 'Misje',
  },
  english: {
    de: 'Englisch',
    en: 'English',
    pl: 'Angielski',
  },
};

const KANGUR_PROGRESS_ACTIVITY_LABELS: Record<string, KangurProgressLocalizedValue> = {
  alphabet: {
    de: 'Alphabet',
    en: 'Alphabet',
    pl: 'Alphabet',
  },
  alphabet_basics: {
    de: 'Alphabet',
    en: 'Alphabet',
    pl: 'Alphabet',
  },
  alphabet_copy: {
    de: 'Buchstaben abschreiben',
    en: 'Copy letters',
    pl: 'Przepisz litery',
  },
  alphabet_syllables: {
    de: 'Silben und Woerter',
    en: 'Syllables and words',
    pl: 'Sylaby i slowa',
  },
  alphabet_words: {
    de: 'Erste Woerter',
    en: 'First words',
    pl: 'Pierwsze slowa',
  },
  alphabet_matching: {
    de: 'Buchstaben zuordnen',
    en: 'Match letters',
    pl: 'Dopasuj litery',
  },
  alphabet_sequence: {
    de: 'Buchstabenreihenfolge',
    en: 'Letter order',
    pl: 'Kolejnosc liter',
  },
  geometry: {
    de: 'Geometrie',
    en: 'Geometry',
    pl: 'Geometria',
  },
  geometry_shape_recognition: {
    de: 'Geometrie',
    en: 'Geometry',
    pl: 'Geometria',
  },
  addition: {
    de: 'Addition',
    en: 'Addition',
    pl: 'Dodawanie',
  },
  subtraction: {
    de: 'Subtraktion',
    en: 'Subtraction',
    pl: 'Odejmowanie',
  },
  multiplication: {
    de: 'Multiplikation',
    en: 'Multiplication',
    pl: 'Mnożenie',
  },
  division: {
    de: 'Division',
    en: 'Division',
    pl: 'Dzielenie',
  },
  decimals: {
    de: 'Brueche',
    en: 'Fractions',
    pl: 'Ułamki',
  },
  powers: {
    de: 'Potenzen',
    en: 'Powers',
    pl: 'Potęgi',
  },
  roots: {
    de: 'Wurzeln',
    en: 'Roots',
    pl: 'Pierwiastki',
  },
  mixed: {
    de: 'Gemischt',
    en: 'Mixed',
    pl: 'Mieszane',
  },
  clock: {
    de: 'Uhr',
    en: 'Clock',
    pl: 'Nauka zegara',
  },
  calendar: {
    de: 'Kalender',
    en: 'Calendar',
    pl: 'Nauka kalendarza',
  },
  adding: {
    de: 'Addition',
    en: 'Addition',
    pl: 'Dodawanie',
  },
  subtracting: {
    de: 'Subtraktion',
    en: 'Subtraction',
    pl: 'Odejmowanie',
  },
  geometry_basics: {
    de: 'Grundlagen der Geometrie',
    en: 'Geometry basics',
    pl: 'Podstawy geometrii',
  },
  geometry_shapes: {
    de: 'Geometrische Formen',
    en: 'Geometric shapes',
    pl: 'Figury geometryczne',
  },
  geometry_symmetry: {
    de: 'Symmetrie',
    en: 'Symmetry',
    pl: 'Symetria',
  },
  geometry_perimeter: {
    de: 'Umfang',
    en: 'Perimeter',
    pl: 'Obwod',
  },
  logical_thinking: {
    de: 'Logisches Denken',
    en: 'Logical thinking',
    pl: 'Logiczne myślenie',
  },
  logical_patterns: {
    de: 'Muster',
    en: 'Patterns',
    pl: 'Wzorce',
  },
  logical_classification: {
    de: 'Klassifikation',
    en: 'Classification',
    pl: 'Klasyfikacja',
  },
  logical_reasoning: {
    de: 'Schlussfolgern',
    en: 'Reasoning',
    pl: 'Wnioskowanie',
  },
  logical_analogies: {
    de: 'Analogien',
    en: 'Analogies',
    pl: 'Analogie',
  },
  logical: {
    de: 'Logik',
    en: 'Logic',
    pl: 'Logika',
  },
};

const KANGUR_CLOCK_SECTION_LABELS: Record<string, KangurProgressLocalizedValue> = {
  hours: {
    de: 'Stunden',
    en: 'Hours',
    pl: 'Godziny',
  },
  minutes: {
    de: 'Minuten',
    en: 'Minutes',
    pl: 'Minuty',
  },
  combined: {
    de: 'Vollstaendige Zeit',
    en: 'Full time',
    pl: 'Pełny czas',
  },
  mixed: {
    de: 'Gemischtes Training',
    en: 'Mixed training',
    pl: 'Mieszany trening',
  },
};

const KANGUR_REWARD_BREAKDOWN_LABELS: Record<string, KangurProgressLocalizedValue> = {
  base: {
    de: 'Rundenabschluss',
    en: 'Round completion',
    pl: 'Ukończenie rundy',
  },
  accuracy: {
    de: 'Genauigkeit',
    en: 'Accuracy',
    pl: 'Skuteczność',
  },
  difficulty: {
    de: 'Schwierigkeitsgrad',
    en: 'Difficulty',
    pl: 'Poziom trudności',
  },
  speed: {
    de: 'Tempo',
    en: 'Pace',
    pl: 'Tempo',
  },
  streak: {
    de: 'Serie',
    en: 'Streak',
    pl: 'Seria',
  },
  first_activity: {
    de: 'Erster starker Versuch',
    en: 'First strong attempt',
    pl: 'Pierwsza mocna próba',
  },
  improvement: {
    de: 'Ergebnisverbesserung',
    en: 'Score improvement',
    pl: 'Poprawa wyniku',
  },
  mastery: {
    de: 'Beherrschungsfortschritt',
    en: 'Mastery progress',
    pl: 'Postęp opanowania',
  },
  variety: {
    de: 'Neuer Pfad',
    en: 'New path',
    pl: 'Nowa ścieżka',
  },
  guided_focus: {
    de: 'Empfohlener Fokus',
    en: 'Recommended focus',
    pl: 'Polecony kierunek',
  },
  perfect: {
    de: 'Volle Punktzahl',
    en: 'Perfect score',
    pl: 'Pełny wynik',
  },
  anti_repeat: {
    de: 'Wiederholte Aktivitaet',
    en: 'Repeated activity',
    pl: 'Powtarzana aktywność',
  },
  minimum_floor: {
    de: 'Mindestbelohnung',
    en: 'Minimum reward',
    pl: 'Minimalna nagroda',
  },
  daily_quest: {
    de: 'Tagesmission',
    en: 'Daily quest',
    pl: 'Misja dnia',
  },
};

const KANGUR_ALL_GOALS_COMPLETED_LABEL: KangurProgressLocalizedValue = {
  de: 'Alle Ziele erreicht!',
  en: 'All goals completed!',
  pl: 'Wszystkie cele osiągnięte!',
};

const formatLocalizedFraction = (
  current: number,
  target: number,
  singular: string,
  plural: string,
): string => `${current}/${target} ${target === 1 ? singular : plural}`;

type KangurBadgeSummaryKind =
  | 'game'
  | 'perfectGame'
  | 'lesson'
  | 'perfect'
  | 'streak'
  | 'questions'
  | 'percentGoal'
  | 'games'
  | 'xp'
  | 'quest'
  | 'round'
  | 'types'
  | 'sessions';

type KangurBadgeSummaryFormatter = (current: number, target: number) => string;

const KANGUR_BADGE_SUMMARY_FORMATTERS: Record<
  'default' | 'en',
  Record<KangurBadgeSummaryKind, KangurBadgeSummaryFormatter>
> = {
  default: {
    game: (current, target) => formatLocalizedFraction(current, target, 'Spiel', 'Spiele'),
    games: (current, target) => formatLocalizedFraction(current, target, 'Spiel', 'Spiele'),
    perfectGame: (current, target) =>
      formatLocalizedFraction(current, target, 'perfektes Spiel', 'perfekte Spiele'),
    lesson: (current, target) => formatLocalizedFraction(current, target, 'Lektion', 'Lektionen'),
    perfect: (current, target) => `${current}/${target} perfekt`,
    streak: (current, target) => `${current}/${target} in Folge`,
    questions: (current, target) => formatLocalizedFraction(current, target, 'Frage', 'Fragen'),
    percentGoal: (current, target) => `${current}% / ${target}%`,
    xp: (current, target) => `${current}/${target} XP`,
    quest: (current, target) => formatLocalizedFraction(current, target, 'Mission', 'Missionen'),
    round: (current, target) => formatLocalizedFraction(current, target, 'Runde', 'Runden'),
    types: (current, target) => `${current}/${target} Typen`,
    sessions: (current, target) => formatLocalizedFraction(current, target, 'Sitzung', 'Sitzungen'),
  },
  en: {
    game: (current, target) => formatLocalizedFraction(current, target, 'game', 'games'),
    games: (current, target) => formatLocalizedFraction(current, target, 'game', 'games'),
    perfectGame: (current, target) =>
      formatLocalizedFraction(current, target, 'perfect game', 'perfect games'),
    lesson: (current, target) => formatLocalizedFraction(current, target, 'lesson', 'lessons'),
    perfect: (current, target) => `${current}/${target} perfect`,
    streak: (current, target) => `${current}/${target} in a row`,
    questions: (current, target) => formatLocalizedFraction(current, target, 'question', 'questions'),
    percentGoal: (current, target) => `${current}% / ${target}%`,
    xp: (current, target) => `${current}/${target} XP`,
    quest: (current, target) => formatLocalizedFraction(current, target, 'mission', 'missions'),
    round: (current, target) => formatLocalizedFraction(current, target, 'round', 'rounds'),
    types: (current, target) => `${current}/${target} types`,
    sessions: (current, target) => formatLocalizedFraction(current, target, 'session', 'sessions'),
  },
};

const getLocalizedKangurBadgeSummaryByKind = ({
  kind,
  current,
  target,
  locale,
}: {
  kind: KangurBadgeSummaryKind;
  current: number;
  target: number;
  locale: KangurCoreLocale;
}): string =>
  KANGUR_BADGE_SUMMARY_FORMATTERS[locale === 'en' ? 'en' : 'default'][kind](current, target);

const resolveKangurBadgeSummaryKind = (
  badgeId: string,
  target: number,
):
  | 'game'
  | 'perfectGame'
  | 'lesson'
  | 'perfect'
  | 'streak'
  | 'questions'
  | 'percentGoal'
  | 'games'
  | 'xp'
  | 'quest'
  | 'round'
  | 'types'
  | 'sessions'
  | null => {
  switch (badgeId) {
    case 'first_game':
    case 'english_first_game':
      return 'game';
    case 'perfect_10':
      return 'perfectGame';
    case 'lesson_hero':
    case 'mastery_builder':
    case 'english_articles_reader':
    case 'english_mastery_builder':
      return 'lesson';
    case 'clock_master':
    case 'calendar_keeper':
    case 'geometry_artist':
    case 'english_perfect':
    case 'english_pronoun_pro':
    case 'english_sorter_star':
    case 'english_agreement_guardian':
      return 'perfect';
    case 'streak_3':
      return 'streak';
    case 'accuracy_ace':
      return target >= 85 ? 'percentGoal' : 'questions';
    case 'ten_games':
    case 'english_grammar_collection':
      return 'games';
    case 'xp_500':
    case 'xp_1000':
      return 'xp';
    case 'quest_starter':
    case 'quest_keeper':
      return 'quest';
    case 'guided_step':
    case 'guided_keeper':
      return 'round';
    case 'variety':
      return 'types';
    case 'english_sentence_builder':
      return target >= 80 ? 'percentGoal' : 'sessions';
    default:
      return null;
  }
};

export const getLocalizedKangurProgressBadgeName = (
  badgeId: string,
  fallbackName: string,
  locale?: string | null | undefined,
): string => {
  const localized = KANGUR_PROGRESS_BADGE_NAMES[badgeId];
  return localized ? localizeKangurCoreText(localized, locale) : fallbackName;
};

export const getLocalizedKangurProgressBadgeDescription = (
  badgeId: string,
  fallbackDescription: string,
  locale?: string | null | undefined,
): string => {
  const localized = KANGUR_PROGRESS_BADGE_DESCRIPTIONS[badgeId];
  return localized ? localizeKangurCoreText(localized, locale) : fallbackDescription;
};

export const getLocalizedKangurProgressBadgeSummary = ({
  badgeId,
  current,
  target,
  fallbackSummary,
  locale,
}: {
  badgeId: string;
  current: number;
  target: number;
  fallbackSummary: string;
  locale?: string | null | undefined;
}): string => {
  const normalizedLocale = normalizeKangurCoreLocale(locale);
  if (normalizedLocale === 'pl') {
    return fallbackSummary;
  }

  const kind = resolveKangurBadgeSummaryKind(badgeId, target);
  if (!kind) {
    return fallbackSummary;
  }

  return getLocalizedKangurBadgeSummaryByKind({
    kind,
    current,
    target,
    locale: normalizedLocale,
  });
};

export const getLocalizedKangurMetadataBadgeName = (
  badgeId: string,
  fallbackName: string,
  locale?: string | null | undefined,
): string => {
  const localized = KANGUR_METADATA_BADGE_NAMES[badgeId];
  return localized ? localizeKangurCoreText(localized, locale) : fallbackName;
};

export const getLocalizedKangurMetadataBadgeDescription = (
  badgeId: string,
  fallbackDescription: string,
  locale?: string | null | undefined,
): string => {
  const localized = KANGUR_METADATA_BADGE_DESCRIPTIONS[badgeId];
  return localized ? localizeKangurCoreText(localized, locale) : fallbackDescription;
};

export const getLocalizedKangurProgressBadgeTrackLabel = (
  key: KangurBadgeTrackKey,
  fallbackLabel: string,
  locale?: string | null | undefined,
): string => {
  const localized = KANGUR_PROGRESS_BADGE_TRACK_LABELS[key];
  return localized ? localizeKangurCoreText(localized, locale) : fallbackLabel;
};

export const getLocalizedKangurProgressActivityLabel = (
  token: string,
  fallbackLabel: string,
  locale?: string | null | undefined,
): string => {
  const localized = KANGUR_PROGRESS_ACTIVITY_LABELS[token];
  return localized ? localizeKangurCoreText(localized, locale) : fallbackLabel;
};

export const getLocalizedKangurClockSectionLabel = (
  token: string,
  fallbackLabel: string,
  locale?: string | null | undefined,
): string => {
  const localized = KANGUR_CLOCK_SECTION_LABELS[token];
  return localized ? localizeKangurCoreText(localized, locale) : fallbackLabel;
};

export const getLocalizedKangurRewardBreakdownLabel = (
  kind: string,
  fallbackLabel: string,
  locale?: string | null | undefined,
): string => {
  const localized = KANGUR_REWARD_BREAKDOWN_LABELS[kind];
  return localized ? localizeKangurCoreText(localized, locale) : fallbackLabel;
};

export const getLocalizedKangurAllGoalsCompletedLabel = (
  locale?: string | null | undefined,
): string => localizeKangurCoreText(KANGUR_ALL_GOALS_COMPLETED_LABEL, locale);
