'use client';

import { useCallback, useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';

import plMessages from '@/i18n/messages/pl.json';
import GeometryDrawingGame from '@/features/kangur/ui/components/GeometryDrawingGame';
import type { LessonSlide } from '@/features/kangur/ui/components/LessonSlideSection';
import { KangurLessonCallout } from '@/features/kangur/ui/design/lesson-primitives';
import {
  GeometryMovingPointAnimation,
  GeometryPolygonSidesAnimation,
  GeometryPerimeterTraceAnimation,
  GeometryPointSegmentAnimation,
  GeometryShapeBuildAnimation,
  GeometryShapeFillAnimation,
  GeometryShapesOrbitAnimation,
  GeometrySideHighlightAnimation,
  GeometryVerticesAnimation,
} from '@/features/kangur/ui/components/GeometryLessonAnimations';
import { KANGUR_CENTER_ROW_CLASSNAME } from '@/features/kangur/ui/design/tokens';
import { KangurUnifiedLesson } from '@/features/kangur/ui/lessons/lesson-components';
import {
  addXp,
  createLessonCompletionReward,
  loadProgress,
} from '@/features/kangur/ui/services/progress';
import type { LessonTranslate } from '@/features/kangur/ui/components/lesson-copy';

type SectionId = 'podstawowe' | 'ile_bokow' | 'podsumowanie' | 'game';
type ShapeCardId = 'circle' | 'triangle' | 'square' | 'rectangle' | 'pentagon' | 'hexagon';

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

const SHAPE_CARD_IDS = [
  { id: 'circle', emoji: '⚪' },
  { id: 'triangle', emoji: '🔺' },
  { id: 'square', emoji: '🟦' },
  { id: 'rectangle', emoji: '▭' },
  { id: 'pentagon', emoji: '⬟' },
  { id: 'hexagon', emoji: '⬢' },
] as const satisfies ReadonlyArray<{ id: ShapeCardId; emoji: string }>;

function GeometryShapesGameStage({
  onFinish,
  onStart,
}: {
  onFinish: () => void;
  onStart: () => void;
}): React.JSX.Element {
  useEffect(() => {
    onStart();
  }, [onStart]);

  return <GeometryDrawingGame onFinish={onFinish} />;
}

const buildShapeCards = (translations: LessonTranslate) =>
  SHAPE_CARD_IDS.map((shape) => ({
    ...shape,
    name: translations(`shapeCards.${shape.id}.name`),
    details: translations(`shapeCards.${shape.id}.details`),
  }));

const buildGeometryShapesSlides = (
  translations: LessonTranslate
): Record<Exclude<SectionId, 'game'>, LessonSlide[]> => {
  const shapeCards = buildShapeCards(translations);

  return {
    podstawowe: [
      {
        title: translations('slides.podstawowe.intro.title'),
        content: (
          <div className='space-y-3'>
            <div className='grid grid-cols-1 gap-2 min-[420px]:grid-cols-2'>
              {shapeCards.slice(0, 4).map((shape) => (
                <KangurLessonCallout
                  key={shape.id}
                  accent='violet'
                  className='text-center'
                  padding='sm'
                >
                  <div className='text-3xl'>{shape.emoji}</div>
                  <div className='mt-1 text-sm font-bold text-fuchsia-700'>{shape.name}</div>
                  <div className='text-xs text-fuchsia-600'>{shape.details}</div>
                </KangurLessonCallout>
              ))}
            </div>
            <KangurLessonCallout accent='violet' className='text-center' padding='sm'>
              <div className='mx-auto h-28 w-28 max-w-full'>
                <GeometryShapesOrbitAnimation />
              </div>
              <div className='text-xs text-fuchsia-600'>
                {translations('slides.podstawowe.intro.orbitCaption')}
              </div>
            </KangurLessonCallout>
          </div>
        ),
      },
      {
        title: translations('slides.podstawowe.outline.title'),
        content: (
          <KangurLessonCallout accent='violet' className='text-center' padding='sm'>
            <div className='mx-auto h-28 w-40 max-w-full'>
              <GeometryPerimeterTraceAnimation />
            </div>
            <div className='text-xs text-fuchsia-600'>
              {translations('slides.podstawowe.outline.caption')}
            </div>
          </KangurLessonCallout>
        ),
      },
      {
        title: translations('slides.podstawowe.build.title'),
        content: (
          <KangurLessonCallout accent='violet' className='text-center' padding='sm'>
            <div className='mx-auto h-28 w-36 max-w-full'>
              <GeometryShapeBuildAnimation />
            </div>
            <div className='text-xs text-fuchsia-600'>
              {translations('slides.podstawowe.build.caption')}
            </div>
          </KangurLessonCallout>
        ),
      },
    ],
    ile_bokow: [
      {
        title: translations('slides.ileBokow.count.title'),
        content: (
          <div className='space-y-2'>
            {shapeCards.map((shape) => (
              <KangurLessonCallout
                key={shape.id}
                accent='slate'
                className='border-fuchsia-200/85'
                padding='sm'
              >
                <div className={KANGUR_CENTER_ROW_CLASSNAME}>
                  <span className='text-2xl'>{shape.emoji}</span>
                  <div>
                    <p className='text-sm font-bold [color:var(--kangur-page-text)]'>
                      {shape.name}
                    </p>
                    <p className='text-xs [color:var(--kangur-page-muted-text)]'>
                      {shape.details}
                    </p>
                  </div>
                </div>
              </KangurLessonCallout>
            ))}
          </div>
        ),
      },
      {
        title: translations('slides.ileBokow.countSides.title'),
        content: (
          <KangurLessonCallout accent='violet' className='text-center' padding='sm'>
            <div className='mx-auto h-28 w-36 max-w-full'>
              <GeometrySideHighlightAnimation />
            </div>
            <div className='text-xs text-fuchsia-600'>
              {translations('slides.ileBokow.countSides.caption')}
            </div>
          </KangurLessonCallout>
        ),
      },
      {
        title: translations('slides.ileBokow.corners.title'),
        content: (
          <KangurLessonCallout accent='violet' className='text-center' padding='sm'>
            <div className='mx-auto h-28 w-32 max-w-full'>
              <GeometryVerticesAnimation />
            </div>
            <div className='text-xs text-fuchsia-600'>
              {translations('slides.ileBokow.corners.caption')}
            </div>
          </KangurLessonCallout>
        ),
      },
      {
        title: translations('slides.ileBokow.segmentSide.title'),
        content: (
          <KangurLessonCallout accent='violet' className='text-center' padding='sm'>
            <div className='mx-auto h-24 w-36 max-w-full'>
              <GeometryPointSegmentAnimation />
            </div>
            <div className='text-xs text-fuchsia-600'>
              {translations('slides.ileBokow.segmentSide.caption')}
            </div>
          </KangurLessonCallout>
        ),
      },
      {
        title: translations('slides.ileBokow.drawSide.title'),
        content: (
          <KangurLessonCallout accent='violet' className='text-center' padding='sm'>
            <div className='mx-auto h-24 w-36 max-w-full'>
              <GeometryMovingPointAnimation />
            </div>
            <div className='text-xs text-fuchsia-600'>
              {translations('slides.ileBokow.drawSide.caption')}
            </div>
          </KangurLessonCallout>
        ),
      },
    ],
    podsumowanie: [
      {
        title: translations('slides.podsumowanie.rotate.title'),
        content: (
          <KangurLessonCallout accent='violet' className='text-center' padding='sm'>
            <div className='mx-auto h-32 w-40 max-w-full'>
              <GeometryShapesOrbitAnimation />
            </div>
            <div className='text-xs text-fuchsia-600'>
              {translations('slides.podsumowanie.rotate.caption')}
            </div>
          </KangurLessonCallout>
        ),
      },
      {
        title: translations('slides.podsumowanie.sides.title'),
        content: (
          <KangurLessonCallout accent='violet' className='text-center' padding='sm'>
            <div className='mx-auto h-32 w-40 max-w-full'>
              <GeometryPolygonSidesAnimation />
            </div>
            <div className='text-xs text-fuchsia-600'>
              {translations('slides.podsumowanie.sides.caption')}
            </div>
          </KangurLessonCallout>
        ),
      },
      {
        title: translations('slides.podsumowanie.interior.title'),
        content: (
          <KangurLessonCallout accent='violet' className='text-center' padding='sm'>
            <div className='mx-auto h-32 w-40 max-w-full'>
              <GeometryShapeFillAnimation />
            </div>
            <div className='text-xs text-fuchsia-600'>
              {translations('slides.podsumowanie.interior.caption')}
            </div>
          </KangurLessonCallout>
        ),
      },
      {
        title: translations('slides.podsumowanie.build.title'),
        content: (
          <KangurLessonCallout accent='violet' className='text-center' padding='sm'>
            <div className='mx-auto h-32 w-40 max-w-full'>
              <GeometryShapeBuildAnimation />
            </div>
            <div className='text-xs text-fuchsia-600'>
              {translations('slides.podsumowanie.build.caption')}
            </div>
          </KangurLessonCallout>
        ),
      },
    ],
  };
};

const buildGeometryShapesSections = (translations: LessonTranslate) => [
  {
    id: 'podstawowe',
    emoji: '🔺',
    title: translations('sections.podstawowe.title'),
    description: translations('sections.podstawowe.description'),
  },
  {
    id: 'ile_bokow',
    emoji: '🔢',
    title: translations('sections.ileBokow.title'),
    description: translations('sections.ileBokow.description'),
  },
  {
    id: 'podsumowanie',
    emoji: '📋',
    title: translations('sections.podsumowanie.title'),
    description: translations('sections.podsumowanie.description'),
  },
  {
    id: 'game',
    emoji: '✍️',
    title: translations('sections.game.title'),
    description: translations('sections.game.description'),
    isGame: true,
  },
] as const;

const translateStaticGeometryShapes = createStaticTranslator(
  plMessages.KangurStaticLessons.geometryShapes as Record<string, unknown>
);

export const SLIDES = buildGeometryShapesSlides(translateStaticGeometryShapes);
export const HUB_SECTIONS = buildGeometryShapesSections(translateStaticGeometryShapes);

export default function GeometryShapesLesson(): React.JSX.Element {
  const translations = useTranslations('KangurStaticLessons.geometryShapes');
  const [rewarded, setRewarded] = useState(false);
  const translate = (key: string): string => translations(key as never);
  const sections = buildGeometryShapesSections(translate);
  const slides = buildGeometryShapesSlides(translate);

  const handleGameStart = useCallback((): void => {
    if (rewarded) return;
    const progress = loadProgress();
    const reward = createLessonCompletionReward(progress, 'geometry_shapes', 60);
    addXp(reward.xp, reward.progressUpdates);
    setRewarded(true);
  }, [rewarded]);

  return (
    <KangurUnifiedLesson
      progressMode='panel'
      lessonId='geometry_shapes'
      lessonEmoji='🔷'
      lessonTitle={translate('lessonTitle')}
      sections={sections}
      slides={slides}
      gradientClass='kangur-gradient-accent-violet-reverse'
      progressDotClassName='bg-fuchsia-300'
      dotActiveClass='bg-fuchsia-500'
      dotDoneClass='bg-fuchsia-300'
      skipMarkFor={['game']}
      games={[
        {
          sectionId: 'game',
          stage: {
            accent: 'violet',
            icon: '✍️',
            shellTestId: 'geometry-shapes-game-shell',
            title: translate('game.stageTitle'),
          },
          render: ({ onFinish }) => (
            <GeometryShapesGameStage onFinish={onFinish} onStart={handleGameStart} />
          ),
        },
      ]}
    />
  );
}
