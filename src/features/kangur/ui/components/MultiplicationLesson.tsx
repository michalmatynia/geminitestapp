'use client';

import React, { useMemo } from 'react';

import { getKangurBuiltInGameInstanceId } from '@/features/kangur/games';
import type { LessonProps } from '@/features/kangur/lessons/lesson-ui-registry';
import type { LessonSlide } from '@/features/kangur/ui/components/LessonSlideSection';
import {
  MultiplicationArrayAnimation,
  MultiplicationCommutativeAnimation,
  MultiplicationDoubleDoubleAnimation,
  MultiplicationFiveRhythmAnimation,
  MultiplicationGamePreviewAnimation,
  MultiplicationGroupsAnimation,
  MultiplicationIntroPatternAnimation,
  MultiplicationSkipCountAnimation,
  MultiplicationTenShiftAnimation,
} from '@/features/kangur/ui/components/LessonAnimations';
import {
  KangurLessonCallout,
  KangurLessonCaption,
  KangurLessonChip,
  KangurLessonInset,
  KangurLessonLead,
  KangurLessonStack,
} from '@/features/kangur/ui/design/lesson-primitives';
import {
  KangurDisplayEmoji,
  KangurEquationDisplay,
  KangurStatusChip,
} from '@/features/kangur/ui/design/primitives';
import { useOptionalKangurLessonTemplate } from '@/features/kangur/ui/context/KangurLessonsRuntimeContext';
import { KangurUnifiedLesson } from '@/features/kangur/ui/lessons/lesson-components';
import {
  MULTIPLICATION_LESSON_COMPONENT_CONTENT,
  resolveMultiplicationLessonContent,
} from './multiplication-lesson-content';
import type { KangurMultiplicationLessonTemplateContent } from '@/shared/contracts/kangur-lesson-templates';

type SectionId = 'intro' | 'tabela23' | 'tabela45' | 'triki' | 'game_array';
type MultiplicationSlideSectionId = Exclude<SectionId, 'game_array'>;
type MultiplicationLessonCopy = KangurMultiplicationLessonTemplateContent;

const MULTIPLICATION_ARRAY_INSTANCE_ID = getKangurBuiltInGameInstanceId('multiplication_array');
const MULTIPLICATION_TABLE_23_BASES = [2, 3] as const;
const MULTIPLICATION_TABLE_45_BASES = [4, 5] as const;

const buildMultiplicationGamePrelude = (copy: MultiplicationLessonCopy): React.JSX.Element => (
  <KangurLessonCallout accent='violet' className='text-center'>
    <KangurLessonChip accent='violet' className='mb-2'>
      {copy.game.preludeChip}
    </KangurLessonChip>
    <div className='mx-auto w-full max-w-xs'>
      <MultiplicationGamePreviewAnimation />
    </div>
    <KangurLessonCaption className='mt-1'>{copy.game.preludeCaption}</KangurLessonCaption>
  </KangurLessonCallout>
);

