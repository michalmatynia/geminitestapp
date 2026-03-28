'use client';

import type { LessonProps } from '@/features/kangur/lessons/lesson-ui-registry';
import { resolveKangurLessonTemplateComponentContent } from '@/features/kangur/lessons/lesson-template-component-content';
import { useOptionalKangurLessonTemplate } from '@/features/kangur/ui/context/KangurLessonsRuntimeContext';
import { useMemo } from 'react';
import { useTranslations } from 'next-intl';

import { getKangurBuiltInGameInstanceId } from '@/features/kangur/games';
import type { LessonSlide } from '@/features/kangur/ui/components/LessonSlideSection';
import {
  ArithmeticReverseAnimation,
  ArithmeticStepAnimation,
  FibonacciSumAnimation,
  GeometricDotsAnimation,
  GeometricGrowthAnimation,
  PatternCycleAnimation,
  PatternMissingAnimation,
  PatternUnitAnimation,
  RuleChecklistAnimation,
  RuleCheckAnimation,
} from './LogicalPatternsAnimations';
import {
  KangurLessonCallout,
  KangurLessonCaption,
  KangurLessonLead,
  KangurLessonStack,
} from '@/features/kangur/ui/design/lesson-primitives';
import { KangurUnifiedLesson } from '@/features/kangur/ui/lessons/lesson-components';
import type { LessonTranslate } from './lesson-copy';
import {
  createLogicalPatternsLessonContentFromTranslate,
  LOGICAL_PATTERNS_LESSON_COMPONENT_CONTENT,
} from './logical-patterns-lesson-content';
import type { KangurLogicalPatternsLessonTemplateContent } from '@/shared/contracts/kangur-lesson-templates';

type SectionId = 'intro' | 'ciagi_arytm' | 'ciagi_geom' | 'strategie' | 'game_warsztat';
type SlideSectionId = Exclude<SectionId, 'game_warsztat'>;
type LogicalPatternsLessonCopy = KangurLogicalPatternsLessonTemplateContent;

