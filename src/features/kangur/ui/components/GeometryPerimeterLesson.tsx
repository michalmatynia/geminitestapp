'use client';

import GeometryPerimeterDrawingGame from '@/features/kangur/ui/components/GeometryPerimeterDrawingGame';
import type { LessonSlide } from '@/features/kangur/ui/components/LessonSlideSection';
import {
  GeometryPerimeterOppositeSidesAnimation,
  GeometryPerimeterSumAnimation,
  GeometryPerimeterSidesAnimation,
  GeometryPerimeterTraceAnimation,
} from '@/features/kangur/ui/components/GeometryLessonAnimations';
import {
  KangurLessonCallout,
  KangurLessonCaption,
  KangurLessonLead,
  KangurLessonStack,
} from '@/features/kangur/ui/design/lesson-primitives';
import { KangurUnifiedLesson } from '@/features/kangur/ui/lessons/lesson-components';

type SectionId = 'intro' | 'kwadrat' | 'prostokan' | 'podsumowanie' | 'game_draw';
type SlideSectionId = Exclude<SectionId, 'game_draw'>;

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
            <div className='mx-auto h-20 w-32 max-w-full'>
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
        <KangurLessonStack className='kangur-panel-gap text-center' gap='sm'>
          <KangurLessonCallout accent='slate' className='border-amber-200/85 text-center'>
            <div className='mx-auto h-20 w-32 max-w-full'>
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
        <KangurLessonStack className='kangur-panel-gap text-center' gap='sm'>
          <KangurLessonCallout accent='slate' className='border-amber-200/85 text-center'>
            <div className='mx-auto h-20 w-32 max-w-full'>
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
          <KangurLessonCallout accent='amber'>
            <div className='mx-auto h-20 w-32 max-w-full'>
              <GeometryPerimeterOppositeSidesAnimation />
            </div>
            <KangurLessonCaption className='mt-2'>
              Przeciwległe boki są równe — dodaj pary.
            </KangurLessonCaption>
          </KangurLessonCallout>
          <KangurLessonCallout accent='amber'>
            <div className='mx-auto h-20 w-36 max-w-full'>
              <GeometryPerimeterSumAnimation />
            </div>
            <KangurLessonCaption className='mt-2'>
              Dodaj wszystkie długości: O = 6 + 4 + 6 + 4 = 20
            </KangurLessonCaption>
          </KangurLessonCallout>
        </KangurLessonStack>
      ),
    },
  ],
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
        <div className='flex flex-col kangur-panel-gap text-center'>
          <KangurLessonCallout accent='amber' padding='sm'>
            <div className='mx-auto h-24 w-36 max-w-full'>
              <GeometryPerimeterTraceAnimation />
            </div>
            <KangurLessonCaption className='mt-2'>
              Obwód to pełne okrążenie figury.
            </KangurLessonCaption>
          </KangurLessonCallout>
        </div>
      ),
    },
    {
      title: 'Podsumowanie: pary boków',
      content: (
        <div className='flex flex-col kangur-panel-gap text-center'>
          <KangurLessonCallout accent='amber' padding='sm'>
            <div className='mx-auto h-24 w-36 max-w-full'>
              <GeometryPerimeterSidesAnimation />
            </div>
            <KangurLessonCaption className='mt-2'>
              Dodaj pary boków: a + a, b + b.
            </KangurLessonCaption>
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
  { id: 'podsumowanie', emoji: '📋', title: 'Podsumowanie', description: 'Wszystkie wzory razem' },
  {
    id: 'game_draw',
    emoji: '✍️',
    title: 'Gra: Rysuj obwód',
    description: 'Rysuj po kratkach i wybieraj obwód',
    isGame: true,
  },
];

export default function GeometryPerimeterLesson(): React.JSX.Element {
  return (
    <KangurUnifiedLesson
      progressMode='panel'
      lessonId='geometry_perimeter'
      lessonEmoji='📏'
      lessonTitle='Obwód figur'
      sections={HUB_SECTIONS}
      slides={SLIDES}
      gradientClass='kangur-gradient-accent-amber-reverse'
      progressDotClassName='bg-amber-300'
      dotActiveClass='bg-amber-500'
      dotDoneClass='bg-amber-300'
      completionSectionId='podsumowanie'
      autoRecordComplete
      scorePercent={100}
      skipMarkFor={['game_draw']}
      games={[
        {
          sectionId: 'game_draw',
          stage: {
            accent: 'amber',
            title: 'Gra: Rysuj obwód',
            icon: '✍️',
            maxWidthClassName: 'max-w-sm',
            headerTestId: 'geometry-perimeter-game-header',
            shellTestId: 'geometry-perimeter-game-shell',
          },
          render: ({ onFinish }) => (
            <GeometryPerimeterDrawingGame onFinish={onFinish} />
          ),
        },
      ]}
    />
  );
}
