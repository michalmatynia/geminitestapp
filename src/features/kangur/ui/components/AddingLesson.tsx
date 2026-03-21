'use client';

import { useMemo } from 'react';
import { useTranslations } from 'next-intl';

import AddingBallGame from '@/features/kangur/ui/components/AddingBallGame';
import AddingSynthesisGame from '@/features/kangur/ui/components/AddingSynthesisGame';
import type { LessonSlide } from '@/features/kangur/ui/components/LessonSlideSection';
import {
  AddingAbacusAnimation,
  AddingAssociativeAnimation,
  AddingColumnAnimation,
  AddingCommutativeAnimation,
  AddingCountOnAnimation,
  AddingCrossTenSvgAnimation,
  AddingDoublesAnimation,
  AddingMakeTenPairsAnimation,
  AddingNumberLineAnimation,
  AddingSvgAnimation,
  AddingTenFrameAnimation,
  AddingTensOnesAnimation,
  AddingTwoDigitAnimation,
  AddingZeroAnimation,
} from '@/features/kangur/ui/components/LessonAnimations';
import {
  KangurLessonCallout,
  KangurLessonCaption,
  KangurLessonChip,
  KangurLessonInset,
  KangurLessonLead,
  KangurLessonStack,
} from '@/features/kangur/ui/design/lesson-primitives';
import {
  KangurDisplayEmoji,
  KangurEquationDisplay,
  KangurIconBadge,
} from '@/features/kangur/ui/design/primitives';
import {
  KANGUR_CENTER_ROW_CLASSNAME,
  KANGUR_START_ROW_CLASSNAME,
} from '@/features/kangur/ui/design/tokens';
import { KangurUnifiedLesson } from '@/features/kangur/ui/lessons/lesson-components';
import type { LessonTranslate, WidenLessonCopy } from './lesson-copy';

type SectionId = 'podstawy' | 'przekroczenie' | 'dwucyfrowe' | 'zapamietaj' | 'synthesis' | 'game';
type AddingSlideSectionId = Exclude<SectionId, 'game' | 'synthesis'>;

const ADDING_LESSON_COPY_PL = {
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
        lead: 'Najpierw zsumuj dziesiątki, potem jedności. Animacja pokazuje, jak grupy łączą się w wynik.',
        caption: 'Dziesiątki: 20 + 10, jedności: 4 + 3.',
      },
      blocks: {
        title: 'Bloki dziesiątek i jedności',
        lead: 'Kolorowe bloki pokazują, że dziesiątki i jedności łączą się osobno.',
        caption: 'Najpierw 20 + 10, potem 4 + 3. Suma składa się z obu części.',
        tensChip: 'Dziesiątki',
        onesChip: 'Jedności',
        sumChip: 'Suma',
      },
      columns: {
        title: 'Kolumny dziesiątek i jedności',
        lead: 'Ułóż liczby w kolumnach: dziesiątki pod dziesiątkami, jedności pod jednościami. Potem dodaj osobno.',
        caption: 'Najpierw dziesiątki, potem jedności. Wynik składa się z obu kolumn.',
        tensLabel: 'Dziesiątki',
        onesLabel: 'Jedności',
      },
      abacus: {
        title: 'Liczydło',
        lead: 'Liczydło pomaga przesuwać koraliki: osobno dziesiątki i jedności, a potem odczytać sumę.',
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
    stageTitle: 'Gra z piłkami!',
  },
  synthesis: {
    stageTitle: 'Synteza dodawania',
  },
} as const;

type AddingLessonCopy = WidenLessonCopy<typeof ADDING_LESSON_COPY_PL>;

const translateAddingLesson = (
  translate: LessonTranslate,
  key: string,
  fallback: string
): string => {
  const translated = translate(key);
  return translated === key || translated.endsWith(`.${key}`) ? fallback : translated;
};

