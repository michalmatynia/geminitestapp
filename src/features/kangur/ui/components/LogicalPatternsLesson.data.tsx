import type { ReactNode } from 'react';

import type { LessonSlide } from '@/features/kangur/ui/components/lesson-framework/LessonSlideSection';
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
import {
  LOGICAL_PATTERNS_LESSON_COMPONENT_CONTENT,
} from './logical-patterns-lesson-content';
import type { KangurLogicalPatternsLessonTemplateContent } from '@/shared/contracts/kangur-lesson-templates';

export type SectionId =
  | 'intro'
  | 'ciagi_arytm'
  | 'ciagi_geom'
  | 'strategie'
  | 'game_warsztat';
type SlideSectionId = Exclude<SectionId, 'game_warsztat'>;
export type LogicalPatternsLessonCopy = KangurLogicalPatternsLessonTemplateContent;

const buildIntroWhatIsPatternSlide = (
  copy: LogicalPatternsLessonCopy
): LessonSlide => ({
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
});

const buildIntroColorsAndShapesSlide = (
  copy: LogicalPatternsLessonCopy
): LessonSlide => ({
  title: copy.slides.intro.colorsAndShapes.title,
  content: (
    <KangurLessonStack>
      <KangurLessonLead>{copy.slides.intro.colorsAndShapes.lead}</KangurLessonLead>
      <div className='flex w-full flex-col kangur-panel-gap'>
        {Object.values(copy.slides.intro.colorsAndShapes.examples).map(
          ({ label, seq, answer }) => (
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
          )
        )}
      </div>
    </KangurLessonStack>
  ),
});

const buildAnimationSlide = ({
  title,
  lead,
  caption,
  animation,
  accent = 'violet',
  containerClassName = 'mx-auto h-20 w-72 max-w-full',
}: {
  accent?: 'amber' | 'emerald' | 'sky' | 'violet';
  animation: ReactNode;
  caption: string;
  containerClassName?: string;
  lead: string;
  title: string;
}): LessonSlide => ({
  title,
  content: (
    <KangurLessonStack>
      <KangurLessonLead>{lead}</KangurLessonLead>
      <KangurLessonCallout accent={accent} className='w-full text-center' padding='sm'>
        <div className={containerClassName}>{animation}</div>
        <KangurLessonCaption className='mt-2'>{caption}</KangurLessonCaption>
      </KangurLessonCallout>
    </KangurLessonStack>
  ),
});

const buildArithmeticExamplesSlide = (
  copy: LogicalPatternsLessonCopy
): LessonSlide => ({
  title: copy.slides.ciagi_arytm.addition.title,
  content: (
    <KangurLessonStack>
      <KangurLessonLead>{copy.slides.ciagi_arytm.addition.lead}</KangurLessonLead>
      <div className='flex w-full flex-col kangur-panel-gap'>
        {Object.values(copy.slides.ciagi_arytm.addition.examples).map(
          ({ hint, seq, answer }) => (
            <KangurLessonCallout key={hint} accent='violet' padding='sm'>
              <KangurLessonCaption className='mb-1'>{hint}</KangurLessonCaption>
              <p className='text-lg font-extrabold text-violet-700'>{seq}</p>
              <KangurLessonCaption className='mt-1'>
                {copy.slides.ciagi_arytm.addition.answerLabel} <b>{answer}</b>
              </KangurLessonCaption>
            </KangurLessonCallout>
          )
        )}
      </div>
    </KangurLessonStack>
  ),
});

const buildGeometricExamplesSlide = (
  copy: LogicalPatternsLessonCopy
): LessonSlide => ({
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
});

const buildStrategyHowToLookForRuleSlide = (
  copy: LogicalPatternsLessonCopy
): LessonSlide => ({
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
});

const buildStrategySummarySlide = (
  copy: LogicalPatternsLessonCopy
): LessonSlide => ({
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
});

