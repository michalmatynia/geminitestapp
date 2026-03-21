import {
  normalizeKangurProgressState,
  type KangurLessonComponentId,
  type KangurProgressState,
} from '@kangur/contracts';

import { KANGUR_XP_REWARDS, checkKangurNewBadges } from './progress-metadata';

export const KANGUR_PRACTICE_OPERATIONS = [
  'addition',
  'subtraction',
  'multiplication',
  'division',
  'clock',
  'calendar',
  'mixed',
  'logical_thinking',
  'logical_patterns',
  'logical_classification',
  'logical_reasoning',
  'logical_analogies',
] as const;

export type KangurPracticeOperation = (typeof KANGUR_PRACTICE_OPERATIONS)[number];
export type KangurPracticeQuestion = {
  question: string;
  answer: string | number;
  choices: Array<string | number>;
  category?: string;
};

export type KangurPracticeOperationConfig = {
  id: KangurPracticeOperation;
  label: string;
  categories: KangurPracticeCategory[];
  lessonComponentId: KangurLessonComponentId | null;
  kind: 'arithmetic' | 'logic' | 'time';
};

export type KangurPracticeCategory =
  | 'addition'
  | 'subtraction'
  | 'multiplication'
  | 'division'
  | 'clock'
  | 'calendar'
  | 'logical_thinking'
  | 'logical_patterns'
  | 'logical_classification'
  | 'logical_reasoning'
  | 'logical_analogies';

export type KangurPracticeCompletionResult = {
  updated: KangurProgressState;
  newBadges: string[];
  xpGained: number;
  scorePercent: number;
  isPerfect: boolean;
  operation: KangurPracticeOperation;
};

const KANGUR_PRACTICE_OPERATION_CONFIG: Record<
  KangurPracticeOperation,
  KangurPracticeOperationConfig
> = {
  addition: {
    id: 'addition',
    label: 'Dodawanie',
    categories: ['addition'],
    lessonComponentId: 'adding',
    kind: 'arithmetic',
  },
  subtraction: {
    id: 'subtraction',
    label: 'Odejmowanie',
    categories: ['subtraction'],
    lessonComponentId: 'subtracting',
    kind: 'arithmetic',
  },
  multiplication: {
    id: 'multiplication',
    label: 'Mnozenie',
    categories: ['multiplication'],
    lessonComponentId: 'multiplication',
    kind: 'arithmetic',
  },
  division: {
    id: 'division',
    label: 'Dzielenie',
    categories: ['division'],
    lessonComponentId: 'division',
    kind: 'arithmetic',
  },
  clock: {
    id: 'clock',
    label: 'Zegar',
    categories: ['clock'],
    lessonComponentId: 'clock',
    kind: 'time',
  },
  calendar: {
    id: 'calendar',
    label: 'Kalendarz',
    categories: ['calendar'],
    lessonComponentId: 'calendar',
    kind: 'time',
  },
  mixed: {
    id: 'mixed',
    label: 'Trening mieszany',
    categories: ['addition', 'subtraction', 'multiplication', 'division'],
    lessonComponentId: null,
    kind: 'arithmetic',
  },
  logical_thinking: {
    id: 'logical_thinking',
    label: 'Myslenie logiczne',
    categories: ['logical_thinking'],
    lessonComponentId: 'logical_thinking',
    kind: 'logic',
  },
  logical_patterns: {
    id: 'logical_patterns',
    label: 'Wzorce i ciagi',
    categories: ['logical_patterns'],
    lessonComponentId: 'logical_patterns',
    kind: 'logic',
  },
  logical_classification: {
    id: 'logical_classification',
    label: 'Klasyfikacja',
    categories: ['logical_classification'],
    lessonComponentId: 'logical_classification',
    kind: 'logic',
  },
  logical_reasoning: {
    id: 'logical_reasoning',
    label: 'Wnioskowanie',
    categories: ['logical_reasoning'],
    lessonComponentId: 'logical_reasoning',
    kind: 'logic',
  },
  logical_analogies: {
    id: 'logical_analogies',
    label: 'Analogie',
    categories: ['logical_analogies'],
    lessonComponentId: 'logical_analogies',
    kind: 'logic',
  },
};

