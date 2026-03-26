'use client';

import { useTranslations } from 'next-intl';
import { useId, useMemo } from 'react';

import { getKangurLessonStageGameRuntimeSpec } from '@/features/kangur/games/lesson-stage-runtime-specs';
import type { LessonSlide } from '@/features/kangur/ui/components/LessonSlideSection';
import {
  EnglishAgreementBalanceAnimation,
  EnglishBeVerbSwitchAnimation,
  EnglishThirdPersonSAnimation,
} from '@/features/kangur/ui/components/LessonAnimations';
import {
  renderSoftAtmosphereGradients,
  renderSoftAtmosphereOvals,
} from '@/features/kangur/ui/components/animations/svgAtmosphere';
import {
  KangurLessonCallout,
  KangurLessonCaption,
  KangurLessonChip,
  KangurLessonInset,
  KangurLessonLead,
  KangurLessonStack,
  KangurLessonVisual,
} from '@/features/kangur/ui/design/lesson-primitives';
import { KangurIconBadge } from '@/features/kangur/ui/design/primitives';
import {
  KANGUR_GRID_SPACED_CLASSNAME,
  KANGUR_GRID_TIGHT_CLASSNAME,
  KANGUR_START_ROW_CLASSNAME,
  KANGUR_WRAP_ROW_CLASSNAME,
} from '@/features/kangur/ui/design/tokens';
import { KangurUnifiedLesson } from '@/features/kangur/ui/lessons/lesson-components';
import type { KangurIntlTranslate } from '@/features/kangur/ui/types';

type SectionId =
  | 'core'
  | 'third_person'
  | 'be_verbs'
  | 'tricky'
  | 'interruptions'
  | 'practice'
  | 'summary'
  | 'game_agreement';

type SlideSectionId = Exclude<SectionId, 'game_agreement'>;
const ENGLISH_SUBJECT_VERB_AGREEMENT_RUNTIME = getKangurLessonStageGameRuntimeSpec(
  'english_subject_verb_agreement_lesson_stage'
);

