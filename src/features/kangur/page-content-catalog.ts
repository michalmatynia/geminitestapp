import { DEFAULT_KANGUR_AI_TUTOR_NATIVE_GUIDE_STORE } from '@/features/kangur/shared/contracts/kangur-ai-tutor-native-guide';
import {
  kangurPageContentStoreSchema,
  type KangurPageContentEntry,
  type KangurPageContentFragment,
  type KangurPageContentPageKey,
  type KangurPageContentStore,
} from '@/features/kangur/shared/contracts/kangur-page-content';

import {
  KANGUR_AI_TUTOR_PAGE_COVERAGE_READY_FOR_MONGO,
  type KangurAiTutorPageCoverageEntry,
} from './ai-tutor-page-coverage-manifest';
import { getKangurHomeHref, getKangurPageSlug } from './config/routing';
import type { KangurLessonComponentId } from '@/features/kangur/shared/contracts/kangur';
import { KANGUR_LESSON_COMPONENT_OPTIONS, KANGUR_LESSON_LIBRARY } from './settings';
import { repairKangurPolishCopy } from '@/shared/lib/i18n/kangur-polish-diacritics';

const KANGUR_HOME_ROUTE = getKangurHomeHref('/');
const KANGUR_PAGE_CONTENT_VERSION = 1;

const PAGE_CONTENT_COPY_OVERRIDES: Partial<
  Record<
    string,
    {
      title?: string;
      summary?: string;
    }
  >