const PRACTICE_OPERATION_BY_LESSON_COMPONENT: Partial<
  Record<KangurLessonComponentId, KangurPracticeOperation>
> = {
  adding: 'addition',
  subtracting: 'subtraction',
  multiplication: 'multiplication',
  division: 'division',
  clock: 'clock',
  calendar: 'calendar',
  logical_thinking: 'logical_thinking',
  logical_patterns: 'logical_patterns',
  logical_classification: 'logical_classification',
  logical_reasoning: 'logical_reasoning',
  logical_analogies: 'logical_analogies',
};

type KangurLogicPracticeQuestionSeed = {
  question: string;
  answer: string;
  choices: string[];
};

const KANGUR_LOGIC_PRACTICE_QUESTION_BANK: Record<
  Extract<
    KangurPracticeOperation,
    | 'logical_thinking'
    | 'logical_patterns'
    | 'logical_classification'
    | 'logical_reasoning'
    | 'logical_analogies'
  >,
  readonly KangurLogicPracticeQuestionSeed[]
> = {
  logical_thinking: [
    {
      question: 'Ktory element najlepiej konczy wzorzec: czerwony, niebieski, czerwony, niebieski, ...?',
      answer: 'niebieski',
      choices: ['zielony', 'niebieski', 'zolty', 'czerwony'],
    },
    {
      question: 'Ktory element jest intruzem: 🍎 🍌 🥕 🍇 ?',
      answer: '🥕',
      choices: ['🍎', '🍌', '🥕', '🍇'],
    },
    {
      question: 'Jesli wszystkie koty maja wasy, a Mruczek jest kotem, to co wiemy na pewno?',
      answer: 'Mruczek ma wasy',
      choices: [
        'Mruczek ma wasy',
        'Mruczek umie szczekac',
        'Kazde zwierze ma wasy',
        'Mruczek jest psem',
      ],
    },
    {
      question: 'Ktora odpowiedz opisuje klasyfikacje?',
      answer: 'grupowanie elementow wedlug wspolnej cechy',
      choices: [
        'zgadywanie bez reguly',
        'liczenie tylko do 10',
        'grupowanie elementow wedlug wspolnej cechy',
        'rysowanie figur bez porownania',
      ],
    },
    {
      question: 'Ktory ciag pasuje do zasady +2 w kazdym kroku?',
      answer: '2, 4, 6, 8',
      choices: ['2, 4, 6, 8', '3, 6, 9, 13', '5, 6, 8, 11', '1, 3, 6, 10'],
    },
    {
      question: 'Ktore zdanie pokazuje logiczne wnioskowanie?',
      answer: 'Najpierw sprawdzam warunek, potem wyciagam wniosek',
      choices: [
        'Wybieram odpowiedz, bo brzmi ladnie',
        'Najpierw sprawdzam warunek, potem wyciagam wniosek',
        'Ignoruje dane i zgaduje',
        'Patrze tylko na pierwszy element zadania',
      ],
    },
  ],
  logical_patterns: [
    {
      question: 'Co jest dalej: 2, 4, 6, 8, ... ?',
      answer: '10',
      choices: ['9', '10', '11', '12'],
    },
    {
      question: 'Co jest dalej: 1, 2, 4, 8, ... ?',
      answer: '16',
      choices: ['10', '12', '16', '18'],
    },
    {
      question: 'Ktory symbol domyka wzorzec: ⭐ ⭐ 🌙 ⭐ ⭐ ... ?',
      answer: '🌙',
      choices: ['⭐', '🌙', '☀️', '🔵'],
    },
    {
      question: 'Jaka regule ma ciag 5, 10, 15, 20?',
      answer: 'dodaj 5',
      choices: ['dodaj 2', 'mnoz przez 2', 'dodaj 5', 'odejmij 5'],
    },
    {
      question: 'Co jest dalej w ciagu Fibonacciego: 1, 1, 2, 3, 5, 8, ... ?',
      answer: '13',
      choices: ['11', '12', '13', '15'],
    },
    {
      question: 'Ktora wskazowka jest najlepsza przy szukaniu reguly ciagu?',
      answer: 'sprawdz roznice lub iloraz miedzy kolejnymi elementami',
      choices: [
        'wybierz najwieksza liczbe',
        'sprawdz roznice lub iloraz miedzy kolejnymi elementami',
        'zawsze dodaj 1',
        'ignoruj srodkowe elementy',
      ],
    },
  ],
  logical_classification: [
    {
      question: 'Ktory element nie pasuje do grupy liczb parzystych: 2, 4, 7, 8?',
      answer: '7',
      choices: ['2', '4', '7', '8'],
    },
    {
      question: 'Jaka cecha laczy elementy 🍎 🍌 🍇 🍓 ?',
      answer: 'to owoce',
      choices: ['to warzywa', 'to owoce', 'to figury', 'to dni tygodnia'],
    },
    {
      question: 'Ktory zestaw najlepiej pokazuje klasyfikacje wedlug dwoch cech naraz?',
      answer: 'duze czerwone, duze niebieskie, male czerwone, male niebieskie',
      choices: [
        'same czerwone',
        'same male',
        'duze czerwone, duze niebieskie, male czerwone, male niebieskie',
        'losowa kolejnosc bez kryterium',
      ],
    },
    {
      question: 'Co pokazuje część wspólna w diagramie Venna?',
      answer: 'elementy należące do obu grup',
      choices: [
        'elementy spoza wszystkich grup',
        'elementy należące do obu grup',
        'tylko największą grupę',
        'same błędne odpowiedzi',
      ],
    },
    {
      question: 'Ktory intruz pasuje do zagadki: 🐦 🦅 🐝 🐈 ?',
      answer: '🐈',
      choices: ['🐦', '🦅', '🐝', '🐈'],
    },
    {
      question: 'Od czego trzeba zacząć klasyfikację?',
      answer: 'od ustalenia wspólnej cechy',
      choices: [
        'od zgadywania',
        'od ustalenia wspólnej cechy',
        'od policzenia tylko pierwszego elementu',
        'od zmiany pytania',
      ],
    },
  ],
  logical_reasoning: [
    {
      question: 'Jeśli liczba jest parzysta, to dzieli się przez 2. Co wiemy o liczbie 8?',
      answer: 'dzieli się przez 2',
      choices: ['jest nieparzysta', 'dzieli się przez 2', 'musi być większa od 100', 'nie można nic powiedzieć'],
    },
    {
      question: 'Który kwantyfikator oznacza, że twierdzenie dotyczy każdego przypadku?',
      answer: 'wszyscy',
      choices: ['wszyscy', 'niektórzy', 'żaden', 'czasami'],
    },
    {
      question: 'Które zdanie jest prawdziwe?',
      answer: '4 + 3 = 7',
      choices: ['4 + 3 = 7', 'trójkąt ma 4 boki', '9 jest liczbą parzystą', 'jeśli pada deszcz, to zawsze jest noc'],
    },
    {
      question: 'Co jest dobrym pierwszym krokiem przy rozwiązywaniu zagadki logicznej?',
      answer: 'wypisz fakty pewne i bezpośrednie',
      choices: [
        'zgadnij najbardziej prawdopodobną odpowiedź',
        'pomiń połowę wskazówek',
        'wypisz fakty pewne i bezpośrednie',
        'wybierz najdłuższą odpowiedź',
      ],
    },
    {
      question: 'Jesli wszystkie psy szczekaja, a Burek jest psem, to jaki jest wniosek?',
      answer: 'Burek szczeka',
      choices: ['Burek szczeka', 'każde zwierzę szczeka', 'Burek jest kotem', 'nie da się nic ustalić'],
    },
    {
      question: 'Co oznacza słowo "niektórzy" w zdaniu logicznym?',
      answer: 'tylko część przypadków',
      choices: ['każdy przypadek', 'żaden przypadek', 'tylko część przypadków', 'to samo co wszyscy'],
    },
  ],
  logical_analogies: [
    {
      question: 'Ptak : latac = ryba : ?',
      answer: 'plywac',
      choices: ['biegac', 'plywac', 'spac', 'liczyc'],
    },
    {
      question: '2 : 4 = 5 : ?',
      answer: '10',
      choices: ['7', '8', '10', '12'],
    },
    {
      question: 'Goracy : zimny = dzien : ?',
      answer: 'noc',
      choices: ['slonce', 'noc', 'cieplo', 'rano'],
    },
    {
      question: 'Strona : ksiazka = cegla : ?',
      answer: 'mur',
      choices: ['mur', 'okno', 'pies', 'atrament'],
    },
    {
      question: 'Ktora relacja najlepiej opisuje analogie "Nozyczki : ciecie = olowek : pisanie"?',
      answer: 'narzedzie i jego funkcja',
      choices: [
        'kolor i ksztalt',
        'narzedzie i jego funkcja',
        'liczba i miesiac',
        'zwierze i miejsce',
      ],
    },
    {
      question: '1 : 3 = 4 : ?',
      answer: '12',
      choices: ['7', '8', '12', '16'],
    },
  ],
};

