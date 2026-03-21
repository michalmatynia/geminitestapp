import type { KangurLessonComponentId } from '@kangur/contracts';

export type KangurPortableLessonBodySection = {
  id: string;
  title: string;
  description: string;
  example?: {
    label: string;
    equation: string;
    explanation: string;
  };
  reminders?: string[];
};

export type KangurPortableLessonBody = {
  introduction: string;
  sections: KangurPortableLessonBodySection[];
  practiceNote: string;
};

const KANGUR_PORTABLE_LESSON_BODIES: Partial<
  Record<KangurLessonComponentId, KangurPortableLessonBody>
> = {
  adding: {
    introduction:
      'Dodawanie to laczenie dwoch grup razem, aby sprawdzic ile jest ich lacznie. W tej wersji mobilnej przenosimy juz prawdziwa tresc lekcji, ale bez gier.',
    sections: [
      {
        id: 'basics',
        title: 'Podstawy dodawania',
        description:
          'Zacznij od prostego łączenia grup. Dobrym nawykiem jest start od większej liczby i doliczanie kolejnych elementów.',
        example: {
          label: 'Przykład',
          equation: '2 + 3 = 5',
          explanation: 'Masz 2 jabłka, dokładasz 3 kolejne i razem widzisz 5.',
        },
        reminders: [
          'Dodawanie odpowiada na pytanie: ile jest razem?',
          'Przy małych liczbach możesz liczyć na palcach albo w myślach.',
        ],
      },
      {
        id: 'cross-ten',
        title: 'Dodawanie przez 10',
        description:
          'Gdy suma przekracza 10, najłatwiej najpierw dopełnić do 10, a dopiero potem dodać resztę.',
        example: {
          label: 'Przykład',
          equation: '7 + 5 = 12',
          explanation: 'Najpierw 7 + 3 = 10, potem dodajesz pozostale 2 i otrzymujesz 12.',
        },
        reminders: [
          'Szukaj par, które razem dają 10.',
          'Rozkładaj drugą liczbę na dwie części, jeśli to upraszcza rachunek.',
        ],
      },
      {
        id: 'two-digit',
        title: 'Dodawanie dwucyfrowe',
        description:
          'Przy liczbach dwucyfrowych rozdzielaj dziesiatki i jednosci. To daje stabilny sposob liczenia bez zgadywania.',
        example: {
          label: 'Przyklad',
          equation: '24 + 13 = 37',
          explanation: '20 + 10 = 30, a 4 + 3 = 7. Na koniec laczysz 30 i 7.',
        },
        reminders: [
          'Oddziel dziesiatki od jednosci.',
          'Na końcu połącz części w jeden wynik.',
        ],
      },
      {
        id: 'remember',
        title: 'Zapamietaj',
        description:
          'Kilka zasad przyspiesza liczenie i pomaga uniknac bledow przy kolejnych zadaniach.',
        reminders: [
          'Kolejnosc nie ma znaczenia: 3 + 5 = 5 + 3.',
          'Dodawanie zera nic nie zmienia: 7 + 0 = 7.',
          'Przy przekroczeniu 10 dopelniaj do pelnej dziesiatki.',
        ],
      },
    ],
    practiceNote:
      'Interaktywne gry z dodawaniem pozostają jeszcze po stronie web. Ten mobilny ekran przenosi już treść i logikę nauki, ale nie gry.',
  },
  subtracting: {
    introduction:
      'Odejmowanie to zabieranie części z grupy i sprawdzanie, ile zostało. Mobilna wersja obejmuje już główną treść lekcji, ale jeszcze bez gry.',
    sections: [
      {
        id: 'basics',
        title: 'Podstawy odejmowania',
        description:
          'Przy odejmowaniu cofasz sie od liczby poczatkowej albo sprawdzasz ile brakuje do wyniku.',
        example: {
          label: 'Przyklad',
          equation: '5 - 2 = 3',
          explanation: 'Masz 5 jablek, zabierasz 2 i zostaja 3.',
        },
        reminders: [
          'Odejmowanie odpowiada na pytanie: ile zostało?',
          'Możesz liczyć wstecz na osi liczbowej.',
        ],
      },
      {
        id: 'cross-ten',
        title: 'Odejmowanie przez 10',
        description:
          'Gdy trzeba przejść przez 10, rozdziel odjemnik na dwie części: najpierw zejdź do 10, a potem odejmij resztę.',
        example: {
          label: 'Przyklad',
          equation: '13 - 5 = 8',
          explanation: 'Najpierw 13 - 3 = 10, potem 10 - 2 = 8.',
        },
        reminders: [
          'Rozłóż liczbę 5 na 3 i 2, jeśli to daje pełną dziesiątkę.',
          'Schodzenie do 10 upraszcza drugi krok.',
        ],
      },
      {
        id: 'two-digit',
        title: 'Odejmowanie dwucyfrowe',
        description:
          'Tak jak przy dodawaniu, warto osobno potraktowac dziesiatki i jednosci.',
        example: {
          label: 'Przyklad',
          equation: '47 - 23 = 24',
          explanation: '40 - 20 = 20, a 7 - 3 = 4. Na koncu laczysz 20 i 4.',
        },
        reminders: [
          'Najpierw policz dziesiatki.',
          'Potem odejmij jednosci i zloz wynik.',
        ],
      },
      {
        id: 'remember',
        title: 'Zapamietaj',
        description:
          'Odejmowanie ma kilka zasad, ktore latwo pomylic z dodawaniem, dlatego warto je swiadomie utrwalic.',
        reminders: [
          'Odejmowanie nie jest przemienne: 7 - 3 to nie to samo co 3 - 7.',
          'Odejmowanie zera nic nie zmienia: 8 - 0 = 8.',
          'Wynik mozesz sprawdzic dodawaniem: 5 + 3 = 8, wiec 8 - 3 = 5.',
        ],
      },
    ],
    practiceNote:
      'Gra z odejmowaniem zostanie podlaczona pozniej. Na tym etapie mobilny ekran daje juz poprawna sekwencje wyjasnien i przykladow.',
  },
  multiplication: {
    introduction:
      'Mnozenie to szybki sposob zapisywania powtarzanego dodawania. W mobilnej wersji przenosimy najpierw sens dzialania, najwazniejsze tabliczki i triki potrzebne przed praktyka.',
    sections: [
      {
        id: 'intro',
        title: 'Co to znaczy mnozyc',
        description:
          'Mnozenie pokazuje, ile jest razem, gdy kilka grup ma tyle samo elementow.',
        example: {
          label: 'Przyklad',
          equation: '3 × 4 = 12',
          explanation:
            'Masz 3 grupy po 4 elementy, czyli 4 + 4 + 4. Razem daje to 12.',
        },
        reminders: [
          'Mnozenie to skrocone dodawanie tej samej liczby.',
          'Pierwsza liczba moze oznaczac liczbe grup, a druga liczbe elementow w grupie.',
        ],
      },
      {
        id: 'table-23',
        title: 'Tabliczka × 2 i × 3',
        description:
          'Na poczatek utrwal najprostsze wzory. Te dwa rzedy tabliczki wracaja bardzo czesto w dalszych zadaniach.',
        example: {
          label: 'Przyklad',
          equation: '6 × 2 = 12 oraz 5 × 3 = 15',
          explanation:
            'Przy × 2 podwajasz liczbe, a przy × 3 dodajesz te sama liczbe trzy razy.',
        },
        reminders: [
          'Mnozenie przez 2 to podwajanie.',
          'Przy mnozeniu przez 3 mozesz policzyc liczbe razy 2 i doliczyc jeszcze jedna taka sama grupe.',
        ],
      },
      {
        id: 'table-45',
        title: 'Tabliczka × 4 i × 5',
        description:
          'Mnozenie przez 4 i 5 warto laczyc z prostymi obserwacjami o parzystosci i koncowkach liczb.',
        example: {
          label: 'Przyklad',
          equation: '7 × 5 = 35',
          explanation:
            'Wyniki mnozenia przez 5 koncza sie na 0 albo 5, a 4 × liczba to podwojenie i jeszcze raz podwojenie.',
        },
        reminders: [
          'Mnozenie przez 4 to dwa kolejne podwojenia.',
          'Mnozenie przez 5 prowadzi do wynikow konczacych sie na 0 albo 5.',
        ],
      },
      {
        id: 'remember',
        title: 'Zapamietaj',
        description:
          'Kilka zasad przyspiesza liczenie i pomaga samodzielnie sprawdzac, czy wynik mnozenia ma sens.',
        reminders: [
          'Mnozenie przez 1 zostawia liczbe bez zmian.',
          'Mnozenie przez 10 dopisuje zero na koncu.',
          'Kolejnosc nie ma znaczenia: 3 × 4 = 4 × 3.',
        ],
      },
    ],
    practiceNote:
      'Ten temat ma już pierwszy mobilny trening. Po przeczytaniu lekcji możesz od razu przejść do praktyki mnożenia.',
  },
  division: {
    introduction:
      'Dzielenie to równy podział na grupy. W mobilnej wersji przenosimy najpierw główną treść lekcji: sens dzielenia, związek z mnożeniem i resztę z dzielenia.',
    sections: [
      {
        id: 'intro',
        title: 'Co to znaczy dzielic',
        description:
          'Przy dzieleniu pytasz, ile elementow trafi do kazdej grupy, gdy podzial ma byc rowny.',
        example: {
          label: 'Przyklad',
          equation: '6 ÷ 2 = 3',
          explanation: 'Masz 6 ciastek i dzielisz je rowno na 2 osoby, wiec kazda dostaje po 3.',
        },
        reminders: [
          'Dzielenie to rowny podzial.',
          'Wynik mowi, ile elementow trafia do jednej grupy.',
        ],
      },
      {
        id: 'inverse',
        title: 'Dzielenie i mnozenie',
        description:
          'Mnozenie i dzielenie sa dzialaniami odwrotnymi, dlatego znajomosc tabliczki mnozenia bardzo pomaga w dzieleniu.',
        example: {
          label: 'Przyklad',
          equation: '12 ÷ 4 = 3',
          explanation: 'Skoro 4 × 3 = 12, to 12 ÷ 4 musi dawac 3.',
        },
        reminders: [
          'Jesli znasz 4 × 3 = 12, znasz tez 12 ÷ 4 = 3 i 12 ÷ 3 = 4.',
          'Przy trudniejszym dzieleniu najpierw przypomnij sobie odpowiadajace mnozenie.',
        ],
      },
      {
        id: 'remainder',
        title: 'Reszta z dzielenia',
        description:
          'Nie każde dzielenie da się wykonać bez reszty. Wtedy część elementów zostaje poza równym podziałem.',
        example: {
          label: 'Przyklad',
          equation: '7 ÷ 2 = 3 reszta 1',
          explanation: 'Mozesz rozdac po 3 elementy do 2 grup, a 1 element zostaje.',
        },
        reminders: [
          'Reszta zawsze jest mniejsza od dzielnika.',
          'Sprawdz wynik: iloraz × dzielnik + reszta = liczba poczatkowa.',
        ],
      },
      {
        id: 'remember',
        title: 'Zapamietaj',
        description:
          'Kilka prostych zasad pomaga szybko sprawdzic, czy wynik dzielenia ma sens.',
        reminders: [
          'Kazda liczba podzielona przez 1 pozostaje taka sama.',
          'Liczba podzielona przez sama siebie daje 1.',
          'Zero podzielone przez dowolna liczbe rozna od zera daje 0.',
        ],
      },
    ],
    practiceNote:
      'Gra z dzieleniem pozostaje jeszcze po stronie web. Mobilny ekran daje juz jednak pelny szkielet nauki przed praktyka.',
  },
  clock: {
    introduction:
      'Lekcja zegara składa się z trzech etapów: godziny, minuty i łączenie obu wskazówek. Na mobile przenosimy ten tok nauki bez interaktywnego ćwiczenia z tarczą.',
    sections: [
      {
        id: 'hours',
        title: 'Godziny i krotka wskazowka',
        description:
          'Najpierw naucz sie czytac tylko krotka wskazowke. Ona pokazuje, ktora jest godzina.',
        example: {
          label: 'Przyklad',
          equation: '9:00',
          explanation: 'Jesli krotka wskazowka stoi przy 9, a minuty pomijasz, odczytujesz pelna godzine dziewiata.',
        },
        reminders: [
          'Krotka wskazowka odpowiada za godziny.',
          'Na pelnych godzinach najpierw skupiasz sie tylko na niej.',
        ],
      },
      {
        id: 'minutes',
        title: 'Minuty i dluga wskazowka',
        description:
          'Dluga wskazowka pokazuje minuty. Kazdy kolejny numer na tarczy oznacza kolejne 5 minut.',
        example: {
          label: 'Przyklad',
          equation: '7 × 5 = 35 minut',
          explanation: 'Gdy dluga wskazowka stoi przy 7, odczytujesz 35 minut.',
        },
        reminders: [
          '3 oznacza 15 minut, 6 oznacza 30 minut, a 9 oznacza 45 minut.',
          'Pamiętaj, że kolejne liczby to skoki co 5 minut.',
        ],
      },
      {
        id: 'combined',
        title: 'Godziny i minuty razem',
        description:
          'Na koncu laczysz odczyt godziny z krotkiej wskazowki i minut z dlugiej.',
        example: {
          label: 'Przyklad',
          equation: '8:30',
          explanation: 'Krotka wskazowka pokazuje 8, a dluga 30 minut, wiec razem odczytujesz 8:30.',
        },
        reminders: [
          'Najpierw czytasz godzine, dopiero potem minuty.',
          '5:15 to kwadrans po 5, a 5:45 to kwadrans do 6.',
        ],
      },
    ],
    practiceNote:
      'Interaktywne ćwiczenie z zegarem zostanie podpięte później. Na tym etapie mobilny ekran odtwarza pełny porządek nauki potrzebny przed praktyką.',
  },
  calendar: {
    introduction:
      'Kalendarz pomaga uporządkować czas: dni tygodnia, miesiące, daty i pory roku. Na mobile przenosimy główny porządek nauki bez interaktywnej gry.',
    sections: [
      {
        id: 'intro',
        title: 'Czym jest kalendarz',
        description:
          'Kalendarz to sposob zapisywania i odczytywania czasu w dniach, tygodniach, miesiacach i latach.',
        example: {
          label: 'Przyklad',
          equation: '1 tydzien = 7 dni',
          explanation:
            'Każdy tydzień składa się z tych samych 7 dni, a miesiące i lata układają z nich większy plan czasu.',
        },
        reminders: [
          'Rok ma 12 miesięcy.',
          'Tydzien ma 7 dni.',
        ],
      },
      {
        id: 'days',
        title: 'Dni tygodnia',
        description:
          'Warto znac kolejnosc dni tygodnia, bo pomaga to w orientacji: co bylo wczoraj, co jest dzisiaj i co bedzie jutro.',
        example: {
          label: 'Przyklad',
          equation: 'Poniedzialek -> Wtorek -> Sroda',
          explanation:
            'Jesli dzisiaj jest wtorek, to wczoraj byl poniedzialek, a jutro bedzie sroda.',
        },
        reminders: [
          'Po piatku przychodzi sobota, a po sobocie niedziela.',
          'Sobota i niedziela to zwykle weekend.',
        ],
      },
      {
        id: 'months',
        title: 'Miesiące i pory roku',
        description:
          'Każdy miesiąc ma swoją nazwę i liczbę dni. Miesiące łączą się też w cztery pory roku.',
        example: {
          label: 'Przyklad',
          equation: 'Marzec, kwiecien, maj = wiosna',
          explanation:
          'Miesiące można grupować nie tylko po kolejności, ale też po porach roku, co pomaga je szybciej zapamiętać.',
        },
        reminders: [
          'Większość miesięcy ma 30 lub 31 dni.',
          'Luty ma zwykle 28 dni.',
        ],
      },
      {
        id: 'date',
        title: 'Jak czytac date',
        description:
          'Date zapisujesz w kolejnosci dzien, miesiac, rok. Dobrze jest umiec podac ja slowami i w zapisie liczbowym.',
        example: {
          label: 'Przyklad',
          equation: '15/03/2025',
          explanation:
            'To samo mozesz przeczytac jako: pietnasty marca dwa tysiace dwudziestego piatego roku.',
        },
        reminders: [
          'Najpierw czytasz dzien, potem miesiac, a na koncu rok.',
          'Zapis liczbowy i slowny powinny oznaczac ta sama date.',
        ],
      },
    ],
    practiceNote:
      'Interaktywna gra z kalendarzem pozostaje jeszcze po stronie web. Na mobile masz juz jednak pelny zestaw podstaw potrzebnych do dalszej praktyki.',
  },
  logical_thinking: {
    introduction:
      'Myslenie logiczne pomaga porzadkowac informacje, szukac zasad i wyciagac wnioski krok po kroku. To wspolna baza dla zagadek, matematyki i codziennego rozwiazywania problemow.',
    sections: [
      {
        id: 'intro',
        title: 'Co to jest myslenie logiczne',
        description:
          'To umiejetnosc szukania porzadku i sprawdzania, czy odpowiedz rzeczywiscie wynika z danych, a nie z przypadku.',
        example: {
          label: 'Przyklad',
          equation: 'Jesli wszystkie koty maja cztery lapy, a Mruczek jest kotem...',
          explanation:
            '...to mozna wywnioskowac, ze Mruczek ma cztery lapy. Wniosek wynika z podanych informacji.',
        },
        reminders: [
          'Patrz na zasade, nie tylko na pojedynczy przyklad.',
          'Dobra odpowiedz powinna dac sie uzasadnic.',
        ],
      },
      {
        id: 'patterns',
        title: 'Wzorce i ciagi',
        description:
          'Logiczne myślenie często zaczyna się od dostrzeżenia powtarzającego się układu albo stałej zmiany.',
        example: {
          label: 'Przyklad',
          equation: '2, 4, 6, 8, ?',
          explanation:
            'Kazdy krok zwieksza liczbe o 2, wiec nastepnym elementem jest 10.',
        },
        reminders: [
          'Szukaj stalej roznicy albo powtarzajacej sie grupy elementow.',
          'Wzorzec moze dotyczyc liczb, kolorow, ksztaltow albo wszystkich naraz.',
        ],
      },
      {
        id: 'classification',
        title: 'Klasyfikacja i intruz',
        description:
          'Czasem trzeba ulozyc elementy w grupy wedlug wspolnej cechy, a czasem znalezc ten jeden, ktory do grupy nie pasuje.',
        example: {
          label: 'Przyklad',
          equation: '🍎 🍌 🥕 🍇',
          explanation:
            'Intruziem jest 🥕, bo pozostałe elementy są owocami, a to warzywo.',
        },
        reminders: [
          'Najpierw nazwij wspolna ceche grupy.',
          'Element niepasujacy lamie te sama zasade, ktora laczy reszte.',
        ],
      },
      {
        id: 'reasoning',
        title: 'Jesli... to...',
        description:
          'Wnioskowanie polega na laczeniu znanych faktow i sprawdzaniu, co z nich wynika.',
        example: {
          label: 'Przyklad',
          equation: 'Jesli liczba jest parzysta, to dzieli sie przez 2. Czy 6 jest parzyste?',
          explanation:
            'Tak. Skoro 6 jest parzyste, to zgodnie z regula dzieli sie przez 2.',
        },
        reminders: [
          'Najpierw ustal warunek, potem sprawdz, czy pasuje do konkretnego przypadku.',
          'Nie zgaduj. Pokaz, z ktorego kroku wynika odpowiedz.',
        ],
      },
    ],
    practiceNote:
      'Te lekcje przygotowują do kolejnych logicznych zadań. Na mobile zaczynamy od wspólnych zasad i przykładów, a bardziej interaktywne ćwiczenia dojdą później.',
  },
  logical_patterns: {
    introduction:
      'Wzorce i ciagi ucza przewidywania kolejnego kroku na podstawie reguly. To jedna z najwazniejszych umiejetnosci w zadaniach logicznych i matematycznych.',
    sections: [
      {
        id: 'visual-patterns',
        title: 'Wzorce kolorow i ksztaltow',
        description:
          'Najlatwiejsze wzorce opieraja sie na powtarzajacej sie grupie symboli, kolorow albo ksztaltow.',
        example: {
          label: 'Przyklad',
          equation: '🔴 🔵 🔴 🔵 🔴 ?',
          explanation:
            'Powtarza sie wzorzec czerwony-niebieski, wiec brakujacym elementem jest 🔵.',
        },
        reminders: [
          'Znajdź najmniejszą część, która się powtarza.',
          'Sprawdz, czy ta sama regula dziala od poczatku do konca.',
        ],
      },
      {
        id: 'arithmetic-sequences',
        title: 'Ciagi ze stala roznica',
        description:
          'W ciagach arytmetycznych kazdy kolejny element zmienia sie o taka sama wartosc.',
        example: {
          label: 'Przyklad',
          equation: '5, 10, 15, 20, ?',
          explanation:
            'Kazdy krok dodaje 5, wiec kolejnym elementem jest 25.',
        },
        reminders: [
          'Odejmij sasiednie liczby i sprawdz, czy roznica jest stala.',
          'Jesli roznica sie nie zgadza, szukaj innego typu reguly.',
        ],
      },
      {
        id: 'geometric-sequences',
        title: 'Ciagi ze stalym ilorazem',
        description:
          'Niektore ciagi nie dodaja stalej liczby, tylko za kazdym razem mnoza przez ta sama wartosc.',
        example: {
          label: 'Przyklad',
          equation: '1, 2, 4, 8, 16, ?',
          explanation:
            'Kazdy element jest dwa razy wiekszy od poprzedniego, wiec kolejnym jest 32.',
        },
        reminders: [
          'Podziel kolejny wyraz przez poprzedni i sprawdz, czy iloraz sie powtarza.',
          'Szybki wzrost ciagu czesto oznacza mnozenie, a nie dodawanie.',
        ],
      },
      {
        id: 'strategy',
        title: 'Jak szukac reguly',
        description:
          'Gdy wzorzec nie jest oczywisty, warto przejsc przez krotka liste kontrolna zamiast zgadywac.',
        example: {
          label: 'Przyklad',
          equation: '3, 6, 12, 24, ?',
          explanation:
            'Najpierw sprawdzasz roznice, potem iloraz. Tu kazdy krok mnozy przez 2, wiec wynik to 48.',
        },
        reminders: [
          'Najpierw sprawdz roznice, potem iloraz, a na koncu relacje kilku poprzednich elementow.',
          'Potwierdz regula na wszystkich znanych elementach, nie tylko na dwoch pierwszych.',
        ],
      },
    ],
    practiceNote:
      'Mobilny ekran daje juz prawdziwe wprowadzenie do wzorcow i ciagow. Kolejne logiczne tematy beda mogly wykorzystywac ten sam sposob myslenia.',
  },
  logical_classification: {
    introduction:
      'Klasyfikacja polega na grupowaniu elementow wedlug wspolnej cechy. To jeden z najprostszych i najwazniejszych sposobow porzadkowania informacji.',
    sections: [
      {
        id: 'intro',
        title: 'Co to jest klasyfikacja',
        description:
          'Aby poprawnie klasyfikowac, trzeba najpierw nazwac ceche, ktora laczy elementy w jedna grupe.',
        example: {
          label: 'Przyklad',
          equation: '🍎 🍌 🍇 🍓',
          explanation:
            'Te elementy można połączyć w grupę owoców, bo mają wspólną kategorię.',
        },
        reminders: [
          'Grupować można według koloru, kształtu, rozmiaru, kategorii albo własności liczbowej.',
          'Najpierw ustal cechę, dopiero potem układaj grupy.',
        ],
      },
      {
        id: 'many-features',
        title: 'Wiele cech naraz',
        description:
          'Czasem jedna cecha nie wystarcza i trzeba jednoczesnie patrzec na kolor, rozmiar albo inna dodatkowa wlasciwosc.',
        example: {
          label: 'Przyklad',
          equation: 'duze czerwone / duze niebieskie / male czerwone / male niebieskie',
          explanation:
            'Tutaj jedna grupa powstaje z polaczenia dwoch cech: rozmiaru i koloru.',
        },
        reminders: [
          'Kazda dodatkowa cecha zwieksza liczbe mozliwych grup.',
          'Opisuj grupy precyzyjnie, aby nie mieszac roznych kryteriow.',
        ],
      },
      {
        id: 'intruder',
        title: 'Znajdz intruza',
        description:
          'Zadania z intruzem sprawdzaja, czy rozumiesz regule grupy i umiesz wskazac element, ktory ja lamie.',
        example: {
          label: 'Przyklad',
          equation: '2, 4, 7, 8, 10',
          explanation:
            'Intruziem jest 7, bo pozostałe liczby są parzyste, a 7 jest nieparzysta.',
        },
        reminders: [
          'Najpierw ustal wspolna ceche wiekszosci elementow.',
          'Intruz nie pasuje do reguly, ale powinienes umiec powiedziec dlaczego.',
        ],
      },
      {
        id: 'venn',
        title: 'Diagram Venna i podsumowanie',
        description:
          'Diagram Venna pomaga pokazac, co nalezy do jednej grupy, do drugiej, albo do obu jednoczesnie.',
        example: {
          label: 'Przyklad',
          equation: 'sport / muzyka / oba',
          explanation:
            'Część wspólna pokazuje elementy, które pasują do dwóch kategorii naraz.',
        },
        reminders: [
          'Część wspólna to przecięcie dwóch zbiorów.',
          'Klasyfikacja porzadkuje informacje i ulatwia dalsze wnioskowanie.',
        ],
      },
    ],
    practiceNote:
      'Mobilna wersja daje juz pelny tok myslenia potrzebny do zadan klasyfikacyjnych, nawet jesli bardziej rozbudowane interakcje zostaja jeszcze po stronie web.',
  },
  logical_reasoning: {
    introduction:
      'Wnioskowanie logiczne polega na przechodzeniu od znanych faktow do nowych wnioskow. Zamiast zgadywac, opierasz sie na zasadach i sprawdzasz, co z nich wynika.',
    sections: [
      {
        id: 'intro',
        title: 'Co to jest wnioskowanie',
        description:
          'Wnioskowanie moze isc od ogolu do szczegolu albo od wielu obserwacji do bardziej ogolnej hipotezy.',
        example: {
          label: 'Przyklad',
          equation: 'Wszystkie psy szczekaja. Burek jest psem.',
          explanation:
            'Z tych dwoch informacji wynika, ze Burek szczeka.',
        },
        reminders: [
          'Dedukcja przechodzi od reguly ogolnej do konkretnego przypadku.',
          'Dobry wniosek musi opierac sie na tym, co naprawde wiemy.',
        ],
      },
      {
        id: 'if-then',
        title: 'Jesli... to...',
        description:
          'Zdania warunkowe lacza warunek z konsekwencja i sa podstawowym narzedziem logicznego myslenia.',
        example: {
          label: 'Przyklad',
          equation: 'Jesli liczba jest parzysta, to dzieli sie przez 2.',
          explanation:
            'Skoro 8 jest parzyste, to zgodnie z regula 8 dzieli sie przez 2.',
        },
        reminders: [
          'Nie myl reguly z jej odwrotnoscia.',
          'Najpierw sprawdz, czy warunek jest spelniony.',
        ],
      },
      {
        id: 'quantifiers',
        title: 'Wszyscy, niektorzy, zaden',
        description:
          'Kwantyfikatory pokazuja, jak szeroko dziala dane twierdzenie i przed czym trzeba uwazac przy wyciaganiu wnioskow.',
        example: {
          label: 'Przyklad',
          equation: 'Niektore koty sa rude.',
          explanation:
            'To nie znaczy, że każdy kot jest rudy. Twierdzenie dotyczy tylko części kotów.',
        },
        reminders: [
          'Wszyscy oznacza kazdy przypadek.',
          'Niektórzy oznacza tylko część przypadków.',
          'Zaden oznacza brak jakiegokolwiek wyjatku.',
        ],
      },
      {
        id: 'puzzles',
        title: 'Zagadki krok po kroku',
        description:
          'Przy bardziej zlozonych zadaniach trzeba laczyc kilka wskazowek, eliminowac niemozliwe opcje i stale sprawdzac zgodnosc rozwiazania.',
        example: {
          label: 'Przyklad',
          equation: 'Sa trzy domy: czerwony, niebieski, zielony...',
          explanation:
            'Rozwiązywanie zagadki polega na zapisywaniu pewnych faktów i systematycznym odrzucaniu tego, co niemożliwe.',
        },
        reminders: [
          'Zacznij od faktow bezposrednich.',
          'Eliminacja blednych opcji czesto prowadzi do poprawnej odpowiedzi.',
        ],
      },
    ],
    practiceNote:
      'Ten temat przygotowuje do trudniejszych zagadek logicznych. Na mobile przenosimy najpierw sam sposob myslenia i strukture rozwiazywania problemow.',
  },
  logical_analogies: {
    introduction:
      'Analogia polega na odnalezieniu tej samej relacji w dwoch roznych parach. Nie chodzi o podobienstwo powierzchowne, tylko o ten sam typ polaczenia.',
    sections: [
      {
        id: 'intro',
        title: 'Co to jest analogia',
        description:
          'W analogii szukasz odpowiedzi na pytanie: jaka relacja łączy pierwszą parę i jak przenieść ją na drugą?',
        example: {
          label: 'Przyklad',
          equation: 'Ptak : latac = ryba : ?',
          explanation:
            'Relacja to stworzenie i sposob poruszania sie, wiec odpowiedzia jest plywac.',
        },
        reminders: [
          'Najpierw nazwij relacje w pierwszej parze.',
          'Dopiero potem szukaj elementu, ktory odtworzy te sama relacje.',
        ],
      },
      {
        id: 'verbal',
        title: 'Analogie slowne',
        description:
          'Analogie słowne mogą opierać się na przeciwieństwie, funkcji, części i całości albo typowym działaniu.',
        example: {
          label: 'Przyklad',
          equation: 'Nozyczki : ciecie = olowek : ?',
          explanation:
            'To relacja narzedzie -> funkcja, wiec odpowiedzia jest pisanie.',
        },
        reminders: [
          'Szukanie typu relacji jest wazniejsze niz same slowa.',
          'Przeciwienstwo i funkcja to dwa bardzo czeste rodzaje analogii.',
        ],
      },
      {
        id: 'numbers-shapes',
        title: 'Analogie liczbowe i ksztaltow',
        description:
          'W analogiach liczbowych lub wizualnych ta sama operacja zmienia liczby, kierunki, kolory albo liczbe elementow.',
        example: {
          label: 'Przyklad',
          equation: '2 : 4 = 5 : ?',
          explanation:
            'Relacja to mnozenie przez 2, wiec brakujacy wynik to 10.',
        },
        reminders: [
          'Przy liczbach sprawdz dodawanie, odejmowanie, mnozenie i dzielenie.',
          'Przy ksztaltach patrz na obrot, wielkosc, kolor i liczbe elementow.',
        ],
      },
      {
        id: 'cause-whole',
        title: 'Część-całość i przyczyna-skutek',
        description:
          'Wiele analogii opiera sie na tym, ze jeden element nalezy do drugiego albo cos wywoluje okreslony efekt.',
        example: {
          label: 'Przyklad',
          equation: 'Strona : ksiazka = cegla : ?',
          explanation:
            'To relacja część -> całość, więc odpowiedzią jest mur albo budynek.',
        },
        reminders: [
          'Część-całość to bardzo częsty wzorzec w zadaniach analogicznych.',
          'Przyczyna-skutek pyta o to, co wywoluje dany rezultat.',
        ],
      },
    ],
    practiceNote:
      'Analogie ucza przenoszenia reguly do nowego kontekstu. To dobry pomost miedzy prostymi wzorcami a trudniejszym rozumowaniem logicznym.',
  },
};

export const getKangurPortableLessonBody = (
  componentId: KangurLessonComponentId,
): KangurPortableLessonBody | null => KANGUR_PORTABLE_LESSON_BODIES[componentId] ?? null;
