'use client';

import { useTranslations } from 'next-intl';
import { useMemo } from 'react';

import { getKangurBuiltInGameInstanceId } from '@/features/kangur/games';
import type { LessonSlide } from '@/features/kangur/ui/components/LessonSlideSection';
import {
  EnglishPossessiveAdjectiveAnimation,
  EnglishPossessivePronounAnimation,
  EnglishPronounSwapAnimation,
} from '@/features/kangur/ui/components/LessonAnimations';
import {
  KangurLessonCallout,
  KangurLessonCaption,
  KangurLessonChip,
  KangurLessonLead,
  KangurLessonStack,
  KangurLessonVisual,
} from '@/features/kangur/ui/design/lesson-primitives';
import { KangurEquationDisplay } from '@/features/kangur/ui/design/primitives';
import {
  KANGUR_START_ROW_SPACED_CLASSNAME,
  KANGUR_GRID_SPACED_CLASSNAME,
  KANGUR_GRID_TIGHT_CLASSNAME,
  KANGUR_WRAP_ROW_CLASSNAME,
} from '@/features/kangur/ui/design/tokens';
import { KangurUnifiedLesson } from '@/features/kangur/ui/lessons/lesson-components';
import type { KangurIntlTranslate } from '@/features/kangur/ui/types';

type SectionId =
  | 'subject_pronouns'
  | 'possessive_adjectives'
  | 'possessive_pronouns'
  | 'practice'
  | 'summary'
  | 'game_parts_of_speech'
  | 'game_pronouns_warmup';

type SlideSectionId = Exclude<SectionId, 'game_parts_of_speech' | 'game_pronouns_warmup'>;

const POSSESSIVE_ADJECTIVES = [
  { word: 'my', noun: 'solution' },
  { word: 'your', noun: 'calculator' },
  { word: 'his', noun: 'proof' },
  { word: 'her', noun: 'notes' },
  { word: 'its', noun: 'result' },
  { word: 'our', noun: 'answer' },
  { word: 'their', noun: 'graph' },
];

const POSSESSIVE_PRONOUNS = [
  { word: 'mine', example: 'The blue graph is mine.' },
  { word: 'yours', example: 'The red notebook is yours.' },
  { word: 'his', example: 'The quick solution is his.' },
  { word: 'hers', example: 'The proof is hers.' },
  { word: 'ours', example: 'The final answer is ours.' },
  { word: 'theirs', example: 'The project is theirs.' },
];
const ENGLISH_PRONOUNS_WARMUP_INSTANCE_ID = getKangurBuiltInGameInstanceId(
  'english_pronouns_warmup'
);
const ENGLISH_PARTS_OF_SPEECH_INSTANCE_ID = getKangurBuiltInGameInstanceId(
  'english_parts_of_speech_sort'
);