const clampPercent = (value: number): number => Math.max(0, Math.min(100, Math.round(value)));
const mergeUniqueStrings = (values: string[]): string[] => Array.from(new Set(values));
const shuffleValues = <T,>(values: readonly T[]): T[] =>
  [...values].sort(() => Math.random() - 0.5);

const createEmptyLessonMasteryEntry = () => ({
  attempts: 0,
  completions: 0,
  masteryPercent: 0,
  bestScorePercent: 0,
  lastScorePercent: 0,
  lastCompletedAt: null,
});

export const isKangurPracticeOperation = (
  value: string,
): value is KangurPracticeOperation =>
  KANGUR_PRACTICE_OPERATIONS.includes(value as KangurPracticeOperation);

export const resolveKangurPracticeOperation = (
  value: string | null | undefined,
): KangurPracticeOperation => {
  const normalized = value?.trim().toLowerCase();
  if (normalized && isKangurPracticeOperation(normalized)) {
    return normalized;
  }

  return 'mixed';
};

export const getKangurPracticeOperationConfig = (
  operation: KangurPracticeOperation,
): KangurPracticeOperationConfig => KANGUR_PRACTICE_OPERATION_CONFIG[operation];

export const resolveKangurLessonFocusForPracticeOperation = (
  value: string | null | undefined,
): KangurLessonComponentId | null => {
  const operation = resolvePreferredKangurPracticeOperation(value);
  if (!operation) {
    return null;
  }

  return getKangurPracticeOperationConfig(operation).lessonComponentId;
};

