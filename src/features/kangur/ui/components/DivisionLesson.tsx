'use client';

import { useMemo } from 'react';

import { getKangurBuiltInGameInstanceId } from '@/features/kangur/games';
import type { LessonProps } from '@/features/kangur/lessons/lesson-ui-registry';
import type { LessonSlide } from '@/features/kangur/ui/components/LessonSlideSection';
import {
  DivisionEqualGroupsAnimation,
  DivisionInverseAnimation,
  DivisionRemainderAnimation,
} from '@/features/kangur/ui/components/LessonAnimations';
import {
  KangurLessonCallout,
  KangurLessonCaption,
  KangurLessonLead,
  KangurLessonStack,
} from '@/features/kangur/ui/design/lesson-primitives';
import {
  KangurDisplayEmoji,
  KangurEquationDisplay,
} from '@/features/kangur/ui/design/primitives';
import { KANGUR_STACK_TIGHT_CLASSNAME } from '@/features/kangur/ui/design/tokens';
import { useOptionalKangurLessonTemplate } from '@/features/kangur/ui/context/KangurLessonsRuntimeContext';
import { KangurUnifiedLesson } from '@/features/kangur/ui/lessons/lesson-components';
import {
  DIVISION_LESSON_COMPONENT_CONTENT,
  resolveDivisionLessonContent,
} from './division-lesson-content';
import type { KangurDivisionLessonTemplateContent } from '@/shared/contracts/kangur-lesson-templates';

type SectionId = 'intro' | 'odwrotnosc' | 'reszta' | 'zapamietaj' | 'game';
type DivisionSlideSectionId = Exclude<SectionId, 'game'>;
type DivisionLessonCopy = KangurDivisionLessonTemplateContent;

const DIVISION_GROUPS_INSTANCE_ID = getKangurBuiltInGameInstanceId('division_groups');

