'use client';

import { useTranslations } from 'next-intl';
import { useMemo } from 'react';

import EnglishAdverbsFrequencyRoutineGame from '@/features/kangur/ui/components/EnglishAdverbsFrequencyRoutineGame';
import type { LessonSlide } from '@/features/kangur/ui/components/LessonSlideSection';
import {
  EnglishAdverbFrequencyScaleAnimation,
  EnglishAdverbHabitCardAnimation,
  EnglishAdverbPlaceRoutineAnimation,
  EnglishAdverbSentenceRepairAnimation,
  EnglishAdverbRoutineAnimation,
  EnglishAdverbWordOrderAnimation,
} from '@/features/kangur/ui/components/LessonAnimations';
import {
  KangurLessonCallout,
  KangurLessonCaption,
  KangurLessonChip,
  KangurLessonInset,
  KangurLessonLead,
  KangurLessonStack,
  KangurLessonVisual,
} from '@/features/kangur/ui/design/lesson-primitives';
import {
  KANGUR_GRID_TIGHT_CLASSNAME,
  KANGUR_WRAP_ROW_CLASSNAME,
} from '@/features/kangur/ui/design/tokens';
import { KangurUnifiedLesson } from '@/features/kangur/ui/lessons/lesson-components';
import type { KangurIntlTranslate } from '@/features/kangur/ui/types';

const LESSON_KEY = 'english_adverbs_frequency';

type SectionId =
  | 'intro'
  | 'routine'
  | 'position'
  | 'answer'
  | 'game_frequency_studio'
  | 'summary';

type SlideSectionId = Exclude<SectionId, 'game_frequency_studio'>;