> = {
  'game-home-actions': {
    title: 'Wybierz aktywność',
    summary:
      'Przejdź do lekcji, szybkiej gry, treningu mieszanego lub Kangura Matematycznego.',
  },
  'game-home-leaderboard': {
    title: 'Najlepsze wyniki',
    summary:
      'Sprawdź, kto zdobywa najwięcej punktów i ile brakuje do kolejnego miejsca w rankingu.',
  },
  'game-home-progress': {
    title: 'Postępy ucznia',
    summary: 'Zobacz poziom, serie, skuteczność i najbliższe odznaki w jednym miejscu.',
  },
  'parent-dashboard-guest-hero': {
    title: 'Panel Rodzica / Nauczyciela',
    summary: 'Sprawdź, jak odblokować widok opiekuna i przejdź do konta z uprawnieniami rodzica.',
  },
  'parent-dashboard-hero': {
    title: 'Panel Rodzica',
    summary: 'To centrum decyzji opiekuna: wybierz ucznia i przejdź do zakładki z potrzebnym kontekstem.',
  },
  'parent-dashboard-learner-management': {
    title: 'Zarządzaj profilami bez opuszczania panelu',
    summary: 'Rodzic loguje się emailem, a uczniowie dostają osobne nazwy logowania i hasła.',
  },
  'parent-dashboard-tabs': {
    title: 'Zakładki panelu',
    summary: 'Przełączaj między wynikami, postępem, zadaniami, monitoringiem i ustawieniami Tutor-AI.',
  },
  'parent-dashboard-progress': {
    title: 'Postęp ucznia',
    summary: 'Sprawdź rytm nauki, poziom, misję dnia i główny kierunek dalszej pracy.',
  },
  'parent-dashboard-scores': {
    title: 'Wyniki ucznia',
    summary: 'Przejrzyj ostatnie gry, skuteczność i obszary, które warto teraz powtórzyć.',
  },
  'parent-dashboard-assignments': {
    title: 'Zadania ucznia',
    summary: 'Nadaj priorytet pracy, sprawdź zadania przypisane i sugestie od StudiQ.',
  },
  'parent-dashboard-monitoring': {
    title: 'Monitorowanie zadań',
    summary: 'Sprawdź postęp przypisanych zadań oraz sugestii od StudiQ.',
  },
  'parent-dashboard-ai-tutor': {
    title: 'Tutor-AI dla rodzica',
    summary: 'Interpretuj dane ucznia i ustaw dostępność wsparcia AI z jednego miejsca.',
  },
  'login-page-form': {
    title: 'Zaloguj się',
    summary:
      'Zaloguj się e-mailem rodzica albo nickiem ucznia. Typ konta wybierzemy po kliknięciu Zaloguj.',
  },
  'login-page-identifier-field': {
    title: 'Email rodzica albo nick ucznia',
    summary: 'Wpisz email rodzica albo nick ucznia. Typ konta wybierzemy po kliknięciu Zaloguj.',
  },
  'shared-nav-create-account-action': {
    title: 'Utwórz konto',
    summary: 'Załóż konto rodzica bez opuszczania bieżącej strony.',
  },
  'shared-nav-login-action': {
    title: 'Zaloguj się',
    summary: 'Otwórz logowanie rodzica lub ucznia z dowolnej strony Kangur.',
  },
  'lessons-list-intro': {
    title: 'Lekcje',
    summary: 'Wybierz temat i przejdź od razu do praktyki lub powtórki.',
  },
  'lessons-library': {
    title: 'Biblioteka lekcji',
    summary: 'Wybierz temat i rozpocznij naukę lub powtórkę w swoim tempie.',
  },
  'lessons-list-empty-state': {
    title: 'Brak aktywnych lekcji',
    summary: 'Włącz lekcje w panelu admina, aby pojawiły się tutaj.',
  },
  'lessons-active-header': {
    title: 'Aktywna lekcja',
    summary: 'Przejdź przez temat krok po kroku, odsłuchaj materiał i sprawdź, czy czeka tu zadanie od rodzica.',
  },
  'lessons-active-assignment': {
    title: 'Zadanie od rodzica',
    summary: 'To miejsce pokazuje, czy ta lekcja ma aktywny priorytet od rodzica albo została już zaliczona.',
  },
  'lessons-active-document': {
    title: 'Materiał lekcji',
    summary: 'Czytaj zapisany dokument krok po kroku i wracaj do niego podczas praktyki.',
  },
  'lessons-active-secret-panel': {
    title: 'Ukryty finisz',
    summary: 'Złota pigułka odblokowała finał na końcu kolejki. Trafiłeś od razu do ukrytego zakończenia.',
  },
  'lessons-active-empty-document': {
    title: 'Brak zapisanej treści lekcji',
    summary: 'Ta lekcja ma włączony tryb dokumentu, ale nie zapisano jeszcze bloków treści.',
  },
  'lessons-active-navigation': {
    title: 'Nawigacja lekcji',
    summary: 'Przechodź do poprzedniej lub kolejnej lekcji bez wracania do całej listy.',
  },
  'tests-empty-state': {
    title: 'Brak opublikowanych pytań',
    summary: 'Ten zestaw nie ma jeszcze aktywnych pytań testowych. Wróć później albo wybierz inny zestaw.',
  },
  'tests-question': {
    title: 'Pytanie testowe',
    summary: 'Wybierz jedną odpowiedź, a potem sprawdź omówienie i poprawny tok myślenia.',
  },
  'tests-selection': {
    title: 'Twój zaznaczony wybór',
    summary:
      'To jest odpowiedź wybrana przed sprawdzeniem wyniku. Tutor może wyjaśnić, co oznacza ten wybór i na co spojrzeć jeszcze raz.',
  },
  'tests-review': {
    title: 'Omówienie odpowiedzi',
    summary: 'Porównaj swój wybór z poprawną odpowiedzią i przeczytaj krótkie wyjaśnienie.',
  },
  'tests-summary': {
    title: 'Podsumowanie testu',
    summary: 'Sprawdź wynik końcowy i wróć do pytań, aby przeanalizować odpowiedzi.',
  },
  'learner-profile-hero': {
    title: 'Profil ucznia',
    summary: 'Sprawdź kamienie milowe, aktywność i kolejne kroki dla aktualnego ucznia.',
  },
  'learner-profile-level-progress': {
    title: 'Postęp poziomu',
    summary: 'Zobacz aktualny poziom, łączne XP i brakujący dystans do następnego progu.',
  },
  'learner-profile-overview': {
    title: 'Przegląd wyników',
    summary: 'Najważniejsze wskaźniki dnia: skuteczność, misja, cel i odznaki w jednym widoku.',
  },
  'learner-profile-recommendations': {
    title: 'Plan na dziś',
    summary: 'Krótka lista kolejnych kroków na podstawie ostatnich wyników i aktywności.',
  },
  'learner-profile-assignments': {
    title: 'Sugestie od Rodzica',
    summary: 'Zadania i wskazówki od rodzica, które warto wykonać w pierwszej kolejności.',
  },
  'learner-profile-performance': {
    title: 'Skuteczność ucznia',
    summary: 'Zobacz rytm ostatnich siedmiu dni i skuteczność dla poszczególnych operacji.',
  },
  'learner-profile-sessions': {
    title: 'Historia sesji',
    summary: 'Sprawdź ostatnie podejścia oraz ścieżki odznak budowane przez regularną grę.',
  },
  'learner-profile-ai-tutor-mood': {
    title: 'Nastrój Tutor-AI',
    summary: 'Zobacz aktualny ton wspierania ucznia, poziom pewności i chwilę ostatniej aktualizacji.',
  },
  'learner-profile-mastery': {
    title: 'Opanowanie lekcji',
    summary: 'Sprawdź tematy do powtórki i najmocniejsze obszary na podstawie zapisanych lekcji.',
  },
};

