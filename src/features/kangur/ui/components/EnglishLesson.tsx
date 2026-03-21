'use client';

import { useTranslations } from 'next-intl';
import { useMemo } from 'react';

import { EnglishPronounsPulseAnimation } from '@/features/kangur/ui/components/EnglishPronounsAnimations';
import type { LessonSlide } from '@/features/kangur/ui/components/LessonSlideSection';
import {
  KangurLessonCallout,
  KangurLessonCaption,
  KangurLessonInset,
  KangurLessonLead,
  KangurLessonStack,
  KangurLessonVisual,
} from '@/features/kangur/ui/design/lesson-primitives';
import { KANGUR_GRID_TIGHT_CLASSNAME } from '@/features/kangur/ui/design/tokens';
import { KangurUnifiedLesson } from '@/features/kangur/ui/lessons/lesson-components';
import type { KangurIntlTranslate } from '@/features/kangur/ui/types';

type SectionId = 'greetings' | 'phrases' | 'summary' | 'pronoun_remix';
type SlideSectionId = SectionId;

const buildEnglishBasicsSlides = (
  translations: KangurIntlTranslate
): Record<SlideSectionId, LessonSlide[]> => ({
  greetings: [
    {
      title: translations('slides.greetings.hello.title'),
      content: (
        <KangurLessonStack>
          <KangurLessonLead>{translations('slides.greetings.hello.lead')}</KangurLessonLead>
          <KangurLessonCallout accent='emerald' className='text-sm' padding='sm'>
            <div className={`${KANGUR_GRID_TIGHT_CLASSNAME} sm:grid-cols-2`}>
              <KangurLessonInset accent='emerald'>
                <p className='font-semibold text-emerald-700'>Hello</p>
                <KangurLessonCaption className='mt-1'>
                  {translations('slides.greetings.hello.captions.hello')}
                </KangurLessonCaption>
              </KangurLessonInset>
              <KangurLessonInset accent='emerald'>
                <p className='font-semibold text-emerald-700'>Goodbye</p>
                <KangurLessonCaption className='mt-1'>
                  {translations('slides.greetings.hello.captions.goodbye')}
                </KangurLessonCaption>
              </KangurLessonInset>
              <KangurLessonInset accent='emerald'>
                <p className='font-semibold text-emerald-700'>Please</p>
                <KangurLessonCaption className='mt-1'>
                  {translations('slides.greetings.hello.captions.please')}
                </KangurLessonCaption>
              </KangurLessonInset>
              <KangurLessonInset accent='emerald'>
                <p className='font-semibold text-emerald-700'>Thank you</p>
                <KangurLessonCaption className='mt-1'>
                  {translations('slides.greetings.hello.captions.thankYou')}
                </KangurLessonCaption>
              </KangurLessonInset>
            </div>
          </KangurLessonCallout>
        </KangurLessonStack>
      ),
    },
    {
      title: translations('slides.greetings.introduce.title'),
      content: (
        <KangurLessonStack>
          <KangurLessonLead>
            {translations('slides.greetings.introduce.lead')}
          </KangurLessonLead>
          <KangurLessonCallout accent='emerald' className='text-center' padding='sm'>
            <p className='text-lg font-semibold text-emerald-700'>My name is Ania.</p>
            <KangurLessonCaption className='mt-1'>
              {translations('slides.greetings.introduce.captions.name')}
            </KangurLessonCaption>
            <p className='mt-3 text-lg font-semibold text-emerald-700'>I am 9 years old.</p>
            <KangurLessonCaption className='mt-1'>
              {translations('slides.greetings.introduce.captions.age')}
            </KangurLessonCaption>
          </KangurLessonCallout>
        </KangurLessonStack>
      ),
    },
  ],
  phrases: [
    {
      title: translations('slides.phrases.questions.title'),
      content: (
        <KangurLessonStack>
          <KangurLessonLead>{translations('slides.phrases.questions.lead')}</KangurLessonLead>
          <KangurLessonCallout accent='emerald' padding='sm'>
            <KangurLessonCaption className='mb-2'>
              {translations('slides.phrases.questions.repeatCaption')}
            </KangurLessonCaption>
            <div className='space-y-2 text-emerald-700'>
              <p className='font-semibold'>How are you?</p>
              <p className='font-semibold'>What is your name?</p>
              <p className='font-semibold'>Where are you from?</p>
            </div>
          </KangurLessonCallout>
        </KangurLessonStack>
      ),
    },
    {
      title: translations('slides.phrases.answers.title'),
      content: (
        <KangurLessonStack>
          <KangurLessonLead>{translations('slides.phrases.answers.lead')}</KangurLessonLead>
          <KangurLessonCallout accent='emerald' className='text-center' padding='sm'>
            <p className='text-lg font-semibold text-emerald-700'>I&apos;m fine, thank you.</p>
            <KangurLessonCaption className='mt-1'>
              {translations('slides.phrases.answers.captions.fine')}
            </KangurLessonCaption>
            <p className='mt-3 text-lg font-semibold text-emerald-700'>My name is Kuba.</p>
            <KangurLessonCaption className='mt-1'>
              {translations('slides.phrases.answers.captions.name')}
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
        <KangurLessonStack>
          <KangurLessonLead>{translations('slides.summary.recap.lead')}</KangurLessonLead>
          <KangurLessonCallout accent='emerald' padding='sm'>
            <ul className='space-y-2 text-sm'>
              <li>{translations('slides.summary.recap.items.greetings')}</li>
              <li>{translations('slides.summary.recap.items.questions')}</li>
            </ul>
          </KangurLessonCallout>
        </KangurLessonStack>
      ),
    },
  ],
  pronoun_remix: [
    {
      title: translations('slides.pronounRemix.rules.title'),
      content: (
        <KangurLessonStack>
          <KangurLessonLead>{translations('slides.pronounRemix.rules.lead')}</KangurLessonLead>
          <KangurLessonVisual
            accent='emerald'
            caption={translations('slides.pronounRemix.rules.caption')}
            maxWidthClassName='max-w-xs'
          >
            <EnglishPronounsPulseAnimation />
          </KangurLessonVisual>
          <KangurLessonCallout accent='emerald' className='text-sm' padding='sm'>
            <ul className='space-y-2'>
              <li>{translations('slides.pronounRemix.rules.items.subject')}</li>
              <li>{translations('slides.pronounRemix.rules.items.object')}</li>
              <li>{translations('slides.pronounRemix.rules.items.possessive')}</li>
              <li>{translations('slides.pronounRemix.rules.items.reflexive')}</li>
            </ul>
          </KangurLessonCallout>
        </KangurLessonStack>
      ),
    },
  ],
});

