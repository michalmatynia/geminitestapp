import { useState } from 'react';

import LessonHub from '@/features/kangur/ui/components/LessonHub';
import LessonActivityStage from '@/features/kangur/ui/components/LessonActivityStage';
import LessonSlideSection, {
  type LessonSlide,
} from '@/features/kangur/ui/components/LessonSlideSection';
import GeometryPerimeterDrawingGame from '@/features/kangur/ui/components/GeometryPerimeterDrawingGame';
import {
  GeometryPerimeterOppositeSidesAnimation,
  GeometryPerimeterSumAnimation,
  GeometryPerimeterSidesAnimation,
  GeometryPerimeterTraceAnimation,
  GeometrySideHighlightAnimation,
} from '@/features/kangur/ui/components/GeometryLessonAnimations';
import {
  KangurLessonCallout,
  KangurLessonCaption,
  KangurLessonLead,
  KangurLessonStack,
} from '@/features/kangur/ui/design/lesson-primitives';
import { useLessonHubProgress } from '@/features/kangur/ui/hooks/useLessonHubProgress';
import {
  addXp,
  createLessonCompletionReward,
  loadProgress,
} from '@/features/kangur/ui/services/progress';

type SectionId = 'intro' | 'kwadrat' | 'prostokan' | 'animacje' | 'podsumowanie' | 'game_draw';
type SlideSectionId = Exclude<SectionId, 'game_draw'>;

const PERIMETER_ANIMATION_SLIDES: LessonSlide[] = [
  {
    title: 'Obwód krok po kroku',
    content: (
      <KangurLessonStack className='text-center'>
        <KangurLessonLead>Obwód to droga dookoła figury.</KangurLessonLead>
        <KangurLessonCallout accent='amber'>
          <div className='mx-auto h-20 w-32'>
            <GeometryPerimeterTraceAnimation />
          </div>
          <KangurLessonCaption className='mt-2'>Liczymy wszystkie boki.</KangurLessonCaption>
        </KangurLessonCallout>
      </KangurLessonStack>
    ),
  },
  {
    title: 'Kolejne boki',
    content: (
      <KangurLessonStack className='text-center'>
        <KangurLessonLead>Idziemy po kolei i nie pomijamy żadnej krawędzi.</KangurLessonLead>
        <KangurLessonCallout accent='amber'>
          <div className='mx-auto h-20 w-32'>
            <GeometrySideHighlightAnimation />
          </div>
          <KangurLessonCaption className='mt-2'>Każdy bok liczymy raz.</KangurLessonCaption>
        </KangurLessonCallout>
      </KangurLessonStack>
    ),
  },
  {
    title: 'Obwód prostokąta',
    content: (
      <KangurLessonStack className='text-center'>
        <KangurLessonLead>Najpierw a + b, potem razy 2.</KangurLessonLead>
        <KangurLessonCallout accent='amber'>
          <div className='mx-auto h-20 w-32'>
            <GeometryPerimeterTraceAnimation />
          </div>
          <KangurLessonCaption className='mt-2'>O = 2 × (a + b)</KangurLessonCaption>
        </KangurLessonCallout>
      </KangurLessonStack>
    ),
  },
  {
    title: 'Przeciwległe boki',
    content: (
      <KangurLessonStack className='text-center'>
        <KangurLessonLead>W prostokącie przeciwległe boki są równe.</KangurLessonLead>
        <KangurLessonCallout accent='amber'>
          <div className='mx-auto h-20 w-32'>
            <GeometryPerimeterOppositeSidesAnimation />
          </div>
          <KangurLessonCaption className='mt-2'>To ułatwia szybkie liczenie.</KangurLessonCaption>
        </KangurLessonCallout>
      </KangurLessonStack>
    ),
  },
  {
    title: 'Suma boków',
    content: (
      <KangurLessonStack className='text-center'>
        <KangurLessonLead>Dodaj wszystkie długości i otrzymasz obwód.</KangurLessonLead>
        <KangurLessonCallout accent='amber'>
          <div className='mx-auto h-20 w-36'>
            <GeometryPerimeterSumAnimation />
          </div>
          <KangurLessonCaption className='mt-2'>O = 6 + 4 + 6 + 4 = 20</KangurLessonCaption>
        </KangurLessonCallout>
      </KangurLessonStack>
    ),
  },
];

