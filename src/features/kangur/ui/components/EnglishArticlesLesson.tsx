'use client';

import { useTranslations } from 'next-intl';
import { useMemo } from 'react';

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
import {
  KangurEquationDisplay,
} from '@/features/kangur/ui/design/primitives';
import {
  KANGUR_GRID_TIGHT_CLASSNAME,
  KANGUR_WRAP_ROW_CLASSNAME,
} from '@/features/kangur/ui/design/tokens';
import { KangurUnifiedLesson } from '@/features/kangur/ui/lessons/lesson-components';
import type { KangurIntlTranslate } from '@/features/kangur/ui/types';

type SectionId = 'intro' | 'a_an' | 'the' | 'zero' | 'practice' | 'summary';

const buildEnglishArticlesSlides = (
  translations: KangurIntlTranslate
): Record<SectionId, LessonSlide[]> => ({
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
          >
            <EnglishArticleVowelAnimation />
          </KangurLessonVisual>
          <div className={`${KANGUR_GRID_TIGHT_CLASSNAME} sm:grid-cols-2 text-sm`}>
            {[
              translations('slides.aAn.overview.items.unit'),
              translations('slides.aAn.overview.items.angle'),
              translations('slides.aAn.overview.items.xIntercept'),
              translations('slides.aAn.overview.items.variable'),
            ].map((text) => (
              <KangurLessonInset key={text} accent='amber' className='text-left'>
                <p className='font-semibold text-amber-700'>{text}</p>
              </KangurLessonInset>
            ))}
          </div>
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
          >
            <EnglishArticleFocusAnimation />
          </KangurLessonVisual>
          <div className={`${KANGUR_GRID_TIGHT_CLASSNAME} text-sm`}>
            {[
              'The graph on the screen shows the parabola.',
              'The solution we found is correct.',
              'The angle at point A is 90°.',
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
          >
            <EnglishZeroArticleAnimation />
          </KangurLessonVisual>
          <div className={`${KANGUR_GRID_TIGHT_CLASSNAME} text-sm`}>
            {[
              'We study math after class.',
              'Graphs show patterns.',
              'Homework helps practice.',
              'Variables x and y are common.',
            ].map((text) => (
              <KangurLessonInset key={text} accent='slate' className='text-left'>
                <p className='font-semibold text-slate-700'>{text}</p>
              </KangurLessonInset>
            ))}
          </div>
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
}> = [
  { id: 'intro', emoji: '📌', key: 'intro' },
  { id: 'a_an', emoji: '🎯', key: 'aAn' },
  { id: 'the', emoji: '🔎', key: 'the' },
  { id: 'zero', emoji: '⭕', key: 'zero' },
  { id: 'practice', emoji: '✅', key: 'practice' },
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
      })),
    [shellTranslations]
  );
  const localizedSlides = useMemo(
    () => buildEnglishArticlesSlides(contentTranslations),
    [contentTranslations]
  );

  return (
    <KangurUnifiedLesson
      progressMode='panel'
      lessonId='english_articles'
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
    />
  );
}