const buildEnglishAdverbsFrequencySlides = (
  translations: KangurIntlTranslate
): Record<SlideSectionId, LessonSlide[]> => ({
  intro: [
    {
      title: translations('slides.intro.overview.title'),
      content: (
        <KangurLessonStack align='start'>
          <KangurLessonLead align='left'>
            {translations('slides.intro.overview.lead')}
          </KangurLessonLead>
          <KangurLessonVisual
            accent='sky'
            caption={translations('slides.intro.overview.caption')}
            supportingContent={
              <div>
                <div className={`${KANGUR_WRAP_ROW_CLASSNAME} text-xs font-semibold`}>
                  {['always', 'usually', 'sometimes', 'never'].map((word) => (
                    <KangurLessonChip key={word} accent='sky'>
                      {word}
                    </KangurLessonChip>
                  ))}
                </div>
              </div>
            }
          >
            <EnglishAdverbFrequencyScaleAnimation />
          </KangurLessonVisual>
        </KangurLessonStack>
      ),
    },
  ],
  routine: [
    {
      title: translations('slides.routine.cinemaStory.title'),
      content: (
        <KangurLessonStack align='start'>
          <KangurLessonLead align='left'>
            {translations('slides.routine.cinemaStory.lead')}
          </KangurLessonLead>
          <KangurLessonVisual
            accent='amber'
            caption={translations('slides.routine.cinemaStory.caption')}
            supportingContent={
              <div className='space-y-2 text-sm text-slate-700'>
                <p>I always go to the cinema on Sunday.</p>
                <p>I usually go with my friends.</p>
                <p>I never eat popcorn there.</p>
              </div>
            }
          >
            <EnglishAdverbRoutineAnimation />
          </KangurLessonVisual>
        </KangurLessonStack>
      ),
    },
    {
      title: translations('slides.routine.frequencyStrip.title'),
      content: (
        <KangurLessonStack align='start'>
          <KangurLessonLead align='left'>
            {translations('slides.routine.frequencyStrip.lead')}
          </KangurLessonLead>
          <div className={`${KANGUR_GRID_TIGHT_CLASSNAME} text-sm`}>
            {[
              translations('slides.routine.frequencyStrip.items.always'),
              translations('slides.routine.frequencyStrip.items.usually'),
              translations('slides.routine.frequencyStrip.items.sometimes'),
              translations('slides.routine.frequencyStrip.items.never'),
            ].map((text) => (
              <KangurLessonInset key={text} accent='sky' className='text-left'>
                <p className='font-semibold text-sky-700'>{text}</p>
              </KangurLessonInset>
            ))}
          </div>
        </KangurLessonStack>
      ),
    },
  ],
  position: [
    {
      title: translations('slides.position.mainVerb.title'),
      content: (
        <KangurLessonStack align='start'>
          <KangurLessonLead align='left'>
            {translations('slides.position.mainVerb.lead')}
          </KangurLessonLead>
          <KangurLessonVisual
            accent='violet'
            caption={translations('slides.position.mainVerb.caption')}
            supportingContent={
              <div>
                <ul className='space-y-2 text-sm'>
                  {[
                    'I always do my homework.',
                    'She usually gets up at seven.',
                    'We sometimes watch TV after dinner.',
                  ].map((text) => (
                    <li key={text} className='font-semibold text-violet-700'>
                      {text}
                    </li>
                  ))}
                </ul>
              </div>
            }
          >
            <EnglishAdverbWordOrderAnimation mode='mainVerb' />
          </KangurLessonVisual>
        </KangurLessonStack>
      ),
    },
    {
      title: translations('slides.position.beVerb.title'),
      content: (
        <KangurLessonStack align='start'>
          <KangurLessonLead align='left'>
            {translations('slides.position.beVerb.lead')}
          </KangurLessonLead>
          <KangurLessonVisual
            accent='violet'
            caption={translations('slides.position.beVerb.caption')}
            supportingContent={
              <div>
                <ul className='space-y-2 text-sm'>
                  {['I am never late.', 'She is usually ready.', 'They are sometimes noisy.'].map(
                    (text) => (
                      <li key={text} className='font-semibold text-violet-700'>
                        {text}
                      </li>
                    )
                  )}
                </ul>
              </div>
            }
          >
            <EnglishAdverbWordOrderAnimation mode='beVerb' />
          </KangurLessonVisual>
        </KangurLessonStack>
      ),
    },
    {
      title: translations('slides.position.repairOrder.title'),
      content: (
        <KangurLessonStack align='start'>
          <KangurLessonLead align='left'>
            {translations('slides.position.repairOrder.lead')}
          </KangurLessonLead>
          <KangurLessonVisual
            accent='rose'
            caption={translations('slides.position.repairOrder.caption')}
            supportingContent={
              <div>
                <ul className='space-y-2 text-sm'>
                  {(
                    [
                      'I always do my homework.',
                      'She usually gets up at seven.',
                      'He is never late.',
                    ] as const
                  ).map((text) => (
                    <li key={text} className='font-semibold text-rose-700'>
                      {text}
                    </li>
                  ))}
                </ul>
              </div>
            }
          >
            <EnglishAdverbSentenceRepairAnimation />
          </KangurLessonVisual>
        </KangurLessonStack>
      ),
    },
  ],
  answer: [
    {
      title: translations('slides.answer.howOften.title'),
      content: (
        <KangurLessonStack align='start'>
          <KangurLessonLead align='left'>
            {translations('slides.answer.howOften.lead')}
          </KangurLessonLead>
          <KangurLessonCallout accent='emerald' padding='sm'>
            <div className='space-y-2 text-sm text-slate-700'>
              <p>How often do you go to the park?</p>
              <p>I sometimes go to the park after school.</p>
              <p>How often is he late?</p>
              <p>He is never late for school.</p>
            </div>
          </KangurLessonCallout>
          <KangurLessonCaption>{translations('slides.answer.howOften.caption')}</KangurLessonCaption>
        </KangurLessonStack>
      ),
    },
    {
      title: translations('slides.answer.chooseWord.title'),
      content: (
        <KangurLessonStack align='start'>
          <KangurLessonLead align='left'>
            {translations('slides.answer.chooseWord.lead')}
          </KangurLessonLead>
          <div className={`${KANGUR_GRID_TIGHT_CLASSNAME} text-sm`}>
            {(
              [
                'homework',
                'seven',
                'late',
                'tv',
              ] as const
            ).map((itemKey) => (
              <KangurLessonInset key={itemKey} accent='emerald' className='text-left'>
                <p className='font-semibold text-emerald-700'>
                  {translations(`slides.answer.chooseWord.items.${itemKey}.clue`)}
                </p>
                <p className='mt-1 text-slate-600'>
                  {translations(`slides.answer.chooseWord.items.${itemKey}.answer`)}
                </p>
              </KangurLessonInset>
            ))}
          </div>
        </KangurLessonStack>
      ),
    },
    {
      title: translations('slides.answer.wordBank.title'),
      content: (
        <KangurLessonStack align='start'>
          <KangurLessonLead align='left'>
            {translations('slides.answer.wordBank.lead')}
          </KangurLessonLead>
          <div className={`${KANGUR_WRAP_ROW_CLASSNAME} text-xs font-semibold`}>
            {['always', 'usually', 'sometimes', 'never'].map((word) => (
              <KangurLessonChip key={word} accent='emerald'>
                {word}
              </KangurLessonChip>
            ))}
          </div>
        </KangurLessonStack>
      ),
    },
    {
      title: translations('slides.answer.myWeek.title'),
      content: (
        <KangurLessonStack align='start'>
          <KangurLessonLead align='left'>
            {translations('slides.answer.myWeek.lead')}
          </KangurLessonLead>
          <KangurLessonVisual
            accent='emerald'
            caption={translations('slides.answer.myWeek.caption')}
            supportingContent={
              <div>
                <ul className='space-y-2 text-sm'>
                  {[
                    'I always do my homework.',
                    'I sometimes go to the park.',
                    'I never arrive late.',
                  ].map((text) => (
                    <li key={text} className='font-semibold text-emerald-700'>
                      {text}
                    </li>
                  ))}
                </ul>
              </div>
            }
          >
            <EnglishAdverbHabitCardAnimation />
          </KangurLessonVisual>
        </KangurLessonStack>
      ),
    },
    {
      title: translations('slides.answer.favoritePlace.title'),
      content: (
        <KangurLessonStack align='start'>
          <KangurLessonLead align='left'>
            {translations('slides.answer.favoritePlace.lead')}
          </KangurLessonLead>
          <KangurLessonVisual
            accent='sky'
            caption={translations('slides.answer.favoritePlace.caption')}
            supportingContent={
              <div>
                <ul className='space-y-2 text-sm'>
                  {[
                    'I usually go to the library.',
                    'I sometimes go to the park.',
                    'I never go to the swimming pool on school days.',
                  ].map((text) => (
                    <li key={text} className='font-semibold text-sky-700'>
                      {text}
                    </li>
                  ))}
                </ul>
              </div>
            }
          >
            <EnglishAdverbPlaceRoutineAnimation />
          </KangurLessonVisual>
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
              <li>{translations('slides.summary.recap.items.meaning')}</li>
              <li>{translations('slides.summary.recap.items.mainVerb')}</li>
              <li>{translations('slides.summary.recap.items.beVerb')}</li>
              <li>{translations('slides.summary.recap.items.answer')}</li>
            </ul>
          </KangurLessonCallout>
        </KangurLessonStack>
      ),
    },
  ],
});