export function EnglishSubjectVerbGuideAnimation(): React.JSX.Element {
  const baseId = useId().replace(/:/g, '');
  const clipId = `english-agreement-subject-verb-link-${baseId}-clip`;
  const panelGradientId = `english-agreement-subject-verb-link-${baseId}-panel`;
  const frameGradientId = `english-agreement-subject-verb-link-${baseId}-frame`;
  const atmosphereId = `english-agreement-subject-verb-link-${baseId}-atmosphere-oval`;

  return (
    <svg
      aria-label='Diagram: the subject leads to the verb.'
      className='h-auto w-full'
      data-testid='english-agreement-subject-verb-link-animation'
      role='img'
      viewBox='0 0 420 90'
    >
      <defs>
        <clipPath id={clipId}>
          <rect x='8' y='8' width='404' height='74' rx='20' />
        </clipPath>
        <linearGradient
          id={panelGradientId}
          x1='16'
          x2='404'
          y1='12'
          y2='82'
          gradientUnits='userSpaceOnUse'
        >
          <stop offset='0%' stopColor='#f8fafc' />
          <stop offset='55%' stopColor='#ecfeff' />
          <stop offset='100%' stopColor='#eff6ff' />
        </linearGradient>
        <linearGradient
          id={frameGradientId}
          x1='16'
          x2='404'
          y1='16'
          y2='16'
          gradientUnits='userSpaceOnUse'
        >
          <stop offset='0%' stopColor='rgba(45,212,191,0.78)' />
          <stop offset='50%' stopColor='rgba(56,189,248,0.82)' />
          <stop offset='100%' stopColor='rgba(129,140,248,0.82)' />
        </linearGradient>
        {renderSoftAtmosphereGradients(atmosphereId, [
          { key: 'left', cx: 78, cy: 24, rx: 64, ry: 16, color: '#2dd4bf', opacity: 0.05, glowBias: '40%' },
          { key: 'bottom', cx: 324, cy: 66, rx: 88, ry: 22, color: '#38bdf8', opacity: 0.05, glowBias: '58%' },
          { key: 'top', cx: 314, cy: 22, rx: 58, ry: 14, color: '#818cf8', opacity: 0.04, glowBias: '38%' },
        ])}
      </defs>

      <g clipPath={`url(#${clipId})`} data-testid='english-agreement-subject-verb-link-atmosphere'>
        <rect
          x='8'
          y='8'
          width='404'
          height='74'
          rx='20'
          fill={`url(#${panelGradientId})`}
          stroke='rgba(148,163,184,0.16)'
          strokeWidth='2'
        />
        {renderSoftAtmosphereOvals(atmosphereId, [
          { key: 'left', cx: 78, cy: 24, rx: 64, ry: 16, color: '#2dd4bf', opacity: 0.05, glowBias: '40%' },
          { key: 'bottom', cx: 324, cy: 66, rx: 88, ry: 22, color: '#38bdf8', opacity: 0.05, glowBias: '58%' },
          { key: 'top', cx: 314, cy: 22, rx: 58, ry: 14, color: '#818cf8', opacity: 0.04, glowBias: '38%' },
        ])}

        <rect
          x='20'
          y='18'
          rx='14'
          width='150'
          height='54'
          fill='rgba(255,255,255,0.84)'
          stroke='#cbd5f5'
          strokeWidth='2'
        />
        <rect
          x='250'
          y='18'
          rx='14'
          width='150'
          height='54'
          fill='rgba(255,255,255,0.84)'
          stroke='#cbd5f5'
          strokeWidth='2'
        />
        <rect x='36' y='28' width='92' height='10' rx='5' fill='rgba(45,212,191,0.18)' />
        <rect x='268' y='28' width='78' height='10' rx='5' fill='rgba(56,189,248,0.18)' />
        <text
          x='45'
          y='52'
          fontSize='13'
          fontFamily='"Space Grotesk", "IBM Plex Sans", sans-serif'
          fill='#0f172a'
        >
          Subject
        </text>
        <text
          x='285'
          y='52'
          fontSize='13'
          fontFamily='"Space Grotesk", "IBM Plex Sans", sans-serif'
          fill='#0f172a'
        >
          Verb
        </text>
        <line x1='170' y1='45' x2='250' y2='45' stroke='#0d9488' strokeWidth='3' strokeLinecap='round' />
        <polygon points='250,45 242,40 242,50' fill='#0d9488' />
      </g>

      <rect
        x='16'
        y='16'
        width='388'
        height='58'
        rx='16'
        fill='none'
        stroke={`url(#${frameGradientId})`}
        strokeWidth='1.75'
        data-testid='english-agreement-subject-verb-link-frame'
      />
    </svg>
  );
}