const LESSON_LIBRARY_FRAGMENT_DETAILS: Record<
  KangurLessonComponentId,
  {
    explanation: string;
    triggerPhrases: string[];
    aliases?: string[];
  }
> = {
  clock: {
    explanation:
      'Lekcja uczy odczytywania godzin i minut na zegarze analogowym, w tym pełnych godzin, połówek i kwadransów. Przydatna, gdy temat to czas i plan dnia.',
    triggerPhrases: ['zegar', 'czas', 'godziny', 'minuty', 'kwadrans'],
  },
  calendar: {
    explanation:
      'Ćwiczy dni tygodnia, miesiące, daty i pory roku oraz liczenie odstępów czasu. Wybierz ją, gdy zadania dotyczą kalendarza lub planowania.',
    triggerPhrases: ['kalendarz', 'daty', 'dni tygodnia', 'miesiące', 'pory roku'],
  },
  adding: {
    explanation:
      'Dodawanie jednocyfrowe i dwucyfrowe, także z przejściem przez dziesiątkę. Dziecko ćwiczy strategie łączenia liczb i sprawdzanie sum.',
    triggerPhrases: ['dodawanie', 'suma', 'plus', 'dodaj'],
  },
  subtracting: {
    explanation:
      'Odejmowanie jednocyfrowe i dwucyfrowe, także z pożyczaniem. Pomaga zrozumieć różnicę i kontrolować wynik przez dodawanie.',
    triggerPhrases: ['odejmowanie', 'różnica', 'minus', 'odejmij'],
  },
  alphabet_basics: {
    explanation: 'Rysuj litery po kolorowym śladzie. To gra dla 6-latków.',
    triggerPhrases: ['alfabet', 'litery', 'pisanie'],
  },
  alphabet_copy: {
    explanation: 'Przepisuj litery pod wzorem i ucz sie pisania w liniach.',
    triggerPhrases: ['przepisz', 'litery', 'pisanie', 'linia'],
  },
  alphabet_syllables: {
    explanation: 'Buduj słowa z sylab. Gra dla 7-latków.',
    triggerPhrases: ['sylaby', 'slowa'],
  },
  alphabet_words: {
    explanation: 'Rozpoznawaj litery na początku słów. Gra dla 6-latków.',
    triggerPhrases: ['slowa', 'litery'],
  },
  alphabet_matching: {
    explanation: 'Łącz duże i małe litery w pary. Gra dla 6-latków.',
    triggerPhrases: ['dopasowanie', 'pary'],
  },
  alphabet_sequence: {
    explanation: 'Ułóż litery w poprawnej kolejności. Gra dla 6-latków.',
    triggerPhrases: ['kolejnosc', 'alfabet'],
  },
  webdev_react_components: {
    explanation: 'Buduj interaktywne komponenty w React. Lekcja dla dorosłych.',
    triggerPhrases: ['react', 'komponenty', 'programowanie'],
  },
  webdev_react_dom_components: {
    explanation: 'Poznaj komponenty React DOM i podstawy pracy z DOM. Lekcja dla dorosłych.',
    triggerPhrases: ['react dom', 'react-dom', 'dom', 'components', 'komponenty'],
  },
  webdev_react_hooks: {
    explanation: 'Poznaj podstawy hooków w React 19.2. Lekcja dla dorosłych.',
    triggerPhrases: ['hooks', 'hooki', 'useState', 'useEffect', 'react'],
  },
  webdev_react_apis: {
    explanation: 'Poznaj podstawowe API Reacta. Lekcja dla dorosłych.',
    triggerPhrases: ['api', 'apis', 'react', 'createContext', 'memo', 'lazy'],
  },
  webdev_react_dom_hooks: {
    explanation: 'Poznaj hooki z React DOM i obsługę formularzy. Lekcja dla dorosłych.',
    triggerPhrases: ['react dom', 'react-dom', 'dom', 'form', 'formularz', 'useFormStatus'],
  },
  webdev_react_dom_apis: {
    explanation: 'Poznaj API React DOM: portale i narzędzia renderowania. Lekcja dla dorosłych.',
    triggerPhrases: ['react dom', 'react-dom', 'portal', 'createPortal', 'flushSync'],
  },
  webdev_react_dom_client_apis: {
    explanation: 'Poznaj client API React DOM: createRoot i hydrateRoot. Lekcja dla dorosłych.',
    triggerPhrases: ['react dom', 'react-dom', 'createRoot', 'hydrateRoot', 'client api'],
  },
  webdev_react_dom_server_apis: {
    explanation: 'Poznaj server API React DOM: renderowanie HTML i streaming. Lekcja dla dorosłych.',
    triggerPhrases: ['react dom', 'react-dom', 'renderToString', 'streaming', 'server api'],
  },
  webdev_react_dom_static_apis: {
    explanation: 'Poznaj static API React DOM: renderowanie bez streamingu. Lekcja dla dorosłych.',
    triggerPhrases: ['react dom', 'react-dom', 'static', 'renderToStaticMarkup', 'renderToString'],
  },
  webdev_react_compiler_config: {
    explanation: 'Poznaj konfigurację React Compiler i podstawy optymalizacji. Lekcja dla dorosłych.',
    triggerPhrases: ['react compiler', 'compiler', 'konfiguracja', 'optymalizacja', 'memo'],
  },
  webdev_react_compiler_directives: {
    explanation: 'Poznaj dyrektywy React Compiler i kontrolę optymalizacji. Lekcja dla dorosłych.',
    triggerPhrases: ['react compiler', 'directives', 'dyrektywy', 'compiler'],
  },
  webdev_react_compiler_libraries: {
    explanation: 'Poznaj biblioteki wspierające React Compiler. Lekcja dla dorosłych.',
    triggerPhrases: ['react compiler', 'libraries', 'biblioteki', 'compiler'],
  },
  webdev_react_performance_tracks: {
    explanation: 'Poznaj ścieżki wydajności w React i analizę renderów. Lekcja dla dorosłych.',
    triggerPhrases: ['performance', 'wydajność', 'tracks', 'profiler', 'render'],
  },
  webdev_react_lints: {
    explanation: 'Poznaj linting w React i zasady jakości kodu. Lekcja dla dorosłych.',
    triggerPhrases: ['lint', 'linting', 'eslint', 'rules of hooks', 'quality'],
  },
  webdev_react_rules: {
    explanation: 'Poznaj Rules Of React i dobre praktyki Reacta. Lekcja dla dorosłych.',
    triggerPhrases: ['rules of react', 'zasady reacta', 'react rules', 'best practices'],
  },
  webdev_react_server_components: {
    explanation: 'Poznaj Server Components i podział na Server/Client. Lekcja dla dorosłych.',
    triggerPhrases: ['server components', 'react server components', 'use client', 'server'],
  },
  webdev_react_server_functions: {
    explanation: 'Poznaj Server Functions i bezpieczne akcje po stronie serwera. Lekcja dla dorosłych.',
    triggerPhrases: ['server functions', 'server actions', 'use server', 'actions'],
  },
  webdev_react_server_directives: {
    explanation: 'Poznaj Server Directives i granice kodu. Lekcja dla dorosłych.',
    triggerPhrases: ['server directives', 'use server', 'use client', 'directives'],
  },
  webdev_react_router: {
    explanation: 'Poznaj podstawy routingu w React i React Router. Lekcja dla dorosłych.',
    triggerPhrases: ['react router', 'routing', 'routes', 'route', 'nawigacja'],
  },
  webdev_react_setup: {
    explanation: 'Poznaj podstawy konfiguracji i uruchomienia React. Lekcja dla dorosłych.',
    triggerPhrases: ['setup', 'konfiguracja', 'start', 'dev server', 'react'],
  },
  webdev_react_state_management: {
    explanation: 'Poznaj podstawy zarządzania stanem w React. Lekcja dla dorosłych.',
    triggerPhrases: ['state', 'stan', 'useState', 'context', 'reducer'],
  },
  multiplication: {
    explanation:
      'Utrwala tabliczkę mnożenia, mnożenie jako grupowanie i prosty algorytm. Dobra do automatyzacji iloczynów.',
    triggerPhrases: ['mnożenie', 'iloczyn', 'tabliczka mnożenia', 'razy'],
  },
  division: {
    explanation:
      'Uczy dzielenia na równe części oraz pracy z resztą. Pomaga łączyć dzielenie z mnożeniem jako sprawdzaniem wyniku.',
    triggerPhrases: ['dzielenie', 'iloraz', 'reszta', 'podziel'],
  },
  geometry_basics: {
    explanation:
      'Poznajesz podstawy geometrii: punkt, odcinek, prosta, bok i kąt. Lekcja uczy słownictwa i rozpoznawania elementów figur.',
    triggerPhrases: ['podstawy geometrii', 'punkt', 'odcinek', 'kąt', 'bok'],
  },
  geometry_shapes: {
    explanation:
      'Rozpoznawanie figur (trójkąt, kwadrat, prostokąt, koło) i ich cech. Uczy nazywania i odróżniania kształtów.',
    triggerPhrases: ['figury', 'kształty', 'trójkąt', 'kwadrat', 'prostokąt', 'koło'],
  },
  geometry_shape_recognition: {
    explanation:
      'Ćwiczy rozpoznawanie podstawowych kształtów: koła, kwadratu, trójkąta, prostokąta, owalu i rombu.',
    triggerPhrases: ['kształty', 'figury', 'koło', 'kwadrat', 'trójkąt', 'prostokąt', 'owal', 'romb'],
  },
  geometry_symmetry: {
    explanation:
      'Oś symetrii i odbicia lustrzane. Ćwiczy zauważanie, czy kształty są symetryczne i gdzie przebiega oś.',
    triggerPhrases: ['symetria', 'oś symetrii', 'odbicie', 'lustro'],
  },
  geometry_perimeter: {
    explanation:
      'Obliczanie obwodu jako sumy długości boków. Lekcja uczy liczyć krok po kroku i kontrolować jednostki.',
    triggerPhrases: ['obwód', 'długość boków', 'perymetr'],
  },
  logical_thinking: {
    explanation:
      'Wprowadzenie do myślenia logicznego: wzorce, klasyfikacja i analogie. Dobry start dla zadań wymagających analizy.',
    triggerPhrases: ['myślenie logiczne', 'logika', 'wstęp do logiki', 'wzorce', 'analogie'],
  },
  logical_patterns: {
    explanation:
      'Szukanie reguły w ciągach i wzorcach, uzupełnianie braków. Ćwiczy przewidywanie następnego elementu.',
    triggerPhrases: ['wzorce', 'ciągi', 'sekwencje', 'reguła', 'schemat'],
  },
  logical_classification: {
    explanation:
      'Grupowanie po cechach, sortowanie i znajdowanie elementu niepasującego. Uczy porównywania i tworzenia kategorii.',
    triggerPhrases: ['klasyfikacja', 'sortowanie', 'grupowanie', 'intruzi', 'kategorie'],
  },
  logical_reasoning: {
    explanation:
      'Wnioskowanie "jeśli... to..." i łączenie faktów w ciąg kroków. Pomaga budować poprawny tok rozumowania.',
    triggerPhrases: ['wnioskowanie', 'jeśli to', 'wniosek', 'przyczyna i skutek'],
  },
  logical_analogies: {
    explanation:
      'Analogie i relacje między pojęciami. Uczy rozpoznawać podobieństwa typu A:B = C:?.',
    triggerPhrases: ['analogie', 'porównania', 'relacje', 'A do B'],
  },
  english_basics: {
    explanation:
      'Podstawy języka angielskiego: proste słownictwo, zwroty i rozumienie krótkich komunikatów. Pomaga oswoić się z angielskim w codziennych sytuacjach.',
    triggerPhrases: ['angielski', 'język angielski', 'słownictwo', 'podstawy english'],
    aliases: ['english basics', 'podstawy angielskiego'],
  },
  english_parts_of_speech: {
    explanation:
      'Zaimki osobowe i dzierżawcze w kontekście matematyki dla nastolatków. Lekcja pomaga mówić, kto wykonuje zadanie i czyje są rozwiązania, wykresy lub notatki.',
    triggerPhrases: [
      'zaimki',
      'zaimki osobowe',
      'zaimki dzierżawcze',
      'pronouns',
      'possessive',
      'possessive pronouns',
      'my your his her',
      'mine yours',
      'english pronouns',
      'części mowy',
      'czesci mowy angielski',
    ],
    aliases: ['english pronouns', 'zaimki angielski', 'pronouns lesson', 'części mowy'],
  },
  english_sentence_structure: {
    explanation:
      'Szyk zdania po angielsku: Subject-Verb-Object, pytania z do/does, przysłówki oraz łączenie zdań. Lekcja pomaga budować poprawne zdania i unikać typowych błędów.',
    triggerPhrases: [
      'szyk zdania',
      'word order',
      'sentence structure',
      'subject verb object',
      'do does questions',
      'adverbs of frequency',
      'łączenie zdań',
      'and but because',
      'sentence order',
    ],
    aliases: ['sentence structure', 'szyk zdania', 'word order', 'english sentence'],
  },
  english_subject_verb_agreement: {
    explanation:
      'Zgodność podmiotu i czasownika w Present Simple. Lekcja pokazuje reguły he/she/it + -s, am/is/are oraz typowe pułapki w dłuższych zdaniach.',
    triggerPhrases: [
      'subject verb agreement',
      'subject-verb agreement',
      'agreement',
      'zgodność podmiotu i czasownika',
      'zgodnosc podmiotu i czasownika',
      'zgodność podmiotu z orzeczeniem',
      'zgodnosc podmiotu z orzeczeniem',
      'he she it s',
      'am is are',
      'singular plural verbs',
      'gramatyka angielska',
    ],
    aliases: [
      'subject verb',
      'subject-verb',
      'zgodnosc podmiotu',
      'subject verb rules',
      'subject verb practice',
    ],
  },
  english_articles: {
    explanation:
      'Przedimki a/an/the oraz brak przedimka w kontekście matematyki. Lekcja pomaga mówić o przykładach, konkretnych obiektach i ogólnych zasadach.',
    triggerPhrases: [
      'przedimki',
      'przedimek',
      'articles',
      'a an the',
      'the',
      'an',
      'a',
      'english articles',
      'przedimki angielski',
      'zero article',
      'brak przedimka',
    ],
    aliases: ['english articles', 'przedimki angielskie', 'articles lesson'],
  },
  english_prepositions_time_place: {
    explanation:
      'Przyimki czasu i miejsca (at/on/in) oraz relacje w przestrzeni: between, above, below. Lekcja pomaga poprawnie opisywać czas i położenie w kontekście szkolnym.',
    triggerPhrases: [
      'prepositions',
      'prepositions of time',
      'prepositions of place',
      'at on in',
      'between',
      'above',
      'below',
      'preposition time',
      'preposition place',
      'przyimki',
      'przyimki czasu',
      'przyimki miejsca',
      'przyimki angielski',
    ],
    aliases: [
      'english prepositions',
      'prepositions lesson',
      'przyimki czas i miejsce',
      'przyimki czasowe',
      'przyimki miejsca angielski',
    ],
  },
};