export const getKangurPracticeOperationForLessonComponent = (
  lessonComponentId: KangurLessonComponentId,
): KangurPracticeOperation | null =>
  PRACTICE_OPERATION_BY_LESSON_COMPONENT[lessonComponentId] ?? null;

export const resolvePreferredKangurPracticeOperation = (
  value: string | null | undefined,
): KangurPracticeOperation | null => {
  const normalized = value?.trim().toLowerCase();
  if (!normalized) {
    return null;
  }

  if (isKangurPracticeOperation(normalized)) {
    return normalized;
  }

  return getKangurPracticeOperationForLessonComponent(
    normalized as KangurLessonComponentId,
  );
};

export const isKangurLogicPracticeOperation = (
  operation: KangurPracticeOperation,
): operation is Extract<
  KangurPracticeOperation,
  | 'logical_thinking'
  | 'logical_patterns'
  | 'logical_classification'
  | 'logical_reasoning'
  | 'logical_analogies'
> => getKangurPracticeOperationConfig(operation).kind === 'logic';

export const generateKangurLogicPracticeQuestions = (
  operation: Extract<
    KangurPracticeOperation,
    | 'logical_thinking'
    | 'logical_patterns'
    | 'logical_classification'
    | 'logical_reasoning'
    | 'logical_analogies'
  >,
  count = 8,
): KangurPracticeQuestion[] => {
  const questionBank = KANGUR_LOGIC_PRACTICE_QUESTION_BANK[operation];
  const safeCount = Math.max(1, Math.floor(count));

  return Array.from({ length: safeCount }, (_, index) => {
    const seed = questionBank[index % questionBank.length] ?? questionBank[0];
    if (!seed) {
      return {
        question: 'Brak pytania logicznego.',
        answer: 'Brak odpowiedzi',
        choices: ['Brak odpowiedzi'],
        category: operation,
      };
    }

    return {
      question: seed.question,
      answer: seed.answer,
      choices: shuffleValues(seed.choices),
      category: operation,
    };
  });
};

