'use client';

import type { JSX } from 'react';

import { getKangurLessonStageGameRuntimeSpec } from '@/features/kangur/games/lesson-stage-runtime-specs';
import type { LessonSlide } from '@/features/kangur/ui/components/LessonSlideSection';
import {
  KangurLessonCallout,
  KangurLessonCaption,
  KangurLessonChip,
  KangurLessonInset,
  KangurLessonLead,
  KangurLessonStack,
} from '@/features/kangur/ui/design/lesson-primitives';
import { KangurUnifiedLesson } from '@/features/kangur/ui/lessons/lesson-components';

type SectionId = 'warmCool' | 'pairing' | 'gameHarmony' | 'lookAround' | 'summary';

const ART_COLOR_HARMONY_RUNTIME = getKangurLessonStageGameRuntimeSpec(
  'art_color_harmony_studio_lesson_stage'
);

type ColorCardProps = {
  accent: 'amber' | 'rose' | 'sky' | 'emerald';
  colorClassName: string;
  label: string;
  note: string;
};

const ColorCard = ({
  accent,
  colorClassName,
  label,
  note,
}: ColorCardProps): JSX.Element => (
  <KangurLessonCallout accent={accent} className='text-center'>
    <div className={`mx-auto h-20 w-20 rounded-[26px] shadow-inner ${colorClassName}`} />
    <div className='mt-3 text-lg font-bold [color:var(--kangur-page-text)]'>{label}</div>
    <KangurLessonCaption className='mt-2'>{note}</KangurLessonCaption>
  </KangurLessonCallout>
);

const sections = [
  {
    id: 'warmCool',
    emoji: '🌈',
    title: 'Warm and cool colors',
    description: 'Meet color families and notice the mood they create.',
  },
  {
    id: 'pairing',
    emoji: '🫶',
    title: 'Colors that work together',
    description: 'Practice making calm and happy color pairs.',
  },
  {
    id: 'gameHarmony',
    emoji: '🎮',
    title: 'Color studio game',
    description: 'Pick the palette that feels warm, cool, or balanced.',
  },
  {
    id: 'lookAround',
    emoji: '👀',
    title: 'Find colors around you',
    description: 'Spot color harmony in clothes, toys, and pictures.',
  },
  {
    id: 'summary',
    emoji: '⭐',
    title: 'Color artist recap',
    description: 'Remember how to build a simple, friendly palette.',
  },
] as const;

