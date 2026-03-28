'use client';

import { useTranslations } from 'next-intl';
import { useMemo } from 'react';

import { getKangurBuiltInGameInstanceId } from '@/features/kangur/games';
import type { LessonSlide } from '@/features/kangur/ui/components/LessonSlideSection';
import {
  EnglishArticleFocusAnimation,
  EnglishArticleVowelAnimation,
  EnglishZeroArticleAnimation,
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
import { KangurEquationDisplay } from '@/features/kangur/ui/design/primitives';
import {
  KANGUR_GRID_TIGHT_CLASSNAME,
  KANGUR_WRAP_ROW_CLASSNAME,
} from '@/features/kangur/ui/design/tokens';
import { KangurUnifiedLesson } from '@/features/kangur/ui/lessons/lesson-components';
import type { KangurIntlTranslate } from '@/features/kangur/ui/types';

const LESSON_KEY = 'english_articles';
const ENGLISH_ARTICLES_DRAG_INSTANCE_ID = getKangurBuiltInGameInstanceId(
  'english_articles_drag_drop'
);

type SectionId =
  | 'intro'
  | 'a_an'
  | 'the'
  | 'zero'
  | 'practice'
  | 'game_articles_drag'
  | 'summary';

type SlideSectionId = Exclude<SectionId, 'game_articles_drag'>;

const buildEnglishArticlesSlides = (
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
          <KangurLessonCallout accent='amber' padding='sm'>
            <div className={`${KANGUR_WRAP_ROW_CLASSNAME} text-sm`}>
              <KangurLessonChip accent='amber'>a triangle</KangurLessonChip>
              <KangurLessonChip accent='amber'>an equation</KangurLessonChip>
              <KangurLessonChip accent='amber'>the solution</KangurLessonChip>
            </div>
            <KangurLessonCaption className='mt-3'>
              {translations('slides.intro.overview.caption')}
            </KangurLessonCaption>
          </KangurLessonCallout>
          <KangurLessonInset accent='amber' className='text-left'>
            <p className='text-sm font-semibold text-amber-700'>
              We need <strong>a</strong> formula, then we use <strong>the</strong> formula from
              the board.
            </p>
          </KangurLessonInset>
        </KangurLessonStack>
      ),
    },
    {
      title: translations('slides.intro.storyTrail.title'),
      content: (
        <KangurLessonStack align='start'>
          <KangurLessonLead align='left'>
            {translations('slides.intro.storyTrail.lead')}
          </KangurLessonLead>
          <KangurLessonCallout accent='amber' padding='sm'>
            <div className='space-y-2 text-sm text-slate-700'>
              <p>
                1) I saw <strong>a</strong> cat in the garden.
              </p>
              <p>
                2) <strong>The</strong> cat jumped onto the fence.
              </p>
              <p>
                3) We watched <strong>the</strong> cat from the window.
              </p>
            </div>
            <KangurLessonCaption className='mt-3'>
              {translations('slides.intro.storyTrail.caption')}
            </KangurLessonCaption>
          </KangurLessonCallout>
        </KangurLessonStack>
      ),
    },
  ],
  a_an: [
    {
      title: translations('slides.aAn.overview.title'),
      content: (
        <KangurLessonStack align='start'>
          <KangurLessonLead align='left'>
            {translations('slides.aAn.overview.lead')}
          </KangurLessonLead>
          <KangurLessonVisual
            accent='amber'
            caption={translations('slides.aAn.overview.caption')}
            supportingContent={
              <div>
                <ul className='space-y-2 text-sm'>
                  {[
                    translations('slides.aAn.overview.items.unit'),
                    translations('slides.aAn.overview.items.angle'),
                    translations('slides.aAn.overview.items.xIntercept'),
                    translations('slides.aAn.overview.items.variable'),
                  ].map((text) => (
                    <li key={text} className='font-semibold text-amber-700'>
                      {text}
                    </li>
                  ))}
                </ul>
              </div>
            }
          >
            <EnglishArticleVowelAnimation />
          </KangurLessonVisual>
        </KangurLessonStack>
      ),
    },
    {
      title: translations('slides.aAn.taskExample.title'),
      content: (
        <KangurLessonStack align='start'>
          <KangurLessonLead align='left'>
            {translations('slides.aAn.taskExample.lead')}
          </KangurLessonLead>
          <KangurLessonVisual
            accent='amber'
            caption={translations('slides.aAn.taskExample.caption')}
            maxWidthClassName='max-w-full'
          >
            <KangurEquationDisplay accent='amber' size='sm'>
              Solve an equation with two variables.
            </KangurEquationDisplay>
          </KangurLessonVisual>
        </KangurLessonStack>
      ),
    },
    {
      title: translations('slides.aAn.soundCheck.title'),
      content: (
        <KangurLessonStack align='start'>
          <KangurLessonLead align='left'>
            {translations('slides.aAn.soundCheck.lead')}
          </KangurLessonLead>
          <div className={`${KANGUR_GRID_TIGHT_CLASSNAME} sm:grid-cols-2 text-sm`}>
            {['a unicorn', 'an hour', 'a European map', 'an orange'].map((text) => (
              <KangurLessonInset key={text} accent='amber' className='text-left'>
                <p className='font-semibold text-amber-700'>{text}</p>
              </KangurLessonInset>
            ))}
          </div>
          <KangurLessonCaption>{translations('slides.aAn.soundCheck.caption')}</KangurLessonCaption>
        </KangurLessonStack>
      ),
    },
  ],
  the: [
    {
      title: translations('slides.the.focus.title'),
      content: (
        <KangurLessonStack align='start'>
          <KangurLessonLead align='left'>
            {translations('slides.the.focus.lead')}
          </KangurLessonLead>
          <KangurLessonVisual
            accent='indigo'
            caption={translations('slides.the.focus.caption')}
            supportingContent={
              <div>
                <ul className='space-y-2 text-sm'>
                  {[
                    'The graph on the screen shows the parabola.',
                    'The solution we found is correct.',
                    'The angle at point A is 90°.',
                  ].map((text) => (
                    <li key={text} className='font-semibold text-indigo-700'>
                      {text}
                    </li>
                  ))}
                </ul>
              </div>
            }
          >
            <EnglishArticleFocusAnimation />
          </KangurLessonVisual>
        </KangurLessonStack>
      ),
    },
    {
      title: translations('slides.the.secondMention.title'),
      content: (
        <KangurLessonStack align='start'>
          <KangurLessonLead align='left'>
            {translations('slides.the.secondMention.lead')}
          </KangurLessonLead>
          <KangurLessonCallout accent='indigo' padding='sm'>
            <div className='space-y-2 text-sm text-slate-700'>
              <p>
                I found <strong>a</strong> shell on the beach.
              </p>
              <p>
                <strong>The</strong> shell was wet and shiny.
              </p>
              <p>
                I showed <strong>the</strong> shell to my brother.
              </p>
            </div>
          </KangurLessonCallout>
          <KangurLessonCaption>
            {translations('slides.the.secondMention.caption')}
          </KangurLessonCaption>
        </KangurLessonStack>
      ),
    },
  ],
  zero: [
    {
      title: translations('slides.zero.overview.title'),
      content: (
        <KangurLessonStack align='start'>
          <KangurLessonLead align='left'>
            {translations('slides.zero.overview.lead')}
          </KangurLessonLead>
          <KangurLessonVisual
            accent='slate'
            caption={translations('slides.zero.overview.caption')}
            supportingContent={
              <div>
                <ul className='space-y-2 text-sm'>
                  {[
                    'We study math after class.',
                    'Graphs show patterns.',
                    'Homework helps practice.',
                    'Variables x and y are common.',
                  ].map((text) => (
                    <li key={text} className='font-semibold text-slate-700'>
                      {text}
                    </li>
                  ))}
                </ul>
              </div>
            }
          >
            <EnglishZeroArticleAnimation />
          </KangurLessonVisual>
        </KangurLessonStack>
      ),
    },
    {
      title: translations('slides.zero.everyday.title'),
      content: (
        <KangurLessonStack align='start'>
          <KangurLessonLead align='left'>
            {translations('slides.zero.everyday.lead')}
          </KangurLessonLead>
          <div className={`${KANGUR_GRID_TIGHT_CLASSNAME} text-sm`}>
            {[
              'Children love music.',
              'We study English after lunch.',
              'Cats drink milk.',
              'Summer starts in June.',
            ].map((text) => (
              <KangurLessonInset key={text} accent='slate' className='text-left'>
                <p className='font-semibold text-slate-700'>{text}</p>
              </KangurLessonInset>
            ))}
          </div>
          <KangurLessonCaption>{translations('slides.zero.everyday.caption')}</KangurLessonCaption>
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
          <KangurLessonCallout accent='amber' padding='sm'>
            <div className='space-y-2 text-sm text-slate-700'>
              <p>1) ___ equation has two solutions. (an)</p>
              <p>2) ___ graph we drew is on the screen. (the)</p>
              <p>3) We practice ___ algebra every week. (—)</p>
              <p>4) She explains ___ angle at point B. (the)</p>
              <p>5) Solve ___ linear equation. (a)</p>
            </div>
            <KangurLessonCaption className='mt-3'>
              {translations('slides.practice.quick.answersCaption')}
            </KangurLessonCaption>
          </KangurLessonCallout>
        </KangurLessonStack>
      ),
    },
    {
      title: translations('slides.practice.chooseAnswer.title'),
      content: (
        <KangurLessonStack align='start'>
          <KangurLessonLead align='left'>
            {translations('slides.practice.chooseAnswer.lead')}
          </KangurLessonLead>
          <KangurLessonCallout accent='amber' padding='sm'>
            <div className='space-y-2 text-sm text-slate-700'>
              <p>1) She has ___ orange kite. (an)</p>
              <p>2) We can see ___ moon tonight. (the)</p>
              <p>3) He bought ___ comic after school. (a)</p>
              <p>4) They study ___ history on Tuesday. (—)</p>
            </div>
            <KangurLessonCaption className='mt-3'>
              {translations('slides.practice.chooseAnswer.caption')}
            </KangurLessonCaption>
          </KangurLessonCallout>
        </KangurLessonStack>
      ),
    },
    {
      title: translations('slides.practice.makeItRight.title'),
      content: (
        <KangurLessonStack align='start'>
          <KangurLessonLead align='left'>
            {translations('slides.practice.makeItRight.lead')}
          </KangurLessonLead>
          <div className={`${KANGUR_GRID_TIGHT_CLASSNAME} text-sm`}>
            {[
              'an unicorn → a unicorn',
              'a salt on the table → the salt on the table',
              'the English at school → English at school',
              'a hour later → an hour later',
            ].map((text) => (
              <KangurLessonInset key={text} accent='amber' className='text-left'>
                <p className='font-semibold text-amber-700'>{text}</p>
              </KangurLessonInset>
            ))}
          </div>
          <KangurLessonCaption>
            {translations('slides.practice.makeItRight.caption')}
          </KangurLessonCaption>
        </KangurLessonStack>
      ),
    },
    {
      title: translations('slides.practice.mixedRules.title'),
      content: (
        <KangurLessonStack align='start'>
          <KangurLessonLead align='left'>
            {translations('slides.practice.mixedRules.lead')}
          </KangurLessonLead>
          <KangurLessonCallout accent='amber' padding='sm'>
            <div className='space-y-2 text-sm text-slate-700'>
              <p>1) We spotted ___ owl in the tree. (an)</p>
              <p>2) ___ owl blinked at us and flew away. (the)</p>
              <p>3) Children need ___ sleep after a busy day. (—)</p>
              <p>4) He packed ___ backpack with snacks. (a)</p>
            </div>
            <KangurLessonCaption className='mt-3'>
              {translations('slides.practice.mixedRules.caption')}
            </KangurLessonCaption>
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
          <KangurLessonCallout accent='amber' padding='sm'>
            <ul className='space-y-2 text-sm text-slate-700'>
              <li>{translations('slides.summary.recap.items.aAn')}</li>
              <li>{translations('slides.summary.recap.items.the')}</li>
              <li>{translations('slides.summary.recap.items.zero')}</li>
              <li>{translations('slides.summary.recap.items.sound')}</li>
            </ul>
          </KangurLessonCallout>
        </KangurLessonStack>
      ),
    },
  ],
});

