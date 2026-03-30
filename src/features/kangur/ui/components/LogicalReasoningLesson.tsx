'use client';

import type { LessonProps } from '@/features/kangur/lessons/lesson-ui-registry';
import { resolveKangurLessonTemplateComponentContent } from '@/features/kangur/lessons/lesson-template-component-content';
import { useOptionalKangurLessonTemplate } from '@/features/kangur/ui/context/KangurLessonsRuntimeContext';
import { useMemo } from 'react';
import { useMessages } from 'next-intl';

import type { LessonSlide } from '@/features/kangur/ui/components/lesson-framework/LessonSlideSection';
import {
  DeductionFlowAnimation,
  EliminationGridAnimation,
  IfThenArrowAnimation,
  InductionGatherAnimation,
  QuantifierScopeAnimation,
} from './LogicalReasoningAnimations';
import LogicalReasoningIfThenGame, {
  type LogicalReasoningIfThenCase,
  type LogicalReasoningIfThenGameCopy,
} from '@/features/kangur/ui/components/LogicalReasoningIfThenGame';
import {
  KangurLessonCallout,
  KangurLessonCaption,
  KangurLessonInset,
  KangurLessonLead,
  KangurLessonStack,
} from '@/features/kangur/ui/design/lesson-primitives';
import {
  KANGUR_STACK_TIGHT_CLASSNAME,
  KANGUR_START_ROW_CLASSNAME,
} from '@/features/kangur/ui/design/tokens';
import { KangurUnifiedLesson } from '@/features/kangur/ui/lessons/lesson-components';
import type { LessonTranslate } from './lesson-copy';
import {
  createLogicalReasoningLessonContentFromTranslate,
  LOGICAL_REASONING_LESSON_COMPONENT_CONTENT,
} from './logical-reasoning-lesson-content';
import type { KangurLogicalReasoningLessonTemplateContent } from '@/shared/contracts/kangur-lesson-templates';

type SectionId = 'wnioskowanie' | 'kwantyfikatory' | 'zagadki' | 'podsumowanie' | 'gra';

const createStaticTranslator =
  (messages: Record<string, unknown>): LessonTranslate =>
  (key) => {
    const resolved = key.split('.').reduce<unknown>(
      (current, segment) =>
        typeof current === 'object' && current !== null
          ? (current as Record<string, unknown>)[segment]
          : undefined,
      messages
    );

    return typeof resolved === 'string' ? resolved : key;
  };
type LogicalReasoningLessonCopy = KangurLogicalReasoningLessonTemplateContent;

const buildLogicalReasoningCases = (
  copy: LogicalReasoningLessonCopy
): LogicalReasoningIfThenCase[] =>
  copy.game.cases.map((item) => ({
    id: item.id,
    rule: item.rule,
    fact: item.fact,
    conclusion: item.conclusion,
    valid: item.valid,
    explanation: item.explanation,
  })) as LogicalReasoningIfThenCase[];

