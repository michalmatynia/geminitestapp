'use client';

import { useTranslations } from 'next-intl';
import { useMemo } from 'react';

import type { LessonSlide } from '@/features/kangur/ui/components/LessonSlideSection';
import {
  EnglishConnectorBridgeAnimation,
  EnglishQuestionFlipAnimation,
  EnglishSentenceBlueprintAnimation,
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

type SectionId =
  | 'blueprint'
  | 'order'
  | 'questions'
  | 'connectors'
  | 'practice'
  | 'summary';

const buildEnglishSentenceStructureSlides = (
  translations: KangurIntlTranslate
): Record<SectionId, LessonSlide[]> => ({
  blueprint: [
    {
      title: translations('slides.blueprint.core.title'),
      content: (
        <KangurLessonStack align='start'>
          <KangurLessonLead align='left'>
            {translations('slides.blueprint.core.lead')}
          </KangurLessonLead>
          <KangurLessonVisual
            accent='violet'
            caption={translations('slides.blueprint.core.caption')}
          >
            <EnglishSentenceBlueprintAnimation />
          </KangurLessonVisual>
          <KangurLessonInset accent='violet' className='text-left'>
            <p className='text-sm font-semibold text-violet-700'>
              The student solves the equation.
            </p>
          </KangurLessonInset>
        </KangurLessonStack>
      ),
    },
  ],
  order: [
    {
      title: translations('slides.order.additions.title'),
      content: (
        <KangurLessonStack align='start'>
          <KangurLessonLead align='left'>
            {translations('slides.order.additions.lead')}
          </KangurLessonLead>
          <KangurLessonCallout accent='violet' padding='sm'>
            <div className={`${KANGUR_WRAP_ROW_CLASSNAME} text-xs font-semibold`}>
              <KangurLessonChip accent='violet'>Subject</KangurLessonChip>
              <KangurLessonChip accent='violet'>Verb</KangurLessonChip>
              <KangurLessonChip accent='violet'>Object</KangurLessonChip>
              <KangurLessonChip accent='violet'>Time</KangurLessonChip>
            </div>
            <KangurLessonCaption className='mt-2'>
              {translations('slides.order.additions.caption')}
            </KangurLessonCaption>
          </KangurLessonCallout>
          <div className={`${KANGUR_GRID_TIGHT_CLASSNAME} text-sm`}>
            {[
              'She checks the graph after class.',
              'They compare answers in the notebook.',
              'We practice algebra every week.',
            ].map((text) => (
              <KangurLessonInset key={text} accent='violet' className='text-left'>
                <p className='font-semibold text-violet-700'>{text}</p>
              </KangurLessonInset>
            ))}
          </div>
        </KangurLessonStack>
      ),
    },
  ],
  questions: [
    {
      title: translations('slides.questions.doDoes.title'),
      content: (
        <KangurLessonStack align='start'>
          <KangurLessonLead align='left'>
            {translations('slides.questions.doDoes.lead')}
          </KangurLessonLead>
          <KangurLessonVisual
            accent='violet'
            caption={translations('slides.questions.doDoes.caption')}
          >
            <EnglishQuestionFlipAnimation />
          </KangurLessonVisual>
          <div className={`${KANGUR_GRID_TIGHT_CLASSNAME} text-sm`}>
            {[
              'Do you understand the graph?',
              'Does he use a calculator?',
              'Do they check the steps?',
            ].map((text) => (
              <KangurLessonInset key={text} accent='violet' className='text-left'>
                <p className='font-semibold text-violet-700'>{text}</p>
              </KangurLessonInset>
            ))}
          </div>
        </KangurLessonStack>
      ),
    },
  ],
  connectors: [
    {
      title: translations('slides.connectors.linking.title'),
      content: (
        <KangurLessonStack align='start'>
          <KangurLessonLead align='left'>
            {translations('slides.connectors.linking.lead')}
          </KangurLessonLead>
          <KangurLessonVisual
            accent='amber'
            caption={translations('slides.connectors.linking.caption')}
          >
            <EnglishConnectorBridgeAnimation />
          </KangurLessonVisual>
          <div className={`${KANGUR_GRID_TIGHT_CLASSNAME} text-sm`}>
            {[
              'I solved the equation, so I checked the graph.',
              'We repeated the task because the answer was wrong.',
              'She explains the steps, but he is still unsure.',
            ].map((text) => (
              <KangurLessonInset key={text} accent='amber' className='text-left'>
                <p className='font-semibold text-amber-700'>{text}</p>
              </KangurLessonInset>
            ))}
          </div>
        </KangurLessonStack>
      ),
    },
  ],
  practice: [
    {
      title: translations('slides.practice.buildSentence.title'),
      content: (
        <KangurLessonStack align='start'>
          <KangurLessonLead align='left'>
            {translations('slides.practice.buildSentence.lead')}
          </KangurLessonLead>
          <KangurLessonCallout accent='violet' padding='sm'>
            <div className='space-y-2 text-sm text-slate-700'>
              <p>1) solves / the equation / She</p>
              <p>2) today / practice / We / geometry</p>
              <p>3) the graph / after class / checks / He</p>
            </div>
            <KangurLessonCaption className='mt-3'>
              {translations('slides.practice.buildSentence.answersCaption')}
            </KangurLessonCaption>
          </KangurLessonCallout>
        </KangurLessonStack>
      ),
    },
    {
      title: translations('slides.practice.makeQuestion.title'),
      content: (
        <KangurLessonStack align='start'>
          <KangurLessonLead align='left'>
            {translations('slides.practice.makeQuestion.lead')}
          </KangurLessonLead>
          <KangurLessonCallout accent='violet' padding='sm'>
            <div className='space-y-2 text-sm text-slate-700'>
              <p>1) You understand the formula.</p>
              <p>2) She explains the proof.</p>
              <p>3) They use the graph.</p>
            </div>
            <KangurLessonCaption className='mt-3'>
              {translations('slides.practice.makeQuestion.answersCaption')}
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
          <KangurLessonCallout accent='violet' padding='sm'>
            <ul className='space-y-2 text-sm text-slate-700'>
              <li>{translations('slides.summary.recap.items.svo')}</li>
              <li>{translations('slides.summary.recap.items.timePlace')}</li>
              <li>{translations('slides.summary.recap.items.questions')}</li>
              <li>{translations('slides.summary.recap.items.connectors')}</li>
            </ul>
          </KangurLessonCallout>
          <KangurEquationDisplay accent='violet' className='mt-2' size='sm'>
            Do you solve the equation?
          </KangurEquationDisplay>
        </KangurLessonStack>
      ),
    },
  ],
});

