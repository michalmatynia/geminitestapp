'use client';

import React, { useMemo } from 'react';
import { useTranslations } from 'next-intl';

import type { LessonProps } from '@/features/kangur/lessons/lesson-ui-registry';
import { getKangurBuiltInGameInstanceId } from '@/features/kangur/games';
import { useOptionalKangurLessonTemplate } from '@/features/kangur/ui/context/KangurLessonsRuntimeContext';
import { KangurUnifiedLesson } from '@/features/kangur/ui/lessons/lesson-components';
import {
  type LessonTranslate,
} from './lesson-copy';
import {
  resolveSubtractingLessonContent,
  SUBTRACTING_LESSON_COMPONENT_CONTENT,
} from './subtracting-lesson-content';
import type { KangurSubtractingLessonTemplateContent } from '@/shared/contracts/kangur-lesson-templates';
import { buildSubtractingLessonSlides } from './SubtractingLesson.slides';
export {
  SubtractingAbacusAnimation,
  SubtractingDifferenceBarAnimation,
  SubtractingNumberLineAnimation,
  SubtractingSvgAnimation,
  SubtractingTenFrameAnimation,
} from './animations/SubtractingAnimations';

const SUBTRACTING_GARDEN_INSTANCE_ID = getKangurBuiltInGameInstanceId('subtracting_garden');
const SUBTRACTING_LESSON_COPY_PL = SUBTRACTING_LESSON_COMPONENT_CONTENT;

type SubtractingLessonCopy = KangurSubtractingLessonTemplateContent;

const translateSubtractingLesson = (
  translate: LessonTranslate,
  key: string,
  fallback: string
): string => {
  const translated = translate(key);
  return translated === key || translated.endsWith(`.${key}`) ? fallback : translated;
};