const KANGUR_TEST_QUESTION_FRAGMENTS: KangurPageContentFragment[] = [
  {
    id: 'kangur-q1-squares',
    text: 'Który kwadrat został rozcięty wzdłuż pogrubionych linii na dwie części o różnych kształtach?',
    aliases: [
      'Pytanie 1 ⭐ 3 pkt (łatwe) Który kwadrat został rozcięty wzdłuż pogrubionych linii na dwie części o różnych kształtach?',
      'Pytanie 1 3 pkt (łatwe) Który kwadrat został rozcięty wzdłuż pogrubionych linii na dwie części o różnych kształtach?',
      'Który kwadrat został rozcięty wzdłuż pogrubionych linii na dwie części o różnych kształtach? (A–E)',
    ],
    explanation:
      'To zadanie sprawdza, czy po rozcięciu powstają dwie identyczne czy różne części. Skup się na porównaniu kształtów po obrocie lub odbiciu, zamiast liczyć długości.',
    nativeGuideIds: ['test-kangur-q1-squares'],
    triggerPhrases: [
      'pytanie 1 kangur',
      'rozcięty kwadrat',
      'pogrubione linie',
      'dwie części',
      'różne kształty',
    ],
    enabled: true,
    sortOrder: 10,
  },
];

const dedupeOrdered = (values: readonly string[]): string[] => {
  const seen = new Set<string>();
  const normalized: string[] = [];

  for (const value of values) {
    const trimmed = value.trim();
    if (!trimmed || seen.has(trimmed)) {
      continue;
    }
    seen.add(trimmed);
    normalized.push(trimmed);
  }

  return normalized;
};

