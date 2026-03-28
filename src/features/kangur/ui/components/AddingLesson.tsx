'use client';

import React, { useMemo } from 'react';
import { useTranslations } from 'next-intl';

import { getKangurBuiltInGameInstanceId } from '@/features/kangur/games';
import type { LessonProps } from '@/features/kangur/lessons/lesson-ui-registry';
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
import { useOptionalKangurLessonTemplate } from '@/features/kangur/ui/context/KangurLessonsRuntimeContext';
import { KangurUnifiedLesson } from '@/features/kangur/ui/lessons/lesson-components';
import {
  ADDING_LESSON_COMPONENT_CONTENT,
  resolveAddingLessonContent,
} from './adding-lesson-content';
import type { KangurAddingLessonTemplateContent } from '@/shared/contracts/kangur-lesson-templates';

type SectionId = 'podstawy' | 'przekroczenie' | 'dwucyfrowe' | 'zapamietaj' | 'synthesis' | 'game';
type AddingSlideSectionId = Exclude<SectionId, 'game' | 'synthesis'>;
type AddingLessonCopy = KangurAddingLessonTemplateContent;

const ADDING_BALL_INSTANCE_ID = getKangurBuiltInGameInstanceId('adding_ball');
const ADDING_SYNTHESIS_INSTANCE_ID = getKangurBuiltInGameInstanceId('adding_synthesis');

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

export const SLIDES = buildAddingLessonSlides(ADDING_LESSON_COMPONENT_CONTENT);
export const HUB_SECTIONS = buildAddingLessonSections(ADDING_LESSON_COMPONENT_CONTENT);

export default function AddingLesson({ lessonTemplate }: LessonProps): React.JSX.Element {
  const translations = useTranslations('KangurStaticLessons.adding');
  const runtimeTemplate = useOptionalKangurLessonTemplate('adding');
  const resolvedTemplate = lessonTemplate ?? runtimeTemplate;
  const copy = useMemo(
    () => resolveAddingLessonContent(resolvedTemplate, translations),
    [resolvedTemplate, translations],
  );
  const localizedSlides = useMemo(() => buildAddingLessonSlides(copy), [copy]);
  const localizedSections = useMemo(() => buildAddingLessonSections(copy), [copy]);

  return (
    <KangurUnifiedLesson
      progressMode='panel'
      lessonId='adding'
      lessonEmoji='➕'
      lessonTitle={resolvedTemplate?.title?.trim() || copy.lessonTitle}
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
          shell: {
            accent: 'amber',
            icon: '🎮',
            maxWidthClassName: 'max-w-2xl',
            headerTestId: 'adding-lesson-game-header',
            shellTestId: 'adding-lesson-game-shell',
            title: copy.game.gameTitle ?? copy.game.stageTitle ?? 'Gra z piłkami!',
          },
          launchableInstance: {
            gameId: 'adding_ball',
            instanceId: ADDING_BALL_INSTANCE_ID,
          },
        },
        {
          sectionId: 'synthesis',
          shell: {
            accent: 'amber',
            icon: '🎼',
            maxWidthClassName: 'max-w-[1120px]',
            shellClassName: '!p-4 sm:!p-6 lg:!p-8',
            headerTestId: 'adding-lesson-synthesis-header',
            shellTestId: 'adding-lesson-synthesis-shell',
            title: copy.synthesis.gameTitle ?? copy.synthesis.stageTitle ?? 'Synteza dodawania',
          },
          launchableInstance: {
            gameId: 'adding_synthesis',
            instanceId: ADDING_SYNTHESIS_INSTANCE_ID,
          },
        },
      ]}
    />
  );
}
