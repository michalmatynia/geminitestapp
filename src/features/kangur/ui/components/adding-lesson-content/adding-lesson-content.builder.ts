import {
  type LessonTranslate,
  translateLessonShellTitle,
} from '@/features/kangur/ui/components/lesson-copy';
import type {
  KangurAddingLessonTemplateContent,
} from '@/shared/contracts/kangur-lesson-templates';
import { ADDING_LESSON_DEFAULTS } from './adding-lesson-content.defaults';

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
    gameTitle: translateLessonShellTitle(
      translate,
      'game',
      ADDING_LESSON_DEFAULTS.game.gameTitle ?? '',
    ),
  },
  synthesis: {
    gameTitle: translateLessonShellTitle(
      translate,
      'synthesis',
      ADDING_LESSON_DEFAULTS.synthesis.gameTitle ?? '',
    ),
  },
});
