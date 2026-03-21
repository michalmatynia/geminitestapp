'use client';

import { useTranslations } from 'next-intl';

import plMessages from '@/i18n/messages/pl.json';
import type { LessonSlide } from '@/features/kangur/ui/components/LessonSlideSection';
import LogicalClassificationGame from '@/features/kangur/ui/components/LogicalClassificationGame';
import {
  ClassificationCategoryBinsAnimation,
  ClassificationCriteriaAxesAnimation,
  ClassificationCriteriaSwitchAnimation,
  ClassificationHiddenRuleAnimation,
  ClassificationOddOneOutAnimation,
  ClassificationOddOneOutPatternAnimation,
  ClassificationParityAnimation,
  ClassificationRecapSequenceAnimation,
  ClassificationSortByColorAnimation,
  ClassificationSortByShapeAnimation,
  ClassificationSortBySizeAnimation,
  ClassificationTwoCriteriaGridAnimation,
  ClassificationVennOverlapAnimation,
  ClassificationVennUnionAnimation,
} from '@/features/kangur/ui/components/LogicalLessonAnimations';
import {
  KangurLessonCallout,
  KangurLessonCaption,
  KangurLessonInset,
  KangurLessonLead,
  KangurLessonStack,
} from '@/features/kangur/ui/design/lesson-primitives';
import type { LessonTranslate } from '@/features/kangur/ui/components/lesson-copy';
import { KangurUnifiedLesson } from '@/features/kangur/ui/lessons/lesson-components';

type SectionId = 'intro' | 'diagram' | 'intruz' | 'podsumowanie' | 'game';

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

