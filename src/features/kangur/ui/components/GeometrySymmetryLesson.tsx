'use client';

import { useTranslations } from 'next-intl';

import plMessages from '@/i18n/messages/pl.json';
import type { LessonSlide } from '@/features/kangur/ui/components/LessonSlideSection';
import GeometrySymmetryGame from '@/features/kangur/ui/components/GeometrySymmetryGame';
import {
  GeometrySymmetryAxesAnimation,
  GeometrySymmetryCheckAnimation,
  GeometrySymmetryFoldAnimation,
  GeometrySymmetryMirrorAnimation,
  GeometrySymmetryRotationAnimation,
} from '@/features/kangur/ui/components/GeometryLessonAnimations';
import { KangurLessonCallout } from '@/features/kangur/ui/design/lesson-primitives';
import type { LessonTranslate } from '@/features/kangur/ui/components/lesson-copy';
import { KangurUnifiedLesson } from '@/features/kangur/ui/lessons/lesson-components';
import {
  addXp,
  createLessonCompletionReward,
  loadProgress,
} from '@/features/kangur/ui/services/progress';

type SectionId = 'intro' | 'os' | 'figury' | 'podsumowanie' | 'game';
type SlideSectionId = Exclude<SectionId, 'game'>;
type SymmetryShapeCardId =
  | 'square'
  | 'rectangle'
  | 'circle'
  | 'isoscelesTriangle'
  | 'zigzag'
  | 'irregularPolygon';

const createStaticTranslator = (messages: Record<string, unknown>): LessonTranslate => (key) => {
  const resolved = key.split('.').reduce<unknown>(
    (current, segment) =>
      typeof current === 'object' && current !== null
        ? (current as Record<string, unknown>)[segment]
        : undefined,
    messages
  );

  return typeof resolved === 'string' ? resolved : key;
};

const SYMMETRY_SHAPE_CARDS = [
  { id: 'square', icon: '✅', accent: 'emerald' },
  { id: 'rectangle', icon: '✅', accent: 'emerald' },
  { id: 'circle', icon: '✅', accent: 'emerald' },
  { id: 'isoscelesTriangle', icon: '✅', accent: 'emerald' },
  { id: 'zigzag', icon: '❌', accent: 'rose' },
  { id: 'irregularPolygon', icon: '❌', accent: 'rose' },
] as const satisfies ReadonlyArray<{
  id: SymmetryShapeCardId;
  icon: string;
  accent: 'emerald' | 'rose';
}>;

