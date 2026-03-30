'use client';

import { useTranslations } from 'next-intl';
import { useMemo } from 'react';

import { getKangurBuiltInGameInstanceId } from '@/features/kangur/games';
import type { LessonSlide } from '@/features/kangur/ui/components/lesson-framework/LessonSlideSection';
import {
  EnglishAdverbActionStyleAnimation,
  EnglishAdverbRepairAnimation,
  EnglishAdverbTransformationAnimation,
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

const LESSON_KEY = 'english_adverbs';
const ENGLISH_ADVERBS_ACTION_STUDIO_INSTANCE_ID = getKangurBuiltInGameInstanceId(
  'english_adverbs_action_studio'
);

type SectionId =
  | 'intro'
  | 'form'
  | 'repair'
  | 'answer'
  | 'game_action_studio'
  | 'summary';

type SlideSectionId = Exclude<SectionId, 'game_action_studio'>;

const buildEnglishAdverbsSlides = (
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
            accent='violet'
            caption={translations('slides.intro.overview.caption')}
            supportingContent={
              <div>
                <div className={`${KANGUR_WRAP_ROW_CLASSNAME} text-xs font-semibold`}>
                  {['fast', 'carefully', 'beautifully', 'happily', 'well', 'badly'].map((word) => (
                    <KangurLessonChip key={word} accent='violet'>
                      {word}
                    </KangurLessonChip>
                  ))}
                </div>
              </div>
            }
          >
            <EnglishAdverbActionStyleAnimation />
          </KangurLessonVisual>
        </KangurLessonStack>
      ),
    },
    {
      title: translations('slides.intro.howQuestion.title'),
      content: (
        <KangurLessonStack align='start'>
          <KangurLessonLead align='left'>
            {translations('slides.intro.howQuestion.lead')}
          </KangurLessonLead>
          <div className={`${KANGUR_GRID_TIGHT_CLASSNAME} text-sm`}>
            <KangurLessonInset accent='sky' className='text-left'>
              <p className='font-semibold text-sky-700'>How does he run?</p>
              <p className='mt-1 text-slate-600'>He runs fast.</p>
            </KangurLessonInset>
            <KangurLessonInset accent='emerald' className='text-left'>
              <p className='font-semibold text-emerald-700'>How does she paint?</p>
              <p className='mt-1 text-slate-600'>She paints beautifully.</p>
            </KangurLessonInset>
            <KangurLessonInset accent='amber' className='text-left'>
              <p className='font-semibold text-amber-700'>How does he carry the books?</p>
              <p className='mt-1 text-slate-600'>He carries them carefully.</p>
            </KangurLessonInset>
          </div>
        </KangurLessonStack>
      ),
    },
  ],
  form: [
    {
      title: translations('slides.form.changeWords.title'),
      content: (
        <KangurLessonStack align='start'>
          <KangurLessonLead align='left'>
            {translations('slides.form.changeWords.lead')}
          </KangurLessonLead>
          <KangurLessonVisual
            accent='emerald'
            caption={translations('slides.form.changeWords.caption')}
            supportingContent={
              <div>
                <ul className='space-y-2 text-sm'>
                  {[
                    'careful → carefully',
                    'beautiful → beautifully',
                    'happy → happily',
                    'terrible → terribly',
                  ].map((text) => (
                    <li key={text} className='font-semibold text-emerald-700'>
                      {text}
                    </li>
                  ))}
                </ul>
              </div>
            }
          >
            <EnglishAdverbTransformationAnimation />
          </KangurLessonVisual>
        </KangurLessonStack>
      ),
    },
    {
      title: translations('slides.form.specialWords.title'),
      content: (
        <KangurLessonStack align='start'>
          <KangurLessonLead align='left'>
            {translations('slides.form.specialWords.lead')}
          </KangurLessonLead>
          <div className={`${KANGUR_GRID_TIGHT_CLASSNAME} text-sm sm:grid-cols-3`}>
            <KangurLessonInset accent='sky' className='text-left'>
              <p className='font-semibold text-sky-700'>good → well</p>
              <p className='mt-1 text-slate-600'>She plays football well.</p>
            </KangurLessonInset>
            <KangurLessonInset accent='amber' className='text-left'>
              <p className='font-semibold text-amber-700'>fast → fast</p>
              <p className='mt-1 text-slate-600'>He runs fast.</p>
            </KangurLessonInset>
            <KangurLessonInset accent='emerald' className='text-left'>
              <p className='font-semibold text-emerald-700'>hard → hard</p>
              <p className='mt-1 text-slate-600'>I work hard in class.</p>
            </KangurLessonInset>
          </div>
          <KangurLessonCaption>{translations('slides.form.specialWords.caption')}</KangurLessonCaption>
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
            supportingContent={
              <div>
                <ul className='space-y-2 text-sm'>
                  {[
                    'bad → badly',
                    'fastly → fast',
                    'good → well',
                    'beautiful → beautifully',
                  ].map((text) => (
                    <li key={text} className='font-semibold text-rose-700'>
                      {text}
                    </li>
                  ))}
                </ul>
              </div>
            }
          >
            <EnglishAdverbRepairAnimation />
          </KangurLessonVisual>
        </KangurLessonStack>
      ),
    },
  ],
  answer: [
    {
      title: translations('slides.answer.schoolDay.title'),
      content: (
        <KangurLessonStack align='start'>
          <KangurLessonLead align='left'>
            {translations('slides.answer.schoolDay.lead')}
          </KangurLessonLead>
          <KangurLessonCallout accent='emerald' padding='sm'>
            <div className='space-y-2 text-sm text-slate-700'>
              <p>I work carefully in class.</p>
              <p>I write well when I take my time.</p>
              <p>I run fast in PE.</p>
            </div>
          </KangurLessonCallout>
          <KangurLessonCaption>{translations('slides.answer.schoolDay.caption')}</KangurLessonCaption>
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
            {['fast', 'carefully', 'beautifully', 'happily', 'well', 'badly'].map((word) => (
              <KangurLessonChip key={word} accent='amber'>
                {word}
              </KangurLessonChip>
            ))}
          </div>
        </KangurLessonStack>
      ),
    },
    {
      title: translations('slides.answer.writeAndDraw.title'),
      content: (
        <KangurLessonStack align='start'>
          <KangurLessonLead align='left'>
            {translations('slides.answer.writeAndDraw.lead')}
          </KangurLessonLead>
          <div className={`${KANGUR_GRID_TIGHT_CLASSNAME} text-sm sm:grid-cols-2`}>
            <KangurLessonCallout accent='sky' padding='sm'>
              <p className='font-semibold text-slate-700'>Draw your classroom</p>
              <p className='mt-2 text-slate-700'>I listen carefully to the teacher.</p>
              <p className='mt-1 text-slate-700'>I usually write well in English.</p>
            </KangurLessonCallout>
            <KangurLessonCallout accent='violet' padding='sm'>
              <p className='font-semibold text-slate-700'>Draw yourself in action</p>
              <p className='mt-2 text-slate-700'>I sing happily.</p>
              <p className='mt-1 text-slate-700'>I paint beautifully.</p>
            </KangurLessonCallout>
          </div>
          <KangurLessonCaption>{translations('slides.answer.writeAndDraw.caption')}</KangurLessonCaption>
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
              <li>{translations('slides.summary.recap.items.meaning')}</li>
              <li>{translations('slides.summary.recap.items.ly')}</li>
              <li>{translations('slides.summary.recap.items.special')}</li>
              <li>{translations('slides.summary.recap.items.use')}</li>
            </ul>
          </KangurLessonCallout>
        </KangurLessonStack>
      ),
    },
  ],
});

