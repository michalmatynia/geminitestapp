import type { KangurAddingLessonTemplateContent } from '@/shared/contracts/kangur-lesson-templates';

export const ADDING_LESSON_DEFAULTS: Omit<KangurAddingLessonTemplateContent, 'kind'> = {
  lessonTitle: 'Dodawanie',
  sections: {
    podstawy: {
      title: 'Podstawy dodawania',
      description: 'Co to dodawanie? Jednocyfrowe + animacja',
    },
    przekroczenie: {
      title: 'Dodawanie przez 10',
      description: 'Uzupełnianie do dziesięciu',
    },
    dwucyfrowe: {
      title: 'Dodawanie dwucyfrowe',
      description: 'Dziesiątki i jedności osobno',
    },
    zapamietaj: {
      title: 'Zapamiętaj!',
      description: 'Zasady dodawania',
    },
    synthesis: {
      title: 'Synteza dodawania',
      description: 'Rytmiczne tory odpowiedzi i szybkie sumy',
    },
    game: {
      title: 'Gra z piłkami',
      description: 'Ćwicz dodawanie przesuwając piłki',
    },
  },
  slides: {
    podstawy: {
      meaning: {
        title: 'Co to znaczy dodawać?',
        lead: 'Dodawanie to łączenie dwóch grup razem, żeby policzyć, ile ich jest łącznie.',
        partLabel: 'Część',
        totalLabel: 'Całość',
        caption: 'Część + część daje całość.',
        startLabel: 'Start',
        combineLabel: 'Połącz',
        resultLabel: 'Wynik',
      },
      singleDigit: {
        title: 'Dodawanie jednocyfrowe',
        lead: 'Możesz liczyć na palcach lub w myślach. Zacznij od większej liczby!',
        step1: 'Startuj od większej liczby: 4',
        step2: 'Dolicz trzy kroki w górę: 5, 6, 7',
        step3: 'Ostatnia liczba to wynik: 7 ✓',
        staircaseLabel: 'Schodki',
        countUpLabel: 'liczenie w górę',
        caption: 'Startuj od 4 i zrób trzy kroki: 5, 6, 7.',
        startLargeChip: 'Start od większej',
        countUpChip: 'Liczenie w górę',
        quickResultChip: 'Szybki wynik',
      },
      motion: {
        title: 'Dodawanie w ruchu',
        lead: 'Animacja pokazuje, jak dwie grupy przesuwają się i łączą w jedną sumę.',
        caption: 'Kropki łączą się w jedną grupę i tworzą sumę.',
        groupA: 'Grupa A',
        groupB: 'Grupa B',
        sum: 'Suma',
      },
    },
    przekroczenie: {
      overTen: {
        title: 'Dodawanie z przekroczeniem 10',
        lead: 'Gdy suma przekracza 10, możesz uzupełnić do 10 i dodać resztę.',
        caption: '7 + 3 = 10, zostaje jeszcze 2, więc 10 + 2 = 12 ✓',
        step1Title: 'Krok 1',
        step1Text: 'Uzupełnij do 10: 7 + 3 = 10',
        step2Title: 'Krok 2',
        step2Text: 'Dodaj resztę: +2',
        targetLabel: 'Cel: 10',
        remainingChip: 'Zostaje +2',
      },
      numberLine: {
        title: 'Skoki na osi liczbowej',
        lead: 'Skocz do 10, a potem dodaj resztę.',
        caption: '8 + 2 = 10, zostaje 3, więc 10 + 3 = 13.',
        startChip: 'Start 8',
        plusTwoChip: '+2',
        tenChip: '10',
        plusThreeChip: '+3',
        resultChip: '13',
      },
      tenFrame: {
        title: 'Ramka dziesiątki',
        lead: 'Wypełnij brakujące pola do 10, a resztę dodaj obok.',
        caption: 'Najpierw +3 do 10, potem jeszcze +2.',
        miniPlanTitle: 'Mini plan',
        steps: ['Uzupełnij ramkę do 10', 'Dodaj resztę obok', 'Połącz obie części w wynik'],
      },
    },
    dwucyfrowe: {
      intro: {
        title: 'Dodawanie dwucyfrowe',
        lead: 'Dodawaj osobno dziesiątki i jedności!',
        tensLabel: 'Dziesiątki',
        onesLabel: 'Jedności',
        schemeTitle: 'Schemat',
        schemeCaption: 'dziesiątki + jedności',
      },
      motion: {
        title: 'Dodawanie dwucyfrowe w ruchu',
        lead:
          'Najpierw zsumuj dziesiątki, potem jedności. Animacja pokazuje, jak grupy łączą się w wynik.',
        caption: 'Dziesiątki: 20 + 10, jedności: 4 + 3.',
      },
      blocks: {
        title: 'Bloki dziesiątek i jedności',
        lead:
          'Kolorowe bloki pokazują, że dziesiątki i jedności łączą się osobno.',
        caption: 'Najpierw 20 + 10, potem 4 + 3. Suma składa się z obu części.',
        tensChip: 'Dziesiątki',
        onesChip: 'Jedności',
        sumChip: 'Suma',
      },
      columns: {
        title: 'Kolumny dziesiątek i jedności',
        lead:
          'Ułóż liczby w kolumnach: dziesiątki pod dziesiątkami, jedności pod jednościami. Potem dodaj osobno.',
        caption: 'Najpierw dziesiątki, potem jedności. Wynik składa się z obu kolumn.',
        tensLabel: 'Dziesiątki',
        onesLabel: 'Jedności',
      },
      abacus: {
        title: 'Liczydło',
        lead:
          'Liczydło pomaga przesuwać koraliki: osobno dziesiątki i jedności, a potem odczytać sumę.',
        caption: 'Koraliki przesuwają się do wspólnej sumy.',
        tensChip: 'Dziesiątki',
        onesChip: 'Jedności',
        sumChip: 'Suma',
      },
    },
    zapamietaj: {
      rules: {
        title: 'Zasady dodawania',
        orderChip: 'Kolejność: 3 + 5 = 5 + 3',
        zeroChip: 'Dodawanie 0: 7 + 0 = 7',
        startChip: 'Startuj od większej liczby',
        groupChip: 'Grupuj do 10',
        pairsTitle: 'Pary do 10',
        pairsText: 'Szukaj par: 6 + 4 = 10',
        doublesTitle: 'Podwojenia',
        doublesText: 'Podwojenia dają szybki wynik: 5 + 5 = 10',
        groupingTitle: 'Grupowanie',
        groupingText: '(2 + 3) + 4 = 2 + (3 + 4)',
        pathTitle: 'Ścieżka',
        pathStep1Title: 'Znajdź pary do 10',
        pathStep1Text: '6 + 4, 7 + 3, 8 + 2',
        pathStep2Title: 'Użyj podwojeń',
        pathStep2Text: '5 + 5, 6 + 6',
        pathStep3Title: 'Grupuj liczby',
        pathStep3Text: 'Najpierw łatwiejsza suma',
      },
      commutative: {
        title: 'Zamiana składników',
        label: 'Zamiana składników',
        description: 'Zamień kolejność i porównaj wynik.',
        caption: 'Zamień kolejność, a wynik zostaje taki sam.',
      },
      associative: {
        title: 'Nawiasy i grupowanie',
        bracketsLabel: 'Nawiasy',
        groupingLabel: 'grupowanie',
        description: 'Sprawdź, że różne grupowanie daje ten sam wynik.',
        caption: 'Grupuj liczby tak, by łatwiej je zsumować.',
      },
      zero: {
        title: 'Zero = bez zmian',
        zeroLabel: 'Zero',
        noChangeLabel: 'bez zmian',
        description: 'Dodaj zero i zobacz, co się stanie.',
        caption: 'Dodanie 0 nie zmienia wyniku.',
      },
      makeTen: {
        title: 'Dopełnij do 10',
        label: 'Dopełnij do 10',
        description: 'Szukaj par, które razem dają 10.',
        caption: 'Szukaj par, które razem dają 10.',
      },
      doubles: {
        title: 'Podwojenia',
        label: 'Podwojenia',
        description: 'Powtórz tę samą liczbę i policz szybciej.',
        caption: 'Powtórz tę samą liczbę, a wynik jest szybki.',
      },
    },
  },
  game: {
    gameTitle: 'Gra z piłkami!',
  },
  synthesis: {
    gameTitle: 'Synteza dodawania',
  },
};
