'use client';

import type { LessonProps } from '@/features/kangur/lessons/lesson-ui-registry';
import { resolveKangurLessonTemplateComponentContent } from '@/features/kangur/lessons/lesson-template-component-content';
import { useOptionalKangurLessonTemplate } from '@/features/kangur/ui/context/KangurLessonsRuntimeContext';
import { useMemo } from 'react';
import { useTranslations } from 'next-intl';

import { getKangurBuiltInGameInstanceId } from '@/features/kangur/games';
import type { LessonSlide } from '@/features/kangur/ui/components/lesson-framework/LessonSlideSection';
import {
  AnalogyBridgeAnimation,
  CauseEffectAnimation,
  NumberOperationAnimation,
  PartWholeAnimation,
  ShapeTransformAnimation,
} from './LogicalAnalogiesAnimations';
import {
  KangurLessonCallout,
  KangurLessonCaption,
  KangurLessonInset,
  KangurLessonLead,
  KangurLessonStack,
} from '@/features/kangur/ui/design/lesson-primitives';
import { KANGUR_STACK_TIGHT_CLASSNAME } from '@/features/kangur/ui/design/tokens';
import { KangurUnifiedLesson } from '@/features/kangur/ui/lessons/lesson-components';
import {
  createLessonFallbackTranslate,
  type LessonTranslate,
} from './lesson-copy';
import {
  createLogicalAnalogiesLessonContentFromTranslate,
  LOGICAL_ANALOGIES_LESSON_COMPONENT_CONTENT,
} from './logical-analogies-lesson-content';
import type { KangurLogicalAnalogiesLessonTemplateContent } from '@/shared/contracts/kangur-lesson-templates';

type SectionId = 'intro' | 'liczby_ksztalty' | 'relacje' | 'game_relacje' | 'podsumowanie';
type SlideSectionId = Exclude<SectionId, 'game_relacje'>;
type LogicalAnalogiesLessonCopy = KangurLogicalAnalogiesLessonTemplateContent;
const LOGICAL_ANALOGIES_INSTANCE_ID = getKangurBuiltInGameInstanceId(
  'logical_analogies_relations'
);