const buildLogicalClassificationSlides = (
  translate: LessonTranslate
): Record<Exclude<SectionId, 'game'>, LessonSlide[]> => ({
  intro: [
    {
      title: translate('slides.intro.basics.title'),
      content: (
        <KangurLessonStack>
          <KangurLessonLead>{translate('slides.intro.basics.lead')}</KangurLessonLead>
          <KangurLessonInset accent='teal' className='w-full' padding='sm'>
            <ClassificationSortByColorAnimation />
            <KangurLessonCaption className='mt-2'>
              {translate('slides.intro.basics.caption')}
            </KangurLessonCaption>
          </KangurLessonInset>
          <KangurLessonCallout
            accent='teal'
            className='w-full text-sm [color:var(--kangur-page-muted-text)]'
          >
            <p className='mb-2 font-semibold text-teal-700'>
              {translate('slides.intro.basics.criteriaLabel')}
            </p>
            <ul className='space-y-1'>
              {[
                'slides.intro.basics.criteria.color',
                'slides.intro.basics.criteria.shape',
                'slides.intro.basics.criteria.size',
                'slides.intro.basics.criteria.category',
                'slides.intro.basics.criteria.number',
              ].map((key) => (
                <li key={key}>{translate(key)}</li>
              ))}
            </ul>
          </KangurLessonCallout>
        </KangurLessonStack>
      ),
    },
    {
      title: translate('slides.intro.grouping.title'),
      content: (
        <KangurLessonStack>
          <KangurLessonLead>{translate('slides.intro.grouping.lead')}</KangurLessonLead>
          <KangurLessonInset accent='emerald' className='w-full' padding='sm'>
            <ClassificationSortBySizeAnimation />
            <KangurLessonCaption className='mt-2'>
              {translate('slides.intro.grouping.caption')}
            </KangurLessonCaption>
          </KangurLessonInset>
          <div className='grid w-full grid-cols-1 kangur-panel-gap min-[420px]:grid-cols-2'>
            {[
              {
                accent: 'emerald' as const,
                titleKey: 'slides.intro.grouping.cards.flyingAnimals.title',
                itemsKey: 'slides.intro.grouping.cards.flyingAnimals.items',
                noteKey: 'slides.intro.grouping.cards.flyingAnimals.note',
                titleClassName: 'text-green-700',
                itemsClassName: '',
              },
              {
                accent: 'sky' as const,
                titleKey: 'slides.intro.grouping.cards.waterAnimals.title',
                itemsKey: 'slides.intro.grouping.cards.waterAnimals.items',
                noteKey: 'slides.intro.grouping.cards.waterAnimals.note',
                titleClassName: 'text-blue-700',
                itemsClassName: '',
              },
              {
                accent: 'amber' as const,
                titleKey: 'slides.intro.grouping.cards.evenNumbers.title',
                itemsKey: 'slides.intro.grouping.cards.evenNumbers.items',
                noteKey: 'slides.intro.grouping.cards.evenNumbers.note',
                titleClassName: 'text-orange-700',
                itemsClassName: 'font-extrabold text-orange-600',
              },
              {
                accent: 'rose' as const,
                titleKey: 'slides.intro.grouping.cards.oddNumbers.title',
                itemsKey: 'slides.intro.grouping.cards.oddNumbers.items',
                noteKey: 'slides.intro.grouping.cards.oddNumbers.note',
                titleClassName: 'text-rose-700',
                itemsClassName: 'font-extrabold text-rose-600',
              },
            ].map((card) => (
              <KangurLessonCallout
                key={card.titleKey}
                accent={card.accent}
                className='text-center'
                padding='sm'
              >
                <p className={`mb-1 text-xs font-bold ${card.titleClassName}`}>
                  {translate(card.titleKey)}
                </p>
                <p className={`text-2xl ${card.itemsClassName}`}>{translate(card.itemsKey)}</p>
                <KangurLessonCaption className='mt-1'>
                  {translate(card.noteKey)}
                </KangurLessonCaption>
              </KangurLessonCallout>
            ))}
          </div>
        </KangurLessonStack>
      ),
    },
    {
      title: translate('slides.intro.shapeSorting.title'),
      content: (
        <KangurLessonStack>
          <KangurLessonLead>{translate('slides.intro.shapeSorting.lead')}</KangurLessonLead>
          <KangurLessonInset accent='sky' className='w-full' padding='sm'>
            <ClassificationSortByShapeAnimation />
            <KangurLessonCaption className='mt-2'>
              {translate('slides.intro.shapeSorting.caption')}
            </KangurLessonCaption>
          </KangurLessonInset>
          <div className='grid w-full grid-cols-1 kangur-panel-gap min-[420px]:grid-cols-2'>
            {[
              {
                accent: 'violet' as const,
                titleKey: 'slides.intro.shapeSorting.cards.circles.title',
                itemsKey: 'slides.intro.shapeSorting.cards.circles.items',
                noteKey: 'slides.intro.shapeSorting.cards.circles.note',
                titleClassName: 'text-violet-700',
              },
              {
                accent: 'sky' as const,
                titleKey: 'slides.intro.shapeSorting.cards.squares.title',
                itemsKey: 'slides.intro.shapeSorting.cards.squares.items',
                noteKey: 'slides.intro.shapeSorting.cards.squares.note',
                titleClassName: 'text-blue-700',
              },
            ].map((card) => (
              <KangurLessonCallout
                key={card.titleKey}
                accent={card.accent}
                className='text-center'
                padding='sm'
              >
                <p className={`mb-1 text-xs font-bold ${card.titleClassName}`}>
                  {translate(card.titleKey)}
                </p>
                <p className='text-2xl'>{translate(card.itemsKey)}</p>
                <KangurLessonCaption className='mt-1'>
                  {translate(card.noteKey)}
                </KangurLessonCaption>
              </KangurLessonCallout>
            ))}
          </div>
        </KangurLessonStack>
      ),
    },
    {
      title: translate('slides.intro.categories.title'),
      content: (
        <KangurLessonStack>
          <KangurLessonLead>{translate('slides.intro.categories.lead')}</KangurLessonLead>
          <KangurLessonInset accent='amber' className='w-full' padding='sm'>
            <ClassificationCategoryBinsAnimation />
            <KangurLessonCaption className='mt-2'>
              {translate('slides.intro.categories.caption')}
            </KangurLessonCaption>
          </KangurLessonInset>
          <KangurLessonCallout
            accent='amber'
            className='w-full text-sm [color:var(--kangur-page-muted-text)]'
          >
            <p className='mb-2 font-semibold text-amber-700'>
              {translate('slides.intro.categories.examplesLabel')}
            </p>
            <ul className='space-y-1'>
              {[
                'slides.intro.categories.examples.fruit',
                'slides.intro.categories.examples.vegetables',
                'slides.intro.categories.examples.toys',
              ].map((key) => (
                <li key={key}>{translate(key)}</li>
              ))}
            </ul>
          </KangurLessonCallout>
        </KangurLessonStack>
      ),
    },
  ],
  diagram: [
    {
      title: translate('slides.diagram.multiCriteria.title'),
      content: (
        <KangurLessonStack>
          <KangurLessonLead>{translate('slides.diagram.multiCriteria.lead')}</KangurLessonLead>
          <KangurLessonInset accent='teal' className='w-full' padding='sm'>
            <ClassificationTwoCriteriaGridAnimation />
            <KangurLessonCaption className='mt-2'>
              {translate('slides.diagram.multiCriteria.gridCaption')}
            </KangurLessonCaption>
          </KangurLessonInset>
          <KangurLessonInset accent='teal' className='w-full' padding='sm'>
            <ClassificationCriteriaAxesAnimation />
            <KangurLessonCaption className='mt-2'>
              {translate('slides.diagram.multiCriteria.axesCaption')}
            </KangurLessonCaption>
          </KangurLessonInset>
          <KangurLessonCallout accent='teal' className='w-full'>
            <p className='mb-3 text-center text-sm font-semibold text-teal-700'>
              {translate('slides.diagram.multiCriteria.exampleLabel')}
            </p>
            <div className='grid grid-cols-1 gap-2 text-center text-sm min-[420px]:grid-cols-2'>
              {[
                'bigRed',
                'bigBlue',
                'smallRed',
                'smallBlue',
              ].map((key) => (
                <KangurLessonInset
                  key={key}
                  accent='teal'
                  padding='sm'
                >
                  <p className='text-xs [color:var(--kangur-page-muted-text)]'>
                    {translate(`slides.diagram.multiCriteria.items.${key}.label`)}
                  </p>
                  <p className='text-2xl'>
                    {translate(`slides.diagram.multiCriteria.items.${key}.icons`)}
                  </p>
                </KangurLessonInset>
              ))}
            </div>
            <KangurLessonCaption className='mt-2'>
              {translate('slides.diagram.multiCriteria.summary')}
            </KangurLessonCaption>
          </KangurLessonCallout>
        </KangurLessonStack>
      ),
    },
    {
      title: translate('slides.diagram.venn.title'),
      content: (
        <KangurLessonStack>
          <KangurLessonLead>{translate('slides.diagram.venn.lead')}</KangurLessonLead>
          <KangurLessonInset accent='sky' className='w-full' padding='sm'>
            <ClassificationVennOverlapAnimation />
            <KangurLessonCaption className='mt-2'>
              {translate('slides.diagram.venn.overlapCaption')}
            </KangurLessonCaption>
          </KangurLessonInset>
          <KangurLessonInset accent='sky' className='w-full' padding='sm'>
            <ClassificationVennUnionAnimation />
            <KangurLessonCaption className='mt-2'>
              {translate('slides.diagram.venn.unionCaption')}
            </KangurLessonCaption>
          </KangurLessonInset>
          <KangurLessonCallout accent='sky' className='w-full'>
            <KangurLessonCaption className='mb-3'>
              {translate('slides.diagram.venn.exampleLabel')}
            </KangurLessonCaption>
            <div className='flex items-center justify-center gap-0'>
              <div className='flex h-24 w-32 flex-col items-start justify-center rounded-full border-2 border-sky-400 bg-sky-200/70 pl-3'>
                <p className='text-xs font-bold text-sky-700'>
                  {translate('slides.diagram.venn.zones.onlySport.label')}
                </p>
                <p className='text-lg'>
                  {translate('slides.diagram.venn.zones.onlySport.icons')}
                </p>
              </div>
              <div className='z-10 -mx-4 flex h-24 w-16 flex-col items-center justify-center rounded-none border-y-2 border-teal-400 bg-teal-200/80'>
                <p className='text-center text-xs font-bold text-teal-700'>
                  {translate('slides.diagram.venn.zones.both.label')}
                </p>
                <p className='text-lg'>
                  {translate('slides.diagram.venn.zones.both.icons')}
                </p>
              </div>
              <div className='flex h-24 w-32 flex-col items-end justify-center rounded-full border-2 border-yellow-400 bg-yellow-200/70 pr-3'>
                <p className='text-xs font-bold text-yellow-700'>
                  {translate('slides.diagram.venn.zones.onlyMusic.label')}
                </p>
                <p className='text-lg'>
                  {translate('slides.diagram.venn.zones.onlyMusic.icons')}
                </p>
              </div>
            </div>
          </KangurLessonCallout>
        </KangurLessonStack>
      ),
    },
    {
      title: translate('slides.diagram.switchCriteria.title'),
      content: (
        <KangurLessonStack>
          <KangurLessonLead>{translate('slides.diagram.switchCriteria.lead')}</KangurLessonLead>
          <KangurLessonInset accent='teal' className='w-full' padding='sm'>
            <ClassificationCriteriaSwitchAnimation />
            <KangurLessonCaption className='mt-2'>
              {translate('slides.diagram.switchCriteria.caption')}
            </KangurLessonCaption>
          </KangurLessonInset>
          <KangurLessonCallout
            accent='teal'
            className='w-full text-sm [color:var(--kangur-page-muted-text)]'
          >
            <p className='mb-2 font-semibold text-teal-700'>
              {translate('slides.diagram.switchCriteria.pickLabel')}
            </p>
            <ul className='space-y-1'>
              {[
                'slides.diagram.switchCriteria.tips.first',
                'slides.diagram.switchCriteria.tips.second',
              ].map((key) => (
                <li key={key}>{translate(key)}</li>
              ))}
            </ul>
          </KangurLessonCallout>
        </KangurLessonStack>
      ),
    },
  ],
  intruz: [
    {
      title: translate('slides.intruz.level1.title'),
      content: (
        <KangurLessonStack>
          <KangurLessonLead>{translate('slides.intruz.level1.lead')}</KangurLessonLead>
          <KangurLessonInset accent='rose' className='w-full' padding='sm'>
            <ClassificationOddOneOutAnimation />
            <KangurLessonCaption className='mt-2'>
              {translate('slides.intruz.level1.caption')}
            </KangurLessonCaption>
          </KangurLessonInset>
          <div className='flex w-full flex-col kangur-panel-gap'>
            {['fruits', 'numbers', 'animals'].map((key) => (
              <KangurLessonCallout
                key={key}
                accent='rose'
                className='text-center'
                padding='sm'
              >
                <p className='mb-1 text-2xl'>
                  {translate(`slides.intruz.level1.examples.${key}.items`)}
                </p>
                <p className='mt-1 text-sm font-bold text-rose-600'>
                  {translate(`slides.intruz.level1.examples.${key}.answer`)}
                </p>
              </KangurLessonCallout>
            ))}
          </div>
        </KangurLessonStack>
      ),
    },
    {
      title: translate('slides.intruz.level2.title'),
      content: (
        <KangurLessonStack>
          <KangurLessonLead>{translate('slides.intruz.level2.lead')}</KangurLessonLead>
          <KangurLessonInset accent='amber' className='w-full' padding='sm'>
            <ClassificationHiddenRuleAnimation />
            <KangurLessonCaption className='mt-2'>
              {translate('slides.intruz.level2.caption')}
            </KangurLessonCaption>
          </KangurLessonInset>
          <div className='flex w-full flex-col kangur-panel-gap'>
            {['multiples', 'space', 'shapes'].map((key) => (
              <KangurLessonCallout
                key={key}
                accent='amber'
                className='text-center'
                padding='sm'
              >
                <p className='mb-1 text-lg font-bold [color:var(--kangur-page-text)]'>
                  {translate(`slides.intruz.level2.examples.${key}.items`)}
                </p>
                <p className='mt-1 text-sm font-bold text-amber-700'>
                  {translate(`slides.intruz.level2.examples.${key}.answer`)}
                </p>
              </KangurLessonCallout>
            ))}
          </div>
        </KangurLessonStack>
      ),
    },
    {
      title: translate('slides.intruz.level3.title'),
      content: (
        <KangurLessonStack>
          <KangurLessonLead>{translate('slides.intruz.level3.lead')}</KangurLessonLead>
          <KangurLessonInset accent='rose' className='w-full' padding='sm'>
            <ClassificationOddOneOutPatternAnimation />
            <KangurLessonCaption className='mt-2'>
              {translate('slides.intruz.level3.caption')}
            </KangurLessonCaption>
          </KangurLessonInset>
          <div className='flex w-full flex-col kangur-panel-gap'>
            {['shape', 'color'].map((key) => (
              <KangurLessonCallout
                key={key}
                accent='rose'
                className='text-center'
                padding='sm'
              >
                <p className='mb-1 text-2xl'>
                  {translate(`slides.intruz.level3.examples.${key}.items`)}
                </p>
                <p className='mt-1 text-sm font-bold text-rose-600'>
                  {translate(`slides.intruz.level3.examples.${key}.answer`)}
                </p>
              </KangurLessonCallout>
            ))}
          </div>
        </KangurLessonStack>
      ),
    },
  ],
  podsumowanie: [
    {
      title: translate('slides.podsumowanie.overview.title'),
      content: (
        <KangurLessonStack>
          <KangurLessonInset accent='teal' className='w-full' padding='sm'>
            <ClassificationRecapSequenceAnimation />
            <KangurLessonCaption className='mt-2'>
              {translate('slides.podsumowanie.overview.caption')}
            </KangurLessonCaption>
          </KangurLessonInset>
          <KangurLessonCallout accent='amber' className='w-full'>
            <ul className='space-y-2 text-sm [color:var(--kangur-page-text)]'>
              {[
                'classification',
                'manyCriteria',
                'venn',
                'oddOneOut1',
                'oddOneOut2',
                'oddOneOut3',
              ].map((key) => (
                <li key={key}>{translate(`slides.podsumowanie.overview.items.${key}`)}</li>
              ))}
            </ul>
          </KangurLessonCallout>
          <p className='text-center font-bold text-teal-600'>
            {translate('slides.podsumowanie.overview.closing')}
          </p>
        </KangurLessonStack>
      ),
    },
    {
      title: translate('slides.podsumowanie.color.title'),
      content: (
        <KangurLessonStack>
          <KangurLessonInset accent='teal' className='w-full text-center' padding='sm'>
            <ClassificationSortByColorAnimation />
            <KangurLessonCaption className='mt-2 text-center'>
              {translate('slides.podsumowanie.color.caption')}
            </KangurLessonCaption>
          </KangurLessonInset>
        </KangurLessonStack>
      ),
    },
    {
      title: translate('slides.podsumowanie.shape.title'),
      content: (
        <KangurLessonStack>
          <KangurLessonInset accent='sky' className='w-full text-center' padding='sm'>
            <ClassificationSortByShapeAnimation />
            <KangurLessonCaption className='mt-2 text-center'>
              {translate('slides.podsumowanie.shape.caption')}
            </KangurLessonCaption>
          </KangurLessonInset>
        </KangurLessonStack>
      ),
    },
    {
      title: translate('slides.podsumowanie.parity.title'),
      content: (
        <KangurLessonStack>
          <KangurLessonInset accent='amber' className='w-full text-center' padding='sm'>
            <ClassificationParityAnimation />
            <KangurLessonCaption className='mt-2 text-center'>
              {translate('slides.podsumowanie.parity.caption')}
            </KangurLessonCaption>
          </KangurLessonInset>
        </KangurLessonStack>
      ),
    },
    {
      title: translate('slides.podsumowanie.twoCriteria.title'),
      content: (
        <KangurLessonStack>
          <KangurLessonInset accent='emerald' className='w-full text-center' padding='sm'>
            <ClassificationTwoCriteriaGridAnimation />
            <KangurLessonCaption className='mt-2 text-center'>
              {translate('slides.podsumowanie.twoCriteria.caption')}
            </KangurLessonCaption>
          </KangurLessonInset>
        </KangurLessonStack>
      ),
    },
    {
      title: translate('slides.podsumowanie.intersection.title'),
      content: (
        <KangurLessonStack>
          <KangurLessonInset accent='slate' className='w-full text-center' padding='sm'>
            <ClassificationVennOverlapAnimation />
            <KangurLessonCaption className='mt-2 text-center'>
              {translate('slides.podsumowanie.intersection.caption')}
            </KangurLessonCaption>
          </KangurLessonInset>
        </KangurLessonStack>
      ),
    },
    {
      title: translate('slides.podsumowanie.oddOneOut.title'),
      content: (
        <KangurLessonStack>
          <KangurLessonInset accent='rose' className='w-full text-center' padding='sm'>
            <ClassificationOddOneOutPatternAnimation />
            <KangurLessonCaption className='mt-2 text-center'>
              {translate('slides.podsumowanie.oddOneOut.caption')}
            </KangurLessonCaption>
          </KangurLessonInset>
        </KangurLessonStack>
      ),
    },
  ],
});

