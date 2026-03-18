'use client';

import { useCallback, useEffect, useState } from 'react';

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

type SectionId = 'podstawowe' | 'ile_bokow' | 'podsumowanie' | 'game';

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

const SHAPE_CARDS = [
  { emoji: '⚪', name: 'Koło', details: '0 boków i 0 rogów' },
  { emoji: '🔺', name: 'Trójkąt', details: '3 boki i 3 rogi' },
  { emoji: '🟦', name: 'Kwadrat', details: '4 równe boki i 4 rogi' },
  { emoji: '▭', name: 'Prostokąt', details: '4 boki i 4 rogi' },
  { emoji: '⬟', name: 'Pieciokąt', details: '5 boków i 5 rogów' },
  { emoji: '⬢', name: 'Szesciokąt', details: '6 boków i 6 rogów' },
] as const;

export const SLIDES: Record<Exclude<SectionId, 'game'>, LessonSlide[]> = {
  podstawowe: [
    {
      title: 'Poznaj figury',
      content: (
        <div className='space-y-3'>
          <div className='grid grid-cols-1 gap-2 min-[420px]:grid-cols-2'>
            {SHAPE_CARDS.slice(0, 4).map((shape) => (
              <KangurLessonCallout
                key={shape.name}
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
            <div className='text-xs text-fuchsia-600'>Figury mogą się obracać i nadal są tym samym kształtem.</div>
          </KangurLessonCallout>
        </div>
      ),
    },
    {
      title: 'Obrys figury',
      content: (
        <KangurLessonCallout accent='violet' className='text-center' padding='sm'>
          <div className='mx-auto h-28 w-40 max-w-full'>
            <GeometryPerimeterTraceAnimation />
          </div>
          <div className='text-xs text-fuchsia-600'>
            Zamknięty obrys tworzy kształt figury.
          </div>
        </KangurLessonCallout>
      ),
    },
    {
      title: 'Budowanie figury',
      content: (
        <KangurLessonCallout accent='violet' className='text-center' padding='sm'>
          <div className='mx-auto h-28 w-36 max-w-full'>
            <GeometryShapeBuildAnimation />
          </div>
          <div className='text-xs text-fuchsia-600'>
            Laczymy odcinki, az figura się domknie.
          </div>
        </KangurLessonCallout>
      ),
    },
  ],
  ile_bokow: [
    {
      title: 'Ile boków i rogów?',
      content: (
        <div className='space-y-2'>
          {SHAPE_CARDS.map((shape) => (
            <KangurLessonCallout
              key={shape.name}
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
      title: 'Policz boki',
      content: (
        <KangurLessonCallout accent='violet' className='text-center' padding='sm'>
          <div className='mx-auto h-28 w-36 max-w-full'>
            <GeometrySideHighlightAnimation />
          </div>
          <div className='text-xs text-fuchsia-600'>
            Boki zapalają się po kolei — każdy to odcinek.
          </div>
        </KangurLessonCallout>
      ),
    },
    {
      title: 'Rogi figury',
      content: (
        <KangurLessonCallout accent='violet' className='text-center' padding='sm'>
          <div className='mx-auto h-28 w-32 max-w-full'>
            <GeometryVerticesAnimation />
          </div>
          <div className='text-xs text-fuchsia-600'>
            Wierzchołki to rogi, w których spotykają się boki.
          </div>
        </KangurLessonCallout>
      ),
    },
    {
      title: 'Odcinek to bok',
      content: (
        <KangurLessonCallout accent='violet' className='text-center' padding='sm'>
          <div className='mx-auto h-24 w-36 max-w-full'>
            <GeometryPointSegmentAnimation />
          </div>
          <div className='text-xs text-fuchsia-600'>
            Bok figury to odcinek między dwoma punktami.
          </div>
        </KangurLessonCallout>
      ),
    },
    {
      title: 'Rysowanie boku',
      content: (
        <KangurLessonCallout accent='violet' className='text-center' padding='sm'>
          <div className='mx-auto h-24 w-36 max-w-full'>
            <GeometryMovingPointAnimation />
          </div>
          <div className='text-xs text-fuchsia-600'>
            Punkt porusza się i zostawia odcinek.
          </div>
        </KangurLessonCallout>
      ),
    },
  ],
  podsumowanie: [
    {
      title: 'Podsumowanie w ruchu: obrót',
      content: (
        <KangurLessonCallout accent='violet' className='text-center' padding='sm'>
          <div className='mx-auto h-32 w-40 max-w-full'>
            <GeometryShapesOrbitAnimation />
          </div>
          <div className='text-xs text-fuchsia-600'>Obrót nie zmienia figury.</div>
        </KangurLessonCallout>
      ),
    },
    {
      title: 'Podsumowanie w ruchu: boki',
      content: (
        <KangurLessonCallout accent='violet' className='text-center' padding='sm'>
          <div className='mx-auto h-32 w-40 max-w-full'>
            <GeometryPolygonSidesAnimation />
          </div>
          <div className='text-xs text-fuchsia-600'>Boki i rogi opisują kształt.</div>
        </KangurLessonCallout>
      ),
    },
    {
      title: 'Podsumowanie w ruchu: wnętrze',
      content: (
        <KangurLessonCallout accent='violet' className='text-center' padding='sm'>
          <div className='mx-auto h-32 w-40 max-w-full'>
            <GeometryShapeFillAnimation />
          </div>
          <div className='text-xs text-fuchsia-600'>Wnętrze figury to jej pole.</div>
        </KangurLessonCallout>
      ),
    },
    {
      title: 'Podsumowanie w ruchu: budowa',
      content: (
        <KangurLessonCallout accent='violet' className='text-center' padding='sm'>
          <div className='mx-auto h-32 w-40 max-w-full'>
            <GeometryShapeBuildAnimation />
          </div>
          <div className='text-xs text-fuchsia-600'>Łącz odcinki, aż figura się domknie.</div>
        </KangurLessonCallout>
      ),
    },
  ],
};

export const HUB_SECTIONS = [
  {
    id: 'podstawowe',
    emoji: '🔺',
    title: 'Podstawowe figury',
    description: 'Koło, trójkąt, kwadrat, prostokąt',
  },
  { id: 'ile_bokow', emoji: '🔢', title: 'Boki i rogi', description: 'Każda figura pod lupą' },
  { id: 'podsumowanie', emoji: '📋', title: 'Podsumowanie', description: 'Najważniejsze informacje' },
  {
    id: 'game',
    emoji: '✍️',
    title: 'Rysuj figury',
    description: 'Narysuj kształt i zdobadz XP',
    isGame: true,
  },
];

export default function GeometryShapesLesson(): React.JSX.Element {
  const [rewarded, setRewarded] = useState(false);
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
      lessonTitle='Figury geometryczne'
      sections={HUB_SECTIONS}
      slides={SLIDES}
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
            title: 'Rysuj figury',
          },
          render: ({ onFinish }) => (
            <GeometryShapesGameStage onFinish={onFinish} onStart={handleGameStart} />
          ),
        },
      ]}
    />
  );
}
