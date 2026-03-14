import { ArrowLeft } from 'lucide-react';
import { useState } from 'react';

import GeometryDrawingGame from '@/features/kangur/ui/components/GeometryDrawingGame';
import LessonHub from '@/features/kangur/ui/components/LessonHub';
import LessonSlideSection, {
  type LessonSlide,
} from '@/features/kangur/ui/components/LessonSlideSection';
import { KangurLessonSubsectionSummarySync } from '@/features/kangur/ui/context/KangurLessonNavigationContext';
import { KangurLessonCallout } from '@/features/kangur/ui/design/lesson-primitives';
import {
  GeometryAngleTypesAnimation,
  GeometryMovingPointAnimation,
  GeometryPolygonSidesAnimation,
  GeometryPerimeterTraceAnimation,
  GeometryPointSegmentAnimation,
  GeometryShapeBuildAnimation,
  GeometryShapeFillAnimation,
  GeometryShapesOrbitAnimation,
  GeometrySideHighlightAnimation,
  GeometrySymmetryAxesAnimation,
  GeometrySymmetryFoldAnimation,
  GeometryVerticesAnimation,
} from '@/features/kangur/ui/components/GeometryLessonAnimations';
import {
  KangurButton,
  KangurGlassPanel,
} from '@/features/kangur/ui/design/primitives';
import { useLessonHubProgress } from '@/features/kangur/ui/hooks/useLessonHubProgress';
import {
  addXp,
  createLessonCompletionReward,
  loadProgress,
} from '@/features/kangur/ui/services/progress';

type SectionId = 'podstawowe' | 'ile_bokow' | 'animacje' | 'podsumowanie' | 'game';