const buildEnglishPartsOfSpeechSlides = (
  translations: KangurIntlTranslate
): Record<SlideSectionId, LessonSlide[]> => {
  const subjectPronouns = [
    {
      pronoun: 'I',
      meaning: translations('slides.subjectPronouns.overview.items.i.meaning'),
      example: 'I solve the equation.',
    },
    {
      pronoun: 'you',
      meaning: translations('slides.subjectPronouns.overview.items.you.meaning'),
      example: 'You check the graph.',
    },
    {
      pronoun: 'he',
      meaning: translations('slides.subjectPronouns.overview.items.he.meaning'),
      example: 'He explains the steps.',
    },
    {
      pronoun: 'she',
      meaning: translations('slides.subjectPronouns.overview.items.she.meaning'),
      example: 'She verifies the result.',
    },
    {
      pronoun: 'it',
      meaning: translations('slides.subjectPronouns.overview.items.it.meaning'),
      example: 'It looks correct.',
    },
    {
      pronoun: 'we',
      meaning: translations('slides.subjectPronouns.overview.items.we.meaning'),
      example: 'We compare answers.',
    },
    {
      pronoun: 'they',
      meaning: translations('slides.subjectPronouns.overview.items.they.meaning'),
      example: 'They test the formula.',
    },
  ];

  return {
    subject_pronouns: [
      {
        title: translations('slides.subjectPronouns.overview.title'),
        content: (
          <KangurLessonStack align='start'>
            <KangurLessonLead align='left'>
              {translations('slides.subjectPronouns.overview.lead')}
            </KangurLessonLead>
            <KangurLessonCallout accent='sky' className='text-sm' padding='sm'>
              <div className={`${KANGUR_GRID_TIGHT_CLASSNAME} sm:grid-cols-2`}>
                {subjectPronouns.map((item) => (
                  <div
                    key={item.pronoun}
                    className='rounded-2xl border border-sky-100/80 bg-sky-50/80 px-3 py-2'
                  >
                    <p className='text-sm font-semibold text-sky-700'>
                      {item.pronoun} <span className='text-sky-500/80'>· {item.meaning}</span>
                    </p>
                    <p className='text-xs text-sky-700/80'>{item.example}</p>
                  </div>
                ))}
              </div>
            </KangurLessonCallout>
            <KangurLessonCaption align='left'>
              {translations('slides.subjectPronouns.overview.caption')}
            </KangurLessonCaption>
          </KangurLessonStack>
        ),
      },
      {
        title: translations('slides.subjectPronouns.heSheIt.title'),
        content: (
          <KangurLessonStack align='start'>
            <KangurLessonLead align='left'>
              {translations('slides.subjectPronouns.heSheIt.lead')}
            </KangurLessonLead>
            <KangurLessonVisual
              accent='sky'
              caption={translations('slides.subjectPronouns.heSheIt.caption')}
              captionClassName='mt-1'
              supportingContent={
                <div className={`${KANGUR_WRAP_ROW_CLASSNAME} text-xs font-semibold`}>
                  <KangurLessonChip accent='sky'>I solve</KangurLessonChip>
                  <KangurLessonChip accent='sky'>He solves</KangurLessonChip>
                  <KangurLessonChip accent='sky'>They solve</KangurLessonChip>
                </div>
              }
            >
              <EnglishPronounSwapAnimation />
              <KangurEquationDisplay accent='sky' className='mt-2' size='sm'>
                x + 4 = 10
              </KangurEquationDisplay>
            </KangurLessonVisual>
          </KangurLessonStack>
        ),
      },
    ],
    possessive_adjectives: [
      {
        title: translations('slides.possessiveAdjectives.overview.title'),
        content: (
          <KangurLessonStack align='start'>
            <KangurLessonLead align='left'>
              {translations('slides.possessiveAdjectives.overview.lead')}
            </KangurLessonLead>
            <KangurLessonVisual
              accent='indigo'
              caption={translations('slides.possessiveAdjectives.overview.caption')}
              supportingContent={
                <div className={`${KANGUR_GRID_TIGHT_CLASSNAME} sm:grid-cols-2 text-sm`}>
                  {POSSESSIVE_ADJECTIVES.map((item) => (
                    <div
                      key={item.word}
                      className='rounded-2xl border border-indigo-200/70 bg-white/75 px-3 py-2 text-left shadow-sm'
                    >
                      <p className='text-sm font-semibold text-indigo-700'>
                        {item.word} {item.noun}
                      </p>
                    </div>
                  ))}
                </div>
              }
            >
              <EnglishPossessiveAdjectiveAnimation />
            </KangurLessonVisual>
          </KangurLessonStack>
        ),
      },
      {
        title: translations('slides.possessiveAdjectives.classroomCommands.title'),
        content: (
          <KangurLessonStack align='start'>
            <KangurLessonLead align='left'>
              {translations('slides.possessiveAdjectives.classroomCommands.lead')}
            </KangurLessonLead>
            <KangurLessonCallout accent='slate' padding='sm'>
              <div className='space-y-2 text-sm text-slate-700'>
                <p className='font-semibold'>Check your work.</p>
                <p className='font-semibold'>Show your steps.</p>
                <p className='font-semibold'>Use our formula.</p>
                <p className='font-semibold'>Compare your answer with mine.</p>
              </div>
            </KangurLessonCallout>
          </KangurLessonStack>
        ),
      },
    ],
    possessive_pronouns: [
      {
        title: translations('slides.possessivePronouns.overview.title'),
        content: (
          <KangurLessonStack align='start'>
            <KangurLessonLead align='left'>
              {translations('slides.possessivePronouns.overview.lead')}
            </KangurLessonLead>
            <KangurLessonCallout accent='teal' padding='sm'>
              <div className={`${KANGUR_GRID_SPACED_CLASSNAME} text-sm`}>
                <div className='rounded-2xl border border-teal-100/80 bg-teal-50/70 px-3 py-2'>
                  <p className='text-xs uppercase tracking-wide text-teal-600'>
                    {translations('slides.possessivePronouns.overview.labels.withNoun')}
                  </p>
                  <p className='font-semibold text-teal-700'>This is my solution.</p>
                </div>
                <div className='rounded-2xl border border-teal-100/80 bg-white px-3 py-2'>
                  <p className='text-xs uppercase tracking-wide text-teal-600'>
                    {translations('slides.possessivePronouns.overview.labels.pronoun')}
                  </p>
                  <p className='font-semibold text-teal-700'>This solution is mine.</p>
                </div>
              </div>
            </KangurLessonCallout>
            <KangurLessonCaption align='left'>
              {translations('slides.possessivePronouns.overview.caption')}
            </KangurLessonCaption>
          </KangurLessonStack>
        ),
      },
      {
        title: translations('slides.possessivePronouns.compare.title'),
        content: (
          <KangurLessonStack align='start'>
            <KangurLessonLead align='left'>
              {translations('slides.possessivePronouns.compare.lead')}
            </KangurLessonLead>
            <KangurLessonVisual
              accent='teal'
              caption={translations('slides.possessivePronouns.compare.caption')}
              supportingContent={
                <div className='space-y-4'>
                  <div className={`${KANGUR_WRAP_ROW_CLASSNAME} text-xs font-semibold`}>
                    {POSSESSIVE_PRONOUNS.slice(0, 6).map((item) => (
                      <KangurLessonChip key={item.word} accent='teal'>
                        {item.word}
                      </KangurLessonChip>
                    ))}
                  </div>
                  <div className={`${KANGUR_GRID_TIGHT_CLASSNAME} text-xs text-slate-600`}>
                    {POSSESSIVE_PRONOUNS.slice(0, 3).map((item) => (
                      <span key={item.word}>{item.example}</span>
                    ))}
                  </div>
                </div>
              }
            >
              <EnglishPossessivePronounAnimation />
            </KangurLessonVisual>
          </KangurLessonStack>
        ),
      },
    ],
    practice: [
      {
        title: translations('slides.practice.warmup.title'),
        content: (
          <KangurLessonStack align='start'>
            <KangurLessonLead align='left'>
              {translations('slides.practice.warmup.lead')}
            </KangurLessonLead>
            <KangurLessonCallout accent='sky' padding='sm'>
              <div className='space-y-2 text-sm text-slate-700'>
                <p>1) ___ graph shows the quadratic function.</p>
                <p>2) The red calculator is ___.</p>
                <p>3) You solved it, but ___ solution is different.</p>
              </div>
              <KangurLessonCaption className='mt-3'>
                {translations('slides.practice.warmup.caption')}
              </KangurLessonCaption>
            </KangurLessonCallout>
          </KangurLessonStack>
        ),
      },
      {
        title: translations('slides.practice.dialogue.title'),
        content: (
          <KangurLessonStack align='start'>
            <KangurLessonLead align='left'>
              {translations('slides.practice.dialogue.lead')}
            </KangurLessonLead>
            <KangurLessonCallout accent='slate' padding='sm'>
              <div className='space-y-3 text-sm text-slate-700'>
                <div className={KANGUR_START_ROW_SPACED_CLASSNAME}>
                  <span className='text-xs font-semibold text-slate-500'>A</span>
                  <div>
                    <p className='font-semibold'>I solved the system. Is this your graph?</p>
                    <p className='text-xs text-slate-500'>
                      {translations('slides.practice.dialogue.aTranslation')}
                    </p>
                  </div>
                </div>
                <div className={KANGUR_START_ROW_SPACED_CLASSNAME}>
                  <span className='text-xs font-semibold text-slate-500'>B</span>
                  <div>
                    <p className='font-semibold'>Yes, it&apos;s mine. Your answer matches ours.</p>
                    <p className='text-xs text-slate-500'>
                      {translations('slides.practice.dialogue.bTranslation')}
                    </p>
                  </div>
                </div>
              </div>
            </KangurLessonCallout>
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
            <KangurLessonCallout accent='sky' padding='sm'>
              <ul className='space-y-2 text-sm text-slate-700'>
                <li>{translations('slides.summary.recap.items.subjectPronouns')}</li>
                <li>{translations('slides.summary.recap.items.possessiveAdjectives')}</li>
                <li>{translations('slides.summary.recap.items.possessivePronouns')}</li>
                <li>{translations('slides.summary.recap.items.examples')}</li>
              </ul>
            </KangurLessonCallout>
          </KangurLessonStack>
        ),
      },
    ],
  };
};