const buildLogicalClassificationSections = (translate: LessonTranslate) =>
  [
    {
      id: 'intro',
      emoji: '📦',
      title: translate('sections.intro.title'),
      description: translate('sections.intro.description'),
    },
    {
      id: 'diagram',
      emoji: '🔵🟡',
      title: translate('sections.diagram.title'),
      description: translate('sections.diagram.description'),
    },
    {
      id: 'intruz',
      emoji: '🔎',
      title: translate('sections.intruz.title'),
      description: translate('sections.intruz.description'),
    },
    {
      id: 'podsumowanie',
      emoji: '📋',
      title: translate('sections.podsumowanie.title'),
      description: translate('sections.podsumowanie.description'),
    },
    {
      id: 'game',
      emoji: '🎯',
      title: translate('sections.game.title'),
      description: translate('sections.game.description'),
      isGame: true,
    },
  ] as const;

const translateStaticLogicalClassification = createStaticTranslator(
  plMessages.KangurStaticLessons.logicalClassification as Record<string, unknown>
);

export const SLIDES = buildLogicalClassificationSlides(translateStaticLogicalClassification);
export const HUB_SECTIONS = buildLogicalClassificationSections(translateStaticLogicalClassification);

export default function LogicalClassificationLesson(): React.JSX.Element {
  const translations = useTranslations('KangurStaticLessons.logicalClassification');
  const translate = (key: string): string => translations(key as never);
  const sections = buildLogicalClassificationSections(translate);
  const slides = buildLogicalClassificationSlides(translate);

  return (
    <KangurUnifiedLesson
      progressMode='panel'
      lessonId='logical_classification'
      lessonEmoji='📦'
      lessonTitle={translate('lessonTitle')}
      sections={sections}
      slides={slides}
      gradientClass='kangur-gradient-accent-teal'
      progressDotClassName='bg-teal-300'
      dotActiveClass='bg-teal-500'
      dotDoneClass='bg-teal-300'
      skipMarkFor={['game']}
      games={[
        {
          sectionId: 'game',
          stage: {
            accent: 'teal',
            icon: '🎯',
            maxWidthClassName: 'max-w-3xl',
            shellTestId: 'logical-classification-game-shell',
            title: translate('game.stageTitle'),
          },
          render: ({ onFinish }) => <LogicalClassificationGame onFinish={onFinish} />,
        },
      ]}
    />
  );
}
