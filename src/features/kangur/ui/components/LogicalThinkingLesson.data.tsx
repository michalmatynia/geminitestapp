import type { LessonSlide } from '@/features/kangur/ui/components/lesson-framework/LessonSlideSection';
import LogicalIfThenStepsGame from '@/features/kangur/ui/components/LogicalIfThenStepsGame';
import type {
  LogicalIfThenStepsGameCopy,
  LogicalIfThenStepsRound,
} from '@/features/kangur/ui/components/LogicalIfThenStepsGame';
import LogicalThinkingLabGame from '@/features/kangur/ui/components/LogicalThinkingLabGame';
import type {
  LogicalThinkingLabAnalogyRound,
  LogicalThinkingLabGameCopy,
} from '@/features/kangur/ui/components/LogicalThinkingLabGame.types';
import {
  LogicalAnalogyMapAnimation,
  LogicalAnalogiesAnimation,
  LogicalClassificationAnimation,
  LogicalClassificationKeyAnimation,
  LogicalPatternAnimation,
  LogicalPatternGrowthAnimation,
  LogicalReasoningAnimation,
  LogicalSummaryAnimation,
  LogicalThinkingIntroAnimation,
  LogicalThinkingStepsAnimation,
} from './LogicalThinkingAnimations';
import {
  KangurLessonCallout,
  KangurLessonCaption,
  KangurLessonInset,
  KangurLessonLead,
  KangurLessonStack,
} from '@/features/kangur/ui/design/lesson-primitives';
import {
  LOGICAL_THINKING_LESSON_COMPONENT_CONTENT,
} from './logical-thinking-lesson-content';
import type { KangurLogicalThinkingLessonTemplateContent } from '@/shared/contracts/kangur-lesson-templates';

export type SectionId =
  | 'wprowadzenie'
  | 'wzorce'
  | 'klasyfikacja'
  | 'wnioskowanie'
  | 'wnioskowanie_gra'
  | 'laboratorium_gra'
  | 'analogie'
  | 'zapamietaj';

export type LogicalThinkingLessonCopy = KangurLogicalThinkingLessonTemplateContent;

const LOGICAL_THINKING_SECTION_ORDER: readonly SectionId[] = [
  'wprowadzenie',
  'wzorce',
  'klasyfikacja',
  'wnioskowanie',
  'analogie',
  'zapamietaj',
  'wnioskowanie_gra',
  'laboratorium_gra',
] as const;

const buildIfThenRounds = (copy: LogicalThinkingLessonCopy): LogicalIfThenStepsRound[] =>
  copy.games.ifThen.rounds.map((round) => ({
    id: round.id,
    fact: round.fact,
    rule: round.rule,
    conclusion: round.conclusion,
    distractors: [...round.distractors],
    explanation: round.explanation,
  })) as LogicalIfThenStepsRound[];

const buildIfThenGameCopy = (copy: LogicalThinkingLessonCopy): LogicalIfThenStepsGameCopy => ({
  completion: {
    title: copy.games.ifThen.ui.completion.title,
    description: copy.games.ifThen.ui.completion.description,
    restart: copy.games.ifThen.ui.completion.restart,
  },
  header: {
    stepTemplate: copy.games.ifThen.ui.header.stepTemplate,
    instruction: copy.games.ifThen.ui.header.instruction,
    touchInstruction: copy.games.ifThen.ui.header.touchInstruction,
  },
  slots: {
    fact: {
      label: copy.games.ifThen.ui.slots.fact.label,
      hint: copy.games.ifThen.ui.slots.fact.hint,
    },
    rule: {
      label: copy.games.ifThen.ui.slots.rule.label,
      hint: copy.games.ifThen.ui.slots.rule.hint,
    },
    conclusion: {
      label: copy.games.ifThen.ui.slots.conclusion.label,
      hint: copy.games.ifThen.ui.slots.conclusion.hint,
    },
  },
  deckTitle: copy.games.ifThen.ui.deckTitle,
  cardAriaTemplate: copy.games.ifThen.ui.cardAriaTemplate,
  feedback: {
    fillAll: copy.games.ifThen.ui.feedback.fillAll,
    successTemplate: copy.games.ifThen.ui.feedback.successTemplate,
    error: copy.games.ifThen.ui.feedback.error,
  },
  actions: {
    check: copy.games.ifThen.ui.actions.check,
    retry: copy.games.ifThen.ui.actions.retry,
    next: copy.games.ifThen.ui.actions.next,
  },
});