const buildMultiplicationSlides = (
  copy: MultiplicationLessonCopy,
): Record<MultiplicationSlideSectionId, LessonSlide[]> => ({
  intro: [
    {
      title: copy.slides.intro.meaning.title,
      content: (
        <KangurLessonStack align='start'>
          <KangurLessonLead align='left'>{copy.slides.intro.meaning.lead}</KangurLessonLead>
          <KangurLessonCallout accent='rose' className='text-center'>
            <div className='flex items-center justify-center gap-2'>
              <KangurDisplayEmoji size='xs'>🍬</KangurDisplayEmoji>
              <KangurLessonChip accent='rose'>{copy.slides.intro.meaning.patternChip}</KangurLessonChip>
            </div>
            <div className='mx-auto w-full max-w-sm'>
              <MultiplicationIntroPatternAnimation />
            </div>
            <KangurLessonCaption className='mt-1'>
              {copy.slides.intro.meaning.patternCaption}
            </KangurLessonCaption>
          </KangurLessonCallout>
          <KangurLessonInset accent='violet' className='text-center'>
            <KangurEquationDisplay
              accent='violet'
              data-testid='multiplication-lesson-intro-equation'
              size='md'
            >
              {copy.slides.intro.meaning.equation}
            </KangurEquationDisplay>
            <KangurLessonCaption>{copy.slides.intro.meaning.equationCaption}</KangurLessonCaption>
          </KangurLessonInset>
        </KangurLessonStack>
      ),
    },
    {
      title: copy.slides.intro.groups.title,
      content: (
        <KangurLessonStack align='start'>
          <KangurLessonLead align='left'>{copy.slides.intro.groups.lead}</KangurLessonLead>
          <KangurLessonInset accent='emerald' className='text-center'>
            <KangurLessonChip accent='emerald' className='mb-2'>
              {copy.slides.intro.groups.groupsChip}
            </KangurLessonChip>
            <div className='mx-auto w-full max-w-sm'>
              <MultiplicationGroupsAnimation />
            </div>
            <KangurEquationDisplay accent='emerald' className='mt-2' size='sm'>
              {copy.slides.intro.groups.equation}
            </KangurEquationDisplay>
            <KangurLessonCaption className='mt-1'>{copy.slides.intro.groups.caption}</KangurLessonCaption>
          </KangurLessonInset>
        </KangurLessonStack>
      ),
    },
  ],
  tabela23: [
    {
      title: copy.slides.tabela23.basics.title,
      content: (
        <KangurLessonStack align='start'>
          <KangurLessonLead align='left'>{copy.slides.tabela23.basics.lead}</KangurLessonLead>
          <div className='grid w-full grid-cols-1 gap-2 min-[420px]:grid-cols-2'>
            {MULTIPLICATION_TABLE_23_BASES.map((base) => (
              <KangurLessonCallout
                key={base}
                accent={base === 2 ? 'sky' : 'violet'}
                className='w-full rounded-xl'
                padding='sm'
              >
                <KangurStatusChip
                  accent={base === 2 ? 'sky' : 'violet'}
                  className='mb-2 flex w-full justify-center text-[11px] font-extrabold'
                  size='sm'
                >
                  × {base}
                </KangurStatusChip>
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                  <p key={n} className='text-center text-xs [color:var(--kangur-page-text)]'>
                    {n} × {base} = <b>{n * base}</b>
                  </p>
                ))}
              </KangurLessonCallout>
            ))}
          </div>
          <KangurLessonInset accent='sky' className='text-center'>
            <KangurLessonChip accent='sky' className='mb-2'>
              {copy.slides.tabela23.basics.skipCountChip}
            </KangurLessonChip>
            <div className='mx-auto w-full max-w-sm'>
              <MultiplicationSkipCountAnimation />
            </div>
            <KangurLessonCaption className='mt-1'>
              {copy.slides.tabela23.basics.caption}
            </KangurLessonCaption>
          </KangurLessonInset>
        </KangurLessonStack>
      ),
    },
  ],
  tabela45: [
    {
      title: copy.slides.tabela45.basics.title,
      content: (
        <KangurLessonStack align='start'>
          <KangurLessonLead align='left'>{copy.slides.tabela45.basics.lead}</KangurLessonLead>
          <div className='grid w-full grid-cols-1 gap-2 min-[420px]:grid-cols-2'>
            {MULTIPLICATION_TABLE_45_BASES.map((base) => (
              <KangurLessonCallout
                key={base}
                accent='indigo'
                className='w-full rounded-xl'
                padding='sm'
              >
                <KangurStatusChip
                  accent='indigo'
                  className='mb-2 flex w-full justify-center text-[11px] font-extrabold'
                  size='sm'
                >
                  × {base}
                </KangurStatusChip>
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                  <p key={n} className='text-center text-xs [color:var(--kangur-page-text)]'>
                    {n} × {base} = <b>{n * base}</b>
                  </p>
                ))}
              </KangurLessonCallout>
            ))}
          </div>
          <div className='grid grid-cols-1 gap-2 min-[420px]:grid-cols-2'>
            <KangurLessonInset accent='rose' className='text-center'>
              <KangurLessonChip accent='rose' className='mb-2'>
                {copy.slides.tabela45.basics.doubleChip}
              </KangurLessonChip>
              <div className='mx-auto w-full max-w-xs'>
                <MultiplicationDoubleDoubleAnimation />
              </div>
              <KangurLessonCaption className='mt-1'>
                {copy.slides.tabela45.basics.doubleCaption}
              </KangurLessonCaption>
            </KangurLessonInset>
            <KangurLessonInset accent='amber' className='text-center'>
              <KangurLessonChip accent='amber' className='mb-2'>
                {copy.slides.tabela45.basics.rhythmChip}
              </KangurLessonChip>
              <div className='mx-auto w-full max-w-xs'>
                <MultiplicationFiveRhythmAnimation />
              </div>
              <KangurLessonCaption className='mt-1'>
                {copy.slides.tabela45.basics.rhythmCaption}
              </KangurLessonCaption>
            </KangurLessonInset>
          </div>
        </KangurLessonStack>
      ),
    },
    {
      title: copy.slides.tabela45.array.title,
      content: (
        <KangurLessonStack>
          <KangurLessonLead align='left'>{copy.slides.tabela45.array.lead}</KangurLessonLead>
          <KangurLessonCallout accent='teal' className='text-center'>
            <KangurLessonChip accent='teal' className='mb-2'>
              {copy.slides.tabela45.array.arrayChip}
            </KangurLessonChip>
            <div className='mx-auto w-full max-w-sm'>
              <MultiplicationArrayAnimation />
            </div>
            <KangurEquationDisplay accent='teal' className='mt-2' size='sm'>
              {copy.slides.tabela45.array.equation}
            </KangurEquationDisplay>
            <KangurLessonCaption className='mt-1'>
              {copy.slides.tabela45.array.caption}
            </KangurLessonCaption>
          </KangurLessonCallout>
        </KangurLessonStack>
      ),
    },
  ],
  triki: [
    {
      title: copy.slides.triki.shortcuts.title,
      content: (
        <KangurLessonStack align='start' className='kangur-panel-gap'>
          <KangurLessonLead align='left'>{copy.slides.triki.shortcuts.lead}</KangurLessonLead>
          <div className='grid grid-cols-1 kangur-panel-gap min-[420px]:grid-cols-[1.2fr_1fr]'>
            <KangurLessonCallout accent='amber' className='w-full'>
              <ul className='space-y-2 text-sm [color:var(--kangur-page-text)]'>
                {copy.slides.triki.shortcuts.rules.map((rule) => (
                  <li key={rule}>{rule}</li>
                ))}
              </ul>
            </KangurLessonCallout>
            <KangurLessonInset accent='teal' className='text-center'>
              <KangurLessonChip accent='teal' className='mb-2'>
                {copy.slides.triki.shortcuts.tenShiftChip}
              </KangurLessonChip>
              <div className='mx-auto w-full max-w-xs'>
                <MultiplicationTenShiftAnimation />
              </div>
              <KangurLessonCaption className='mt-1'>
                {copy.slides.triki.shortcuts.tenShiftCaption}
              </KangurLessonCaption>
            </KangurLessonInset>
          </div>
        </KangurLessonStack>
      ),
    },
    {
      title: copy.slides.triki.commutative.title,
      content: (
        <KangurLessonStack>
          <KangurLessonLead align='left'>{copy.slides.triki.commutative.lead}</KangurLessonLead>
          <KangurLessonInset accent='sky' className='max-w-sm text-center'>
            <KangurLessonChip accent='sky' className='mb-2'>
              {copy.slides.triki.commutative.swapChip}
            </KangurLessonChip>
            <div className='mx-auto w-full max-w-xs'>
              <MultiplicationCommutativeAnimation />
            </div>
            <KangurLessonCaption className='mt-2'>
              {copy.slides.triki.commutative.caption}
            </KangurLessonCaption>
          </KangurLessonInset>
        </KangurLessonStack>
      ),
    },
  ],
});