const buildLogicalPatternsSlides = (
  copy: LogicalPatternsLessonCopy
): Record<SlideSectionId, LessonSlide[]> => ({
  intro: [
    {
      title: copy.slides.intro.whatIsPattern.title,
      content: (
        <KangurLessonStack>
          <KangurLessonLead>{copy.slides.intro.whatIsPattern.lead}</KangurLessonLead>
          <KangurLessonCallout
            accent='violet'
            className='w-full text-sm [color:var(--kangur-page-muted-text)]'
          >
            <p className='mb-2 font-semibold text-violet-700'>
              {copy.slides.intro.whatIsPattern.everywhereLabel}
            </p>
            <ul className='space-y-1'>
              {Object.values(copy.slides.intro.whatIsPattern.examples).map((example) => (
                <li key={example}>{example}</li>
              ))}
            </ul>
          </KangurLessonCallout>
        </KangurLessonStack>
      ),
    },
    {
      title: copy.slides.intro.colorsAndShapes.title,
      content: (
        <KangurLessonStack>
          <KangurLessonLead>{copy.slides.intro.colorsAndShapes.lead}</KangurLessonLead>
          <div className='flex w-full flex-col kangur-panel-gap'>
            {Object.values(copy.slides.intro.colorsAndShapes.examples).map(({ label, seq, answer }) => (
              <KangurLessonCallout
                key={label}
                accent='slate'
                className='border-violet-100/90 text-center'
                padding='sm'
              >
                <KangurLessonCaption className='mb-1'>{label}</KangurLessonCaption>
                <p className='text-2xl tracking-widest'>{seq}</p>
                <p className='mt-1 text-sm font-bold text-violet-600'>
                  {copy.slides.intro.colorsAndShapes.answerLabel} {answer}
                </p>
              </KangurLessonCallout>
            ))}
          </div>
        </KangurLessonStack>
      ),
    },
    {
      title: copy.slides.intro.patternUnit.title,
      content: (
        <KangurLessonStack>
          <KangurLessonLead>{copy.slides.intro.patternUnit.lead}</KangurLessonLead>
          <KangurLessonCallout accent='violet' className='w-full text-center' padding='sm'>
            <div className='mx-auto h-20 w-72 max-w-full'>
              <PatternUnitAnimation />
            </div>
            <KangurLessonCaption className='mt-2'>
              {copy.slides.intro.patternUnit.caption}
            </KangurLessonCaption>
          </KangurLessonCallout>
        </KangurLessonStack>
      ),
    },
    {
      title: copy.slides.intro.missingElement.title,
      content: (
        <KangurLessonStack>
          <KangurLessonLead>{copy.slides.intro.missingElement.lead}</KangurLessonLead>
          <KangurLessonCallout accent='violet' className='w-full text-center' padding='sm'>
            <div className='mx-auto h-20 w-72 max-w-full'>
              <PatternMissingAnimation />
            </div>
            <KangurLessonCaption className='mt-2'>
              {copy.slides.intro.missingElement.caption}
            </KangurLessonCaption>
          </KangurLessonCallout>
        </KangurLessonStack>
      ),
    },
    {
      title: copy.slides.intro.threeElementPattern.title,
      content: (
        <KangurLessonStack>
          <KangurLessonLead>{copy.slides.intro.threeElementPattern.lead}</KangurLessonLead>
          <KangurLessonCallout accent='violet' className='w-full text-center' padding='sm'>
            <div className='mx-auto h-20 w-72 max-w-full'>
              <PatternCycleAnimation />
            </div>
            <KangurLessonCaption className='mt-2'>
              {copy.slides.intro.threeElementPattern.caption}
            </KangurLessonCaption>
          </KangurLessonCallout>
        </KangurLessonStack>
      ),
    },
  ],
  ciagi_arytm: [
    {
      title: copy.slides.ciagi_arytm.addition.title,
      content: (
        <KangurLessonStack>
          <KangurLessonLead>{copy.slides.ciagi_arytm.addition.lead}</KangurLessonLead>
          <div className='flex w-full flex-col kangur-panel-gap'>
            {Object.values(copy.slides.ciagi_arytm.addition.examples).map(({ hint, seq, answer }) => (
              <KangurLessonCallout key={hint} accent='violet' padding='sm'>
                <KangurLessonCaption className='mb-1'>{hint}</KangurLessonCaption>
                <p className='text-lg font-extrabold text-violet-700'>{seq}</p>
                <KangurLessonCaption className='mt-1'>
                  {copy.slides.ciagi_arytm.addition.answerLabel} <b>{answer}</b>
                </KangurLessonCaption>
              </KangurLessonCallout>
            ))}
          </div>
        </KangurLessonStack>
      ),
    },
    {
      title: copy.slides.ciagi_arytm.constantStep.title,
      content: (
        <KangurLessonStack>
          <KangurLessonLead>{copy.slides.ciagi_arytm.constantStep.lead}</KangurLessonLead>
          <KangurLessonCallout accent='violet' className='w-full text-center' padding='sm'>
            <div className='mx-auto h-24 w-72 max-w-full'>
              <ArithmeticStepAnimation />
            </div>
            <KangurLessonCaption className='mt-2'>
              {copy.slides.ciagi_arytm.constantStep.caption}
            </KangurLessonCaption>
          </KangurLessonCallout>
        </KangurLessonStack>
      ),
    },
    {
      title: copy.slides.ciagi_arytm.decreasing.title,
      content: (
        <KangurLessonStack>
          <KangurLessonLead>{copy.slides.ciagi_arytm.decreasing.lead}</KangurLessonLead>
          <KangurLessonCallout accent='sky' className='w-full text-center' padding='sm'>
            <div className='mx-auto h-24 w-72 max-w-full'>
              <ArithmeticReverseAnimation />
            </div>
            <KangurLessonCaption className='mt-2'>
              {copy.slides.ciagi_arytm.decreasing.caption}
            </KangurLessonCaption>
          </KangurLessonCallout>
        </KangurLessonStack>
      ),
    },
  ],
  ciagi_geom: [
    {
      title: copy.slides.ciagi_geom.multiplicationFibonacci.title,
      content: (
        <KangurLessonStack>
          <KangurLessonLead>{copy.slides.ciagi_geom.multiplicationFibonacci.lead}</KangurLessonLead>
          <div className='flex w-full flex-col kangur-panel-gap'>
            {Object.values(copy.slides.ciagi_geom.multiplicationFibonacci.examples).map(
              ({ hint, seq, answer }) => (
                <KangurLessonCallout key={hint} accent='violet' padding='sm'>
                  <KangurLessonCaption className='mb-1'>{hint}</KangurLessonCaption>
                  <p className='text-lg font-extrabold text-purple-700'>{seq}</p>
                  <KangurLessonCaption className='mt-1'>
                    {copy.slides.ciagi_geom.multiplicationFibonacci.answerLabel} <b>{answer}</b>
                  </KangurLessonCaption>
                </KangurLessonCallout>
              )
            )}
          </div>
        </KangurLessonStack>
      ),
    },
    {
      title: copy.slides.ciagi_geom.geometricGrowth.title,
      content: (
        <KangurLessonStack>
          <KangurLessonLead>{copy.slides.ciagi_geom.geometricGrowth.lead}</KangurLessonLead>
          <KangurLessonCallout accent='violet' className='w-full text-center' padding='sm'>
            <div className='mx-auto w-72 max-w-full'>
              <GeometricGrowthAnimation />
            </div>
            <KangurLessonCaption className='mt-2'>
              {copy.slides.ciagi_geom.geometricGrowth.caption}
            </KangurLessonCaption>
          </KangurLessonCallout>
        </KangurLessonStack>
      ),
    },
    {
      title: copy.slides.ciagi_geom.fibonacciMotion.title,
      content: (
        <KangurLessonStack>
          <KangurLessonLead>{copy.slides.ciagi_geom.fibonacciMotion.lead}</KangurLessonLead>
          <KangurLessonCallout accent='amber' className='w-full text-center' padding='sm'>
            <div className='mx-auto w-72 max-w-full'>
              <FibonacciSumAnimation />
            </div>
            <KangurLessonCaption className='mt-2'>
              {copy.slides.ciagi_geom.fibonacciMotion.caption}
            </KangurLessonCaption>
          </KangurLessonCallout>
        </KangurLessonStack>
      ),
    },
    {
      title: copy.slides.ciagi_geom.doublingDots.title,
      content: (
        <KangurLessonStack>
          <KangurLessonLead>{copy.slides.ciagi_geom.doublingDots.lead}</KangurLessonLead>
          <KangurLessonCallout accent='emerald' className='w-full text-center' padding='sm'>
            <div className='mx-auto w-72 max-w-full'>
              <GeometricDotsAnimation />
            </div>
            <KangurLessonCaption className='mt-2'>
              {copy.slides.ciagi_geom.doublingDots.caption}
            </KangurLessonCaption>
          </KangurLessonCallout>
        </KangurLessonStack>
      ),
    },
  ],
  strategie: [
    {
      title: copy.slides.strategie.howToLookForRule.title,
      content: (
        <KangurLessonStack>
          <KangurLessonCallout accent='slate' className='w-full border-violet-200/85'>
            <ol className='list-inside list-decimal space-y-3 text-sm [color:var(--kangur-page-text)]'>
              {Object.values(copy.slides.strategie.howToLookForRule.steps).map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>
          </KangurLessonCallout>
          <KangurLessonCallout accent='violet' className='w-full text-center' padding='sm'>
            <KangurLessonCaption>
              {copy.slides.strategie.howToLookForRule.exerciseLabel}{' '}
              <b>{copy.slides.strategie.howToLookForRule.exerciseSequence}</b>
            </KangurLessonCaption>
            <p className='mt-1 text-sm font-bold text-violet-600'>
              {copy.slides.strategie.howToLookForRule.exerciseAnswer}
            </p>
          </KangurLessonCallout>
        </KangurLessonStack>
      ),
    },
    {
      title: copy.slides.strategie.checkDifferenceAndRatio.title,
      content: (
        <KangurLessonStack>
          <KangurLessonLead>{copy.slides.strategie.checkDifferenceAndRatio.lead}</KangurLessonLead>
          <KangurLessonCallout accent='violet' className='w-full text-center' padding='sm'>
            <div className='mx-auto h-28 w-72 max-w-full'>
              <RuleCheckAnimation />
            </div>
            <KangurLessonCaption className='mt-2'>
              {copy.slides.strategie.checkDifferenceAndRatio.caption}
            </KangurLessonCaption>
          </KangurLessonCallout>
        </KangurLessonStack>
      ),
    },
    {
      title: copy.slides.strategie.checklist.title,
      content: (
        <KangurLessonStack>
          <KangurLessonLead>{copy.slides.strategie.checklist.lead}</KangurLessonLead>
          <KangurLessonCallout accent='violet' className='w-full text-center' padding='sm'>
            <div className='mx-auto h-28 w-72 max-w-full'>
              <RuleChecklistAnimation />
            </div>
            <KangurLessonCaption className='mt-2'>
              {copy.slides.strategie.checklist.caption}
            </KangurLessonCaption>
          </KangurLessonCallout>
        </KangurLessonStack>
      ),
    },
    {
      title: copy.slides.strategie.summary.title,
      content: (
        <KangurLessonStack>
          <KangurLessonCallout accent='amber' className='w-full'>
            <ul className='space-y-2 text-sm [color:var(--kangur-page-text)]'>
              {Object.values(copy.slides.strategie.summary.items).map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </KangurLessonCallout>
          <p className='text-center font-bold text-violet-600'>
            {copy.slides.strategie.summary.closing}
          </p>
        </KangurLessonStack>
      ),
    },
  ],
});

const buildLogicalPatternsSections = (copy: LogicalPatternsLessonCopy) => [
  {
    id: 'intro',
    emoji: '🔢',
    title: copy.sections.intro.title,
    description: copy.sections.intro.description,
  },
  {
    id: 'ciagi_arytm',
    emoji: '➕',
    title: copy.sections.ciagi_arytm.title,
    description: copy.sections.ciagi_arytm.description,
  },
  {
    id: 'ciagi_geom',
    emoji: '✖️',
    title: copy.sections.ciagi_geom.title,
    description: copy.sections.ciagi_geom.description,
  },
  {
    id: 'strategie',
    emoji: '🔍',
    title: copy.sections.strategie.title,
    description: copy.sections.strategie.description,
  },
  {
    id: 'game_warsztat',
    emoji: '🛠️',
    title: copy.sections.game_warsztat.title,
    description: copy.sections.game_warsztat.description,
    isGame: true,
  },
] as const;

export const SLIDES = buildLogicalPatternsSlides(LOGICAL_PATTERNS_LESSON_COMPONENT_CONTENT);
export const HUB_SECTIONS = buildLogicalPatternsSections(LOGICAL_PATTERNS_LESSON_COMPONENT_CONTENT);
const LOGICAL_PATTERNS_WORKSHOP_INSTANCE_ID = getKangurBuiltInGameInstanceId(
  'logical_patterns_workshop'
);

export default function LogicalPatternsLesson({
  lessonTemplate,
}: LessonProps): React.JSX.Element {
  const runtimeTemplate = useOptionalKangurLessonTemplate('logical_patterns');
  const resolvedTemplate = lessonTemplate ?? runtimeTemplate;
  const translations = useTranslations('KangurStaticLessons.logicalPatterns');
  const copy = useMemo(
    () => {
      const fallbackTranslate: LessonTranslate = (key) => translations(key as never);

      if (!resolvedTemplate?.componentContent) {
        return createLogicalPatternsLessonContentFromTranslate(fallbackTranslate);
      }

      const resolved = resolveKangurLessonTemplateComponentContent(
        'logical_patterns',
        resolvedTemplate.componentContent,
      );

      return resolved?.kind === 'logical_patterns'
        ? resolved
        : createLogicalPatternsLessonContentFromTranslate(fallbackTranslate);
    },
    [resolvedTemplate, translations],
  );
  const sections = buildLogicalPatternsSections(copy);
  const slides = buildLogicalPatternsSlides(copy);

  return (
    <KangurUnifiedLesson
      progressMode='panel'
      lessonId='logical_patterns'
      lessonEmoji='🔢'
      lessonTitle={resolvedTemplate?.title?.trim() || copy.lessonTitle}
      sections={sections}
      slides={slides}
      gradientClass='kangur-gradient-accent-violet'
      progressDotClassName='bg-violet-300'
      dotActiveClass='bg-violet-500'
      dotDoneClass='bg-violet-300'
      skipMarkFor={['game_warsztat']}
      games={[
        {
          sectionId: 'game_warsztat',
          stage: {
            accent: 'violet',
            icon: '🛠️',
            maxWidthClassName: 'max-w-3xl',
            shellTestId: 'logical-patterns-game-shell',
            title: copy.game.stageTitle,
          },
          launchableInstance: {
            gameId: 'logical_patterns_workshop',
            instanceId: LOGICAL_PATTERNS_WORKSHOP_INSTANCE_ID,
          },
        },
      ]}
    />
  );
}