const buildSubtractingLessonCopy = (
  translate: LessonTranslate
): SubtractingLessonCopy => ({
  kind: 'subtracting',
  lessonTitle: translateSubtractingLesson(
    translate,
    'lessonTitle',
    SUBTRACTING_LESSON_COPY_PL.lessonTitle
  ),
  sections: {
    podstawy: {
      title: translateSubtractingLesson(
        translate,
        'sections.basics.title',
        SUBTRACTING_LESSON_COPY_PL.sections.podstawy.title
      ),
      description: translateSubtractingLesson(
        translate,
        'sections.basics.description',
        SUBTRACTING_LESSON_COPY_PL.sections.podstawy.description
      ),
    },
    przekroczenie: {
      title: translateSubtractingLesson(
        translate,
        'sections.crossTen.title',
        SUBTRACTING_LESSON_COPY_PL.sections.przekroczenie.title
      ),
      description: translateSubtractingLesson(
        translate,
        'sections.crossTen.description',
        SUBTRACTING_LESSON_COPY_PL.sections.przekroczenie.description
      ),
    },
    dwucyfrowe: {
      title: translateSubtractingLesson(
        translate,
        'sections.doubleDigit.title',
        SUBTRACTING_LESSON_COPY_PL.sections.dwucyfrowe.title
      ),
      description: translateSubtractingLesson(
        translate,
        'sections.doubleDigit.description',
        SUBTRACTING_LESSON_COPY_PL.sections.dwucyfrowe.description
      ),
    },
    zapamietaj: {
      title: translateSubtractingLesson(
        translate,
        'sections.remember.title',
        SUBTRACTING_LESSON_COPY_PL.sections.zapamietaj.title
      ),
      description: translateSubtractingLesson(
        translate,
        'sections.remember.description',
        SUBTRACTING_LESSON_COPY_PL.sections.zapamietaj.description
      ),
    },
    game: {
      title: translateSubtractingLesson(
        translate,
        'sections.game.title',
        SUBTRACTING_LESSON_COPY_PL.sections.game.title
      ),
      description: translateSubtractingLesson(
        translate,
        'sections.game.description',
        SUBTRACTING_LESSON_COPY_PL.sections.game.description
      ),
    },
  },
  animations: {
    subtractingSvg: {
      ariaLabel: translateSubtractingLesson(
        translate,
        'animations.subtractingSvg.ariaLabel',
        SUBTRACTING_LESSON_COPY_PL.animations.subtractingSvg.ariaLabel
      ),
    },
    numberLine: {
      ariaLabel: translateSubtractingLesson(
        translate,
        'animations.numberLine.ariaLabel',
        SUBTRACTING_LESSON_COPY_PL.animations.numberLine.ariaLabel
      ),
    },
    tenFrame: {
      ariaLabel: translateSubtractingLesson(
        translate,
        'animations.tenFrame.ariaLabel',
        SUBTRACTING_LESSON_COPY_PL.animations.tenFrame.ariaLabel
      ),
    },
    differenceBar: {
      ariaLabel: translateSubtractingLesson(
        translate,
        'animations.differenceBar.ariaLabel',
        SUBTRACTING_LESSON_COPY_PL.animations.differenceBar.ariaLabel
      ),
      differenceLabel: translateSubtractingLesson(
        translate,
        'animations.differenceBar.differenceLabel',
        SUBTRACTING_LESSON_COPY_PL.animations.differenceBar.differenceLabel
      ),
    },
    abacus: {
      ariaLabel: translateSubtractingLesson(
        translate,
        'animations.abacus.ariaLabel',
        SUBTRACTING_LESSON_COPY_PL.animations.abacus.ariaLabel
      ),
      tensLabel: translateSubtractingLesson(
        translate,
        'animations.abacus.tensLabel',
        SUBTRACTING_LESSON_COPY_PL.animations.abacus.tensLabel
      ),
      onesLabel: translateSubtractingLesson(
        translate,
        'animations.abacus.onesLabel',
        SUBTRACTING_LESSON_COPY_PL.animations.abacus.onesLabel
      ),
      startLabel: translateSubtractingLesson(
        translate,
        'animations.abacus.startLabel',
        SUBTRACTING_LESSON_COPY_PL.animations.abacus.startLabel
      ),
      subtractLabel: translateSubtractingLesson(
        translate,
        'animations.abacus.subtractLabel',
        SUBTRACTING_LESSON_COPY_PL.animations.abacus.subtractLabel
      ),
      resultLabel: translateSubtractingLesson(
        translate,
        'animations.abacus.resultLabel',
        SUBTRACTING_LESSON_COPY_PL.animations.abacus.resultLabel
      ),
    },
  },
  slides: {
    basics: {
      meaning: {
        title: translateSubtractingLesson(
          translate,
          'slides.basics.meaning.title',
          SUBTRACTING_LESSON_COPY_PL.slides.basics.meaning.title
        ),
        lead: translateSubtractingLesson(
          translate,
          'slides.basics.meaning.lead',
          SUBTRACTING_LESSON_COPY_PL.slides.basics.meaning.lead
        ),
      },
      singleDigit: {
        title: translateSubtractingLesson(
          translate,
          'slides.basics.singleDigit.title',
          SUBTRACTING_LESSON_COPY_PL.slides.basics.singleDigit.title
        ),
        lead: translateSubtractingLesson(
          translate,
          'slides.basics.singleDigit.lead',
          SUBTRACTING_LESSON_COPY_PL.slides.basics.singleDigit.lead
        ),
        step1: translateSubtractingLesson(
          translate,
          'slides.basics.singleDigit.step1',
          SUBTRACTING_LESSON_COPY_PL.slides.basics.singleDigit.step1
        ),
        step2: translateSubtractingLesson(
          translate,
          'slides.basics.singleDigit.step2',
          SUBTRACTING_LESSON_COPY_PL.slides.basics.singleDigit.step2
        ),
        step3: translateSubtractingLesson(
          translate,
          'slides.basics.singleDigit.step3',
          SUBTRACTING_LESSON_COPY_PL.slides.basics.singleDigit.step3
        ),
      },
      motion: {
        title: translateSubtractingLesson(
          translate,
          'slides.basics.motion.title',
          SUBTRACTING_LESSON_COPY_PL.slides.basics.motion.title
        ),
        lead: translateSubtractingLesson(
          translate,
          'slides.basics.motion.lead',
          SUBTRACTING_LESSON_COPY_PL.slides.basics.motion.lead
        ),
        caption: translateSubtractingLesson(
          translate,
          'slides.basics.motion.caption',
          SUBTRACTING_LESSON_COPY_PL.slides.basics.motion.caption
        ),
      },
    },
    crossTen: {
      overTen: {
        title: translateSubtractingLesson(
          translate,
          'slides.crossTen.overTen.title',
          SUBTRACTING_LESSON_COPY_PL.slides.crossTen.overTen.title
        ),
        lead: translateSubtractingLesson(
          translate,
          'slides.crossTen.overTen.lead',
          SUBTRACTING_LESSON_COPY_PL.slides.crossTen.overTen.lead
        ),
        caption: translateSubtractingLesson(
          translate,
          'slides.crossTen.overTen.caption',
          SUBTRACTING_LESSON_COPY_PL.slides.crossTen.overTen.caption
        ),
        step1Title: translateSubtractingLesson(
          translate,
          'slides.crossTen.overTen.step1Title',
          SUBTRACTING_LESSON_COPY_PL.slides.crossTen.overTen.step1Title
        ),
        step1Text: translateSubtractingLesson(
          translate,
          'slides.crossTen.overTen.step1Text',
          SUBTRACTING_LESSON_COPY_PL.slides.crossTen.overTen.step1Text
        ),
        step2Title: translateSubtractingLesson(
          translate,
          'slides.crossTen.overTen.step2Title',
          SUBTRACTING_LESSON_COPY_PL.slides.crossTen.overTen.step2Title
        ),
        step2Text: translateSubtractingLesson(
          translate,
          'slides.crossTen.overTen.step2Text',
          SUBTRACTING_LESSON_COPY_PL.slides.crossTen.overTen.step2Text
        ),
        step3Title: translateSubtractingLesson(
          translate,
          'slides.crossTen.overTen.step3Title',
          SUBTRACTING_LESSON_COPY_PL.slides.crossTen.overTen.step3Title
        ),
        step3Text: translateSubtractingLesson(
          translate,
          'slides.crossTen.overTen.step3Text',
          SUBTRACTING_LESSON_COPY_PL.slides.crossTen.overTen.step3Text
        ),
      },
      numberLine: {
        title: translateSubtractingLesson(
          translate,
          'slides.crossTen.numberLine.title',
          SUBTRACTING_LESSON_COPY_PL.slides.crossTen.numberLine.title
        ),
        lead: translateSubtractingLesson(
          translate,
          'slides.crossTen.numberLine.lead',
          SUBTRACTING_LESSON_COPY_PL.slides.crossTen.numberLine.lead
        ),
        caption: translateSubtractingLesson(
          translate,
          'slides.crossTen.numberLine.caption',
          SUBTRACTING_LESSON_COPY_PL.slides.crossTen.numberLine.caption
        ),
      },
      tenFrame: {
        title: translateSubtractingLesson(
          translate,
          'slides.crossTen.tenFrame.title',
          SUBTRACTING_LESSON_COPY_PL.slides.crossTen.tenFrame.title
        ),
        lead: translateSubtractingLesson(
          translate,
          'slides.crossTen.tenFrame.lead',
          SUBTRACTING_LESSON_COPY_PL.slides.crossTen.tenFrame.lead
        ),
        caption: translateSubtractingLesson(
          translate,
          'slides.crossTen.tenFrame.caption',
          SUBTRACTING_LESSON_COPY_PL.slides.crossTen.tenFrame.caption
        ),
      },
    },
    doubleDigit: {
      intro: {
        title: translateSubtractingLesson(
          translate,
          'slides.doubleDigit.intro.title',
          SUBTRACTING_LESSON_COPY_PL.slides.doubleDigit.intro.title
        ),
        lead: translateSubtractingLesson(
          translate,
          'slides.doubleDigit.intro.lead',
          SUBTRACTING_LESSON_COPY_PL.slides.doubleDigit.intro.lead
        ),
        tensLabel: translateSubtractingLesson(
          translate,
          'slides.doubleDigit.intro.tensLabel',
          SUBTRACTING_LESSON_COPY_PL.slides.doubleDigit.intro.tensLabel
        ),
        onesLabel: translateSubtractingLesson(
          translate,
          'slides.doubleDigit.intro.onesLabel',
          SUBTRACTING_LESSON_COPY_PL.slides.doubleDigit.intro.onesLabel
        ),
      },
      abacus: {
        title: translateSubtractingLesson(
          translate,
          'slides.doubleDigit.abacus.title',
          SUBTRACTING_LESSON_COPY_PL.slides.doubleDigit.abacus.title
        ),
        lead: translateSubtractingLesson(
          translate,
          'slides.doubleDigit.abacus.lead',
          SUBTRACTING_LESSON_COPY_PL.slides.doubleDigit.abacus.lead
        ),
        caption: translateSubtractingLesson(
          translate,
          'slides.doubleDigit.abacus.caption',
          SUBTRACTING_LESSON_COPY_PL.slides.doubleDigit.abacus.caption
        ),
      },
    },
    remember: {
      rules: {
        title: translateSubtractingLesson(
          translate,
          'slides.remember.rules.title',
          SUBTRACTING_LESSON_COPY_PL.slides.remember.rules.title
        ),
        orderChip: translateSubtractingLesson(
          translate,
          'slides.remember.rules.orderChip',
          SUBTRACTING_LESSON_COPY_PL.slides.remember.rules.orderChip
        ),
        zeroChip: translateSubtractingLesson(
          translate,
          'slides.remember.rules.zeroChip',
          SUBTRACTING_LESSON_COPY_PL.slides.remember.rules.zeroChip
        ),
        checkChip: translateSubtractingLesson(
          translate,
          'slides.remember.rules.checkChip',
          SUBTRACTING_LESSON_COPY_PL.slides.remember.rules.checkChip
        ),
        breakChip: translateSubtractingLesson(
          translate,
          'slides.remember.rules.breakChip',
          SUBTRACTING_LESSON_COPY_PL.slides.remember.rules.breakChip
        ),
        stepBackTitle: translateSubtractingLesson(
          translate,
          'slides.remember.rules.stepBackTitle',
          SUBTRACTING_LESSON_COPY_PL.slides.remember.rules.stepBackTitle
        ),
        stepBackLead: translateSubtractingLesson(
          translate,
          'slides.remember.rules.stepBackLead',
          SUBTRACTING_LESSON_COPY_PL.slides.remember.rules.stepBackLead
        ),
        stepBackPath: translateSubtractingLesson(
          translate,
          'slides.remember.rules.stepBackPath',
          SUBTRACTING_LESSON_COPY_PL.slides.remember.rules.stepBackPath
        ),
        checkTitle: translateSubtractingLesson(
          translate,
          'slides.remember.rules.checkTitle',
          SUBTRACTING_LESSON_COPY_PL.slides.remember.rules.checkTitle
        ),
        checkLead: translateSubtractingLesson(
          translate,
          'slides.remember.rules.checkLead',
          SUBTRACTING_LESSON_COPY_PL.slides.remember.rules.checkLead
        ),
        checkEquation: translateSubtractingLesson(
          translate,
          'slides.remember.rules.checkEquation',
          SUBTRACTING_LESSON_COPY_PL.slides.remember.rules.checkEquation
        ),
        orderTitle: translateSubtractingLesson(
          translate,
          'slides.remember.rules.orderTitle',
          SUBTRACTING_LESSON_COPY_PL.slides.remember.rules.orderTitle
        ),
        orderLead: translateSubtractingLesson(
          translate,
          'slides.remember.rules.orderLead',
          SUBTRACTING_LESSON_COPY_PL.slides.remember.rules.orderLead
        ),
        motionTitle: translateSubtractingLesson(
          translate,
          'slides.remember.rules.motionTitle',
          SUBTRACTING_LESSON_COPY_PL.slides.remember.rules.motionTitle
        ),
        motionLead: translateSubtractingLesson(
          translate,
          'slides.remember.rules.motionLead',
          SUBTRACTING_LESSON_COPY_PL.slides.remember.rules.motionLead
        ),
        motionCaption: translateSubtractingLesson(
          translate,
          'slides.remember.rules.motionCaption',
          SUBTRACTING_LESSON_COPY_PL.slides.remember.rules.motionCaption
        ),
        pathTitle: translateSubtractingLesson(
          translate,
          'slides.remember.rules.pathTitle',
          SUBTRACTING_LESSON_COPY_PL.slides.remember.rules.pathTitle
        ),
        pathStep1Title: translateSubtractingLesson(
          translate,
          'slides.remember.rules.pathStep1Title',
          SUBTRACTING_LESSON_COPY_PL.slides.remember.rules.pathStep1Title
        ),
        pathStep1Text: translateSubtractingLesson(
          translate,
          'slides.remember.rules.pathStep1Text',
          SUBTRACTING_LESSON_COPY_PL.slides.remember.rules.pathStep1Text
        ),
        pathStep2Title: translateSubtractingLesson(
          translate,
          'slides.remember.rules.pathStep2Title',
          SUBTRACTING_LESSON_COPY_PL.slides.remember.rules.pathStep2Title
        ),
        pathStep2Text: translateSubtractingLesson(
          translate,
          'slides.remember.rules.pathStep2Text',
          SUBTRACTING_LESSON_COPY_PL.slides.remember.rules.pathStep2Text
        ),
        pathStep3Title: translateSubtractingLesson(
          translate,
          'slides.remember.rules.pathStep3Title',
          SUBTRACTING_LESSON_COPY_PL.slides.remember.rules.pathStep3Title
        ),
        pathStep3Text: translateSubtractingLesson(
          translate,
          'slides.remember.rules.pathStep3Text',
          SUBTRACTING_LESSON_COPY_PL.slides.remember.rules.pathStep3Text
        ),
        pathStep4Title: translateSubtractingLesson(
          translate,
          'slides.remember.rules.pathStep4Title',
          SUBTRACTING_LESSON_COPY_PL.slides.remember.rules.pathStep4Title
        ),
        pathStep4Text: translateSubtractingLesson(
          translate,
          'slides.remember.rules.pathStep4Text',
          SUBTRACTING_LESSON_COPY_PL.slides.remember.rules.pathStep4Text
        ),
      },
      backJumps: {
        title: translateSubtractingLesson(
          translate,
          'slides.remember.backJumps.title',
          SUBTRACTING_LESSON_COPY_PL.slides.remember.backJumps.title
        ),
        label: translateSubtractingLesson(
          translate,
          'slides.remember.backJumps.label',
          SUBTRACTING_LESSON_COPY_PL.slides.remember.backJumps.label
        ),
        lead: translateSubtractingLesson(
          translate,
          'slides.remember.backJumps.lead',
          SUBTRACTING_LESSON_COPY_PL.slides.remember.backJumps.lead
        ),
        caption: translateSubtractingLesson(
          translate,
          'slides.remember.backJumps.caption',
          SUBTRACTING_LESSON_COPY_PL.slides.remember.backJumps.caption
        ),
      },
      tenFrame: {
        title: translateSubtractingLesson(
          translate,
          'slides.remember.tenFrame.title',
          SUBTRACTING_LESSON_COPY_PL.slides.remember.tenFrame.title
        ),
        label: translateSubtractingLesson(
          translate,
          'slides.remember.tenFrame.label',
          SUBTRACTING_LESSON_COPY_PL.slides.remember.tenFrame.label
        ),
        lead: translateSubtractingLesson(
          translate,
          'slides.remember.tenFrame.lead',
          SUBTRACTING_LESSON_COPY_PL.slides.remember.tenFrame.lead
        ),
        caption: translateSubtractingLesson(
          translate,
          'slides.remember.tenFrame.caption',
          SUBTRACTING_LESSON_COPY_PL.slides.remember.tenFrame.caption
        ),
      },
      checkAddition: {
        title: translateSubtractingLesson(
          translate,
          'slides.remember.checkAddition.title',
          SUBTRACTING_LESSON_COPY_PL.slides.remember.checkAddition.title
        ),
        label: translateSubtractingLesson(
          translate,
          'slides.remember.checkAddition.label',
          SUBTRACTING_LESSON_COPY_PL.slides.remember.checkAddition.label
        ),
        lead: translateSubtractingLesson(
          translate,
          'slides.remember.checkAddition.lead',
          SUBTRACTING_LESSON_COPY_PL.slides.remember.checkAddition.lead
        ),
        caption: translateSubtractingLesson(
          translate,
          'slides.remember.checkAddition.caption',
          SUBTRACTING_LESSON_COPY_PL.slides.remember.checkAddition.caption
        ),
      },
      difference: {
        title: translateSubtractingLesson(
          translate,
          'slides.remember.difference.title',
          SUBTRACTING_LESSON_COPY_PL.slides.remember.difference.title
        ),
        label: translateSubtractingLesson(
          translate,
          'slides.remember.difference.label',
          SUBTRACTING_LESSON_COPY_PL.slides.remember.difference.label
        ),
        lead: translateSubtractingLesson(
          translate,
          'slides.remember.difference.lead',
          SUBTRACTING_LESSON_COPY_PL.slides.remember.difference.lead
        ),
        caption: translateSubtractingLesson(
          translate,
          'slides.remember.difference.caption',
          SUBTRACTING_LESSON_COPY_PL.slides.remember.difference.caption
        ),
      },
    },
  },
  game: {
    gameTitle: translateSubtractingLesson(
      translate,
      'game.gameTitle',
      SUBTRACTING_LESSON_COPY_PL.game.gameTitle ?? ''
    ),
  },
});