const slides: Partial<Record<SectionId, LessonSlide[]>> = {
  warmCool: [
    {
      title: 'Warm colors feel sunny',
      content: (
        <KangurLessonStack>
          <KangurLessonLead>
            Reds, oranges, and yellows can feel bright, warm, and energetic.
          </KangurLessonLead>
          <div className='grid w-full gap-4 sm:grid-cols-3'>
            <ColorCard
              accent='rose'
              colorClassName='bg-gradient-to-br from-rose-300 via-rose-400 to-orange-400'
              label='Red'
              note='Strong and lively'
            />
            <ColorCard
              accent='amber'
              colorClassName='bg-gradient-to-br from-orange-300 via-orange-400 to-amber-400'
              label='Orange'
              note='Playful and cozy'
            />
            <ColorCard
              accent='amber'
              colorClassName='bg-gradient-to-br from-amber-200 via-yellow-300 to-amber-400'
              label='Yellow'
              note='Sunny and cheerful'
            />
          </div>
        </KangurLessonStack>
      ),
    },
    {
      title: 'Cool colors feel calm',
      content: (
        <KangurLessonStack>
          <KangurLessonLead>
            Blues, greens, and violets can feel fresh, quiet, and peaceful.
          </KangurLessonLead>
          <div className='grid w-full gap-4 sm:grid-cols-3'>
            <ColorCard
              accent='sky'
              colorClassName='bg-gradient-to-br from-sky-200 via-sky-400 to-cyan-500'
              label='Blue'
              note='Light and airy'
            />
            <ColorCard
              accent='emerald'
              colorClassName='bg-gradient-to-br from-emerald-200 via-emerald-400 to-lime-400'
              label='Green'
              note='Natural and restful'
            />
            <ColorCard
              accent='rose'
              colorClassName='bg-gradient-to-br from-violet-200 via-violet-400 to-fuchsia-400'
              label='Violet'
              note='Dreamy and soft'
            />
          </div>
        </KangurLessonStack>
      ),
    },
  ],
  pairing: [
    {
      title: 'Build a happy pair',
      content: (
        <KangurLessonStack>
          <KangurLessonLead>
            Color harmony means choosing colors that feel nice together instead of noisy.
          </KangurLessonLead>
          <div className='flex flex-wrap justify-center gap-2'>
            <KangurLessonChip accent='amber'>yellow + orange</KangurLessonChip>
            <KangurLessonChip accent='sky'>blue + green</KangurLessonChip>
            <KangurLessonChip accent='rose'>pink + violet</KangurLessonChip>
          </div>
          <KangurLessonInset accent='rose'>
            A simple trick: start with one favorite color and add one close neighbor from the rainbow.
          </KangurLessonInset>
        </KangurLessonStack>
      ),
    },
    {
      title: 'Use one bright color and one quiet color',
      content: (
        <KangurLessonStack>
          <div className='grid w-full gap-4 sm:grid-cols-2'>
            <KangurLessonCallout accent='amber'>
              <div className='mb-3 flex gap-2'>
                <span className='h-10 w-10 rounded-2xl bg-amber-300' />
                <span className='h-10 w-10 rounded-2xl bg-amber-100' />
              </div>
              <strong>Bright + soft</strong>
              <KangurLessonCaption className='mt-2' align='left'>
                A bright color can shine when the second color feels gentle.
              </KangurLessonCaption>
            </KangurLessonCallout>
            <KangurLessonCallout accent='sky'>
              <div className='mb-3 flex gap-2'>
                <span className='h-10 w-10 rounded-2xl bg-sky-500' />
                <span className='h-10 w-10 rounded-2xl bg-emerald-300' />
              </div>
              <strong>Two friendly neighbors</strong>
              <KangurLessonCaption className='mt-2' align='left'>
                Colors close to each other often look smooth and balanced.
              </KangurLessonCaption>
            </KangurLessonCallout>
          </div>
        </KangurLessonStack>
      ),
    },
  ],
  gameHarmony: [],
  lookAround: [
    {
      title: 'Where can you see harmony?',
      content: (
        <KangurLessonStack>
          <KangurLessonLead>
            Try looking at a picture book, a flower, or your clothes. Which two colors look good together?
          </KangurLessonLead>
          <div className='grid w-full gap-4 sm:grid-cols-3'>
            <KangurLessonCallout accent='emerald'>
              <div className='text-3xl'>🌷</div>
              <KangurLessonCaption className='mt-2'>Flowers often mix gentle pinks and greens.</KangurLessonCaption>
            </KangurLessonCallout>
            <KangurLessonCallout accent='sky'>
              <div className='text-3xl'>🧸</div>
              <KangurLessonCaption className='mt-2'>Toys use a few strong colors to stay playful.</KangurLessonCaption>
            </KangurLessonCallout>
            <KangurLessonCallout accent='amber'>
              <div className='text-3xl'>📘</div>
              <KangurLessonCaption className='mt-2'>Book covers often pair one main color with one helper color.</KangurLessonCaption>
            </KangurLessonCallout>
          </div>
        </KangurLessonStack>
      ),
    },
  ],
  summary: [
    {
      title: 'Your art rulebook',
      content: (
        <div className='flex flex-col gap-4'>
          {[
            'Warm colors can feel sunny and active.',
            'Cool colors can feel calm and gentle.',
            'Two neighboring colors often make a nice pair.',
            'One strong color and one soft color can balance each other.',
          ].map((rule) => (
            <KangurLessonCallout
              key={rule}
              accent='rose'
              className='text-sm [color:var(--kangur-page-text)]'
              padding='sm'
            >
              {rule}
            </KangurLessonCallout>
          ))}
        </div>
      ),
    },
  ],
};

export default function ArtColorsHarmonyLesson(): JSX.Element {
  return (
    <KangurUnifiedLesson
      progressMode='panel'
      lessonId='art_colors_harmony'
      lessonEmoji='🎨'
      lessonTitle='Harmony of colors'
      sections={sections}
      slides={slides}
      gradientClass='kangur-gradient-accent-rose'
      progressDotClassName='bg-rose-300'
      dotActiveClass='bg-rose-500'
      dotDoneClass='bg-rose-300'
      completionSectionId='summary'
      autoRecordComplete
      scorePercent={100}
      skipMarkFor={['gameHarmony']}
      games={[
        {
          sectionId: 'gameHarmony',
          stage: {
            accent: 'rose',
            icon: '🎮',
            shellTestId: 'art-colors-harmony-game-shell',
            title: 'Color studio game',
            description: 'Choose the palette that feels warm, calm, smooth, or balanced.',
          },
          runtime: ART_COLOR_HARMONY_RUNTIME,
        },
      ]}
    />
  );
}