const buildDivisionSlides = (
  copy: DivisionLessonCopy,
): Record<DivisionSlideSectionId, LessonSlide[]> => ({
  intro: [
    {
      title: copy.slides.intro.meaning.title,
      content: (
        <KangurLessonStack>
          <KangurLessonLead>{copy.slides.intro.meaning.lead}</KangurLessonLead>
          <KangurLessonStack gap='sm'>
            <KangurDisplayEmoji size='sm'>🍪🍪🍪🍪🍪🍪</KangurDisplayEmoji>
            <KangurLessonCaption>{copy.slides.intro.meaning.exampleCaption}</KangurLessonCaption>
            <KangurEquationDisplay accent='sky' size='md'>
              {copy.slides.intro.meaning.equation}
            </KangurEquationDisplay>
            <div className='flex kangur-panel-gap'>
              <KangurDisplayEmoji size='xs'>{copy.slides.intro.meaning.groupOne}</KangurDisplayEmoji>
              <KangurDisplayEmoji size='xs'>{copy.slides.intro.meaning.groupTwo}</KangurDisplayEmoji>
            </div>
          </KangurLessonStack>
        </KangurLessonStack>
      ),
    },
    {
      title: copy.slides.intro.equalGroupsAnimation.title,
      content: (
        <KangurLessonStack>
          <KangurLessonLead>{copy.slides.intro.equalGroupsAnimation.lead}</KangurLessonLead>
          <KangurLessonCallout accent='sky' className='text-center'>
            <div className='mx-auto w-full max-w-sm'>
              <DivisionEqualGroupsAnimation />
            </div>
            <KangurEquationDisplay accent='sky' className='mt-2' size='sm'>
              {copy.slides.intro.equalGroupsAnimation.equation}
            </KangurEquationDisplay>
            <KangurLessonCaption className='mt-1'>
              {copy.slides.intro.equalGroupsAnimation.caption}
            </KangurLessonCaption>
          </KangurLessonCallout>
        </KangurLessonStack>
      ),
    },
  ],
  odwrotnosc: [
    {
      title: copy.slides.odwrotnosc.basics.title,
      content: (
        <KangurLessonStack>
          <KangurLessonLead>{copy.slides.odwrotnosc.basics.lead}</KangurLessonLead>
          <KangurLessonCallout accent='sky' className='max-w-xs'>
            <div className={`${KANGUR_STACK_TIGHT_CLASSNAME} text-center`}>
              <p className='[color:var(--kangur-page-text)]'>
                {copy.slides.odwrotnosc.basics.multiplicationEquation.split('=')[0]?.trim()} ={' '}
                <b>{copy.slides.odwrotnosc.basics.multiplicationEquation.split('=')[1]?.trim()}</b>
              </p>
              <div className='flex flex-wrap justify-center kangur-panel-gap'>
                <KangurEquationDisplay accent='sky' size='sm'>
                  {copy.slides.odwrotnosc.basics.divisionEquationA}
                </KangurEquationDisplay>
                <KangurEquationDisplay accent='sky' size='sm'>
                  {copy.slides.odwrotnosc.basics.divisionEquationB}
                </KangurEquationDisplay>
              </div>
            </div>
          </KangurLessonCallout>
          <KangurLessonCaption>{copy.slides.odwrotnosc.basics.caption}</KangurLessonCaption>
        </KangurLessonStack>
      ),
    },
    {
      title: copy.slides.odwrotnosc.animation.title,
      content: (
        <KangurLessonStack>
          <KangurLessonLead>{copy.slides.odwrotnosc.animation.lead}</KangurLessonLead>
          <KangurLessonCallout accent='sky' className='text-center'>
            <div className='mx-auto w-full max-w-sm'>
              <DivisionInverseAnimation />
            </div>
            <KangurLessonCaption className='mt-2'>
              {copy.slides.odwrotnosc.animation.caption}
            </KangurLessonCaption>
          </KangurLessonCallout>
        </KangurLessonStack>
      ),
    },
  ],
  reszta: [
    {
      title: copy.slides.reszta.basics.title,
      content: (
        <KangurLessonStack>
          <KangurLessonLead>{copy.slides.reszta.basics.lead}</KangurLessonLead>
          <KangurLessonCallout accent='teal' className='max-w-xs text-center'>
            <KangurEquationDisplay accent='teal' data-testid='division-lesson-remainder-equation'>
              {copy.slides.reszta.basics.promptEquation}
            </KangurEquationDisplay>
            <KangurLessonCaption className='mt-2'>
              {copy.slides.reszta.basics.reasoningCaption}
            </KangurLessonCaption>
            <KangurEquationDisplay accent='teal' className='mt-1' size='md'>
              {copy.slides.reszta.basics.resultEquation}
            </KangurEquationDisplay>
          </KangurLessonCallout>
          <KangurDisplayEmoji size='xs'>{copy.slides.reszta.basics.exampleEmojiRow}</KangurDisplayEmoji>
          <KangurLessonCaption>{copy.slides.reszta.basics.exampleCaption}</KangurLessonCaption>
        </KangurLessonStack>
      ),
    },
    {
      title: copy.slides.reszta.animation.title,
      content: (
        <KangurLessonStack>
          <KangurLessonLead>{copy.slides.reszta.animation.lead}</KangurLessonLead>
          <KangurLessonCallout accent='teal' className='text-center'>
            <div className='mx-auto w-full max-w-sm'>
              <DivisionRemainderAnimation />
            </div>
            <KangurEquationDisplay accent='teal' className='mt-2' size='sm'>
              {copy.slides.reszta.animation.equation}
            </KangurEquationDisplay>
            <KangurLessonCaption className='mt-1'>
              {copy.slides.reszta.animation.caption}
            </KangurLessonCaption>
          </KangurLessonCallout>
        </KangurLessonStack>
      ),
    },
  ],
  zapamietaj: [
    {
      title: copy.slides.zapamietaj.rules.title,
      content: (
        <KangurLessonStack>
          <KangurLessonCallout accent='amber' className='max-w-xs'>
            <ul className='space-y-2 text-sm [color:var(--kangur-page-text)]'>
              {copy.slides.zapamietaj.rules.items.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </KangurLessonCallout>
        </KangurLessonStack>
      ),
    },
    {
      title: copy.slides.zapamietaj.equalGroups.title,
      content: (
        <KangurLessonStack>
          <KangurLessonCallout
            accent='sky'
            className='w-full max-w-md text-center'
            padding='sm'
          >
            <div className='mx-auto w-full max-w-[320px]'>
              <DivisionEqualGroupsAnimation />
            </div>
            <KangurLessonCaption className='mt-2'>
              {copy.slides.zapamietaj.equalGroups.caption}
            </KangurLessonCaption>
          </KangurLessonCallout>
        </KangurLessonStack>
      ),
    },
    {
      title: copy.slides.zapamietaj.inverse.title,
      content: (
        <KangurLessonStack>
          <KangurLessonCallout
            accent='indigo'
            className='w-full max-w-md text-center'
            padding='sm'
          >
            <div className='mx-auto w-full max-w-[320px]'>
              <DivisionInverseAnimation />
            </div>
            <KangurLessonCaption className='mt-2'>
              {copy.slides.zapamietaj.inverse.caption}
            </KangurLessonCaption>
          </KangurLessonCallout>
        </KangurLessonStack>
      ),
    },
    {
      title: copy.slides.zapamietaj.remainder.title,
      content: (
        <KangurLessonStack>
          <KangurLessonCallout
            accent='teal'
            className='w-full max-w-md text-center'
            padding='sm'
          >
            <div className='mx-auto w-full max-w-[320px]'>
              <DivisionRemainderAnimation />
            </div>
            <KangurLessonCaption className='mt-2'>
              {copy.slides.zapamietaj.remainder.caption}
            </KangurLessonCaption>
          </KangurLessonCallout>
        </KangurLessonStack>
      ),
    },
  ],
});

const buildDivisionSections = (copy: DivisionLessonCopy) =>
  [
    {
      id: 'intro',
      emoji: '÷',
      title: copy.sections.intro.title,
      description: copy.sections.intro.description,
    },
    {
      id: 'odwrotnosc',
      emoji: '🔄',
      title: copy.sections.odwrotnosc.title,
      description: copy.sections.odwrotnosc.description,
    },
    {
      id: 'reszta',
      emoji: '🍫',
      title: copy.sections.reszta.title,
      description: copy.sections.reszta.description,
    },
    {
      id: 'zapamietaj',
      emoji: '🧠',
      title: copy.sections.zapamietaj.title,
      description: copy.sections.zapamietaj.description,
    },
    {
      id: 'game',
      emoji: '🎮',
      title: copy.sections.game.title,
      description: copy.sections.game.description,
      isGame: true,
    },
  ] as const;

export const SLIDES = buildDivisionSlides(DIVISION_LESSON_COMPONENT_CONTENT);
export const HUB_SECTIONS = buildDivisionSections(DIVISION_LESSON_COMPONENT_CONTENT);

export default function DivisionLesson({
  lessonTemplate,
}: LessonProps): React.JSX.Element {
  const runtimeTemplate = useOptionalKangurLessonTemplate('division');
  const resolvedTemplate = lessonTemplate ?? runtimeTemplate;
  const copy = useMemo(() => resolveDivisionLessonContent(resolvedTemplate), [resolvedTemplate]);
  const sections = buildDivisionSections(copy);
  const slides = buildDivisionSlides(copy);

  return (
    <KangurUnifiedLesson
      progressMode='panel'
      lessonId='division'
      lessonEmoji='➗'
      lessonTitle={resolvedTemplate?.title?.trim() || copy.lessonTitle}
      sections={sections}
      slides={slides}
      gradientClass='kangur-gradient-accent-teal'
      progressDotClassName='bg-blue-300'
      dotActiveClass='bg-blue-500'
      dotDoneClass='bg-blue-300'
      skipMarkFor={['game']}
      games={[
        {
          sectionId: 'game',
          shell: {
            accent: 'sky',
            title: copy.game.gameTitle ?? copy.game.stageTitle ?? 'Gra z dzieleniem!',
            icon: '🎮',
            maxWidthClassName: 'max-w-none',
            headerTestId: 'division-lesson-game-header',
            shellTestId: 'division-lesson-game-shell',
          },
          launchableInstance: {
            gameId: 'division_groups',
            instanceId: DIVISION_GROUPS_INSTANCE_ID,
          },
        },
      ]}
    />
  );
}
