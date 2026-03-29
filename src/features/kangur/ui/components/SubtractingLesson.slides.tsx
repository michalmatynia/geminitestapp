'use client';

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
import type { KangurSubtractingLessonTemplateContent } from '@/shared/contracts/kangur-lesson-templates';
import {
  SubtractingSvgAnimation,
  SubtractingNumberLineAnimation,
  SubtractingTenFrameAnimation,
  SubtractingDifferenceBarAnimation,
  SubtractingAbacusAnimation,
} from './animations/SubtractingAnimations';

export type SubtractingSlideSectionId = 'podstawy' | 'przekroczenie' | 'dwucyfrowe' | 'zapamietaj';

export const buildSubtractingLessonSlides = (
  copy: KangurSubtractingLessonTemplateContent
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