const ENGLISH_BASICS_SECTION_META: Array<{
  id: SectionId;
  emoji: string;
  key: string;
}> = [
  { id: 'greetings', emoji: '👋', key: 'greetings' },
  { id: 'phrases', emoji: '🗣️', key: 'phrases' },
  { id: 'summary', emoji: '✅', key: 'summary' },
  { id: 'pronoun_remix', emoji: '🧠', key: 'pronounRemix' },
];

export default function EnglishLesson(): React.JSX.Element {
  const shellTranslations = useTranslations('KangurStaticLessons.englishBasicsShell');
  const contentTranslations = useTranslations('KangurStaticLessons.englishBasics');
  const localizedSections = useMemo(
    () =>
      ENGLISH_BASICS_SECTION_META.map((section) => ({
        id: section.id,
        emoji: section.emoji,
        title: shellTranslations(`sections.${section.key}.title`),
        description: shellTranslations(`sections.${section.key}.description`),
      })),
    [shellTranslations]
  );
  const localizedSlides = useMemo(
    () => buildEnglishBasicsSlides(contentTranslations),
    [contentTranslations]
  );

  return (
    <KangurUnifiedLesson
      progressMode='panel'
      lessonId='english_basics'
      lessonEmoji='🗣️'
      lessonTitle={shellTranslations('lessonTitle')}
      sections={localizedSections}
      slides={localizedSlides}
      gradientClass='kangur-gradient-accent-emerald'
      progressDotClassName='bg-emerald-300'
      dotActiveClass='bg-emerald-500'
      dotDoneClass='bg-emerald-300'
      completionSectionId='summary'
      autoRecordComplete
      scorePercent={100}
    />
  );
}