const buildGeometrySymmetrySlides = (
  translations: LessonTranslate
): Record<SlideSectionId, LessonSlide[]> => ({
  intro: [
    {
      title: translations('slides.intro.whatIsSymmetry.title'),
      content: (
        <div className='flex flex-col kangur-panel-gap text-center'>
          <p className='[color:var(--kangur-page-text)]'>
            {translations('slides.intro.whatIsSymmetry.lead')}
          </p>
          <KangurLessonCallout accent='emerald' className='text-5xl text-center'>
            🦋
            <p className='mt-2 text-sm text-emerald-700'>
              {translations('slides.intro.whatIsSymmetry.callout')}
            </p>
          </KangurLessonCallout>
          <p className='text-sm [color:var(--kangur-page-muted-text)]'>
            {translations('slides.intro.whatIsSymmetry.note')}
          </p>
        </div>
      ),
    },
    {
      title: translations('slides.intro.mirrorSymmetry.title'),
      content: (
        <div className='flex flex-col kangur-panel-gap text-center'>
          <p className='[color:var(--kangur-page-text)]'>
            {translations('slides.intro.mirrorSymmetry.lead')}
          </p>
          <KangurLessonCallout accent='emerald'>
            <div className='mx-auto h-28 w-40 max-w-full'>
              <GeometrySymmetryMirrorAnimation />
            </div>
            <p className='mt-2 text-sm [color:var(--kangur-page-muted-text)]'>
              {translations('slides.intro.mirrorSymmetry.caption')}
            </p>
          </KangurLessonCallout>
        </div>
      ),
    },
  ],
  os: [
    {
      title: translations('slides.os.axisOfSymmetry.title'),
      content: (
        <div className='flex flex-col kangur-panel-gap text-center'>
          <p className='[color:var(--kangur-page-text)]'>
            {translations('slides.os.axisOfSymmetry.lead')}
          </p>
          <KangurLessonCallout accent='slate' className='border-emerald-200/85'>
            <div className='mx-auto h-28 w-40 max-w-full'>
              <GeometrySymmetryFoldAnimation />
            </div>
            <p className='mt-2 text-sm [color:var(--kangur-page-muted-text)]'>
              {translations('slides.os.axisOfSymmetry.caption')}
            </p>
          </KangurLessonCallout>
          <p className='text-sm [color:var(--kangur-page-muted-text)]'>
            {translations('slides.os.axisOfSymmetry.note')}
          </p>
        </div>
      ),
    },
    {
      title: translations('slides.os.axisInPractice.title'),
      content: (
        <div className='flex flex-col kangur-panel-gap text-center'>
          <p className='[color:var(--kangur-page-text)]'>
            {translations('slides.os.axisInPractice.lead')}
          </p>
          <KangurLessonCallout accent='slate' className='border-emerald-200/85'>
            <div className='mx-auto h-28 w-40 max-w-full'>
              <GeometrySymmetryFoldAnimation />
            </div>
            <p className='mt-2 text-sm [color:var(--kangur-page-muted-text)]'>
              {translations('slides.os.axisInPractice.caption')}
            </p>
          </KangurLessonCallout>
        </div>
      ),
    },
  ],
  figury: [
    {
      title: translations('slides.figury.symmetricShapes.title'),
      content: (
        <div className='flex flex-col kangur-panel-gap'>
          <div className='grid grid-cols-1 gap-2 text-sm min-[420px]:grid-cols-2'>
            {SYMMETRY_SHAPE_CARDS.map((card) => (
              <KangurLessonCallout
                key={card.id}
                accent={card.accent}
                className='text-center'
                padding='sm'
              >
                {card.icon} {translations(`slides.figury.symmetricShapes.cards.${card.id}`)}
              </KangurLessonCallout>
            ))}
          </div>
          <p className='text-center text-xs [color:var(--kangur-page-muted-text)]'>
            {translations('slides.figury.symmetricShapes.circleNote')}
          </p>
        </div>
      ),
    },
    {
      title: translations('slides.figury.symmetricOrNot.title'),
      content: (
        <div className='flex flex-col kangur-panel-gap text-center'>
          <KangurLessonCallout accent='emerald'>
            <div className='mx-auto h-28 w-48 max-w-full'>
              <GeometrySymmetryCheckAnimation />
            </div>
            <p className='mt-2 text-sm [color:var(--kangur-page-muted-text)]'>
              {translations('slides.figury.symmetricOrNot.caption')}
            </p>
          </KangurLessonCallout>
        </div>
      ),
    },
    {
      title: translations('slides.figury.rotational.title'),
      content: (
        <div className='flex flex-col kangur-panel-gap text-center'>
          <KangurLessonCallout accent='emerald'>
            <div className='mx-auto h-28 w-28 max-w-full'>
              <GeometrySymmetryRotationAnimation />
            </div>
            <p className='mt-2 text-sm [color:var(--kangur-page-muted-text)]'>
              {translations('slides.figury.rotational.caption')}
            </p>
          </KangurLessonCallout>
        </div>
      ),
    },
  ],
  podsumowanie: [
    {
      title: translations('slides.podsumowanie.overview.title'),
      content: (
        <div className='space-y-3'>
          {[
            translations('slides.podsumowanie.overview.items.item1'),
            translations('slides.podsumowanie.overview.items.item2'),
            translations('slides.podsumowanie.overview.items.item3'),
            translations('slides.podsumowanie.overview.items.item4'),
          ].map((text) => (
            <KangurLessonCallout
              key={text}
              accent='emerald'
              className='text-sm [color:var(--kangur-page-text)]'
              padding='sm'
            >
              ✅ {text}
            </KangurLessonCallout>
          ))}
        </div>
      ),
    },
    {
      title: translations('slides.podsumowanie.axis.title'),
      content: (
        <div className='flex flex-col kangur-panel-gap text-center'>
          <KangurLessonCallout accent='emerald' padding='sm'>
            <div className='mx-auto h-28 w-40 max-w-full'>
              <GeometrySymmetryFoldAnimation />
            </div>
            <p className='mt-2 text-sm [color:var(--kangur-page-muted-text)]'>
              {translations('slides.podsumowanie.axis.caption')}
            </p>
          </KangurLessonCallout>
        </div>
      ),
    },
    {
      title: translations('slides.podsumowanie.manyAxes.title'),
      content: (
        <div className='flex flex-col kangur-panel-gap text-center'>
          <KangurLessonCallout accent='emerald' padding='sm'>
            <div className='mx-auto h-28 w-40 max-w-full'>
              <GeometrySymmetryAxesAnimation />
            </div>
            <p className='mt-2 text-sm [color:var(--kangur-page-muted-text)]'>
              {translations('slides.podsumowanie.manyAxes.caption')}
            </p>
          </KangurLessonCallout>
        </div>
      ),
    },
    {
      title: translations('slides.podsumowanie.mirror.title'),
      content: (
        <div className='flex flex-col kangur-panel-gap text-center'>
          <KangurLessonCallout accent='emerald' padding='sm'>
            <div className='mx-auto h-28 w-40 max-w-full'>
              <GeometrySymmetryMirrorAnimation />
            </div>
            <p className='mt-2 text-sm [color:var(--kangur-page-muted-text)]'>
              {translations('slides.podsumowanie.mirror.caption')}
            </p>
          </KangurLessonCallout>
        </div>
      ),
    },
    {
      title: translations('slides.podsumowanie.rotation.title'),
      content: (
        <div className='flex flex-col kangur-panel-gap text-center'>
          <KangurLessonCallout accent='emerald' padding='sm'>
            <div className='mx-auto h-28 w-28 max-w-full'>
              <GeometrySymmetryRotationAnimation />
            </div>
            <p className='mt-2 text-sm [color:var(--kangur-page-muted-text)]'>
              {translations('slides.podsumowanie.rotation.caption')}
            </p>
          </KangurLessonCallout>
        </div>
      ),
    },
  ],
});