const buildAddingLessonCopy = (translate: LessonTranslate): AddingLessonCopy => ({
  lessonTitle: translateAddingLesson(translate, 'lessonTitle', ADDING_LESSON_COPY_PL.lessonTitle),
  sections: {
    podstawy: {
      title: translateAddingLesson(
        translate,
        'sections.basics.title',
        ADDING_LESSON_COPY_PL.sections.podstawy.title
      ),
      description: translateAddingLesson(
        translate,
        'sections.basics.description',
        ADDING_LESSON_COPY_PL.sections.podstawy.description
      ),
    },
    przekroczenie: {
      title: translateAddingLesson(
        translate,
        'sections.crossTen.title',
        ADDING_LESSON_COPY_PL.sections.przekroczenie.title
      ),
      description: translateAddingLesson(
        translate,
        'sections.crossTen.description',
        ADDING_LESSON_COPY_PL.sections.przekroczenie.description
      ),
    },
    dwucyfrowe: {
      title: translateAddingLesson(
        translate,
        'sections.doubleDigit.title',
        ADDING_LESSON_COPY_PL.sections.dwucyfrowe.title
      ),
      description: translateAddingLesson(
        translate,
        'sections.doubleDigit.description',
        ADDING_LESSON_COPY_PL.sections.dwucyfrowe.description
      ),
    },
    zapamietaj: {
      title: translateAddingLesson(
        translate,
        'sections.remember.title',
        ADDING_LESSON_COPY_PL.sections.zapamietaj.title
      ),
      description: translateAddingLesson(
        translate,
        'sections.remember.description',
        ADDING_LESSON_COPY_PL.sections.zapamietaj.description
      ),
    },
    synthesis: {
      title: translateAddingLesson(
        translate,
        'sections.synthesis.title',
        ADDING_LESSON_COPY_PL.sections.synthesis.title
      ),
      description: translateAddingLesson(
        translate,
        'sections.synthesis.description',
        ADDING_LESSON_COPY_PL.sections.synthesis.description
      ),
    },
    game: {
      title: translateAddingLesson(
        translate,
        'sections.game.title',
        ADDING_LESSON_COPY_PL.sections.game.title
      ),
      description: translateAddingLesson(
        translate,
        'sections.game.description',
        ADDING_LESSON_COPY_PL.sections.game.description
      ),
    },
  },
  slides: {
    podstawy: {
      meaning: {
        title: translateAddingLesson(
          translate,
          'slides.basics.meaning.title',
          ADDING_LESSON_COPY_PL.slides.podstawy.meaning.title
        ),
        lead: translateAddingLesson(
          translate,
          'slides.basics.meaning.lead',
          ADDING_LESSON_COPY_PL.slides.podstawy.meaning.lead
        ),
        partLabel: translateAddingLesson(
          translate,
          'slides.basics.meaning.partLabel',
          ADDING_LESSON_COPY_PL.slides.podstawy.meaning.partLabel
        ),
        totalLabel: translateAddingLesson(
          translate,
          'slides.basics.meaning.totalLabel',
          ADDING_LESSON_COPY_PL.slides.podstawy.meaning.totalLabel
        ),
        caption: translateAddingLesson(
          translate,
          'slides.basics.meaning.caption',
          ADDING_LESSON_COPY_PL.slides.podstawy.meaning.caption
        ),
        startLabel: translateAddingLesson(
          translate,
          'slides.basics.meaning.startLabel',
          ADDING_LESSON_COPY_PL.slides.podstawy.meaning.startLabel
        ),
        combineLabel: translateAddingLesson(
          translate,
          'slides.basics.meaning.combineLabel',
          ADDING_LESSON_COPY_PL.slides.podstawy.meaning.combineLabel
        ),
        resultLabel: translateAddingLesson(
          translate,
          'slides.basics.meaning.resultLabel',
          ADDING_LESSON_COPY_PL.slides.podstawy.meaning.resultLabel
        ),
      },
      singleDigit: {
        title: translateAddingLesson(
          translate,
          'slides.basics.singleDigit.title',
          ADDING_LESSON_COPY_PL.slides.podstawy.singleDigit.title
        ),
        lead: translateAddingLesson(
          translate,
          'slides.basics.singleDigit.lead',
          ADDING_LESSON_COPY_PL.slides.podstawy.singleDigit.lead
        ),
        step1: translateAddingLesson(
          translate,
          'slides.basics.singleDigit.step1',
          ADDING_LESSON_COPY_PL.slides.podstawy.singleDigit.step1
        ),
        step2: translateAddingLesson(
          translate,
          'slides.basics.singleDigit.step2',
          ADDING_LESSON_COPY_PL.slides.podstawy.singleDigit.step2
        ),
        step3: translateAddingLesson(
          translate,
          'slides.basics.singleDigit.step3',
          ADDING_LESSON_COPY_PL.slides.podstawy.singleDigit.step3
        ),
        staircaseLabel: translateAddingLesson(
          translate,
          'slides.basics.singleDigit.staircaseLabel',
          ADDING_LESSON_COPY_PL.slides.podstawy.singleDigit.staircaseLabel
        ),
        countUpLabel: translateAddingLesson(
          translate,
          'slides.basics.singleDigit.countUpLabel',
          ADDING_LESSON_COPY_PL.slides.podstawy.singleDigit.countUpLabel
        ),
        caption: translateAddingLesson(
          translate,
          'slides.basics.singleDigit.caption',
          ADDING_LESSON_COPY_PL.slides.podstawy.singleDigit.caption
        ),
        startLargeChip: translateAddingLesson(
          translate,
          'slides.basics.singleDigit.startLargeChip',
          ADDING_LESSON_COPY_PL.slides.podstawy.singleDigit.startLargeChip
        ),
        countUpChip: translateAddingLesson(
          translate,
          'slides.basics.singleDigit.countUpChip',
          ADDING_LESSON_COPY_PL.slides.podstawy.singleDigit.countUpChip
        ),
        quickResultChip: translateAddingLesson(
          translate,
          'slides.basics.singleDigit.quickResultChip',
          ADDING_LESSON_COPY_PL.slides.podstawy.singleDigit.quickResultChip
        ),
      },
      motion: {
        title: translateAddingLesson(
          translate,
          'slides.basics.motion.title',
          ADDING_LESSON_COPY_PL.slides.podstawy.motion.title
        ),
        lead: translateAddingLesson(
          translate,
          'slides.basics.motion.lead',
          ADDING_LESSON_COPY_PL.slides.podstawy.motion.lead
        ),
        caption: translateAddingLesson(
          translate,
          'slides.basics.motion.caption',
          ADDING_LESSON_COPY_PL.slides.podstawy.motion.caption
        ),
        groupA: translateAddingLesson(
          translate,
          'slides.basics.motion.groupA',
          ADDING_LESSON_COPY_PL.slides.podstawy.motion.groupA
        ),
        groupB: translateAddingLesson(
          translate,
          'slides.basics.motion.groupB',
          ADDING_LESSON_COPY_PL.slides.podstawy.motion.groupB
        ),
        sum: translateAddingLesson(
          translate,
          'slides.basics.motion.sum',
          ADDING_LESSON_COPY_PL.slides.podstawy.motion.sum
        ),
      },
    },
    przekroczenie: {
      overTen: {
        title: translateAddingLesson(
          translate,
          'slides.crossTen.overTen.title',
          ADDING_LESSON_COPY_PL.slides.przekroczenie.overTen.title
        ),
        lead: translateAddingLesson(
          translate,
          'slides.crossTen.overTen.lead',
          ADDING_LESSON_COPY_PL.slides.przekroczenie.overTen.lead
        ),
        caption: translateAddingLesson(
          translate,
          'slides.crossTen.overTen.caption',
          ADDING_LESSON_COPY_PL.slides.przekroczenie.overTen.caption
        ),
        step1Title: translateAddingLesson(
          translate,
          'slides.crossTen.overTen.step1Title',
          ADDING_LESSON_COPY_PL.slides.przekroczenie.overTen.step1Title
        ),
        step1Text: translateAddingLesson(
          translate,
          'slides.crossTen.overTen.step1Text',
          ADDING_LESSON_COPY_PL.slides.przekroczenie.overTen.step1Text
        ),
        step2Title: translateAddingLesson(
          translate,
          'slides.crossTen.overTen.step2Title',
          ADDING_LESSON_COPY_PL.slides.przekroczenie.overTen.step2Title
        ),
        step2Text: translateAddingLesson(
          translate,
          'slides.crossTen.overTen.step2Text',
          ADDING_LESSON_COPY_PL.slides.przekroczenie.overTen.step2Text
        ),
        targetLabel: translateAddingLesson(
          translate,
          'slides.crossTen.overTen.targetLabel',
          ADDING_LESSON_COPY_PL.slides.przekroczenie.overTen.targetLabel
        ),
        remainingChip: translateAddingLesson(
          translate,
          'slides.crossTen.overTen.remainingChip',
          ADDING_LESSON_COPY_PL.slides.przekroczenie.overTen.remainingChip
        ),
      },
      numberLine: {
        title: translateAddingLesson(
          translate,
          'slides.crossTen.numberLine.title',
          ADDING_LESSON_COPY_PL.slides.przekroczenie.numberLine.title
        ),
        lead: translateAddingLesson(
          translate,
          'slides.crossTen.numberLine.lead',
          ADDING_LESSON_COPY_PL.slides.przekroczenie.numberLine.lead
        ),
        caption: translateAddingLesson(
          translate,
          'slides.crossTen.numberLine.caption',
          ADDING_LESSON_COPY_PL.slides.przekroczenie.numberLine.caption
        ),
        startChip: translateAddingLesson(
          translate,
          'slides.crossTen.numberLine.startChip',
          ADDING_LESSON_COPY_PL.slides.przekroczenie.numberLine.startChip
        ),
        plusTwoChip: translateAddingLesson(
          translate,
          'slides.crossTen.numberLine.plusTwoChip',
          ADDING_LESSON_COPY_PL.slides.przekroczenie.numberLine.plusTwoChip
        ),
        tenChip: translateAddingLesson(
          translate,
          'slides.crossTen.numberLine.tenChip',
          ADDING_LESSON_COPY_PL.slides.przekroczenie.numberLine.tenChip
        ),
        plusThreeChip: translateAddingLesson(
          translate,
          'slides.crossTen.numberLine.plusThreeChip',
          ADDING_LESSON_COPY_PL.slides.przekroczenie.numberLine.plusThreeChip
        ),
        resultChip: translateAddingLesson(
          translate,
          'slides.crossTen.numberLine.resultChip',
          ADDING_LESSON_COPY_PL.slides.przekroczenie.numberLine.resultChip
        ),
      },
      tenFrame: {
        title: translateAddingLesson(
          translate,
          'slides.crossTen.tenFrame.title',
          ADDING_LESSON_COPY_PL.slides.przekroczenie.tenFrame.title
        ),
        lead: translateAddingLesson(
          translate,
          'slides.crossTen.tenFrame.lead',
          ADDING_LESSON_COPY_PL.slides.przekroczenie.tenFrame.lead
        ),
        caption: translateAddingLesson(
          translate,
          'slides.crossTen.tenFrame.caption',
          ADDING_LESSON_COPY_PL.slides.przekroczenie.tenFrame.caption
        ),
        miniPlanTitle: translateAddingLesson(
          translate,
          'slides.crossTen.tenFrame.miniPlanTitle',
          ADDING_LESSON_COPY_PL.slides.przekroczenie.tenFrame.miniPlanTitle
        ),
        steps: ADDING_LESSON_COPY_PL.slides.przekroczenie.tenFrame.steps.map((step, index) =>
          translateAddingLesson(translate, `slides.crossTen.tenFrame.steps.${index}`, step)
        ),
      },
    },
    dwucyfrowe: {
      intro: {
        title: translateAddingLesson(
          translate,
          'slides.doubleDigit.intro.title',
          ADDING_LESSON_COPY_PL.slides.dwucyfrowe.intro.title
        ),
        lead: translateAddingLesson(
          translate,
          'slides.doubleDigit.intro.lead',
          ADDING_LESSON_COPY_PL.slides.dwucyfrowe.intro.lead
        ),
        tensLabel: translateAddingLesson(
          translate,
          'slides.doubleDigit.intro.tensLabel',
          ADDING_LESSON_COPY_PL.slides.dwucyfrowe.intro.tensLabel
        ),
        onesLabel: translateAddingLesson(
          translate,
          'slides.doubleDigit.intro.onesLabel',
          ADDING_LESSON_COPY_PL.slides.dwucyfrowe.intro.onesLabel
        ),
        schemeTitle: translateAddingLesson(
          translate,
          'slides.doubleDigit.intro.schemeTitle',
          ADDING_LESSON_COPY_PL.slides.dwucyfrowe.intro.schemeTitle
        ),
        schemeCaption: translateAddingLesson(
          translate,
          'slides.doubleDigit.intro.schemeCaption',
          ADDING_LESSON_COPY_PL.slides.dwucyfrowe.intro.schemeCaption
        ),
      },
      motion: {
        title: translateAddingLesson(
          translate,
          'slides.doubleDigit.motion.title',
          ADDING_LESSON_COPY_PL.slides.dwucyfrowe.motion.title
        ),
        lead: translateAddingLesson(
          translate,
          'slides.doubleDigit.motion.lead',
          ADDING_LESSON_COPY_PL.slides.dwucyfrowe.motion.lead
        ),
        caption: translateAddingLesson(
          translate,
          'slides.doubleDigit.motion.caption',
          ADDING_LESSON_COPY_PL.slides.dwucyfrowe.motion.caption
        ),
      },
      blocks: {
        title: translateAddingLesson(
          translate,
          'slides.doubleDigit.blocks.title',
          ADDING_LESSON_COPY_PL.slides.dwucyfrowe.blocks.title
        ),
        lead: translateAddingLesson(
          translate,
          'slides.doubleDigit.blocks.lead',
          ADDING_LESSON_COPY_PL.slides.dwucyfrowe.blocks.lead
        ),
        caption: translateAddingLesson(
          translate,
          'slides.doubleDigit.blocks.caption',
          ADDING_LESSON_COPY_PL.slides.dwucyfrowe.blocks.caption
        ),
        tensChip: translateAddingLesson(
          translate,
          'slides.doubleDigit.blocks.tensChip',
          ADDING_LESSON_COPY_PL.slides.dwucyfrowe.blocks.tensChip
        ),
        onesChip: translateAddingLesson(
          translate,
          'slides.doubleDigit.blocks.onesChip',
          ADDING_LESSON_COPY_PL.slides.dwucyfrowe.blocks.onesChip
        ),
        sumChip: translateAddingLesson(
          translate,
          'slides.doubleDigit.blocks.sumChip',
          ADDING_LESSON_COPY_PL.slides.dwucyfrowe.blocks.sumChip
        ),
      },
      columns: {
        title: translateAddingLesson(
          translate,
          'slides.doubleDigit.columns.title',
          ADDING_LESSON_COPY_PL.slides.dwucyfrowe.columns.title
        ),
        lead: translateAddingLesson(
          translate,
          'slides.doubleDigit.columns.lead',
          ADDING_LESSON_COPY_PL.slides.dwucyfrowe.columns.lead
        ),
        caption: translateAddingLesson(
          translate,
          'slides.doubleDigit.columns.caption',
          ADDING_LESSON_COPY_PL.slides.dwucyfrowe.columns.caption
        ),
        tensLabel: translateAddingLesson(
          translate,
          'slides.doubleDigit.columns.tensLabel',
          ADDING_LESSON_COPY_PL.slides.dwucyfrowe.columns.tensLabel
        ),
        onesLabel: translateAddingLesson(
          translate,
          'slides.doubleDigit.columns.onesLabel',
          ADDING_LESSON_COPY_PL.slides.dwucyfrowe.columns.onesLabel
        ),
      },
      abacus: {
        title: translateAddingLesson(
          translate,
          'slides.doubleDigit.abacus.title',
          ADDING_LESSON_COPY_PL.slides.dwucyfrowe.abacus.title
        ),
        lead: translateAddingLesson(
          translate,
          'slides.doubleDigit.abacus.lead',
          ADDING_LESSON_COPY_PL.slides.dwucyfrowe.abacus.lead
        ),
        caption: translateAddingLesson(
          translate,
          'slides.doubleDigit.abacus.caption',
          ADDING_LESSON_COPY_PL.slides.dwucyfrowe.abacus.caption
        ),
        tensChip: translateAddingLesson(
          translate,
          'slides.doubleDigit.abacus.tensChip',
          ADDING_LESSON_COPY_PL.slides.dwucyfrowe.abacus.tensChip
        ),
        onesChip: translateAddingLesson(
          translate,
          'slides.doubleDigit.abacus.onesChip',
          ADDING_LESSON_COPY_PL.slides.dwucyfrowe.abacus.onesChip
        ),
        sumChip: translateAddingLesson(
          translate,
          'slides.doubleDigit.abacus.sumChip',
          ADDING_LESSON_COPY_PL.slides.dwucyfrowe.abacus.sumChip
        ),
      },
    },
    zapamietaj: {
      rules: {
        title: translateAddingLesson(
          translate,
          'slides.remember.rules.title',
          ADDING_LESSON_COPY_PL.slides.zapamietaj.rules.title
        ),
        orderChip: translateAddingLesson(
          translate,
          'slides.remember.rules.orderChip',
          ADDING_LESSON_COPY_PL.slides.zapamietaj.rules.orderChip
        ),
        zeroChip: translateAddingLesson(
          translate,
          'slides.remember.rules.zeroChip',
          ADDING_LESSON_COPY_PL.slides.zapamietaj.rules.zeroChip
        ),
        startChip: translateAddingLesson(
          translate,
          'slides.remember.rules.startChip',
          ADDING_LESSON_COPY_PL.slides.zapamietaj.rules.startChip
        ),
        groupChip: translateAddingLesson(
          translate,
          'slides.remember.rules.groupChip',
          ADDING_LESSON_COPY_PL.slides.zapamietaj.rules.groupChip
        ),
        pairsTitle: translateAddingLesson(
          translate,
          'slides.remember.rules.pairsTitle',
          ADDING_LESSON_COPY_PL.slides.zapamietaj.rules.pairsTitle
        ),
        pairsText: translateAddingLesson(
          translate,
          'slides.remember.rules.pairsText',
          ADDING_LESSON_COPY_PL.slides.zapamietaj.rules.pairsText
        ),
        doublesTitle: translateAddingLesson(
          translate,
          'slides.remember.rules.doublesTitle',
          ADDING_LESSON_COPY_PL.slides.zapamietaj.rules.doublesTitle
        ),
        doublesText: translateAddingLesson(
          translate,
          'slides.remember.rules.doublesText',
          ADDING_LESSON_COPY_PL.slides.zapamietaj.rules.doublesText
        ),
        groupingTitle: translateAddingLesson(
          translate,
          'slides.remember.rules.groupingTitle',
          ADDING_LESSON_COPY_PL.slides.zapamietaj.rules.groupingTitle
        ),
        groupingText: translateAddingLesson(
          translate,
          'slides.remember.rules.groupingText',
          ADDING_LESSON_COPY_PL.slides.zapamietaj.rules.groupingText
        ),
        pathTitle: translateAddingLesson(
          translate,
          'slides.remember.rules.pathTitle',
          ADDING_LESSON_COPY_PL.slides.zapamietaj.rules.pathTitle
        ),
        pathStep1Title: translateAddingLesson(
          translate,
          'slides.remember.rules.pathStep1Title',
          ADDING_LESSON_COPY_PL.slides.zapamietaj.rules.pathStep1Title
        ),
        pathStep1Text: translateAddingLesson(
          translate,
          'slides.remember.rules.pathStep1Text',
          ADDING_LESSON_COPY_PL.slides.zapamietaj.rules.pathStep1Text
        ),
        pathStep2Title: translateAddingLesson(
          translate,
          'slides.remember.rules.pathStep2Title',
          ADDING_LESSON_COPY_PL.slides.zapamietaj.rules.pathStep2Title
        ),
        pathStep2Text: translateAddingLesson(
          translate,
          'slides.remember.rules.pathStep2Text',
          ADDING_LESSON_COPY_PL.slides.zapamietaj.rules.pathStep2Text
        ),
        pathStep3Title: translateAddingLesson(
          translate,
          'slides.remember.rules.pathStep3Title',
          ADDING_LESSON_COPY_PL.slides.zapamietaj.rules.pathStep3Title
        ),
        pathStep3Text: translateAddingLesson(
          translate,
          'slides.remember.rules.pathStep3Text',
          ADDING_LESSON_COPY_PL.slides.zapamietaj.rules.pathStep3Text
        ),
      },
      commutative: {
        title: translateAddingLesson(
          translate,
          'slides.remember.commutative.title',
          ADDING_LESSON_COPY_PL.slides.zapamietaj.commutative.title
        ),
        label: translateAddingLesson(
          translate,
          'slides.remember.commutative.label',
          ADDING_LESSON_COPY_PL.slides.zapamietaj.commutative.label
        ),
        description: translateAddingLesson(
          translate,
          'slides.remember.commutative.description',
          ADDING_LESSON_COPY_PL.slides.zapamietaj.commutative.description
        ),
        caption: translateAddingLesson(
          translate,
          'slides.remember.commutative.caption',
          ADDING_LESSON_COPY_PL.slides.zapamietaj.commutative.caption
        ),
      },
      associative: {
        title: translateAddingLesson(
          translate,
          'slides.remember.associative.title',
          ADDING_LESSON_COPY_PL.slides.zapamietaj.associative.title
        ),
        bracketsLabel: translateAddingLesson(
          translate,
          'slides.remember.associative.bracketsLabel',
          ADDING_LESSON_COPY_PL.slides.zapamietaj.associative.bracketsLabel
        ),
        groupingLabel: translateAddingLesson(
          translate,
          'slides.remember.associative.groupingLabel',
          ADDING_LESSON_COPY_PL.slides.zapamietaj.associative.groupingLabel
        ),
        description: translateAddingLesson(
          translate,
          'slides.remember.associative.description',
          ADDING_LESSON_COPY_PL.slides.zapamietaj.associative.description
        ),
        caption: translateAddingLesson(
          translate,
          'slides.remember.associative.caption',
          ADDING_LESSON_COPY_PL.slides.zapamietaj.associative.caption
        ),
      },
      zero: {
        title: translateAddingLesson(
          translate,
          'slides.remember.zero.title',
          ADDING_LESSON_COPY_PL.slides.zapamietaj.zero.title
        ),
        zeroLabel: translateAddingLesson(
          translate,
          'slides.remember.zero.zeroLabel',
          ADDING_LESSON_COPY_PL.slides.zapamietaj.zero.zeroLabel
        ),
        noChangeLabel: translateAddingLesson(
          translate,
          'slides.remember.zero.noChangeLabel',
          ADDING_LESSON_COPY_PL.slides.zapamietaj.zero.noChangeLabel
        ),
        description: translateAddingLesson(
          translate,
          'slides.remember.zero.description',
          ADDING_LESSON_COPY_PL.slides.zapamietaj.zero.description
        ),
        caption: translateAddingLesson(
          translate,
          'slides.remember.zero.caption',
          ADDING_LESSON_COPY_PL.slides.zapamietaj.zero.caption
        ),
      },
      makeTen: {
        title: translateAddingLesson(
          translate,
          'slides.remember.makeTen.title',
          ADDING_LESSON_COPY_PL.slides.zapamietaj.makeTen.title
        ),
        label: translateAddingLesson(
          translate,
          'slides.remember.makeTen.label',
          ADDING_LESSON_COPY_PL.slides.zapamietaj.makeTen.label
        ),
        description: translateAddingLesson(
          translate,
          'slides.remember.makeTen.description',
          ADDING_LESSON_COPY_PL.slides.zapamietaj.makeTen.description
        ),
        caption: translateAddingLesson(
          translate,
          'slides.remember.makeTen.caption',
          ADDING_LESSON_COPY_PL.slides.zapamietaj.makeTen.caption
        ),
      },
      doubles: {
        title: translateAddingLesson(
          translate,
          'slides.remember.doubles.title',
          ADDING_LESSON_COPY_PL.slides.zapamietaj.doubles.title
        ),
        label: translateAddingLesson(
          translate,
          'slides.remember.doubles.label',
          ADDING_LESSON_COPY_PL.slides.zapamietaj.doubles.label
        ),
        description: translateAddingLesson(
          translate,
          'slides.remember.doubles.description',
          ADDING_LESSON_COPY_PL.slides.zapamietaj.doubles.description
        ),
        caption: translateAddingLesson(
          translate,
          'slides.remember.doubles.caption',
          ADDING_LESSON_COPY_PL.slides.zapamietaj.doubles.caption
        ),
      },
    },
  },
  game: {
    stageTitle: translateAddingLesson(
      translate,
      'game.stageTitle',
      ADDING_LESSON_COPY_PL.game.stageTitle
    ),
  },
  synthesis: {
    stageTitle: translateAddingLesson(
      translate,
      'synthesis.stageTitle',
      ADDING_LESSON_COPY_PL.synthesis.stageTitle
    ),
  },
});