const buildIntroSlides = (copy: LogicalPatternsLessonCopy): LessonSlide[] => [
  buildIntroWhatIsPatternSlide(copy),
  buildIntroColorsAndShapesSlide(copy),
  buildAnimationSlide({
    title: copy.slides.intro.patternUnit.title,
    lead: copy.slides.intro.patternUnit.lead,
    caption: copy.slides.intro.patternUnit.caption,
    animation: <PatternUnitAnimation />,
  }),
  buildAnimationSlide({
    title: copy.slides.intro.missingElement.title,
    lead: copy.slides.intro.missingElement.lead,
    caption: copy.slides.intro.missingElement.caption,
    animation: <PatternMissingAnimation />,
  }),
  buildAnimationSlide({
    title: copy.slides.intro.threeElementPattern.title,
    lead: copy.slides.intro.threeElementPattern.lead,
    caption: copy.slides.intro.threeElementPattern.caption,
    animation: <PatternCycleAnimation />,
  }),
];

const buildArithmeticSlides = (copy: LogicalPatternsLessonCopy): LessonSlide[] => [
  buildArithmeticExamplesSlide(copy),
  buildAnimationSlide({
    title: copy.slides.ciagi_arytm.constantStep.title,
    lead: copy.slides.ciagi_arytm.constantStep.lead,
    caption: copy.slides.ciagi_arytm.constantStep.caption,
    animation: <ArithmeticStepAnimation />,
    containerClassName: 'mx-auto h-24 w-72 max-w-full',
  }),
  buildAnimationSlide({
    title: copy.slides.ciagi_arytm.decreasing.title,
    lead: copy.slides.ciagi_arytm.decreasing.lead,
    caption: copy.slides.ciagi_arytm.decreasing.caption,
    animation: <ArithmeticReverseAnimation />,
    accent: 'sky',
    containerClassName: 'mx-auto h-24 w-72 max-w-full',
  }),
];

const buildGeometricSlides = (copy: LogicalPatternsLessonCopy): LessonSlide[] => [
  buildGeometricExamplesSlide(copy),
  buildAnimationSlide({
    title: copy.slides.ciagi_geom.geometricGrowth.title,
    lead: copy.slides.ciagi_geom.geometricGrowth.lead,
    caption: copy.slides.ciagi_geom.geometricGrowth.caption,
    animation: <GeometricGrowthAnimation />,
  }),
  buildAnimationSlide({
    title: copy.slides.ciagi_geom.fibonacciMotion.title,
    lead: copy.slides.ciagi_geom.fibonacciMotion.lead,
    caption: copy.slides.ciagi_geom.fibonacciMotion.caption,
    animation: <FibonacciSumAnimation />,
    accent: 'amber',
  }),
  buildAnimationSlide({
    title: copy.slides.ciagi_geom.doublingDots.title,
    lead: copy.slides.ciagi_geom.doublingDots.lead,
    caption: copy.slides.ciagi_geom.doublingDots.caption,
    animation: <GeometricDotsAnimation />,
    accent: 'emerald',
  }),
];

const buildStrategySlides = (copy: LogicalPatternsLessonCopy): LessonSlide[] => [
  buildStrategyHowToLookForRuleSlide(copy),
  buildAnimationSlide({
    title: copy.slides.strategie.checkDifferenceAndRatio.title,
    lead: copy.slides.strategie.checkDifferenceAndRatio.lead,
    caption: copy.slides.strategie.checkDifferenceAndRatio.caption,
    animation: <RuleCheckAnimation />,
    containerClassName: 'mx-auto h-28 w-72 max-w-full',
  }),
  buildAnimationSlide({
    title: copy.slides.strategie.checklist.title,
    lead: copy.slides.strategie.checklist.lead,
    caption: copy.slides.strategie.checklist.caption,
    animation: <RuleChecklistAnimation />,
    containerClassName: 'mx-auto h-28 w-72 max-w-full',
  }),
  buildStrategySummarySlide(copy),
];

export const buildLogicalPatternsSlides = (
  copy: LogicalPatternsLessonCopy
): Record<SlideSectionId, LessonSlide[]> => ({
  intro: buildIntroSlides(copy),
  ciagi_arytm: buildArithmeticSlides(copy),
  ciagi_geom: buildGeometricSlides(copy),
  strategie: buildStrategySlides(copy),
});

export const buildLogicalPatternsSections = (copy: LogicalPatternsLessonCopy) => [
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

export const SLIDES = buildLogicalPatternsSlides(
  LOGICAL_PATTERNS_LESSON_COMPONENT_CONTENT
);
export const HUB_SECTIONS = buildLogicalPatternsSections(
  LOGICAL_PATTERNS_LESSON_COMPONENT_CONTENT
);
