import { z } from 'zod';

import {
  kangurAiTutorFocusKindSchema,
  kangurAiTutorFollowUpActionSchema,
  kangurAiTutorSurfaceSchema,
  type KangurAiTutorFocusKind,
  type KangurAiTutorFollowUpAction,
  type KangurAiTutorSurface,
} from './kangur-ai-tutor';

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
  version: z.number().int().positive().default(2),
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
    kangurAiTutorNativeGuideStoreSchema.parse({
      locale: 'pl',
      version: 2,
      entries: [
        createGuideEntry({
          id: 'lesson-overview',
          surface: 'lesson',
          contentIdPrefixes: ['lesson-'],
          title: 'Ekran lekcji',
          shortDescription: 'To tutaj uczen przechodzi przez temat krok po kroku.',
          fullDescription:
            'Ekran lekcji prowadzi ucznia przez jeden temat matematyczny lub logiczny. Zawiera wprowadzenie, glowna tresc, przyklady, aktywnosci i krotkie sprawdzenie rozumienia. To najlepsze miejsce, gdy trzeba najpierw zrozumiec temat, a dopiero potem przejsc do treningu.',
          hints: [
            'Najpierw przeczytaj naglowek i opis lekcji, aby wiedziec, czego dotyczy material.',
            'Potem przejdz przez dokument lub aktywnosc po kolei, bez przeskakiwania miedzy blokami.',
            'Gdy temat zacznie byc jasny, dopiero wtedy przejdz do gry lub kolejnej proby.',
          ],
          relatedGames: ['Szybki trening dzialan', 'Powtorka po lekcji'],
          relatedTests: ['Sprawdzenie po zakonczonej lekcji'],
          followUpActions: [
            { id: 'lesson-open-library', label: 'Otworz lekcje', page: 'Lessons' },
            { id: 'lesson-open-training', label: 'Przejdz do gry', page: 'Game' },
          ],
          triggerPhrases: [
            'lekcja',
            'ekran lekcji',
            'co moge tutaj zrobic',
            'jak dziala ta lekcja',
            'na czym polega ta lekcja',
          ],
          sortOrder: 10,
        }),
        createGuideEntry({
          id: 'lesson-header',
          surface: 'lesson',
          focusKind: 'lesson_header',
          focusIdPrefixes: ['kangur-lesson-header'],
          title: 'Naglowek lekcji',
          shortDescription: 'Naglowek pokazuje temat, poziom i glowny cel tej lekcji.',
          fullDescription:
            'Naglowek lekcji zbiera najwazniejsze informacje o aktualnym materiale: tytul, opis i punkt startowy. Dzieki temu uczen od razu widzi, czego bedzie sie uczyl i jaki rodzaj cwiczen pojawi sie dalej.',
          hints: [
            'Zacznij od przeczytania opisu pod tytulem.',
            'Jesli temat brzmi nowo, przechodz dalej wolniej i sprawdzaj przyklady.',
          ],
          followUpActions: [{ id: 'lesson-header-open', label: 'Wroc do lekcji', page: 'Lessons' }],
          triggerPhrases: ['naglowek', 'tytul lekcji', 'opis lekcji', 'o czym jest ta lekcja'],
          sortOrder: 20,
        }),
        createGuideEntry({
          id: 'lesson-document',
          surface: 'lesson',
          focusKind: 'document',
          focusIdPrefixes: ['kangur-lesson-document'],
          title: 'Glowna tresc lekcji',
          shortDescription: 'To glowny material z objasnieniami, obrazami i przykladami.',
          fullDescription:
            'Glowna tresc lekcji zawiera wyjasnienia tematu, ilustracje, przyklady i kroki rozwiazywania. To sekcja do spokojnego czytania i zrozumienia zasad, zanim uczen zacznie szybciej odpowiadac w grze albo tescie.',
          hints: [
            'Czytaj po jednym bloku i zatrzymuj sie po kazdym przykladzie.',
            'Jesli jest rysunek lub ilustracja, polacz ja z tym, co jest napisane obok.',
            'Po kazdej czesci warto sprobowac wlasnymi slowami powiedziec, o co chodzi.',
          ],
          relatedGames: ['Trening po przeczytaniu lekcji'],
          followUpActions: [{ id: 'lesson-document-open', label: 'Czytaj dalej', page: 'Lessons' }],
          triggerPhrases: ['dokument', 'glowna tresc', 'sekcja z materialem', 'wyjasnij ta sekcje'],
          sortOrder: 30,
        }),
        createGuideEntry({
          id: 'lesson-assignment',
          surface: 'lesson',
          focusKind: 'assignment',
          focusIdPrefixes: ['kangur-lesson-assignment'],
          title: 'Zadanie powiazane z lekcja',
          shortDescription: 'To szybki most miedzy lekcja a praktyka.',
          fullDescription:
            'Sekcja zadania pokazuje, jaka praktyka jest powiazana z ta lekcja. Moze prowadzic do dalszej czesci materialu albo do treningu w grze. Jej rola to zamienic teorie z lekcji na konkretny nastepny krok.',
          hints: [
            'Najpierw zakoncz biezacy fragment lekcji, potem przejdz do zadania.',
            'Jesli zadanie prowadzi do gry, skup sie na dokladnosci, a nie tylko na tempie.',
          ],
          followUpActions: [{ id: 'lesson-assignment-game', label: 'Uruchom trening', page: 'Game' }],
          triggerPhrases: ['zadanie', 'co dalej po lekcji', 'nastepny krok po lekcji'],
          sortOrder: 40,
        }),
        createGuideEntry({
          id: 'shared-progress',
          focusKind: 'progress',
          focusIdPrefixes: ['kangur-game-home-progress'],
          contentIdPrefixes: ['game:home'],
          title: 'Postep',
          shortDescription: 'Postep pokazuje, jak regularnie i jak skutecznie uczen pracuje.',
          fullDescription:
            'Sekcja postepu zbiera informacje o regularnosci, skutecznosci i tempie pracy. Nie sluzy tylko do patrzenia na wynik. Pomaga zobaczyc, czy uczen wraca do materialu, czy utrzymuje serie oraz gdzie potrzebuje jeszcze kilku spokojnych powtorek.',
          hints: [
            'Patrz nie tylko na liczbe punktow, ale tez na regularnosc.',
            'Jesli postep zwalnia, najlepszy ruch to krotka powtorka, a nie losowa nowa aktywnosc.',
          ],
          followUpActions: [
            { id: 'progress-profile', label: 'Otworz profil', page: 'LearnerProfile' },
            { id: 'progress-lessons', label: 'Wroc do lekcji', page: 'Lessons' },
          ],
          triggerPhrases: ['postep', 'jak idzie', 'wyniki postepu', 'co pokazuje postep'],
          sortOrder: 50,
        }),
        createGuideEntry({
          id: 'shared-leaderboard',
          focusKind: 'leaderboard',
          focusIdPrefixes: ['kangur-game-home-leaderboard'],
          contentIdPrefixes: ['game:home'],
          title: 'Ranking',
          shortDescription: 'Ranking pokazuje wyniki i pozycje na tle innych prob.',
          fullDescription:
            'Ranking sluzy do lekkiej motywacji i porownania wynikow, ale nie jest najwazniejszym celem nauki. Najwieksza wartosc daje wtedy, gdy pomaga zauwazyc postep, a nie tylko miejsce na liscie.',
          hints: [
            'Najpierw patrz na wlasny postep, dopiero potem na pozycje.',
            'Lepsza regularna seria spokojnych prob niz jedna szybka proba dla rankingu.',
          ],
          followUpActions: [{ id: 'leaderboard-profile', label: 'Zobacz profil', page: 'LearnerProfile' }],
          triggerPhrases: ['ranking', 'tablica wynikow', 'pozycja', 'jak dziala ranking'],
          sortOrder: 60,
        }),
        createGuideEntry({
          id: 'shared-home-actions',
          focusKind: 'home_actions',
          focusIdPrefixes: ['kangur-game-home-actions'],
          contentIdPrefixes: ['game:home'],
          title: 'Szybkie akcje',
          shortDescription: 'To skroty do najwazniejszych aktywnosci w Kangur.',
          fullDescription:
            'Szybkie akcje sa po to, aby uczen albo rodzic od razu przeszedl do najwazniejszego nastepnego ruchu: lekcji, gry albo innego kroku zaproponowanego przez aplikacje. To sekcja do szybkiego startu, bez szukania po calym ekranie.',
          hints: [
            'Uzyj tej sekcji, gdy nie wiesz, od czego zaczac.',
            'Najczesciej najlepszy start to lekcja albo krotki trening w grze.',
          ],
          followUpActions: [
            { id: 'home-actions-lessons', label: 'Przejdz do lekcji', page: 'Lessons' },
            { id: 'home-actions-game', label: 'Przejdz do gry', page: 'Game' },
          ],
          triggerPhrases: ['szybkie akcje', 'skroty', 'od czego zaczac', 'co mam uruchomic'],
          sortOrder: 70,
        }),
        createGuideEntry({
          id: 'shared-home-quest',
          focusKind: 'home_quest',
          focusIdPrefixes: ['kangur-game-home-quest'],
          contentIdPrefixes: ['game:home'],
          title: 'Misja dnia',
          shortDescription: 'Misja dnia podpowiada jeden maly, konkretny cel na teraz.',
          fullDescription:
            'Misja dnia ogranicza wybor do jednego sensownego celu. Zamiast wielu opcji uczen dostaje jeden jasny kierunek: dokonczyc lekcje, zagrac szybki trening albo wrocic do konkretnego obszaru.',
          hints: [
            'Traktuj misje jako jeden maly cel, nie jako dluga liste zadan.',
            'Po wykonaniu misji warto sprawdzic postep albo przejsc do lekkiej powtorki.',
          ],
          followUpActions: [
            { id: 'home-quest-lessons', label: 'Realizuj w lekcjach', page: 'Lessons' },
            { id: 'home-quest-game', label: 'Realizuj w grze', page: 'Game' },
          ],
          triggerPhrases: ['misja', 'misja dnia', 'cel na dzis', 'co robi ta misja'],
          sortOrder: 80,
        }),
        createGuideEntry({
          id: 'shared-priority-assignments',
          focusKind: 'priority_assignments',
          focusIdPrefixes: ['kangur-game-home-assignments'],
          contentIdPrefixes: ['game:home'],
          title: 'Priorytetowe zadania',
          shortDescription: 'To najwazniejsze rzeczy do zrobienia w tej chwili.',
          fullDescription:
            'Priorytetowe zadania porzadkuja to, co uczen powinien wykonac jako pierwsze. Ta sekcja zbiera zalegle, aktywne albo najbardziej potrzebne kroki, zeby nie trzeba bylo samemu zgadywac, co teraz da najwiecej korzysci.',
          hints: [
            'Zacznij od pierwszego zadania, nie od najlatwiejszego na oko.',
            'Jesli zadanie prowadzi do lekcji, najpierw zrozum temat, potem przejdz do gry.',
          ],
          followUpActions: [{ id: 'priority-assignments-open', label: 'Przejdz do lekcji', page: 'Lessons' }],
          triggerPhrases: ['zadania priorytetowe', 'priorytety', 'co mam zrobic najpierw'],
          sortOrder: 90,
        }),
        createGuideEntry({
          id: 'game-overview',
          surface: 'game',
          contentIdPrefixes: ['game:home'],
          title: 'Ekran gry',
          shortDescription: 'Gra sluzy do szybkiego treningu i utrwalania materialu.',
          fullDescription:
            'Ekran gry jest miejscem na aktywna praktyke. Tutaj uczen cwiczy tempo, dokladnosc i powtarzalnosc. Gry nie zastepuja lekcji, tylko pomagaja utrwalic to, co uczen juz zobaczyl w materiale lub chce szybciej przepracowac.',
          hints: [
            'Najpierw dbaj o poprawne odpowiedzi, dopiero potem o szybkosc.',
            'Po kilku slabszych probach wroc do lekcji albo wybierz latwiejszy trening.',
            'Krotkie, regularne sesje daja wiecej niz jedna bardzo dluga proba.',
          ],
          relatedGames: ['Dodawanie', 'Odejmowanie', 'Mnozenie', 'Dzielenie'],
          relatedTests: ['Sprawdzenie po treningu'],
          followUpActions: [
            { id: 'game-open', label: 'Uruchom gre', page: 'Game' },
            { id: 'game-lessons', label: 'Wroc do lekcji', page: 'Lessons' },
          ],
          triggerPhrases: ['gra', 'ekran gry', 'jak dziala ta gra', 'na czym polega ta gra'],
          sortOrder: 100,
        }),
        createGuideEntry({
          id: 'game-training-setup',
          surface: 'game',
          contentIdPrefixes: ['game:training-setup'],
          title: 'Konfiguracja treningu',
          shortDescription:
            'Tutaj ustawiasz jedna sesje treningowa: poziom, kategorie i liczbe pytan.',
          fullDescription:
            'Konfiguracja treningu sluzy do przygotowania jednej rundy cwiczen. Uczen dobiera trudnosc, zakres kategorii i liczbe pytan, zeby dopasowac tempo do aktualnej formy. To dobre miejsce, gdy trzeba zrobic krotsza, celowana serie zamiast przechodzic przez caly material naraz.',
          hints: [
            'Najpierw wybierz poziom, ktory pozwoli utrzymac dokladnosc.',
            'Potem ogranicz kategorie do tego, co uczen cwiczy teraz najbardziej.',
            'Na start lepsza jest krotsza seria pytan niz zbyt dluga runda bez przerwy.',
          ],
          followUpActions: [{ id: 'game-training-setup-open', label: 'Skonfiguruj trening', page: 'Game' }],
          triggerPhrases: [
            'konfiguracja treningu',
            'trening mieszany',
            'ustawienia treningu',
            'dobierz poziom',
            'liczbe pytan',
            'kategorie',
          ],
          sortOrder: 105,
        }),
        createGuideEntry({
          id: 'game-operation-selector',
          surface: 'game',
          contentIdPrefixes: ['game:operation-selector'],
          title: 'Wybor rodzaju gry',
          shortDescription:
            'Tutaj wybierasz rodzaj gry lub szybkie cwiczenie najlepiej pasujace do celu.',
          fullDescription:
            'Wybor rodzaju gry pomaga zdecydowac, czy teraz lepszy bedzie trening dzialan, kalendarz, figury albo inna szybka aktywnosc. Ta sekcja nie sprawdza jeszcze wyniku. Jej rola to skierowac ucznia do rodzaju praktyki, ktory najlepiej utrwali aktualny temat albo rytm nauki.',
          hints: [
            'Wybierz aktywnosc zgodna z tym, co bylo ostatnio cwiczone w lekcji.',
            'Jesli uczen potrzebuje powtorki podstaw, zacznij od prostszej gry zamiast od trybu konkursowego.',
          ],
          relatedGames: ['Dodawanie', 'Odejmowanie', 'Kalendarz', 'Figury'],
          followUpActions: [{ id: 'game-operation-selector-open', label: 'Wybierz gre', page: 'Game' }],
          triggerPhrases: [
            'wybor rodzaju gry',
            'wybor gry',
            'jaka gre wybrac',
            'rodzaj gry',
            'wybor dzialania',
          ],
          sortOrder: 106,
        }),
        createGuideEntry({
          id: 'game-kangur-setup',
          surface: 'game',
          contentIdPrefixes: ['game:kangur:setup'],
          title: 'Konfiguracja sesji Kangura Matematycznego',
          shortDescription:
            'Tutaj wybierasz edycje konkursu i zestaw zadan przed startem sesji.',
          fullDescription:
            'Konfiguracja sesji Kangura Matematycznego przygotowuje bardziej konkursowy tryb pracy. Uczen wybiera wariant albo pakiet zadan, a potem przechodzi do dluzszych, bardziej problemowych pytan. To dobre miejsce, gdy trzeba pocwiczyc czytanie zadan i spokojniejsze myslenie wieloetapowe.',
          hints: [
            'Wybierz tryb, ktory odpowiada aktualnemu poziomowi ucznia.',
            'Jesli uczen dopiero wraca do tego typu zadan, lepiej zaczac od krotszej serii.',
          ],
          followUpActions: [{ id: 'game-kangur-setup-open', label: 'Przygotuj sesje', page: 'Game' }],
          triggerPhrases: [
            'konfiguracja sesji kangura matematycznego',
            'konfiguracja kangura',
            'edycje konkursu',
            'zestaw zadan',
            'kangur setup',
          ],
          sortOrder: 107,
        }),
        createGuideEntry({
          id: 'game-kangur-session',
          surface: 'game',
          contentIdPrefixes: ['game:kangur:'],
          title: 'Sesja Kangura Matematycznego',
          shortDescription:
            'Tutaj uczen rozwiazuje zadania w bardziej konkursowym, problemowym stylu.',
          fullDescription:
            'Sesja Kangura Matematycznego to tryb zadan, w ktorym liczy sie uwazne czytanie, laczenie kilku informacji i spokojne planowanie rozwiazania. To nie jest tylko szybki trening reakcji. Najwieksza wartosc daje zatrzymanie sie na tresci i sprawdzanie, co dokladnie pyta zadanie.',
          hints: [
            'Czytaj cale zadanie przed ruszeniem z obliczeniami.',
            'Szukaj zaleznosci miedzy warunkami, zamiast liczyc od razu wszystko naraz.',
          ],
          relatedTests: ['Spokojna powtorka po sesji problemowej'],
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
          contentIdPrefixes: ['game:calendar_quiz'],
          title: 'Cwiczenia z kalendarzem',
          shortDescription:
            'Tutaj uczen cwiczy daty, dni tygodnia, miesiace i zaleznosci w kalendarzu.',
          fullDescription:
            'Cwiczenia z kalendarzem utrwalaja orientacje w datach i czasie. Zadania zwykle wymagaja zauważenia kolejnosci dni, miesiecy albo przesuniec na osi czasu. To dobra aktywnosc, gdy trzeba polaczyc matematyke z codziennym rozumieniem kalendarza.',
          hints: [
            'Najpierw ustal punkt startowy, a potem przesuwaj sie dzien po dniu lub tydzien po tygodniu.',
            'Zwracaj uwage, czy pytanie dotyczy dnia tygodnia, daty czy odstepu czasu.',
          ],
          relatedGames: ['Kalendarz'],
          followUpActions: [{ id: 'game-calendar-open', label: 'Cwicz kalendarz', page: 'Game' }],
          triggerPhrases: [
            'cwiczenia z kalendarzem',
            'kalendarz',
            'daty',
            'dni tygodnia',
            'miesiace',
          ],
          sortOrder: 109,
        }),
        createGuideEntry({
          id: 'game-geometry-quiz',
          surface: 'game',
          contentIdPrefixes: ['game:geometry_quiz'],
          title: 'Cwiczenia z figurami',
          shortDescription:
            'Tutaj uczen rozpoznaje figury i cwiczy ich wlasnosci w szybkich zadaniach.',
          fullDescription:
            'Cwiczenia z figurami pomagaja utrwalic nazwy ksztaltow, ich cechy oraz proste zaleznosci przestrzenne. To dobra sekcja do laczenia patrzenia na rysunek z nazewnictwem i wyobraznia geometryczna.',
          hints: [
            'Najpierw nazwij figure albo jej ceche, zanim zaznaczysz odpowiedz.',
            'Jesli trzeba cos narysowac lub rozpoznac, porownaj boki, katy i osie symetrii.',
          ],
          relatedGames: ['Figury'],
          followUpActions: [{ id: 'game-geometry-open', label: 'Cwicz figury', page: 'Game' }],
          triggerPhrases: [
            'cwiczenia z figurami',
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
          contentIdPrefixes: ['game:assignment:'],
          title: 'Zadanie treningowe',
          shortDescription:
            'To karta pokazujaca, jaki trening jest teraz najwazniejszy do wykonania.',
          fullDescription:
            'Zadanie treningowe laczy plan nauki z jedna konkretna runda gry. Pokazuje, jaki zakres cwiczen warto uruchomic teraz, zeby nie wybierac przypadkowej aktywnosci. To most miedzy ogolnym celem a jednym nastepnym ruchem w praktyce.',
          hints: [
            'Najpierw uruchom zadanie, ktore jest aktywne albo najwyzej na liscie.',
            'Jesli po kilku probach zadanie dalej jest trudne, wroc do lekcji z tego samego tematu.',
          ],
          followUpActions: [
            { id: 'game-assignment-open', label: 'Uruchom zadanie', page: 'Game' },
            { id: 'game-assignment-lessons', label: 'Wroc do lekcji', page: 'Lessons' },
          ],
          triggerPhrases: [
            'zadanie treningowe',
            'aktywne zadanie',
            'przypisane zadanie',
            'co mam teraz cwiczyc',
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
            'To aktualne zadanie do rozwiazania, w ktorym liczy sie tok myslenia, nie samo tempo.',
          fullDescription:
            'Pytanie w grze pokazuje jedna aktywna probe do rozwiazania. Uczen powinien najpierw odczytac tresc, rozpoznac typ zadania i dopiero potem odpowiedziec. Tutor moze podpowiedziec, na co patrzec, ale nie powinien podawac gotowego wyniku zamiast ucznia.',
          hints: [
            'Najpierw nazwij w glowie, jaki to typ zadania: dodawanie, odejmowanie, mnozenie albo inna aktywnosc.',
            'Jesli czujesz presje czasu, zwolnij na chwile i upewnij sie, co dokladnie pytanie chce sprawdzic.',
            'Dopiero po zrozumieniu tresci przejdz do liczenia albo wyboru odpowiedzi.',
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
          contentIdPrefixes: ['game:assignment:', 'game:practice:'],
          title: 'Omowienie wyniku gry',
          shortDescription:
            'To miejsce do zobaczenia, co poszlo dobrze i co warto poprawic w kolejnej rundzie.',
          fullDescription:
            'Omowienie wyniku gry pomaga zauwazyc wzor po zakonczonej rundzie: czy problemem bylo tempo, nieuwaga albo konkretny typ zadan. Zamiast patrzec tylko na liczbe punktow, warto sprawdzic, co bylo stabilne i jaki jeden ruch poprawi kolejna probe.',
          hints: [
            'Nie oceniaj rundy tylko po jednym wyniku. Sprawdz, czy blad sie powtarza.',
            'Po slabszej probie wybierz jeden konkretny obszar do poprawy, zamiast zmieniac wszystko naraz.',
          ],
          followUpActions: [
            { id: 'game-review-retry', label: 'Sprobuj jeszcze raz', page: 'Game' },
            { id: 'game-review-lessons', label: 'Wroc do lekcji', page: 'Lessons' },
          ],
          triggerPhrases: [
            'omowienie gry',
            'wynik gry',
            'co dalej po grze',
            'jak czytac ten wynik',
          ],
          sortOrder: 114,
        }),
        createGuideEntry({
          id: 'game-summary',
          surface: 'game',
          focusKind: 'summary',
          contentIdPrefixes: ['game:result'],
          title: 'Podsumowanie gry',
          shortDescription: 'Podsumowanie gry pokazuje, co juz wychodzi, a co wymaga jeszcze jednej serii.',
          fullDescription:
            'Podsumowanie gry zbiera wynik po probie: skutecznosc, tempo i ogolny efekt sesji. Najwazniejsze jest tu uchwycenie wzoru: czy uczen popelnia te same bledy, czy poprawia serie i czy warto jeszcze raz powtorzyc ten sam zakres.',
          hints: [
            'Jesli dokladnosc spada, wroc do wolniejszego tempa.',
            'Jesli wynik jest stabilny, dopiero wtedy zwieksz trudnosc albo tempo.',
          ],
          followUpActions: [{ id: 'game-summary-retry', label: 'Sprobuj jeszcze raz', page: 'Game' }],
          triggerPhrases: ['podsumowanie gry', 'wynik gry', 'co oznacza ten wynik'],
          sortOrder: 110,
        }),
        createGuideEntry({
          id: 'test-overview',
          surface: 'test',
          title: 'Ekran testu',
          shortDescription: 'Test sluzy do sprawdzenia, co uczen juz umie samodzielnie.',
          fullDescription:
            'Ekran testu sprawdza samodzielne rozumienie i gotowosc do rozwiazywania zadan. Test jest bardziej o spokojnym czytaniu i mysleniu niz o tempie. Tutor moze tutaj pomagac z orientacja w ekranie i strategia podejscia, ale nie powinien zdradzac odpowiedzi.',
          hints: [
            'Najpierw przeczytaj cale polecenie i wszystkie odpowiedzi.',
            'Sprobuj samodzielnie rozwiazac zadanie przed siegnieciem po omowienie.',
            'Po odpowiedzi porownaj wynik z omowieniem, zamiast od razu zgadywac kolejna opcje.',
          ],
          relatedTests: ['Powtorka po lekcji', 'Sprawdzenie rozumienia tematu'],
          triggerPhrases: ['test', 'ekran testu', 'jak dziala ten test', 'na czym polega ten test'],
          sortOrder: 120,
        }),
        createGuideEntry({
          id: 'test-summary',
          surface: 'test',
          focusKind: 'summary',
          focusIdPrefixes: ['kangur-test-summary:'],
          title: 'Podsumowanie testu',
          shortDescription: 'Podsumowanie testu pokazuje wynik, ale przede wszystkim kierunek dalszej pracy.',
          fullDescription:
            'Podsumowanie testu zbiera wynik calej proby i pomaga zauwazyc, gdzie uczen radzil sobie dobrze, a gdzie potrzebuje jeszcze powtorki. Nie chodzi tylko o koncowy procent. Ta sekcja podpowiada, czy najlepiej wrocic do lekcji, czy zrobic jeszcze jedna probe.',
          hints: [
            'Patrz na bledy jako wskazowke, do czego wrocic, a nie jako porazke.',
            'Po slabszym tescie najlepszy ruch to krotka powtorka konkretnego tematu.',
          ],
          followUpActions: [{ id: 'test-summary-lessons', label: 'Wroc do lekcji', page: 'Lessons' }],
          triggerPhrases: ['podsumowanie testu', 'wynik testu', 'co oznacza ten wynik'],
          sortOrder: 130,
        }),
        createGuideEntry({
          id: 'test-question',
          surface: 'test',
          focusKind: 'question',
          focusIdPrefixes: ['kangur-test-question:'],
          title: 'Pytanie testowe',
          shortDescription: 'To miejsce do spokojnego przeczytania tresci i samodzielnej proby.',
          fullDescription:
            'Sekcja pytania testowego pokazuje jedno zadanie wraz z odpowiedziami lub miejscem na rozwiazanie. Najwazniejsze jest tutaj spokojne przeczytanie tresci, zauważenie danych i dopiero potem wybor odpowiedzi. Tutor moze podpowiedziec strategia czytania i myslenia, ale nie gotowy wynik.',
          hints: [
            'Przeczytaj pytanie od poczatku do konca jeszcze raz, zanim wybierzesz odpowiedz.',
            'Zwracaj uwage na liczby, jednostki i slowa, ktore zmieniaja sens zadania.',
            'Gdy sa odpowiedzi do wyboru, najpierw skresl te, ktore na pewno nie pasuja.',
          ],
          triggerPhrases: ['pytanie testowe', 'jak podejsc do pytania', 'co robi ta sekcja pytania'],
          sortOrder: 140,
        }),
        createGuideEntry({
          id: 'test-review',
          surface: 'test',
          focusKind: 'review',
          focusIdPrefixes: ['kangur-test-question:'],
          title: 'Omowienie po tescie',
          shortDescription: 'Omowienie pomaga zrozumiec blad i wyciagnac jeden nastepny wniosek.',
          fullDescription:
            'Sekcja omowienia po tescie wyjasnia, co zadzialalo, gdzie pojawil sie blad i jaki jeden krok poprawi kolejna probe. To nie tylko miejsce na zobaczenie prawidlowej odpowiedzi. Najwazniejsze jest zrozumienie, dlaczego wlasnie taka odpowiedz jest poprawna.',
          hints: [
            'Najpierw porownaj swoj tok myslenia z omowieniem.',
            'Zapisz albo zapamietaj jeden konkretny blad, ktorego chcesz uniknac nastepnym razem.',
          ],
          followUpActions: [{ id: 'test-review-lessons', label: 'Powtorz temat', page: 'Lessons' }],
          triggerPhrases: ['omowienie', 'recenzja odpowiedzi', 'wyjasnij ten blad', 'co pokazuje omowienie'],
          sortOrder: 150,
        }),
      ],
    })
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