const LESSON_LIBRARY_COMPONENT_ORDER = KANGUR_LESSON_COMPONENT_OPTIONS.map(
  (option) => option.value
);

const buildLessonLibraryFragments = (): KangurPageContentFragment[] =>
  LESSON_LIBRARY_COMPONENT_ORDER.map((componentId, index) => {
    const lesson = KANGUR_LESSON_LIBRARY[componentId];
    const detail =
      LESSON_LIBRARY_FRAGMENT_DETAILS[componentId] ??
      ({
        explanation: lesson.description,
        triggerPhrases: [],
        aliases: [],
      } satisfies {
        explanation: string;
        triggerPhrases: string[];
        aliases?: string[];
      });
    const normalizedComponentId = componentId.replace(/_/g, ' ');

    return {
      id: `lesson:${componentId}`,
      text: lesson.title,
      aliases: dedupeOrdered([
        lesson.description,
        lesson.label,
        ...(detail.aliases ?? []),
      ]),
      explanation: detail.explanation,
      nativeGuideIds: [],
      triggerPhrases: dedupeOrdered([
        lesson.title,
        lesson.description,
        normalizedComponentId,
        ...detail.triggerPhrases,
      ]),
      enabled: true,
      sortOrder: (index + 1) * 10,
    };
  });

