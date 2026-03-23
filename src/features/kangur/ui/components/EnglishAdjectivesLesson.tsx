'use client';

import { useTranslations } from 'next-intl';
import { useMemo } from 'react';

import EnglishAdjectivesSceneGame from '@/features/kangur/ui/components/EnglishAdjectivesSceneGame';
import type { LessonSlide } from '@/features/kangur/ui/components/LessonSlideSection';
import {
  EnglishAdjectiveOrderAnimation,
  EnglishAdjectiveRepairAnimation,
  EnglishAdjectiveRoomAnimation,
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

const LESSON_KEY = 'english_adjectives';

type SectionId =
  | 'intro'
  | 'order'
  | 'repair'
  | 'describe'
  | 'game_adjective_studio'
  | 'summary';

type SlideSectionId = Exclude<SectionId, 'game_adjective_studio'>;

const buildEnglishAdjectivesSlides = (
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
            accent='indigo'
            caption={translations('slides.intro.overview.caption')}
          >
            <EnglishAdjectiveRoomAnimation />
          </KangurLessonVisual>
          <div className={`${KANGUR_WRAP_ROW_CLASSNAME} text-xs font-semibold`}>
            <KangurLessonChip accent='indigo'>big and pink bedroom</KangurLessonChip>
            <KangurLessonChip accent='indigo'>soft rug</KangurLessonChip>
            <KangurLessonChip accent='indigo'>long blue curtains</KangurLessonChip>
          </div>
        </KangurLessonStack>
      ),
    },
  ],
  order: [
    {
      title: translations('slides.order.beforeNoun.title'),
      content: (
        <KangurLessonStack align='start'>
          <KangurLessonLead align='left'>
            {translations('slides.order.beforeNoun.lead')}
          </KangurLessonLead>
          <KangurLessonVisual
            accent='indigo'
            caption={translations('slides.order.beforeNoun.caption')}
          >
            <EnglishAdjectiveOrderAnimation />
          </KangurLessonVisual>
          <div className={`${KANGUR_GRID_TIGHT_CLASSNAME} sm:grid-cols-2 text-sm`}>
            {[
              'red train',
              'brown eyes',
              'small blue teddy',
              'big yellow cupboard',
            ].map((text) => (
              <KangurLessonInset key={text} accent='indigo' className='text-left'>
                <p className='font-semibold text-indigo-700'>{text}</p>
              </KangurLessonInset>
            ))}
          </div>
        </KangurLessonStack>
      ),
    },
  ],
  repair: [
    {
      title: translations('slides.repair.makeItRight.title'),
      content: (
        <KangurLessonStack align='start'>
          <KangurLessonLead align='left'>
            {translations('slides.repair.makeItRight.lead')}
          </KangurLessonLead>
          <KangurLessonVisual
            accent='rose'
            caption={translations('slides.repair.makeItRight.caption')}
          >
            <EnglishAdjectiveRepairAnimation />
          </KangurLessonVisual>
          <div className={`${KANGUR_GRID_TIGHT_CLASSNAME} text-sm`}>
            {[
              'talls → tall',
              'two reds shoes → two red shoes',
              'brown, long hair → long, brown hair',
              'a car small → a small car',
            ].map((text) => (
              <KangurLessonInset key={text} accent='rose' className='text-left'>
                <p className='font-semibold text-rose-700'>{text}</p>
              </KangurLessonInset>
            ))}
          </div>
        </KangurLessonStack>
      ),
    },
  ],
  describe: [
    {
      title: translations('slides.describe.roomStory.title'),
      content: (
        <KangurLessonStack align='start'>
          <KangurLessonLead align='left'>
            {translations('slides.describe.roomStory.lead')}
          </KangurLessonLead>
          <KangurLessonCallout accent='indigo' padding='sm'>
            <div className='space-y-2 text-sm text-slate-700'>
              <p>My bedroom is big and pink.</p>
              <p>I&apos;ve got a big, yellow cupboard for my clothes.</p>
              <p>There&apos;s a soft rug on the floor.</p>
              <p>There are long, blue curtains on the window.</p>
            </div>
            <KangurLessonCaption className='mt-3'>
              {translations('slides.describe.roomStory.caption')}
            </KangurLessonCaption>
          </KangurLessonCallout>
        </KangurLessonStack>
      ),
    },
    {
      title: translations('slides.describe.wordBank.title'),
      content: (
        <KangurLessonStack align='start'>
          <KangurLessonLead align='left'>
            {translations('slides.describe.wordBank.lead')}
          </KangurLessonLead>
          <div className={`${KANGUR_WRAP_ROW_CLASSNAME} text-xs font-semibold`}>
            {[
              'big',
              'small',
              'soft',
              'long',
              'blue',
              'yellow',
              'red',
              'brown',
              'beautiful',
              'new',
            ].map((word) => (
              <KangurLessonChip key={word} accent='indigo'>
                {word}
              </KangurLessonChip>
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
          <KangurLessonCallout accent='indigo' padding='sm'>
            <ul className='space-y-2 text-sm text-slate-700'>
              <li>{translations('slides.summary.recap.items.describe')}</li>
              <li>{translations('slides.summary.recap.items.beforeNoun')}</li>
              <li>{translations('slides.summary.recap.items.order')}</li>
              <li>{translations('slides.summary.recap.items.fix')}</li>
            </ul>
          </KangurLessonCallout>
        </KangurLessonStack>
      ),
    },
  ],
});

const ADJECTIVES_SECTION_META: Array<{
  id: SectionId;
  emoji: string;
  key: string;
  isGame?: boolean;
}> = [
  { id: 'intro', emoji: '🖼️', key: 'intro' },
  { id: 'order', emoji: '↔️', key: 'order' },
  { id: 'repair', emoji: '🩹', key: 'repair' },
  { id: 'describe', emoji: '✍️', key: 'describe' },
  { id: 'game_adjective_studio', emoji: '🎨', key: 'gameAdjectiveStudio', isGame: true },
  { id: 'summary', emoji: '🧠', key: 'summary' },
];

export default function EnglishAdjectivesLesson(): React.JSX.Element {
  const shellTranslations = useTranslations('KangurStaticLessons.englishAdjectivesShell');
  const contentTranslations = useTranslations('KangurStaticLessons.englishAdjectives');

  const localizedSections = useMemo(
    () =>
      ADJECTIVES_SECTION_META.map((section) => ({
        id: section.id,
        emoji: section.emoji,
        title: shellTranslations(`sections.${section.key}.title`),
        description: shellTranslations(`sections.${section.key}.description`),
        isGame: section.isGame,
      })),
    [shellTranslations]
  );

  const localizedSlides = useMemo(
    () => buildEnglishAdjectivesSlides(contentTranslations),
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
      lessonEmoji='🎨'
      lessonTitle={shellTranslations('lessonTitle')}
      sections={localizedSections}
      slides={localizedSlides}
      gradientClass='kangur-gradient-accent-indigo'
      progressDotClassName='bg-indigo-300'
      dotActiveClass='bg-indigo-500'
      dotDoneClass='bg-indigo-300'
      completionSectionId='summary'
      autoRecordComplete
      scorePercent={120}
      skipMarkFor={['game_adjective_studio']}
      games={[
        {
          sectionId: 'game_adjective_studio',
          stage: {
            accent: 'indigo',
            title: sectionTitles.game_adjective_studio,
            icon: '🎨',
            description: sectionDescriptions.game_adjective_studio,
            maxWidthClassName: 'max-w-4xl',
            shellTestId: 'english-adjectives-scene-game-shell',
          },
          render: ({ onFinish }) => <EnglishAdjectivesSceneGame onFinish={onFinish} />,
        },
      ]}
    />
  );
}