const buildLogicalReasoningGameCopy = (
  copy: LogicalReasoningLessonCopy
): LogicalReasoningIfThenGameCopy => ({
  header: {
    eyebrow: copy.game.ui.header.eyebrow,
    title: copy.game.ui.header.title,
    description: copy.game.ui.header.description,
    placedTemplate: copy.game.ui.header.placedTemplate,
  },
  zones: {
    pool: {
      title: copy.game.ui.zones.pool.title,
      hint: copy.game.ui.zones.pool.hint,
      ariaLabel: copy.game.ui.zones.pool.ariaLabel,
    },
    valid: {
      title: copy.game.ui.zones.valid.title,
      hint: copy.game.ui.zones.valid.hint,
      ariaLabel: copy.game.ui.zones.valid.ariaLabel,
    },
    invalid: {
      title: copy.game.ui.zones.invalid.title,
      hint: copy.game.ui.zones.invalid.hint,
      ariaLabel: copy.game.ui.zones.invalid.ariaLabel,
    },
  },
  card: {
    ifLabel: copy.game.ui.card.ifLabel,
    factLabel: copy.game.ui.card.factLabel,
    conclusionLabel: copy.game.ui.card.conclusionLabel,
    selectAriaTemplate: copy.game.ui.card.selectAriaTemplate,
  },
  status: {
    correct: copy.game.ui.status.correct,
    wrong: copy.game.ui.status.wrong,
  },
  selection: {
    selectedTemplate: copy.game.ui.selection.selectedTemplate,
    idle: copy.game.ui.selection.idle,
    touchIdle: copy.game.ui.selection.touchIdle,
    touchSelectedTemplate: copy.game.ui.selection.touchSelectedTemplate,
  },
  moveButtons: {
    toValid: copy.game.ui.moveButtons.toValid,
    toInvalid: copy.game.ui.moveButtons.toInvalid,
    toPool: copy.game.ui.moveButtons.toPool,
  },
  actions: {
    check: copy.game.ui.actions.check,
    reset: copy.game.ui.actions.reset,
  },
  summary: {
    perfect: copy.game.ui.summary.perfect,
    good: copy.game.ui.summary.good,
    retry: copy.game.ui.summary.retry,
    resultTemplate: copy.game.ui.summary.resultTemplate,
  },
});