const ADVERBS_SECTION_META: Array<{
  id: SectionId;
  emoji: string;
  key: string;
  isGame?: boolean;
}> = [
  { id: 'intro', emoji: '🎭', key: 'intro' },
  { id: 'form', emoji: '🔤', key: 'form' },
  { id: 'repair', emoji: '🛠️', key: 'repair' },
  { id: 'answer', emoji: '💬', key: 'answer' },
  { id: 'game_action_studio', emoji: '🎬', key: 'gameActionStudio', isGame: true },
  { id: 'summary', emoji: '🧠', key: 'summary' },
];

export default function EnglishAdverbsLesson(): React.JSX.Element {
  const shellTranslations = useTranslations('KangurStaticLessons.englishAdverbsShell');
  const contentTranslations = useTranslations('KangurStaticLessons.englishAdverbs');

  const localizedSections = useMemo(
    () =>
      ADVERBS_SECTION_META.map((section) => ({
        id: section.id,
        emoji: section.emoji,
        title: shellTranslations(`sections.${section.key}.title`),
        description: shellTranslations(`sections.${section.key}.description`),
        isGame: section.isGame,
      })),
    [shellTranslations]
  );

  const localizedSlides = useMemo(
    () => buildEnglishAdverbsSlides(contentTranslations),
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
      lessonEmoji='🎭'
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
      skipMarkFor={['game_action_studio']}
      games={[
        {
          sectionId: 'game_action_studio',
          shell: {
            accent: 'violet',
            title: sectionTitles.game_action_studio,
            icon: '🎬',
            description: sectionDescriptions.game_action_studio,
            maxWidthClassName: 'max-w-4xl',
            shellTestId: 'english-adverbs-game-shell',
          },
          launchableInstance: {
            gameId: 'english_adverbs_action_studio',
            instanceId: ENGLISH_ADVERBS_ACTION_STUDIO_INSTANCE_ID,
          },
        },
      ]}
    />
  );
}
