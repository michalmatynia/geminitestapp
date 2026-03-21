import {
  localizeKangurCoreText,
  normalizeKangurCoreLocale,
  type KangurCoreLocale,
} from './profile-i18n';

type KangurPracticeLocalizedValue = Record<KangurCoreLocale, string>;

type KangurPracticeOperation =
  | 'addition'
  | 'subtraction'
  | 'multiplication'
  | 'division'
  | 'clock'
  | 'calendar'
  | 'mixed'
  | 'logical_thinking'
  | 'logical_patterns'
  | 'logical_classification'
  | 'logical_reasoning'
  | 'logical_analogies';

type KangurLogicPracticeOperation = Extract<
  KangurPracticeOperation,
  | 'logical_thinking'
  | 'logical_patterns'
  | 'logical_classification'
  | 'logical_reasoning'
  | 'logical_analogies'
>;

export type KangurLogicPracticeQuestionSeed = {
  question: string;
  answer: string;
  choices: string[];
};

const KANGUR_PRACTICE_OPERATION_LABELS: Record<
  KangurPracticeOperation,
  KangurPracticeLocalizedValue
> = {
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
  clock: {
    de: 'Uhr',
    en: 'Clock',
    pl: 'Zegar',
  },
  calendar: {
    de: 'Kalender',
    en: 'Calendar',
    pl: 'Kalendarz',
  },
  mixed: {
    de: 'Gemischtes Training',
    en: 'Mixed practice',
    pl: 'Trening mieszany',
  },
  logical_thinking: {
    de: 'Logisches Denken',
    en: 'Logical thinking',
    pl: 'Myślenie logiczne',
  },
  logical_patterns: {
    de: 'Muster und Reihen',
    en: 'Patterns and sequences',
    pl: 'Wzorce i ciągi',
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
};

const KANGUR_LOGIC_PRACTICE_FALLBACK_COPY = {
  answer: {
    de: 'Keine Antwort',
    en: 'No answer',
    pl: 'Brak odpowiedzi',
  },
  question: {
    de: 'Keine Logikfrage.',
    en: 'No logic question.',
    pl: 'Brak pytania logicznego.',
  },
} satisfies Record<'answer' | 'question', KangurPracticeLocalizedValue>;

const KANGUR_LOGIC_PRACTICE_QUESTION_BANK: Record<
  KangurCoreLocale,
  Record<KangurLogicPracticeOperation, readonly KangurLogicPracticeQuestionSeed[]>
> = {
  pl: {
    logical_thinking: [
      {
        question:
          'Który element najlepiej kończy wzorzec: czerwony, niebieski, czerwony, niebieski, ...?',
        answer: 'niebieski',
        choices: ['zielony', 'niebieski', 'żółty', 'czerwony'],
      },
      {
        question: 'Który element jest intruzem: 🍎 🍌 🥕 🍇 ?',
        answer: '🥕',
        choices: ['🍎', '🍌', '🥕', '🍇'],
      },
      {
        question:
          'Jeśli wszystkie koty mają wąsy, a Mruczek jest kotem, to co wiemy na pewno?',
        answer: 'Mruczek ma wąsy',
        choices: [
          'Mruczek ma wąsy',
          'Mruczek umie szczekać',
          'Każde zwierzę ma wąsy',
          'Mruczek jest psem',
        ],
      },
      {
        question: 'Która odpowiedź opisuje klasyfikację?',
        answer: 'grupowanie elementów według wspólnej cechy',
        choices: [
          'zgadywanie bez reguły',
          'liczenie tylko do 10',
          'grupowanie elementów według wspólnej cechy',
          'rysowanie figur bez porównania',
        ],
      },
      {
        question: 'Który ciąg pasuje do zasady +2 w każdym kroku?',
        answer: '2, 4, 6, 8',
        choices: ['2, 4, 6, 8', '3, 6, 9, 13', '5, 6, 8, 11', '1, 3, 6, 10'],
      },
      {
        question: 'Które zdanie pokazuje logiczne wnioskowanie?',
        answer: 'Najpierw sprawdzam warunek, potem wyciągam wniosek',
        choices: [
          'Wybieram odpowiedź, bo brzmi ładnie',
          'Najpierw sprawdzam warunek, potem wyciągam wniosek',
          'Ignoruję dane i zgaduję',
          'Patrzę tylko na pierwszy element zadania',
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
        question: 'Który symbol domyka wzorzec: ⭐ ⭐ 🌙 ⭐ ⭐ ... ?',
        answer: '🌙',
        choices: ['⭐', '🌙', '☀️', '🔵'],
      },
      {
        question: 'Jaką regułę ma ciąg 5, 10, 15, 20?',
        answer: 'dodaj 5',
        choices: ['dodaj 2', 'mnóż przez 2', 'dodaj 5', 'odejmij 5'],
      },
      {
        question: 'Co jest dalej w ciągu Fibonacciego: 1, 1, 2, 3, 5, 8, ... ?',
        answer: '13',
        choices: ['11', '12', '13', '15'],
      },
      {
        question: 'Która wskazówka jest najlepsza przy szukaniu reguły ciągu?',
        answer: 'sprawdź różnice lub iloraz między kolejnymi elementami',
        choices: [
          'wybierz największą liczbę',
          'sprawdź różnice lub iloraz między kolejnymi elementami',
          'zawsze dodaj 1',
          'ignoruj środkowe elementy',
        ],
      },
    ],
    logical_classification: [
      {
        question: 'Który element nie pasuje do grupy liczb parzystych: 2, 4, 7, 8?',
        answer: '7',
        choices: ['2', '4', '7', '8'],
      },
      {
        question: 'Jaka cecha łączy elementy 🍎 🍌 🍇 🍓 ?',
        answer: 'to owoce',
        choices: ['to warzywa', 'to owoce', 'to figury', 'to dni tygodnia'],
      },
      {
        question: 'Który zestaw najlepiej pokazuje klasyfikację według dwóch cech naraz?',
        answer: 'duże czerwone, duże niebieskie, małe czerwone, małe niebieskie',
        choices: [
          'same czerwone',
          'same małe',
          'duże czerwone, duże niebieskie, małe czerwone, małe niebieskie',
          'losowa kolejność bez kryterium',
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
        question: 'Który intruz pasuje do zagadki: 🐦 🦅 🐝 🐈 ?',
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
        choices: [
          'jest nieparzysta',
          'dzieli się przez 2',
          'musi być większa od 100',
          'nie można nic powiedzieć',
        ],
      },
      {
        question:
          'Który kwantyfikator oznacza, że twierdzenie dotyczy każdego przypadku?',
        answer: 'wszyscy',
        choices: ['wszyscy', 'niektórzy', 'żaden', 'czasami'],
      },
      {
        question: 'Które zdanie jest prawdziwe?',
        answer: '4 + 3 = 7',
        choices: [
          '4 + 3 = 7',
          'trójkąt ma 4 boki',
          '9 jest liczbą parzystą',
          'jeśli pada deszcz, to zawsze jest noc',
        ],
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
        question: 'Jeśli wszystkie psy szczekają, a Burek jest psem, to jaki jest wniosek?',
        answer: 'Burek szczeka',
        choices: [
          'Burek szczeka',
          'każde zwierzę szczeka',
          'Burek jest kotem',
          'nie da się nic ustalić',
        ],
      },
      {
        question: 'Co oznacza słowo "niektórzy" w zdaniu logicznym?',
        answer: 'tylko część przypadków',
        choices: [
          'każdy przypadek',
          'żaden przypadek',
          'tylko część przypadków',
          'to samo co wszyscy',
        ],
      },
    ],
    logical_analogies: [
      {
        question: 'Ptak : latać = ryba : ?',
        answer: 'pływać',
        choices: ['biegać', 'pływać', 'spać', 'liczyć'],
      },
      {
        question: '2 : 4 = 5 : ?',
        answer: '10',
        choices: ['7', '8', '10', '12'],
      },
      {
        question: 'Gorący : zimny = dzień : ?',
        answer: 'noc',
        choices: ['słońce', 'noc', 'ciepło', 'rano'],
      },
      {
        question: 'Strona : książka = cegła : ?',
        answer: 'mur',
        choices: ['mur', 'okno', 'pies', 'atrament'],
      },
      {
        question:
          'Która relacja najlepiej opisuje analogię "Nożyczki : cięcie = ołówek : pisanie"?',
        answer: 'narzędzie i jego funkcja',
        choices: [
          'kolor i kształt',
          'narzędzie i jego funkcja',
          'liczba i miesiąc',
          'zwierzę i miejsce',
        ],
      },
      {
        question: '1 : 3 = 4 : ?',
        answer: '12',
        choices: ['7', '8', '12', '16'],
      },
    ],
  },
  en: {
    logical_thinking: [
      {
        question:
          'Which element best completes the pattern: red, blue, red, blue, ...?',
        answer: 'blue',
        choices: ['green', 'blue', 'yellow', 'red'],
      },
      {
        question: 'Which item is the odd one out: 🍎 🍌 🥕 🍇 ?',
        answer: '🥕',
        choices: ['🍎', '🍌', '🥕', '🍇'],
      },
      {
        question:
          'If all cats have whiskers and Mruczek is a cat, what do we know for sure?',
        answer: 'Mruczek has whiskers',
        choices: [
          'Mruczek has whiskers',
          'Mruczek can bark',
          'Every animal has whiskers',
          'Mruczek is a dog',
        ],
      },
      {
        question: 'Which answer describes classification?',
        answer: 'grouping items by a shared feature',
        choices: [
          'guessing without a rule',
          'counting only to 10',
          'grouping items by a shared feature',
          'drawing shapes without comparing them',
        ],
      },
      {
        question: 'Which sequence follows the rule +2 at every step?',
        answer: '2, 4, 6, 8',
        choices: ['2, 4, 6, 8', '3, 6, 9, 13', '5, 6, 8, 11', '1, 3, 6, 10'],
      },
      {
        question: 'Which sentence shows logical reasoning?',
        answer: 'First I check the condition, then I draw the conclusion',
        choices: [
          'I choose the answer because it sounds nice',
          'First I check the condition, then I draw the conclusion',
          'I ignore the data and guess',
          'I only look at the first part of the task',
        ],
      },
    ],
    logical_patterns: [
      {
        question: 'What comes next: 2, 4, 6, 8, ... ?',
        answer: '10',
        choices: ['9', '10', '11', '12'],
      },
      {
        question: 'What comes next: 1, 2, 4, 8, ... ?',
        answer: '16',
        choices: ['10', '12', '16', '18'],
      },
      {
        question: 'Which symbol completes the pattern: ⭐ ⭐ 🌙 ⭐ ⭐ ... ?',
        answer: '🌙',
        choices: ['⭐', '🌙', '☀️', '🔵'],
      },
      {
        question: 'What rule does the sequence 5, 10, 15, 20 follow?',
        answer: 'add 5',
        choices: ['add 2', 'multiply by 2', 'add 5', 'subtract 5'],
      },
      {
        question: 'What comes next in the Fibonacci sequence: 1, 1, 2, 3, 5, 8, ... ?',
        answer: '13',
        choices: ['11', '12', '13', '15'],
      },
      {
        question: 'Which hint is best when you look for the rule of a sequence?',
        answer: 'check the differences or ratios between consecutive terms',
        choices: [
          'pick the largest number',
          'check the differences or ratios between consecutive terms',
          'always add 1',
          'ignore the middle terms',
        ],
      },
    ],
    logical_classification: [
      {
        question: 'Which item does not belong to the even numbers: 2, 4, 7, 8?',
        answer: '7',
        choices: ['2', '4', '7', '8'],
      },
      {
        question: 'What feature connects 🍎 🍌 🍇 🍓 ?',
        answer: 'they are fruit',
        choices: ['they are vegetables', 'they are fruit', 'they are shapes', 'they are weekdays'],
      },
      {
        question: 'Which set best shows classification by two features at once?',
        answer: 'big red, big blue, small red, small blue',
        choices: [
          'only red ones',
          'only small ones',
          'big red, big blue, small red, small blue',
          'random order with no criterion',
        ],
      },
      {
        question: 'What does the overlap in a Venn diagram show?',
        answer: 'items that belong to both groups',
        choices: [
          'items outside every group',
          'items that belong to both groups',
          'only the biggest group',
          'only wrong answers',
        ],
      },
      {
        question: 'Which odd one out fits the puzzle: 🐦 🦅 🐝 🐈 ?',
        answer: '🐈',
        choices: ['🐦', '🦅', '🐝', '🐈'],
      },
      {
        question: 'What should you start with when classifying?',
        answer: 'find the shared feature first',
        choices: [
          'start by guessing',
          'find the shared feature first',
          'count only the first item',
          'change the question',
        ],
      },
    ],
    logical_reasoning: [
      {
        question: 'If a number is even, it is divisible by 2. What do we know about 8?',
        answer: 'it is divisible by 2',
        choices: [
          'it is odd',
          'it is divisible by 2',
          'it must be greater than 100',
          'nothing can be said',
        ],
      },
      {
        question:
          'Which quantifier means that the statement applies to every case?',
        answer: 'all',
        choices: ['all', 'some', 'none', 'sometimes'],
      },
      {
        question: 'Which sentence is true?',
        answer: '4 + 3 = 7',
        choices: [
          '4 + 3 = 7',
          'a triangle has 4 sides',
          '9 is an even number',
          'if it rains, it is always night',
        ],
      },
      {
        question: 'What is a good first step when solving a logic puzzle?',
        answer: 'write down the facts that are certain and direct',
        choices: [
          'guess the most likely answer',
          'skip half of the clues',
          'write down the facts that are certain and direct',
          'pick the longest answer',
        ],
      },
      {
        question: 'If all dogs bark and Burek is a dog, what is the conclusion?',
        answer: 'Burek barks',
        choices: [
          'Burek barks',
          'every animal barks',
          'Burek is a cat',
          'nothing can be determined',
        ],
      },
      {
        question: 'What does the word "some" mean in a logic sentence?',
        answer: 'only part of the cases',
        choices: [
          'every case',
          'no case',
          'only part of the cases',
          'the same as all',
        ],
      },
    ],
    logical_analogies: [
      {
        question: 'Bird : fly = fish : ?',
        answer: 'swim',
        choices: ['run', 'swim', 'sleep', 'count'],
      },
      {
        question: '2 : 4 = 5 : ?',
        answer: '10',
        choices: ['7', '8', '10', '12'],
      },
      {
        question: 'Hot : cold = day : ?',
        answer: 'night',
        choices: ['sun', 'night', 'warm', 'morning'],
      },
      {
        question: 'Page : book = brick : ?',
        answer: 'wall',
        choices: ['wall', 'window', 'dog', 'ink'],
      },
      {
        question:
          'Which relation best describes the analogy "Scissors : cutting = pencil : writing"?',
        answer: 'a tool and its function',
        choices: [
          'colour and shape',
          'a tool and its function',
          'number and month',
          'animal and place',
        ],
      },
      {
        question: '1 : 3 = 4 : ?',
        answer: '12',
        choices: ['7', '8', '12', '16'],
      },
    ],
  },
  de: {
    logical_thinking: [
      {
        question:
          'Welches Element vervollstaendigt das Muster am besten: rot, blau, rot, blau, ...?',
        answer: 'blau',
        choices: ['gruen', 'blau', 'gelb', 'rot'],
      },
      {
        question: 'Welches Element passt nicht dazu: 🍎 🍌 🥕 🍇 ?',
        answer: '🥕',
        choices: ['🍎', '🍌', '🥕', '🍇'],
      },
      {
        question:
          'Wenn alle Katzen Schnurrhaare haben und Mruczek eine Katze ist, was wissen wir sicher?',
        answer: 'Mruczek hat Schnurrhaare',
        choices: [
          'Mruczek hat Schnurrhaare',
          'Mruczek kann bellen',
          'Jedes Tier hat Schnurrhaare',
          'Mruczek ist ein Hund',
        ],
      },
      {
        question: 'Welche Antwort beschreibt Klassifikation?',
        answer: 'Elemente nach einem gemeinsamen Merkmal gruppieren',
        choices: [
          'ohne Regel raten',
          'nur bis 10 zaehlen',
          'Elemente nach einem gemeinsamen Merkmal gruppieren',
          'Figuren ohne Vergleich zeichnen',
        ],
      },
      {
        question: 'Welche Folge passt zur Regel +2 in jedem Schritt?',
        answer: '2, 4, 6, 8',
        choices: ['2, 4, 6, 8', '3, 6, 9, 13', '5, 6, 8, 11', '1, 3, 6, 10'],
      },
      {
        question: 'Welcher Satz zeigt logisches Schlussfolgern?',
        answer: 'Zuerst pruefe ich die Bedingung, dann ziehe ich die Schlussfolgerung',
        choices: [
          'Ich waehle die Antwort, weil sie gut klingt',
          'Zuerst pruefe ich die Bedingung, dann ziehe ich die Schlussfolgerung',
          'Ich ignoriere die Daten und rate',
          'Ich schaue nur auf den ersten Teil der Aufgabe',
        ],
      },
    ],
    logical_patterns: [
      {
        question: 'Was kommt als Naechstes: 2, 4, 6, 8, ... ?',
        answer: '10',
        choices: ['9', '10', '11', '12'],
      },
      {
        question: 'Was kommt als Naechstes: 1, 2, 4, 8, ... ?',
        answer: '16',
        choices: ['10', '12', '16', '18'],
      },
      {
        question: 'Welches Symbol schliesst das Muster ab: ⭐ ⭐ 🌙 ⭐ ⭐ ... ?',
        answer: '🌙',
        choices: ['⭐', '🌙', '☀️', '🔵'],
      },
      {
        question: 'Welche Regel hat die Folge 5, 10, 15, 20?',
        answer: 'addiere 5',
        choices: ['addiere 2', 'multipliziere mit 2', 'addiere 5', 'subtrahiere 5'],
      },
      {
        question: 'Was kommt als Naechstes in der Fibonacci-Folge: 1, 1, 2, 3, 5, 8, ... ?',
        answer: '13',
        choices: ['11', '12', '13', '15'],
      },
      {
        question: 'Welcher Hinweis hilft am meisten, wenn du die Regel einer Folge suchst?',
        answer: 'pruefe die Differenzen oder Verhaeltnisse zwischen aufeinanderfolgenden Elementen',
        choices: [
          'waehle die groesste Zahl',
          'pruefe die Differenzen oder Verhaeltnisse zwischen aufeinanderfolgenden Elementen',
          'addiere immer 1',
          'ignoriere die mittleren Elemente',
        ],
      },
    ],
    logical_classification: [
      {
        question: 'Welches Element gehoert nicht zu den geraden Zahlen: 2, 4, 7, 8?',
        answer: '7',
        choices: ['2', '4', '7', '8'],
      },
      {
        question: 'Welches Merkmal verbindet 🍎 🍌 🍇 🍓 ?',
        answer: 'es sind Fruechte',
        choices: ['es sind Gemuese', 'es sind Fruechte', 'es sind Formen', 'es sind Wochentage'],
      },
      {
        question:
          'Welche Menge zeigt am besten eine Klassifikation nach zwei Merkmalen zugleich?',
        answer: 'gross rot, gross blau, klein rot, klein blau',
        choices: [
          'nur rote',
          'nur kleine',
          'gross rot, gross blau, klein rot, klein blau',
          'zufaellige Reihenfolge ohne Kriterium',
        ],
      },
      {
        question: 'Was zeigt die Schnittmenge in einem Venn-Diagramm?',
        answer: 'Elemente, die zu beiden Gruppen gehoeren',
        choices: [
          'Elemente ausserhalb aller Gruppen',
          'Elemente, die zu beiden Gruppen gehoeren',
          'nur die groesste Gruppe',
          'nur falsche Antworten',
        ],
      },
      {
        question: 'Welches unpassende Element gehoert zum Raetsel: 🐦 🦅 🐝 🐈 ?',
        answer: '🐈',
        choices: ['🐦', '🦅', '🐝', '🐈'],
      },
      {
        question: 'Womit sollte man beim Klassifizieren beginnen?',
        answer: 'zuerst das gemeinsame Merkmal festlegen',
        choices: [
          'mit Raten beginnen',
          'zuerst das gemeinsame Merkmal festlegen',
          'nur das erste Element zaehlen',
          'die Frage aendern',
        ],
      },
    ],
    logical_reasoning: [
      {
        question: 'Wenn eine Zahl gerade ist, ist sie durch 2 teilbar. Was wissen wir ueber 8?',
        answer: 'sie ist durch 2 teilbar',
        choices: [
          'sie ist ungerade',
          'sie ist durch 2 teilbar',
          'sie muss groesser als 100 sein',
          'man kann nichts sagen',
        ],
      },
      {
        question:
          'Welcher Quantor bedeutet, dass die Aussage fuer jeden Fall gilt?',
        answer: 'alle',
        choices: ['alle', 'einige', 'keiner', 'manchmal'],
      },
      {
        question: 'Welcher Satz ist wahr?',
        answer: '4 + 3 = 7',
        choices: [
          '4 + 3 = 7',
          'ein Dreieck hat 4 Seiten',
          '9 ist eine gerade Zahl',
          'wenn es regnet, ist immer Nacht',
        ],
      },
      {
        question: 'Was ist ein guter erster Schritt beim Loesen eines Logikraetsels?',
        answer: 'schreibe die sicheren und direkten Fakten auf',
        choices: [
          'rate die wahrscheinlichste Antwort',
          'ueberspringe die Haelfte der Hinweise',
          'schreibe die sicheren und direkten Fakten auf',
          'waehle die laengste Antwort',
        ],
      },
      {
        question: 'Wenn alle Hunde bellen und Burek ein Hund ist, was ist die Schlussfolgerung?',
        answer: 'Burek bellt',
        choices: [
          'Burek bellt',
          'jedes Tier bellt',
          'Burek ist eine Katze',
          'man kann nichts feststellen',
        ],
      },
      {
        question: 'Was bedeutet das Wort "einige" in einem logischen Satz?',
        answer: 'nur ein Teil der Faelle',
        choices: [
          'jeder Fall',
          'kein Fall',
          'nur ein Teil der Faelle',
          'dasselbe wie alle',
        ],
      },
    ],
    logical_analogies: [
      {
        question: 'Vogel : fliegen = Fisch : ?',
        answer: 'schwimmen',
        choices: ['rennen', 'schwimmen', 'schlafen', 'zaehlen'],
      },
      {
        question: '2 : 4 = 5 : ?',
        answer: '10',
        choices: ['7', '8', '10', '12'],
      },
      {
        question: 'Heiss : kalt = Tag : ?',
        answer: 'Nacht',
        choices: ['Sonne', 'Nacht', 'warm', 'Morgen'],
      },
      {
        question: 'Seite : Buch = Ziegel : ?',
        answer: 'Mauer',
        choices: ['Mauer', 'Fenster', 'Hund', 'Tinte'],
      },
      {
        question:
          'Welche Beziehung beschreibt die Analogie "Schere : schneiden = Bleistift : schreiben" am besten?',
        answer: 'ein Werkzeug und seine Funktion',
        choices: [
          'Farbe und Form',
          'ein Werkzeug und seine Funktion',
          'Zahl und Monat',
          'Tier und Ort',
        ],
      },
      {
        question: '1 : 3 = 4 : ?',
        answer: '12',
        choices: ['7', '8', '12', '16'],
      },
    ],
  },
};

export const getLocalizedKangurPracticeOperationLabel = (
  operation: KangurPracticeOperation,
  locale?: string | null | undefined,
): string => localizeKangurCoreText(KANGUR_PRACTICE_OPERATION_LABELS[operation], locale);

export const getLocalizedKangurPracticeFallbackQuestion = (
  locale?: string | null | undefined,
): string => localizeKangurCoreText(KANGUR_LOGIC_PRACTICE_FALLBACK_COPY.question, locale);

export const getLocalizedKangurPracticeFallbackAnswer = (
  locale?: string | null | undefined,
): string => localizeKangurCoreText(KANGUR_LOGIC_PRACTICE_FALLBACK_COPY.answer, locale);

export const getLocalizedKangurLogicPracticeQuestionBank = (
  operation: KangurLogicPracticeOperation,
  locale?: string | null | undefined,
): readonly KangurLogicPracticeQuestionSeed[] =>
  KANGUR_LOGIC_PRACTICE_QUESTION_BANK[normalizeKangurCoreLocale(locale)][operation];