const SENTENCE_STRUCTURE_SECTION_META: Array<{
  id: SectionId;
  emoji: string;
  key: string;
}> = [
  { id: 'blueprint', emoji: '🧩', key: 'blueprint' },
  { id: 'order', emoji: '🧭', key: 'order' },
  { id: 'questions', emoji: '❓', key: 'questions' },
  { id: 'connectors', emoji: '🔗', key: 'connectors' },
  { id: 'practice', emoji: '✅', key: 'practice' },
  { id: 'summary', emoji: '🧠', key: 'summary' },
];

export default function EnglishSentenceStructureLesson(): React.JSX.Element {
  const shellTranslations = useTranslations('KangurStaticLessons.englishSentenceStructureShell');
  const contentTranslations = useTranslations('KangurStaticLessons.englishSentenceStructure');
  const localizedSections = useMemo(
    () =>
      SENTENCE_STRUCTURE_SECTION_META.map((section) => ({
        id: section.id,
        emoji: section.emoji,
        title: shellTranslations(`sections.${section.key}.title`),
        description: shellTranslations(`sections.${section.key}.description`),
      })),
    [shellTranslations]
  );
  const localizedSlides = useMemo(
    () => buildEnglishSentenceStructureSlides(contentTranslations),
    [contentTranslations]
  );

  return (
    <KangurUnifiedLesson
      progressMode='panel'
      lessonId='english_sentence_structure'
      lessonEmoji='🧩'
      lessonTitle={shellTranslations('lessonTitle')}
      sections={localizedSections}
      slides={localizedSlides}
      gradientClass='kangur-gradient-accent-violet'
      progressDotClassName='bg-violet-300'
      dotActiveClass='bg-violet-500'
      dotDoneClass='bg-violet-300'
      completionSectionId='summary'
      autoRecordComplete
      scorePercent={120}
    />
  );
}
