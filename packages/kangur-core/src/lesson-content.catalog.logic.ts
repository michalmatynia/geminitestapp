import type { KangurLessonComponentId } from '@kangur/contracts/kangur-lesson-constants';

import type { KangurPortableLessonBody } from './lesson-content';

export const KANGUR_PORTABLE_LESSON_LOGIC_BODIES: Partial<Record<KangurLessonComponentId, KangurPortableLessonBody>> = {
  "logical_thinking": {
    "introduction": "Myslenie logiczne pomaga porzadkowac informacje, szukac zasad i wyciagac wnioski krok po kroku. To wspolna baza dla zagadek, matematyki i codziennego rozwiazywania problemow.",
    "sections": [
      {
        "id": "intro",
        "title": "Co to jest myslenie logiczne",
        "description": "To umiejetnosc szukania porzadku i sprawdzania, czy odpowiedz rzeczywiscie wynika z danych, a nie z przypadku.",
        "example": {
          "label": "Przyklad",
          "equation": "Jesli wszystkie koty maja cztery lapy, a Mruczek jest kotem...",
          "explanation": "...to mozna wywnioskowac, ze Mruczek ma cztery lapy. Wniosek wynika z podanych informacji."
        },
        "reminders": [
          "Patrz na zasade, nie tylko na pojedynczy przyklad.",
          "Dobra odpowiedz powinna dac sie uzasadnic."
        ]
      },
      {
        "id": "patterns",
        "title": "Wzorce i ciagi",
        "description": "Logiczne myślenie często zaczyna się od dostrzeżenia powtarzającego się układu albo stałej zmiany.",
        "example": {
          "label": "Przyklad",
          "equation": "2, 4, 6, 8, ?",
          "explanation": "Kazdy krok zwieksza liczbe o 2, wiec nastepnym elementem jest 10."
        },
        "reminders": [
          "Szukaj stalej roznicy albo powtarzajacej sie grupy elementow.",
          "Wzorzec moze dotyczyc liczb, kolorow, ksztaltow albo wszystkich naraz."
        ]
      },
      {
        "id": "classification",
        "title": "Klasyfikacja i intruz",
        "description": "Czasem trzeba ulozyc elementy w grupy wedlug wspolnej cechy, a czasem znalezc ten jeden, ktory do grupy nie pasuje.",
        "example": {
          "label": "Przyklad",
          "equation": "🍎 🍌 🥕 🍇",
          "explanation": "Intruziem jest 🥕, bo pozostałe elementy są owocami, a to warzywo."
        },
        "reminders": [
          "Najpierw nazwij wspolna ceche grupy.",
          "Element niepasujacy lamie te sama zasade, ktora laczy reszte."
        ]
      },
      {
        "id": "reasoning",
        "title": "Jesli... to...",
        "description": "Wnioskowanie polega na laczeniu znanych faktow i sprawdzaniu, co z nich wynika.",
        "example": {
          "label": "Przyklad",
          "equation": "Jesli liczba jest parzysta, to dzieli sie przez 2. Czy 6 jest parzyste?",
          "explanation": "Tak. Skoro 6 jest parzyste, to zgodnie z regula dzieli sie przez 2."
        },
        "reminders": [
          "Najpierw ustal warunek, potem sprawdz, czy pasuje do konkretnego przypadku.",
          "Nie zgaduj. Pokaz, z ktorego kroku wynika odpowiedz."
        ]
      }
    ],
    "practiceNote": "Te lekcje przygotowują do kolejnych logicznych zadań. Na mobile zaczynamy od wspólnych zasad i przykładów, a bardziej interaktywne ćwiczenia dojdą później."
  },
  "logical_patterns": {
    "introduction": "Wzorce i ciagi ucza przewidywania kolejnego kroku na podstawie reguly. To jedna z najwazniejszych umiejetnosci w zadaniach logicznych i matematycznych.",
    "sections": [
      {
        "id": "visual-patterns",
        "title": "Wzorce kolorow i ksztaltow",
        "description": "Najlatwiejsze wzorce opieraja sie na powtarzajacej sie grupie symboli, kolorow albo ksztaltow.",
        "example": {
          "label": "Przyklad",
          "equation": "🔴 🔵 🔴 🔵 🔴 ?",
          "explanation": "Powtarza sie wzorzec czerwony-niebieski, wiec brakujacym elementem jest 🔵."
        },
        "reminders": [
          "Znajdź najmniejszą część, która się powtarza.",
          "Sprawdz, czy ta sama regula dziala od poczatku do konca."
        ]
      },
      {
        "id": "arithmetic-sequences",
        "title": "Ciagi ze stala roznica",
        "description": "W ciagach arytmetycznych kazdy kolejny element zmienia sie o taka sama wartosc.",
        "example": {
          "label": "Przyklad",
          "equation": "5, 10, 15, 20, ?",
          "explanation": "Kazdy krok dodaje 5, wiec kolejnym elementem jest 25."
        },
        "reminders": [
          "Odejmij sasiednie liczby i sprawdz, czy roznica jest stala.",
          "Jesli roznica sie nie zgadza, szukaj innego typu reguly."
        ]
      },
      {
        "id": "geometric-sequences",
        "title": "Ciagi ze stalym ilorazem",
        "description": "Niektore ciagi nie dodaja stalej liczby, tylko za kazdym razem mnoza przez ta sama wartosc.",
        "example": {
          "label": "Przyklad",
          "equation": "1, 2, 4, 8, 16, ?",
          "explanation": "Kazdy element jest dwa razy wiekszy od poprzedniego, wiec kolejnym jest 32."
        },
        "reminders": [
          "Podziel kolejny wyraz przez poprzedni i sprawdz, czy iloraz sie powtarza.",
          "Szybki wzrost ciagu czesto oznacza mnozenie, a nie dodawanie."
        ]
      },
      {
        "id": "strategy",
        "title": "Jak szukac reguly",
        "description": "Gdy wzorzec nie jest oczywisty, warto przejsc przez krotka liste kontrolna zamiast zgadywac.",
        "example": {
          "label": "Przyklad",
          "equation": "3, 6, 12, 24, ?",
          "explanation": "Najpierw sprawdzasz roznice, potem iloraz. Tu kazdy krok mnozy przez 2, wiec wynik to 48."
        },
        "reminders": [
          "Najpierw sprawdz roznice, potem iloraz, a na koncu relacje kilku poprzednich elementow.",
          "Potwierdz regula na wszystkich znanych elementach, nie tylko na dwoch pierwszych."
        ]
      }
    ],
    "practiceNote": "Mobilny ekran daje juz prawdziwe wprowadzenie do wzorcow i ciagow. Kolejne logiczne tematy beda mogly wykorzystywac ten sam sposob myslenia."
  },
  "logical_classification": {
    "introduction": "Klasyfikacja polega na grupowaniu elementow wedlug wspolnej cechy. To jeden z najprostszych i najwazniejszych sposobow porzadkowania informacji.",
    "sections": [
      {
        "id": "intro",
        "title": "Co to jest klasyfikacja",
        "description": "Aby poprawnie klasyfikowac, trzeba najpierw nazwac ceche, ktora laczy elementy w jedna grupe.",
        "example": {
          "label": "Przyklad",
          "equation": "🍎 🍌 🍇 🍓",
          "explanation": "Te elementy można połączyć w grupę owoców, bo mają wspólną kategorię."
        },
        "reminders": [
          "Grupować można według koloru, kształtu, rozmiaru, kategorii albo własności liczbowej.",
          "Najpierw ustal cechę, dopiero potem układaj grupy."
        ]
      },
      {
        "id": "many-features",
        "title": "Wiele cech naraz",
        "description": "Czasem jedna cecha nie wystarcza i trzeba jednoczesnie patrzec na kolor, rozmiar albo inna dodatkowa wlasciwosc.",
        "example": {
          "label": "Przyklad",
          "equation": "duze czerwone / duze niebieskie / male czerwone / male niebieskie",
          "explanation": "Tutaj jedna grupa powstaje z polaczenia dwoch cech: rozmiaru i koloru."
        },
        "reminders": [
          "Kazda dodatkowa cecha zwieksza liczbe mozliwych grup.",
          "Opisuj grupy precyzyjnie, aby nie mieszac roznych kryteriow."
        ]
      },
      {
        "id": "intruder",
        "title": "Znajdz intruza",
        "description": "Zadania z intruzem sprawdzaja, czy rozumiesz regule grupy i umiesz wskazac element, ktory ja lamie.",
        "example": {
          "label": "Przyklad",
          "equation": "2, 4, 7, 8, 10",
          "explanation": "Intruziem jest 7, bo pozostałe liczby są parzyste, a 7 jest nieparzysta."
        },
        "reminders": [
          "Najpierw ustal wspolna ceche wiekszosci elementow.",
          "Intruz nie pasuje do reguly, ale powinienes umiec powiedziec dlaczego."
        ]
      },
      {
        "id": "venn",
        "title": "Diagram Venna i podsumowanie",
        "description": "Diagram Venna pomaga pokazac, co nalezy do jednej grupy, do drugiej, albo do obu jednoczesnie.",
        "example": {
          "label": "Przyklad",
          "equation": "sport / muzyka / oba",
          "explanation": "Część wspólna pokazuje elementy, które pasują do dwóch kategorii naraz."
        },
        "reminders": [
          "Część wspólna to przecięcie dwóch zbiorów.",
          "Klasyfikacja porzadkuje informacje i ulatwia dalsze wnioskowanie."
        ]
      }
    ],
    "practiceNote": "Mobilna wersja daje juz pelny tok myslenia potrzebny do zadan klasyfikacyjnych, nawet jesli bardziej rozbudowane interakcje zostaja jeszcze po stronie web."
  },
  "logical_reasoning": {
    "introduction": "Wnioskowanie logiczne polega na przechodzeniu od znanych faktow do nowych wnioskow. Zamiast zgadywac, opierasz sie na zasadach i sprawdzasz, co z nich wynika.",
    "sections": [
      {
        "id": "intro",
        "title": "Co to jest wnioskowanie",
        "description": "Wnioskowanie moze isc od ogolu do szczegolu albo od wielu obserwacji do bardziej ogolnej hipotezy.",
        "example": {
          "label": "Przyklad",
          "equation": "Wszystkie psy szczekaja. Burek jest psem.",
          "explanation": "Z tych dwoch informacji wynika, ze Burek szczeka."
        },
        "reminders": [
          "Dedukcja przechodzi od reguly ogolnej do konkretnego przypadku.",
          "Dobry wniosek musi opierac sie na tym, co naprawde wiemy."
        ]
      },
      {
        "id": "if-then",
        "title": "Jesli... to...",
        "description": "Zdania warunkowe lacza warunek z konsekwencja i sa podstawowym narzedziem logicznego myslenia.",
        "example": {
          "label": "Przyklad",
          "equation": "Jesli liczba jest parzysta, to dzieli sie przez 2.",
          "explanation": "Skoro 8 jest parzyste, to zgodnie z regula 8 dzieli sie przez 2."
        },
        "reminders": [
          "Nie myl reguly z jej odwrotnoscia.",
          "Najpierw sprawdz, czy warunek jest spelniony."
        ]
      },
      {
        "id": "quantifiers",
        "title": "Wszyscy, niektorzy, zaden",
        "description": "Kwantyfikatory pokazuja, jak szeroko dziala dane twierdzenie i przed czym trzeba uwazac przy wyciaganiu wnioskow.",
        "example": {
          "label": "Przyklad",
          "equation": "Niektore koty sa rude.",
          "explanation": "To nie znaczy, że każdy kot jest rudy. Twierdzenie dotyczy tylko części kotów."
        },
        "reminders": [
          "Wszyscy oznacza kazdy przypadek.",
          "Niektórzy oznacza tylko część przypadków.",
          "Zaden oznacza brak jakiegokolwiek wyjatku."
        ]
      },
      {
        "id": "puzzles",
        "title": "Zagadki krok po kroku",
        "description": "Przy bardziej zlozonych zadaniach trzeba laczyc kilka wskazowek, eliminowac niemozliwe opcje i stale sprawdzac zgodnosc rozwiazania.",
        "example": {
          "label": "Przyklad",
          "equation": "Sa trzy domy: czerwony, niebieski, zielony...",
          "explanation": "Rozwiązywanie zagadki polega na zapisywaniu pewnych faktów i systematycznym odrzucaniu tego, co niemożliwe."
        },
        "reminders": [
          "Zacznij od faktow bezposrednich.",
          "Eliminacja blednych opcji czesto prowadzi do poprawnej odpowiedzi."
        ]
      }
    ],
    "practiceNote": "Ten temat przygotowuje do trudniejszych zagadek logicznych. Na mobile przenosimy najpierw sam sposob myslenia i strukture rozwiazywania problemow."
  },
  "logical_analogies": {
    "introduction": "Analogia polega na odnalezieniu tej samej relacji w dwoch roznych parach. Nie chodzi o podobienstwo powierzchowne, tylko o ten sam typ polaczenia.",
    "sections": [
      {
        "id": "intro",
        "title": "Co to jest analogia",
        "description": "W analogii szukasz odpowiedzi na pytanie: jaka relacja łączy pierwszą parę i jak przenieść ją na drugą?",
        "example": {
          "label": "Przyklad",
          "equation": "Ptak : latac = ryba : ?",
          "explanation": "Relacja to stworzenie i sposob poruszania sie, wiec odpowiedzia jest plywac."
        },
        "reminders": [
          "Najpierw nazwij relacje w pierwszej parze.",
          "Dopiero potem szukaj elementu, ktory odtworzy te sama relacje."
        ]
      },
      {
        "id": "verbal",
        "title": "Analogie slowne",
        "description": "Analogie słowne mogą opierać się na przeciwieństwie, funkcji, części i całości albo typowym działaniu.",
        "example": {
          "label": "Przyklad",
          "equation": "Nozyczki : ciecie = olowek : ?",
          "explanation": "To relacja narzedzie -> funkcja, wiec odpowiedzia jest pisanie."
        },
        "reminders": [
          "Szukanie typu relacji jest wazniejsze niz same slowa.",
          "Przeciwienstwo i funkcja to dwa bardzo czeste rodzaje analogii."
        ]
      },
      {
        "id": "numbers-shapes",
        "title": "Analogie liczbowe i ksztaltow",
        "description": "W analogiach liczbowych lub wizualnych ta sama operacja zmienia liczby, kierunki, kolory albo liczbe elementow.",
        "example": {
          "label": "Przyklad",
          "equation": "2 : 4 = 5 : ?",
          "explanation": "Relacja to mnozenie przez 2, wiec brakujacy wynik to 10."
        },
        "reminders": [
          "Przy liczbach sprawdz dodawanie, odejmowanie, mnozenie i dzielenie.",
          "Przy ksztaltach patrz na obrot, wielkosc, kolor i liczbe elementow."
        ]
      },
      {
        "id": "cause-whole",
        "title": "Część-całość i przyczyna-skutek",
        "description": "Wiele analogii opiera sie na tym, ze jeden element nalezy do drugiego albo cos wywoluje okreslony efekt.",
        "example": {
          "label": "Przyklad",
          "equation": "Strona : ksiazka = cegla : ?",
          "explanation": "To relacja część -> całość, więc odpowiedzią jest mur albo budynek."
        },
        "reminders": [
          "Część-całość to bardzo częsty wzorzec w zadaniach analogicznych.",
          "Przyczyna-skutek pyta o to, co wywoluje dany rezultat."
        ]
      }
    ],
    "practiceNote": "Analogie ucza przenoszenia reguly do nowego kontekstu. To dobry pomost miedzy prostymi wzorcami a trudniejszym rozumowaniem logicznym."
  }
};

