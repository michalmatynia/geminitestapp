import type { KangurLessonComponentId } from '@kangur/contracts/kangur-lesson-constants';

import type { KangurPortableLessonBody } from './lesson-content';

export const KANGUR_PORTABLE_LESSON_MATH_BODIES: Partial<Record<KangurLessonComponentId, KangurPortableLessonBody>> = {
  "adding": {
    "introduction": "Dodawanie to laczenie dwoch grup razem, aby sprawdzic ile jest ich lacznie. W tej wersji mobilnej przenosimy juz prawdziwa tresc lekcji, ale bez gier.",
    "sections": [
      {
        "id": "basics",
        "title": "Podstawy dodawania",
        "description": "Zacznij od prostego łączenia grup. Dobrym nawykiem jest start od większej liczby i doliczanie kolejnych elementów.",
        "example": {
          "label": "Przykład",
          "equation": "2 + 3 = 5",
          "explanation": "Masz 2 jabłka, dokładasz 3 kolejne i razem widzisz 5."
        },
        "reminders": [
          "Dodawanie odpowiada na pytanie: ile jest razem?",
          "Przy małych liczbach możesz liczyć na palcach albo w myślach."
        ]
      },
      {
        "id": "cross-ten",
        "title": "Dodawanie przez 10",
        "description": "Gdy suma przekracza 10, najłatwiej najpierw dopełnić do 10, a dopiero potem dodać resztę.",
        "example": {
          "label": "Przykład",
          "equation": "7 + 5 = 12",
          "explanation": "Najpierw 7 + 3 = 10, potem dodajesz pozostale 2 i otrzymujesz 12."
        },
        "reminders": [
          "Szukaj par, które razem dają 10.",
          "Rozkładaj drugą liczbę na dwie części, jeśli to upraszcza rachunek."
        ]
      },
      {
        "id": "two-digit",
        "title": "Dodawanie dwucyfrowe",
        "description": "Przy liczbach dwucyfrowych rozdzielaj dziesiatki i jednosci. To daje stabilny sposob liczenia bez zgadywania.",
        "example": {
          "label": "Przyklad",
          "equation": "24 + 13 = 37",
          "explanation": "20 + 10 = 30, a 4 + 3 = 7. Na koniec laczysz 30 i 7."
        },
        "reminders": [
          "Oddziel dziesiatki od jednosci.",
          "Na końcu połącz części w jeden wynik."
        ]
      },
      {
        "id": "remember",
        "title": "Zapamietaj",
        "description": "Kilka zasad przyspiesza liczenie i pomaga uniknac bledow przy kolejnych zadaniach.",
        "reminders": [
          "Kolejnosc nie ma znaczenia: 3 + 5 = 5 + 3.",
          "Dodawanie zera nic nie zmienia: 7 + 0 = 7.",
          "Przy przekroczeniu 10 dopelniaj do pelnej dziesiatki."
        ]
      }
    ],
    "practiceNote": "Interaktywne gry z dodawaniem pozostają jeszcze po stronie web. Ten mobilny ekran przenosi już treść i logikę nauki, ale nie gry."
  },
  "subtracting": {
    "introduction": "Odejmowanie to zabieranie części z grupy i sprawdzanie, ile zostało. Mobilna wersja obejmuje już główną treść lekcji, ale jeszcze bez gry.",
    "sections": [
      {
        "id": "basics",
        "title": "Podstawy odejmowania",
        "description": "Przy odejmowaniu cofasz sie od liczby poczatkowej albo sprawdzasz ile brakuje do wyniku.",
        "example": {
          "label": "Przyklad",
          "equation": "5 - 2 = 3",
          "explanation": "Masz 5 jablek, zabierasz 2 i zostaja 3."
        },
        "reminders": [
          "Odejmowanie odpowiada na pytanie: ile zostało?",
          "Możesz liczyć wstecz na osi liczbowej."
        ]
      },
      {
        "id": "cross-ten",
        "title": "Odejmowanie przez 10",
        "description": "Gdy trzeba przejść przez 10, rozdziel odjemnik na dwie części: najpierw zejdź do 10, a potem odejmij resztę.",
        "example": {
          "label": "Przyklad",
          "equation": "13 - 5 = 8",
          "explanation": "Najpierw 13 - 3 = 10, potem 10 - 2 = 8."
        },
        "reminders": [
          "Rozłóż liczbę 5 na 3 i 2, jeśli to daje pełną dziesiątkę.",
          "Schodzenie do 10 upraszcza drugi krok."
        ]
      },
      {
        "id": "two-digit",
        "title": "Odejmowanie dwucyfrowe",
        "description": "Tak jak przy dodawaniu, warto osobno potraktowac dziesiatki i jednosci.",
        "example": {
          "label": "Przyklad",
          "equation": "47 - 23 = 24",
          "explanation": "40 - 20 = 20, a 7 - 3 = 4. Na koncu laczysz 20 i 4."
        },
        "reminders": [
          "Najpierw policz dziesiatki.",
          "Potem odejmij jednosci i zloz wynik."
        ]
      },
      {
        "id": "remember",
        "title": "Zapamietaj",
        "description": "Odejmowanie ma kilka zasad, ktore latwo pomylic z dodawaniem, dlatego warto je swiadomie utrwalic.",
        "reminders": [
          "Odejmowanie nie jest przemienne: 7 - 3 to nie to samo co 3 - 7.",
          "Odejmowanie zera nic nie zmienia: 8 - 0 = 8.",
          "Wynik mozesz sprawdzic dodawaniem: 5 + 3 = 8, wiec 8 - 3 = 5."
        ]
      }
    ],
    "practiceNote": "Gra z odejmowaniem zostanie podlaczona pozniej. Na tym etapie mobilny ekran daje juz poprawna sekwencje wyjasnien i przykladow."
  },
  "multiplication": {
    "introduction": "Mnozenie to szybki sposob zapisywania powtarzanego dodawania. W mobilnej wersji przenosimy najpierw sens dzialania, najwazniejsze tabliczki i triki potrzebne przed praktyka.",
    "sections": [
      {
        "id": "intro",
        "title": "Co to znaczy mnozyc",
        "description": "Mnozenie pokazuje, ile jest razem, gdy kilka grup ma tyle samo elementow.",
        "example": {
          "label": "Przyklad",
          "equation": "3 × 4 = 12",
          "explanation": "Masz 3 grupy po 4 elementy, czyli 4 + 4 + 4. Razem daje to 12."
        },
        "reminders": [
          "Mnozenie to skrocone dodawanie tej samej liczby.",
          "Pierwsza liczba moze oznaczac liczbe grup, a druga liczbe elementow w grupie."
        ]
      },
      {
        "id": "table-23",
        "title": "Tabliczka × 2 i × 3",
        "description": "Na poczatek utrwal najprostsze wzory. Te dwa rzedy tabliczki wracaja bardzo czesto w dalszych zadaniach.",
        "example": {
          "label": "Przyklad",
          "equation": "6 × 2 = 12 oraz 5 × 3 = 15",
          "explanation": "Przy × 2 podwajasz liczbe, a przy × 3 dodajesz te sama liczbe trzy razy."
        },
        "reminders": [
          "Mnozenie przez 2 to podwajanie.",
          "Przy mnozeniu przez 3 mozesz policzyc liczbe razy 2 i doliczyc jeszcze jedna taka sama grupe."
        ]
      },
      {
        "id": "table-45",
        "title": "Tabliczka × 4 i × 5",
        "description": "Mnozenie przez 4 i 5 warto laczyc z prostymi obserwacjami o parzystosci i koncowkach liczb.",
        "example": {
          "label": "Przyklad",
          "equation": "7 × 5 = 35",
          "explanation": "Wyniki mnozenia przez 5 koncza sie na 0 albo 5, a 4 × liczba to podwojenie i jeszcze raz podwojenie."
        },
        "reminders": [
          "Mnozenie przez 4 to dwa kolejne podwojenia.",
          "Mnozenie przez 5 prowadzi do wynikow konczacych sie na 0 albo 5."
        ]
      },
      {
        "id": "remember",
        "title": "Zapamietaj",
        "description": "Kilka zasad przyspiesza liczenie i pomaga samodzielnie sprawdzac, czy wynik mnozenia ma sens.",
        "reminders": [
          "Mnozenie przez 1 zostawia liczbe bez zmian.",
          "Mnozenie przez 10 dopisuje zero na koncu.",
          "Kolejnosc nie ma znaczenia: 3 × 4 = 4 × 3."
        ]
      }
    ],
    "practiceNote": "Ten temat ma już pierwszy mobilny trening. Po przeczytaniu lekcji możesz od razu przejść do praktyki mnożenia."
  },
  "division": {
    "introduction": "Dzielenie to równy podział na grupy. W mobilnej wersji przenosimy najpierw główną treść lekcji: sens dzielenia, związek z mnożeniem i resztę z dzielenia.",
    "sections": [
      {
        "id": "intro",
        "title": "Co to znaczy dzielic",
        "description": "Przy dzieleniu pytasz, ile elementow trafi do kazdej grupy, gdy podzial ma byc rowny.",
        "example": {
          "label": "Przyklad",
          "equation": "6 ÷ 2 = 3",
          "explanation": "Masz 6 ciastek i dzielisz je rowno na 2 osoby, wiec kazda dostaje po 3."
        },
        "reminders": [
          "Dzielenie to rowny podzial.",
          "Wynik mowi, ile elementow trafia do jednej grupy."
        ]
      },
      {
        "id": "inverse",
        "title": "Dzielenie i mnozenie",
        "description": "Mnozenie i dzielenie sa dzialaniami odwrotnymi, dlatego znajomosc tabliczki mnozenia bardzo pomaga w dzieleniu.",
        "example": {
          "label": "Przyklad",
          "equation": "12 ÷ 4 = 3",
          "explanation": "Skoro 4 × 3 = 12, to 12 ÷ 4 musi dawac 3."
        },
        "reminders": [
          "Jesli znasz 4 × 3 = 12, znasz tez 12 ÷ 4 = 3 i 12 ÷ 3 = 4.",
          "Przy trudniejszym dzieleniu najpierw przypomnij sobie odpowiadajace mnozenie."
        ]
      },
      {
        "id": "remainder",
        "title": "Reszta z dzielenia",
        "description": "Nie każde dzielenie da się wykonać bez reszty. Wtedy część elementów zostaje poza równym podziałem.",
        "example": {
          "label": "Przyklad",
          "equation": "7 ÷ 2 = 3 reszta 1",
          "explanation": "Mozesz rozdac po 3 elementy do 2 grup, a 1 element zostaje."
        },
        "reminders": [
          "Reszta zawsze jest mniejsza od dzielnika.",
          "Sprawdz wynik: iloraz × dzielnik + reszta = liczba poczatkowa."
        ]
      },
      {
        "id": "remember",
        "title": "Zapamietaj",
        "description": "Kilka prostych zasad pomaga szybko sprawdzic, czy wynik dzielenia ma sens.",
        "reminders": [
          "Kazda liczba podzielona przez 1 pozostaje taka sama.",
          "Liczba podzielona przez sama siebie daje 1.",
          "Zero podzielone przez dowolna liczbe rozna od zera daje 0."
        ]
      }
    ],
    "practiceNote": "Gra z dzieleniem pozostaje jeszcze po stronie web. Mobilny ekran daje juz jednak pelny szkielet nauki przed praktyka."
  },
  "clock": {
    "introduction": "Lekcja zegara składa się z trzech etapów: godziny, minuty i łączenie obu wskazówek. Na mobile przenosimy ten tok nauki bez interaktywnego ćwiczenia z tarczą.",
    "sections": [
      {
        "id": "hours",
        "title": "Godziny i krotka wskazowka",
        "description": "Najpierw naucz sie czytac tylko krotka wskazowke. Ona pokazuje, ktora jest godzina.",
        "example": {
          "label": "Przyklad",
          "equation": "9:00",
          "explanation": "Jesli krotka wskazowka stoi przy 9, a minuty pomijasz, odczytujesz pelna godzine dziewiata."
        },
        "reminders": [
          "Krotka wskazowka odpowiada za godziny.",
          "Na pelnych godzinach najpierw skupiasz sie tylko na niej."
        ]
      },
      {
        "id": "minutes",
        "title": "Minuty i dluga wskazowka",
        "description": "Dluga wskazowka pokazuje minuty. Kazdy kolejny numer na tarczy oznacza kolejne 5 minut.",
        "example": {
          "label": "Przyklad",
          "equation": "7 × 5 = 35 minut",
          "explanation": "Gdy dluga wskazowka stoi przy 7, odczytujesz 35 minut."
        },
        "reminders": [
          "3 oznacza 15 minut, 6 oznacza 30 minut, a 9 oznacza 45 minut.",
          "Pamiętaj, że kolejne liczby to skoki co 5 minut."
        ]
      },
      {
        "id": "combined",
        "title": "Godziny i minuty razem",
        "description": "Na koncu laczysz odczyt godziny z krotkiej wskazowki i minut z dlugiej.",
        "example": {
          "label": "Przyklad",
          "equation": "8:30",
          "explanation": "Krotka wskazowka pokazuje 8, a dluga 30 minut, wiec razem odczytujesz 8:30."
        },
        "reminders": [
          "Najpierw czytasz godzine, dopiero potem minuty.",
          "5:15 to kwadrans po 5, a 5:45 to kwadrans do 6."
        ]
      }
    ],
    "practiceNote": "Interaktywne ćwiczenie z zegarem zostanie podpięte później. Na tym etapie mobilny ekran odtwarza pełny porządek nauki potrzebny przed praktyką."
  },
  "calendar": {
    "introduction": "Kalendarz pomaga uporządkować czas: dni tygodnia, miesiące, daty i pory roku. Na mobile przenosimy główny porządek nauki bez interaktywnej gry.",
    "sections": [
      {
        "id": "intro",
        "title": "Czym jest kalendarz",
        "description": "Kalendarz to sposob zapisywania i odczytywania czasu w dniach, tygodniach, miesiacach i latach.",
        "example": {
          "label": "Przyklad",
          "equation": "1 tydzien = 7 dni",
          "explanation": "Każdy tydzień składa się z tych samych 7 dni, a miesiące i lata układają z nich większy plan czasu."
        },
        "reminders": [
          "Rok ma 12 miesięcy.",
          "Tydzien ma 7 dni."
        ]
      },
      {
        "id": "days",
        "title": "Dni tygodnia",
        "description": "Warto znac kolejnosc dni tygodnia, bo pomaga to w orientacji: co bylo wczoraj, co jest dzisiaj i co bedzie jutro.",
        "example": {
          "label": "Przyklad",
          "equation": "Poniedzialek -> Wtorek -> Sroda",
          "explanation": "Jesli dzisiaj jest wtorek, to wczoraj byl poniedzialek, a jutro bedzie sroda."
        },
        "reminders": [
          "Po piatku przychodzi sobota, a po sobocie niedziela.",
          "Sobota i niedziela to zwykle weekend."
        ]
      },
      {
        "id": "months",
        "title": "Miesiące i pory roku",
        "description": "Każdy miesiąc ma swoją nazwę i liczbę dni. Miesiące łączą się też w cztery pory roku.",
        "example": {
          "label": "Przyklad",
          "equation": "Marzec, kwiecien, maj = wiosna",
          "explanation": "Miesiące można grupować nie tylko po kolejności, ale też po porach roku, co pomaga je szybciej zapamiętać."
        },
        "reminders": [
          "Większość miesięcy ma 30 lub 31 dni.",
          "Luty ma zwykle 28 dni."
        ]
      },
      {
        "id": "date",
        "title": "Jak czytac date",
        "description": "Date zapisujesz w kolejnosci dzien, miesiac, rok. Dobrze jest umiec podac ja slowami i w zapisie liczbowym.",
        "example": {
          "label": "Przyklad",
          "equation": "15/03/2025",
          "explanation": "To samo mozesz przeczytac jako: pietnasty marca dwa tysiace dwudziestego piatego roku."
        },
        "reminders": [
          "Najpierw czytasz dzien, potem miesiac, a na koncu rok.",
          "Zapis liczbowy i slowny powinny oznaczac ta sama date."
        ]
      }
    ],
    "practiceNote": "Interaktywna gra z kalendarzem pozostaje jeszcze po stronie web. Na mobile masz juz jednak pelny zestaw podstaw potrzebnych do dalszej praktyki."
  },
  "geometry_basics": {
    "introduction": "Podstawy geometrii uczą patrzeć na figury jak na zestaw punktów, odcinków, boków i kątów. W wersji mobilnej przenosimy najważniejsze pojęcia i obserwacje potrzebne przed bardziej interaktywnymi ćwiczeniami.",
    "sections": [
      {
        "id": "intro",
        "title": "Czym zajmuje się geometria",
        "description": "Geometria opisuje kształty, położenie i wielkość. Zamiast liczyć tylko wynik, patrzysz na to, jak wygląda figura i z jakich elementów się składa.",
        "example": {
          "label": "Przykład",
          "equation": "punkt A, odcinek AB, trójkąt ABC",
          "explanation": "To trzy różne obiekty geometryczne: pojedynczy punkt, fragment prostej i cała figura z kilku elementów."
        },
        "reminders": [
          "Geometria pomaga nazywać i porównywać figury.",
          "Jedna figura może składać się z kilku prostszych elementów."
        ]
      },
      {
        "id": "point-line-segment",
        "title": "Punkt, prosta i odcinek",
        "description": "Punkt oznacza dokładne miejsce. Prosta może biec bez końca w obie strony, a odcinek ma dwa końce i da się zmierzyć jego długość.",
        "example": {
          "label": "Przykład",
          "equation": "A •      A-----B",
          "explanation": "Punkt A pokazuje tylko położenie, a odcinek AB ma początek, koniec i konkretną długość."
        },
        "reminders": [
          "Punkt nie ma długości ani szerokości.",
          "Odcinek jest częścią prostej między dwoma punktami."
        ]
      },
      {
        "id": "sides-angles",
        "title": "Boki i kąty",
        "description": "Bok to prosty fragment figury, a kąt powstaje tam, gdzie spotykają się dwa boki. Dzięki temu możesz opisywać, jak zbudowana jest figura.",
        "example": {
          "label": "Przykład",
          "equation": "Trójkąt ma 3 boki i 3 kąty",
          "explanation": "Każdy wierzchołek trójkąta tworzy kąt, a odcinki między wierzchołkami są bokami figury."
        },
        "reminders": [
          "Liczba boków często pomaga rozpoznać figurę.",
          "Kąty pokazują, jak boki ustawiają się względem siebie."
        ]
      },
      {
        "id": "remember",
        "title": "Zapamietaj",
        "description": "Kilka podstawowych pojęć wraca w prawie każdej dalszej lekcji geometrii, więc warto je od razu utrwalić.",
        "reminders": [
          "Punkt pokazuje miejsce.",
          "Odcinek ma dwa końce i da się zmierzyć.",
          "Boki i kąty pomagają opisać figurę."
        ]
      }
    ],
    "practiceNote": "Bardziej interaktywne warsztaty geometrii zostają jeszcze po stronie web. Na mobile masz już jednak słownictwo i kolejność pojęć potrzebnych przed dalszą praktyką."
  },
  "geometry_shapes": {
    "introduction": "Figury geometryczne różnią się liczbą boków, kątów i tym, czy mają proste czy zaokrąglone brzegi. Ta lekcja porządkuje najważniejsze kształty i ich cechy.",
    "sections": [
      {
        "id": "basic-shapes",
        "title": "Najczęstsze figury",
        "description": "Na początku warto rozpoznawać podstawowe figury: trójkąt, kwadrat, prostokąt i koło. Każda z nich ma cechy, które łatwo zauważyć.",
        "example": {
          "label": "Przykład",
          "equation": "trójkąt / kwadrat / prostokąt / koło",
          "explanation": "Trójkąt ma 3 boki, kwadrat i prostokąt mają po 4 boki, a koło nie ma boków ani wierzchołków."
        },
        "reminders": [
          "Najpierw policz boki albo zauważ, że figura jest okrągła.",
          "Wierzchołki pomagają odróżniać figury o prostych bokach."
        ]
      },
      {
        "id": "quadrilaterals",
        "title": "Kwadrat i prostokąt",
        "description": "Kwadrat i prostokąt należą do figur czworokątnych, ale nie są takie same. Obie mają 4 kąty proste, jednak kwadrat ma wszystkie boki równe.",
        "example": {
          "label": "Przykład",
          "equation": "kwadrat: 4 równe boki / prostokąt: 2 pary równych boków",
          "explanation": "Jeśli wszystkie boki są tej samej długości, to kwadrat. Jeśli równe są tylko pary boków naprzeciw siebie, to prostokąt."
        },
        "reminders": [
          "Kwadrat jest szczególnym rodzajem prostokąta.",
          "Długości boków pomagają odróżnić podobne figury."
        ]
      },
      {
        "id": "curved-shapes",
        "title": "Koło, owal i inne kształty",
        "description": "Nie każda figura ma proste boki. Koło i owal rozpoznajesz po gładkim brzegu, a romb po czterech bokach i charakterystycznym pochyleniu.",
        "example": {
          "label": "Przykład",
          "equation": "koło ≠ owal",
          "explanation": "Koło jest równe w każdym kierunku, a owal jest bardziej wydłużony. Obie figury nie mają wierzchołków."
        },
        "reminders": [
          "Brak wierzchołków to ważna wskazówka przy kole i owalu.",
          "Romb ma 4 boki tej samej długości, ale nie musi mieć kątów prostych."
        ]
      },
      {
        "id": "remember",
        "title": "Zapamietaj",
        "description": "Przy rozpoznawaniu figur najlepiej porównywać kilka cech naraz, a nie tylko nazwę albo ogólny wygląd.",
        "reminders": [
          "Policz boki i wierzchołki.",
          "Sprawdź, czy boki są równe i czy są kąty proste.",
          "Zauważ, czy figura ma proste czy zaokrąglone brzegi."
        ]
      }
    ],
    "practiceNote": "Gra do rysowania figur pozostaje jeszcze po stronie web. Mobilna lekcja daje już jednak porządek rozpoznawania i porównywania kształtów."
  },
  "geometry_symmetry": {
    "introduction": "Symetria pomaga zauważyć, kiedy figura składa się z dwóch pasujących do siebie połówek. To ważne zarówno przy oglądaniu kształtów, jak i przy ich rysowaniu.",
    "sections": [
      {
        "id": "intro",
        "title": "Co to jest symetria",
        "description": "Figura jest symetryczna, gdy można ją podzielić tak, aby jedna część pasowała do drugiej jak odbicie w lustrze.",
        "example": {
          "label": "Przykład",
          "equation": "🦋",
          "explanation": "Skrzydła motyla po lewej i prawej stronie są do siebie podobne, dlatego łatwo zauważyć symetrię."
        },
        "reminders": [
          "Symetria nie oznacza, że wszystko wygląda identycznie z każdej strony.",
          "Szukasz dwóch połówek pasujących do siebie po złożeniu lub odbiciu."
        ]
      },
      {
        "id": "axis",
        "title": "Oś symetrii",
        "description": "Oś symetrii to linia, która dzieli figurę na dwie pasujące części. Czasem jest pionowa, czasem pozioma, a czasem ukośna.",
        "example": {
          "label": "Przykład",
          "equation": "kwadrat: 4 osie symetrii",
          "explanation": "Kwadrat ma osie pionową, poziomą i dwie ukośne, bo po każdej z tych linii obie części nadal do siebie pasują."
        },
        "reminders": [
          "Nie każda figura ma tylko jedną oś symetrii.",
          "Jeśli po złożeniu połówki się nie pokrywają, to nie jest oś symetrii."
        ]
      },
      {
        "id": "mirror",
        "title": "Odbicie lustrzane",
        "description": "Przy odbiciu lustrzanym każdy punkt po jednej stronie osi ma swój odpowiednik po drugiej stronie w tej samej odległości.",
        "example": {
          "label": "Przykład",
          "equation": "● | ●",
          "explanation": "Dwa punkty po obu stronach osi są symetryczne, jeśli są tak samo daleko od linii odbicia."
        },
        "reminders": [
          "Odbicie nie przesuwa figury dowolnie, tylko odwraca ją względem osi.",
          "Odległość od osi po obu stronach musi być taka sama."
        ]
      },
      {
        "id": "remember",
        "title": "Zapamietaj",
        "description": "Najlepszy sposób sprawdzania symetrii to szukanie osi i porównywanie odpowiadających sobie punktów lub boków.",
        "reminders": [
          "Najpierw wskaż możliwą oś symetrii.",
          "Potem porównaj lewą i prawą albo górną i dolną część figury.",
          "Brak dopasowania po jednej stronie oznacza brak symetrii względem tej osi."
        ]
      }
    ],
    "practiceNote": "Interaktywne odbicia lustrzane zostają jeszcze po stronie web. Na mobile możesz już przećwiczyć sposób myślenia potrzebny do znajdowania osi symetrii."
  },
  "geometry_perimeter": {
    "introduction": "Obwód to długość całej drogi wokół figury. Ta lekcja uczy, jak dodawać boki krok po kroku i pilnować, aby wynik miał sens.",
    "sections": [
      {
        "id": "intro",
        "title": "Co to jest obwód",
        "description": "Obwód figury otrzymujesz, gdy dodasz długości wszystkich jej boków. To tak, jakbyś obchodził figurę dookoła i liczył całą trasę.",
        "example": {
          "label": "Przykład",
          "equation": "3 cm + 2 cm + 3 cm + 2 cm = 10 cm",
          "explanation": "Dodajesz każdy bok prostokąta i dostajesz całkowitą długość brzegu figury."
        },
        "reminders": [
          "Obwód to suma wszystkich boków.",
          "Wynik powinien być zapisany w tej samej jednostce co boki."
        ]
      },
      {
        "id": "rectangles",
        "title": "Prostokąt i kwadrat",
        "description": "W prostokącie przeciwległe boki są równe, a w kwadracie wszystkie boki są równe. Dzięki temu łatwiej planować dodawanie.",
        "example": {
          "label": "Przykład",
          "equation": "kwadrat 4 cm + 4 cm + 4 cm + 4 cm = 16 cm",
          "explanation": "Jeśli wszystkie boki są takie same, możesz powtarzać tę samą długość zamiast szukać każdej osobno."
        },
        "reminders": [
          "Przy prostokącie często pojawiają się dwie pary tych samych boków.",
          "Przy kwadracie wszystkie cztery boki mają tę samą długość."
        ]
      },
      {
        "id": "step-by-step",
        "title": "Liczenie krok po kroku",
        "description": "Najbezpieczniej zapisać wszystkie boki w kolejności i dopiero potem dodać liczby. To zmniejsza ryzyko pominięcia któregoś fragmentu.",
        "example": {
          "label": "Przykład",
          "equation": "5 cm + 1 cm + 2 cm + 1 cm + 5 cm + 2 cm",
          "explanation": "Przy bardziej złożonych figurach przechodzisz po brzegu jeden bok po drugim, aż wrócisz do punktu startu."
        },
        "reminders": [
          "Nie pomijaj żadnego boku.",
          "Zacznij w jednym miejscu i idź wokół figury w ustalonym kierunku."
        ]
      },
      {
        "id": "remember",
        "title": "Zapamietaj",
        "description": "Obwód jest prosty do policzenia, jeśli konsekwentnie patrzysz na każdy bok i pilnujesz jednostek.",
        "reminders": [
          "Dodaj wszystkie boki dokładnie raz.",
          "Sprawdź, czy wynik ma poprawną jednostkę.",
          "Przy figurach równobocznych możesz wykorzystać powtarzającą się długość."
        ]
      }
    ],
    "practiceNote": "Mobilna lekcja porządkuje sposób liczenia obwodu, ale bardziej rozbudowane zadania rysunkowe pozostają jeszcze po stronie web."
  }
};