const ARTICLES_SECTION_META: Array<{
  id: SectionId;
  emoji: string;
  key: string;
  isGame?: boolean;
}> = [
  { id: 'intro', emoji: '📌', key: 'intro' },
  { id: 'a_an', emoji: '🎯', key: 'aAn' },
  { id: 'the', emoji: '🔎', key: 'the' },
  { id: 'zero', emoji: '⭕', key: 'zero' },
  { id: 'practice', emoji: '📝', key: 'practice' },
  { id: 'game_articles_drag', emoji: '🧲', key: 'gameArticlesDrag', isGame: true },
  { id: 'summary', emoji: '🧠', key: 'summary' },
];

export default function EnglishArticlesLesson(): React.JSX.Element {
  const shellTranslations = useTranslations('KangurStaticLessons.englishArticlesShell');
  const contentTranslations = useTranslations('KangurStaticLessons.englishArticles');

  const localizedSections = useMemo(
    () =>
      ARTICLES_SECTION_META.map((section) => ({
        id: section.id,
        emoji: section.emoji,
        title: shellTranslations(`sections.${section.key}.title`),
        description: shellTranslations(`sections.${section.key}.description`),
        isGame: section.isGame,
      })),
    [shellTranslations]
  );
  const localizedSlides = useMemo(
    () => buildEnglishArticlesSlides(contentTranslations),
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
      lessonEmoji='📚'
      lessonTitle={shellTranslations('lessonTitle')}
      sections={localizedSections}
      slides={localizedSlides}
      gradientClass='kangur-gradient-accent-amber'
      progressDotClassName='bg-amber-300'
      dotActiveClass='bg-amber-500'
      dotDoneClass='bg-amber-300'
      completionSectionId='summary'
      autoRecordComplete
      scorePercent={120}
      skipMarkFor={['game_articles_drag']}
      games={[
        {
          sectionId: 'game_articles_drag',
          shell: {
            accent: 'amber',
            title: sectionTitles.game_articles_drag,
            icon: '🧲',
            description: sectionDescriptions.game_articles_drag,
            maxWidthClassName: 'max-w-3xl',
            shellTestId: 'english-articles-drag-game-shell',
          },
          launchableInstance: {
            gameId: 'english_articles_drag_drop',
            instanceId: ENGLISH_ARTICLES_DRAG_INSTANCE_ID,
          },
        },
      ]}
    />
  );
}