const buildAddingLessonSlides = (
  copy: AddingLessonCopy
): Record<AddingSlideSectionId, LessonSlide[]> => ({
  podstawy: [
    {
      title: copy.slides.podstawy.meaning.title,
      content: (
        <KangurLessonStack>
          <KangurLessonLead>{copy.slides.podstawy.meaning.lead}</KangurLessonLead>
          <div className='flex flex-wrap items-center justify-center kangur-panel-gap'>
            <KangurDisplayEmoji size='md'>🍎🍎</KangurDisplayEmoji>
            <KangurEquationDisplay
              accent='slate'
              as='span'
              className='[color:var(--kangur-page-muted-text)]'
              size='md'
            >
              +
            </KangurEquationDisplay>
            <KangurDisplayEmoji size='md'>🍎🍎🍎</KangurDisplayEmoji>
            <KangurEquationDisplay
              accent='slate'
              as='span'
              className='[color:var(--kangur-page-muted-text)]'
              size='md'
            >
              =
            </KangurEquationDisplay>
            <KangurDisplayEmoji size='md'>🍎🍎🍎🍎🍎</KangurDisplayEmoji>
          </div>
          <KangurEquationDisplay accent='amber' size='sm'>
            2 + 3 = 5
          </KangurEquationDisplay>
          <KangurLessonCallout accent='slate' className='max-w-md text-center'>
            <div className='grid grid-cols-1 items-center justify-items-center kangur-panel-gap sm:grid-cols-[1fr_auto_1fr] sm:justify-items-stretch'>
              <div className='rounded-xl border border-amber-200/60 bg-amber-50/80 px-3 py-2'>
                <p className='text-[11px] font-semibold uppercase tracking-wide text-amber-700'>
                  {copy.slides.podstawy.meaning.partLabel}
                </p>
                <p className='text-2xl font-bold text-amber-700'>2</p>
              </div>
              <span className='text-xl font-bold text-slate-400'>+</span>
              <div className='rounded-xl border border-sky-200/60 bg-sky-50/80 px-3 py-2'>
                <p className='text-[11px] font-semibold uppercase tracking-wide text-sky-700'>
                  {copy.slides.podstawy.meaning.partLabel}
                </p>
                <p className='text-2xl font-bold text-sky-700'>3</p>
              </div>
            </div>
            <div className='mt-3 flex items-center justify-center gap-2'>
              <span className='text-xl font-bold text-slate-400'>=</span>
              <div className='rounded-2xl border border-emerald-200/60 bg-emerald-50/80 px-4 py-2'>
                <p className='text-[11px] font-semibold uppercase tracking-wide text-emerald-700'>
                  {copy.slides.podstawy.meaning.totalLabel}
                </p>
                <p className='text-2xl font-bold text-emerald-700'>5</p>
              </div>
            </div>
            <KangurLessonCaption className='mt-2'>
              {copy.slides.podstawy.meaning.caption}
            </KangurLessonCaption>
          </KangurLessonCallout>
          <div className='grid w-full max-w-md grid-cols-1 kangur-panel-gap min-[420px]:grid-cols-3'>
            <div className='rounded-2xl border border-amber-200/70 bg-amber-50/80 px-3 py-2 text-center text-xs font-semibold text-amber-700'>
              <div className='text-xl'>🍎🍎</div>
              <p className='mt-1'>{copy.slides.podstawy.meaning.startLabel}</p>
            </div>
            <div className='rounded-2xl border border-slate-200/70 bg-white px-3 py-2 text-center text-xs font-semibold text-slate-600'>
              <div className='text-xl'>➕</div>
              <p className='mt-1'>{copy.slides.podstawy.meaning.combineLabel}</p>
            </div>
            <div className='rounded-2xl border border-emerald-200/70 bg-emerald-50/80 px-3 py-2 text-center text-xs font-semibold text-emerald-700'>
              <div className='text-xl'>🍎🍎🍎🍎🍎</div>
              <p className='mt-1'>{copy.slides.podstawy.meaning.resultLabel}</p>
            </div>
          </div>
        </KangurLessonStack>
      ),
    },
    {
      title: copy.slides.podstawy.singleDigit.title,
      content: (
        <KangurLessonStack>
          <KangurLessonLead>{copy.slides.podstawy.singleDigit.lead}</KangurLessonLead>
          <KangurLessonCallout accent='amber' className='text-center'>
            <KangurEquationDisplay accent='amber' data-testid='adding-lesson-single-digit-equation'>
              4 + 3 = ?
            </KangurEquationDisplay>
            <div className='mt-3 grid gap-2 text-left text-sm [color:var(--kangur-page-text)]'>
              <div className={KANGUR_START_ROW_CLASSNAME}>
                <KangurIconBadge accent='amber' size='sm'>
                  1
                </KangurIconBadge>
                <span>{copy.slides.podstawy.singleDigit.step1}</span>
              </div>
              <div className={KANGUR_START_ROW_CLASSNAME}>
                <KangurIconBadge accent='amber' size='sm'>
                  2
                </KangurIconBadge>
                <span>{copy.slides.podstawy.singleDigit.step2}</span>
              </div>
              <div className={KANGUR_START_ROW_CLASSNAME}>
                <KangurIconBadge accent='amber' size='sm'>
                  3
                </KangurIconBadge>
                <span>{copy.slides.podstawy.singleDigit.step3}</span>
              </div>
            </div>
          </KangurLessonCallout>
          <KangurLessonInset accent='rose' className='text-center'>
            <div className='flex items-center justify-center gap-2 text-xs font-semibold uppercase tracking-wide text-rose-700'>
              <span>{copy.slides.podstawy.singleDigit.staircaseLabel}</span>
              <span className='text-rose-400'>•</span>
              <span>{copy.slides.podstawy.singleDigit.countUpLabel}</span>
            </div>
            <div className='mt-2'>
              <AddingCountOnAnimation />
            </div>
            <KangurLessonCaption className='mt-2'>
              {copy.slides.podstawy.singleDigit.caption}
            </KangurLessonCaption>
          </KangurLessonInset>
          <div className='flex flex-wrap items-center justify-center gap-2 text-xs font-semibold'>
            <KangurLessonChip accent='amber'>
              {copy.slides.podstawy.singleDigit.startLargeChip}
            </KangurLessonChip>
            <KangurLessonChip accent='sky'>
              {copy.slides.podstawy.singleDigit.countUpChip}
            </KangurLessonChip>
            <KangurLessonChip accent='emerald'>
              {copy.slides.podstawy.singleDigit.quickResultChip}
            </KangurLessonChip>
          </div>
          <div className='flex gap-1 flex-wrap justify-center'>
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
              <KangurIconBadge key={n} accent='indigo' size='sm'>
                {n}
              </KangurIconBadge>
            ))}
          </div>
        </KangurLessonStack>
      ),
    },
    {
      title: copy.slides.podstawy.motion.title,
      content: (
        <KangurLessonStack>
          <KangurLessonLead>{copy.slides.podstawy.motion.lead}</KangurLessonLead>
          <KangurLessonCallout accent='teal' className='max-w-md text-center'>
            <div className='mx-auto w-full max-w-sm'>
              <AddingSvgAnimation />
            </div>
            <KangurEquationDisplay accent='teal' className='mt-2' size='sm'>
              2 + 3 = 5
            </KangurEquationDisplay>
            <KangurLessonCaption className='mt-1'>
              {copy.slides.podstawy.motion.caption}
            </KangurLessonCaption>
            <div className='mt-3 flex flex-wrap items-center justify-center kangur-panel-gap text-xs font-semibold'>
              <div className={KANGUR_CENTER_ROW_CLASSNAME}>
                <span className='h-2.5 w-2.5 rounded-full bg-amber-400' />
                <span>{copy.slides.podstawy.motion.groupA}</span>
              </div>
              <div className={KANGUR_CENTER_ROW_CLASSNAME}>
                <span className='h-2.5 w-2.5 rounded-full bg-sky-400' />
                <span>{copy.slides.podstawy.motion.groupB}</span>
              </div>
              <div className={KANGUR_CENTER_ROW_CLASSNAME}>
                <span className='h-2.5 w-2.5 rounded-full bg-emerald-400' />
                <span>{copy.slides.podstawy.motion.sum}</span>
              </div>
            </div>
          </KangurLessonCallout>
        </KangurLessonStack>
      ),
    },
  ],
  przekroczenie: [
    {
      title: copy.slides.przekroczenie.overTen.title,
      content: (
        <KangurLessonStack>
          <KangurLessonLead>{copy.slides.przekroczenie.overTen.lead}</KangurLessonLead>
          <KangurLessonCallout accent='sky' className='text-center'>
            <div className='mx-auto w-full max-w-sm'>
              <AddingCrossTenSvgAnimation />
            </div>
            <KangurEquationDisplay accent='sky'>7 + 5 = ?</KangurEquationDisplay>
            <KangurLessonCaption className='mt-2'>
              {copy.slides.przekroczenie.overTen.caption}
            </KangurLessonCaption>
          </KangurLessonCallout>
          <div className='grid w-full kangur-panel-gap sm:grid-cols-2'>
            <KangurLessonCallout accent='sky' className='text-left text-sm' padding='sm'>
              <p className='text-xs font-semibold uppercase tracking-wide text-sky-700'>
                {copy.slides.przekroczenie.overTen.step1Title}
              </p>
              <p className='mt-1'>{copy.slides.przekroczenie.overTen.step1Text}</p>
            </KangurLessonCallout>
            <KangurLessonCallout accent='slate' className='text-left text-sm' padding='sm'>
              <p className='text-xs font-semibold uppercase tracking-wide text-slate-600'>
                {copy.slides.przekroczenie.overTen.step2Title}
              </p>
              <p className='mt-1'>{copy.slides.przekroczenie.overTen.step2Text}</p>
            </KangurLessonCallout>
          </div>
          <div className='w-full max-w-md rounded-2xl border border-sky-200/70 bg-sky-50/70 px-4 py-3 text-left text-sm'>
            <p className='text-xs font-semibold uppercase tracking-wide text-sky-700'>
              {copy.slides.przekroczenie.overTen.targetLabel}
            </p>
            <div className='mt-2 h-3 w-full overflow-hidden rounded-full border border-sky-200 bg-white/80'>
              <div className='flex h-full'>
                <div className='bg-amber-400' style={{ width: '70%' }} />
                <div className='bg-sky-400' style={{ width: '30%' }} />
              </div>
            </div>
            <div className='mt-2 flex items-center justify-between text-xs font-semibold text-slate-600'>
              <span>7</span>
              <span>+3</span>
              <span>=10</span>
            </div>
            <div className={`mt-2 ${KANGUR_CENTER_ROW_CLASSNAME}`}>
              <div className='rounded-full border border-emerald-200/70 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700'>
                {copy.slides.przekroczenie.overTen.remainingChip}
              </div>
            </div>
          </div>
        </KangurLessonStack>
      ),
    },
    {
      title: copy.slides.przekroczenie.numberLine.title,
      content: (
        <KangurLessonStack>
          <KangurLessonLead>{copy.slides.przekroczenie.numberLine.lead}</KangurLessonLead>
          <KangurLessonCallout accent='sky' className='text-center'>
            <div className='mx-auto w-full max-w-sm'>
              <AddingNumberLineAnimation />
            </div>
            <KangurEquationDisplay accent='sky'>8 + 5 = 13</KangurEquationDisplay>
            <KangurLessonCaption className='mt-2'>
              {copy.slides.przekroczenie.numberLine.caption}
            </KangurLessonCaption>
          </KangurLessonCallout>
          <div className='flex flex-wrap items-center justify-center gap-2 text-xs font-semibold'>
            <KangurLessonChip accent='sky'>
              {copy.slides.przekroczenie.numberLine.startChip}
            </KangurLessonChip>
            <span className='text-slate-400'>→</span>
            <KangurLessonChip accent='amber'>
              {copy.slides.przekroczenie.numberLine.plusTwoChip}
            </KangurLessonChip>
            <KangurLessonChip accent='emerald'>
              {copy.slides.przekroczenie.numberLine.tenChip}
            </KangurLessonChip>
            <span className='text-slate-400'>→</span>
            <KangurLessonChip accent='amber'>
              {copy.slides.przekroczenie.numberLine.plusThreeChip}
            </KangurLessonChip>
            <KangurLessonChip accent='emerald'>
              {copy.slides.przekroczenie.numberLine.resultChip}
            </KangurLessonChip>
          </div>
        </KangurLessonStack>
      ),
    },
    {
      title: copy.slides.przekroczenie.tenFrame.title,
      content: (
        <KangurLessonStack>
          <KangurLessonLead>{copy.slides.przekroczenie.tenFrame.lead}</KangurLessonLead>
          <KangurLessonCallout accent='sky' className='text-center'>
            <div className='mx-auto w-full max-w-sm'>
              <AddingTenFrameAnimation />
            </div>
            <KangurEquationDisplay accent='sky'>7 + 5 = 12</KangurEquationDisplay>
            <KangurLessonCaption className='mt-2'>
              {copy.slides.przekroczenie.tenFrame.caption}
            </KangurLessonCaption>
          </KangurLessonCallout>
          <div className='w-full max-w-md rounded-2xl border border-sky-200/70 bg-sky-50/70 px-4 py-3 text-left text-sm'>
            <p className='text-xs font-semibold uppercase tracking-wide text-sky-700'>
              {copy.slides.przekroczenie.tenFrame.miniPlanTitle}
            </p>
            <div className='mt-2 space-y-1'>
              {copy.slides.przekroczenie.tenFrame.steps.map((step) => (
                <p key={step}>• {step}</p>
              ))}
            </div>
          </div>
        </KangurLessonStack>
      ),
    },
  ],
  dwucyfrowe: [
    {
      title: copy.slides.dwucyfrowe.intro.title,
      content: (
        <KangurLessonStack>
          <KangurLessonLead>{copy.slides.dwucyfrowe.intro.lead}</KangurLessonLead>
          <KangurLessonCallout accent='emerald' className='max-w-xs text-center'>
            <KangurEquationDisplay accent='emerald'>24 + 13 = ?</KangurEquationDisplay>
            <div className='mt-3 grid gap-2 text-left text-sm [color:var(--kangur-page-text)]'>
              <div className='rounded-lg border border-emerald-200/70 bg-emerald-50/70 px-3 py-2'>
                <p className='text-xs font-semibold uppercase tracking-wide text-emerald-700'>
                  {copy.slides.dwucyfrowe.intro.tensLabel}
                </p>
                <p className='mt-1 font-semibold'>20 + 10 = 30</p>
              </div>
              <div className='rounded-lg border border-emerald-200/70 bg-emerald-50/70 px-3 py-2'>
                <p className='text-xs font-semibold uppercase tracking-wide text-emerald-700'>
                  {copy.slides.dwucyfrowe.intro.onesLabel}
                </p>
                <p className='mt-1 font-semibold'>4 + 3 = 7</p>
              </div>
            </div>
            <KangurEquationDisplay accent='emerald' className='mt-2' size='md'>
              30 + 7 = 37 ✓
            </KangurEquationDisplay>
          </KangurLessonCallout>
          <KangurLessonInset accent='emerald' className='max-w-md text-left' padding='sm'>
            <div className='grid gap-2 text-sm'>
              <div className='flex items-center justify-between'>
                <span className='text-xs font-semibold uppercase tracking-wide text-emerald-700'>
                  {copy.slides.dwucyfrowe.intro.schemeTitle}
                </span>
                <span className='text-xs text-emerald-600'>
                  {copy.slides.dwucyfrowe.intro.schemeCaption}
                </span>
              </div>
              <div className='flex items-center justify-between rounded-md bg-emerald-50/60 px-2 py-1'>
                <span>20 + 10</span>
                <span className='font-semibold'>30</span>
              </div>
              <div className='flex items-center justify-between rounded-md bg-emerald-50/60 px-2 py-1'>
                <span>4 + 3</span>
                <span className='font-semibold'>7</span>
              </div>
              <div className='flex items-center justify-between border-t border-emerald-200/70 pt-2 font-semibold text-emerald-700'>
                <span>30 + 7</span>
                <span>37</span>
              </div>
            </div>
          </KangurLessonInset>
        </KangurLessonStack>
      ),
    },
    {
      title: copy.slides.dwucyfrowe.motion.title,
      content: (
        <KangurLessonStack>
          <KangurLessonLead>{copy.slides.dwucyfrowe.motion.lead}</KangurLessonLead>
          <KangurLessonCallout accent='emerald' className='text-center'>
            <div className='mx-auto w-full max-w-sm'>
              <AddingTwoDigitAnimation />
            </div>
            <KangurEquationDisplay accent='emerald' className='mt-2' size='sm'>
              24 + 13 = 37
            </KangurEquationDisplay>
            <KangurLessonCaption className='mt-1'>
              {copy.slides.dwucyfrowe.motion.caption}
            </KangurLessonCaption>
          </KangurLessonCallout>
        </KangurLessonStack>
      ),
    },
    {
      title: copy.slides.dwucyfrowe.blocks.title,
      content: (
        <KangurLessonStack>
          <KangurLessonLead>{copy.slides.dwucyfrowe.blocks.lead}</KangurLessonLead>
          <KangurLessonCallout accent='teal' className='text-center'>
            <div className='mx-auto w-full max-w-sm'>
              <AddingTensOnesAnimation />
            </div>
            <KangurEquationDisplay accent='teal' className='mt-2' size='sm'>
              24 + 13 = 37
            </KangurEquationDisplay>
            <KangurLessonCaption className='mt-1'>
              {copy.slides.dwucyfrowe.blocks.caption}
            </KangurLessonCaption>
          </KangurLessonCallout>
          <div className='flex flex-wrap items-center justify-center kangur-panel-gap text-xs font-semibold'>
            <div className={KANGUR_CENTER_ROW_CLASSNAME}>
              <span className='h-2.5 w-2.5 rounded-sm bg-emerald-400' />
              <span>{copy.slides.dwucyfrowe.blocks.tensChip}</span>
            </div>
            <div className={KANGUR_CENTER_ROW_CLASSNAME}>
              <span className='h-2.5 w-2.5 rounded-sm bg-sky-400' />
              <span>{copy.slides.dwucyfrowe.blocks.onesChip}</span>
            </div>
            <div className={KANGUR_CENTER_ROW_CLASSNAME}>
              <span className='h-2.5 w-2.5 rounded-sm bg-amber-400' />
              <span>{copy.slides.dwucyfrowe.blocks.sumChip}</span>
            </div>
          </div>
        </KangurLessonStack>
      ),
    },
    {
      title: copy.slides.dwucyfrowe.columns.title,
      content: (
        <KangurLessonStack>
          <KangurLessonLead>{copy.slides.dwucyfrowe.columns.lead}</KangurLessonLead>
          <KangurLessonCallout accent='emerald' className='text-center'>
            <div className='mx-auto w-full max-w-sm'>
              <AddingColumnAnimation />
            </div>
            <KangurLessonCaption className='mt-1'>
              {copy.slides.dwucyfrowe.columns.caption}
            </KangurLessonCaption>
          </KangurLessonCallout>
          <KangurLessonInset accent='slate' className='max-w-md text-left' padding='sm'>
            <div className='grid gap-2 text-sm'>
              <div className='grid grid-cols-1 items-center gap-2 text-center font-semibold sm:grid-cols-[1fr_auto_1fr] sm:text-left'>
                <span>{copy.slides.dwucyfrowe.columns.tensLabel}</span>
                <span className='text-slate-400'>+</span>
                <span>{copy.slides.dwucyfrowe.columns.onesLabel}</span>
              </div>
              <div className='grid grid-cols-1 items-center gap-2 text-center rounded-md bg-slate-50 px-2 py-1 sm:grid-cols-[1fr_auto_1fr] sm:text-left'>
                <span>20 + 10</span>
                <span className='text-slate-400'>→</span>
                <span>30</span>
              </div>
              <div className='grid grid-cols-1 items-center gap-2 text-center rounded-md bg-slate-50 px-2 py-1 sm:grid-cols-[1fr_auto_1fr] sm:text-left'>
                <span>4 + 3</span>
                <span className='text-slate-400'>→</span>
                <span>7</span>
              </div>
              <div className='grid grid-cols-1 items-center gap-2 text-center border-t border-slate-200 pt-2 font-semibold sm:grid-cols-[1fr_auto_1fr] sm:text-left'>
                <span>30 + 7</span>
                <span className='text-slate-400'>=</span>
                <span>37</span>
              </div>
            </div>
          </KangurLessonInset>
        </KangurLessonStack>
      ),
    },
    {
      title: copy.slides.dwucyfrowe.abacus.title,
      content: (
        <KangurLessonStack>
          <KangurLessonLead>{copy.slides.dwucyfrowe.abacus.lead}</KangurLessonLead>
          <KangurLessonCallout accent='emerald' className='text-center'>
            <div className='mx-auto w-full max-w-sm'>
              <AddingAbacusAnimation />
            </div>
            <KangurLessonCaption className='mt-1'>
              {copy.slides.dwucyfrowe.abacus.caption}
            </KangurLessonCaption>
          </KangurLessonCallout>
          <div className='flex flex-wrap items-center justify-center gap-2 text-xs font-semibold'>
            <KangurLessonChip accent='amber'>{copy.slides.dwucyfrowe.abacus.tensChip}</KangurLessonChip>
            <KangurLessonChip accent='sky'>{copy.slides.dwucyfrowe.abacus.onesChip}</KangurLessonChip>
            <KangurLessonChip accent='emerald'>{copy.slides.dwucyfrowe.abacus.sumChip}</KangurLessonChip>
          </div>
        </KangurLessonStack>
      ),
    },
  ],
  zapamietaj: [
    {
      title: copy.slides.zapamietaj.rules.title,
      content: (
        <KangurLessonStack>
          <div className='flex flex-wrap justify-center gap-2 text-xs font-semibold'>
            <KangurLessonChip accent='amber'>{copy.slides.zapamietaj.rules.orderChip}</KangurLessonChip>
            <KangurLessonChip accent='sky'>{copy.slides.zapamietaj.rules.zeroChip}</KangurLessonChip>
            <KangurLessonChip accent='emerald'>{copy.slides.zapamietaj.rules.startChip}</KangurLessonChip>
            <KangurLessonChip accent='slate'>{copy.slides.zapamietaj.rules.groupChip}</KangurLessonChip>
          </div>
          <div className='grid w-full kangur-panel-gap sm:grid-cols-2'>
            <KangurLessonCallout accent='amber' className='text-sm' padding='sm'>
              <p className='text-xs font-semibold uppercase tracking-wide text-amber-700'>
                {copy.slides.zapamietaj.rules.pairsTitle}
              </p>
              <p className='mt-1'>{copy.slides.zapamietaj.rules.pairsText}</p>
            </KangurLessonCallout>
            <KangurLessonCallout accent='emerald' className='text-sm' padding='sm'>
              <p className='text-xs font-semibold uppercase tracking-wide text-emerald-700'>
                {copy.slides.zapamietaj.rules.doublesTitle}
              </p>
              <p className='mt-1'>{copy.slides.zapamietaj.rules.doublesText}</p>
            </KangurLessonCallout>
            <KangurLessonCallout accent='slate' className='text-sm' padding='sm'>
              <p className='text-xs font-semibold uppercase tracking-wide text-slate-600'>
                {copy.slides.zapamietaj.rules.groupingTitle}
              </p>
              <p className='mt-1'>{copy.slides.zapamietaj.rules.groupingText}</p>
            </KangurLessonCallout>
          </div>
          <div className='w-full max-w-md rounded-2xl border border-slate-200/70 bg-white px-4 py-3 text-left text-sm'>
            <p className='text-xs font-semibold uppercase tracking-wide text-slate-500'>
              {copy.slides.zapamietaj.rules.pathTitle}
            </p>
            <div className='mt-2 space-y-2 border-l-2 border-slate-200 pl-3'>
              <div>
                <p className='font-semibold text-slate-700'>{copy.slides.zapamietaj.rules.pathStep1Title}</p>
                <p className='text-xs text-slate-500'>{copy.slides.zapamietaj.rules.pathStep1Text}</p>
              </div>
              <div>
                <p className='font-semibold text-slate-700'>{copy.slides.zapamietaj.rules.pathStep2Title}</p>
                <p className='text-xs text-slate-500'>{copy.slides.zapamietaj.rules.pathStep2Text}</p>
              </div>
              <div>
                <p className='font-semibold text-slate-700'>{copy.slides.zapamietaj.rules.pathStep3Title}</p>
                <p className='text-xs text-slate-500'>{copy.slides.zapamietaj.rules.pathStep3Text}</p>
              </div>
            </div>
          </div>
        </KangurLessonStack>
      ),
    },
    {
      title: copy.slides.zapamietaj.commutative.title,
      content: (
        <KangurLessonStack>
          <KangurLessonInset accent='rose' className='text-center'>
            <div className='flex items-center justify-center gap-2 text-xs font-semibold uppercase tracking-wide text-rose-700'>
              <KangurIconBadge accent='rose' size='sm'>
                ↔
              </KangurIconBadge>
              <span>{copy.slides.zapamietaj.commutative.label}</span>
            </div>
            <p className='mt-2 text-xs font-semibold [color:var(--kangur-page-muted-text)]'>
              {copy.slides.zapamietaj.commutative.description}
            </p>
            <div className='mt-2'>
              <AddingCommutativeAnimation />
            </div>
            <KangurLessonCaption className='mt-2'>
              {copy.slides.zapamietaj.commutative.caption}
            </KangurLessonCaption>
          </KangurLessonInset>
        </KangurLessonStack>
      ),
    },
    {
      title: copy.slides.zapamietaj.associative.title,
      content: (
        <KangurLessonStack>
          <KangurLessonInset accent='teal' className='text-center'>
            <div className='flex items-center justify-center gap-2 text-xs font-semibold uppercase tracking-wide text-teal-700'>
              <span>{copy.slides.zapamietaj.associative.bracketsLabel}</span>
              <span className='text-teal-400'>•</span>
              <span>{copy.slides.zapamietaj.associative.groupingLabel}</span>
            </div>
            <p className='mt-2 text-xs font-semibold [color:var(--kangur-page-muted-text)]'>
              {copy.slides.zapamietaj.associative.description}
            </p>
            <div className='mt-2'>
              <AddingAssociativeAnimation />
            </div>
            <KangurLessonCaption className='mt-2'>
              {copy.slides.zapamietaj.associative.caption}
            </KangurLessonCaption>
          </KangurLessonInset>
        </KangurLessonStack>
      ),
    },
    {
      title: copy.slides.zapamietaj.zero.title,
      content: (
        <KangurLessonStack>
          <KangurLessonInset accent='sky' className='text-center'>
            <div className='flex items-center justify-center gap-2 text-xs font-semibold uppercase tracking-wide text-sky-700'>
              <span>{copy.slides.zapamietaj.zero.zeroLabel}</span>
              <span className='text-sky-400'>=</span>
              <span>{copy.slides.zapamietaj.zero.noChangeLabel}</span>
            </div>
            <p className='mt-2 text-xs font-semibold [color:var(--kangur-page-muted-text)]'>
              {copy.slides.zapamietaj.zero.description}
            </p>
            <div className='mt-2'>
              <AddingZeroAnimation />
            </div>
            <KangurLessonCaption className='mt-2'>
              {copy.slides.zapamietaj.zero.caption}
            </KangurLessonCaption>
          </KangurLessonInset>
        </KangurLessonStack>
      ),
    },
    {
      title: copy.slides.zapamietaj.makeTen.title,
      content: (
        <KangurLessonStack>
          <KangurLessonInset accent='amber' className='text-center'>
            <div className='flex items-center justify-center gap-2 text-xs font-semibold uppercase tracking-wide text-amber-700'>
              <KangurIconBadge accent='amber' size='sm'>
                10
              </KangurIconBadge>
              <span>{copy.slides.zapamietaj.makeTen.label}</span>
            </div>
            <p className='mt-2 text-xs font-semibold [color:var(--kangur-page-muted-text)]'>
              {copy.slides.zapamietaj.makeTen.description}
            </p>
            <div className='mt-2'>
              <AddingMakeTenPairsAnimation />
            </div>
            <KangurLessonCaption className='mt-2'>
              {copy.slides.zapamietaj.makeTen.caption}
            </KangurLessonCaption>
          </KangurLessonInset>
        </KangurLessonStack>
      ),
    },
    {
      title: copy.slides.zapamietaj.doubles.title,
      content: (
        <KangurLessonStack>
          <KangurLessonInset accent='emerald' className='text-center'>
            <div className='flex items-center justify-center gap-2 text-xs font-semibold uppercase tracking-wide text-emerald-700'>
              <span>{copy.slides.zapamietaj.doubles.label}</span>
            </div>
            <p className='mt-2 text-xs font-semibold [color:var(--kangur-page-muted-text)]'>
              {copy.slides.zapamietaj.doubles.description}
            </p>
            <div className='mt-2'>
              <AddingDoublesAnimation />
            </div>
            <KangurEquationDisplay accent='emerald' className='mt-2' size='sm'>
              5 + 5 = 10
            </KangurEquationDisplay>
            <KangurLessonCaption className='mt-1'>
              {copy.slides.zapamietaj.doubles.caption}
            </KangurLessonCaption>
          </KangurLessonInset>
        </KangurLessonStack>
      ),
    },
  ],
});