const buildKangurTestQuestionFragments = (): KangurPageContentFragment[] =>
  KANGUR_TEST_QUESTION_FRAGMENTS.map((fragment) => ({
    ...fragment,
    aliases: dedupeOrdered(fragment.aliases ?? []),
    nativeGuideIds: dedupeOrdered(fragment.nativeGuideIds ?? []),
    triggerPhrases: dedupeOrdered(fragment.triggerPhrases ?? []),
  }));

const PAGE_CONTENT_FRAGMENT_BUILDERS: Partial<
  Record<string, () => KangurPageContentFragment[]>
> = {
  'lessons-library': buildLessonLibraryFragments,
  'tests-question': buildKangurTestQuestionFragments,
  'game-kangur-session': buildKangurTestQuestionFragments,
};

const toRouteFromPageKey = (pageKey: KangurPageContentPageKey): string => {
  if (pageKey === 'Login' || pageKey === 'SharedChrome') {
    return KANGUR_HOME_ROUTE;
  }

  if (pageKey === 'Tests') {
    return '/tests';
  }

  const slug = getKangurPageSlug(pageKey).trim().replace(/^\/+/, '');
  return slug.length > 0 ? `/${slug}` : KANGUR_HOME_ROUTE;
};

const nativeGuideById = new Map(
  DEFAULT_KANGUR_AI_TUTOR_NATIVE_GUIDE_STORE.entries.map((entry) => [entry.id, entry] as const)
);