const buildLabAnalogyRounds = (
  copy: LogicalThinkingLessonCopy
): LogicalThinkingLabAnalogyRound[] =>
  copy.games.lab.analogyRounds.map((round) => ({
    id: round.id,
    prompt: round.prompt,
    options: round.options.map((option) => ({
      id: option.id,
      label: option.label,
    })),
    correctId: round.correctId,
    explanation: round.explanation,
  })) as LogicalThinkingLabAnalogyRound[];

const buildLabGameCopy = (copy: LogicalThinkingLessonCopy): LogicalThinkingLabGameCopy => ({
  completion: {
    title: copy.games.lab.ui.completion.title,
    description: copy.games.lab.ui.completion.description,
    restart: copy.games.lab.ui.completion.restart,
  },
  header: {
    stageTemplate: copy.games.lab.ui.header.stageTemplate,
    instruction: copy.games.lab.ui.header.instruction,
  },
  pattern: {
    prompt: copy.games.lab.ui.pattern.prompt,
    slotLabels: {
      first: copy.games.lab.ui.pattern.slotLabels.first,
      second: copy.games.lab.ui.pattern.slotLabels.second,
    },
    filledSlotAriaTemplate: copy.games.lab.ui.pattern.filledSlotAriaTemplate,
    emptySlotAriaTemplate: copy.games.lab.ui.pattern.emptySlotAriaTemplate,
    selectTokenAriaTemplate: copy.games.lab.ui.pattern.selectTokenAriaTemplate,
    selectedTemplate: copy.games.lab.ui.pattern.selectedTemplate,
    idle: copy.games.lab.ui.pattern.idle,
    touchIdle: copy.games.lab.ui.pattern.touchIdle,
    touchSelectedTemplate: copy.games.lab.ui.pattern.touchSelectedTemplate,
    moveToFirst: copy.games.lab.ui.pattern.moveToFirst,
    moveToSecond: copy.games.lab.ui.pattern.moveToSecond,
    moveToPool: copy.games.lab.ui.pattern.moveToPool,
  },
  classify: {
    prompt: copy.games.lab.ui.classify.prompt,
    yesZoneLabel: copy.games.lab.ui.classify.yesZoneLabel,
    noZoneLabel: copy.games.lab.ui.classify.noZoneLabel,
    yesZoneAriaLabel: copy.games.lab.ui.classify.yesZoneAriaLabel,
    noZoneAriaLabel: copy.games.lab.ui.classify.noZoneAriaLabel,
    selectItemAriaTemplate: copy.games.lab.ui.classify.selectItemAriaTemplate,
    selectedTemplate: copy.games.lab.ui.classify.selectedTemplate,
    idle: copy.games.lab.ui.classify.idle,
    touchIdle: copy.games.lab.ui.classify.touchIdle,
    touchSelectedTemplate: copy.games.lab.ui.classify.touchSelectedTemplate,
    moveToYes: copy.games.lab.ui.classify.moveToYes,
    moveToNo: copy.games.lab.ui.classify.moveToNo,
    moveToPool: copy.games.lab.ui.classify.moveToPool,
  },
  analogy: {
    prompt: copy.games.lab.ui.analogy.prompt,
    optionAriaTemplate: copy.games.lab.ui.analogy.optionAriaTemplate,
  },
  feedback: {
    info: copy.games.lab.ui.feedback.info,
    success: copy.games.lab.ui.feedback.success,
    error: copy.games.lab.ui.feedback.error,
  },
  actions: {
    check: copy.games.lab.ui.actions.check,
    retry: copy.games.lab.ui.actions.retry,
    next: copy.games.lab.ui.actions.next,
    finish: copy.games.lab.ui.actions.finish,
  },
});