const ADVERBS_FREQUENCY_SECTION_META: Array<{
  id: SectionId;
  emoji: string;
  key: string;
  isGame?: boolean;
}> = [
  { id: 'intro', emoji: '🔁', key: 'intro' },
  { id: 'routine', emoji: '📆', key: 'routine' },
  { id: 'position', emoji: '↔️', key: 'position' },
  { id: 'answer', emoji: '💬', key: 'answer' },
  { id: 'game_frequency_studio', emoji: '🗓️', key: 'gameFrequencyStudio', isGame: true },
  { id: 'summary', emoji: '🧠', key: 'summary' },
];

export default function EnglishAdverbsFrequencyLesson(): React.JSX.Element {
  const shellTranslations = useTranslations('KangurStaticLessons.englishAdverbsFrequencyShell');
  const contentTranslations = useTranslations('KangurStaticLessons.englishAdverbsFrequency');

  const localizedSections = useMemo(
    () =>
      ADVERBS_FREQUENCY_SECTION_META.map((section) => ({
        id: section.id,
        emoji: section.emoji,
        title: shellTranslations(`sections.${section.key}.title`),
        description: shellTranslations(`sections.${section.key}.description`),
        isGame: section.isGame,
      })),
    [shellTranslations]
  );

  const localizedSlides = useMemo(
    () => buildEnglishAdverbsFrequencySlides(contentTranslations),
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
      lessonId={LESSON_KEY}
      lessonEmoji='🔁'
      lessonTitle={shellTranslations('lessonTitle')}
      sections={localizedSections}
      slides={localizedSlides}
      gradientClass='kangur-gradient-accent-cyan'
      progressDotClassName='bg-sky-300'
      dotActiveClass='bg-sky-500'
      dotDoneClass='bg-sky-300'
      completionSectionId='summary'
      autoRecordComplete
      scorePercent={120}
      skipMarkFor={['game_frequency_studio']}
      games={[
        {
          sectionId: 'game_frequency_studio',
          stage: {
            accent: 'sky',
            title: sectionTitles.game_frequency_studio,
            icon: '🗓️',
            description: sectionDescriptions.game_frequency_studio,
            maxWidthClassName: 'max-w-4xl',
            shellTestId: 'english-adverbs-frequency-game-shell',
          },
          render: ({ onFinish }) => <EnglishAdverbsFrequencyRoutineGame onFinish={onFinish} />,
        },
      ]}
    />
  );
}