const buildLogicalAnalogiesSlides = (
  copy: LogicalAnalogiesLessonCopy
): Record<SlideSectionId, LessonSlide[]> => ({
  intro: [
    {
      title: copy.slides.intro.introQuestion.title,
      content: (
        <KangurLessonStack>
          <KangurLessonLead>{copy.slides.intro.introQuestion.lead}</KangurLessonLead>
          <KangurLessonCallout accent='rose' className='w-full text-sm'>
            <p className='mb-2 font-semibold text-pink-700'>
              {copy.slides.intro.introQuestion.notationLabel}
            </p>
            <p className='text-center text-lg font-bold [color:var(--kangur-page-text)]'>
              A : B = C : D
            </p>
            <KangurLessonCaption className='mt-1'>
              {copy.slides.intro.introQuestion.notationCaption}
            </KangurLessonCaption>
            <KangurLessonInset accent='rose' className='mt-2 text-center' padding='sm'>
              <p className='font-bold text-pink-700'>
                {copy.slides.intro.introQuestion.examplePair}
              </p>
              <KangurLessonCaption className='mt-1'>
                {copy.slides.intro.introQuestion.exampleHint}
              </KangurLessonCaption>
              <p className='mt-1 font-bold text-pink-600'>
                {copy.slides.intro.introQuestion.exampleAnswer}
              </p>
            </KangurLessonInset>
          </KangurLessonCallout>
        </KangurLessonStack>
      ),
    },
    {
      title: copy.slides.intro.relationBridge.title,
      content: (
        <KangurLessonStack>
            <KangurLessonLead>{copy.slides.intro.relationBridge.lead}</KangurLessonLead>
            <KangurLessonCallout accent='rose' className='w-full text-center' padding='sm'>
              <div className='mx-auto h-20 w-72 max-w-full'>
                <AnalogyBridgeAnimation ariaLabel={copy.animations.analogyBridge} />
              </div>
            <KangurLessonCaption className='mt-2'>
              {copy.slides.intro.relationBridge.caption}
            </KangurLessonCaption>
          </KangurLessonCallout>
        </KangurLessonStack>
      ),
    },
    {
      title: copy.slides.intro.verbalAnalogies.title,
      content: (
        <KangurLessonStack>
          <KangurLessonLead>{copy.slides.intro.verbalAnalogies.lead}</KangurLessonLead>
          <div className={`${KANGUR_STACK_TIGHT_CLASSNAME} w-full`}>
            {Object.values(copy.slides.intro.verbalAnalogies.examples).map(
              ({ pair, hint, answer }) => (
                <KangurLessonCallout key={pair} accent='rose' className='text-sm' padding='sm'>
                  <p className='font-bold [color:var(--kangur-page-text)]'>{pair}</p>
                  <KangurLessonCaption className='mt-0.5'>{hint}</KangurLessonCaption>
                  <p className='mt-1 text-sm font-bold text-pink-600'>→ {answer}</p>
                </KangurLessonCallout>
              )
            )}
          </div>
        </KangurLessonStack>
      ),
    },
  ],
  liczby_ksztalty: [
    {
      title: copy.slides.liczby_ksztalty.numericAnalogies.title,
      content: (
        <KangurLessonStack>
          <KangurLessonLead>{copy.slides.liczby_ksztalty.numericAnalogies.lead}</KangurLessonLead>
          <div className={`${KANGUR_STACK_TIGHT_CLASSNAME} w-full`}>
            {Object.values(copy.slides.liczby_ksztalty.numericAnalogies.examples).map(
              ({ pair, hint, answer, workings }) => (
                <KangurLessonCallout key={pair} accent='rose' className='text-sm' padding='sm'>
                  <p className='text-base font-bold [color:var(--kangur-page-text)]'>{pair}</p>
                  <KangurLessonCaption className='mt-0.5'>{hint}</KangurLessonCaption>
                  <p className='mt-1 font-bold text-rose-600'>
                    → {answer}{' '}
                    <span className='font-normal [color:var(--kangur-page-muted-text)]'>
                      ({workings})
                    </span>
                  </p>
                </KangurLessonCallout>
              )
            )}
          </div>
        </KangurLessonStack>
      ),
    },
    {
      title: copy.slides.liczby_ksztalty.shapeAnalogies.title,
      content: (
        <KangurLessonStack>
          <KangurLessonLead>{copy.slides.liczby_ksztalty.shapeAnalogies.lead}</KangurLessonLead>
          <div className='flex w-full flex-col kangur-panel-gap'>
            {Object.values(copy.slides.liczby_ksztalty.shapeAnalogies.rules).map(
              ({ rule, sequence }) => (
                <KangurLessonCallout key={rule} accent='rose' className='text-center' padding='sm'>
                  <KangurLessonCaption className='mb-1'>{rule}</KangurLessonCaption>
                  <div className='text-2xl'>{sequence}</div>
                </KangurLessonCallout>
              )
            )}
          </div>
        </KangurLessonStack>
      ),
    },
    {
      title: copy.slides.liczby_ksztalty.numberMotion.title,
      content: (
        <KangurLessonStack>
            <KangurLessonLead>{copy.slides.liczby_ksztalty.numberMotion.lead}</KangurLessonLead>
            <KangurLessonCallout accent='rose' className='w-full text-center' padding='sm'>
              <div className='mx-auto h-24 w-72 max-w-full'>
                <NumberOperationAnimation ariaLabel={copy.animations.numberOperation} />
              </div>
            <KangurLessonCaption className='mt-2'>
              {copy.slides.liczby_ksztalty.numberMotion.caption}
            </KangurLessonCaption>
          </KangurLessonCallout>
        </KangurLessonStack>
      ),
    },
    {
      title: copy.slides.liczby_ksztalty.shapeTransform.title,
      content: (
        <KangurLessonStack>
            <KangurLessonLead>{copy.slides.liczby_ksztalty.shapeTransform.lead}</KangurLessonLead>
            <KangurLessonCallout accent='rose' className='w-full text-center' padding='sm'>
              <div className='mx-auto h-24 w-72 max-w-full'>
                <ShapeTransformAnimation ariaLabel={copy.animations.shapeTransform} />
              </div>
            <KangurLessonCaption className='mt-2'>
              {copy.slides.liczby_ksztalty.shapeTransform.caption}
            </KangurLessonCaption>
          </KangurLessonCallout>
        </KangurLessonStack>
      ),
    },
  ],
  relacje: [
    {
      title: copy.slides.relacje.partWhole.title,
      content: (
        <KangurLessonStack>
          <KangurLessonLead>{copy.slides.relacje.partWhole.lead}</KangurLessonLead>
          <div className={`${KANGUR_STACK_TIGHT_CLASSNAME} w-full`}>
            {Object.values(copy.slides.relacje.partWhole.examples).map(({ pair, answer }) => (
              <KangurLessonCallout key={pair} accent='rose' className='text-sm' padding='sm'>
                <p className='font-bold [color:var(--kangur-page-text)]'>{pair}</p>
                <p className='mt-1 font-bold text-rose-600'>→ {answer}</p>
              </KangurLessonCallout>
            ))}
          </div>
        </KangurLessonStack>
      ),
    },
    {
      title: copy.slides.relacje.partWholeAnimation.title,
      content: (
        <KangurLessonStack>
            <KangurLessonLead>{copy.slides.relacje.partWholeAnimation.lead}</KangurLessonLead>
            <KangurLessonCallout accent='rose' className='w-full text-center' padding='sm'>
              <div className='mx-auto h-24 w-72 max-w-full'>
                <PartWholeAnimation ariaLabel={copy.animations.partWhole} />
              </div>
            <KangurLessonCaption className='mt-2'>
              {copy.slides.relacje.partWholeAnimation.caption}
            </KangurLessonCaption>
          </KangurLessonCallout>
        </KangurLessonStack>
      ),
    },
    {
      title: copy.slides.relacje.causeEffect.title,
      content: (
        <KangurLessonStack>
          <KangurLessonLead>{copy.slides.relacje.causeEffect.lead}</KangurLessonLead>
          <div className={`${KANGUR_STACK_TIGHT_CLASSNAME} w-full`}>
            {Object.values(copy.slides.relacje.causeEffect.examples).map(({ pair, answer }) => (
              <KangurLessonCallout key={pair} accent='rose' className='text-sm' padding='sm'>
                <p className='font-bold [color:var(--kangur-page-text)]'>{pair}</p>
                <p className='mt-1 font-bold text-pink-600'>→ {answer}</p>
              </KangurLessonCallout>
            ))}
          </div>
        </KangurLessonStack>
      ),
    },
    {
      title: copy.slides.relacje.causeEffectAnimation.title,
      content: (
        <KangurLessonStack>
            <KangurLessonLead>{copy.slides.relacje.causeEffectAnimation.lead}</KangurLessonLead>
            <KangurLessonCallout accent='rose' className='w-full text-center' padding='sm'>
              <div className='mx-auto h-24 w-72 max-w-full'>
                <CauseEffectAnimation ariaLabel={copy.animations.causeEffect} />
              </div>
            <KangurLessonCaption className='mt-2'>
              {copy.slides.relacje.causeEffectAnimation.caption}
            </KangurLessonCaption>
          </KangurLessonCallout>
        </KangurLessonStack>
      ),
    },
  ],
  podsumowanie: [
    {
      title: copy.slides.podsumowanie.recap.title,
      content: (
        <KangurLessonStack>
          <KangurLessonCallout accent='amber' className='w-full'>
            <ul className='space-y-2 text-sm [color:var(--kangur-page-text)]'>
              {Object.values(copy.slides.podsumowanie.recap.items).map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </KangurLessonCallout>
          <p className='text-center font-bold text-pink-600'>
            {copy.slides.podsumowanie.recap.closing}
          </p>
        </KangurLessonStack>
      ),
    },
    {
      title: copy.slides.podsumowanie.map.title,
      content: (
        <KangurLessonStack>
            <KangurLessonLead>{copy.slides.podsumowanie.map.lead}</KangurLessonLead>
            <KangurLessonCallout accent='rose' className='w-full text-center' padding='sm'>
              <div className='mx-auto h-20 w-72 max-w-full'>
                <AnalogyBridgeAnimation ariaLabel={copy.animations.analogyBridge} />
              </div>
            <KangurLessonCaption className='mt-2'>
              {copy.slides.podsumowanie.map.caption}
            </KangurLessonCaption>
          </KangurLessonCallout>
        </KangurLessonStack>
      ),
    },
  ],
});

const buildLogicalAnalogiesSections = (copy: LogicalAnalogiesLessonCopy) => [
  {
    id: 'intro',
    emoji: '🔗',
    title: copy.sections.intro.title,
    description: copy.sections.intro.description,
  },
  {
    id: 'liczby_ksztalty',
    emoji: '🔢',
    title: copy.sections.liczby_ksztalty.title,
    description: copy.sections.liczby_ksztalty.description,
  },
  {
    id: 'relacje',
    emoji: '🧩',
    title: copy.sections.relacje.title,
    description: copy.sections.relacje.description,
  },
  {
    id: 'podsumowanie',
    emoji: '📋',
    title: copy.sections.podsumowanie.title,
    description: copy.sections.podsumowanie.description,
  },
  {
    id: 'game_relacje',
    emoji: '🎯',
    title: copy.sections.game_relacje.title,
    description: copy.sections.game_relacje.description,
    isGame: true,
  },
] as const;

export const SLIDES = buildLogicalAnalogiesSlides(LOGICAL_ANALOGIES_LESSON_COMPONENT_CONTENT);
export const HUB_SECTIONS = buildLogicalAnalogiesSections(LOGICAL_ANALOGIES_LESSON_COMPONENT_CONTENT);

export default function LogicalAnalogiesLesson({
  lessonTemplate,
}: LessonProps): React.JSX.Element {
  const runtimeTemplate = useOptionalKangurLessonTemplate('logical_analogies');
  const resolvedTemplate = lessonTemplate ?? runtimeTemplate;
  const translations = useTranslations('KangurStaticLessons.logicalAnalogies');
  const copy = useMemo(
    () => {
      const fallbackTranslate = createLessonFallbackTranslate(
        translations as LessonTranslate & { has?: (key: string) => boolean }
      );

      if (!resolvedTemplate?.componentContent) {
        return createLogicalAnalogiesLessonContentFromTranslate(fallbackTranslate);
      }

      const resolved = resolveKangurLessonTemplateComponentContent(
        'logical_analogies',
        resolvedTemplate.componentContent,
      );

      return resolved?.kind === 'logical_analogies'
        ? resolved
        : createLogicalAnalogiesLessonContentFromTranslate(fallbackTranslate);
    },
    [resolvedTemplate, translations],
  );
  const slides = buildLogicalAnalogiesSlides(copy);
  const sections = buildLogicalAnalogiesSections(copy);

  return (
    <KangurUnifiedLesson
      progressMode='panel'
      lessonId='logical_analogies'
      lessonEmoji='🔗'
      lessonTitle={resolvedTemplate?.title?.trim() || copy.lessonTitle}
      sections={sections}
      slides={slides}
      gradientClass='kangur-gradient-accent-rose-reverse'
      progressDotClassName='bg-pink-300'
      dotActiveClass='bg-pink-500'
      dotDoneClass='bg-pink-300'
      skipMarkFor={['game_relacje']}
      games={[
        {
          sectionId: 'game_relacje',
          shell: {
            accent: 'rose',
            icon: '🎯',
            maxWidthClassName: 'max-w-3xl',
            shellTestId: 'logical-analogies-game-shell',
            title: copy.game.gameTitle ?? '',
          },
          launchableInstance: {
            gameId: 'logical_analogies_relations',
            instanceId: LOGICAL_ANALOGIES_INSTANCE_ID,
          },
        },
      ]}
    />
  );
}