const PRONOUNS_SECTION_META: Array<{
  id: SectionId;
  emoji: string;
  key: string;
  isGame?: boolean;
}> = [
  { id: 'subject_pronouns', emoji: '🎯', key: 'subjectPronouns' },
  { id: 'possessive_adjectives', emoji: '🧮', key: 'possessiveAdjectives' },
  { id: 'possessive_pronouns', emoji: '📌', key: 'possessivePronouns' },
  { id: 'practice', emoji: '✅', key: 'practice' },
  { id: 'game_pronouns_warmup', emoji: '⚡', key: 'gamePronounsWarmup', isGame: true },
  { id: 'summary', emoji: '🧠', key: 'summary' },
  { id: 'game_parts_of_speech', emoji: '🎮', key: 'gamePartsOfSpeech', isGame: true },
];

export default function EnglishPartsOfSpeechLesson(): React.JSX.Element {
  const shellTranslations = useTranslations('KangurStaticLessons.englishPartsOfSpeechShell');
  const contentTranslations = useTranslations('KangurStaticLessons.englishPartsOfSpeech');
  const localizedSections = useMemo(
    () =>
      PRONOUNS_SECTION_META.map((section) => ({
        id: section.id,
        emoji: section.emoji,
        title: shellTranslations(`sections.${section.key}.title`),
        description: shellTranslations(`sections.${section.key}.description`),
        isGame: section.isGame,
      })),
    [shellTranslations]
  );
  const localizedSlides = useMemo(
    () => buildEnglishPartsOfSpeechSlides(contentTranslations),
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
      lessonId='english_parts_of_speech'
      lessonEmoji='📝'
      lessonTitle={shellTranslations('lessonTitle')}
      sections={localizedSections}
      slides={localizedSlides}
      gradientClass='kangur-gradient-accent-sky'
      progressDotClassName='bg-sky-300'
      dotActiveClass='bg-sky-500'
      dotDoneClass='bg-sky-300'
      completionSectionId='summary'
      autoRecordComplete
      scorePercent={120}
      skipMarkFor={['game_parts_of_speech', 'game_pronouns_warmup']}
      games={[
        {
          sectionId: 'game_pronouns_warmup',
          shell: {
            accent: 'sky',
            title: sectionTitles.game_pronouns_warmup,
            icon: '⚡',
            description: sectionDescriptions.game_pronouns_warmup,
            headerTestId: 'english-pronouns-warmup-game-header',
            shellTestId: 'english-pronouns-warmup-game-shell',
          },
          launchableInstance: {
            gameId: 'english_pronouns_warmup',
            instanceId: ENGLISH_PRONOUNS_WARMUP_INSTANCE_ID,
          },
        },
        {
          sectionId: 'game_parts_of_speech',
          shell: {
            accent: 'sky',
            title: sectionTitles.game_parts_of_speech,
            icon: '🎮',
            description: sectionDescriptions.game_parts_of_speech,
            headerTestId: 'english-parts-of-speech-game-header',
            shellTestId: 'english-parts-of-speech-game-shell',
          },
          launchableInstance: {
            gameId: 'english_parts_of_speech_sort',
            instanceId: ENGLISH_PARTS_OF_SPEECH_INSTANCE_ID,
          },
        },
      ]}
    />
  );
}
