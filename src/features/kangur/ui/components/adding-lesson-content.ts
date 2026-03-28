import type { LessonTranslate } from '@/features/kangur/ui/components/lesson-copy';
import {
  resolveKangurLessonTemplateComponentContent,
} from '@/features/kangur/lessons/lesson-template-component-content';
import type {
  KangurAddingLessonTemplateContent,
  KangurLessonTemplate,
} from '@/shared/contracts/kangur-lesson-templates';

const ADDING_LESSON_DEFAULTS: Omit<KangurAddingLessonTemplateContent, 'kind'> = {
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

export const ADDING_LESSON_COMPONENT_CONTENT: KangurAddingLessonTemplateContent = {
  kind: 'adding',
  ...ADDING_LESSON_DEFAULTS,
};

const translateAddingLesson = (
  translate: LessonTranslate,
  key: string,
  fallback: string,
): string => {
  const translated = translate(key);
  return translated === key || translated.endsWith(`.${key}`) ? fallback : translated;
};

export const createAddingLessonContentFromTranslate = (
  translate: LessonTranslate,
): KangurAddingLessonTemplateContent => ({
  kind: 'adding',
  lessonTitle: translateAddingLesson(
    translate,
    'lessonTitle',
    ADDING_LESSON_DEFAULTS.lessonTitle,
  ),
  sections: {
    podstawy: {
      title: translateAddingLesson(
        translate,
        'sections.basics.title',
        ADDING_LESSON_DEFAULTS.sections.podstawy.title,
      ),
      description: translateAddingLesson(
        translate,
        'sections.basics.description',
        ADDING_LESSON_DEFAULTS.sections.podstawy.description,
      ),
    },
    przekroczenie: {
      title: translateAddingLesson(
        translate,
        'sections.crossTen.title',
        ADDING_LESSON_DEFAULTS.sections.przekroczenie.title,
      ),
      description: translateAddingLesson(
        translate,
        'sections.crossTen.description',
        ADDING_LESSON_DEFAULTS.sections.przekroczenie.description,
      ),
    },
    dwucyfrowe: {
      title: translateAddingLesson(
        translate,
        'sections.doubleDigit.title',
        ADDING_LESSON_DEFAULTS.sections.dwucyfrowe.title,
      ),
      description: translateAddingLesson(
        translate,
        'sections.doubleDigit.description',
        ADDING_LESSON_DEFAULTS.sections.dwucyfrowe.description,
      ),
    },
    zapamietaj: {
      title: translateAddingLesson(
        translate,
        'sections.remember.title',
        ADDING_LESSON_DEFAULTS.sections.zapamietaj.title,
      ),
      description: translateAddingLesson(
        translate,
        'sections.remember.description',
        ADDING_LESSON_DEFAULTS.sections.zapamietaj.description,
      ),
    },
    synthesis: {
      title: translateAddingLesson(
        translate,
        'sections.synthesis.title',
        ADDING_LESSON_DEFAULTS.sections.synthesis.title,
      ),
      description: translateAddingLesson(
        translate,
        'sections.synthesis.description',
        ADDING_LESSON_DEFAULTS.sections.synthesis.description,
      ),
    },
    game: {
      title: translateAddingLesson(
        translate,
        'sections.game.title',
        ADDING_LESSON_DEFAULTS.sections.game.title,
      ),
      description: translateAddingLesson(
        translate,
        'sections.game.description',
        ADDING_LESSON_DEFAULTS.sections.game.description,
      ),
    },
  },
  slides: {
    podstawy: {
      meaning: {
        title: translateAddingLesson(
          translate,
          'slides.basics.meaning.title',
          ADDING_LESSON_DEFAULTS.slides.podstawy.meaning.title,
        ),
        lead: translateAddingLesson(
          translate,
          'slides.basics.meaning.lead',
          ADDING_LESSON_DEFAULTS.slides.podstawy.meaning.lead,
        ),
        partLabel: translateAddingLesson(
          translate,
          'slides.basics.meaning.partLabel',
          ADDING_LESSON_DEFAULTS.slides.podstawy.meaning.partLabel,
        ),
        totalLabel: translateAddingLesson(
          translate,
          'slides.basics.meaning.totalLabel',
          ADDING_LESSON_DEFAULTS.slides.podstawy.meaning.totalLabel,
        ),
        caption: translateAddingLesson(
          translate,
          'slides.basics.meaning.caption',
          ADDING_LESSON_DEFAULTS.slides.podstawy.meaning.caption,
        ),
        startLabel: translateAddingLesson(
          translate,
          'slides.basics.meaning.startLabel',
          ADDING_LESSON_DEFAULTS.slides.podstawy.meaning.startLabel,
        ),
        combineLabel: translateAddingLesson(
          translate,
          'slides.basics.meaning.combineLabel',
          ADDING_LESSON_DEFAULTS.slides.podstawy.meaning.combineLabel,
        ),
        resultLabel: translateAddingLesson(
          translate,
          'slides.basics.meaning.resultLabel',
          ADDING_LESSON_DEFAULTS.slides.podstawy.meaning.resultLabel,
        ),
      },
      singleDigit: {
        title: translateAddingLesson(
          translate,
          'slides.basics.singleDigit.title',
          ADDING_LESSON_DEFAULTS.slides.podstawy.singleDigit.title,
        ),
        lead: translateAddingLesson(
          translate,
          'slides.basics.singleDigit.lead',
          ADDING_LESSON_DEFAULTS.slides.podstawy.singleDigit.lead,
        ),
        step1: translateAddingLesson(
          translate,
          'slides.basics.singleDigit.step1',
          ADDING_LESSON_DEFAULTS.slides.podstawy.singleDigit.step1,
        ),
        step2: translateAddingLesson(
          translate,
          'slides.basics.singleDigit.step2',
          ADDING_LESSON_DEFAULTS.slides.podstawy.singleDigit.step2,
        ),
        step3: translateAddingLesson(
          translate,
          'slides.basics.singleDigit.step3',
          ADDING_LESSON_DEFAULTS.slides.podstawy.singleDigit.step3,
        ),
        staircaseLabel: translateAddingLesson(
          translate,
          'slides.basics.singleDigit.staircaseLabel',
          ADDING_LESSON_DEFAULTS.slides.podstawy.singleDigit.staircaseLabel,
        ),
        countUpLabel: translateAddingLesson(
          translate,
          'slides.basics.singleDigit.countUpLabel',
          ADDING_LESSON_DEFAULTS.slides.podstawy.singleDigit.countUpLabel,
        ),
        caption: translateAddingLesson(
          translate,
          'slides.basics.singleDigit.caption',
          ADDING_LESSON_DEFAULTS.slides.podstawy.singleDigit.caption,
        ),
        startLargeChip: translateAddingLesson(
          translate,
          'slides.basics.singleDigit.startLargeChip',
          ADDING_LESSON_DEFAULTS.slides.podstawy.singleDigit.startLargeChip,
        ),
        countUpChip: translateAddingLesson(
          translate,
          'slides.basics.singleDigit.countUpChip',
          ADDING_LESSON_DEFAULTS.slides.podstawy.singleDigit.countUpChip,
        ),
        quickResultChip: translateAddingLesson(
          translate,
          'slides.basics.singleDigit.quickResultChip',
          ADDING_LESSON_DEFAULTS.slides.podstawy.singleDigit.quickResultChip,
        ),
      },
      motion: {
        title: translateAddingLesson(
          translate,
          'slides.basics.motion.title',
          ADDING_LESSON_DEFAULTS.slides.podstawy.motion.title,
        ),
        lead: translateAddingLesson(
          translate,
          'slides.basics.motion.lead',
          ADDING_LESSON_DEFAULTS.slides.podstawy.motion.lead,
        ),
        caption: translateAddingLesson(
          translate,
          'slides.basics.motion.caption',
          ADDING_LESSON_DEFAULTS.slides.podstawy.motion.caption,
        ),
        groupA: translateAddingLesson(
          translate,
          'slides.basics.motion.groupA',
          ADDING_LESSON_DEFAULTS.slides.podstawy.motion.groupA,
        ),
        groupB: translateAddingLesson(
          translate,
          'slides.basics.motion.groupB',
          ADDING_LESSON_DEFAULTS.slides.podstawy.motion.groupB,
        ),
        sum: translateAddingLesson(
          translate,
          'slides.basics.motion.sum',
          ADDING_LESSON_DEFAULTS.slides.podstawy.motion.sum,
        ),
      },
    },
    przekroczenie: {
      overTen: {
        title: translateAddingLesson(
          translate,
          'slides.crossTen.overTen.title',
          ADDING_LESSON_DEFAULTS.slides.przekroczenie.overTen.title,
        ),
        lead: translateAddingLesson(
          translate,
          'slides.crossTen.overTen.lead',
          ADDING_LESSON_DEFAULTS.slides.przekroczenie.overTen.lead,
        ),
        caption: translateAddingLesson(
          translate,
          'slides.crossTen.overTen.caption',
          ADDING_LESSON_DEFAULTS.slides.przekroczenie.overTen.caption,
        ),
        step1Title: translateAddingLesson(
          translate,
          'slides.crossTen.overTen.step1Title',
          ADDING_LESSON_DEFAULTS.slides.przekroczenie.overTen.step1Title,
        ),
        step1Text: translateAddingLesson(
          translate,
          'slides.crossTen.overTen.step1Text',
          ADDING_LESSON_DEFAULTS.slides.przekroczenie.overTen.step1Text,
        ),
        step2Title: translateAddingLesson(
          translate,
          'slides.crossTen.overTen.step2Title',
          ADDING_LESSON_DEFAULTS.slides.przekroczenie.overTen.step2Title,
        ),
        step2Text: translateAddingLesson(
          translate,
          'slides.crossTen.overTen.step2Text',
          ADDING_LESSON_DEFAULTS.slides.przekroczenie.overTen.step2Text,
        ),
        targetLabel: translateAddingLesson(
          translate,
          'slides.crossTen.overTen.targetLabel',
          ADDING_LESSON_DEFAULTS.slides.przekroczenie.overTen.targetLabel,
        ),
        remainingChip: translateAddingLesson(
          translate,
          'slides.crossTen.overTen.remainingChip',
          ADDING_LESSON_DEFAULTS.slides.przekroczenie.overTen.remainingChip,
        ),
      },
      numberLine: {
        title: translateAddingLesson(
          translate,
          'slides.crossTen.numberLine.title',
          ADDING_LESSON_DEFAULTS.slides.przekroczenie.numberLine.title,
        ),
        lead: translateAddingLesson(
          translate,
          'slides.crossTen.numberLine.lead',
          ADDING_LESSON_DEFAULTS.slides.przekroczenie.numberLine.lead,
        ),
        caption: translateAddingLesson(
          translate,
          'slides.crossTen.numberLine.caption',
          ADDING_LESSON_DEFAULTS.slides.przekroczenie.numberLine.caption,
        ),
        startChip: translateAddingLesson(
          translate,
          'slides.crossTen.numberLine.startChip',
          ADDING_LESSON_DEFAULTS.slides.przekroczenie.numberLine.startChip,
        ),
        plusTwoChip: translateAddingLesson(
          translate,
          'slides.crossTen.numberLine.plusTwoChip',
          ADDING_LESSON_DEFAULTS.slides.przekroczenie.numberLine.plusTwoChip,
        ),
        tenChip: translateAddingLesson(
          translate,
          'slides.crossTen.numberLine.tenChip',
          ADDING_LESSON_DEFAULTS.slides.przekroczenie.numberLine.tenChip,
        ),
        plusThreeChip: translateAddingLesson(
          translate,
          'slides.crossTen.numberLine.plusThreeChip',
          ADDING_LESSON_DEFAULTS.slides.przekroczenie.numberLine.plusThreeChip,
        ),
        resultChip: translateAddingLesson(
          translate,
          'slides.crossTen.numberLine.resultChip',
          ADDING_LESSON_DEFAULTS.slides.przekroczenie.numberLine.resultChip,
        ),
      },
      tenFrame: {
        title: translateAddingLesson(
          translate,
          'slides.crossTen.tenFrame.title',
          ADDING_LESSON_DEFAULTS.slides.przekroczenie.tenFrame.title,
        ),
        lead: translateAddingLesson(
          translate,
          'slides.crossTen.tenFrame.lead',
          ADDING_LESSON_DEFAULTS.slides.przekroczenie.tenFrame.lead,
        ),
        caption: translateAddingLesson(
          translate,
          'slides.crossTen.tenFrame.caption',
          ADDING_LESSON_DEFAULTS.slides.przekroczenie.tenFrame.caption,
        ),
        miniPlanTitle: translateAddingLesson(
          translate,
          'slides.crossTen.tenFrame.miniPlanTitle',
          ADDING_LESSON_DEFAULTS.slides.przekroczenie.tenFrame.miniPlanTitle,
        ),
        steps: ADDING_LESSON_DEFAULTS.slides.przekroczenie.tenFrame.steps.map((step, index) =>
          translateAddingLesson(translate, `slides.crossTen.tenFrame.steps.${index}`, step),
        ),
      },
    },
    dwucyfrowe: {
      intro: {
        title: translateAddingLesson(
          translate,
          'slides.doubleDigit.intro.title',
          ADDING_LESSON_DEFAULTS.slides.dwucyfrowe.intro.title,
        ),
        lead: translateAddingLesson(
          translate,
          'slides.doubleDigit.intro.lead',
          ADDING_LESSON_DEFAULTS.slides.dwucyfrowe.intro.lead,
        ),
        tensLabel: translateAddingLesson(
          translate,
          'slides.doubleDigit.intro.tensLabel',
          ADDING_LESSON_DEFAULTS.slides.dwucyfrowe.intro.tensLabel,
        ),
        onesLabel: translateAddingLesson(
          translate,
          'slides.doubleDigit.intro.onesLabel',
          ADDING_LESSON_DEFAULTS.slides.dwucyfrowe.intro.onesLabel,
        ),
        schemeTitle: translateAddingLesson(
          translate,
          'slides.doubleDigit.intro.schemeTitle',
          ADDING_LESSON_DEFAULTS.slides.dwucyfrowe.intro.schemeTitle,
        ),
        schemeCaption: translateAddingLesson(
          translate,
          'slides.doubleDigit.intro.schemeCaption',
          ADDING_LESSON_DEFAULTS.slides.dwucyfrowe.intro.schemeCaption,
        ),
      },
      motion: {
        title: translateAddingLesson(
          translate,
          'slides.doubleDigit.motion.title',
          ADDING_LESSON_DEFAULTS.slides.dwucyfrowe.motion.title,
        ),
        lead: translateAddingLesson(
          translate,
          'slides.doubleDigit.motion.lead',
          ADDING_LESSON_DEFAULTS.slides.dwucyfrowe.motion.lead,
        ),
        caption: translateAddingLesson(
          translate,
          'slides.doubleDigit.motion.caption',
          ADDING_LESSON_DEFAULTS.slides.dwucyfrowe.motion.caption,
        ),
      },
      blocks: {
        title: translateAddingLesson(
          translate,
          'slides.doubleDigit.blocks.title',
          ADDING_LESSON_DEFAULTS.slides.dwucyfrowe.blocks.title,
        ),
        lead: translateAddingLesson(
          translate,
          'slides.doubleDigit.blocks.lead',
          ADDING_LESSON_DEFAULTS.slides.dwucyfrowe.blocks.lead,
        ),
        caption: translateAddingLesson(
          translate,
          'slides.doubleDigit.blocks.caption',
          ADDING_LESSON_DEFAULTS.slides.dwucyfrowe.blocks.caption,
        ),
        tensChip: translateAddingLesson(
          translate,
          'slides.doubleDigit.blocks.tensChip',
          ADDING_LESSON_DEFAULTS.slides.dwucyfrowe.blocks.tensChip,
        ),
        onesChip: translateAddingLesson(
          translate,
          'slides.doubleDigit.blocks.onesChip',
          ADDING_LESSON_DEFAULTS.slides.dwucyfrowe.blocks.onesChip,
        ),
        sumChip: translateAddingLesson(
          translate,
          'slides.doubleDigit.blocks.sumChip',
          ADDING_LESSON_DEFAULTS.slides.dwucyfrowe.blocks.sumChip,
        ),
      },
      columns: {
        title: translateAddingLesson(
          translate,
          'slides.doubleDigit.columns.title',
          ADDING_LESSON_DEFAULTS.slides.dwucyfrowe.columns.title,
        ),
        lead: translateAddingLesson(
          translate,
          'slides.doubleDigit.columns.lead',
          ADDING_LESSON_DEFAULTS.slides.dwucyfrowe.columns.lead,
        ),
        caption: translateAddingLesson(
          translate,
          'slides.doubleDigit.columns.caption',
          ADDING_LESSON_DEFAULTS.slides.dwucyfrowe.columns.caption,
        ),
        tensLabel: translateAddingLesson(
          translate,
          'slides.doubleDigit.columns.tensLabel',
          ADDING_LESSON_DEFAULTS.slides.dwucyfrowe.columns.tensLabel,
        ),
        onesLabel: translateAddingLesson(
          translate,
          'slides.doubleDigit.columns.onesLabel',
          ADDING_LESSON_DEFAULTS.slides.dwucyfrowe.columns.onesLabel,
        ),
      },
      abacus: {
        title: translateAddingLesson(
          translate,
          'slides.doubleDigit.abacus.title',
          ADDING_LESSON_DEFAULTS.slides.dwucyfrowe.abacus.title,
        ),
        lead: translateAddingLesson(
          translate,
          'slides.doubleDigit.abacus.lead',
          ADDING_LESSON_DEFAULTS.slides.dwucyfrowe.abacus.lead,
        ),
        caption: translateAddingLesson(
          translate,
          'slides.doubleDigit.abacus.caption',
          ADDING_LESSON_DEFAULTS.slides.dwucyfrowe.abacus.caption,
        ),
        tensChip: translateAddingLesson(
          translate,
          'slides.doubleDigit.abacus.tensChip',
          ADDING_LESSON_DEFAULTS.slides.dwucyfrowe.abacus.tensChip,
        ),
        onesChip: translateAddingLesson(
          translate,
          'slides.doubleDigit.abacus.onesChip',
          ADDING_LESSON_DEFAULTS.slides.dwucyfrowe.abacus.onesChip,
        ),
        sumChip: translateAddingLesson(
          translate,
          'slides.doubleDigit.abacus.sumChip',
          ADDING_LESSON_DEFAULTS.slides.dwucyfrowe.abacus.sumChip,
        ),
      },
    },
    zapamietaj: {
      rules: {
        title: translateAddingLesson(
          translate,
          'slides.remember.rules.title',
          ADDING_LESSON_DEFAULTS.slides.zapamietaj.rules.title,
        ),
        orderChip: translateAddingLesson(
          translate,
          'slides.remember.rules.orderChip',
          ADDING_LESSON_DEFAULTS.slides.zapamietaj.rules.orderChip,
        ),
        zeroChip: translateAddingLesson(
          translate,
          'slides.remember.rules.zeroChip',
          ADDING_LESSON_DEFAULTS.slides.zapamietaj.rules.zeroChip,
        ),
        startChip: translateAddingLesson(
          translate,
          'slides.remember.rules.startChip',
          ADDING_LESSON_DEFAULTS.slides.zapamietaj.rules.startChip,
        ),
        groupChip: translateAddingLesson(
          translate,
          'slides.remember.rules.groupChip',
          ADDING_LESSON_DEFAULTS.slides.zapamietaj.rules.groupChip,
        ),
        pairsTitle: translateAddingLesson(
          translate,
          'slides.remember.rules.pairsTitle',
          ADDING_LESSON_DEFAULTS.slides.zapamietaj.rules.pairsTitle,
        ),
        pairsText: translateAddingLesson(
          translate,
          'slides.remember.rules.pairsText',
          ADDING_LESSON_DEFAULTS.slides.zapamietaj.rules.pairsText,
        ),
        doublesTitle: translateAddingLesson(
          translate,
          'slides.remember.rules.doublesTitle',
          ADDING_LESSON_DEFAULTS.slides.zapamietaj.rules.doublesTitle,
        ),
        doublesText: translateAddingLesson(
          translate,
          'slides.remember.rules.doublesText',
          ADDING_LESSON_DEFAULTS.slides.zapamietaj.rules.doublesText,
        ),
        groupingTitle: translateAddingLesson(
          translate,
          'slides.remember.rules.groupingTitle',
          ADDING_LESSON_DEFAULTS.slides.zapamietaj.rules.groupingTitle,
        ),
        groupingText: translateAddingLesson(
          translate,
          'slides.remember.rules.groupingText',
          ADDING_LESSON_DEFAULTS.slides.zapamietaj.rules.groupingText,
        ),
        pathTitle: translateAddingLesson(
          translate,
          'slides.remember.rules.pathTitle',
          ADDING_LESSON_DEFAULTS.slides.zapamietaj.rules.pathTitle,
        ),
        pathStep1Title: translateAddingLesson(
          translate,
          'slides.remember.rules.pathStep1Title',
          ADDING_LESSON_DEFAULTS.slides.zapamietaj.rules.pathStep1Title,
        ),
        pathStep1Text: translateAddingLesson(
          translate,
          'slides.remember.rules.pathStep1Text',
          ADDING_LESSON_DEFAULTS.slides.zapamietaj.rules.pathStep1Text,
        ),
        pathStep2Title: translateAddingLesson(
          translate,
          'slides.remember.rules.pathStep2Title',
          ADDING_LESSON_DEFAULTS.slides.zapamietaj.rules.pathStep2Title,
        ),
        pathStep2Text: translateAddingLesson(
          translate,
          'slides.remember.rules.pathStep2Text',
          ADDING_LESSON_DEFAULTS.slides.zapamietaj.rules.pathStep2Text,
        ),
        pathStep3Title: translateAddingLesson(
          translate,
          'slides.remember.rules.pathStep3Title',
          ADDING_LESSON_DEFAULTS.slides.zapamietaj.rules.pathStep3Title,
        ),
        pathStep3Text: translateAddingLesson(
          translate,
          'slides.remember.rules.pathStep3Text',
          ADDING_LESSON_DEFAULTS.slides.zapamietaj.rules.pathStep3Text,
        ),
      },
      commutative: {
        title: translateAddingLesson(
          translate,
          'slides.remember.commutative.title',
          ADDING_LESSON_DEFAULTS.slides.zapamietaj.commutative.title,
        ),
        label: translateAddingLesson(
          translate,
          'slides.remember.commutative.label',
          ADDING_LESSON_DEFAULTS.slides.zapamietaj.commutative.label,
        ),
        description: translateAddingLesson(
          translate,
          'slides.remember.commutative.description',
          ADDING_LESSON_DEFAULTS.slides.zapamietaj.commutative.description,
        ),
        caption: translateAddingLesson(
          translate,
          'slides.remember.commutative.caption',
          ADDING_LESSON_DEFAULTS.slides.zapamietaj.commutative.caption,
        ),
      },
      associative: {
        title: translateAddingLesson(
          translate,
          'slides.remember.associative.title',
          ADDING_LESSON_DEFAULTS.slides.zapamietaj.associative.title,
        ),
        bracketsLabel: translateAddingLesson(
          translate,
          'slides.remember.associative.bracketsLabel',
          ADDING_LESSON_DEFAULTS.slides.zapamietaj.associative.bracketsLabel,
        ),
        groupingLabel: translateAddingLesson(
          translate,
          'slides.remember.associative.groupingLabel',
          ADDING_LESSON_DEFAULTS.slides.zapamietaj.associative.groupingLabel,
        ),
        description: translateAddingLesson(
          translate,
          'slides.remember.associative.description',
          ADDING_LESSON_DEFAULTS.slides.zapamietaj.associative.description,
        ),
        caption: translateAddingLesson(
          translate,
          'slides.remember.associative.caption',
          ADDING_LESSON_DEFAULTS.slides.zapamietaj.associative.caption,
        ),
      },
      zero: {
        title: translateAddingLesson(
          translate,
          'slides.remember.zero.title',
          ADDING_LESSON_DEFAULTS.slides.zapamietaj.zero.title,
        ),
        zeroLabel: translateAddingLesson(
          translate,
          'slides.remember.zero.zeroLabel',
          ADDING_LESSON_DEFAULTS.slides.zapamietaj.zero.zeroLabel,
        ),
        noChangeLabel: translateAddingLesson(
          translate,
          'slides.remember.zero.noChangeLabel',
          ADDING_LESSON_DEFAULTS.slides.zapamietaj.zero.noChangeLabel,
        ),
        description: translateAddingLesson(
          translate,
          'slides.remember.zero.description',
          ADDING_LESSON_DEFAULTS.slides.zapamietaj.zero.description,
        ),
        caption: translateAddingLesson(
          translate,
          'slides.remember.zero.caption',
          ADDING_LESSON_DEFAULTS.slides.zapamietaj.zero.caption,
        ),
      },
      makeTen: {
        title: translateAddingLesson(
          translate,
          'slides.remember.makeTen.title',
          ADDING_LESSON_DEFAULTS.slides.zapamietaj.makeTen.title,
        ),
        label: translateAddingLesson(
          translate,
          'slides.remember.makeTen.label',
          ADDING_LESSON_DEFAULTS.slides.zapamietaj.makeTen.label,
        ),
        description: translateAddingLesson(
          translate,
          'slides.remember.makeTen.description',
          ADDING_LESSON_DEFAULTS.slides.zapamietaj.makeTen.description,
        ),
        caption: translateAddingLesson(
          translate,
          'slides.remember.makeTen.caption',
          ADDING_LESSON_DEFAULTS.slides.zapamietaj.makeTen.caption,
        ),
      },
      doubles: {
        title: translateAddingLesson(
          translate,
          'slides.remember.doubles.title',
          ADDING_LESSON_DEFAULTS.slides.zapamietaj.doubles.title,
        ),
        label: translateAddingLesson(
          translate,
          'slides.remember.doubles.label',
          ADDING_LESSON_DEFAULTS.slides.zapamietaj.doubles.label,
        ),
        description: translateAddingLesson(
          translate,
          'slides.remember.doubles.description',
          ADDING_LESSON_DEFAULTS.slides.zapamietaj.doubles.description,
        ),
        caption: translateAddingLesson(
          translate,
          'slides.remember.doubles.caption',
          ADDING_LESSON_DEFAULTS.slides.zapamietaj.doubles.caption,
        ),
      },
    },
  },
  game: {
    gameTitle: translateAddingLesson(
      translate,
      'game.stageTitle',
      ADDING_LESSON_DEFAULTS.game.gameTitle ?? ADDING_LESSON_DEFAULTS.game.stageTitle,
    ),
  },
  synthesis: {
    gameTitle: translateAddingLesson(
      translate,
      'synthesis.stageTitle',
      ADDING_LESSON_DEFAULTS.synthesis.gameTitle ?? ADDING_LESSON_DEFAULTS.synthesis.stageTitle,
    ),
  },
});

export const resolveAddingLessonContent = (
  template: KangurLessonTemplate | null | undefined,
  fallbackTranslate: LessonTranslate,
): KangurAddingLessonTemplateContent => {
  if (template?.componentContent) {
    const resolved = resolveKangurLessonTemplateComponentContent(
      'adding',
      template.componentContent,
    );

    if (resolved?.kind === 'adding') {
      return resolved;
    }
  }

  return createAddingLessonContentFromTranslate(fallbackTranslate);
};
