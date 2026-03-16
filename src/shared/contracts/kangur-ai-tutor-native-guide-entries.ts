import type { KangurAiTutorNativeGuideEntry } from './kangur-ai-tutor-native-guide';
import type {
  KangurAiTutorFocusKind,
  KangurAiTutorFollowUpAction,
  KangurAiTutorSurface,
} from './kangur-ai-tutor';
import { KANGUR_NATIVE_GUIDE_ENTRIES_AUTH } from './kangur-ai-tutor-native-guide-entries.auth';

const createGuideEntry = (input: {
  id: string;
  surface?: KangurAiTutorSurface | null;
  focusKind?: KangurAiTutorFocusKind | null;
  focusIdPrefixes?: string[];
  contentIdPrefixes?: string[];
  title: string;
  shortDescription: string;
  fullDescription: string;
  hints?: string[];
  relatedGames?: string[];
  relatedTests?: string[];
  followUpActions?: KangurAiTutorFollowUpAction[];
  triggerPhrases?: string[];
  enabled?: boolean;
  sortOrder?: number;
}): KangurAiTutorNativeGuideEntry => ({
  surface: null,
  focusKind: null,
  focusIdPrefixes: [],
  contentIdPrefixes: [],
  hints: [],
  relatedGames: [],
  relatedTests: [],
  followUpActions: [],
  triggerPhrases: [],
  enabled: true,
  sortOrder: 0,
  ...input,
});

