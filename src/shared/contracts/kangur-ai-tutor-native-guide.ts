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
  version: z.number().int().positive().default(1),
  entries: z.array(kangurAiTutorNativeGuideEntrySchema).max(200).default([]),
});
export type KangurAiTutorNativeGuideStore = z.infer<
  typeof kangurAiTutorNativeGuideStoreSchema
>;

const createGuideEntry = (input: {
  id: string;
  surface?: KangurAiTutorSurface | null;
  focusKind?: KangurAiTutorFocusKind | null;
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
      version: 1,
      entries: [
        createGuideEntry({
          id: 'lesson-overview',
          surface: 'lesson',
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
          id: 'game-summary',
          surface: 'game',
          focusKind: 'summary',
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

export function parseKangurAiTutorNativeGuideStore(
  raw: unknown
): KangurAiTutorNativeGuideStore {
  return kangurAiTutorNativeGuideStoreSchema.parse(raw);
}