const buildEnglishSubjectVerbAgreementSlides = (
  translations: KangurIntlTranslate
): Record<SlideSectionId, LessonSlide[]> => ({
  core: [
    {
      title: translations('slides.core.match.title'),
      content: (
        <KangurLessonStack align='start'>
          <KangurLessonLead align='left'>
            {translations('slides.core.match.lead')}
          </KangurLessonLead>
          <KangurLessonVisual
            accent='teal'
            caption={translations('slides.core.match.caption')}
            supportingContent={
              <div className={`${KANGUR_GRID_TIGHT_CLASSNAME} sm:grid-cols-2 text-sm w-full`}>
                <div className='rounded-2xl border border-teal-200/70 bg-white/75 px-3 py-2 text-left shadow-sm'>
                  <p className='text-xs uppercase tracking-wide text-teal-600'>
                    {translations('slides.core.match.labels.singular')}
                  </p>
                  <p className='font-semibold text-slate-900'>
                    The coach <span className='text-teal-700'>talks</span> before the match.
                  </p>
                  <p className='text-xs text-slate-500'>
                    {translations('slides.core.match.notes.singular')}
                  </p>
                </div>
                <div className='rounded-2xl border border-teal-200/70 bg-white/75 px-3 py-2 text-left shadow-sm'>
                  <p className='text-xs uppercase tracking-wide text-teal-600'>
                    {translations('slides.core.match.labels.plural')}
                  </p>
                  <p className='font-semibold text-slate-900'>
                    The coaches <span className='text-teal-700'>talk</span> before the match.
                  </p>
                  <p className='text-xs text-slate-500'>
                    {translations('slides.core.match.notes.plural')}
                  </p>
                </div>
              </div>
            }
          >
            <EnglishAgreementBalanceAnimation />
          </KangurLessonVisual>
        </KangurLessonStack>
      ),
    },
    {
      title: translations('slides.core.findSubject.title'),
      content: (
        <KangurLessonStack align='start'>
          <KangurLessonLead align='left'>
            {translations('slides.core.findSubject.lead')}
          </KangurLessonLead>
          <KangurLessonCallout accent='slate' padding='sm'>
            <div className={`${KANGUR_GRID_SPACED_CLASSNAME} sm:grid-cols-3 text-sm text-slate-700`}>
              {[
                translations('slides.core.findSubject.steps.crossOut'),
                translations('slides.core.findSubject.steps.askQuestion'),
                translations('slides.core.findSubject.steps.matchVerb'),
              ].map((item, index) => (
                <div key={item} className='flex gap-2'>
                  <KangurIconBadge accent='slate' size='sm'>
                    {index + 1}
                  </KangurIconBadge>
                  <span>{item}</span>
                </div>
              ))}
            </div>
            <div className='mt-4 rounded-2xl border border-slate-200 bg-white px-3 py-2'>
              <p className='text-sm text-slate-700'>
                The list of tasks <span className='font-semibold text-teal-700'>is</span> long.
              </p>
              <KangurLessonCaption className='mt-1' align='left'>
                {translations('slides.core.findSubject.exampleNote')}
              </KangurLessonCaption>
            </div>
            <div className='mt-4'>
              <EnglishSubjectVerbGuideAnimation />
            </div>
          </KangurLessonCallout>
        </KangurLessonStack>
      ),
    },
  ],
  third_person: [
    {
      title: translations('slides.thirdPerson.endings.title'),
      content: (
        <KangurLessonStack align='start'>
          <KangurLessonLead align='left'>
            {translations('slides.thirdPerson.endings.lead')}
          </KangurLessonLead>
          <KangurLessonVisual
            accent='teal'
            caption={translations('slides.thirdPerson.endings.caption')}
            supportingContent={
              <div className='space-y-4'>
                <div className={`${KANGUR_WRAP_ROW_CLASSNAME} text-xs font-semibold`}>
                  <KangurLessonChip accent='teal'>I play</KangurLessonChip>
                  <KangurLessonChip accent='teal'>She plays</KangurLessonChip>
                  <KangurLessonChip accent='teal'>They play</KangurLessonChip>
                </div>
                <div className='rounded-2xl border border-slate-200/70 bg-white/75 px-3 py-3 text-left text-sm shadow-sm'>
                  <p className='font-semibold text-slate-700'>
                    {translations('slides.thirdPerson.endings.ruleTitle')}
                  </p>
                  <div
                    className={`mt-2 ${KANGUR_GRID_TIGHT_CLASSNAME} sm:grid-cols-2 text-slate-600`}
                  >
                    <span>go → go<strong>es</strong></span>
                    <span>watch → watch<strong>es</strong></span>
                    <span>study → stud<strong>ies</strong></span>
                    <span>try → tr<strong>ies</strong></span>
                  </div>
                </div>
              </div>
            }
          >
            <EnglishThirdPersonSAnimation />
          </KangurLessonVisual>
        </KangurLessonStack>
      ),
    },
    {
      title: translations('slides.thirdPerson.auxiliaries.title'),
      content: (
        <KangurLessonStack align='start'>
          <KangurLessonLead align='left'>
            {translations('slides.thirdPerson.auxiliaries.lead')}
          </KangurLessonLead>
          <div className={`${KANGUR_GRID_TIGHT_CLASSNAME} sm:grid-cols-2 text-sm`}>
            <KangurLessonInset accent='teal' className='text-left'>
              <p className='text-xs uppercase tracking-wide text-teal-600'>
                {translations('slides.thirdPerson.auxiliaries.labels.thirdPerson')}
              </p>
              <p className='font-semibold text-slate-900'>Does she play?</p>
              <p className='font-semibold text-slate-900'>He doesn&apos;t play.</p>
              <p className='font-semibold text-slate-900'>She has a plan.</p>
            </KangurLessonInset>
            <KangurLessonInset accent='teal' className='text-left'>
              <p className='text-xs uppercase tracking-wide text-teal-600'>
                {translations('slides.thirdPerson.auxiliaries.labels.others')}
              </p>
              <p className='font-semibold text-slate-900'>Do they play?</p>
              <p className='font-semibold text-slate-900'>We don&apos;t play.</p>
              <p className='font-semibold text-slate-900'>They have a plan.</p>
            </KangurLessonInset>
          </div>
        </KangurLessonStack>
      ),
    },
  ],
  be_verbs: [
    {
      title: translations('slides.beVerbs.forms.title'),
      content: (
        <KangurLessonStack align='start'>
          <KangurLessonLead align='left'>
            {translations('slides.beVerbs.forms.lead')}
          </KangurLessonLead>
          <KangurLessonVisual
            accent='teal'
            caption={translations('slides.beVerbs.forms.caption')}
          >
            <EnglishBeVerbSwitchAnimation />
          </KangurLessonVisual>
        </KangurLessonStack>
      ),
    },
    {
      title: translations('slides.beVerbs.thereIs.title'),
      content: (
        <KangurLessonStack align='start'>
          <KangurLessonLead align='left'>
            {translations('slides.beVerbs.thereIs.lead')}
          </KangurLessonLead>
          <KangurLessonCallout accent='amber' className='text-sm' padding='sm'>
            <div className={`${KANGUR_GRID_TIGHT_CLASSNAME} sm:grid-cols-2`}>
              <KangurLessonInset accent='amber' className='text-left'>
                <p className='font-semibold'>There is a tournament tonight.</p>
                <KangurLessonCaption align='left'>
                  {translations('slides.beVerbs.thereIs.notes.singular')}
                </KangurLessonCaption>
              </KangurLessonInset>
              <KangurLessonInset accent='amber' className='text-left'>
                <p className='font-semibold'>There are two tournaments this week.</p>
                <KangurLessonCaption align='left'>
                  {translations('slides.beVerbs.thereIs.notes.plural')}
                </KangurLessonCaption>
              </KangurLessonInset>
            </div>
          </KangurLessonCallout>
        </KangurLessonStack>
      ),
    },
  ],
  tricky: [
    {
      title: translations('slides.tricky.everyone.title'),
      content: (
        <KangurLessonStack align='start'>
          <KangurLessonLead align='left'>
            {translations('slides.tricky.everyone.lead')}
          </KangurLessonLead>
          <KangurLessonCallout accent='rose' className='text-sm' padding='sm'>
            <div className='space-y-2 text-slate-700'>
              <div className={KANGUR_START_ROW_CLASSNAME}>
                <KangurIconBadge accent='rose' size='sm'>
                  !
                </KangurIconBadge>
                <div>
                  <p className='font-semibold'>Everyone in the class is ready.</p>
                  <p className='text-xs text-slate-500'>
                    {translations('slides.tricky.everyone.notes.everyone')}
                  </p>
                </div>
              </div>
              <div className={KANGUR_START_ROW_CLASSNAME}>
                <KangurIconBadge accent='rose' size='sm'>
                  !
                </KangurIconBadge>
                <div>
                  <p className='font-semibold'>Each of the players has a jersey.</p>
                  <p className='text-xs text-slate-500'>
                    {translations('slides.tricky.everyone.notes.each')}
                  </p>
                </div>
              </div>
            </div>
          </KangurLessonCallout>
        </KangurLessonStack>
      ),
    },
    {
      title: translations('slides.tricky.eitherOr.title'),
      content: (
        <KangurLessonStack align='start'>
          <KangurLessonLead align='left'>
            {translations('slides.tricky.eitherOr.lead')}
          </KangurLessonLead>
          <KangurLessonCallout accent='amber' className='text-sm' padding='sm'>
            <div className='space-y-2 text-slate-700'>
              <p className='font-semibold'>
                Either the coach or the players <span className='text-amber-700'>are</span> late.
              </p>
              <p className='font-semibold'>
                Neither the students nor the teacher <span className='text-amber-700'>is</span> ready.
              </p>
            </div>
            <div className={`mt-3 ${KANGUR_WRAP_ROW_CLASSNAME} text-xs font-semibold`}>
              <KangurLessonChip accent='amber'>
                {translations('slides.tricky.eitherOr.chip')}
              </KangurLessonChip>
            </div>
          </KangurLessonCallout>
        </KangurLessonStack>
      ),
    },
    {
      title: translations('slides.tricky.collective.title'),
      content: (
        <KangurLessonStack align='start'>
          <KangurLessonLead align='left'>
            {translations('slides.tricky.collective.lead')}
          </KangurLessonLead>
          <KangurLessonCallout accent='slate' className='text-sm' padding='sm'>
            <div className='space-y-2 text-slate-700'>
              <p className='font-semibold'>The team is winning.</p>
              <p className='font-semibold'>The class is focused today.</p>
            </div>
            <KangurLessonCaption className='mt-2' align='left'>
              {translations('slides.tricky.collective.caption')}
            </KangurLessonCaption>
          </KangurLessonCallout>
        </KangurLessonStack>
      ),
    },
  ],
  interruptions: [
    {
      title: translations('slides.interruptions.middle.title'),
      content: (
        <KangurLessonStack align='start'>
          <KangurLessonLead align='left'>
            {translations('slides.interruptions.middle.lead')}
          </KangurLessonLead>
          <KangurLessonCallout accent='slate' className='text-sm' padding='sm'>
            <div className='space-y-2 text-slate-700'>
              <p>
                The list <span className='text-slate-400'>of tasks</span>{' '}
                <span className='font-semibold text-teal-700'>is</span> long.
              </p>
              <p>
                The playlist <span className='text-slate-400'>of songs</span>{' '}
                <span className='font-semibold text-teal-700'>is</span> trending.
              </p>
              <p>
                The players <span className='text-slate-400'>on the bench</span>{' '}
                <span className='font-semibold text-teal-700'>are</span> ready.
              </p>
            </div>
            <div className={`mt-3 ${KANGUR_WRAP_ROW_CLASSNAME} text-xs font-semibold`}>
              <KangurLessonChip accent='slate'>
                {translations('slides.interruptions.middle.chip')}
              </KangurLessonChip>
            </div>
          </KangurLessonCallout>
        </KangurLessonStack>
      ),
    },
  ],
  practice: [
    {
      title: translations('slides.practice.quick.title'),
      content: (
        <KangurLessonStack align='start'>
          <KangurLessonLead align='left'>
            {translations('slides.practice.quick.lead')}
          </KangurLessonLead>
          <KangurLessonCallout accent='teal' className='text-sm' padding='sm'>
            <div className='space-y-2 text-slate-700'>
              <p>1) My friends ___ (play/plays) after school.</p>
              <p>2) Everyone in the club ___ (is/are) here.</p>
              <p>3) The coach ___ (give/gives) feedback.</p>
              <p>4) There ___ (is/are) two levels in this game.</p>
            </div>
            <KangurLessonCaption className='mt-3' align='left'>
              {translations('slides.practice.quick.answersCaption')}
            </KangurLessonCaption>
          </KangurLessonCallout>
        </KangurLessonStack>
      ),
    },
    {
      title: translations('slides.practice.fix.title'),
      content: (
        <KangurLessonStack align='start'>
          <KangurLessonLead align='left'>
            {translations('slides.practice.fix.lead')}
          </KangurLessonLead>
          <div className={`${KANGUR_GRID_TIGHT_CLASSNAME} sm:grid-cols-2 text-sm`}>
            {[
              {
                wrong: 'The list of players are long.',
                fixed: 'The list of players is long.',
              },
              {
                wrong: 'Neither my brother nor my friends is coming.',
                fixed: 'Neither my brother nor my friends are coming.',
              },
              {
                wrong: 'She go to practice on Fridays.',
                fixed: 'She goes to practice on Fridays.',
              },
              {
                wrong: 'There is two projects this month.',
                fixed: 'There are two projects this month.',
              },
            ].map((item) => (
              <KangurLessonInset key={item.wrong} accent='teal' className='text-left'>
                <p className='text-xs uppercase tracking-wide text-slate-500'>
                  {translations('slides.practice.fix.labels.before')}
                </p>
                <p className='font-semibold text-slate-700'>{item.wrong}</p>
                <p className='mt-2 text-xs uppercase tracking-wide text-slate-500'>
                  {translations('slides.practice.fix.labels.after')}
                </p>
                <p className='font-semibold text-teal-700'>{item.fixed}</p>
              </KangurLessonInset>
            ))}
          </div>
        </KangurLessonStack>
      ),
    },
  ],
  summary: [
    {
      title: translations('slides.summary.recap.title'),
      content: (
        <KangurLessonStack align='start'>
          <KangurLessonLead align='left'>
            {translations('slides.summary.recap.lead')}
          </KangurLessonLead>
          <KangurLessonCallout accent='teal' padding='sm'>
            <ul className='space-y-2 text-sm text-slate-700'>
              <li>{translations('slides.summary.recap.items.singular')}</li>
              <li>{translations('slides.summary.recap.items.plural')}</li>
              <li>{translations('slides.summary.recap.items.beForms')}</li>
              <li>{translations('slides.summary.recap.items.everyone')}</li>
              <li>{translations('slides.summary.recap.items.eitherOr')}</li>
            </ul>
          </KangurLessonCallout>
        </KangurLessonStack>
      ),
    },
  ],
});