const buildAddingLessonSections = (copy: AddingLessonCopy) => [
  {
    id: 'podstawy',
    emoji: '➕',
    title: copy.sections.podstawy.title,
    description: copy.sections.podstawy.description,
  },
  {
    id: 'przekroczenie',
    emoji: '🔟',
    title: copy.sections.przekroczenie.title,
    description: copy.sections.przekroczenie.description,
  },
  {
    id: 'dwucyfrowe',
    emoji: '💡',
    title: copy.sections.dwucyfrowe.title,
    description: copy.sections.dwucyfrowe.description,
  },
  {
    id: 'zapamietaj',
    emoji: '🧠',
    title: copy.sections.zapamietaj.title,
    description: copy.sections.zapamietaj.description,
  },
  {
    id: 'synthesis',
    emoji: '🎼',
    title: copy.sections.synthesis.title,
    description: copy.sections.synthesis.description,
    isGame: true,
  },
  {
    id: 'game',
    emoji: '⚽',
    title: copy.sections.game.title,
    description: copy.sections.game.description,
    isGame: true,
  },
];

export const SLIDES = buildAddingLessonSlides(ADDING_LESSON_COPY_PL);
export const HUB_SECTIONS = buildAddingLessonSections(ADDING_LESSON_COPY_PL);