const buildGeometrySymmetrySections = (translations: LessonTranslate) => [
  {
    id: 'intro',
    emoji: '🦋',
    title: translations('sections.intro.title'),
    description: translations('sections.intro.description'),
  },
  {
    id: 'os',
    emoji: '|',
    title: translations('sections.os.title'),
    description: translations('sections.os.description'),
  },
  {
    id: 'figury',
    emoji: '🔵',
    title: translations('sections.figury.title'),
    description: translations('sections.figury.description'),
  },
  {
    id: 'podsumowanie',
    emoji: '📋',
    title: translations('sections.podsumowanie.title'),
    description: translations('sections.podsumowanie.description'),
  },
  {
    id: 'game',
    emoji: '🎯',
    title: translations('sections.game.title'),
    description: translations('sections.game.description'),
    isGame: true,
  },
] as const;

const translateStaticGeometrySymmetry = createStaticTranslator(
  plMessages.KangurStaticLessons.geometrySymmetry as Record<string, unknown>
);

export const SLIDES = buildGeometrySymmetrySlides(translateStaticGeometrySymmetry);
export const HUB_SECTIONS = buildGeometrySymmetrySections(translateStaticGeometrySymmetry);

export default function GeometrySymmetryLesson(): React.JSX.Element {
  const translations = useTranslations('KangurStaticLessons.geometrySymmetry');
  const translate = (key: string): string => translations(key as never);
  const sections = buildGeometrySymmetrySections(translate);
  const slides = buildGeometrySymmetrySlides(translate);

  const handleComplete = (): void => {
    const progress = loadProgress();
    const reward = createLessonCompletionReward(progress, 'geometry_symmetry', 100);
    addXp(reward.xp, reward.progressUpdates);
  };

  return (
    <KangurUnifiedLesson
      progressMode='panel'
      lessonId='geometry_symmetry'
      lessonEmoji='🪞'
      lessonTitle={translate('lessonTitle')}
      sections={sections}
      slides={slides}
      gradientClass='kangur-gradient-accent-emerald'
      progressDotClassName='bg-emerald-300'
      dotActiveClass='bg-emerald-500'
      dotDoneClass='bg-emerald-300'
      completionSectionId='podsumowanie'
      onComplete={handleComplete}
      skipMarkFor={['game']}
      games={[
        {
          sectionId: 'game',
          stage: {
            accent: 'emerald',
            icon: '🪞',
            maxWidthClassName: 'max-w-2xl',
            shellTestId: 'geometry-symmetry-game-shell',
            title: translate('game.stageTitle'),
          },
          render: ({ onFinish }) => <GeometrySymmetryGame onFinish={onFinish} />,
        },
      ]}
    />
  );
}