const AGREEMENT_SECTION_META: Array<{
  id: SectionId;
  emoji: string;
  key: string;
  isGame?: boolean;
}> = [
  { id: 'core', emoji: '⚖️', key: 'core' },
  { id: 'third_person', emoji: '🎯', key: 'thirdPerson' },
  { id: 'be_verbs', emoji: '🔁', key: 'beVerbs' },
  { id: 'tricky', emoji: '⚠️', key: 'tricky' },
  { id: 'interruptions', emoji: '🧩', key: 'interruptions' },
  { id: 'practice', emoji: '✅', key: 'practice' },
  { id: 'game_agreement', emoji: '🎮', key: 'gameAgreement', isGame: true },
  { id: 'summary', emoji: '🧠', key: 'summary' },
];

export default function EnglishSubjectVerbAgreementLesson(): React.JSX.Element {
  const shellTranslations = useTranslations('KangurStaticLessons.englishSubjectVerbAgreementShell');
  const contentTranslations = useTranslations('KangurStaticLessons.englishSubjectVerbAgreement');
  const localizedSections = useMemo(
    () =>
      AGREEMENT_SECTION_META.map((section) => ({
        id: section.id,
        emoji: section.emoji,
        title: shellTranslations(`sections.${section.key}.title`),
        description: shellTranslations(`sections.${section.key}.description`),
        isGame: section.isGame,
      })),
    [shellTranslations]
  );
  const localizedSlides = useMemo(
    () => buildEnglishSubjectVerbAgreementSlides(contentTranslations),
    [contentTranslations]
  );
  const sectionTitles = useMemo(
    () =>
      Object.fromEntries(localizedSections.map((section) => [section.id, section.title])) as Record<
        SectionId,
        string
      >,
    [localizedSections]
  );
  const sectionDescriptions = useMemo(
    () =>
      Object.fromEntries(
        localizedSections.map((section) => [section.id, section.description ?? ''])
      ) as Record<SectionId, string>,
    [localizedSections]
  );

  return (
    <KangurUnifiedLesson
      progressMode='panel'
      lessonId='english_subject_verb_agreement'
      lessonEmoji='⚖️'
      lessonTitle={shellTranslations('lessonTitle')}
      sections={localizedSections}
      slides={localizedSlides}
      gradientClass='kangur-gradient-accent-teal'
      progressDotClassName='bg-teal-300'
      dotActiveClass='bg-teal-500'
      dotDoneClass='bg-teal-300'
      completionSectionId='summary'
      autoRecordComplete
      scorePercent={140}
      games={[
        {
          sectionId: 'game_agreement',
          stage: {
            accent: 'teal',
            title: sectionTitles.game_agreement,
            icon: '🎮',
            description: sectionDescriptions.game_agreement,
            headerTestId: 'english-agreement-game-header',
            shellTestId: 'english-agreement-game-shell',
          },
          runtime: ENGLISH_SUBJECT_VERB_AGREEMENT_RUNTIME,
        },
      ]}
    />
  );
}