const buildSummary = (
  entry: KangurAiTutorPageCoverageEntry,
  linkedGuideIds: readonly string[]
): string => {
  for (const guideId of linkedGuideIds) {
    const guide = nativeGuideById.get(guideId);
    if (guide?.shortDescription) {
      return guide.shortDescription;
    }
  }

  return entry.notes;
};

const buildBody = (
  entry: KangurAiTutorPageCoverageEntry,
  linkedGuideIds: readonly string[]
): string => {
  const parts: string[] = [entry.notes];

  for (const guideId of linkedGuideIds) {
    const guide = nativeGuideById.get(guideId);
    if (!guide) {
      continue;
    }

    parts.push(`${guide.title}. ${guide.fullDescription}`);

    if (guide.hints.length > 0) {
      parts.push(`Wskazówki: ${guide.hints.join(' ')}`);
    }
  }

  return dedupeOrdered(parts).join('\n\n');
};

const buildTriggerPhrases = (
  entry: KangurAiTutorPageCoverageEntry,
  linkedGuideIds: readonly string[]
): string[] =>
  dedupeOrdered([
    entry.title,
    entry.componentId.replace(/[-_]+/g, ' '),
    ...linkedGuideIds.flatMap((guideId) => nativeGuideById.get(guideId)?.triggerPhrases ?? []),
  ]);

