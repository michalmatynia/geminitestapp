'use client';

import { useTranslations } from 'next-intl';
import { useMemo } from 'react';

import { getKangurBuiltInGameInstanceId } from '@/features/kangur/games';
import type { LessonSlide } from '@/features/kangur/ui/components/LessonSlideSection';
import {
  EnglishComparativeRepairAnimation,
  EnglishComparativeScaleAnimation,
  EnglishComparativeSpellingAnimation,
  EnglishSuperlativeCrownAnimation,
} from '@/features/kangur/ui/components/LessonAnimations';
import {
  KangurLessonCallout,
  KangurLessonCaption,
  KangurLessonChip,
  KangurLessonLead,
  KangurLessonStack,
  KangurLessonVisual,
} from '@/features/kangur/ui/design/lesson-primitives';
import {
  KANGUR_GRID_TIGHT_CLASSNAME,
  KANGUR_WRAP_ROW_CLASSNAME,
} from '@/features/kangur/ui/design/tokens';
import { KangurUnifiedLesson } from '@/features/kangur/ui/lessons/lesson-components';

const LESSON_KEY = 'english_comparatives_superlatives';
const ENGLISH_COMPARE_AND_CROWN_INSTANCE_ID = getKangurBuiltInGameInstanceId(
  'english_compare_and_crown'
);

type SectionId =
  | 'intro'
  | 'form'
  | 'repair'
  | 'answer'
  | 'game_compare_and_crown'
  | 'summary';

type SlideSectionId = Exclude<SectionId, 'game_compare_and_crown'>;

const buildSlides = (): Record<SlideSectionId, LessonSlide[]> => ({
  intro: [
    {
      title: 'Comparatives compare two things',
      content: (
        <KangurLessonStack align='start'>
          <KangurLessonLead align='left'>
            Use comparatives when you look at two things and decide which one is taller,
            faster, bigger, or better.
          </KangurLessonLead>
          <KangurLessonVisual
            accent='violet'
            caption='tall → taller, big → bigger, fast → faster'
            supportingContent={
              <div className={`${KANGUR_WRAP_ROW_CLASSNAME} text-xs font-semibold`}>
                {['taller', 'bigger', 'faster', 'better'].map((word) => (
                  <KangurLessonChip key={word} accent='violet'>
                    {word}
                  </KangurLessonChip>
                ))}
              </div>
            }
          >
            <EnglishComparativeScaleAnimation />
          </KangurLessonVisual>
        </KangurLessonStack>
      ),
    },
    {
      title: 'Superlatives choose one winner',
      content: (
        <KangurLessonStack align='start'>
          <KangurLessonLead align='left'>
            Use superlatives when you choose the top one in a group: the tallest, the
            fastest, the funniest, the best.
          </KangurLessonLead>
          <KangurLessonVisual
            accent='amber'
            caption='the tallest, the fastest, the funniest, the best'
            supportingContent={
              <div className={`${KANGUR_WRAP_ROW_CLASSNAME} text-xs font-semibold`}>
                {['the tallest', 'the biggest', 'the fastest', 'the best'].map((word) => (
                  <KangurLessonChip key={word} accent='amber'>
                    {word}
                  </KangurLessonChip>
                ))}
              </div>
            }
          >
            <EnglishSuperlativeCrownAnimation />
          </KangurLessonVisual>
        </KangurLessonStack>
      ),
    },
  ],
  form: [
    {
      title: 'Build the form step by step',
      content: (
        <KangurLessonStack align='start'>
          <KangurLessonLead align='left'>
            Some adjectives add <strong>-er</strong> and <strong>-est</strong>, some change
            <strong> y → ier / iest</strong>, and longer words use <strong>more</strong> and{' '}
            <strong>the most</strong>.
          </KangurLessonLead>
          <KangurLessonVisual
            accent='sky'
            caption='big → bigger → the biggest, funny → funnier → the funniest'
            supportingContent={
              <ul className='space-y-2 text-sm'>
                {[
                  'short words: tall → taller → the tallest',
                  'double consonant: big → bigger → the biggest',
                  'y changes: funny → funnier → the funniest',
                  'long words: beautiful → more beautiful → the most beautiful',
                ].map((text) => (
                  <li key={text} className='font-semibold text-sky-700'>
                    {text}
                  </li>
                ))}
              </ul>
            }
          >
            <EnglishComparativeSpellingAnimation />
          </KangurLessonVisual>
        </KangurLessonStack>
      ),
    },
    {
      title: 'Remember the special words',
      content: (
        <KangurLessonStack align='start'>
          <KangurLessonLead align='left'>
            A few forms are special. Learn them as a family, not one by one.
          </KangurLessonLead>
          <div className={`${KANGUR_GRID_TIGHT_CLASSNAME} text-sm sm:grid-cols-3`}>
            <KangurLessonCallout accent='emerald' padding='sm'>
              <p className='font-semibold text-slate-700'>good → better → the best</p>
              <p className='mt-2 text-slate-700'>Mia sings better than Leo.</p>
            </KangurLessonCallout>
            <KangurLessonCallout accent='rose' padding='sm'>
              <p className='font-semibold text-slate-700'>bad → worse → the worst</p>
              <p className='mt-2 text-slate-700'>This storm is worse than yesterday&apos;s.</p>
            </KangurLessonCallout>
            <KangurLessonCallout accent='amber' padding='sm'>
              <p className='font-semibold text-slate-700'>far → farther → the farthest</p>
              <p className='mt-2 text-slate-700'>The yellow bus goes the farthest.</p>
            </KangurLessonCallout>
          </div>
        </KangurLessonStack>
      ),
    },
  ],
  repair: [
    {
      title: 'Repair the wrong form',
      content: (
        <KangurLessonStack align='start'>
          <KangurLessonLead align='left'>
            English does not say <strong>more large</strong>, <strong>gooder</strong>, or{' '}
            <strong>worser</strong>. Watch the wrong form change into the correct one.
          </KangurLessonLead>
          <KangurLessonVisual
            accent='rose'
            caption='more large → bigger, gooder → better, worser → worse'
          >
            <EnglishComparativeRepairAnimation />
          </KangurLessonVisual>
        </KangurLessonStack>
      ),
    },
  ],
  answer: [
    {
      title: 'Talk about your world',
      content: (
        <KangurLessonStack align='start'>
          <KangurLessonLead align='left'>
            Compare people, pets, sports, or school subjects around you.
          </KangurLessonLead>
          <div className={`${KANGUR_GRID_TIGHT_CLASSNAME} text-sm sm:grid-cols-2`}>
            <KangurLessonCallout accent='violet' padding='sm'>
              <p className='font-semibold text-slate-700'>Compare two things</p>
              <p className='mt-2 text-slate-700'>My backpack is bigger than my lunch bag.</p>
              <p className='mt-1 text-slate-700'>Math is easier than science today.</p>
            </KangurLessonCallout>
            <KangurLessonCallout accent='amber' padding='sm'>
              <p className='font-semibold text-slate-700'>Choose one winner</p>
              <p className='mt-2 text-slate-700'>Leo is the fastest runner in our team.</p>
              <p className='mt-1 text-slate-700'>This is the most beautiful picture in the room.</p>
            </KangurLessonCallout>
          </div>
          <KangurLessonCaption>
            Try one comparative sentence and one superlative sentence about your class.
          </KangurLessonCaption>
        </KangurLessonStack>
      ),
    },
    {
      title: 'Write and draw',
      content: (
        <KangurLessonStack align='start'>
          <KangurLessonLead align='left'>
            Draw three racers, towers, animals, or paintings. Then write which one is
            bigger, faster, funnier, or the most beautiful.
          </KangurLessonLead>
          <div className={`${KANGUR_GRID_TIGHT_CLASSNAME} text-sm sm:grid-cols-2`}>
            <KangurLessonCallout accent='sky' padding='sm'>
              <p className='font-semibold text-slate-700'>Starter 1</p>
              <p className='mt-2 text-slate-700'>The blue tower is taller than the red tower.</p>
            </KangurLessonCallout>
            <KangurLessonCallout accent='emerald' padding='sm'>
              <p className='font-semibold text-slate-700'>Starter 2</p>
              <p className='mt-2 text-slate-700'>The blue tower is the tallest tower.</p>
            </KangurLessonCallout>
          </div>
        </KangurLessonStack>
      ),
    },
  ],
  summary: [
    {
      title: 'Quick recap',
      content: (
        <KangurLessonStack align='start'>
          <KangurLessonLead align='left'>
            Keep these rules in mind when you compare.
          </KangurLessonLead>
          <KangurLessonCallout accent='violet' padding='sm'>
            <ul className='space-y-2 text-sm text-slate-700'>
              <li>Comparatives compare two things: taller, faster, better.</li>
              <li>Superlatives choose one winner in a group: the tallest, the fastest, the best.</li>
              <li>Long adjectives use more / the most.</li>
              <li>Special families matter: good → better → the best.</li>
            </ul>
          </KangurLessonCallout>
        </KangurLessonStack>
      ),
    },
  ],
});

