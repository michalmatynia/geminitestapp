import {
  resolveKangurLessonTemplateComponentContent,
} from '@/features/kangur/lessons/lesson-template-component-content';
import type {
  KangurLessonTemplate,
  KangurSubtractingLessonTemplateContent,
} from '@/shared/contracts/kangur-lesson-templates';

export const SUBTRACTING_LESSON_COMPONENT_CONTENT: KangurSubtractingLessonTemplateContent = {
  kind: 'subtracting',
  lessonTitle: 'Odejmowanie',
  sections: {
    podstawy: {
      title: 'Podstawy odejmowania',
      description: 'Co to odejmowanie? Jednocyfrowe',
    },
    przekroczenie: {
      title: 'Odejmowanie przez 10',
      description: 'Rozkład przez dziesięć',
    },
    dwucyfrowe: {
      title: 'Odejmowanie dwucyfrowe',
      description: 'Dziesiątki i jedności osobno',
    },
    zapamietaj: {
      title: 'Zapamiętaj!',
      description: 'Zasady odejmowania',
    },
    game: {
      title: 'Gra z odejmowaniem',
      description: 'Przeciągaj i zabieraj obiekty',
    },
  },
  animations: {
    subtractingSvg: {
      ariaLabel: 'Animacja odejmowania: 5 kropek minus 2 kropki daje 3 kropki.',
    },
    numberLine: {
      ariaLabel: 'Animacja na osi liczbowej: 13 minus 5 jako skoki do 10 i dalej.',
    },
    tenFrame: {
      ariaLabel: 'Animacja ramki dziesiątki: odejmowanie 13 minus 5.',
    },
    differenceBar: {
      ariaLabel: 'Animacja różnicy: 12 minus 7 zostawia 5.',
      differenceLabel: 'różnica 5',
    },
    abacus: {
      ariaLabel: 'Animacja liczydła: odejmowanie dziesiątek i jedności osobno.',
      tensLabel: 'Dziesiątki',
      onesLabel: 'Jedności',
      startLabel: 'Start',
      subtractLabel: 'Odejmij',
      resultLabel: 'Wynik',
    },
  },
  slides: {
    basics: {
      meaning: {
        title: 'Co to znaczy odejmować?',
        lead: 'Odejmowanie to zabieranie części z grupy. Pytamy: ile zostało?',
      },
      singleDigit: {
        title: 'Odejmowanie jednocyfrowe',
        lead: 'Cofaj się na osi liczbowej lub licz, ile brakuje do wyniku.',
        step1: 'Startuj od 9',
        step2: 'Cofnij się o 4 kroki: 8, 7, 6, 5',
        step3: 'Ostatnia liczba to wynik: 5 ✓',
      },
      motion: {
        title: 'Odejmowanie w ruchu (SVG)',
        lead: 'Animacja pokazuje, jak zabieramy część kropek i zostaje wynik.',
        caption: 'Dwie kropki „odchodzą”, zostają trzy.',
      },
    },
    crossTen: {
      overTen: {
        title: 'Odejmowanie z przekroczeniem 10',
        lead:
          'Rozdziel odjemnik na dwie części: najpierw zejdź do 10, potem odejmij resztę.',
        caption: '13 − 3 = 10, 10 − 2 = 8 ✓',
        step1Title: 'Krok 1',
        step1Text: 'Rozłóż 5 na 3 + 2',
        step2Title: 'Krok 2',
        step2Text: 'Odejmij 3: 13 − 3 = 10',
        step3Title: 'Krok 3',
        step3Text: 'Odejmij 2: 10 − 2 = 8',
      },
      numberLine: {
        title: 'Skoki wstecz na osi liczbowej',
        lead: 'Najpierw do 10, potem dalej wstecz.',
        caption: '13 − 3 = 10, potem 10 − 2 = 8.',
      },
      tenFrame: {
        title: 'Ramka dziesiątki',
        lead: 'Zabierz najpierw nadwyżkę ponad 10, potem resztę z ramki.',
        caption: 'Najpierw zdejmij 3, potem jeszcze 2.',
      },
    },
    doubleDigit: {
      intro: {
        title: 'Odejmowanie dwucyfrowe',
        lead: 'Odejmuj osobno dziesiątki i jedności!',
        tensLabel: 'Dziesiątki',
        onesLabel: 'Jedności',
      },
      abacus: {
        title: 'Liczydło',
        lead: 'Liczydło pokazuje odejmowanie dziesiątek i jedności osobno.',
        caption: 'Odejmij koraliki, a potem odczytaj wynik.',
      },
    },
    remember: {
      rules: {
        title: 'Zasady odejmowania',
        orderChip: 'Kolejność ma znaczenie: 7 − 3 ≠ 3 − 7',
        zeroChip: 'Odejmowanie 0: 8 − 0 = 8',
        checkChip: 'Sprawdź dodawaniem: 5 + 3 = 8',
        breakChip: 'Rozbij na kroki: 13 − 5 = 10 − 2',
        stepBackTitle: 'Cofaj się krokami',
        stepBackLead: 'Startuj od większej liczby: 9 − 4',
        stepBackPath: '9 -> 8 -> 7 -> 6 -> 5',
        checkTitle: 'Sprawdzaj dodawaniem',
        checkLead: 'Jeśli wynik + odjemnik daje odjemną, to dobrze.',
        checkEquation: '5 + 3 = 8',
        orderTitle: 'Kolejność ma znaczenie',
        orderLead: '7 − 3 to nie to samo co 3 − 7.',
        motionTitle: 'Odejmowanie w ruchu',
        motionLead: 'Zabierasz część i patrzysz, ile zostało.',
        motionCaption: 'Dwie kropki "odchodzą", zostają trzy.',
        pathTitle: 'Ścieżka',
        pathStep1Title: 'Rozbij odjemnik',
        pathStep1Text: '5 = 3 + 2',
        pathStep2Title: 'Zejdź do 10',
        pathStep2Text: '13 − 3 = 10',
        pathStep3Title: 'Odejmij resztę',
        pathStep3Text: '10 − 2 = 8',
        pathStep4Title: 'Sprawdź dodawaniem',
        pathStep4Text: '8 + 5 = 13',
      },
      backJumps: {
        title: 'Skoki wstecz',
        label: 'Skoki na osi',
        lead: 'Cofaj się w dwóch krokach: do 10, potem dalej.',
        caption: '13 − 5 = 8.',
      },
      tenFrame: {
        title: 'Ramka dziesiątki',
        label: 'Ramka dziesiątki',
        lead: 'Najpierw zdejmij nadwyżkę, potem resztę z ramki.',
        caption: '13 − 5 = 8.',
      },
      checkAddition: {
        title: 'Sprawdź wynik dodawaniem',
        label: 'Sprawdzanie',
        lead: 'Dodaj odjemnik do wyniku i zobacz, czy wracasz do odjemnej.',
        caption: 'Jeśli dodawanie zgadza się, odejmowanie jest poprawne.',
      },
      difference: {
        title: 'Różnica liczb',
        label: 'Różnica',
        lead: 'Porównaj dwie liczby i zobacz, ile brakuje do większej.',
        caption: 'Różnica to "brakująca" część.',
      },
    },
  },
  game: {
    gameTitle: 'Gra z odejmowaniem!',
  },
};

export const resolveSubtractingLessonContent = (
  template: KangurLessonTemplate | null | undefined,
): KangurSubtractingLessonTemplateContent | null => {
  if (!template?.componentContent) {
    return null;
  }

  const resolved = resolveKangurLessonTemplateComponentContent(
    'subtracting',
    template?.componentContent,
  );

  return resolved?.kind === 'subtracting' ? resolved : null;
};