export default function AddingLesson(): React.JSX.Element {
  const translations = useTranslations('KangurStaticLessons.adding');
  const copy = useMemo(() => buildAddingLessonCopy(translations), [translations]);
  const localizedSlides = useMemo(() => buildAddingLessonSlides(copy), [copy]);
  const localizedSections = useMemo(() => buildAddingLessonSections(copy), [copy]);

  return (
    <KangurUnifiedLesson
      progressMode='panel'
      lessonId='adding'
      lessonEmoji='➕'
      lessonTitle={copy.lessonTitle}
      sections={localizedSections}
      slides={localizedSlides}
      gradientClass='kangur-gradient-accent-amber'
      progressDotClassName='bg-amber-200'
      dotActiveClass='bg-orange-400'
      dotDoneClass='bg-orange-200'
      skipMarkFor={['game', 'synthesis']}
      games={[
        {
          sectionId: 'game',
          stage: {
            accent: 'amber',
            icon: '🎮',
            maxWidthClassName: 'max-w-2xl',
            headerTestId: 'adding-lesson-game-header',
            shellTestId: 'adding-lesson-game-shell',
            title: copy.game.stageTitle,
          },
          render: ({ onFinish }) => (
            <AddingBallGame finishLabelVariant='topics' onFinish={onFinish} />
          ),
        },
        {
          sectionId: 'synthesis',
          stage: {
            accent: 'amber',
            icon: '🎼',
            maxWidthClassName: 'max-w-[1120px]',
            shellClassName: '!p-4 sm:!p-6 lg:!p-8',
            headerTestId: 'adding-lesson-synthesis-header',
            shellTestId: 'adding-lesson-synthesis-shell',
            title: copy.synthesis.stageTitle,
          },
          render: ({ onFinish }) => <AddingSynthesisGame onFinish={onFinish} />,
        },
      ]}
    />
  );
}
