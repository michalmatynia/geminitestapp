'use client';

import React, { useMemo } from 'react';
import { useTranslations } from 'next-intl';

import type { LessonProps } from '@/features/kangur/lessons/lesson-ui-registry';
import type { LessonSlide } from '@/features/kangur/ui/components/LessonSlideSection';
import {
  KangurLessonCallout,
  KangurLessonCaption,
  KangurLessonChip,
  KangurLessonLead,
  KangurLessonInset,
  KangurLessonStack,
} from '@/features/kangur/ui/design/lesson-primitives';
import {
  KangurDisplayEmoji,
  KangurEquationDisplay,
  KangurIconBadge,
} from '@/features/kangur/ui/design/primitives';
import { KANGUR_START_ROW_CLASSNAME } from '@/features/kangur/ui/design/tokens';
import { getKangurBuiltInGameInstanceId } from '@/features/kangur/games';
import { useOptionalKangurLessonTemplate } from '@/features/kangur/ui/context/KangurLessonsRuntimeContext';
import { KangurUnifiedLesson } from '@/features/kangur/ui/lessons/lesson-components';
import {
  type LessonTranslate,
  translateLessonShellTitle,
} from './lesson-copy';
import {
  resolveSubtractingLessonContent,
  SUBTRACTING_LESSON_COMPONENT_CONTENT,
} from './subtracting-lesson-content';
import type { KangurSubtractingLessonTemplateContent } from '@/shared/contracts/kangur-lesson-templates';
import {
  SubtractingSvgAnimation,
  SubtractingNumberLineAnimation,
  SubtractingTenFrameAnimation,
  SubtractingDifferenceBarAnimation,
  SubtractingAbacusAnimation,
} from './animations/SubtractingAnimations';

type SectionId = 'podstawy' | 'przekroczenie' | 'dwucyfrowe' | 'zapamietaj' | 'game';
type SubtractingSlideSectionId = Exclude<SectionId, 'game'>;

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
    gameTitle: translateLessonShellTitle(
      translate,
      'game',
      SUBTRACTING_LESSON_COPY_PL.game.gameTitle
    ),
  },
});