const SECTION_META: Array<{
  id: SectionId;
  emoji: string;
  key: string;
  isGame?: boolean;
}> = [
  { id: 'intro', emoji: '⚖️', key: 'intro' },
  { id: 'form', emoji: '🔤', key: 'form' },
  { id: 'repair', emoji: '🛠️', key: 'repair' },
  { id: 'answer', emoji: '💬', key: 'answer' },
  { id: 'game_compare_and_crown', emoji: '👑', key: 'gameCompareAndCrown', isGame: true },
  { id: 'summary', emoji: '🧠', key: 'summary' },
];

export default function EnglishComparativesSuperlativesLesson(): React.JSX.Element {
  const shellTranslations = useTranslations(
    'KangurStaticLessons.englishComparativesSuperlativesShell'
  );

  const localizedSections = useMemo(
    () =>
      SECTION_META.map((section) => ({
        id: section.id,
        emoji: section.emoji,
        title: shellTranslations(`sections.${section.key}.title`),
        description: shellTranslations(`sections.${section.key}.description`),
        isGame: section.isGame,
      })),
    [shellTranslations]
  );

  const localizedSlides = useMemo(() => buildSlides(), []);

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
      lessonEmoji='👑'
      lessonTitle={shellTranslations('lessonTitle')}
      sections={localizedSections}
      slides={localizedSlides}
      gradientClass='kangur-gradient-accent-violet'
      progressDotClassName='bg-violet-300'
      dotActiveClass='bg-violet-500'
      dotDoneClass='bg-violet-300'
      completionSectionId='summary'
      autoRecordComplete
      scorePercent={130}
      skipMarkFor={['game_compare_and_crown']}
      games={[
        {
          sectionId: 'game_compare_and_crown',
          shell: {
            accent: 'violet',
            title: sectionTitles.game_compare_and_crown,
            icon: '👑',
            description: sectionDescriptions.game_compare_and_crown,
            maxWidthClassName: 'max-w-4xl',
            shellTestId: 'english-comparatives-game-shell',
          },
          launchableInstance: {
            gameId: 'english_compare_and_crown',
            instanceId: ENGLISH_COMPARE_AND_CROWN_INSTANCE_ID,
          },
        },
      ]}
    />
  );
}