const buildSubtractingLessonSections = (copy: SubtractingLessonCopy) => [
  {
    id: 'podstawy',
    emoji: '➖',
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
    id: 'game',
    emoji: '🎮',
    title: copy.sections.game.title,
    description: copy.sections.game.description,
    isGame: true,
  },
];

export const SLIDES = buildSubtractingLessonSlides(SUBTRACTING_LESSON_COPY_PL);
export const HUB_SECTIONS = buildSubtractingLessonSections(SUBTRACTING_LESSON_COPY_PL);

export default function SubtractingLesson({ lessonTemplate }: LessonProps): React.JSX.Element {
  const translations = useTranslations('KangurStaticLessons.subtracting');
  const runtimeTemplate = useOptionalKangurLessonTemplate('subtracting');
  const resolvedTemplate = lessonTemplate ?? runtimeTemplate;
  const copy = useMemo(
    () => resolveSubtractingLessonContent(resolvedTemplate) ?? buildSubtractingLessonCopy(translations),
    [resolvedTemplate, translations],
  );
  const localizedSlides = useMemo(() => buildSubtractingLessonSlides(copy), [copy]);
  const localizedSections = useMemo(() => buildSubtractingLessonSections(copy), [copy]);

  return (
    <KangurUnifiedLesson
      progressMode='panel'
      lessonId='subtracting'
      lessonEmoji='➖'
      lessonTitle={resolvedTemplate?.title?.trim() || copy.lessonTitle || ''}
      sections={localizedSections}
      slides={localizedSlides}
      gradientClass='kangur-gradient-accent-rose'
      progressDotClassName='bg-red-200'
      dotActiveClass='bg-red-400'
      dotDoneClass='bg-red-200'
      skipMarkFor={['game']}
      games={[
        {
          sectionId: 'game',
          shell: {
            accent: 'rose',
            icon: '🎮',
            maxWidthClassName: 'max-w-none',
            headerTestId: 'subtracting-lesson-game-header',
            shellTestId: 'subtracting-lesson-game-shell',
            title: copy.game.gameTitle ?? 'Gra z odejmowaniem!',
          },
          launchableInstance: {
            gameId: 'subtracting_garden',
            instanceId: SUBTRACTING_GARDEN_INSTANCE_ID,
          },
        },
      ]}
    />
  );
}