const buildIntroductionSlides = (copy: LogicalThinkingLessonCopy): LessonSlide[] => [
  {
    title: copy.slides.wprowadzenie.basics.title,
    content: (
      <KangurLessonStack>
        <KangurLessonLead>{copy.slides.wprowadzenie.basics.lead}</KangurLessonLead>
        <KangurLessonCallout accent='violet' className='w-full text-center' padding='sm'>
          <div className='mx-auto h-20 w-40 max-w-full'>
            <LogicalThinkingIntroAnimation ariaLabel={copy.animations.intro} />
          </div>
          <KangurLessonCaption className='mt-2'>
            {copy.slides.wprowadzenie.basics.caption}
          </KangurLessonCaption>
        </KangurLessonCallout>
        <KangurLessonCallout
          accent='violet'
          className='w-full text-sm [color:var(--kangur-page-text)]'
        >
          <p className='mb-2 font-semibold text-violet-700'>
            {copy.slides.wprowadzenie.basics.helpTitle}
          </p>
          <ul className='space-y-1'>
            {copy.slides.wprowadzenie.basics.helpItems.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </KangurLessonCallout>
      </KangurLessonStack>
    ),
  },
  {
    title: copy.slides.wprowadzenie.steps.title,
    content: (
      <KangurLessonStack>
        <KangurLessonLead>{copy.slides.wprowadzenie.steps.lead}</KangurLessonLead>
        <KangurLessonCallout accent='violet' className='w-full text-center' padding='sm'>
          <div className='mx-auto h-28 w-56 max-w-full sm:h-32 sm:w-64'>
            <LogicalThinkingStepsAnimation ariaLabel={copy.animations.steps} />
          </div>
          <KangurLessonCaption className='mt-2'>
            {copy.slides.wprowadzenie.steps.caption}
          </KangurLessonCaption>
        </KangurLessonCallout>
        <KangurLessonCallout accent='violet' className='w-full text-center'>
          <KangurLessonCaption className='mb-2'>
            {copy.slides.wprowadzenie.steps.exampleLabel}
          </KangurLessonCaption>
          <p className='text-2xl font-extrabold text-violet-700'>
            {copy.slides.wprowadzenie.steps.exampleSequence}
          </p>
          <p className='mt-2 font-bold text-violet-600'>
            {copy.slides.wprowadzenie.steps.exampleAnswer}
          </p>
        </KangurLessonCallout>
      </KangurLessonStack>
    ),
  },
];

const buildPatternSlides = (copy: LogicalThinkingLessonCopy): LessonSlide[] => [
  {
    title: copy.slides.wzorce.basics.title,
    content: (
      <KangurLessonStack>
        <KangurLessonLead>{copy.slides.wzorce.basics.lead}</KangurLessonLead>
        <KangurLessonCallout accent='sky' className='w-full text-center' padding='sm'>
          <div className='mx-auto h-20 w-40 max-w-full'>
            <LogicalPatternAnimation ariaLabel={copy.animations.pattern} />
          </div>
          <KangurLessonCaption className='mt-2'>
            {copy.slides.wzorce.basics.caption}
          </KangurLessonCaption>
        </KangurLessonCallout>
        <KangurLessonCallout accent='sky' className='w-full text-center'>
          <KangurLessonCaption className='mb-2'>
            {copy.slides.wzorce.basics.shapePrompt}
          </KangurLessonCaption>
          <p className='text-3xl tracking-widest'>{copy.slides.wzorce.basics.shapeSequence}</p>
          <p className='mt-2 font-bold text-blue-600'>
            {copy.slides.wzorce.basics.shapeAnswer}
          </p>
        </KangurLessonCallout>
        <KangurLessonCallout accent='sky' className='w-full text-center'>
          <KangurLessonCaption className='mb-2'>
            {copy.slides.wzorce.basics.numberPrompt}
          </KangurLessonCaption>
          <p className='text-2xl font-extrabold text-blue-700'>
            {copy.slides.wzorce.basics.numberSequence}
          </p>
          <p className='mt-2 font-bold text-blue-600'>
            {copy.slides.wzorce.basics.numberAnswer}
          </p>
        </KangurLessonCallout>
      </KangurLessonStack>
    ),
  },
  {
    title: copy.slides.wzorce.growth.title,
    content: (
      <KangurLessonStack>
        <KangurLessonLead>{copy.slides.wzorce.growth.lead}</KangurLessonLead>
        <KangurLessonCallout accent='sky' className='w-full text-center' padding='sm'>
          <div className='mx-auto h-20 w-40 max-w-full'>
            <LogicalPatternGrowthAnimation ariaLabel={copy.animations.patternGrowth} />
          </div>
          <KangurLessonCaption className='mt-2'>
            {copy.slides.wzorce.growth.caption}
          </KangurLessonCaption>
        </KangurLessonCallout>
        <KangurLessonCallout accent='sky' className='w-full text-center'>
          <KangurLessonCaption className='mb-2'>
            {copy.slides.wzorce.growth.examplePrompt}
          </KangurLessonCaption>
          <p className='text-2xl font-extrabold text-sky-700'>
            {copy.slides.wzorce.growth.exampleSequence}
          </p>
          <p className='mt-2 font-bold text-sky-600'>
            {copy.slides.wzorce.growth.exampleAnswer}
          </p>
        </KangurLessonCallout>
      </KangurLessonStack>
    ),
  },
];

const buildClassificationSlides = (copy: LogicalThinkingLessonCopy): LessonSlide[] => [
  {
    title: copy.slides.klasyfikacja.grouping.title,
    content: (
      <KangurLessonStack>
        <KangurLessonLead>{copy.slides.klasyfikacja.grouping.lead}</KangurLessonLead>
        <KangurLessonCallout accent='emerald' className='w-full text-center' padding='sm'>
          <div className='mx-auto h-20 w-40 max-w-full'>
            <LogicalClassificationAnimation ariaLabel={copy.animations.classification} />
          </div>
          <KangurLessonCaption className='mt-2'>
            {copy.slides.klasyfikacja.grouping.caption}
          </KangurLessonCaption>
        </KangurLessonCallout>
        <div className='grid w-full grid-cols-1 kangur-panel-gap min-[420px]:grid-cols-2'>
          <KangurLessonCallout accent='emerald' className='text-center' padding='sm'>
            <p className='mb-1 text-sm font-bold text-green-700'>
              {copy.slides.klasyfikacja.grouping.cards.fruits.title}
            </p>
            <p className='text-2xl'>{copy.slides.klasyfikacja.grouping.cards.fruits.items}</p>
          </KangurLessonCallout>
          <KangurLessonCallout accent='amber' className='text-center' padding='sm'>
            <p className='mb-1 text-sm font-bold text-orange-700'>
              {copy.slides.klasyfikacja.grouping.cards.vegetables.title}
            </p>
            <p className='text-2xl'>
              {copy.slides.klasyfikacja.grouping.cards.vegetables.items}
            </p>
          </KangurLessonCallout>
          <KangurLessonCallout accent='sky' className='text-center' padding='sm'>
            <p className='mb-1 text-sm font-bold text-sky-700'>
              {copy.slides.klasyfikacja.grouping.cards.seaAnimals.title}
            </p>
            <p className='text-2xl'>
              {copy.slides.klasyfikacja.grouping.cards.seaAnimals.items}
            </p>
          </KangurLessonCallout>
          <KangurLessonCallout accent='amber' className='text-center' padding='sm'>
            <p className='mb-1 text-sm font-bold text-yellow-700'>
              {copy.slides.klasyfikacja.grouping.cards.landAnimals.title}
            </p>
            <p className='text-2xl'>
              {copy.slides.klasyfikacja.grouping.cards.landAnimals.items}
            </p>
          </KangurLessonCallout>
        </div>
        <p className='text-center text-sm font-semibold text-violet-600'>
          {copy.slides.klasyfikacja.grouping.closing}
        </p>
      </KangurLessonStack>
    ),
  },
  {
    title: copy.slides.klasyfikacja.key.title,
    content: (
      <KangurLessonStack>
        <KangurLessonLead>{copy.slides.klasyfikacja.key.lead}</KangurLessonLead>
        <KangurLessonCallout accent='emerald' className='w-full text-center' padding='sm'>
          <div className='mx-auto h-28 w-56 max-w-full sm:h-32 sm:w-64'>
            <LogicalClassificationKeyAnimation ariaLabel={copy.animations.classificationKey} />
          </div>
          <KangurLessonCaption className='mt-2'>
            {copy.slides.klasyfikacja.key.caption}
          </KangurLessonCaption>
        </KangurLessonCallout>
        <KangurLessonCallout accent='emerald' className='w-full text-center'>
          <KangurLessonCaption className='mb-2'>
            {copy.slides.klasyfikacja.key.exampleLabel}
          </KangurLessonCaption>
          <p className='text-2xl'>{copy.slides.klasyfikacja.key.exampleItems}</p>
          <p className='mt-2 font-bold text-emerald-600'>
            {copy.slides.klasyfikacja.key.exampleAnswer}
          </p>
        </KangurLessonCallout>
      </KangurLessonStack>
    ),
  },
  {
    title: copy.slides.klasyfikacja.oddOneOut.title,
    content: (
      <KangurLessonStack>
        <KangurLessonLead>{copy.slides.klasyfikacja.oddOneOut.lead}</KangurLessonLead>
        <KangurLessonCallout accent='rose' className='w-full text-center'>
          <p className='mb-2 text-3xl'>{copy.slides.klasyfikacja.oddOneOut.itemsSequence}</p>
          <KangurLessonCaption>{copy.slides.klasyfikacja.oddOneOut.itemsPrompt}</KangurLessonCaption>
          <p className='mt-2 font-bold text-rose-600'>
            {copy.slides.klasyfikacja.oddOneOut.itemsAnswer}
          </p>
        </KangurLessonCallout>
        <KangurLessonCallout accent='rose' className='w-full text-center'>
          <p className='mb-2 text-2xl font-extrabold [color:var(--kangur-page-text)]'>
            {copy.slides.klasyfikacja.oddOneOut.numberSequence}
          </p>
          <KangurLessonCaption>
            {copy.slides.klasyfikacja.oddOneOut.numberPrompt}
          </KangurLessonCaption>
          <p className='mt-2 font-bold text-rose-600'>
            {copy.slides.klasyfikacja.oddOneOut.numberAnswer}
          </p>
        </KangurLessonCallout>
      </KangurLessonStack>
    ),
  },
];

const buildReasoningSlides = (copy: LogicalThinkingLessonCopy): LessonSlide[] => [
  {
    title: copy.slides.wnioskowanie.basics.title,
    content: (
      <KangurLessonStack>
        <KangurLessonLead>{copy.slides.wnioskowanie.basics.lead}</KangurLessonLead>
        <KangurLessonCallout accent='indigo' className='w-full text-center' padding='sm'>
          <div className='mx-auto h-28 w-56 max-w-full sm:h-32 sm:w-64'>
            <LogicalReasoningAnimation ariaLabel={copy.animations.reasoning} />
          </div>
          <KangurLessonCaption className='mt-2'>
            {copy.slides.wnioskowanie.basics.caption}
          </KangurLessonCaption>
        </KangurLessonCallout>
        <div className='flex w-full flex-col kangur-panel-gap'>
          {copy.slides.wnioskowanie.basics.examples.map((example) => (
            <KangurLessonCallout key={example} accent='indigo' padding='sm'>
              <p className='text-sm text-indigo-800'>{example}</p>
            </KangurLessonCallout>
          ))}
        </div>
      </KangurLessonStack>
    ),
  },
];

const buildIfThenGameSlides = (copy: LogicalThinkingLessonCopy): LessonSlide[] => {
  const ifThenRounds = buildIfThenRounds(copy);
  const ifThenGameCopy = buildIfThenGameCopy(copy);

  return [
    {
      title: copy.slides.wnioskowanie_gra.interactive.title,
      containerClassName: 'max-w-[min(760px,90vw)]',
      panelClassName: 'w-full mx-auto lg:w-[min(760px,90vw)]',
      content: (
        <KangurLessonStack>
          <KangurLessonLead>{copy.slides.wnioskowanie_gra.interactive.lead}</KangurLessonLead>
          <KangurLessonInset accent='indigo' className='w-full' padding='sm'>
            <LogicalIfThenStepsGame rounds={ifThenRounds} copy={ifThenGameCopy} />
          </KangurLessonInset>
        </KangurLessonStack>
      ),
    },
  ];
};

const buildAnalogySlides = (copy: LogicalThinkingLessonCopy): LessonSlide[] => [
  {
    title: copy.slides.analogie.basics.title,
    content: (
      <KangurLessonStack>
        <KangurLessonLead>{copy.slides.analogie.basics.lead}</KangurLessonLead>
        <KangurLessonCallout accent='violet' className='w-full text-center' padding='sm'>
          <div className='mx-auto h-20 w-40 max-w-full'>
            <LogicalAnalogiesAnimation ariaLabel={copy.animations.analogies} />
          </div>
          <KangurLessonCaption className='mt-2'>
            {copy.slides.analogie.basics.caption}
          </KangurLessonCaption>
        </KangurLessonCallout>
        <div className='flex w-full flex-col kangur-panel-gap'>
          {copy.slides.analogie.basics.examples.map((example) => (
            <KangurLessonCallout
              key={example}
              accent='violet'
              className='text-center'
              padding='sm'
            >
              <p className='text-sm [color:var(--kangur-page-text)]'>{example}</p>
            </KangurLessonCallout>
          ))}
        </div>
      </KangurLessonStack>
    ),
  },
  {
    title: copy.slides.analogie.map.title,
    content: (
      <KangurLessonStack>
        <KangurLessonLead>{copy.slides.analogie.map.lead}</KangurLessonLead>
        <KangurLessonCallout accent='violet' className='w-full text-center' padding='sm'>
          <div className='mx-auto h-20 w-40 max-w-full'>
            <LogicalAnalogyMapAnimation ariaLabel={copy.animations.analogyMap} />
          </div>
          <KangurLessonCaption className='mt-2'>
            {copy.slides.analogie.map.caption}
          </KangurLessonCaption>
        </KangurLessonCallout>
        <KangurLessonCallout accent='violet' className='w-full text-center' padding='sm'>
          <p className='text-sm [color:var(--kangur-page-text)]'>
            {copy.slides.analogie.map.example}
          </p>
        </KangurLessonCallout>
      </KangurLessonStack>
    ),
  },
];

const buildLabSlides = (copy: LogicalThinkingLessonCopy): LessonSlide[] => {
  const labAnalogyRounds = buildLabAnalogyRounds(copy);
  const labGameCopy = buildLabGameCopy(copy);

  return [
    {
      title: copy.slides.laboratorium_gra.interactive.title,
      containerClassName: 'max-w-[min(760px,90vw)]',
      panelClassName: 'w-full mx-auto lg:w-[min(760px,90vw)]',
      content: (
        <KangurLessonStack>
          <KangurLessonLead>{copy.slides.laboratorium_gra.interactive.lead}</KangurLessonLead>
          <KangurLessonCallout accent='violet' className='w-full' padding='sm'>
            <LogicalThinkingLabGame analogyRounds={labAnalogyRounds} copy={labGameCopy} />
          </KangurLessonCallout>
        </KangurLessonStack>
      ),
    },
  ];
};

const buildSummarySlides = (copy: LogicalThinkingLessonCopy): LessonSlide[] => [
  {
    title: copy.slides.zapamietaj.overview.title,
    content: (
      <KangurLessonStack>
        <KangurLessonCallout accent='amber' className='w-full text-center' padding='sm'>
          <div className='mx-auto h-20 w-40 max-w-full'>
            <LogicalSummaryAnimation ariaLabel={copy.animations.summary} />
          </div>
          <KangurLessonCaption className='mt-2'>
            {copy.slides.zapamietaj.overview.caption}
          </KangurLessonCaption>
        </KangurLessonCallout>
        <KangurLessonCallout accent='amber' className='w-full'>
          <ul className='space-y-2 text-sm [color:var(--kangur-page-text)]'>
            {copy.slides.zapamietaj.overview.items.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </KangurLessonCallout>
        <p className='text-center font-bold text-violet-600'>
          {copy.slides.zapamietaj.overview.closing}
        </p>
      </KangurLessonStack>
    ),
  },
];

export const buildLogicalThinkingSlides = (
  copy: LogicalThinkingLessonCopy
): Record<SectionId, LessonSlide[]> => ({
  wprowadzenie: buildIntroductionSlides(copy),
  wzorce: buildPatternSlides(copy),
  klasyfikacja: buildClassificationSlides(copy),
  wnioskowanie: buildReasoningSlides(copy),
  analogie: buildAnalogySlides(copy),
  zapamietaj: buildSummarySlides(copy),
  wnioskowanie_gra: buildIfThenGameSlides(copy),
  laboratorium_gra: buildLabSlides(copy),
});

export const buildLogicalThinkingSections = (copy: LogicalThinkingLessonCopy) =>
  [
    {
      id: 'wprowadzenie',
      emoji: '🧠',
      title: copy.sections.wprowadzenie.title,
      description: copy.sections.wprowadzenie.description,
    },
    {
      id: 'wzorce',
      emoji: '🔢',
      title: copy.sections.wzorce.title,
      description: copy.sections.wzorce.description,
    },
    {
      id: 'klasyfikacja',
      emoji: '📦',
      title: copy.sections.klasyfikacja.title,
      description: copy.sections.klasyfikacja.description,
    },
    {
      id: 'wnioskowanie',
      emoji: '💡',
      title: copy.sections.wnioskowanie.title,
      description: copy.sections.wnioskowanie.description,
    },
    {
      id: 'analogie',
      emoji: '🔗',
      title: copy.sections.analogie.title,
      description: copy.sections.analogie.description,
    },
    {
      id: 'zapamietaj',
      emoji: '🌟',
      title: copy.sections.zapamietaj.title,
      description: copy.sections.zapamietaj.description,
    },
    {
      id: 'wnioskowanie_gra',
      emoji: '🎮',
      title: copy.sections.wnioskowanie_gra.title,
      description: copy.sections.wnioskowanie_gra.description,
      isGame: true,
    },
    {
      id: 'laboratorium_gra',
      emoji: '🎮',
      title: copy.sections.laboratorium_gra.title,
      description: copy.sections.laboratorium_gra.description,
      isGame: true,
    },
  ] as const;

export const buildLogicalThinkingSectionLabels = (
  copy: LogicalThinkingLessonCopy
): Partial<Record<SectionId, string>> => ({
  wprowadzenie: copy.sections.wprowadzenie.title,
  wzorce: copy.sections.wzorce.title,
  klasyfikacja: copy.sections.klasyfikacja.title,
  wnioskowanie: copy.sections.wnioskowanie.title,
  analogie: copy.sections.analogie.title,
  zapamietaj: copy.sections.zapamietaj.title,
});

export const SECTION_SLIDES = buildLogicalThinkingSlides(
  LOGICAL_THINKING_LESSON_COMPONENT_CONTENT
);
export const SLIDES: LessonSlide[] = LOGICAL_THINKING_SECTION_ORDER.flatMap(
  (sectionId) => SECTION_SLIDES[sectionId]
);
export const HUB_SECTIONS = buildLogicalThinkingSections(
  LOGICAL_THINKING_LESSON_COMPONENT_CONTENT
);
