import type { KangurLogicalClassificationLessonTemplateContent } from '@/shared/contracts/kangur-lesson-templates';

export const LOGICAL_CLASSIFICATION_LESSON_COMPONENT_CONTENT: KangurLogicalClassificationLessonTemplateContent =
  {
    kind: 'logical_classification',
    lessonTitle: 'Klasyfikacja',
    sections: {
      intro: {
        title: 'Klasyfikacja — wstęp',
        description: 'Co to klasyfikacja? Grupowanie według cech',
      },
      diagram: {
        title: 'Wiele cech i diagram Venna',
        description: 'Wielokryteriowe grupowanie i przecięcia zbiorów',
      },
      intruz: {
        title: 'Znajdź intruza',
        description: 'Poziom 1, 2 i 3 — co nie pasuje?',
      },
      podsumowanie: {
        title: 'Podsumowanie',
        description: 'Wszystkie zasady razem',
      },
      game: {
        title: 'Laboratorium klasyfikacji',
        description: 'Sortuj i znajdź intruza',
      },
    },
    slides: {
      intro: {
        basics: {
          title: 'Co to jest klasyfikacja?',
          lead:
            'Klasyfikacja to układanie rzeczy w grupy według wspólnej cechy. To podstawa porządku w myśleniu i w życiu!',
          caption:
            'Najpierw zauważ cechę — potem przyporządkuj do właściwej grupy.',
          criteriaLabel: 'Klasyfikujemy według:',
          criteria: {
            color: '🎨 Koloru — czerwone vs. niebieskie',
            shape: '🔷 Kształtu — okrągłe vs. kwadratowe',
            size: '📏 Rozmiaru — duże vs. małe',
            category: '📂 Kategorii — owoce vs. warzywa',
            number: '🔢 Liczby — parzyste vs. nieparzyste',
          },
        },
        grouping: {
          title: 'Grupowanie według cech',
          lead:
            'Patrz na wszystkie cechy i wybierz te, która jest wspólna dla całej grupy.',
          caption:
            'Rozmiar to prosta cecha — duże i małe elementy tworzą różne zbiory.',
          cards: {
            flyingAnimals: {
              title: 'Zwierzęta latające',
              items: '🦅 🦆 🐝 🦋',
              note: 'Cecha: mają skrzydła',
            },
            waterAnimals: {
              title: 'Zwierzęta wodne',
              items: '🐟 🐬 🦈 🐙',
              note: 'Cecha: żyją w wodzie',
            },
            evenNumbers: {
              title: 'Liczby parzyste',
              items: '2 4 6 8',
              note: 'Cecha: dzielą się przez 2',
            },
            oddNumbers: {
              title: 'Liczby nieparzyste',
              items: '1 3 5 7',
              note: 'Cecha: nie dzielą się przez 2',
            },
          },
        },
        shapeSorting: {
          title: 'Sortowanie według kształtu',
          lead:
            'Kształt to cecha, którą łatwo rozpoznać — wystarczy spojrzeć na krawędzie i kąty.',
          caption: 'Koła i kwadraty trafiają do różnych pojemników.',
          cards: {
            circles: {
              title: 'Koła',
              items: '⚪ ⚪ ⚪',
              note: 'Cecha: brak kątów',
            },
            squares: {
              title: 'Kwadraty',
              items: '⬜ ⬜ ⬜',
              note: 'Cecha: cztery równe boki',
            },
          },
        },
        categories: {
          title: 'Kategorie i sortowanie',
          lead:
            'Kategorie to większe „pudełka” na rzeczy. Dzięki nim łatwo utrzymasz porządek.',
          caption: 'Każdy element ląduje w odpowiednim koszyku.',
          examplesLabel: 'Przykłady kategorii:',
          examples: {
            fruit: '🍎 Owoce',
            vegetables: '🥕 Warzywa',
            toys: '🧸 Zabawki',
          },
        },
      },
      diagram: {
        multiCriteria: {
          title: 'Wiele cech naraz',
          lead:
            'Czasem trzeba wziąć pod uwagę dwie cechy jednocześnie. To trudniejsze, ale daje precyzyjniejszy podział.',
          gridCaption:
            'Dwie cechy tworzą siatkę 2×2 — każda kratka to osobna grupa.',
          axesCaption:
            'Najpierw wybierz osie kryteriów, a potem przypisz elementy do pola.',
          exampleLabel: 'Figury: duże/małe × czerwone/niebieskie',
          items: {
            bigRed: {
              label: 'Duże czerwone',
              icons: '🔴🔴',
            },
            bigBlue: {
              label: 'Duże niebieskie',
              icons: '🔵🔵',
            },
            smallRed: {
              label: 'Małe czerwone',
              icons: '🔴',
            },
            smallBlue: {
              label: 'Małe niebieskie',
              icons: '🔵',
            },
          },
          summary: '2 cechy × 2 wartości = 4 różne grupy',
        },
        venn: {
          title: 'Diagram Venna',
          lead:
            'Diagram Venna pokazuje, co należy do jednej grupy, do drugiej, lub do obu jednocześnie — to część wspólna (przecięcie).',
          overlapCaption:
            'Środek diagramu to część wspólna — elementy należące do obu grup.',
          unionCaption:
            'Unia to wszystko, co jest w zbiorze A lub w zbiorze B.',
          exampleLabel: 'Kocha sport vs. kocha muzykę',
          zones: {
            onlySport: {
              label: 'Tylko sport',
              icons: '⚽ 🏀',
            },
            both: {
              label: 'Oba!',
              icons: '🤸',
            },
            onlyMusic: {
              label: 'Tylko muzyka',
              icons: '🎸 🎹',
            },
          },
        },
        switchCriteria: {
          title: 'Zmiana kryterium',
          lead:
            'Te same elementy można posortować na różne sposoby — zależy od tego, jakie kryterium wybierzesz.',
          caption:
            'Najpierw kolor, potem kształt — układ grup się zmienia.',
          pickLabel: 'Wybierz kryterium:',
          tips: {
            first: 'Najpierw najprostsza cecha (np. kolor).',
            second: 'Potem dokładniejsza (np. kształt).',
          },
        },
      },
      intruz: {
        level1: {
          title: 'Znajdź intruza — poziom 1',
          lead:
            'Jeden element nie pasuje do grupy. Znajdź go i wyjaśnij, dlaczego wyłamuje się z reguły.',
          caption:
            'Intruz łamie regułę — dlatego wyróżnia się na tle grupy.',
          examples: {
            fruits: {
              items: '🍎 🍌 🥕 🍇 🍓',
              answer: '🥕 — to warzywo, reszta to owoce',
            },
            numbers: {
              items: '2, 4, 7, 8, 10',
              answer: '7 — tylko ona jest nieparzysta',
            },
            animals: {
              items: '🐦 🦅 🐝 🐈 🦋',
              answer: '🐈 — kot nie lata, reszta ma skrzydła',
            },
          },
        },
        level2: {
          title: 'Znajdź intruza — poziom 2',
          lead:
            'Trudniejsze zagadki — intruz może być ukryty pod nieoczywistą cechą.',
          caption:
            'Najpierw znajdź regułę, a potem element, który jej nie spełnia.',
          examples: {
            multiples: {
              items: '3, 6, 9, 12, 16',
              answer: '16 — nie jest wielokrotnością 3',
            },
            space: {
              items: '🌍 🌙 ☀️ ⭐ 🪐',
              answer: '🌙 — tylko księżyc nie świeci własnym światłem',
            },
            shapes: {
              items: 'kwadrat, trójkąt, koło, romb',
              answer: 'Koło — jedyna figura bez kątów i prostych boków',
            },
          },
        },
        level3: {
          title: 'Znajdź intruza — poziom 3',
          lead:
            'Intruz może zaburzać wzór lub kolejność. Sprawdź, co się powtarza.',
          caption:
            'Wzór się powtarza, ale jeden element go psuje.',
          examples: {
            shape: {
              items: '⚪ ⬜ ⚪ 🔺 ⚪ ⬜',
              answer: '🔺 — inny kształt niż reszta',
            },
            color: {
              items: '🔴 🔵 🔴 🔵 🟢 🔴',
              answer: '🟢 — inny kolor w środku wzoru',
            },
          },
        },
      },
      podsumowanie: {
        overview: {
          title: 'Podsumowanie',
          caption:
            'Pamiętaj: cecha, grupowanie, przecięcie i intruz.',
          items: {
            classification:
              '🗂️ Klasyfikacja — grupuj według jednej wspólnej cechy',
            manyCriteria:
              '🔀 Wiele cech — precyzyjny podział wymaga kilku kryteriów',
            venn:
              '🔵🟡 Diagram Venna — część wspólna to przecięcie dwóch zbiorów',
            oddOneOut1:
              '🔎 Intruz poz. 1 — oczywista cecha łamana przez jeden element',
            oddOneOut2:
              '🧩 Intruz poz. 2 — nieoczywiste cechy ukryte głębiej',
            oddOneOut3:
              '🎯 Intruz poz. 3 — zaburzony wzór lub sekwencja',
          },
          closing:
            'Klasyfikacja to klucz do porządku w świecie i w głowie!',
        },
        color: {
          title: 'Kolor',
          caption: 'Kolor',
        },
        shape: {
          title: 'Kształt',
          caption: 'Kształt',
        },
        parity: {
          title: 'Parzyste i nieparzyste',
          caption: 'Parzyste i nieparzyste',
        },
        twoCriteria: {
          title: 'Dwie cechy naraz',
          caption: 'Dwie cechy naraz',
        },
        intersection: {
          title: 'Przecięcie zbiorów',
          caption: 'Przecięcie zbiorów',
        },
        oddOneOut: {
          title: 'Intruz',
          caption: 'Intruz',
        },
      },
    },
    game: {
      gameTitle: 'Laboratorium klasyfikacji',
    },
  };
