import { z } from 'zod';

import {
  kangurAiTutorFocusKindSchema,
  kangurAiTutorFollowUpActionSchema,
  kangurAiTutorSurfaceSchema,
  type KangurAiTutorFocusKind,
  type KangurAiTutorFollowUpAction,
  type KangurAiTutorSurface,
} from './kangur-ai-tutor';
import { repairKangurPolishCopy } from '@/shared/lib/i18n/kangur-polish-diacritics';

const nonEmptyTrimmedString = z.string().trim().min(1);
const tutorGuideCopySchema = nonEmptyTrimmedString.max(1_200);
const tutorGuideBulletSchema = nonEmptyTrimmedString.max(240);
const tutorGuideTagSchema = nonEmptyTrimmedString.max(120);

export const kangurAiTutorNativeGuideEntrySchema = z.object({
  id: nonEmptyTrimmedString.max(120),
  surface: kangurAiTutorSurfaceSchema.nullable().default(null),
  focusKind: kangurAiTutorFocusKindSchema.nullable().default(null),
  focusIdPrefixes: z.array(tutorGuideTagSchema).max(16).default([]),
  contentIdPrefixes: z.array(tutorGuideTagSchema).max(16).default([]),
  title: nonEmptyTrimmedString.max(120),
  shortDescription: nonEmptyTrimmedString.max(240),
  fullDescription: tutorGuideCopySchema,
  hints: z.array(tutorGuideBulletSchema).max(8).default([]),
  relatedGames: z.array(tutorGuideTagSchema).max(8).default([]),
  relatedTests: z.array(tutorGuideTagSchema).max(8).default([]),
  followUpActions: z.array(kangurAiTutorFollowUpActionSchema).max(6).default([]),
  triggerPhrases: z.array(tutorGuideTagSchema).max(16).default([]),
  enabled: z.boolean().default(true),
  sortOrder: z.number().int().default(0),
});
export type KangurAiTutorNativeGuideEntry = z.infer<
  typeof kangurAiTutorNativeGuideEntrySchema
>;

export const kangurAiTutorNativeGuideStoreSchema = z.object({
  locale: nonEmptyTrimmedString.max(16).default('pl'),
  version: z.number().int().positive().default(6),
  entries: z.array(kangurAiTutorNativeGuideEntrySchema).max(200).default([]),
});
export type KangurAiTutorNativeGuideStore = z.infer<
  typeof kangurAiTutorNativeGuideStoreSchema
>;

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
  sortOrder?: number;
}): KangurAiTutorNativeGuideEntry =>
  kangurAiTutorNativeGuideEntrySchema.parse({
    surface: null,
    focusKind: null,
    focusIdPrefixes: [],
    contentIdPrefixes: [],
    hints: [],
    relatedGames: [],
    relatedTests: [],
    followUpActions: [],
    triggerPhrases: [],
    sortOrder: 0,
    ...input,
  });