const buildMultiplicationSections = (copy: MultiplicationLessonCopy) => [
  {
    id: 'intro',
    emoji: '🍬',
    title: copy.sections.intro.title,
    description: copy.sections.intro.description,
  },
  {
    id: 'tabela23',
    emoji: '📋',
    title: copy.sections.tabela23.title,
    description: copy.sections.tabela23.description,
  },
  {
    id: 'tabela45',
    emoji: '📋',
    title: copy.sections.tabela45.title,
    description: copy.sections.tabela45.description,
  },
  {
    id: 'triki',
    emoji: '🧠',
    title: copy.sections.triki.title,
    description: copy.sections.triki.description,
  },
  {
    id: 'game_array',
    emoji: '✨',
    title: copy.sections.gameArray.title,
    description: copy.sections.gameArray.description,
    isGame: true,
  },
] as const;

export const SLIDES = buildMultiplicationSlides(MULTIPLICATION_LESSON_COMPONENT_CONTENT);
export const HUB_SECTIONS = buildMultiplicationSections(MULTIPLICATION_LESSON_COMPONENT_CONTENT);

export default function MultiplicationLesson({ lessonTemplate }: LessonProps): React.JSX.Element {
  const runtimeTemplate = useOptionalKangurLessonTemplate('multiplication');
  const resolvedTemplate = lessonTemplate ?? runtimeTemplate;
  const copy = useMemo(
    () => resolveMultiplicationLessonContent(resolvedTemplate),
    [resolvedTemplate],
  );
  const slides = useMemo(() => buildMultiplicationSlides(copy), [copy]);
  const sections = useMemo(() => buildMultiplicationSections(copy), [copy]);
  const gamePrelude = useMemo(() => buildMultiplicationGamePrelude(copy), [copy]);

  return (
    <KangurUnifiedLesson
      progressMode='panel'
      lessonId='multiplication'
      lessonEmoji='✖️'
      lessonTitle={resolvedTemplate?.title?.trim() || copy.lessonTitle}
      sections={sections}
      slides={slides}
      gradientClass='kangur-gradient-accent-indigo'
      progressDotClassName='bg-purple-300'
      dotActiveClass='bg-purple-500'
      dotDoneClass='bg-purple-300'
      skipMarkFor={['game_array']}
      games={[
        {
          sectionId: 'game_array',
          shell: {
            accent: 'violet',
            bodyPrelude: gamePrelude,
            icon: '✨',
            maxWidthClassName: 'max-w-sm',
            headerTestId: 'multiplication-lesson-game-array-header',
            shellTestId: 'multiplication-lesson-game-array-shell',
            title: copy.game.stageTitle,
          },
          launchableInstance: {
            gameId: 'multiplication_array',
            instanceId: MULTIPLICATION_ARRAY_INSTANCE_ID,
          },
        },
      ]}
    />
  );
}