const buildSubtractingLessonSlides = (
  copy: SubtractingLessonCopy
): Record<SubtractingSlideSectionId, LessonSlide[]> => ({
  podstawy: [
    {
      title: copy.slides.basics.meaning.title,
      content: (
        <KangurLessonStack>
          <KangurLessonLead>{copy.slides.basics.meaning.lead}</KangurLessonLead>
          <div className='flex items-center kangur-panel-gap'>
            <KangurDisplayEmoji size='md'>🍎🍎🍎🍎🍎</KangurDisplayEmoji>
            <KangurEquationDisplay
              accent='slate'
              as='span'
              className='[color:var(--kangur-page-muted-text)]'
              size='md'
            >
              −
            </KangurEquationDisplay>
            <KangurDisplayEmoji size='md'>🍎🍎</KangurDisplayEmoji>
            <KangurEquationDisplay
              accent='slate'
              as='span'
              className='[color:var(--kangur-page-muted-text)]'
              size='md'
            >
              =
            </KangurEquationDisplay>
            <KangurDisplayEmoji size='md'>🍎🍎🍎</KangurDisplayEmoji>
          </div>
          <KangurEquationDisplay accent='rose' size='sm'>
            5 − 2 = 3
          </KangurEquationDisplay>
        </KangurLessonStack>
      ),
    },
    {
      title: copy.slides.basics.singleDigit.title,
      content: (
        <KangurLessonStack>
          <KangurLessonLead>{copy.slides.basics.singleDigit.lead}</KangurLessonLead>
          <KangurLessonCallout accent='rose' className='text-center'>
            <KangurEquationDisplay
              accent='rose'
              data-testid='subtracting-lesson-single-digit-equation'
            >
              9 − 4 = ?
            </KangurEquationDisplay>
            <div className='mt-3 grid gap-2 text-left text-sm [color:var(--kangur-page-text)]'>
              <div className={KANGUR_START_ROW_CLASSNAME}>
                <KangurIconBadge accent='rose' size='sm'>
                  1
                </KangurIconBadge>
                <span>{copy.slides.basics.singleDigit.step1}</span>
              </div>
              <div className={KANGUR_START_ROW_CLASSNAME}>
                <KangurIconBadge accent='rose' size='sm'>
                  2
                </KangurIconBadge>
                <span>{copy.slides.basics.singleDigit.step2}</span>
              </div>
              <div className={KANGUR_START_ROW_CLASSNAME}>
                <KangurIconBadge accent='rose' size='sm'>
                  3
                </KangurIconBadge>
                <span>{copy.slides.basics.singleDigit.step3}</span>
              </div>
            </div>
          </KangurLessonCallout>
          <div className='flex gap-1 flex-wrap justify-center'>
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
              <KangurIconBadge key={n} accent='rose' size='sm'>
                {n}
              </KangurIconBadge>
            ))}
          </div>
        </KangurLessonStack>
      ),
    },
    {
      title: copy.slides.basics.motion.title,
      content: (
        <KangurLessonStack>
          <KangurLessonLead>{copy.slides.basics.motion.lead}</KangurLessonLead>
          <KangurLessonCallout accent='rose' className='max-w-md text-center'>
            <div className='mx-auto w-full max-w-sm'>
              <SubtractingSvgAnimation ariaLabel={copy.animations.subtractingSvg.ariaLabel} />
            </div>
            <KangurEquationDisplay accent='rose' className='mt-2' size='sm'>
              5 − 2 = 3
            </KangurEquationDisplay>
            <KangurLessonCaption className='mt-1'>
              {copy.slides.basics.motion.caption}
            </KangurLessonCaption>
          </KangurLessonCallout>
        </KangurLessonStack>
      ),
    },
  ],
  przekroczenie: [
    {
      title: copy.slides.crossTen.overTen.title,
      content: (
        <KangurLessonStack>
          <KangurLessonLead>{copy.slides.crossTen.overTen.lead}</KangurLessonLead>
          <KangurLessonCallout accent='rose' className='text-center'>
            <KangurEquationDisplay accent='rose'>13 − 5 = ?</KangurEquationDisplay>
            <KangurLessonCaption className='mt-2'>
              {copy.slides.crossTen.overTen.caption}
            </KangurLessonCaption>
          </KangurLessonCallout>
          <div className='grid w-full kangur-panel-gap sm:grid-cols-3'>
            <KangurLessonCallout accent='slate' className='text-sm' padding='sm'>
              <p className='text-xs font-semibold uppercase tracking-wide text-slate-600'>
                {copy.slides.crossTen.overTen.step1Title}
              </p>
              <p className='mt-1'>{copy.slides.crossTen.overTen.step1Text}</p>
            </KangurLessonCallout>
            <KangurLessonCallout accent='slate' className='text-sm' padding='sm'>
              <p className='text-xs font-semibold uppercase tracking-wide text-slate-600'>
                {copy.slides.crossTen.overTen.step2Title}
              </p>
              <p className='mt-1'>{copy.slides.crossTen.overTen.step2Text}</p>
            </KangurLessonCallout>
            <KangurLessonCallout accent='slate' className='text-sm' padding='sm'>
              <p className='text-xs font-semibold uppercase tracking-wide text-slate-600'>
                {copy.slides.crossTen.overTen.step3Title}
              </p>
              <p className='mt-1'>{copy.slides.crossTen.overTen.step3Text}</p>
            </KangurLessonCallout>
          </div>
        </KangurLessonStack>
      ),
    },
    {
      title: copy.slides.crossTen.numberLine.title,
      content: (
        <KangurLessonStack>
          <KangurLessonLead>{copy.slides.crossTen.numberLine.lead}</KangurLessonLead>
          <KangurLessonCallout accent='rose' className='text-center'>
            <div className='mx-auto w-full max-w-sm'>
              <SubtractingNumberLineAnimation ariaLabel={copy.animations.numberLine.ariaLabel} />
            </div>
            <KangurEquationDisplay accent='rose'>13 − 5 = 8</KangurEquationDisplay>
            <KangurLessonCaption className='mt-2'>
              {copy.slides.crossTen.numberLine.caption}
            </KangurLessonCaption>
          </KangurLessonCallout>
        </KangurLessonStack>
      ),
    },
    {
      title: copy.slides.crossTen.tenFrame.title,
      content: (
        <KangurLessonStack>
          <KangurLessonLead>{copy.slides.crossTen.tenFrame.lead}</KangurLessonLead>
          <KangurLessonCallout accent='rose' className='text-center'>
            <div className='mx-auto w-full max-w-sm'>
              <SubtractingTenFrameAnimation ariaLabel={copy.animations.tenFrame.ariaLabel} />
            </div>
            <KangurEquationDisplay accent='rose'>13 − 5 = 8</KangurEquationDisplay>
            <KangurLessonCaption className='mt-2'>
              {copy.slides.crossTen.tenFrame.caption}
            </KangurLessonCaption>
          </KangurLessonCallout>
        </KangurLessonStack>
      ),
    },
  ],
  dwucyfrowe: [
    {
      title: copy.slides.doubleDigit.intro.title,
      content: (
        <KangurLessonStack>
          <KangurLessonLead>{copy.slides.doubleDigit.intro.lead}</KangurLessonLead>
          <KangurLessonCallout accent='amber' className='max-w-xs text-center'>
            <KangurEquationDisplay accent='amber'>47 − 23 = ?</KangurEquationDisplay>
            <div className='mt-3 grid gap-2 text-left text-sm [color:var(--kangur-page-text)]'>
              <div className='flex items-center justify-between rounded-lg border border-amber-200/70 bg-amber-50/70 px-3 py-2'>
                <span className='text-xs font-semibold uppercase tracking-wide text-amber-700'>
                  {copy.slides.doubleDigit.intro.tensLabel}
                </span>
                <span className='font-semibold'>40 − 20 = 20</span>
              </div>
              <div className='flex items-center justify-between rounded-lg border border-amber-200/70 bg-amber-50/70 px-3 py-2'>
                <span className='text-xs font-semibold uppercase tracking-wide text-amber-700'>
                  {copy.slides.doubleDigit.intro.onesLabel}
                </span>
                <span className='font-semibold'>7 − 3 = 4</span>
              </div>
            </div>
            <KangurEquationDisplay accent='amber' className='mt-2' size='md'>
              20 + 4 = 24 ✓
            </KangurEquationDisplay>
          </KangurLessonCallout>
        </KangurLessonStack>
      ),
    },
    {
      title: copy.slides.doubleDigit.abacus.title,
      content: (
        <KangurLessonStack>
          <KangurLessonLead>{copy.slides.doubleDigit.abacus.lead}</KangurLessonLead>
          <KangurLessonCallout accent='amber' className='text-center'>
            <div className='mx-auto w-full max-w-sm'>
              <SubtractingAbacusAnimation
                ariaLabel={copy.animations.abacus.ariaLabel}
                tensLabel={copy.animations.abacus.tensLabel}
                onesLabel={copy.animations.abacus.onesLabel}
                startLabel={copy.animations.abacus.startLabel}
                subtractLabel={copy.animations.abacus.subtractLabel}
                resultLabel={copy.animations.abacus.resultLabel}
              />
            </div>
            <KangurLessonCaption className='mt-1'>
              {copy.slides.doubleDigit.abacus.caption}
            </KangurLessonCaption>
          </KangurLessonCallout>
        </KangurLessonStack>
      ),
    },
  ],
  zapamietaj: [
    {
      title: copy.slides.remember.rules.title,
      content: (
        <KangurLessonStack>
          <div className='flex flex-wrap justify-center gap-2 text-xs font-semibold'>
            <KangurLessonChip accent='rose'>{copy.slides.remember.rules.orderChip}</KangurLessonChip>
            <KangurLessonChip accent='sky'>{copy.slides.remember.rules.zeroChip}</KangurLessonChip>
            <KangurLessonChip accent='emerald'>{copy.slides.remember.rules.checkChip}</KangurLessonChip>
            <KangurLessonChip accent='amber'>{copy.slides.remember.rules.breakChip}</KangurLessonChip>
          </div>
          <div className='grid w-full kangur-panel-gap sm:grid-cols-2'>
            <KangurLessonCallout accent='rose' className='text-sm' padding='sm'>
              <p className='text-xs font-semibold uppercase tracking-wide text-rose-700'>
                {copy.slides.remember.rules.stepBackTitle}
              </p>
              <p className='mt-1'>{copy.slides.remember.rules.stepBackLead}</p>
              <p className='mt-2'>{copy.slides.remember.rules.stepBackPath}</p>
            </KangurLessonCallout>
            <KangurLessonCallout accent='emerald' className='text-sm' padding='sm'>
              <p className='text-xs font-semibold uppercase tracking-wide text-emerald-700'>
                {copy.slides.remember.rules.checkTitle}
              </p>
              <p className='mt-1'>{copy.slides.remember.rules.checkLead}</p>
              <p className='mt-2'>
                <b>{copy.slides.remember.rules.checkEquation}</b>
              </p>
            </KangurLessonCallout>
            <KangurLessonCallout accent='slate' className='text-sm' padding='sm'>
              <p className='text-xs font-semibold uppercase tracking-wide text-slate-600'>
                {copy.slides.remember.rules.orderTitle}
              </p>
              <p className='mt-1'>{copy.slides.remember.rules.orderLead}</p>
            </KangurLessonCallout>
          </div>
          <div className='grid w-full items-center kangur-panel-gap lg:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)]'>
            <KangurLessonInset accent='rose' className='text-center'>
              <div className='flex items-center justify-center gap-2 text-xs font-semibold uppercase tracking-wide text-rose-700'>
                <KangurIconBadge accent='rose' size='sm'>
                  &lt;-
                </KangurIconBadge>
                <span>{copy.slides.remember.rules.motionTitle}</span>
              </div>
              <p className='mt-2 text-xs font-semibold [color:var(--kangur-page-muted-text)]'>
                {copy.slides.remember.rules.motionLead}
              </p>
              <div className='mt-2'>
                <SubtractingSvgAnimation ariaLabel={copy.animations.subtractingSvg.ariaLabel} />
              </div>
              <KangurLessonCaption className='mt-2'>
                {copy.slides.remember.rules.motionCaption}
              </KangurLessonCaption>
            </KangurLessonInset>
            <div className='w-full max-w-md rounded-2xl border border-slate-200/70 bg-white px-4 py-3 text-left text-sm'>
              <p className='text-xs font-semibold uppercase tracking-wide text-slate-500'>
                {copy.slides.remember.rules.pathTitle}
              </p>
              <div className='mt-2 space-y-2 border-l-2 border-slate-200 pl-3'>
                <div>
                  <p className='font-semibold text-slate-700'>
                    {copy.slides.remember.rules.pathStep1Title}
                  </p>
                  <p className='text-xs text-slate-500'>
                    {copy.slides.remember.rules.pathStep1Text}
                  </p>
                </div>
                <div>
                  <p className='font-semibold text-slate-700'>
                    {copy.slides.remember.rules.pathStep2Title}
                  </p>
                  <p className='text-xs text-slate-500'>
                    {copy.slides.remember.rules.pathStep2Text}
                  </p>
                </div>
                <div>
                  <p className='font-semibold text-slate-700'>
                    {copy.slides.remember.rules.pathStep3Title}
                  </p>
                  <p className='text-xs text-slate-500'>
                    {copy.slides.remember.rules.pathStep3Text}
                  </p>
                </div>
                <div>
                  <p className='font-semibold text-slate-700'>
                    {copy.slides.remember.rules.pathStep4Title}
                  </p>
                  <p className='text-xs text-slate-500'>
                    {copy.slides.remember.rules.pathStep4Text}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </KangurLessonStack>
      ),
    },
    {
      title: copy.slides.remember.backJumps.title,
      content: (
        <KangurLessonStack>
          <KangurLessonInset accent='sky' className='text-center'>
            <div className='flex items-center justify-center gap-2 text-xs font-semibold uppercase tracking-wide text-sky-700'>
              <KangurIconBadge accent='sky' size='sm'>
                &lt;-
              </KangurIconBadge>
              <span>{copy.slides.remember.backJumps.label}</span>
            </div>
            <p className='mt-2 text-xs font-semibold [color:var(--kangur-page-muted-text)]'>
              {copy.slides.remember.backJumps.lead}
            </p>
            <div className='mt-2'>
              <SubtractingNumberLineAnimation ariaLabel={copy.animations.numberLine.ariaLabel} />
            </div>
            <KangurLessonCaption className='mt-2'>
              {copy.slides.remember.backJumps.caption}
            </KangurLessonCaption>
          </KangurLessonInset>
        </KangurLessonStack>
      ),
    },
    {
      title: copy.slides.remember.tenFrame.title,
      content: (
        <KangurLessonStack>
          <KangurLessonInset accent='amber' className='text-center'>
            <div className='flex items-center justify-center gap-2 text-xs font-semibold uppercase tracking-wide text-amber-700'>
              <KangurIconBadge accent='amber' size='sm'>
                10
              </KangurIconBadge>
              <span>{copy.slides.remember.tenFrame.label}</span>
            </div>
            <p className='mt-2 text-xs font-semibold [color:var(--kangur-page-muted-text)]'>
              {copy.slides.remember.tenFrame.lead}
            </p>
            <div className='mt-2'>
              <SubtractingTenFrameAnimation ariaLabel={copy.animations.tenFrame.ariaLabel} />
            </div>
            <KangurLessonCaption className='mt-2'>
              {copy.slides.remember.tenFrame.caption}
            </KangurLessonCaption>
          </KangurLessonInset>
        </KangurLessonStack>
      ),
    },
    {
      title: copy.slides.remember.checkAddition.title,
      content: (
        <KangurLessonStack>
          <KangurLessonInset accent='emerald' className='text-center'>
            <div className='flex items-center justify-center gap-2 text-xs font-semibold uppercase tracking-wide text-emerald-700'>
              <KangurIconBadge accent='emerald' size='sm'>
                OK
              </KangurIconBadge>
              <span>{copy.slides.remember.checkAddition.label}</span>
            </div>
            <p className='mt-2 text-xs font-semibold [color:var(--kangur-page-muted-text)]'>
              {copy.slides.remember.checkAddition.lead}
            </p>
            <div className='mt-3 grid gap-2'>
              <KangurEquationDisplay accent='emerald' size='sm'>
                8 − 5 = 3
              </KangurEquationDisplay>
              <KangurEquationDisplay accent='emerald' size='sm'>
                3 + 5 = 8
              </KangurEquationDisplay>
            </div>
            <KangurLessonCaption className='mt-2'>
              {copy.slides.remember.checkAddition.caption}
            </KangurLessonCaption>
          </KangurLessonInset>
        </KangurLessonStack>
      ),
    },
    {
      title: copy.slides.remember.difference.title,
      content: (
        <KangurLessonStack>
          <KangurLessonInset accent='teal' className='text-center'>
            <div className='flex items-center justify-center gap-2 text-xs font-semibold uppercase tracking-wide text-teal-700'>
              <KangurIconBadge accent='teal' size='sm'>
                =
              </KangurIconBadge>
              <span>{copy.slides.remember.difference.label}</span>
            </div>
            <p className='mt-2 text-xs font-semibold [color:var(--kangur-page-muted-text)]'>
              {copy.slides.remember.difference.lead}
            </p>
            <div className='mt-2'>
              <SubtractingDifferenceBarAnimation
                ariaLabel={copy.animations.differenceBar.ariaLabel}
                differenceLabel={copy.animations.differenceBar.differenceLabel}
              />
            </div>
            <KangurEquationDisplay accent='teal' className='mt-2' size='sm'>
              12 - 7 = 5
            </KangurEquationDisplay>
            <KangurLessonCaption className='mt-1'>
              {copy.slides.remember.difference.caption}
            </KangurLessonCaption>
          </KangurLessonInset>
        </KangurLessonStack>
      ),
    },
  ],
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
      lessonTitle={resolvedTemplate?.title?.trim() || copy.lessonTitle}
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