const buildTags = (
  entry: KangurAiTutorPageCoverageEntry,
  linkedGuideIds: readonly string[]
): string[] =>
  dedupeOrdered([
    'page-content',
    'section',
    entry.pageKey.toLowerCase(),
    entry.screenKey.toLowerCase(),
    entry.componentId,
    entry.widget,
    ...(entry.surface ? [entry.surface] : []),
    ...(entry.focusKind ? [entry.focusKind] : []),
    ...linkedGuideIds,
  ]);

const buildSectionEntry = (
  entry: KangurAiTutorPageCoverageEntry,
  index: number
): KangurPageContentEntry => {
  const linkedGuideIds = entry.currentKnowledgeEntryIds;
  const copyOverride = PAGE_CONTENT_COPY_OVERRIDES[entry.id];

  return {
    id: entry.id,
    pageKey: entry.pageKey,
    screenKey: entry.screenKey,
    surface: entry.surface,
    route: toRouteFromPageKey(entry.pageKey),
    componentId: entry.componentId,
    widget: entry.widget,
    sourcePath: entry.sourcePath,
    title: copyOverride?.title ?? entry.title,
    summary: copyOverride?.summary ?? buildSummary(entry, linkedGuideIds),
    body: buildBody(entry, linkedGuideIds),
    anchorIdPrefix: entry.anchorIdPrefix,
    focusKind: entry.focusKind,
    contentIdPrefixes: [...entry.contentIdPrefixes],
    nativeGuideIds: [...linkedGuideIds],
    triggerPhrases: buildTriggerPhrases(entry, linkedGuideIds),
    tags: buildTags(entry, linkedGuideIds),
    fragments: PAGE_CONTENT_FRAGMENT_BUILDERS[entry.id]?.() ?? [],
    notes: entry.notes,
    enabled: true,
    sortOrder: index * 10,
  };
};

export const buildDefaultKangurPageContentStore = (locale = 'pl'): KangurPageContentStore =>
  kangurPageContentStoreSchema.parse(
    repairKangurPolishCopy({
      locale,
      version: KANGUR_PAGE_CONTENT_VERSION,
      entries: KANGUR_AI_TUTOR_PAGE_COVERAGE_READY_FOR_MONGO.map(buildSectionEntry),
    })
  );

export const DEFAULT_KANGUR_PAGE_CONTENT_STORE: Readonly<KangurPageContentStore> = Object.freeze(
  buildDefaultKangurPageContentStore('pl')
);