export const DEFAULT_KANGUR_AI_TUTOR_NATIVE_GUIDE_STORE: Readonly<KangurAiTutorNativeGuideStore> =
  Object.freeze(
    kangurAiTutorNativeGuideStoreSchema.parse(
      repairKangurPolishCopy({
        locale: 'pl',
        version: 6,
        entries: [
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
          id: 'lesson-empty-state',
          surface: 'lesson',
          focusKind: 'empty_state',
          focusIdPrefixes: ['kangur-lessons-list-empty-state', 'kangur-lesson-empty-document'],
          contentIdPrefixes: ['lesson:list'],
          title: 'Brak dostepnej zawartosci lekcji',
          shortDescription:
            'Ten komunikat pokazuje, ze w tym miejscu nie ma jeszcze aktywnej treści do przerobienia.',
          fullDescription:
            'Pusty stan lekcji nie oznacza błędu ucznia. Informuje tylko, ze nie ma jeszcze aktywnych lekcji albo dokument dla tej lekcji nie został zapisany. Tutor może wtedy wskazac, czy trzeba wrócić do listy tematów, czy poczekac na uzupelnienie materiału.',
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
            'To dodatkowa plansza lekcji, która wyjaśnia szczegolny stan albo ukryte zakonczenie.',
          fullDescription:
            'Specjalna plansza lekcji pojawia się zamiast zwykłej treści, gdy uczeń trafia do szczególnego stanu, na przykład ukrytego finiszu. To miejsce bardziej podsumowuje drogę przez temat i pokazuje, co zostało odblokowane, niż prowadzi przez nowy materiał krok po kroku.',
          hints: [
            'Przeczytaj ten panel jak nagrode albo specjalne zakonczenie, a nie jak kolejny rozdzial z teoria.',
            'Po obejrzeniu planszy wróć do listy lekcji albo przejdź do treningu, by utrwalic cały cykl.',
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
            'Przejdź dalej dopiero wtedy, gdy aktualna lekcja jest już w miare jasna.',
            'Jeśli temat dalej jest niepewny, zostan jeszcze chwilę na tej lekcji albo wróć do dokumentu.',
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
            'Sekcja postępu zbiera informacje o regularności, skuteczności i tempie pracy. Nie służy tylko do patrzenia na wynik. Pomaga zobaczyć, czy uczeń wraca do materiału, czy utrzymuje serię oraz gdzie potrzebuje jeszcze kilku spokojnych powtórek.',
          hints: [
            'Patrz nie tylko na liczbę punktów, ale tez na regularność.',
            'Jeśli postęp zwalnia, najlepszy ruch to krótka powtórka, a nie losowa nowa aktywność.',
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
            'Ranking służy do lekkiej motywacji i porównania wyników, ale nie jest najważniejszym celem nauki. Największa wartość daje wtedy, gdy pomaga zauważyć postęp, a nie tylko miejsce na liście.',
          hints: [
            'Najpierw patrz na własny postęp, dopiero potem na pozycje.',
            'Lepsza regularna seria spokojnych prób niż jedna szybka próba dla rankingu.',
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
          shortDescription: 'To skróty do najwazniejszych aktywności w Kangur.',
          fullDescription:
            'Szybkie akcje są po to, aby uczeń albo rodzic od razu przeszedł do najważniejszego następnego ruchu: lekcji, gry albo innego kroku zaproponowanego przez aplikację. To sekcja do szybkiego startu, bez szukania po całym ekranie.',
          hints: [
            'Użyj tej sekcji, gdy nie wiesz, od czego zacząć.',
            'Najczęściej najlepszy start to lekcja albo krótki trening w grze.',
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
            'Misja dnia ogranicza wybór do jednego sensownego celu. Zamiast wielu opcji uczeń dostaje jeden jasny kierunek: dokończyć lekcję, zagrać szybki trening albo wrócić do konkretnego obszaru.',
          hints: [
            'Traktuj misję jako jeden mały cel, nie jako długą listę zadań.',
            'Po wykonaniu misji warto sprawdzić postęp albo przejść do lekkiej powtórki.',
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
            'Priorytetowe zadania porządkują to, co uczeń powinien wykonać jako pierwsze. Ta sekcja zbiera zaległe, aktywne albo najbardziej potrzebne kroki, żeby nie trzeba było samemu zgadywać, co teraz da najwięcej korzyści.',
          hints: [
            'Zacznij od pierwszego zadania, nie od najłatwiejszego na oko.',
            'Jeśli zadanie prowadzi do lekcji, najpierw zrozum temat, potem przejdź do gry.',
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
            'Ekran gry jest miejscem na aktywna praktyke. Tutaj uczeń ćwiczy tempo, dokładność i powtarzalnosc. Gry nie zastepuja lekcji, tylko pomagaja utrwalic to, co uczeń już zobaczyl w materiale lub chce szybciej przepracowac.',
          hints: [
            'Najpierw dbaj o poprawne odpowiedzi, dopiero potem o szybkosc.',
            'Po kilku słabszych próbach wróć do lekcji albo wybierz łatwiejszy trening.',
            'Krótkie, regularne sesje daja więcej niż jedna bardzo długa próba.',
          ],
          relatedGames: ['Dodawanie', 'Odejmowanie', 'Mnozenie', 'Dzielenie'],
          relatedTests: ['Sprawdzenie po treningu'],
          followUpActions: [
            { id: 'game-open', label: 'Uruchom gre', page: 'Game' },
            { id: 'game-lessons', label: 'Wróć do lekcji', page: 'Lessons' },
          ],
          triggerPhrases: ['gra', 'ekran gry', 'jak działa ta gra', 'na czym polega ta gra'],
          sortOrder: 100,
        }),
        createGuideEntry({
          id: 'game-home-hero',
          surface: 'game',
          focusKind: 'hero',
          focusIdPrefixes: ['kangur-game-home-hero'],
          contentIdPrefixes: ['game:home'],
          title: 'Wprowadzenie do gry',
          shortDescription:
            'To górna karta startowa, która ustawia ucznia przed wybraniem aktywności.',
          fullDescription:
            'Wprowadzenie do gry zbiera główny kontekst ekranu startowego: po co jest ten widok, jak wygląda szybki start i gdzie uczeń przechodzi dalej. To miejsce pomaga zorientować się, zanim wybierze się konkretna aktywność albo zadanie.',
          hints: [
            'Najpierw przeczytaj nagłówek i główny opis, a dopiero potem wybierz kolejny ruch.',
            'Jeśli nie wiesz, od czego zacząć, po wprowadzeniu przejdź od razu do szybkich akcji albo misji dnia.',
          ],
          followUpActions: [
            { id: 'game-home-hero-open-actions', label: 'Wybierz aktywność', page: 'Game' },
            { id: 'game-home-hero-open-lessons', label: 'Przejdź do lekcji', page: 'Lessons' },
          ],
          triggerPhrases: ['wprowadzenie do gry', 'górna karta', 'start gry', 'o czym jest ten ekran'],
          sortOrder: 102,
        }),
        createGuideEntry({
          id: 'game-training-setup',
          surface: 'game',
          focusKind: 'screen',
          focusIdPrefixes: ['kangur-game-training-setup'],
          contentIdPrefixes: ['game:training-setup'],
          title: 'Konfiguracja treningu',
          shortDescription:
            'Tutaj ustawiasz jedna sesje treningowa: poziom, kategorie i liczbę pytań.',
          fullDescription:
            'Konfiguracja treningu służy do przygotowania jednej rundy ćwiczeń. Uczeń dobiera trudność, zakres kategorii i liczbę pytań, żeby dopasować tempo do aktualnej formy. To dobre miejsce, gdy trzeba zrobić krótszą, celowaną serię zamiast przechodzić przez cały materiał naraz.',
          hints: [
            'Najpierw wybierz poziom, który pozwoli utrzymac dokładność.',
            'Potem ogranicz kategorie do tego, co uczeń ćwiczy teraz najbardziej.',
            'Na start lepsza jest krótsza seria pytań niż zbyt długa runda bez przerwy.',
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
            'Tutaj wybierasz rodzaj gry lub szybkie ćwiczenie najlepiej pasujace do celu.',
          fullDescription:
            'Wybór rodzaju gry pomaga zdecydować, czy teraz lepszy będzie trening działań, kalendarz, figury albo inna szybka aktywność. Ta sekcja nie sprawdza jeszcze wyniku. Jej rola to skierować ucznia do rodzaju praktyki, który najlepiej utrwali aktualny temat albo rytm nauki.',
          hints: [
            'Wybierz aktywność zgodna z tym, co było ostatnio ćwiczone w lekcji.',
            'Jeśli uczeń potrzebuje powtórki podstaw, zacznij od prostszej gry zamiast od trybu konkursowego.',
          ],
          relatedGames: ['Dodawanie', 'Odejmowanie', 'Kalendarz', 'Figury'],
          followUpActions: [{ id: 'game-operation-selector-open', label: 'Wybierz gre', page: 'Game' }],
          triggerPhrases: [
            'wybór rodzaju gry',
            'wybór gry',
            'jaka gre wybrać',
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
            'Tutaj wybierasz edycje konkursu i zestaw zadań przed startem sesji.',
          fullDescription:
            'Konfiguracja sesji Kangura Matematycznego przygotowuje bardziej konkursowy tryb pracy. Uczeń wybiera wariant albo pakiet zadań, a potem przechodzi do dłuższych, bardziej problemowych pytań. To dobre miejsce, gdy trzeba poćwiczyć czytanie zadań i spokojniejsze myślenie wieloetapowe.',
          hints: [
            'Wybierz tryb, który odpowiada aktualnemu poziomowi ucznia.',
            'Jeśli uczeń dopiero wraca do tego typu zadań, lepiej zacząć od krótszej serii.',
          ],
          followUpActions: [{ id: 'game-kangur-setup-open', label: 'Przygotuj sesje', page: 'Game' }],
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
            'Czytaj cale zadanie przed ruszeniem z obliczeniami.',
            'Szukaj zależności między warunkami, zamiast liczyc od razu wszystko naraz.',
          ],
          relatedTests: ['Spokojna powtórka po sesji problemowej'],
          followUpActions: [{ id: 'game-kangur-session-open', label: 'Kontynuuj sesje', page: 'Game' }],
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
            'Ćwiczenia z kalendarzem utrwalaja orientacje w datach i czasie. Zadania zwykle wymagaja zauważenia kolejnosci dni, miesiecy albo przesunięć na osi czasu. To dobra aktywność, gdy trzeba połączyć matematyke z codziennym rozumieniem kalendarza.',
          hints: [
            'Najpierw ustal punkt startowy, a potem przesuwaj się dzień po dniu lub tydzień po tygodniu.',
            'Zwracaj uwagę, czy pytanie dotyczy dnia tygodnia, daty czy odstępu czasu.',
          ],
          relatedGames: ['Kalendarz'],
          followUpActions: [{ id: 'game-calendar-open', label: 'Cwicz kalendarz', page: 'Game' }],
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
            'Ćwiczenia z figurami pomagaja utrwalic nazwy ksztaltow, ich cechy oraz proste zależności przestrzenne. To dobra sekcja do laczenia patrzenia na rysunek z nazewnictwem i wyobraznia geometryczna.',
          hints: [
            'Najpierw nazwij figure albo jej ceche, zanim zaznaczysz odpowiedz.',
            'Jeśli trzeba cos narysowac lub rozpoznac, porównaj boki, kąty i osie symetrii.',
          ],
          relatedGames: ['Figury'],
          followUpActions: [{ id: 'game-geometry-open', label: 'Cwicz figury', page: 'Game' }],
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
            'To karta pokazujaca, jaki trening jest teraz najważniejszy do wykonania.',
          fullDescription:
            'Zadanie treningowe łączy plan nauki z jedna konkretna runda gry. Pokazuje, jaki zakres ćwiczeń warto uruchomić teraz, żeby nie wybierac przypadkowej aktywności. To most między ogólnym celem a jednym następnym ruchem w praktyce.',
          hints: [
            'Najpierw uruchom zadanie, które jest aktywne albo najwyzej na liście.',
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
            'Pytanie w grze pokazuje jedna aktywna próbę do rozwiązania. Uczeń powinien najpierw odczytać treść, rozpoznac typ zadania i dopiero potem odpowiedzieć. Tutor może podpowiedziec, na co patrzeć, ale nie powinien podawac gotowego wyniku zamiast ucznia.',
          hints: [
            'Najpierw nazwij w glowie, jaki to typ zadania: dodawanie, odejmowanie, mnozenie albo inna aktywność.',
            'Jeśli czujesz presję czasu, zwolnij na chwilę i upewnij się, co dokładnie pytanie chce sprawdzić.',
            'Dopiero po zrozumieniu treści przejdź do liczenia albo wyboru odpowiedzi.',
          ],
          relatedGames: ['Dodawanie', 'Odejmowanie', 'Mnozenie', 'Dzielenie'],
          triggerPhrases: [
            'pytanie w grze',
            'aktualne pytanie',
            'jak podejsc do tego pytania',
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
            'To miejsce do zobaczenia, co poszlo dobrze i co warto poprawic w kolejnej rundzie.',
          fullDescription:
            'Omówienie wyniku gry pomaga zauważyć wzor po zakończonej rundzie: czy problemem było tempo, nieuwaga albo konkretny typ zadań. Zamiast patrzeć tylko na liczbę punktów, warto sprawdzić, co było stabilne i jaki jeden ruch poprawi kolejna próbę.',
          hints: [
            'Nie oceniaj rundy tylko po jednym wyniku. Sprawdź, czy blad się powtarza.',
            'Po slabszej próbie wybierz jeden konkretny obszar do poprawy, zamiast zmieniac wszystko naraz.',
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
            'Ranking po rundzie jest dodatkiem do wyniku gry. Pomaga zobaczyć, jak dana próba wypada na tle innych, ale jego największa wartość polega na motywowaniu do regularnej poprawy, a nie do pogoni za pojedynczym miejscem.',
          hints: [
            'Najpierw przeczytaj własny wynik, a dopiero potem patrz na pozycje w rankingu.',
            'Jeśli pozycja jest nizsza niż oczekiwana, potraktuj to jako wskazówkę do spokojnej powtórki, nie jako porażkę.',
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
            'Podsumowanie gry zbiera wynik po próbie: skuteczność, tempo i ogólny efekt sesji. Najważniejsze jest tu uchwycenie wzoru: czy uczeń popełnia te same błędy, czy poprawia serię i czy warto jeszcze raz powtórzyć ten sam zakres.',
          hints: [
            'Jeśli dokładność spada, wróć do wolniejszego tempa.',
            'Jeśli wynik jest stabilny, dopiero wtedy zwieksz trudność albo tempo.',
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
            'Ekran testu sprawdza samodzielne rozumienie i gotowosc do rozwiązywania zadań. Test jest bardziej o spokojnym czytaniu i myśleniu niż o tempie. Tutor może tutaj pomagac z orientacja w ekranie i strategia podejścia, ale nie powinien zdradzac odpowiedzi.',
          hints: [
            'Najpierw przeczytaj cale polecenie i wszystkie odpowiedzi.',
            'Spróbuj samodzielnie rozwiązać zadanie przed siegnieciem po omówienie.',
            'Po odpowiedzi porównaj wynik z omowieniem, zamiast od razu zgadywać kolejna opcje.',
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
            'Ten stan oznacza, ze wybrany zestaw nie ma jeszcze opublikowanych pytań do rozwiązania.',
          fullDescription:
            'Pusty zestaw testowy pojawia się wtedy, gdy zestaw został utworzony, ale nie ma w nim jeszcze opublikowanych pytań. To nie jest blad ucznia ani sygnal, ze cos zrobil zle. Po prostu w tym miejscu nie ma jeszcze materiału do przejscia, wiec najlepiej wrócić do innego testu, lekcji albo gry.',
          hints: [
            'Jeśli spodziewasz się pytań, wybierz inny zestaw albo wróć później, gdy materiał zostanie opublikowany.',
            'To dobry moment, by przejść do lekcji lub krotkiej gry zamiast czekac bez celu.',
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
            'Podsumowanie testu zbiera wynik całej próby i pomaga zauważyć, gdzie uczeń radził sobie dobrze, a gdzie potrzebuje jeszcze powtórki. Nie chodzi tylko o końcowy procent. Ta sekcja podpowiada, czy najlepiej wrócić do lekcji, czy zrobić jeszcze jedną próbę.',
          hints: [
            'Patrz na błędy jako wskazówkę, do czego wrócić, a nie jako porażkę.',
            'Po słabszym teście najlepszy ruch to krótka powtórka konkretnego tematu.',
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
            'Sekcja pytania testowego pokazuje jedno zadanie wraz z odpowiedziami lub miejscem na rozwiazanie. Najważniejsze jest tutaj spokojne przeczytanie treści, zauważenie danych i dopiero potem wybór odpowiedzi. Tutor może podpowiedziec strategia czytania i myślenia, ale nie gotowy wynik.',
          hints: [
            'Przeczytaj pytanie od poczatku do konca jeszcze raz, zanim wybierzesz odpowiedz.',
            'Zwracaj uwagę na liczby, jednostki i slowa, które zmieniaja sens zadania.',
            'Gdy są odpowiedzi do wyboru, najpierw skresl te, które na pewno nie pasuja.',
          ],
          triggerPhrases: ['pytanie testowe', 'jak podejsc do pytania', 'co robi ta sekcja pytania'],
          sortOrder: 140,
        }),
        createGuideEntry({
          id: 'test-review',
          surface: 'test',
          focusKind: 'review',
          focusIdPrefixes: ['kangur-test-question:'],
          title: 'Omówienie po teście',
          shortDescription: 'Omówienie pomaga zrozumieć blad i wyciagnac jeden następny wniosek.',
          fullDescription:
            'Sekcja omówienia po teście wyjaśnia, co zadziałało, gdzie pojawił się błąd i jaki jeden krok poprawi kolejną próbę. To nie tylko miejsce na zobaczenie prawidłowej odpowiedzi. Najważniejsze jest zrozumienie, dlaczego właśnie taka odpowiedź jest poprawna.',
          hints: [
            'Najpierw porównaj swój tok myślenia z omowieniem.',
            'Zapisz albo zapamiętaj jeden konkretny blad, którego chcesz uniknąć następnym razem.',
          ],
          followUpActions: [{ id: 'test-review-lessons', label: 'Powtórz temat', page: 'Lessons' }],
          triggerPhrases: ['omówienie', 'recenzja odpowiedzi', 'wyjaśnij ten blad', 'co pokazuje omówienie'],
          sortOrder: 150,
        }),
        createGuideEntry({
          id: 'profile-overview',
          surface: 'profile',
          contentIdPrefixes: ['profile:'],
          title: 'Profil ucznia',
          shortDescription:
            'Profil ucznia zbiera postęp, rekomendacje i historie pracy w jednym miejscu.',
          fullDescription:
            'Profil ucznia pokazuje, jak wygląda nauka w dłuższej perspektywie. To nie jest pojedyncze zadanie do rozwiązania, tylko panel do czytania postępu, wybierania następnych priorytetow i zauważania, co idzie coraz lepiej.',
          hints: [
            'Najpierw spojrz na ogólny postęp, a dopiero potem przejdź do szczegolowych kart.',
            'To dobre miejsce, by zdecydować, czy lepszy będzie powrót do lekcji, czy kolejna próba w grze.',
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
            'Hero profilu ucznia jest szybkim podsumowaniem: pokazuje, czyj profil ogladasz i jak wygląda ogólny rytm nauki. To dobry punkt startowy przed przejsciem do kart z poziomem, wynikami i rekomendacjami.',
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
            'Sekcja nastroju Tutor-AI na profilu przeklada dane o aktywności ucznia na prostszy komunikat: czy warto utrzymac tempo, zwolnic, czy skupic się na jednym obszarze. To bardziej interpretacja niż ocena.',
          hints: [
            'Czytaj te wskazówki jako kierunek pracy, nie jako stopien czy werdykt.',
            'Jeśli karta sugeruje spokojniejsze tempo, wybierz jedna lekcje albo jeden rodzaj gry zamiast wielu naraz.',
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
            'Patrz na ten panel jako na miere regularności, a nie samej szybkosci.',
            'Jeśli do kolejnego poziomu zostało niewiele, dobrym ruchem jest krótka, skonczona sesja zamiast dlugiego maratonu.',
          ],
          followUpActions: [{ id: 'profile-level-progress-game', label: 'Zdobadz XP w grze', page: 'Game' }],
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
            'Ta karta zbiera najważniejsze liczby i pomaga szybko odczytać ogólna kondycje nauki.',
          fullDescription:
            'Przegląd wyników ucznia pokazuje najważniejsze wskaźniki w jednym miejscu: skuteczność, aktywność i ogólny obraz postępu. To dobra sekcja do szybkiego sprawdzenia, czy nauka idzie równo, czy pojawił się spadek, który warto zatrzymać.',
          hints: [
            'Nie patrz na jedna liczbę osobno. Najwięcej mowi zestaw kilku wskaznikow naraz.',
            'Jeśli widzisz spadek w jednym miejscu, sprawdź rekomendacje i historie sesji.',
          ],
          followUpActions: [{ id: 'profile-stats-overview-sessions', label: 'Zobacz historie sesji', page: 'LearnerProfile' }],
          triggerPhrases: ['przegląd wyników', 'główne statystyki', 'co oznaczaja te liczby'],
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
            'Rekomendacje porządkują kolejne ruchy: która lekcja, jaka gra albo jaki powrót da teraz najwięcej korzyści. Ich celem jest ograniczenie chaosu i wskazanie jednego sensownego priorytetu.',
          hints: [
            'Najlepiej wybrać jedną rekomendację i domknąć ją do końca, zamiast otwierać kilka naraz.',
            'Jeśli rekomendacja pokrywa się z ostatnim słabszym wynikiem, zacznij właśnie od niej.',
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
            'Ta karta pokazuje przydzielone zadania i pomaga ustalic, co jest do zrobienia teraz.',
          fullDescription:
            'Sekcja zadań na profilu ucznia zbiera aktywne obowiązki i priorytety. To miejsce do sprawdzenia, co zostało przypisane, co jest pilne i od czego najlepiej zacząć najbliższa sesje.',
          hints: [
            'Najpierw szukaj zadań oznaczonych jako najpilniejsze albo zwiazanych z ostatnim spadkiem wyników.',
            'Po wykonaniu jednego zadania wróć na profil i sprawdź, czy priorytet się zmienil.',
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
            'Panel opanowania materiału grupuje tematy według sily ucznia. Pozwala szybko zobaczyć, czy problem dotyczy jednego konkretnego zakresu, czy szerszego wzoru powtarzajacego się w kilku miejscach.',
          hints: [
            'Zacznij od najslabszego obszaru, a nie od tego, który wydaje się najłatwiejszy.',
            'Jeśli dwa obszary są podobnie slabe, wybierz ten, który czesciej wraca w zadaniach.',
          ],
          followUpActions: [{ id: 'profile-mastery-lessons', label: 'Powtórz temat', page: 'Lessons' }],
          triggerPhrases: ['opanowanie materiału', 'mocne i slabe obszary', 'które tematy wymagaja powtórki'],
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
            'Skuteczność ucznia pomaga ocenic, czy aktualny poziom trudności jest dobrze dobrany. Gdy wynik jest stabilny, można myśleć o kolejnym kroku. Gdy mocno faluje, lepiej wracać do krotszych i bardziej przewidywalnych sesji.',
          hints: [
            'Stabilny sredni wynik bywa cenniejszy niż pojedynczy wysoki skok.',
            'Jeśli skuteczność spada po zwiększeniu trudności, warto chwilowo cofnac poziom.',
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
            'Historia sesji ucznia pozwala odczytać wzor nauki: jak czesto uczeń wraca, ile trwaja sesje i czy po słabszych wynikach pojawia się poprawa. To dobre miejsce do szukania regularności, nie pojedynczych wyjątków.',
          hints: [
            'Patrz na kilka ostatnich sesji razem, zamiast wyciągać wnioski z jednej próby.',
            'Jeśli widzisz długa przerwę, zacznij od krótszego powrotu zamiast od najtrudniejszego zadania.',
          ],
          followUpActions: [{ id: 'profile-sessions-game', label: 'Wróć do gry', page: 'Game' }],
          triggerPhrases: ['historia sesji', 'ostatnie próby', 'jak czesto uczeń ćwiczy'],
          sortOrder: 169,
        }),
        createGuideEntry({
          id: 'parent-dashboard-overview',
          surface: 'parent_dashboard',
          contentIdPrefixes: ['parent-dashboard:'],
          title: 'Panel rodzica',
          shortDescription:
            'Panel rodzica zbiera nadzor nad uczniem: postęp, wyniki, zadania i ustawienia profilu.',
          fullDescription:
            'Panel rodzica nie służy do rozwiązywania zadań, tylko do czytania obrazu nauki i ustawiania kolejnych priorytetow. To miejsce do spokojnego sprawdzenia, co dzieje się z uczniem i jaki następny ruch ma największy sens.',
          hints: [
            'Najpierw wybierz zakładkę zgodna z tym, czego chcesz się dowiedziec: postęp, wyniki, zadania albo Tutor-AI.',
            'Najlepiej wyciągać jeden konkretny wniosek i od razu zamieniac go na dzialanie dla ucznia.',
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
            'Gdy panel rodzica jest niedostepny, hero pokazuje stan dostępu zamiast danych ucznia. To nie jest blad systemu. Najczęściej oznacza, ze trzeba zalogować się na konto z uprawnieniami rodzica albo nauczyciela.',
          hints: [
            'Jeśli chcesz zarządzać uczniami, sprawdź, czy używasz konta z odpowiednia rola.',
            'Po uzyskaniu dostępu wróć do panelu i dopiero wtedy przegladnij zakładki.',
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
            'Hero dashboardu rodzica pomaga od razu zorientować się, dla którego ucznia czytasz dane i jaki jest cel tego ekranu. To punkt startowy przed przejsciem do zarządzania uczniami albo do aktywnej zakładki.',
          hints: [
            'Najpierw upewnij się, ze wybrany jest właściwy uczeń.',
            'Potem przejdź do zakładki odpowiadajacej pytaniu, na które chcesz odpowiedzieć.',
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
            'Te zakładki dzielą panel rodzica na postęp, wyniki, zadania i wsparcie Tutor-AI.',
          fullDescription:
            'Zakładki porządkują panel rodzica według celu. Zamiast czytać wszystko naraz, można wejść tylko w ten rodzaj informacji, który jest teraz potrzebny: postęp, wyniki, zadania albo wskazówki od Tutor-AI.',
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
            'Ta zakładka pokazuje wyniki ucznia i pomaga odczytać ich stabilnosc.',
          fullDescription:
            'Zakładka wyników służy do analizy skuteczności ucznia z perspektywy rodzica. Pozwala zobaczyć, czy wyniki są równe, czy mocno się wahają oraz czy aktualny poziom wyzwania jest adekwatny.',
          hints: [
            'Nie oceniaj ucznia po jednej próbie. Szukaj wzoru w kilku wynikach.',
            'Po słabszym wyniku sprawdź, czy warto wrócić do lekcji albo uprościć zakres gry.',
          ],
          followUpActions: [{ id: 'parent-dashboard-scores-lessons', label: 'Powtórz temat', page: 'Lessons' }],
          triggerPhrases: ['wyniki ucznia w panelu rodzica', 'jak czytać wyniki', 'co oznaczaja te liczby'],
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
            'Zakładka zadań w panelu rodzica służy do planowania najbliższej pracy ucznia. Pokazuje, co jest aktywne, co wymaga pilnego domknięcia i jaki obszar nauki powinien miec teraz pierwszenstwo.',
          hints: [
            'Najlepiej utrzymywac jedna główną rzecz do zrobienia, zamiast wielu równoległych priorytetow.',
            'Jeśli zadanie nie pasuje do aktualnego poziomu ucznia, najpierw wróć do profilu i sprawdź opanowanie materiału.',
          ],
          followUpActions: [{ id: 'parent-dashboard-assignments-game', label: 'Przejdź do gry', page: 'Game' }],
          triggerPhrases: ['zadania ucznia w panelu rodzica', 'co jest przypisane', 'priorytety dla ucznia'],
          sortOrder: 177,
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
            'Zakładka Tutor-AI dla rodzica nie zastępuje danych, tylko je interpretuje. To miejsce do zadawania pytań o postęp ucznia, priorytety i sens kolejnych ruchów, gdy same liczby nie wystarczaja do podjęcia decyzji.',
          hints: [
            'Najpierw sformułuj jedno konkretne pytanie, na które chcesz odpowiedzi.',
            'Najlepsze efekty daje łączenie tej zakładki z danymi z postępu, wyników albo zadań.',
          ],
          followUpActions: [{ id: 'parent-dashboard-ai-tutor-profile', label: 'Zobacz profil ucznia', page: 'LearnerProfile' }],
          triggerPhrases: ['tutor-ai dla rodzica', 'jak korzystać z tej zakładki', 'co mogę zapytac tutaj'],
          sortOrder: 178,
        }),
        createGuideEntry({
          id: 'auth-overview',
          surface: 'auth',
          contentIdPrefixes: ['auth:login:'],
          title: 'Ekran logowania i zakładania konta',
          shortDescription:
            'To wspólny ekran wejścia do Kangur dla ucznia i rodzica, z miejscem na logowanie oraz założenie konta rodzica.',
          fullDescription:
            'Ekran logowania porządkuje dwa scenariusze: uczeń wchodzi nickiem i hasłem, a rodzic emailem i hasłem albo zakłada nowe konto. Tutor może tu tłumaczyć, które pole do czego służy, czym różni się logowanie ucznia od rodzica i kiedy trzeba przełączyć formularz na tworzenie konta.',
          hints: [
            'Najpierw ustal, czy loguje się uczeń, czy rodzic, bo od tego zależy jaki identyfikator trzeba wpisać.',
            'Jeśli rodzic nie ma jeszcze konta, przejdź na tryb tworzenia konta zamiast próbować zgadywać hasło.',
          ],
          triggerPhrases: [
            'ekran logowania',
            'jak działa logowanie',
            'jak założyć konto rodzica',
            'co mogę tutaj zrobić',
          ],
          sortOrder: 179,
        }),
        createGuideEntry({
          id: 'auth-login-form',
          surface: 'auth',
          focusKind: 'login_form',
          focusIdPrefixes: ['kangur-auth-login-form'],
          contentIdPrefixes: ['auth:login:'],
          title: 'Formularz logowania Kangur',
          shortDescription:
            'Ten formularz zbiera dane potrzebne do wejścia ucznia albo rodzica do aplikacji.',
          fullDescription:
            'Formularz logowania łączy dwa tryby pracy: zwykle logowanie i założenie konta rodzica. W zależności od wybranego scenariusza pokazuje odpowiednie pola, komunikaty i przycisk akcji, dlatego Tutor-AI powinien wyjaśniać nie tylko gdzie wpisać dane, ale tez jaki tryb jest teraz aktywny.',
          hints: [
            'Jeśli na formularzu widać tryb tworzenia konta, rodzic powinien wpisać email i nowe hasło, a nie dane ucznia.',
            'Gdy uczeń loguje się nickiem, najważniejsze jest poprawne wpisanie identyfikatora bez spacji.',
          ],
          triggerPhrases: [
            'formularz logowania',
            'sekcja logowania',
            'jak wypełnić ten formularz',
            'co oznacza ten formularz',
          ],
          sortOrder: 180,
        }),
        createGuideEntry({
          id: 'auth-login-identifier-field',
          surface: 'auth',
          focusKind: 'login_identifier_field',
          focusIdPrefixes: ['kangur-auth-login-identifier-field'],
          contentIdPrefixes: ['auth:login:'],
          title: 'Pole identyfikatora logowania',
          shortDescription:
            'To pole przyjmuje email rodzica albo nick ucznia, zaleznnie od tego kto wchodzi do Kangur.',
          fullDescription:
            'Pole identyfikatora jest pierwszym krokiem logowania. Dla rodzica oczekuje adresu email, a dla ucznia prostego nicku. Tutor-AI powinien pomagac rozróżnić te dwa przypadki i przypominac, ze od poprawnego typu identyfikatora zależy dalsze powodzenie logowania.',
          hints: [
            'Rodzic wpisuje pełny email z symbolem @.',
            'Uczeń wpisuje swój nick dokładnie tak, jak został zapisany w Kangur.',
          ],
          triggerPhrases: [
            'pole logowania',
            'co wpisać tutaj',
            'email czy nick',
            'identyfikator logowania',
          ],
          sortOrder: 181,
        }),
        createGuideEntry({
          id: 'auth-create-account-action',
          surface: 'auth',
          focusKind: 'create_account_action',
          focusIdPrefixes: ['kangur-auth-create-account-action'],
          title: 'Akcja utworzenia konta',
          shortDescription:
            'Ten przycisk prowadzi rodzica do założenia nowego konta zamiast zwyklego logowania.',
          fullDescription:
            'Akcja utworzenia konta jest przeznaczona dla rodzica, który jeszcze nie ma danych do logowania. Po jej wybraniu formularz przechodzi w tryb rejestracji i zaczyna prowadzić przez utworzenie konta oraz potwierdzenie emaila.',
          hints: [
            'Użyj tej akcji wtedy, gdy rodzic wchodzi pierwszy raz i nie ma jeszcze hasla.',
            'Po zalozeniu konta trzeba zwykle potwierdzić adres email, zanim logowanie zacznie działać.',
          ],
          triggerPhrases: [
            'utworz konto',
            'jak założyć konto',
            'po co ten przycisk',
            'tworzenie konta rodzica',
          ],
          sortOrder: 182,
        }),
        createGuideEntry({
          id: 'auth-login-action',
          surface: 'auth',
          focusKind: 'login_action',
          focusIdPrefixes: ['kangur-auth-login-action'],
          title: 'Akcja logowania',
          shortDescription:
            'Ten przycisk prowadzi do wejścia na istniejace konto ucznia albo rodzica.',
          fullDescription:
            'Akcja logowania służy do przejscia na ekran, na którym wpisuje się istniejace dane dostepowe. Tutor-AI powinien tłumaczyć, ze to właściwa droga dla osob, które maja już konto, a nie dla rodzica dopiero tworzacego pierwszy dostęp.',
          hints: [
            'Kliknij logowanie, gdy konto jest już założone i trzeba tylko podac dane.',
            'Jeśli rodzic jeszcze nie ma konta, lepszym wyborem będzie akcja utworzenia konta.',
          ],
          triggerPhrases: [
            'zaloguj się',
            'jak wejść do konta',
            'po co ten przycisk logowania',
            'mam już konto',
          ],
          sortOrder: 183,
        }),
        ],
      })
    )
  );

const isPlainNativeGuideObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const mergeNativeGuideEntry = (
  baseEntry: KangurAiTutorNativeGuideEntry,
  entry: unknown
): KangurAiTutorNativeGuideEntry => {
  const nextEntry = isPlainNativeGuideObject(entry) ? entry : {};
  return kangurAiTutorNativeGuideEntrySchema.parse({
    ...baseEntry,
    ...nextEntry,
    surface: nextEntry['surface'] === undefined ? baseEntry.surface : nextEntry['surface'],
    focusKind: nextEntry['focusKind'] === undefined ? baseEntry.focusKind : nextEntry['focusKind'],
    focusIdPrefixes:
      nextEntry['focusIdPrefixes'] === undefined ? baseEntry.focusIdPrefixes : nextEntry['focusIdPrefixes'],
    contentIdPrefixes:
      nextEntry['contentIdPrefixes'] === undefined
        ? baseEntry.contentIdPrefixes
        : nextEntry['contentIdPrefixes'],
    hints: nextEntry['hints'] === undefined ? baseEntry.hints : nextEntry['hints'],
    relatedGames:
      nextEntry['relatedGames'] === undefined ? baseEntry.relatedGames : nextEntry['relatedGames'],
    relatedTests:
      nextEntry['relatedTests'] === undefined ? baseEntry.relatedTests : nextEntry['relatedTests'],
    followUpActions:
      nextEntry['followUpActions'] === undefined
        ? baseEntry.followUpActions
        : nextEntry['followUpActions'],
    triggerPhrases:
      nextEntry['triggerPhrases'] === undefined
        ? baseEntry.triggerPhrases
        : nextEntry['triggerPhrases'],
    enabled: nextEntry['enabled'] === undefined ? baseEntry.enabled : nextEntry['enabled'],
    sortOrder: nextEntry['sortOrder'] === undefined ? baseEntry.sortOrder : nextEntry['sortOrder'],
  });
};

export const mergeKangurAiTutorNativeGuideStore = (
  baseStore: KangurAiTutorNativeGuideStore,
  value: unknown
): KangurAiTutorNativeGuideStore => {
  const valueObject = isPlainNativeGuideObject(value) ? value : {};
  const rawEntries = Array.isArray(valueObject['entries']) ? valueObject['entries'] : [];
  const baseEntriesById = new Map(baseStore.entries.map((entry) => [entry.id, entry]));
  const seenEntryIds = new Set<string>();
  const mergedEntries: KangurAiTutorNativeGuideEntry[] = [];

  for (const rawEntry of rawEntries) {
    if (!isPlainNativeGuideObject(rawEntry)) {
      continue;
    }

    const rawId = typeof rawEntry['id'] === 'string' ? rawEntry['id'].trim() : '';
    if (!rawId || seenEntryIds.has(rawId)) {
      continue;
    }
    seenEntryIds.add(rawId);

    const baseEntry = baseEntriesById.get(rawId);
    mergedEntries.push(
      baseEntry
        ? mergeNativeGuideEntry(baseEntry, rawEntry)
        : kangurAiTutorNativeGuideEntrySchema.parse(rawEntry)
    );
  }

  for (const baseEntry of baseStore.entries) {
    if (!seenEntryIds.has(baseEntry.id)) {
      mergedEntries.push(baseEntry);
    }
  }

  return kangurAiTutorNativeGuideStoreSchema.parse({
    ...baseStore,
    ...valueObject,
    locale:
      typeof valueObject['locale'] === 'string' && valueObject['locale'].trim().length > 0
        ? valueObject['locale']
        : baseStore.locale,
    version: Math.max(
      baseStore.version,
      typeof valueObject['version'] === 'number' && Number.isInteger(valueObject['version'])
        ? valueObject['version']
        : baseStore.version
    ),
    entries: mergedEntries,
  });
};

export function parseKangurAiTutorNativeGuideStore(
  raw: unknown
): KangurAiTutorNativeGuideStore {
  return kangurAiTutorNativeGuideStoreSchema.parse(raw);
}