export const SLIDES: Record<SlideSectionId, LessonSlide[]> = {
  intro: [
    {
      title: 'Co to jest obwód?',
      content: (
        <KangurLessonStack className='text-center'>
          <KangurLessonLead>
            <strong>Obwód</strong> to długosc całej krawędzi figury. Dodajemy wszystkie boki.
          </KangurLessonLead>
          <KangurLessonCallout accent='amber'>
            <div className='mx-auto h-20 w-32'>
              <GeometryPerimeterTraceAnimation />
            </div>
            <p className='mt-2 text-sm text-amber-700'>Idziemy dookoła figury i sumujemy.</p>
          </KangurLessonCallout>
          <KangurLessonCaption>
            Obwód mierzymy w centymetrach (cm), metrach (m) itp.
          </KangurLessonCaption>
        </KangurLessonStack>
      ),
    },
  ],
  kwadrat: [
    {
      title: 'Obwód kwadratu',
      content: (
        <KangurLessonStack className='gap-3 text-center' gap='sm'>
          <KangurLessonCallout accent='slate' className='border-amber-200/85 text-center'>
            <div className='mx-auto h-20 w-32'>
              <GeometryPerimeterTraceAnimation />
            </div>
            <p className='[color:var(--kangur-page-text)]'>Każdy bok ma 3 cm</p>
            <p className='mt-2 text-xl font-bold text-amber-700'>Obwód = 3 + 3 + 3 + 3 = 12 cm</p>
          </KangurLessonCallout>
          <KangurLessonCallout
            accent='amber'
            className='text-center text-sm [color:var(--kangur-page-text)]'
            padding='sm'
          >
            <p className='font-bold text-amber-700'>Wzór dla kwadratu:</p>
            <p className='text-lg font-extrabold mt-1'>O = 4 × a</p>
            <p className='mt-1 text-xs [color:var(--kangur-page-muted-text)]'>
              gdzie <b>a</b> to długosc boku
            </p>
          </KangurLessonCallout>
          <KangurLessonCaption>
            Przykład: a = 5 cm → O = 4 × 5 = 20 cm
          </KangurLessonCaption>
        </KangurLessonStack>
      ),
    },
  ],
  prostokan: [
    {
      title: 'Obwód prostokąta',
      content: (
        <KangurLessonStack className='gap-3 text-center' gap='sm'>
          <KangurLessonCallout accent='slate' className='border-amber-200/85 text-center'>
            <div className='mx-auto h-20 w-32'>
              <GeometryPerimeterTraceAnimation />
            </div>
            <p className='[color:var(--kangur-page-text)]'>Boki: 6 cm, 4 cm, 6 cm, 4 cm</p>
            <p className='mt-2 text-xl font-bold text-amber-700'>Obwód = 6 + 4 + 6 + 4 = 20 cm</p>
          </KangurLessonCallout>
          <KangurLessonCallout
            accent='amber'
            className='text-center text-sm [color:var(--kangur-page-text)]'
            padding='sm'
          >
            <p className='font-bold text-amber-700'>Wzór dla prostokata:</p>
            <p className='text-lg font-extrabold mt-1'>O = 2 × (a + b)</p>
            <p className='mt-1 text-xs [color:var(--kangur-page-muted-text)]'>
              gdzie <b>a</b> i <b>b</b> to długosci boków
            </p>
          </KangurLessonCallout>
          <KangurLessonCaption>
            Przykład: a=6, b=4 → O = 2 × (6+4) = 20 cm
          </KangurLessonCaption>
        </KangurLessonStack>
      ),
    },
  ],
  animacje: PERIMETER_ANIMATION_SLIDES,
  podsumowanie: [
    {
      title: 'Podsumowanie',
      content: (
        <div className='space-y-3'>
          {[
            'Obwód to suma wszystkich boków.',
            'Dla kwadratu: O = 4 × a',
            'Dla prostokąta: O = 2 × (a + b)',
            'Jednostka obwodu to np. cm lub m.',
            'Zawsze sprawdź, czy dodałeś każdy bok tylko raz.',
          ].map((text) => (
            <KangurLessonCallout
              key={text}
              accent='amber'
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
      title: 'Podsumowanie w ruchu',
      content: (
        <div className='grid gap-3 text-center sm:grid-cols-2'>
          <KangurLessonCallout accent='amber' padding='sm'>
            <div className='mx-auto h-24 w-36'>
              <GeometryPerimeterTraceAnimation />
            </div>
            <KangurLessonCaption className='mt-2'>
              Obwód to pełne okrążenie figury.
            </KangurLessonCaption>
          </KangurLessonCallout>
          <KangurLessonCallout accent='amber' padding='sm'>
            <div className='mx-auto h-24 w-36'>
              <GeometryPerimeterSidesAnimation />
            </div>
            <KangurLessonCaption className='mt-2'>Dodaj pary boków: a + a, b + b.</KangurLessonCaption>
          </KangurLessonCallout>
        </div>
      ),
    },
  ],
};

export const HUB_SECTIONS = [
  { id: 'intro', emoji: '📏', title: 'Co to obwód?', description: 'Definicja i zasada liczenia' },
  { id: 'kwadrat', emoji: '🟥', title: 'Obwód kwadratu', description: 'Wzór: 4 × a' },
  { id: 'prostokan', emoji: '▭', title: 'Obwód prostokata', description: 'Wzór: 2 × (a + b)' },
  {
    id: 'animacje',
    emoji: '🎞️',
    title: 'Animacje',
    description: 'Obwód krok po kroku',
  },
  {
    id: 'game_draw',
    emoji: '✍️',
    title: 'Gra: Rysuj obwód',
    description: 'Rysuj po kratkach i wybieraj obwód',
    isGame: true,
  },
  { id: 'podsumowanie', emoji: '📋', title: 'Podsumowanie', description: 'Wszystkie wzory razem' },
];

export default function GeometryPerimeterLesson(): React.JSX.Element {
  const [activeSection, setActiveSection] = useState<SectionId | null>(null);
  const { markSectionOpened, markSectionViewedCount, sectionProgress } =
    useLessonHubProgress(SLIDES);

  const handleComplete = (): void => {
    const progress = loadProgress();
    const reward = createLessonCompletionReward(progress, 'geometry_perimeter', 100);
    addXp(reward.xp, reward.progressUpdates);
  };

  if (activeSection === 'game_draw') {
    return (
      <LessonActivityStage
        accent='amber'
        headerTestId='geometry-perimeter-game-header'
        icon='✍️'
        maxWidthClassName='max-w-sm'
        onBack={() => setActiveSection(null)}
        sectionHeader={HUB_SECTIONS.find((section) => section.id === activeSection) ?? null}
        shellTestId='geometry-perimeter-game-shell'
        title='Gra: Rysuj obwód'
      >
        <GeometryPerimeterDrawingGame
          finishLabel='Wróć do tematów'
          onFinish={() => setActiveSection(null)}
        />
      </LessonActivityStage>
    );
  }

  if (activeSection) {
    return (
      <LessonSlideSection
        slides={SLIDES[activeSection as SlideSectionId]}
        sectionHeader={HUB_SECTIONS.find((section) => section.id === activeSection) ?? null}
        onBack={() => setActiveSection(null)}
        onComplete={activeSection === 'podsumowanie' ? handleComplete : undefined}
        onProgressChange={(viewedCount) => markSectionViewedCount(activeSection, viewedCount)}
        dotActiveClass='bg-amber-500'
        dotDoneClass='bg-amber-300'
        gradientClass='kangur-gradient-accent-amber-reverse'
      />
    );
  }

  return (
    <LessonHub
      lessonEmoji='📏'
      lessonTitle='Obwód figur'
      gradientClass='kangur-gradient-accent-amber-reverse'
      progressDotClassName='bg-amber-300'
      sections={HUB_SECTIONS.map((section) => ({
        ...section,
        progress: section.isGame ? undefined : sectionProgress[section.id as SlideSectionId],
      }))}
      onSelect={(id) => {
        if (id !== 'game_draw') {
          markSectionOpened(id as SlideSectionId);
        }
        setActiveSection(id as SectionId);
      }}
    />
  );
}