export const buildKangurLessonMasteryUpdate = (
  progress: KangurProgressState,
  lessonKey: string,
  scorePercent: number,
  completedAt: string = new Date().toISOString(),
): KangurProgressState['lessonMastery'] => {
  const normalizedKey = lessonKey.trim();
  if (!normalizedKey) {
    return progress.lessonMastery;
  }

  const current =
    progress.lessonMastery[normalizedKey] ?? createEmptyLessonMasteryEntry();
  const normalizedScore = clampPercent(scorePercent);
  const nextAttempts = current.attempts + 1;

  return {
    ...progress.lessonMastery,
    [normalizedKey]: {
      attempts: nextAttempts,
      completions: current.completions + 1,
      masteryPercent: clampPercent(
        (current.masteryPercent * current.attempts + normalizedScore) / nextAttempts,
      ),
      bestScorePercent: Math.max(current.bestScorePercent, normalizedScore),
      lastScorePercent: normalizedScore,
      lastCompletedAt: completedAt,
    },
  };
};

export const completeKangurPracticeSession = (input: {
  progress: KangurProgressState;
  operation: KangurPracticeOperation;
  correctAnswers: number;
  totalQuestions: number;
  greatThresholdPercent?: number;
}): KangurPracticeCompletionResult => {
  const safeTotalQuestions = Math.max(1, input.totalQuestions);
  const normalizedCorrectAnswers = Math.max(
    0,
    Math.min(input.correctAnswers, safeTotalQuestions),
  );
  const scorePercent = clampPercent(
    (normalizedCorrectAnswers / safeTotalQuestions) * 100,
  );
  const isPerfect = normalizedCorrectAnswers === safeTotalQuestions;
  const greatThresholdPercent = clampPercent(input.greatThresholdPercent ?? 60);
  const xpGained = isPerfect
    ? KANGUR_XP_REWARDS.perfect_game
    : scorePercent >= greatThresholdPercent
      ? KANGUR_XP_REWARDS.great_game
      : KANGUR_XP_REWARDS.good_game;
  const config = getKangurPracticeOperationConfig(input.operation);

  const updated = normalizeKangurProgressState({
    ...input.progress,
    totalXp: input.progress.totalXp + xpGained,
    gamesPlayed: input.progress.gamesPlayed + 1,
    perfectGames: isPerfect
      ? input.progress.perfectGames + 1
      : input.progress.perfectGames,
    lessonsCompleted: config.lessonComponentId
      ? input.progress.lessonsCompleted + 1
      : input.progress.lessonsCompleted,
    operationsPlayed: mergeUniqueStrings([
      ...input.progress.operationsPlayed,
      ...config.categories,
    ]),
    lessonMastery: config.lessonComponentId
      ? buildKangurLessonMasteryUpdate(
          input.progress,
          config.lessonComponentId,
          scorePercent,
        )
      : input.progress.lessonMastery,
  });

  const newBadges = checkKangurNewBadges(updated);
  updated.badges = mergeUniqueStrings([...updated.badges, ...newBadges]);

  return {
    updated,
    newBadges,
    xpGained,
    scorePercent,
    isPerfect,
    operation: input.operation,
  };
};