export const KANGUR_NATIVE_GUIDE_ENTRIES: KangurAiTutorNativeGuideEntry[] = [
  createGuideEntry({
    id: 'lesson-overview',
    surface: 'lesson',
    contentIdPrefixes: ['lesson-', 'lesson:list'],
    title: 'Ekran lekcji',
    shortDescription: 'To tutaj uczeń przechodzi przez temat krok po kroku.',
    fullDescription:
      'Ekran lekcji prowadzi ucznia przez jeden temat matematyczny lub logiczny. Zawiera wprowadzenie, główną treść, przykłady, aktywności i krótkie sprawdzenie rozumienia. To najlepsze miejsce, gdy trzeba najpierw zrozumieć temat, a dopiero potem przejść do treningu.',
    hints: [
      'Najpierw przeczytaj nagłówek i opis lekcji, aby wiedzieć, czego dotyczy materiał.',
      'Potem przejdź przez dokument lub aktywność po kolei, bez przeskakiwania między blokami.',
      'Gdy temat zacznie być jasny, dopiero wtedy przejdź do gry lub kolejnej próby.',
    ],
    relatedGames: ['Szybki trening działań', 'Powtórka po lekcji'],
    relatedTests: ['Sprawdzenie po zakończonej lekcji'],
    followUpActions: [
      { id: 'lesson-open-library', label: 'Otwórz lekcje', page: 'Lessons' },
      { id: 'lesson-open-training', label: 'Przejdź do gry', page: 'Game' },
    ],
    triggerPhrases: [
      'lekcja',
      'ekran lekcji',
      'co mogę tutaj zrobić',
      'jak działa ta lekcja',
      'na czym polega ta lekcja',
    ],
    sortOrder: 10,
  }),
  createGuideEntry({
    id: 'lesson-header',
    surface: 'lesson',
    focusKind: 'lesson_header',
    focusIdPrefixes: ['kangur-lesson-header'],
    title: 'Nagłówek lekcji',
    shortDescription: 'Nagłówek pokazuje temat, poziom i główny cel tej lekcji.',
    fullDescription:
      'Nagłówek lekcji zbiera najważniejsze informacje o aktualnym materiale: tytuł, opis i punkt startowy. Dzięki temu uczeń od razu widzi, czego będzie się uczył i jaki rodzaj ćwiczeń pojawi się dalej.',
    hints: [
      'Zacznij od przeczytania opisu pod tytułem.',
      'Jeśli temat brzmi nowo, przechodź dalej wolniej i sprawdzaj przykłady.',
    ],
    followUpActions: [{ id: 'lesson-header-open', label: 'Wróć do lekcji', page: 'Lessons' }],
    triggerPhrases: ['nagłówek', 'tytuł lekcji', 'opis lekcji', 'o czym jest ta lekcja'],
    sortOrder: 20,
  }),
  createGuideEntry({
    id: 'lesson-document',
    surface: 'lesson',
    focusKind: 'document',
    focusIdPrefixes: ['kangur-lesson-document'],
    title: 'Główna treść lekcji',
    shortDescription: 'To główny materiał z objaśnieniami, obrazami i przykładami.',
    fullDescription:
      'Główna treść lekcji zawiera wyjaśnienia tematu, ilustracje, przykłady i kroki rozwiązywania. To sekcja do spokojnego czytania i zrozumienia zasad, zanim uczeń zacznie szybciej odpowiadać w grze albo teście.',
    hints: [
      'Czytaj po jednym bloku i zatrzymuj się po każdym przykładzie.',
      'Jeśli jest rysunek lub ilustracja, połącz ją z tym, co jest napisane obok.',
      'Po każdej części warto spróbować własnymi słowami powiedzieć, o co chodzi.',
    ],
    relatedGames: ['Trening po przeczytaniu lekcji'],
    followUpActions: [{ id: 'lesson-document-open', label: 'Czytaj dalej', page: 'Lessons' }],
    triggerPhrases: ['dokument', 'główna treść', 'sekcja z materiałem', 'wyjaśnij tę sekcję'],
    sortOrder: 30,
  }),
  createGuideEntry({
    id: 'lesson-assignment',
    surface: 'lesson',
    focusKind: 'assignment',
    focusIdPrefixes: ['kangur-lesson-assignment'],
    title: 'Zadanie powiązane z lekcją',
    shortDescription: 'To szybki most między lekcją a praktyką.',
    fullDescription:
      'Sekcja zadania pokazuje, jaka praktyka jest powiązana z tą lekcją. Może prowadzić do dalszej części materiału albo do treningu w grze. Jej rola to zamienić teorię z lekcji na konkretny następny krok.',
    hints: [
      'Najpierw zakończ bieżący fragment lekcji, potem przejdź do zadania.',
      'Jeśli zadanie prowadzi do gry, skup się na dokładności, a nie tylko na tempie.',
    ],
    followUpActions: [{ id: 'lesson-assignment-game', label: 'Uruchom trening', page: 'Game' }],
    triggerPhrases: ['zadanie', 'co dalej po lekcji', 'następny krok po lekcji'],
    sortOrder: 40,
  }),
  createGuideEntry({
    id: 'lesson-list-intro',
    surface: 'lesson',
    focusKind: 'hero',
    focusIdPrefixes: ['kangur-lessons-list-intro'],
    contentIdPrefixes: ['lesson:list'],
    title: 'Wprowadzenie do lekcji',
    shortDescription: 'To karta startowa, która wyjaśnia, jak korzystać z biblioteki lekcji.',
    fullDescription:
      'Wprowadzenie do lekcji ustawia ucznia przed wyborem tematu. Pokazuje, że tutaj wybiera się obszar do nauki i przechodzi od razu do praktyki lub powtórki. To dobre miejsce, gdy trzeba zrozumieć, po co są lekcje i jak rozpocząć kolejny temat.',
    hints: [
      'Najpierw przeczytaj opis pod tytułem, żeby wiedzieć, czego dotyczy ten ekran.',
      'Potem wybierz jeden temat z biblioteki zamiast przeskakiwać między wieloma lekcjami naraz.',
    ],
    followUpActions: [{ id: 'lesson-list-intro-open', label: 'Przeglądaj lekcje', page: 'Lessons' }],
    triggerPhrases: ['lekcje', 'biblioteka lekcji', 'jak zacząć lekcje', 'ekran lekcji start'],
    sortOrder: 45,
  }),
  createGuideEntry({
    id: 'lesson-library',
    surface: 'lesson',
    focusKind: 'library',
    focusIdPrefixes: ['kangur-lessons-library'],
    contentIdPrefixes: ['lesson:list'],
    title: 'Biblioteka lekcji',
    shortDescription: 'To lista tematów, z której wybierasz następna lekcje do przerobienia.',
    fullDescription:
      'Biblioteka lekcji zbiera wszystkie aktywne tematy i pokazuje, które z nich są najważniejsze teraz. Na kartach widać poziom opanowania, priorytety od rodzica i dodatkowe oznaczenia, dzięki czemu łatwiej zdecydować, od czego zacząć.',
    hints: [
      'Zacznij od tematu z najwyższym priorytetem albo najsłabszym opanowaniem.',
      'Nie wybieraj losowo. Najwięcej zyskasz, gdy karta lekcji pasuje do tego, co było ćwiczone ostatnio.',
    ],
    followUpActions: [{ id: 'lesson-library-open', label: 'Wybierz temat', page: 'Lessons' }],
    triggerPhrases: ['lista lekcji', 'biblioteka', 'karty lekcji', 'która lekcje wybrać'],
    sortOrder: 46,
  }),
  createGuideEntry({
    id: 'lesson-topic-clock',
    surface: 'lesson',
    contentIdPrefixes: ['kangur-lesson-clock', 'lesson-clock'],
    title: 'Lekcja: Nauka zegara',
    shortDescription: 'Uczy odczytywania godzin i minut na zegarze analogowym.',
    fullDescription:
      'Lekcja Nauka zegara prowadzi przez wskazówki, pełne godziny, połówki i kwadranse. Uczeń ćwiczy łączenie położenia wskazówek z zapisem czasu i planem dnia.',
    hints: [
      'Najpierw rozpoznaj długą wskazówkę minutową, potem krótką godzinową.',
      'Ćwicz różnicę między pełną godziną, połówką i kwadransem.',
      'Po przykładzie wypowiedz czas na głos, aby go utrwalić.',
    ],
    followUpActions: [
      { id: 'lesson-topic-clock-open', label: 'Wróć do lekcji', page: 'Lessons' },
      { id: 'lesson-topic-clock-game', label: 'Przejdź do gry', page: 'Game' },
    ],
    triggerPhrases: ['nauka zegara', 'zegar', 'godziny', 'minuty', 'kwadrans', 'czas'],
    sortOrder: 46,
  }),
  createGuideEntry({
    id: 'lesson-topic-calendar',
    surface: 'lesson',
    contentIdPrefixes: ['kangur-lesson-calendar', 'lesson-calendar'],
    title: 'Lekcja: Nauka kalendarza',
    shortDescription: 'Uczy dni tygodnia, miesięcy, dat i planowania czasu.',
    fullDescription:
      'Lekcja kalendarza pomaga rozumieć dni tygodnia, miesiące, daty oraz pory roku. Uczeń ćwiczy liczenie odstępów czasu i planowanie wydarzeń.',
    hints: [
      'Najpierw nazwij dzień tygodnia, a potem sprawdź numer daty.',
      'Ćwicz liczenie "za ile dni" krok po kroku.',
      'Zwróć uwagę, ile dni ma dany miesiąc.',
    ],
    followUpActions: [
      { id: 'lesson-topic-calendar-open', label: 'Wróć do lekcji', page: 'Lessons' },
      { id: 'lesson-topic-calendar-game', label: 'Przejdź do gry', page: 'Game' },
    ],
    triggerPhrases: ['kalendarz', 'dni tygodnia', 'miesiące', 'daty', 'pory roku'],
    sortOrder: 46,
  }),
  createGuideEntry({
    id: 'lesson-topic-adding',
    surface: 'lesson',
    contentIdPrefixes: ['kangur-lesson-adding', 'lesson-adding'],
    title: 'Lekcja: Dodawanie',
    shortDescription: 'Dodawanie jednocyfrowe i dwucyfrowe, także z przejściem przez dziesiątkę.',
    fullDescription:
      'Lekcja dodawania ćwiczy sumowanie w pamięci i na papierze, w tym przejście przez dziesiątkę. Uczeń poznaje strategie łączenia liczb, rozbijania składników i sprawdzania wyniku.',
    hints: [
      'Rozbij większą liczbę tak, aby dopełnić do 10.',
      'Najpierw dodaj dziesiątki, potem jedności.',
      'Sprawdzaj wynik odejmowaniem.',
    ],
    relatedGames: ['Dodawanie', 'Szybki trening działań'],
    followUpActions: [
      { id: 'lesson-topic-adding-open', label: 'Wróć do lekcji', page: 'Lessons' },
      { id: 'lesson-topic-adding-game', label: 'Przejdź do gry', page: 'Game' },
    ],
    triggerPhrases: ['dodawanie', 'suma', 'plus', 'dodaj', 'przejście przez dziesiątkę'],
    sortOrder: 46,
  }),
  createGuideEntry({
    id: 'lesson-topic-subtracting',
    surface: 'lesson',
    contentIdPrefixes: ['kangur-lesson-subtracting', 'lesson-subtracting'],
    title: 'Lekcja: Odejmowanie',
    shortDescription: 'Odejmowanie jednocyfrowe i dwucyfrowe, także z pożyczaniem.',
    fullDescription:
      'Lekcja odejmowania uczy liczyć różnicę oraz pracować z pożyczaniem w zapisie pisemnym. Uczeń kontroluje wynik przez dodawanie i porównywanie liczb.',
    hints: [
      'Najpierw odejmij dziesiątki, potem jedności.',
      'Gdy brakuje jedności, pożycz jedną dziesiątkę.',
      'Sprawdzaj wynik dodawaniem.',
    ],
    relatedGames: ['Odejmowanie', 'Szybki trening działań'],
    followUpActions: [
      { id: 'lesson-topic-subtracting-open', label: 'Wróć do lekcji', page: 'Lessons' },
      { id: 'lesson-topic-subtracting-game', label: 'Przejdź do gry', page: 'Game' },
    ],
    triggerPhrases: ['odejmowanie', 'różnica', 'minus', 'odejmij', 'pożyczanie'],
    sortOrder: 46,
  }),
  createGuideEntry({
    id: 'lesson-topic-multiplication',
    surface: 'lesson',
    contentIdPrefixes: ['kangur-lesson-multiplication', 'lesson-multiplication'],
    title: 'Lekcja: Mnożenie',
    shortDescription: 'Tabliczka mnożenia i rozumienie mnożenia jako grupowania.',
    fullDescription:
      'Lekcja mnożenia utrwala tabliczkę mnożenia i pokazuje, że mnożenie to powtarzające się dodawanie. Uczeń buduje automatyzm i uczy się sprawdzać wynik przez dzielenie.',
    hints: [
      'Myśl o grupach: 3 × 4 to 4 + 4 + 4.',
      'Zapamiętuj krótkie fakty, a potem łącz je w większe.',
      'Sprawdzaj wynik dzieleniem.',
    ],
    relatedGames: ['Mnożenie', 'Szybki trening działań'],
    followUpActions: [
      { id: 'lesson-topic-multiplication-open', label: 'Wróć do lekcji', page: 'Lessons' },
      { id: 'lesson-topic-multiplication-game', label: 'Przejdź do gry', page: 'Game' },
    ],
    triggerPhrases: ['mnożenie', 'iloczyn', 'tabliczka mnożenia', 'razy', 'mnożyć'],
    sortOrder: 46,
  }),
  createGuideEntry({
    id: 'lesson-topic-division',
    surface: 'lesson',
    contentIdPrefixes: ['kangur-lesson-division', 'lesson-division'],
    title: 'Lekcja: Dzielenie',
    shortDescription: 'Dzielenie na równe części, także z resztą.',
    fullDescription:
      'Lekcja dzielenia uczy rozkładania na równe grupy i rozpoznawania reszty. Pokazuje związek między dzieleniem a mnożeniem oraz sposoby sprawdzania wyniku.',
    hints: [
      'Najpierw podziel na równe grupy.',
      'Jeśli zostaje reszta, nazwij ją i zapisz.',
      'Sprawdzaj wynik mnożeniem.',
    ],
    relatedGames: ['Dzielenie', 'Szybki trening działań'],
    followUpActions: [
      { id: 'lesson-topic-division-open', label: 'Wróć do lekcji', page: 'Lessons' },
      { id: 'lesson-topic-division-game', label: 'Przejdź do gry', page: 'Game' },
    ],
    triggerPhrases: ['dzielenie', 'iloraz', 'reszta', 'podziel', 'dzielić'],
    sortOrder: 46,
  }),
  createGuideEntry({
    id: 'lesson-topic-geometry-basics',
    surface: 'lesson',
    contentIdPrefixes: ['kangur-lesson-geometry_basics', 'lesson-geometry_basics'],
    title: 'Lekcja: Podstawy geometrii',
    shortDescription: 'Wprowadza pojęcia: punkt, odcinek, prosta, bok i kąt.',
    fullDescription:
      'Lekcja podstaw geometrii uczy rozpoznawać i nazywać elementy figur. To fundament potrzebny do dalszych tematów, takich jak figury, symetria i obwód.',
    hints: [
      'Nazwij elementy na rysunku, zanim zaczniesz liczyć.',
      'Sprawdź różnicę między prostą a odcinkiem.',
      'Zwracaj uwagę na wierzchołek kąta.',
    ],
    followUpActions: [
      { id: 'lesson-topic-geometry-basics-open', label: 'Wróć do lekcji', page: 'Lessons' },
      { id: 'lesson-topic-geometry-basics-game', label: 'Przejdź do gry', page: 'Game' },
    ],
    triggerPhrases: ['podstawy geometrii', 'punkt', 'odcinek', 'prosta', 'kąt', 'bok'],
    sortOrder: 46,
  }),
  createGuideEntry({
    id: 'lesson-topic-geometry-shapes',
    surface: 'lesson',
    contentIdPrefixes: ['kangur-lesson-geometry_shapes', 'lesson-geometry_shapes'],
    title: 'Lekcja: Figury geometryczne',
    shortDescription: 'Rozpoznawanie i nazywanie figur oraz ich cech.',
    fullDescription:
      'Lekcja figur geometrycznych uczy cech trójkąta, kwadratu, prostokąta i koła. Uczeń ćwiczy liczenie boków i kątów oraz rozpoznawanie figur w różnych ułożeniach.',
    hints: [
      'Policz boki i kąty, zanim wybierzesz odpowiedź.',
      'Sprawdź, czy wszystkie boki są równe.',
      'Pamiętaj, że obrót figury nie zmienia jej nazwy.',
    ],
    followUpActions: [
      { id: 'lesson-topic-geometry-shapes-open', label: 'Wróć do lekcji', page: 'Lessons' },
      { id: 'lesson-topic-geometry-shapes-game', label: 'Przejdź do gry', page: 'Game' },
    ],
    triggerPhrases: ['figury', 'kształty', 'trójkąt', 'kwadrat', 'prostokąt', 'koło'],
    sortOrder: 46,
  }),
  createGuideEntry({
    id: 'lesson-topic-geometry-symmetry',
    surface: 'lesson',
    contentIdPrefixes: ['kangur-lesson-geometry_symmetry', 'lesson-geometry_symmetry'],
    title: 'Lekcja: Symetria',
    shortDescription: 'Oś symetrii i odbicia lustrzane w figurach.',
    fullDescription:
      'Lekcja symetrii uczy znajdowania osi symetrii i rozpoznawania odbić lustrzanych. Uczeń ćwiczy, czy obie strony są równe i jak dorysować brakującą połowę.',
    hints: [
      'Wyobraź sobie lustro ustawione na osi symetrii.',
      'Sprawdź, czy odległości po obu stronach osi są równe.',
      'Rysuj oś przez środek figury, gdy to możliwe.',
    ],
    followUpActions: [
      { id: 'lesson-topic-geometry-symmetry-open', label: 'Wróć do lekcji', page: 'Lessons' },
      { id: 'lesson-topic-geometry-symmetry-game', label: 'Przejdź do gry', page: 'Game' },
    ],
    triggerPhrases: ['symetria', 'oś symetrii', 'odbicie', 'lustro', 'symetryczny'],
    sortOrder: 46,
  }),
  createGuideEntry({
    id: 'lesson-topic-geometry-perimeter',
    surface: 'lesson',
    contentIdPrefixes: ['kangur-lesson-geometry_perimeter', 'lesson-geometry_perimeter'],
    title: 'Lekcja: Obwód figur',
    shortDescription: 'Liczenie obwodu jako sumy długości boków.',
    fullDescription:
      'Lekcja obwodu uczy dodawania długości wszystkich boków figury. Uczeń pilnuje jednostek i uczy się szybszych sposobów liczenia, gdy boki są równe.',
    hints: [
      'Dodawaj boki po kolei i zapisuj wynik z jednostką.',
      'Jeśli boki są równe, możesz użyć mnożenia.',
      'Sprawdź, czy wszystkie długości zostały uwzględnione.',
    ],
    followUpActions: [
      { id: 'lesson-topic-geometry-perimeter-open', label: 'Wróć do lekcji', page: 'Lessons' },
      { id: 'lesson-topic-geometry-perimeter-game', label: 'Przejdź do gry', page: 'Game' },
    ],
    triggerPhrases: ['obwód', 'perymetr', 'długość boków', 'liczenie obwodu'],
    sortOrder: 46,
  }),
  createGuideEntry({
    id: 'lesson-topic-logical-thinking',
    surface: 'lesson',
    contentIdPrefixes: ['kangur-lesson-logical_thinking', 'lesson-logical_thinking'],
    title: 'Lekcja: Myślenie logiczne',
    shortDescription: 'Wprowadzenie do reguł, wzorców, klasyfikacji i analogii.',
    fullDescription:
      'Lekcja myślenia logicznego uczy patrzeć na zadania krok po kroku i szukać reguł. To baza do późniejszych zadań z wnioskowania i analogii.',
    hints: [
      'Najpierw poszukaj reguły, a dopiero potem zgaduj.',
      'Sprawdź, czy elementy mają wspólne cechy.',
      'Wyjaśnij własnymi słowami, dlaczego rozwiązanie pasuje.',
    ],
    followUpActions: [
      { id: 'lesson-topic-logical-thinking-open', label: 'Wróć do lekcji', page: 'Lessons' },
      { id: 'lesson-topic-logical-thinking-game', label: 'Przejdź do gry', page: 'Game' },
    ],
    triggerPhrases: ['myślenie logiczne', 'logika', 'reguła', 'wzorce', 'analogie'],
    sortOrder: 46,
  }),
  createGuideEntry({
    id: 'lesson-topic-logical-patterns',
    surface: 'lesson',
    contentIdPrefixes: ['kangur-lesson-logical_patterns', 'lesson-logical_patterns'],
    title: 'Lekcja: Wzorce i ciągi',
    shortDescription: 'Rozpoznawanie reguł w sekwencjach i przewidywanie kolejnych elementów.',
    fullDescription:
      'Lekcja wzorców i ciągów uczy odnajdywać regułę w sekwencjach liczb, kształtów lub kolorów. Uczeń ćwiczy przewidywanie kolejnego elementu i sprawdzanie własnej reguły.',
    hints: [
      'Sprawdź różnice między kolejnymi elementami.',
      'Szukaj powtarzających się układów.',
      'Zapisz regułę jednym zdaniem.',
    ],
    followUpActions: [
      { id: 'lesson-topic-logical-patterns-open', label: 'Wróć do lekcji', page: 'Lessons' },
      { id: 'lesson-topic-logical-patterns-game', label: 'Przejdź do gry', page: 'Game' },
    ],
    triggerPhrases: ['wzorce', 'ciągi', 'sekwencje', 'reguła', 'schemat'],
    sortOrder: 46,
  }),
  createGuideEntry({
    id: 'lesson-topic-logical-classification',
    surface: 'lesson',
    contentIdPrefixes: ['kangur-lesson-logical_classification', 'lesson-logical_classification'],
    title: 'Lekcja: Klasyfikacja',
    shortDescription: 'Grupowanie po cechach i znajdowanie elementu niepasującego.',
    fullDescription:
      'Lekcja klasyfikacji uczy porządkowania obiektów według cech i wskazywania intruza. Rozwija umiejętność porównywania i budowania kategorii.',
    hints: [
      'Wypisz cechy wspólne, zanim wybierzesz intruza.',
      'Sprawdź, co się różni w każdej grupie.',
      'Najpierw grupuj, potem wybieraj.',
    ],
    followUpActions: [
      { id: 'lesson-topic-logical-classification-open', label: 'Wróć do lekcji', page: 'Lessons' },
      { id: 'lesson-topic-logical-classification-game', label: 'Przejdź do gry', page: 'Game' },
    ],
    triggerPhrases: ['klasyfikacja', 'sortowanie', 'grupowanie', 'intruzi', 'kategorie'],
    sortOrder: 46,
  }),
  createGuideEntry({
    id: 'lesson-topic-logical-reasoning',
    surface: 'lesson',
    contentIdPrefixes: ['kangur-lesson-logical_reasoning', 'lesson-logical_reasoning'],
    title: 'Lekcja: Wnioskowanie',
    shortDescription: 'Jeśli... to... i łączenie faktów w poprawny tok rozumowania.',
    fullDescription:
      'Lekcja wnioskowania ćwiczy logiczne kroki: od faktów do wniosku. Pomaga budować poprawny tok rozumowania i unikać zgadywania.',
    hints: [
      'Zapisz znane fakty, zanim wyciągniesz wniosek.',
      'Sprawdź, co wynika z każdego zdania.',
      'Nie pomijaj pośrednich kroków.',
    ],
    followUpActions: [
      { id: 'lesson-topic-logical-reasoning-open', label: 'Wróć do lekcji', page: 'Lessons' },
      { id: 'lesson-topic-logical-reasoning-game', label: 'Przejdź do gry', page: 'Game' },
    ],
    triggerPhrases: ['wnioskowanie', 'jeśli to', 'wniosek', 'przyczyna i skutek'],
    sortOrder: 46,
  }),
  createGuideEntry({
    id: 'lesson-topic-logical-analogies',
    surface: 'lesson',
    contentIdPrefixes: ['kangur-lesson-logical_analogies', 'lesson-logical_analogies'],
    title: 'Lekcja: Analogie',
    shortDescription: 'Relacje typu A:B = C:? i szukanie podobnych zależności.',
    fullDescription:
      'Lekcja analogii uczy rozpoznawać relacje między pojęciami i przenosić je na nowy przykład. Pomaga porównywać funkcje, a nie tylko wygląd.',
    hints: [
      'Najpierw nazwij relację między pierwszą parą.',
      'Sprawdź, czy druga para ma tę samą relację.',
      'Unikaj mylenia podobieństwa z relacją.',
    ],
    followUpActions: [
      { id: 'lesson-topic-logical-analogies-open', label: 'Wróć do lekcji', page: 'Lessons' },
      { id: 'lesson-topic-logical-analogies-game', label: 'Przejdź do gry', page: 'Game' },
    ],
    triggerPhrases: ['analogie', 'porównania', 'relacje', 'A do B', 'A:B=C:?'],
    sortOrder: 46,
  }),
  createGuideEntry({
    id: 'lesson-empty-state',
    surface: 'lesson',
    focusKind: 'empty_state',
    focusIdPrefixes: ['kangur-lessons-list-empty-state', 'kangur-lesson-empty-document'],
    contentIdPrefixes: ['lesson:list'],
    title: 'Brak dostępnej zawartości lekcji',
    shortDescription:
      'Ten komunikat pokazuje, że w tym miejscu nie ma jeszcze aktywnej treści do przerobienia.',
    fullDescription:
      'Pusty stan lekcji nie oznacza błędu ucznia. Informuje tylko, że nie ma jeszcze aktywnych lekcji albo dokument dla tej lekcji nie został zapisany. Tutor może wtedy wskazać, czy trzeba wrócić do listy tematów, czy poczekać na uzupełnienie materiału.',
    hints: [
      'Sprawdź, czy są inne aktywne tematy na liście lekcji.',
      'Jeśli to pusta treść dokumentu, najlepszy ruch to wrócić do innej lekcji lub treningu.',
    ],
    followUpActions: [
      { id: 'lesson-empty-state-open-list', label: 'Wróć do listy', page: 'Lessons' },
      { id: 'lesson-empty-state-open-game', label: 'Przejdź do gry', page: 'Game' },
    ],
    triggerPhrases: ['brak aktywnych lekcji', 'pusta lekcja', 'nie ma treści', 'dlaczego nic tu nie ma'],
    sortOrder: 47,
  }),
  createGuideEntry({
    id: 'lesson-screen',
    surface: 'lesson',
    focusKind: 'screen',
    focusIdPrefixes: ['kangur-lesson-screen-secret'],
    contentIdPrefixes: ['lesson-'],
    title: 'Specjalna plansza lekcji',
    shortDescription:
      'To dodatkowa plansza lekcji, która wyjaśnia szczególny stan albo ukryte zakończenie.',
    fullDescription:
      'Specjalna plansza lekcji pojawia się zamiast zwykłej treści, gdy uczeń trafia do szczególnego stanu, na przykład ukrytego finiszu. To miejsce bardziej podsumowuje drogę przez temat i pokazuje, co zostało odblokowane, niż prowadzi przez nowy materiał krok po kroku.',
    hints: [
      'Przeczytaj ten panel jak nagrodę albo specjalne zakończenie, a nie jak kolejny rozdział z teorią.',
      'Po obejrzeniu planszy wróć do listy lekcji albo przejdź do treningu, by utrwalić cały cykl.',
    ],
    followUpActions: [
      { id: 'lesson-screen-open-list', label: 'Wróć do lekcji', page: 'Lessons' },
      { id: 'lesson-screen-open-game', label: 'Przejdź do gry', page: 'Game' },
    ],
    triggerPhrases: ['specjalna plansza', 'ukryty finisz', 'co oznacza ten panel', 'sekret odblokowany'],
    sortOrder: 48,
  }),
  createGuideEntry({
    id: 'lesson-navigation',
    surface: 'lesson',
    focusKind: 'navigation',
    focusIdPrefixes: ['kangur-lesson-navigation'],
    contentIdPrefixes: ['lesson-'],
    title: 'Nawigacja lekcji',
    shortDescription:
      'Ta sekcja pomaga przejść do poprzedniej albo następnej lekcji bez wracania do całej listy.',
    fullDescription:
      'Nawigacja lekcji porządkuje ruch po materiale. Uczeń może szybko wracać do poprzedniego tematu albo przechodzić dalej, kiedy aktualna lekcja jest już zrozumiała. To dobry moment, by zatrzymać się i sprawdzić, czy warto iść dalej, czy jeszcze zostać przy obecnym temacie.',
    hints: [
      'Przejdź dalej dopiero wtedy, gdy aktualna lekcja jest już w miarę jasna.',
      'Jeśli temat dalej jest niepewny, zostań jeszcze chwilę na tej lekcji albo wróć do dokumentu.',
    ],
    followUpActions: [{ id: 'lesson-navigation-open', label: 'Przeglądaj lekcje', page: 'Lessons' }],
    triggerPhrases: ['nawigacja lekcji', 'poprzednia lekcja', 'następna lekcja', 'jak przejść dalej'],
    sortOrder: 49,
  }),
  createGuideEntry({
    id: 'shared-progress',
    focusKind: 'progress',
    focusIdPrefixes: ['kangur-game-home-progress'],
    contentIdPrefixes: ['game:home'],
    title: 'Postęp',
    shortDescription: 'Postęp pokazuje, jak regularnie i jak skutecznie uczeń pracuje.',
    fullDescription:
      'Sekcja postępu zbiera informacje o regularności, skuteczności, tempie i zdobytych punktach. Nie służy tylko do patrzenia na wynik. Pomaga zobaczyć, czy uczeń wraca do materiału, czy utrzymuje serię oraz gdzie potrzebuje jeszcze kilku spokojnych powtórek.',
    hints: [
      'Patrz nie tylko na liczbę punktów, ale tez na regularność.',
      'Jeśli postęp zwalnia, najlepszy ruch to krótka powtórka, a nie losowa nowa aktywność.',
      'Regularne krótkie sesje dają stabilniejszy postęp niż pojedyncze długie próby.',
    ],
    followUpActions: [
      { id: 'progress-profile', label: 'Otwórz profil', page: 'LearnerProfile' },
      { id: 'progress-lessons', label: 'Wróć do lekcji', page: 'Lessons' },
    ],
    triggerPhrases: ['postęp', 'jak idzie', 'wyniki postępu', 'co pokazuje postęp'],
    sortOrder: 50,
  }),
  createGuideEntry({
    id: 'shared-leaderboard',
    focusKind: 'leaderboard',
    focusIdPrefixes: ['kangur-game-home-leaderboard'],
    contentIdPrefixes: ['game:home'],
    title: 'Ranking',
    shortDescription: 'Ranking pokazuje wyniki i pozycje na tle innych prób.',
    fullDescription:
      'Ranking służy do lekkiej motywacji i porównania wyników, ale nie jest najważniejszym celem nauki. Największa wartość daje wtedy, gdy pomaga zauważyć postęp, a nie tylko miejsce na liście. To dobry sygnał do obserwowania własnej poprawy, a nie do stresowania się wynikiem innych.',
    hints: [
      'Najpierw patrz na własny postęp, dopiero potem na pozycje.',
      'Lepsza regularna seria spokojnych prób niż jedna szybka próba dla rankingu.',
      'Porównuj się głównie do własnego wyniku z poprzednich dni.',
    ],
    followUpActions: [{ id: 'leaderboard-profile', label: 'Zobacz profil', page: 'LearnerProfile' }],
    triggerPhrases: ['ranking', 'tablica wyników', 'pozycja', 'jak działa ranking'],
    sortOrder: 60,
  }),
  createGuideEntry({
    id: 'shared-home-actions',
    focusKind: 'home_actions',
    focusIdPrefixes: ['kangur-game-home-actions'],
    contentIdPrefixes: ['game:home'],
    title: 'Szybkie akcje',
    shortDescription: 'To skróty do najważniejszych aktywności w Kangur.',
    fullDescription:
      'Szybkie akcje to skróty do startu: lekcje, Grajmy (z treningiem mieszanym i szybkimi quizami), Pojedynki oraz Kangur Matematyczny. Dzięki temu uczeń albo rodzic może od razu wejść w najważniejszy krok bez szukania po całym ekranie. Najlepiej wybrać akcję zgodną z celem: zrozumieć temat w lekcji, utrwalić go w grze albo sprawdzić się w lobby pojedynków.',
    hints: [
      'Użyj tej sekcji, gdy nie wiesz, od czego zacząć.',
      'Gdy potrzebujesz wyjaśnienia, wybierz lekcję. Gdy potrzebujesz praktyki, wybierz grę.',
      'Jeśli masz misję dnia lub zadanie priorytetowe, zacznij właśnie od niego.',
    ],
    followUpActions: [
      { id: 'home-actions-lessons', label: 'Przejdź do lekcji', page: 'Lessons' },
      { id: 'home-actions-game', label: 'Przejdź do gry', page: 'Game' },
    ],
    triggerPhrases: ['szybkie akcje', 'skróty', 'od czego zacząć', 'co mam uruchomić'],
    sortOrder: 70,
  }),
  createGuideEntry({
    id: 'shared-home-quest',
    focusKind: 'home_quest',
    focusIdPrefixes: ['kangur-game-home-quest'],
    contentIdPrefixes: ['game:home'],
    title: 'Misja dnia',
    shortDescription: 'Misja dnia podpowiada jeden mały, konkretny cel na teraz.',
    fullDescription:
      'Misja dnia ogranicza wybór do jednego sensownego celu. Zamiast wielu opcji uczeń dostaje jeden jasny kierunek: dokończyć lekcję, zagrać szybki trening albo wrócić do konkretnego obszaru. Misja jest dobierana na podstawie postępu i zadań, więc często jest najlepszym startem sesji.',
    hints: [
      'Traktuj misję jako jeden mały cel, nie jako długą listę zadań.',
      'Po wykonaniu misji warto sprawdzić postęp albo przejść do lekkiej powtórki.',
      'Jeśli misja jest niejasna, otwórz ją i sprawdź szczegóły kroku.',
    ],
    followUpActions: [
      { id: 'home-quest-lessons', label: 'Realizuj w lekcjach', page: 'Lessons' },
      { id: 'home-quest-game', label: 'Realizuj w grze', page: 'Game' },
    ],
    triggerPhrases: ['misja', 'misja dnia', 'cel na dziś', 'co robi ta misja'],
    sortOrder: 80,
  }),
  createGuideEntry({
    id: 'shared-priority-assignments',
    focusKind: 'priority_assignments',
    focusIdPrefixes: ['kangur-game-home-assignments'],
    contentIdPrefixes: ['game:home'],
    title: 'Priorytetowe zadania',
    shortDescription: 'To najważniejsze rzeczy do zrobienia w tej chwili.',
    fullDescription:
      'Priorytetowe zadania porządkują to, co uczeń powinien wykonać jako pierwsze. Ta sekcja zbiera zaległe, aktywne albo najbardziej potrzebne kroki, często ustawione przez rodzica lub opiekuna, żeby nie trzeba było samemu zgadywać, co teraz da najwięcej korzyści.',
    hints: [
      'Zacznij od pierwszego zadania, nie od najłatwiejszego na oko.',
      'Jeśli zadanie prowadzi do lekcji, najpierw zrozum temat, potem przejdź do gry.',
      'Gdy zadanie jest niejasne, wróć do opisu lekcji albo zapytaj rodzica o cel.',
    ],
    followUpActions: [{ id: 'priority-assignments-open', label: 'Przejdź do lekcji', page: 'Lessons' }],
    triggerPhrases: ['zadania priorytetowe', 'priorytety', 'co mam zrobić najpierw'],
    sortOrder: 90,
  }),
  createGuideEntry({
    id: 'game-overview',
    surface: 'game',
    contentIdPrefixes: ['game:home'],
    title: 'Ekran gry',
    shortDescription: 'Gra służy do szybkiego treningu i utrwalania materiału.',
    fullDescription:
      'Ekran gry jest miejscem na aktywną praktykę. Tutaj uczeń ćwiczy tempo, dokładność i powtarzalność. Gry nie zastępują lekcji, tylko pomagają utrwalić to, co uczeń już zobaczył w materiale lub chce szybciej przepracować.',
    hints: [
      'Najpierw dbaj o poprawne odpowiedzi, dopiero potem o szybkość.',
      'Po kilku słabszych próbach wróć do lekcji albo wybierz łatwiejszy trening.',
      'Krótkie, regularne sesje dają więcej niż jedna bardzo długa próba.',
    ],
    relatedGames: ['Dodawanie', 'Odejmowanie', 'Mnożenie', 'Dzielenie'],
    relatedTests: ['Sprawdzenie po treningu'],
    followUpActions: [
      { id: 'game-open', label: 'Uruchom grę', page: 'Game' },
      { id: 'game-lessons', label: 'Wróć do lekcji', page: 'Lessons' },
    ],
    triggerPhrases: ['gra', 'ekran gry', 'jak działa ta gra', 'na czym polega ta gra'],
    sortOrder: 100,
  }),
  createGuideEntry({
    id: 'game-training-setup',
    surface: 'game',
    focusKind: 'screen',
    focusIdPrefixes: ['kangur-game-training-setup'],
    contentIdPrefixes: ['game:training-setup'],
    title: 'Konfiguracja treningu',
    shortDescription:
      'Tutaj ustawiasz jedną sesję treningową: poziom, kategorie i liczbę pytań.',
    fullDescription:
      'Konfiguracja treningu służy do przygotowania jednej rundy ćwiczeń. Uczeń dobiera trudność, zakres kategorii i liczbę pytań, żeby dopasować tempo do aktualnej formy. To dobre miejsce, gdy trzeba zrobić krótszą, celowaną serię zamiast przechodzić przez cały materiał naraz. Im węższy zakres, tym łatwiej utrzymać dokładność i szybciej zauważyć postęp.',
    hints: [
      'Najpierw wybierz poziom, który pozwoli utrzymać dokładność.',
      'Potem ogranicz kategorie do tego, co uczeń ćwiczy teraz najbardziej.',
      'Na start lepsza jest krótsza seria pytań niż zbyt długa runda bez przerwy.',
      'Jeśli pojawia się dużo błędów, obniż poziom albo zawęź kategorie.',
    ],
    followUpActions: [{ id: 'game-training-setup-open', label: 'Skonfiguruj trening', page: 'Game' }],
    triggerPhrases: [
      'konfiguracja treningu',
      'trening mieszany',
      'ustawienia treningu',
      'dobierz poziom',
      'liczbę pytań',
      'kategorie',
    ],
    sortOrder: 105,
  }),
  createGuideEntry({
    id: 'game-operation-selector',
    surface: 'game',
    focusKind: 'screen',
    focusIdPrefixes: ['kangur-game-operation-selector'],
    contentIdPrefixes: ['game:operation-selector'],
    title: 'Wybór rodzaju gry',
    shortDescription:
      'Tutaj wybierasz rodzaj gry lub szybkie ćwiczenie najlepiej pasujące do celu.',
    fullDescription:
      'Wybór rodzaju gry pomaga zdecydować, czy teraz lepszy będzie trening działań, kalendarz, figury albo inna szybka aktywność. Ta sekcja nie sprawdza jeszcze wyniku. Jej rola to skierować ucznia do rodzaju praktyki, który najlepiej utrwali aktualny temat albo rytm nauki. Warto wracać tutaj zawsze, gdy chcesz zmienić obszar ćwiczeń.',
    hints: [
      'Wybierz aktywność zgodną z tym, co było ostatnio ćwiczone w lekcji.',
      'Jeśli uczeń potrzebuje powtórki podstaw, zacznij od prostszej gry zamiast od trybu konkursowego.',
      'Skup się na jednym rodzaju ćwiczeń naraz, zamiast mieszać kilka obszarów w jednej sesji.',
    ],
    relatedGames: ['Dodawanie', 'Odejmowanie', 'Kalendarz', 'Figury'],
    followUpActions: [{ id: 'game-operation-selector-open', label: 'Wybierz grę', page: 'Game' }],
    triggerPhrases: [
      'wybór rodzaju gry',
      'wybór gry',
      'jaką grę wybrać',
      'rodzaj gry',
      'wybór działania',
    ],
    sortOrder: 106,
  }),
  createGuideEntry({
    id: 'game-kangur-setup',
    surface: 'game',
    focusKind: 'screen',
    focusIdPrefixes: ['kangur-game-kangur-setup'],
    contentIdPrefixes: ['game:kangur:setup'],
    title: 'Konfiguracja sesji Kangura Matematycznego',
    shortDescription:
      'Tutaj wybierasz edycję konkursu i zestaw zadań przed startem sesji.',
    fullDescription:
      'Konfiguracja sesji Kangura Matematycznego przygotowuje bardziej konkursowy tryb pracy. Uczeń wybiera wariant albo pakiet zadań, a potem przechodzi do dłuższych, bardziej problemowych pytań. To dobre miejsce, gdy trzeba poćwiczyć czytanie zadań i spokojniejsze myślenie wieloetapowe.',
    hints: [
      'Wybierz tryb, który odpowiada aktualnemu poziomowi ucznia.',
      'Jeśli uczeń dopiero wraca do tego typu zadań, lepiej zacząć od krótszej serii.',
    ],
    followUpActions: [{ id: 'game-kangur-setup-open', label: 'Przygotuj sesję', page: 'Game' }],
    triggerPhrases: [
      'konfiguracja sesji kangura matematycznego',
      'konfiguracja kangura',
      'edycje konkursu',
      'zestaw zadań',
      'kangur setup',
    ],
    sortOrder: 107,
  }),
  createGuideEntry({
    id: 'game-kangur-session',
    surface: 'game',
    focusKind: 'screen',
    focusIdPrefixes: ['kangur-game-kangur-session'],
    contentIdPrefixes: ['game:kangur:'],
    title: 'Sesja Kangura Matematycznego',
    shortDescription:
      'Tutaj uczeń rozwiązuje zadania w bardziej konkursowym, problemowym stylu.',
    fullDescription:
      'Sesja Kangura Matematycznego to tryb zadań, w którym liczy się uważne czytanie, łączenie kilku informacji i spokojne planowanie rozwiązania. To nie jest tylko szybki trening reakcji. Największa wartość daje zatrzymanie się na treści i sprawdzanie, co dokładnie pyta zadanie.',
    hints: [
      'Czytaj całe zadanie przed ruszeniem z obliczeniami.',
      'Szukaj zależności między warunkami, zamiast liczyć od razu wszystko naraz.',
    ],
    relatedTests: ['Spokojna powtórka po sesji problemowej'],
    followUpActions: [{ id: 'game-kangur-session-open', label: 'Kontynuuj sesję', page: 'Game' }],
    triggerPhrases: [
      'sesja kangura matematycznego',
      'sesja kangura',
      'zadania kangura',
      'tryb konkursowy',
    ],
    sortOrder: 108,
  }),
  createGuideEntry({
    id: 'game-calendar-quiz',
    surface: 'game',
    focusKind: 'screen',
    focusIdPrefixes: ['kangur-game-calendar-quiz'],
    contentIdPrefixes: ['game:calendar_quiz'],
    title: 'Ćwiczenia z kalendarzem',
    shortDescription:
      'Tutaj uczeń ćwiczy daty, dni tygodnia, miesiące i zależności w kalendarzu.',
    fullDescription:
      'Ćwiczenia z kalendarzem utrwalają orientację w datach i czasie. Zadania zwykle wymagają zauważenia kolejności dni, miesięcy albo przesunięć na osi czasu. To dobra aktywność, gdy trzeba połączyć matematykę z codziennym rozumieniem kalendarza.',
    hints: [
      'Najpierw ustal punkt startowy, a potem przesuwaj się dzień po dniu lub tydzień po tygodniu.',
      'Zwracaj uwagę, czy pytanie dotyczy dnia tygodnia, daty czy odstępu czasu.',
    ],
    relatedGames: ['Kalendarz'],
    followUpActions: [{ id: 'game-calendar-open', label: 'Ćwicz kalendarz', page: 'Game' }],
    triggerPhrases: [
      'ćwiczenia z kalendarzem',
      'kalendarz',
      'daty',
      'dni tygodnia',
      'miesiące',
    ],
    sortOrder: 109,
  }),
  createGuideEntry({
    id: 'game-geometry-quiz',
    surface: 'game',
    focusKind: 'screen',
    focusIdPrefixes: ['kangur-game-geometry-quiz'],
    contentIdPrefixes: ['game:geometry_quiz'],
    title: 'Ćwiczenia z figurami',
    shortDescription:
      'Tutaj uczeń rozpoznaje figury i ćwiczy ich właściwości w szybkich zadaniach.',
    fullDescription:
      'Ćwiczenia z figurami pomagają utrwalić nazwy kształtów, ich cechy oraz proste zależności przestrzenne. To dobra sekcja do łączenia patrzenia na rysunek z nazewnictwem i wyobraźnią geometryczną.',
    hints: [
      'Najpierw nazwij figurę albo jej cechę, zanim zaznaczysz odpowiedź.',
      'Jeśli trzeba coś narysować lub rozpoznać, porównaj boki, kąty i osie symetrii.',
    ],
    relatedGames: ['Figury'],
    followUpActions: [{ id: 'game-geometry-open', label: 'Ćwicz figury', page: 'Game' }],
    triggerPhrases: [
      'ćwiczenia z figurami',
      'figury',
      'geometria',
      'ksztalty',
      'rysowanie figur',
    ],
    sortOrder: 110,
  }),
  createGuideEntry({
    id: 'game-assignment',
    surface: 'game',
    focusKind: 'assignment',
    focusIdPrefixes: ['kangur-game-assignment-banner'],
    contentIdPrefixes: ['game:assignment:'],
    title: 'Zadanie treningowe',
    shortDescription:
      'To karta pokazująca, jaki trening jest teraz najważniejszy do wykonania.',
    fullDescription:
      'Zadanie treningowe łączy plan nauki z jedną konkretną rundą gry. Pokazuje, jaki zakres ćwiczeń warto uruchomić teraz, żeby nie wybierać przypadkowej aktywności. To most między ogólnym celem a jednym następnym ruchem w praktyce.',
    hints: [
      'Najpierw uruchom zadanie, które jest aktywne albo najwyżej na liście.',
      'Jeśli po kilku próbach zadanie dalej jest trudne, wróć do lekcji z tego samego tematu.',
    ],
    followUpActions: [
      { id: 'game-assignment-open', label: 'Uruchom zadanie', page: 'Game' },
      { id: 'game-assignment-lessons', label: 'Wróć do lekcji', page: 'Lessons' },
    ],
    triggerPhrases: [
      'zadanie treningowe',
      'aktywne zadanie',
      'przypisane zadanie',
      'co mam teraz ćwiczyć',
    ],
    sortOrder: 112,
  }),
  createGuideEntry({
    id: 'game-question',
    surface: 'game',
    focusKind: 'question',
    focusIdPrefixes: ['kangur-game-question-anchor'],
    contentIdPrefixes: ['game:practice:'],
    title: 'Pytanie w grze',
    shortDescription:
      'To aktualne zadanie do rozwiązania, w którym liczy się tok myślenia, nie samo tempo.',
    fullDescription:
      'Pytanie w grze pokazuje jedną aktywną próbę do rozwiązania. Uczeń powinien najpierw odczytać treść, rozpoznać typ zadania i dopiero potem odpowiedzieć. Tutor może podpowiedzieć, na co patrzeć, ale nie powinien podawać gotowego wyniku zamiast ucznia.',
    hints: [
      'Najpierw nazwij w głowie, jaki to typ zadania: dodawanie, odejmowanie, mnożenie albo inna aktywność.',
      'Jeśli czujesz presję czasu, zwolnij na chwilę i upewnij się, co dokładnie pytanie chce sprawdzić.',
      'Dopiero po zrozumieniu treści przejdź do liczenia albo wyboru odpowiedzi.',
    ],
    relatedGames: ['Dodawanie', 'Odejmowanie', 'Mnożenie', 'Dzielenie'],
    triggerPhrases: [
      'pytanie w grze',
      'aktualne pytanie',
      'jak podejść do tego pytania',
      'co robi to pytanie',
    ],
    sortOrder: 113,
  }),
  createGuideEntry({
    id: 'game-review',
    surface: 'game',
    focusKind: 'review',
    focusIdPrefixes: ['kangur-game-result-summary'],
    contentIdPrefixes: ['game:assignment:', 'game:practice:'],
    title: 'Omówienie wyniku gry',
    shortDescription:
      'To miejsce do zobaczenia, co poszło dobrze i co warto poprawić w kolejnej rundzie.',
    fullDescription:
      'Omówienie wyniku gry pomaga zauważyć wzór po zakończonej rundzie: czy problemem było tempo, nieuwaga albo konkretny typ zadań. Zamiast patrzeć tylko na liczbę punktów, warto sprawdzić, co było stabilne i jaki jeden ruch poprawi kolejną próbę. Najlepiej wybrać jeden wniosek i zastosować go od razu w kolejnej rundzie.',
    hints: [
      'Nie oceniaj rundy tylko po jednym wyniku. Sprawdź, czy błąd się powtarza.',
      'Po słabszej próbie wybierz jeden konkretny obszar do poprawy, zamiast zmieniać wszystko naraz.',
      'Jeśli błąd dotyczy podstaw, wróć do lekcji lub łatwiejszego poziomu.',
    ],
    followUpActions: [
      { id: 'game-review-retry', label: 'Spróbuj jeszcze raz', page: 'Game' },
      { id: 'game-review-lessons', label: 'Wróć do lekcji', page: 'Lessons' },
    ],
    triggerPhrases: [
      'omówienie gry',
      'wynik gry',
      'co dalej po grze',
      'jak czytać ten wynik',
    ],
    sortOrder: 114,
  }),
  createGuideEntry({
    id: 'game-result-leaderboard',
    surface: 'game',
    focusKind: 'leaderboard',
    focusIdPrefixes: ['kangur-game-result-leaderboard'],
    contentIdPrefixes: ['game:assignment:', 'game:practice:'],
    title: 'Ranking po rundzie gry',
    shortDescription:
      'Ta sekcja pokazuje pozycję po zakończonej rundzie i pozwala porównać wynik z innymi próbami.',
    fullDescription:
      'Ranking po rundzie jest dodatkiem do wyniku gry. Pomaga zobaczyć, jak dana próba wypada na tle innych, ale jego największa wartość polega na motywowaniu do regularnej poprawy, a nie do pogoni za pojedynczym miejscem. Najważniejsze jest porównanie z własnymi poprzednimi wynikami.',
    hints: [
      'Najpierw przeczytaj własny wynik, a dopiero potem patrz na pozycje w rankingu.',
      'Jeśli pozycja jest nizsza niż oczekiwana, potraktuj to jako wskazówkę do spokojnej powtórki, nie jako porażkę.',
      'Porównuj serie z kilku prób, a nie tylko jedną rundę.',
    ],
    followUpActions: [
      { id: 'game-result-leaderboard-retry', label: 'Spróbuj jeszcze raz', page: 'Game' },
      { id: 'game-result-leaderboard-profile', label: 'Zobacz profil', page: 'LearnerProfile' },
    ],
    triggerPhrases: ['ranking po grze', 'pozycja po rundzie', 'tablica wyników po grze'],
    sortOrder: 115,
  }),
  createGuideEntry({
    id: 'game-summary',
    surface: 'game',
    focusKind: 'summary',
    contentIdPrefixes: ['game:result'],
    title: 'Podsumowanie gry',
    shortDescription: 'Podsumowanie gry pokazuje, co już wychodzi, a co wymaga jeszcze jednej serii.',
    fullDescription:
      'Podsumowanie gry zbiera wynik po próbie: skuteczność, tempo i ogólny efekt sesji. Najważniejsze jest tu uchwycenie wzoru: czy uczeń popełnia te same błędy, czy poprawia serię i czy warto jeszcze raz powtórzyć ten sam zakres. To moment na decyzję: powtórzyć ten sam poziom, wrócić do lekcji czy zwiększyć trudność.',
    hints: [
      'Jeśli dokładność spada, wróć do wolniejszego tempa.',
      'Jeśli wynik jest stabilny, dopiero wtedy zwiększ trudność albo tempo.',
      'Wybierz jeden wniosek i zamień go na kolejny krok: powtórka lub nowy zakres.',
    ],
    followUpActions: [{ id: 'game-summary-retry', label: 'Spróbuj jeszcze raz', page: 'Game' }],
    triggerPhrases: ['podsumowanie gry', 'wynik gry', 'co oznacza ten wynik'],
    sortOrder: 110,
  }),
  createGuideEntry({
    id: 'test-overview',
    surface: 'test',
    title: 'Ekran testu',
    shortDescription: 'Test służy do sprawdzenia, co uczeń już umie samodzielnie.',
    fullDescription:
      'Ekran testu sprawdza samodzielne rozumienie i gotowość do rozwiązywania zadań. Test jest bardziej o spokojnym czytaniu i myśleniu niż o tempie. Tutor może tutaj pomagać z orientacją w ekranie i strategią podejścia, ale nie powinien zdradzać odpowiedzi. Najlepsze efekty daje praca krok po kroku i świadome sprawdzanie wyboru.',
    hints: [
      'Najpierw przeczytaj całe polecenie i wszystkie odpowiedzi.',
      'Spróbuj samodzielnie rozwiązać zadanie przed sięgnięciem po omówienie.',
      'Po odpowiedzi porównaj wynik z omówieniem, zamiast od razu zgadywać kolejną opcję.',
      'Jeśli utkniesz, wróć do treści zadania i podkreśl kluczowe liczby lub słowa.',
    ],
    relatedTests: ['Powtórka po lekcji', 'Sprawdzenie rozumienia tematu'],
    triggerPhrases: ['test', 'ekran testu', 'jak działa ten test', 'na czym polega ten test'],
    sortOrder: 120,
  }),
  createGuideEntry({
    id: 'test-empty-state',
    surface: 'test',
    focusKind: 'empty_state',
    focusIdPrefixes: ['kangur-test-empty-state:'],
    title: 'Pusty zestaw testowy',
    shortDescription:
      'Ten stan oznacza, że wybrany zestaw nie ma jeszcze opublikowanych pytań do rozwiązania.',
    fullDescription:
      'Pusty zestaw testowy pojawia się wtedy, gdy zestaw został utworzony, ale nie ma w nim jeszcze opublikowanych pytań. To nie jest błąd ucznia ani sygnał, że coś zrobił źle. Po prostu w tym miejscu nie ma jeszcze materiału do przejścia, więc najlepiej wrócić do innego testu, lekcji albo gry.',
    hints: [
      'Jeśli spodziewasz się pytań, wybierz inny zestaw albo wróć później, gdy materiał zostanie opublikowany.',
      'To dobry moment, by przejść do lekcji lub krótkiej gry zamiast czekać bez celu.',
    ],
    followUpActions: [
      { id: 'test-empty-state-lessons', label: 'Wróć do lekcji', page: 'Lessons' },
      { id: 'test-empty-state-game', label: 'Przejdź do gry', page: 'Game' },
    ],
    triggerPhrases: [
      'pusty test',
      'brak pytań w teście',
      'co oznacza ten pusty stan',
      'dlaczego test jest pusty',
    ],
    sortOrder: 125,
  }),
  createGuideEntry({
    id: 'test-summary',
    surface: 'test',
    focusKind: 'summary',
    focusIdPrefixes: ['kangur-test-summary:'],
    title: 'Podsumowanie testu',
    shortDescription: 'Podsumowanie testu pokazuje wynik, ale przede wszystkim kierunek dalszej pracy.',
    fullDescription:
      'Podsumowanie testu zbiera wynik całej próby i pomaga zauważyć, gdzie uczeń radził sobie dobrze, a gdzie potrzebuje jeszcze powtórki. Nie chodzi tylko o końcowy procent. Ta sekcja podpowiada, czy najlepiej wrócić do lekcji, czy zrobić jeszcze jedną próbę. Warto wybrać jeden temat do poprawy zamiast próbować wszystko naraz.',
    hints: [
      'Patrz na błędy jako wskazówkę, do czego wrócić, a nie jako porażkę.',
      'Po słabszym teście najlepszy ruch to krótka powtórka konkretnego tematu.',
      'Po dobrym wyniku spróbuj trudniejszego zakresu lub kolejnego testu.',
    ],
    followUpActions: [{ id: 'test-summary-lessons', label: 'Wróć do lekcji', page: 'Lessons' }],
    triggerPhrases: ['podsumowanie testu', 'wynik testu', 'co oznacza ten wynik'],
    sortOrder: 130,
  }),
  createGuideEntry({
    id: 'test-question',
    surface: 'test',
    focusKind: 'question',
    focusIdPrefixes: ['kangur-test-question:'],
    title: 'Pytanie testowe',
    shortDescription: 'To miejsce do spokojnego przeczytania treści i samodzielnej próby.',
    fullDescription:
      'Sekcja pytania testowego pokazuje jedno zadanie wraz z odpowiedziami lub miejscem na rozwiązanie. Najważniejsze jest tutaj spokojne przeczytanie treści, zauważenie danych i dopiero potem wybór odpowiedzi. Tutor może podpowiedzieć strategię czytania i myślenia, ale nie gotowy wynik. Dobrze działa krótkie streszczenie własnymi słowami przed wyborem odpowiedzi.',
    hints: [
      'Przeczytaj pytanie od początku do końca jeszcze raz, zanim wybierzesz odpowiedź.',
      'Zwracaj uwagę na liczby, jednostki i słowa, które zmieniają sens zadania.',
      'Gdy są odpowiedzi do wyboru, najpierw skreśl te, które na pewno nie pasują.',
      'Jeśli zadanie ma kilka kroków, zapisz lub powiedz na głos pierwszy krok.',
    ],
    triggerPhrases: ['pytanie testowe', 'jak podejść do pytania', 'co robi ta sekcja pytania'],
    sortOrder: 140,
  }),
  createGuideEntry({
    id: 'test-kangur-q1-squares',
    surface: 'test',
    focusKind: 'question',
    title: 'Kangur: pytanie 1 o rozciętych kwadratach',
    shortDescription:
      'Zadanie z arkusza konkursowego: wybierz kwadrat, który po rozcięciu daje dwie różne części.',
    fullDescription:
      'Pytanie 1 z arkusza konkursowego Kangura: „Który kwadrat został rozcięty wzdłuż pogrubionych linii na dwie części o różnych kształtach? (A–E)”. To zadanie opiera się na porównaniu kształtów powstałych po rozcięciu, a nie na liczeniu długości.',
    hints: [
      'Najpierw wyobraź sobie dwie części po rozcięciu w każdej opcji.',
      'Sprawdź, czy jedną część można obrócić lub odbić lustrzanie tak, by pokryła drugą.',
      'Szukaj opcji, w której kontury części nie dają się dopasować przez obrót lub odbicie.',
    ],
    relatedTests: ['Kangur - arkusz konkursowy'],
    triggerPhrases: [
      'który kwadrat został rozcięty',
      'pytanie 1 kangur',
      'kangur pytanie 1',
      'pogrubione linie',
      'dwie części o różnych kształtach',
    ],
    sortOrder: 142,
  }),
  createGuideEntry({
    id: 'test-selection',
    surface: 'test',
    focusKind: 'selection',
    focusIdPrefixes: ['kangur-test-selection:'],
    title: 'Wybrana odpowiedź w teście',
    shortDescription:
      'Ta karta pokazuje aktualnie zaznaczoną odpowiedź przed sprawdzeniem wyniku.',
    fullDescription:
      'Wybrana odpowiedź w teście to tymczasowy wybór ucznia przed odkryciem poprawnego wyniku. Tutor nie powinien od razu oceniać, czy odpowiedź jest dobra, ale może pomóc zauważyć, co oznacza ten wybór, jak wrócić do treści zadania i co jeszcze sprawdzić przed kliknięciem sprawdzenia. To dobry moment na spokojne sprawdzenie obliczeń lub logiki.',
    hints: [
      'Przeczytaj jeszcze raz pytanie i porównaj je tylko z tą jedną zaznaczoną odpowiedzią.',
      'Sprawdź, czy wybrana opcja naprawdę odpowiada na to, o co pyta zadanie, a nie tylko wygląda znajomo.',
      'Jeśli masz wątpliwość, porównaj swój wybór z jedną inną opcją zamiast zgadywać od razu.',
      'Wróć do danych z treści i sprawdź, czy nie pominąłeś żadnego warunku.',
    ],
    triggerPhrases: [
      'wybrana odpowiedź',
      'zaznaczona odpowiedź',
      'co oznacza mój wybór',
      'czy dobrze rozumiem ta odpowiedź',
    ],
    sortOrder: 145,
  }),
  createGuideEntry({
    id: 'test-review',
    surface: 'test',
    focusKind: 'review',
    focusIdPrefixes: ['kangur-test-question:'],
    title: 'Omówienie po teście',
    shortDescription: 'Omówienie pomaga zrozumieć błąd i wyciągnąć jeden następny wniosek.',
    fullDescription:
      'Sekcja omówienia po teście wyjaśnia, co zadziałało, gdzie pojawił się błąd i jaki jeden krok poprawi kolejną próbę. To nie tylko miejsce na zobaczenie prawidłowej odpowiedzi. Najważniejsze jest zrozumienie, dlaczego właśnie taka odpowiedź jest poprawna oraz jak unikać podobnego błędu w przyszłości.',
    hints: [
      'Najpierw porównaj swój tok myślenia z omówieniem.',
      'Zapisz albo zapamiętaj jeden konkretny błąd, którego chcesz uniknąć następnym razem.',
      'Jeśli omówienie odnosi się do lekcji, wróć do tej lekcji i przejrzyj jeden przykład.',
    ],
    followUpActions: [{ id: 'test-review-lessons', label: 'Powtórz temat', page: 'Lessons' }],
    triggerPhrases: ['omówienie', 'recenzja odpowiedzi', 'wyjaśnij ten błąd', 'co pokazuje omówienie'],
    sortOrder: 150,
  }),
  createGuideEntry({
    id: 'profile-overview',
    surface: 'profile',
    contentIdPrefixes: ['profile:'],
    title: 'Profil ucznia',
    shortDescription:
      'Profil ucznia zbiera postęp, rekomendacje i historię pracy w jednym miejscu.',
    fullDescription:
      'Profil ucznia pokazuje, jak wygląda nauka w dłuższej perspektywie. To nie jest pojedyncze zadanie do rozwiązania, tylko panel do czytania postępu, wybierania następnych priorytetów i zauważania, co idzie coraz lepiej. Znajdziesz tu karty z postępem, rekomendacjami, zadaniami, opanowaniem i historią sesji, żeby łatwo znaleźć jeden konkretny krok.',
    hints: [
      'Najpierw spójrz na ogólny postęp, a dopiero potem przejdź do szczegółowych kart.',
      'To dobre miejsce, by zdecydować, czy lepszy będzie powrót do lekcji, czy kolejna próba w grze.',
      'Wybierz jedną kartę i wróć tutaj po wykonaniu wskazanego kroku.',
    ],
    followUpActions: [
      { id: 'profile-overview-lessons', label: 'Wróć do lekcji', page: 'Lessons' },
      { id: 'profile-overview-game', label: 'Przejdź do gry', page: 'Game' },
    ],
    triggerPhrases: ['profil ucznia', 'jak czytać ten profil', 'co pokazuje ten profil'],
    sortOrder: 160,
  }),
  createGuideEntry({
    id: 'profile-hero',
    surface: 'profile',
    focusKind: 'hero',
    focusIdPrefixes: ['kangur-profile-hero'],
    contentIdPrefixes: ['profile:'],
    title: 'Hero profilu ucznia',
    shortDescription:
      'Ta górna karta ustawia kontekst profilu i pokazuje najważniejszy stan ucznia.',
    fullDescription:
      'Hero profilu ucznia jest szybkim podsumowaniem: pokazuje, czyj profil oglądasz i jak wygląda ogólny rytm nauki. To dobry punkt startowy przed przejściem do kart z poziomem, wynikami i rekomendacjami.',
    hints: [
      'Zacznij od tej karty, jeśli chcesz zrozumieć ogólny obraz zanim wejdziesz w szczegóły.',
      'Po przeczytaniu hero przejdź do postępu albo rekomendacji, żeby wybrać kolejny ruch.',
    ],
    followUpActions: [{ id: 'profile-hero-focus-progress', label: 'Zobacz postęp', page: 'LearnerProfile' }],
    triggerPhrases: ['górna karta profilu', 'hero profilu', 'co pokazuje ta karta'],
    sortOrder: 161,
  }),
  createGuideEntry({
    id: 'profile-ai-tutor-mood',
    surface: 'profile',
    focusKind: 'screen',
    focusIdPrefixes: ['kangur-profile-ai-tutor-mood'],
    contentIdPrefixes: ['profile:'],
    title: 'Nastrój i wskazówki Tutor-AI',
    shortDescription:
      'Ta karta pokazuje, jak Tutor-AI ocenia aktualny rytm nauki i jaki ton wsparcia wybiera.',
    fullDescription:
      'Sekcja nastroju Tutor-AI na profilu przekłada dane o aktywności ucznia na prostszy komunikat: czy warto utrzymać tempo, zwolnić, czy skupić się na jednym obszarze. To bardziej interpretacja niż ocena.',
    hints: [
      'Czytaj te wskazówki jako kierunek pracy, nie jako stopień czy werdykt.',
      'Jeśli karta sugeruje spokojniejsze tempo, wybierz jedną lekcję albo jeden rodzaj gry zamiast wielu naraz.',
    ],
    followUpActions: [{ id: 'profile-ai-tutor-mood-lessons', label: 'Wróć do lekcji', page: 'Lessons' }],
    triggerPhrases: ['nastrój tutora', 'wskazówki tutora', 'co oznacza ten nastrój'],
    sortOrder: 162,
  }),
  createGuideEntry({
    id: 'profile-level-progress',
    surface: 'profile',
    focusKind: 'progress',
    focusIdPrefixes: ['kangur-profile-level-progress'],
    contentIdPrefixes: ['profile:'],
    title: 'Postęp poziomu ucznia',
    shortDescription:
      'Ta sekcja pokazuje, jak blisko uczeń jest kolejnego poziomu i ile XP już zdobył.',
    fullDescription:
      'Postęp poziomu pomaga zobaczyć dłuższy rytm nauki. Nie chodzi tylko o liczbę punktów, ale o regularność: czy uczeń stale domyka małe kroki i zbliża się do kolejnego poziomu bez duzych przerw.',
    hints: [
      'Patrz na ten panel jako na miarę regularności, a nie samej szybkości.',
      'Jeśli do kolejnego poziomu zostało niewiele, dobrym ruchem jest krótka, skończona sesja zamiast długiego maratonu.',
    ],
    followUpActions: [{ id: 'profile-level-progress-game', label: 'Zdobądź XP w grze', page: 'Game' }],
    triggerPhrases: ['poziom ucznia', 'xp', 'postęp poziomu', 'ile brakuje do następnego poziomu'],
    sortOrder: 163,
  }),
  createGuideEntry({
    id: 'profile-stats-overview',
    surface: 'profile',
    focusKind: 'summary',
    focusIdPrefixes: ['kangur-profile-overview'],
    contentIdPrefixes: ['profile:'],
    title: 'Przegląd wyników ucznia',
    shortDescription:
      'Ta karta zbiera najważniejsze liczby i pomaga szybko odczytać ogólną kondycję nauki.',
    fullDescription:
      'Przegląd wyników ucznia pokazuje najważniejsze wskaźniki w jednym miejscu: skuteczność, aktywność i ogólny obraz postępu. To dobra sekcja do szybkiego sprawdzenia, czy nauka idzie równo, czy pojawił się spadek, który warto zatrzymać.',
    hints: [
      'Nie patrz na jedną liczbę osobno. Najwięcej mówi zestaw kilku wskaźników naraz.',
      'Jeśli widzisz spadek w jednym miejscu, sprawdź rekomendacje i historię sesji.',
    ],
    followUpActions: [{ id: 'profile-stats-overview-sessions', label: 'Zobacz historię sesji', page: 'LearnerProfile' }],
    triggerPhrases: ['przegląd wyników', 'główne statystyki', 'co oznaczają te liczby'],
    sortOrder: 164,
  }),
  createGuideEntry({
    id: 'profile-recommendations',
    surface: 'profile',
    focusKind: 'screen',
    focusIdPrefixes: ['kangur-profile-recommendations'],
    contentIdPrefixes: ['profile:'],
    title: 'Rekomendacje dla ucznia',
    shortDescription:
      'Ta sekcja podpowiada, jaki następny krok najlepiej pasuje do obecnego postępu ucznia.',
    fullDescription:
      'Rekomendacje porządkują kolejne ruchy: która lekcja, jaka gra albo jaki powrót da teraz najwięcej korzyści. Powstają na podstawie ostatnich sesji, wyników i zadań, aby szybko wskazać jeden sensowny priorytet.',
    hints: [
      'Najlepiej wybrać jedną rekomendację i domknąć ją do końca, zamiast otwierać kilka naraz.',
      'Jeśli rekomendacja pokrywa się z ostatnim słabszym wynikiem, zacznij właśnie od niej.',
      'Po wykonaniu rekomendacji wróć, by sprawdzić następny krok.',
    ],
    followUpActions: [{ id: 'profile-recommendations-open', label: 'Otwórz rekomendacje', page: 'LearnerProfile' }],
    triggerPhrases: ['rekomendacje', 'co dalej dla ucznia', 'jaki następny krok wybrać'],
    sortOrder: 165,
  }),
  createGuideEntry({
    id: 'profile-assignments',
    surface: 'profile',
    focusKind: 'assignment',
    focusIdPrefixes: ['kangur-profile-assignments'],
    contentIdPrefixes: ['profile:'],
    title: 'Zadania ucznia',
    shortDescription:
      'Ta karta pokazuje przydzielone zadania i pomaga ustalić, co jest do zrobienia teraz.',
    fullDescription:
      'Sekcja zadań na profilu ucznia zbiera aktywne obowiązki i priorytety. To miejsce do sprawdzenia, co zostało przypisane, co jest pilne i od czego najlepiej zacząć najbliższą sesję.',
    hints: [
      'Najpierw szukaj zadań oznaczonych jako najpilniejsze albo związanych z ostatnim spadkiem wyników.',
      'Po wykonaniu jednego zadania wróć na profil i sprawdź, czy priorytet się zmienił.',
    ],
    followUpActions: [{ id: 'profile-assignments-open-game', label: 'Przejdź do gry', page: 'Game' }],
    triggerPhrases: ['zadania ucznia', 'co jest zadane', 'priorytetowe zadania na profilu'],
    sortOrder: 166,
  }),
  createGuideEntry({
    id: 'profile-mastery',
    surface: 'profile',
    focusKind: 'screen',
    focusIdPrefixes: ['kangur-profile-mastery'],
    contentIdPrefixes: ['profile:'],
    title: 'Opanowanie materiału ucznia',
    shortDescription:
      'Ta sekcja pokazuje, które obszary są już stabilne, a które potrzebują jeszcze powtórki.',
    fullDescription:
      'Panel opanowania materiału grupuje tematy według siły ucznia. Pozwala szybko zobaczyć, czy problem dotyczy jednego konkretnego zakresu, czy szerszego wzoru powtarzającego się w kilku miejscach.',
    hints: [
      'Zacznij od najsłabszego obszaru, a nie od tego, który wydaje się najłatwiejszy.',
      'Jeśli dwa obszary są podobnie słabe, wybierz ten, który częściej wraca w zadaniach.',
    ],
    followUpActions: [{ id: 'profile-mastery-lessons', label: 'Powtórz temat', page: 'Lessons' }],
    triggerPhrases: ['opanowanie materiału', 'mocne i słabe obszary', 'które tematy wymagają powtórki'],
    sortOrder: 167,
  }),
  createGuideEntry({
    id: 'profile-performance',
    surface: 'profile',
    focusKind: 'summary',
    focusIdPrefixes: ['kangur-profile-performance'],
    contentIdPrefixes: ['profile:'],
    title: 'Skuteczność ucznia',
    shortDescription:
      'Ta karta pokazuje, jak skutecznie uczeń rozwiązuje zadania i czy wynik jest stabilny.',
    fullDescription:
      'Skuteczność ucznia pomaga ocenić, czy aktualny poziom trudności jest dobrze dobrany. Gdy wynik jest stabilny, można myśleć o kolejnym kroku. Gdy mocno faluje, lepiej wracać do krótszych i bardziej przewidywalnych sesji.',
    hints: [
      'Stabilny średni wynik bywa cenniejszy niż pojedynczy wysoki skok.',
      'Jeśli skuteczność spada po zwiększeniu trudności, warto chwilowo cofnąć poziom.',
    ],
    followUpActions: [{ id: 'profile-performance-game', label: 'Spróbuj kolejnej gry', page: 'Game' }],
    triggerPhrases: ['skuteczność ucznia', 'czy wynik jest dobry', 'jak czytać te procenty'],
    sortOrder: 168,
  }),
  createGuideEntry({
    id: 'profile-sessions',
    surface: 'profile',
    focusKind: 'screen',
    focusIdPrefixes: ['kangur-profile-sessions'],
    contentIdPrefixes: ['profile:'],
    title: 'Historia sesji ucznia',
    shortDescription:
      'Ta sekcja pokazuje ostatnie sesje i pomaga zobaczyć rytm pracy w czasie.',
    fullDescription:
      'Historia sesji ucznia pozwala odczytać wzór nauki: jak często uczeń wraca, ile trwają sesje i czy po słabszych wynikach pojawia się poprawa. To dobre miejsce do szukania regularności, nie pojedynczych wyjątków.',
    hints: [
      'Patrz na kilka ostatnich sesji razem, zamiast wyciągać wnioski z jednej próby.',
      'Jeśli widzisz długą przerwę, zacznij od krótszego powrotu zamiast od najtrudniejszego zadania.',
    ],
    followUpActions: [{ id: 'profile-sessions-game', label: 'Wróć do gry', page: 'Game' }],
    triggerPhrases: ['historia sesji', 'ostatnie próby', 'jak często uczeń ćwiczy'],
    sortOrder: 169,
  }),
  createGuideEntry({
    id: 'parent-dashboard-overview',
    surface: 'parent_dashboard',
    contentIdPrefixes: ['parent-dashboard:'],
    title: 'Panel rodzica',
    shortDescription:
      'Panel rodzica zbiera nadzór nad uczniem: postęp, wyniki, zadania, monitoring i ustawienia profilu.',
    fullDescription:
      'Panel rodzica nie służy do rozwiązywania zadań, tylko do czytania obrazu nauki i ustawiania kolejnych priorytetów. To miejsce do spokojnego sprawdzenia, co dzieje się z uczniem i jaki następny ruch ma największy sens. W tym panelu rodzic może planować zadania, monitorować ich wykonanie oraz ustalać, na czym uczeń ma się skupić w najbliższej sesji.',
    hints: [
      'Najpierw wybierz zakładkę zgodną z tym, czego chcesz się dowiedzieć: wyniki, postęp, zadania, monitoring albo Tutor-AI.',
      'Najlepiej wyciągać jeden konkretny wniosek i od razu zamieniać go na działanie dla ucznia.',
      'Zanim przejdziesz do szczegółów, upewnij się, że wybrany jest właściwy uczeń.',
    ],
    followUpActions: [
      { id: 'parent-dashboard-overview-profile', label: 'Zobacz profil ucznia', page: 'LearnerProfile' },
      { id: 'parent-dashboard-overview-lessons', label: 'Przejdź do lekcji', page: 'Lessons' },
    ],
    triggerPhrases: ['panel rodzica', 'jak działa ten panel', 'co mogę tutaj sprawdzić'],
    sortOrder: 170,
  }),
  createGuideEntry({
    id: 'parent-dashboard-guest-hero',
    surface: 'parent_dashboard',
    focusKind: 'hero',
    focusIdPrefixes: ['kangur-parent-dashboard-guest-hero'],
    contentIdPrefixes: ['parent-dashboard:guest'],
    title: 'Hero dashboardu rodzica bez dostępu',
    shortDescription:
      'Ta karta wyjaśnia, dlaczego panel rodzica jest ograniczony i co trzeba zrobić, aby wejść dalej.',
    fullDescription:
      'Gdy panel rodzica jest niedostępny, hero pokazuje stan dostępu zamiast danych ucznia. To nie jest błąd systemu. Najczęściej oznacza, że trzeba zalogować się na konto z uprawnieniami rodzica albo nauczyciela.',
    hints: [
      'Jeśli chcesz zarządzać uczniami, sprawdź, czy używasz konta z odpowiednią rolą.',
      'Po uzyskaniu dostępu wróć do panelu i dopiero wtedy przejrzyj zakładki.',
    ],
    followUpActions: [{ id: 'parent-dashboard-guest-hero-login', label: 'Zaloguj się', page: 'Game' }],
    triggerPhrases: ['brak dostępu do panelu rodzica', 'dlaczego ten panel jest zablokowany', 'hero bez dostępu'],
    sortOrder: 171,
  }),
  createGuideEntry({
    id: 'parent-dashboard-hero',
    surface: 'parent_dashboard',
    focusKind: 'hero',
    focusIdPrefixes: ['kangur-parent-dashboard-hero'],
    contentIdPrefixes: ['parent-dashboard:'],
    title: 'Hero dashboardu rodzica',
    shortDescription:
      'Ta górna karta ustawia kontekst panelu rodzica i pokazuje, kogo obecnie nadzorujesz.',
    fullDescription:
      'Hero dashboardu rodzica pomaga od razu zorientować się, dla którego ucznia czytasz dane i jaki jest cel tego ekranu. To punkt startowy przed przejściem do zarządzania uczniami albo do aktywnej zakładki.',
    hints: [
      'Najpierw upewnij się, że wybrany jest właściwy uczeń.',
      'Potem przejdź do zakładki odpowiadającej pytaniu, na które chcesz odpowiedzieć.',
    ],
    followUpActions: [{ id: 'parent-dashboard-hero-tabs', label: 'Przejdź do zakładek', page: 'ParentDashboard' }],
    triggerPhrases: ['hero dashboardu rodzica', 'górna karta rodzica', 'kogo pokazuje ten panel'],
    sortOrder: 172,
  }),
  createGuideEntry({
    id: 'parent-dashboard-learner-management',
    surface: 'parent_dashboard',
    focusKind: 'screen',
    focusIdPrefixes: ['kangur-parent-dashboard-learner-management'],
    contentIdPrefixes: ['parent-dashboard:'],
    title: 'Zarządzanie uczniami',
    shortDescription:
      'Ta sekcja służy do wyboru ucznia i aktualizacji jego podstawowych danych.',
    fullDescription:
      'Panel zarządzania uczniami pozwala przełączać aktywny profil, edytować dane i porządkować konto rodzica. To część organizacyjna, dzięki której dalsze zakładki pokazują informacje dla właściwej osoby.',
    hints: [
      'Przed interpretowaniem wyników sprawdź, czy aktywny jest odpowiedni uczeń.',
      'Zmiany organizacyjne wykonuj tutaj, a dopiero potem przechodź do analizy postępu.',
    ],
    followUpActions: [{ id: 'parent-dashboard-learner-management-tabs', label: 'Sprawdź zakładki', page: 'ParentDashboard' }],
    triggerPhrases: ['zarządzanie uczniami', 'wybór ucznia', 'edycja profilu ucznia'],
    sortOrder: 173,
  }),
  createGuideEntry({
    id: 'parent-dashboard-tabs',
    surface: 'parent_dashboard',
    focusKind: 'navigation',
    focusIdPrefixes: ['kangur-parent-dashboard-tabs'],
    contentIdPrefixes: ['parent-dashboard:'],
    title: 'Zakładki dashboardu rodzica',
    shortDescription:
      'Te zakładki dzielą panel rodzica na wyniki, postęp, zadania, monitoring i wsparcie Tutor-AI.',
    fullDescription:
      'Zakładki porządkują panel rodzica według celu. Zamiast czytać wszystko naraz, można wejść tylko w ten rodzaj informacji, który jest teraz potrzebny: wyniki, postęp, zadania, monitoring albo wskazówki od Tutor-AI.',
    hints: [
      'Wybieraj zakładkę zgodnie z pytaniem, na które chcesz odpowiedzieć.',
      'Po zmianie zakładki porównuj wnioski z innymi sekcjami, ale nie mieszaj wszystkich naraz.',
    ],
    followUpActions: [{ id: 'parent-dashboard-tabs-profile', label: 'Otwórz profil ucznia', page: 'LearnerProfile' }],
    triggerPhrases: ['zakładki rodzica', 'jak działają te zakładki', 'co jest w tej zakładce'],
    sortOrder: 174,
  }),
  createGuideEntry({
    id: 'parent-dashboard-progress',
    surface: 'parent_dashboard',
    focusKind: 'progress',
    focusIdPrefixes: ['kangur-parent-dashboard-progress'],
    contentIdPrefixes: ['parent-dashboard:'],
    title: 'Postęp ucznia w dashboardzie rodzica',
    shortDescription:
      'Ta zakładka pokazuje, czy nauka ucznia idzie regularnie i czy tempo jest stabilne.',
    fullDescription:
      'Zakładka postępu w panelu rodzica skupia się na rytmie nauki: regularności, aktualnym kierunku i dłuższym trendzie. To dobre miejsce do odpowiedzi na pytanie, czy uczeń faktycznie wraca do pracy i czy robi małe, ale stałe kroki.',
    hints: [
      'Szukaj trendu tygodniowego albo miesięcznego, nie tylko pojedynczego skoku.',
      'Jeśli postęp zwalnia, sprawdź potem zadania i rekomendacje na profilu ucznia.',
    ],
    followUpActions: [{ id: 'parent-dashboard-progress-profile', label: 'Zobacz profil ucznia', page: 'LearnerProfile' }],
    triggerPhrases: ['postęp ucznia w panelu rodzica', 'czy uczeń robi postępy', 'jak czytać postęp'],
    sortOrder: 175,
  }),
  createGuideEntry({
    id: 'parent-dashboard-scores',
    surface: 'parent_dashboard',
    focusKind: 'summary',
    focusIdPrefixes: ['kangur-parent-dashboard-scores'],
    contentIdPrefixes: ['parent-dashboard:'],
    title: 'Wyniki ucznia w dashboardzie rodzica',
    shortDescription:
      'Ta zakładka pokazuje wyniki ucznia i pomaga odczytać ich stabilność.',
    fullDescription:
      'Zakładka wyników służy do analizy skuteczności ucznia z perspektywy rodzica. Pozwala zobaczyć, czy wyniki są równe, czy mocno się wahają oraz czy aktualny poziom wyzwania jest adekwatny.',
    hints: [
      'Nie oceniaj ucznia po jednej próbie. Szukaj wzoru w kilku wynikach.',
      'Po słabszym wyniku sprawdź, czy warto wrócić do lekcji albo uprościć zakres gry.',
    ],
    followUpActions: [{ id: 'parent-dashboard-scores-lessons', label: 'Powtórz temat', page: 'Lessons' }],
    triggerPhrases: ['wyniki ucznia w panelu rodzica', 'jak czytać wyniki', 'co oznaczają te liczby'],
    sortOrder: 176,
  }),
  createGuideEntry({
    id: 'parent-dashboard-assignments',
    surface: 'parent_dashboard',
    focusKind: 'assignment',
    focusIdPrefixes: ['kangur-parent-dashboard-assignments'],
    contentIdPrefixes: ['parent-dashboard:'],
    title: 'Zadania ucznia w dashboardzie rodzica',
    shortDescription:
      'Ta zakładka pokazuje zadania przypisane uczniowi i pomaga ustawić priorytety.',
    fullDescription:
      'Zakładka zadań w panelu rodzica służy do planowania najbliższej pracy ucznia. Pokazuje, co jest aktywne, co wymaga pilnego domknięcia i jaki obszar nauki powinien mieć teraz pierwszeństwo. To tutaj najłatwiej przekształcić obserwacje z wyników w konkretne zadania.',
    hints: [
      'Najlepiej utrzymywać jedną główną rzecz do zrobienia, zamiast wielu równoległych priorytetów.',
      'Jeśli zadanie nie pasuje do aktualnego poziomu ucznia, najpierw wróć do profilu i sprawdź opanowanie materiału.',
      'Po zakończeniu zadania wróć, aby upewnić się, że priorytety są nadal aktualne.',
    ],
    followUpActions: [{ id: 'parent-dashboard-assignments-game', label: 'Przejdź do gry', page: 'Game' }],
    triggerPhrases: ['zadania ucznia w panelu rodzica', 'co jest przypisane', 'priorytety dla ucznia'],
    sortOrder: 177,
  }),
  createGuideEntry({
    id: 'parent-dashboard-monitoring',
    surface: 'parent_dashboard',
    focusKind: 'assignment',
    focusIdPrefixes: ['kangur-parent-dashboard-monitoring'],
    contentIdPrefixes: ['parent-dashboard:'],
    title: 'Monitorowanie zadań w dashboardzie rodzica',
    shortDescription:
      'Ta zakładka pokazuje postęp przypisanych zadań oraz sugestii, które uczeń ma do wykonania.',
    fullDescription:
      'Zakładka monitoringu zadań skupia się na realizacji priorytetów: ile zadań jest aktywnych, które są w trakcie, a które wymagają przypomnienia. To najlepsze miejsce, aby sprawdzić, czy uczeń faktycznie domyka zadania przypisane przez rodzica lub wynikające z sugestii StudiQ.',
    hints: [
      'Zwracaj uwagę na zadania o wysokim priorytecie z niskim postępem.',
      'Jeśli wiele zadań stoi w miejscu, wróć do planowania i ogranicz liczbę priorytetów.',
    ],
    followUpActions: [
      { id: 'parent-dashboard-monitoring-game', label: 'Przejdź do gry', page: 'Game' },
    ],
    triggerPhrases: ['monitorowanie zadań', 'postęp zadań', 'które zadania są wykonane'],
    sortOrder: 178,
  }),
  createGuideEntry({
    id: 'parent-dashboard-ai-tutor',
    surface: 'parent_dashboard',
    focusKind: 'screen',
    focusIdPrefixes: ['kangur-parent-dashboard-ai-tutor'],
    contentIdPrefixes: ['parent-dashboard:'],
    title: 'Zakładka Tutor-AI dla rodzica',
    shortDescription:
      'Ta sekcja tłumaczy dane ucznia w prostszy język i pomaga zdecydować o kolejnym kroku.',
    fullDescription:
      'Zakładka Tutor-AI dla rodzica nie zastępuje danych, tylko je interpretuje. To miejsce do zadawania pytań o postęp ucznia, priorytety i sens kolejnych ruchów, gdy same liczby nie wystarczają do podjęcia decyzji.',
    hints: [
      'Najpierw sformułuj jedno konkretne pytanie, na które chcesz odpowiedzi.',
      'Najlepsze efekty daje łączenie tej zakładki z danymi z postępu, wyników albo zadań.',
    ],
    followUpActions: [{ id: 'parent-dashboard-ai-tutor-profile', label: 'Zobacz profil ucznia', page: 'LearnerProfile' }],
    triggerPhrases: ['tutor-ai dla rodzica', 'jak korzystać z tej zakładki', 'co mogę zapytać tutaj'],
    sortOrder: 179,
  }),
  ...KANGUR_NATIVE_GUIDE_ENTRIES_AUTH,
];