const buildLogicalReasoningSlides = (
  copy: LogicalReasoningLessonCopy
): Record<SectionId, LessonSlide[]> => {
  const cases = buildLogicalReasoningCases(copy);
  const gameCopy = buildLogicalReasoningGameCopy(copy);

  return {
    wnioskowanie: [
      {
        title: copy.slides.wnioskowanie.basics.title,
        content: (
          <KangurLessonStack>
            <KangurLessonLead>{copy.slides.wnioskowanie.basics.lead}</KangurLessonLead>
            <KangurLessonCallout
              accent='indigo'
              className='w-full text-sm [color:var(--kangur-page-muted-text)]'
            >
              <p className='mb-2 font-semibold text-indigo-700'>
                {copy.slides.wnioskowanie.basics.typesLabel}
              </p>
              <div className='space-y-2'>
                <KangurLessonInset accent='indigo' padding='sm'>
                  <p className='text-xs font-bold text-indigo-600'>
                    {copy.slides.wnioskowanie.basics.types.deduction.title}
                  </p>
                  <p className='mt-1 text-xs'>
                    {copy.slides.wnioskowanie.basics.types.deduction.example}
                  </p>
                </KangurLessonInset>
                <KangurLessonInset accent='indigo' padding='sm'>
                  <p className='text-xs font-bold text-indigo-600'>
                    {copy.slides.wnioskowanie.basics.types.induction.title}
                  </p>
                  <p className='mt-1 text-xs'>
                    {copy.slides.wnioskowanie.basics.types.induction.example}
                  </p>
                </KangurLessonInset>
              </div>
            </KangurLessonCallout>
          </KangurLessonStack>
        ),
      },
      {
        title: copy.slides.wnioskowanie.ifThen.title,
        content: (
          <KangurLessonStack>
            <KangurLessonLead>{copy.slides.wnioskowanie.ifThen.lead}</KangurLessonLead>
            <div className={`${KANGUR_STACK_TIGHT_CLASSNAME} w-full`}>
              {copy.slides.wnioskowanie.ifThen.examples.map(({ rule, note }) => (
                <KangurLessonCallout key={rule} accent='indigo' className='text-sm' padding='sm'>
                  <p className='font-bold text-indigo-700'>{rule}</p>
                  <KangurLessonCaption className='mt-1'>{note}</KangurLessonCaption>
                </KangurLessonCallout>
              ))}
              <KangurLessonCallout accent='amber' className='text-sm' padding='sm'>
                <p className='font-bold text-amber-700'>
                  {copy.slides.wnioskowanie.ifThen.warning.title}
                </p>
                <KangurLessonCaption className='mt-1'>
                  {copy.slides.wnioskowanie.ifThen.warning.note}
                </KangurLessonCaption>
              </KangurLessonCallout>
            </div>
          </KangurLessonStack>
        ),
      },
      {
        title: copy.slides.wnioskowanie.deductionPractice.title,
        content: (
          <KangurLessonStack>
            <KangurLessonLead>{copy.slides.wnioskowanie.deductionPractice.lead}</KangurLessonLead>
            <KangurLessonInset accent='indigo' className='w-full text-center' padding='sm'>
              <div className='mx-auto w-72 max-w-full'>
                <DeductionFlowAnimation />
              </div>
              <KangurLessonCaption className='mt-2'>
                {copy.slides.wnioskowanie.deductionPractice.caption}
              </KangurLessonCaption>
            </KangurLessonInset>
          </KangurLessonStack>
        ),
      },
      {
        title: copy.slides.wnioskowanie.induction.title,
        content: (
          <KangurLessonStack>
            <KangurLessonLead>{copy.slides.wnioskowanie.induction.lead}</KangurLessonLead>
            <KangurLessonInset accent='emerald' className='w-full text-center' padding='sm'>
              <div className='mx-auto h-28 w-72 max-w-full'>
                <InductionGatherAnimation />
              </div>
              <KangurLessonCaption className='mt-2'>
                {copy.slides.wnioskowanie.induction.caption}
              </KangurLessonCaption>
            </KangurLessonInset>
          </KangurLessonStack>
        ),
      },
      {
        title: copy.slides.wnioskowanie.condition.title,
        content: (
          <KangurLessonStack>
            <KangurLessonLead>{copy.slides.wnioskowanie.condition.lead}</KangurLessonLead>
            <KangurLessonInset accent='indigo' className='w-full text-center' padding='sm'>
              <div className='mx-auto h-24 w-72 max-w-full'>
                <IfThenArrowAnimation />
              </div>
              <KangurLessonCaption className='mt-2'>
                {copy.slides.wnioskowanie.condition.caption}
              </KangurLessonCaption>
            </KangurLessonInset>
          </KangurLessonStack>
        ),
      },
    ],
    kwantyfikatory: [
      {
        title: copy.slides.kwantyfikatory.quantifiers.title,
        content: (
          <KangurLessonStack>
            <KangurLessonLead>{copy.slides.kwantyfikatory.quantifiers.lead}</KangurLessonLead>
            <div className={`${KANGUR_STACK_TIGHT_CLASSNAME} w-full`}>
              {copy.slides.kwantyfikatory.quantifiers.cards.map(({ icon, label, accent, text }) => (
                <KangurLessonCallout
                  key={label}
                  accent={accent}
                  padding='sm'
                >
                  <p className='text-sm font-bold [color:var(--kangur-page-text)]'>
                    {icon} {label}
                  </p>
                  <KangurLessonCaption className='mt-1'>{text}</KangurLessonCaption>
                </KangurLessonCallout>
              ))}
            </div>
          </KangurLessonStack>
        ),
      },
      {
        title: copy.slides.kwantyfikatory.trueFalse.title,
        content: (
          <KangurLessonStack>
            <KangurLessonLead>{copy.slides.kwantyfikatory.trueFalse.lead}</KangurLessonLead>
            <div className={`${KANGUR_STACK_TIGHT_CLASSNAME} w-full`}>
              {copy.slides.kwantyfikatory.trueFalse.examples.map(({ stmt, answer, explain }) => (
                <KangurLessonCallout
                  key={stmt}
                  accent={answer ? 'emerald' : 'rose'}
                  className='text-sm'
                  padding='sm'
                >
                  <div className={KANGUR_START_ROW_CLASSNAME}>
                    <span className='text-lg'>{answer ? '✅' : '❌'}</span>
                    <div>
                      <p className='font-bold [color:var(--kangur-page-text)]'>{stmt}</p>
                      <KangurLessonCaption className='mt-0.5'>{explain}</KangurLessonCaption>
                    </div>
                  </div>
                </KangurLessonCallout>
              ))}
            </div>
          </KangurLessonStack>
        ),
      },
      {
        title: copy.slides.kwantyfikatory.scope.title,
        content: (
          <KangurLessonStack>
            <KangurLessonLead>{copy.slides.kwantyfikatory.scope.lead}</KangurLessonLead>
            <KangurLessonInset accent='emerald' className='w-full text-center' padding='sm'>
              <div className='mx-auto h-24 w-72 max-w-full'>
                <QuantifierScopeAnimation />
              </div>
              <KangurLessonCaption className='mt-2'>
                {copy.slides.kwantyfikatory.scope.caption}
              </KangurLessonCaption>
            </KangurLessonInset>
          </KangurLessonStack>
        ),
      },
    ],
    zagadki: [
      {
        title: copy.slides.zagadki.puzzle.title,
        content: (
          <KangurLessonStack>
            <KangurLessonLead>{copy.slides.zagadki.puzzle.lead}</KangurLessonLead>
            <KangurLessonCallout accent='indigo' className='w-full text-sm'>
              <p className='mb-2 font-bold text-indigo-700'>
                {copy.slides.zagadki.puzzle.titleLabel}
              </p>
              <ul className='space-y-1 text-xs [color:var(--kangur-page-muted-text)]'>
                {copy.slides.zagadki.puzzle.clues.map((clue) => (
                  <li key={clue}>{clue}</li>
                ))}
              </ul>
              <KangurLessonInset accent='indigo' className='mt-3' padding='sm'>
                <p className='text-xs font-bold text-indigo-600'>
                  {copy.slides.zagadki.puzzle.solutionLabel}
                </p>
                <p className='text-xs [color:var(--kangur-page-muted-text)]'>
                  {copy.slides.zagadki.puzzle.solution.split('\n').map((line) => (
                    <span key={line}>
                      {line}
                      <br />
                    </span>
                  ))}
                </p>
              </KangurLessonInset>
            </KangurLessonCallout>
          </KangurLessonStack>
        ),
      },
      {
        title: copy.slides.zagadki.steps.title,
        content: (
          <KangurLessonStack>
            <KangurLessonInset accent='indigo' className='w-full' padding='md'>
              <ol className='w-full list-inside list-decimal space-y-3 break-words text-left text-sm [color:var(--kangur-page-text)]'>
                {copy.slides.zagadki.steps.items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ol>
            </KangurLessonInset>
            <KangurLessonCallout
              accent='indigo'
              className='w-full text-center text-xs [color:var(--kangur-page-muted-text)]'
              padding='sm'
            >
              {copy.slides.zagadki.steps.closing}
            </KangurLessonCallout>
          </KangurLessonStack>
        ),
      },
      {
        title: copy.slides.zagadki.eliminate.title,
        content: (
          <KangurLessonStack>
            <KangurLessonLead>{copy.slides.zagadki.eliminate.lead}</KangurLessonLead>
            <KangurLessonInset accent='rose' className='w-full text-center' padding='sm'>
              <div className='mx-auto w-full max-w-sm'>
                <EliminationGridAnimation />
              </div>
              <KangurLessonCaption className='mt-2'>
                {copy.slides.zagadki.eliminate.caption}
              </KangurLessonCaption>
            </KangurLessonInset>
          </KangurLessonStack>
        ),
      },
    ],
    podsumowanie: [
      {
        title: copy.slides.podsumowanie.overview.title,
        content: (
          <KangurLessonStack>
            <KangurLessonCallout accent='amber' className='w-full'>
              <ul className='space-y-2 text-sm [color:var(--kangur-page-text)]'>
                {copy.slides.podsumowanie.overview.items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </KangurLessonCallout>
            <p className='text-center font-bold text-indigo-600'>
              {copy.slides.podsumowanie.overview.closing}
            </p>
          </KangurLessonStack>
        ),
      },
    ],
    gra: [
      {
        title: copy.slides.gra.interactive.title,
        containerClassName: 'max-w-[min(760px,90vw)]',
        panelClassName: 'w-full mx-auto lg:w-[min(760px,90vw)]',
        content: (
          <KangurLessonStack>
            <KangurLessonLead>{copy.slides.gra.interactive.lead}</KangurLessonLead>
            <KangurLessonInset accent='indigo' className='w-full' padding='sm'>
              <LogicalReasoningIfThenGame cases={cases} copy={gameCopy} />
            </KangurLessonInset>
          </KangurLessonStack>
        ),
      },
    ],
  };
};

const buildLogicalReasoningSections = (copy: LogicalReasoningLessonCopy) =>
  [
    {
      id: 'wnioskowanie',
      emoji: '💡',
      title: copy.sections.wnioskowanie.title,
      description: copy.sections.wnioskowanie.description,
    },
    {
      id: 'kwantyfikatory',
      emoji: '🔢',
      title: copy.sections.kwantyfikatory.title,
      description: copy.sections.kwantyfikatory.description,
    },
    {
      id: 'zagadki',
      emoji: '🧩',
      title: copy.sections.zagadki.title,
      description: copy.sections.zagadki.description,
    },
    {
      id: 'podsumowanie',
      emoji: '📋',
      title: copy.sections.podsumowanie.title,
      description: copy.sections.podsumowanie.description,
    },
    {
      id: 'gra',
      emoji: '🎮',
      title: copy.sections.gra.title,
      description: copy.sections.gra.description,
    },
  ] as const;

export const SLIDES = buildLogicalReasoningSlides(LOGICAL_REASONING_LESSON_COMPONENT_CONTENT);
export const HUB_SECTIONS = buildLogicalReasoningSections(LOGICAL_REASONING_LESSON_COMPONENT_CONTENT);

export default function LogicalReasoningLesson({
  lessonTemplate,
}: LessonProps): React.JSX.Element {
  const runtimeTemplate = useOptionalKangurLessonTemplate('logical_reasoning');
  const resolvedTemplate = lessonTemplate ?? runtimeTemplate;
  const messages = useMessages() as Record<string, unknown>;
  const logicalReasoningMessages =
    ((((messages['KangurStaticLessons'] as Record<string, unknown> | undefined)?.[
      'logicalReasoning'
    ]) ??
      {}) as Record<string, unknown>);
  const copy = useMemo(
    () => {
      const fallbackTranslate = createStaticTranslator(logicalReasoningMessages);

      if (!resolvedTemplate?.componentContent) {
        return createLogicalReasoningLessonContentFromTranslate(fallbackTranslate);
      }

      const resolved = resolveKangurLessonTemplateComponentContent(
        'logical_reasoning',
        resolvedTemplate.componentContent,
      );

      return resolved?.kind === 'logical_reasoning'
        ? resolved
        : createLogicalReasoningLessonContentFromTranslate(fallbackTranslate);
    },
    [logicalReasoningMessages, resolvedTemplate],
  );
  const sections = buildLogicalReasoningSections(copy);
  const slides = buildLogicalReasoningSlides(copy);

  return (
    <KangurUnifiedLesson
      progressMode='panel'
      lessonId='logical_reasoning'
      lessonEmoji='💡'
      lessonTitle={resolvedTemplate?.title?.trim() || copy.lessonTitle}
      sections={sections}
      slides={slides}
      gradientClass='kangur-gradient-accent-indigo'
      progressDotClassName='bg-indigo-300'
      dotActiveClass='bg-indigo-500'
      dotDoneClass='bg-indigo-300'
    />
  );
}