const SHAPES_ANIMATION_SLIDES: LessonSlide[] = [
  {
    title: 'Figury w ruchu',
    content: (
      <KangurLessonCallout accent='violet' className='text-center' padding='sm'>
        <div className='mx-auto h-32 w-32'>
          <GeometryShapesOrbitAnimation />
        </div>
        <div className='text-xs text-fuchsia-600'>
          Obrót nie zmienia kształtu figury.
        </div>
      </KangurLessonCallout>
    ),
  },
  {
    title: 'Wnetrze figury',
    content: (
      <KangurLessonCallout accent='violet' className='text-center' padding='sm'>
        <div className='mx-auto h-28 w-36'>
          <GeometryShapeFillAnimation />
        </div>
        <div className='text-xs text-fuchsia-600'>
          Wnetrze figury to obszar zamkniety przez boki.
        </div>
      </KangurLessonCallout>
    ),
  },
  {
    title: 'Symetria',
    content: (
      <KangurLessonCallout accent='emerald' className='text-center' padding='sm'>
        <div className='mx-auto h-28 w-36'>
          <GeometrySymmetryFoldAnimation />
        </div>
        <div className='text-xs text-emerald-600'>
          Po złożeniu po osi dwie połowy są takie same.
        </div>
      </KangurLessonCallout>
    ),
  },
  {
    title: 'Osie symetrii',
    content: (
      <KangurLessonCallout accent='emerald' className='text-center' padding='sm'>
        <div className='mx-auto h-28 w-32'>
          <GeometrySymmetryAxesAnimation />
        </div>
        <div className='text-xs text-emerald-600'>
          Koło ma wiele osi symetrii.
        </div>
      </KangurLessonCallout>
    ),
  },
  {
    title: 'Katy',
    content: (
      <KangurLessonCallout accent='sky' className='text-center' padding='sm'>
        <div className='mx-auto h-28 w-40'>
          <GeometryAngleTypesAnimation />
        </div>
        <div className='text-xs text-sky-600'>
          Figury maja kąty: ostre, proste i rozwarte.
        </div>
      </KangurLessonCallout>
    ),
  },
];

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
          <div className='grid grid-cols-1 gap-2 min-[360px]:grid-cols-2'>
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
            <div className='mx-auto h-28 w-28'>
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
          <div className='mx-auto h-28 w-40'>
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
          <div className='mx-auto h-28 w-36'>
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
              <div className='flex items-center gap-2'>
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
          <div className='mx-auto h-28 w-36'>
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
          <div className='mx-auto h-28 w-32'>
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
          <div className='mx-auto h-24 w-36'>
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
          <div className='mx-auto h-24 w-36'>
            <GeometryMovingPointAnimation />
          </div>
          <div className='text-xs text-fuchsia-600'>
            Punkt porusza się i zostawia odcinek.
          </div>
        </KangurLessonCallout>
      ),
    },
  ],
  animacje: SHAPES_ANIMATION_SLIDES,
  podsumowanie: [
    {
      title: 'Podsumowanie w ruchu',
      content: (
        <div className='grid gap-3 text-center sm:grid-cols-2'>
          <KangurLessonCallout accent='violet' padding='sm'>
            <div className='mx-auto h-28 w-36'>
              <GeometryShapesOrbitAnimation />
            </div>
            <div className='text-xs text-fuchsia-600'>Obrót nie zmienia figury.</div>
          </KangurLessonCallout>
          <KangurLessonCallout accent='violet' padding='sm'>
            <div className='mx-auto h-28 w-36'>
              <GeometryPolygonSidesAnimation />
            </div>
            <div className='text-xs text-fuchsia-600'>Boki i rogi opisują kształt.</div>
          </KangurLessonCallout>
          <KangurLessonCallout accent='violet' padding='sm'>
            <div className='mx-auto h-28 w-36'>
              <GeometryShapeFillAnimation />
            </div>
            <div className='text-xs text-fuchsia-600'>Wnętrze figury to jej pole.</div>
          </KangurLessonCallout>
          <KangurLessonCallout accent='violet' padding='sm'>
            <div className='mx-auto h-28 w-36'>
              <GeometryShapeBuildAnimation />
            </div>
            <div className='text-xs text-fuchsia-600'>Łącz odcinki, aż figura się domknie.</div>
          </KangurLessonCallout>
        </div>
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
  { id: 'animacje', emoji: '🎞️', title: 'Animacje', description: 'Figury w ruchu' },
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
  const [activeSection, setActiveSection] = useState<SectionId | null>(null);
  const [rewarded, setRewarded] = useState(false);
  const { markSectionOpened, markSectionViewedCount, sectionProgress } =
    useLessonHubProgress(SLIDES);

  const handleGameStart = (): void => {
    if (!rewarded) {
      const progress = loadProgress();
      const reward = createLessonCompletionReward(progress, 'geometry_shapes', 60);
      addXp(reward.xp, reward.progressUpdates);
      setRewarded(true);
    }
    setActiveSection('game');
  };

  if (activeSection === 'game') {
    return (
      <div className='flex w-full max-w-lg flex-col items-center gap-4'>
        <KangurButton
          onClick={() => setActiveSection(null)}
          className='self-start'
          size='sm'
          type='button'
          variant='surface'
        >
          <ArrowLeft className='w-4 h-4' /> Wróć do tematów
        </KangurButton>
        <KangurLessonSubsectionSummarySync
          summary={HUB_SECTIONS.find((section) => section.id === activeSection) ?? null}
        />
        <KangurGlassPanel
          data-testid='geometry-shapes-game-shell'
          className='flex w-full flex-col items-center gap-5'
          padding='xl'
          surface='solid'
        >
          <GeometryDrawingGame onFinish={() => setActiveSection(null)} />
        </KangurGlassPanel>
      </div>
    );
  }

  if (activeSection) {
    return (
      <LessonSlideSection
        slides={SLIDES[activeSection]}
        sectionHeader={HUB_SECTIONS.find((section) => section.id === activeSection) ?? null}
        onBack={() => setActiveSection(null)}
        onProgressChange={(viewedCount) => markSectionViewedCount(activeSection, viewedCount)}
        dotActiveClass='bg-fuchsia-500'
        dotDoneClass='bg-fuchsia-300'
        gradientClass='kangur-gradient-accent-violet-reverse'
      />
    );
  }

  return (
    <LessonHub
      lessonEmoji='🔷'
      lessonTitle='Figury geometryczne'
      gradientClass='kangur-gradient-accent-violet-reverse'
      progressDotClassName='bg-fuchsia-300'
      sections={HUB_SECTIONS.map((section) =>
        section.isGame
          ? section
          : {
            ...section,
            progress: sectionProgress[section.id as keyof typeof SLIDES],
          }
      )}
      onSelect={(id) => {
        if (id === 'game') {
          handleGameStart();
        } else {
          markSectionOpened(id as keyof typeof SLIDES);
          setActiveSection(id as SectionId);
        }
      }}
    />
  );
}
