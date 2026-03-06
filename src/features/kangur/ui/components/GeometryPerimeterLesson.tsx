import { useState } from 'react';

import {
  XP_REWARDS,
  addXp,
  buildLessonMasteryUpdate,
  loadProgress,
} from '@/features/kangur/ui/services/progress';
import LessonHub from '@/features/kangur/ui/components/LessonHub';
import LessonSlideSection, {
  type LessonSlide,
} from '@/features/kangur/ui/components/LessonSlideSection';
import { KangurLessonCallout } from '@/features/kangur/ui/design/lesson-primitives';

type GeometryPerimeterLessonProps = { onBack: () => void };
type SectionId = 'intro' | 'kwadrat' | 'prostokan' | 'podsumowanie';

export const SLIDES: Record<SectionId, LessonSlide[]> = {
  intro: [
    {
      title: 'Co to jest obwód?',
      content: (
        <div className='flex flex-col gap-4 text-center'>
          <p className='text-gray-700'>
            <strong>Obwód</strong> to długosc całej krawędzi figury. Dodajemy wszystkie boki.
          </p>
          <KangurLessonCallout accent='amber'>
            <div className='mx-auto h-20 w-32 rounded border-4 border-amber-500' />
            <p className='mt-2 text-sm text-amber-700'>Idziemy dookoła figury i sumujemy.</p>
          </KangurLessonCallout>
          <p className='text-gray-500 text-sm'>
            Obwód mierzymy w centymetrach (cm), metrach (m) itp.
          </p>
        </div>
      ),
    },
  ],
  kwadrat: [
    {
      title: 'Obwód kwadratu',
      content: (
        <div className='space-y-3'>
          <KangurLessonCallout accent='slate' className='border-amber-200/85 text-center'>
            <p className='text-gray-700'>Każdy bok ma 3 cm</p>
            <p className='mt-2 text-xl font-bold text-amber-700'>Obwód = 3 + 3 + 3 + 3 = 12 cm</p>
          </KangurLessonCallout>
          <KangurLessonCallout accent='amber' className='text-center text-sm text-gray-700' padding='sm'>
            <p className='font-bold text-amber-700'>Wzór dla kwadratu:</p>
            <p className='text-lg font-extrabold mt-1'>O = 4 × a</p>
            <p className='text-gray-500 text-xs mt-1'>gdzie <b>a</b> to długosc boku</p>
          </KangurLessonCallout>
          <p className='text-center text-sm text-gray-500'>
            Przykład: a = 5 cm → O = 4 × 5 = 20 cm
          </p>
        </div>
      ),
    },
  ],
  prostokan: [
    {
      title: 'Obwód prostokąta',
      content: (
        <div className='space-y-3'>
          <KangurLessonCallout accent='slate' className='border-amber-200/85 text-center'>
            <p className='text-gray-700'>Boki: 6 cm, 4 cm, 6 cm, 4 cm</p>
            <p className='mt-2 text-xl font-bold text-amber-700'>Obwód = 6 + 4 + 6 + 4 = 20 cm</p>
          </KangurLessonCallout>
          <KangurLessonCallout accent='amber' className='text-center text-sm text-gray-700' padding='sm'>
            <p className='font-bold text-amber-700'>Wzór dla prostokata:</p>
            <p className='text-lg font-extrabold mt-1'>O = 2 × (a + b)</p>
            <p className='text-gray-500 text-xs mt-1'>gdzie <b>a</b> i <b>b</b> to długosci boków</p>
          </KangurLessonCallout>
          <p className='text-center text-sm text-gray-500'>
            Przykład: a=6, b=4 → O = 2 × (6+4) = 20 cm
          </p>
        </div>
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
            'Dla prostokata: O = 2 × (a + b)',
            'Jednostka obwodu to np. cm lub m.',
            'Zawsze sprawdz, czy dodałes każdy bok tylko raz.',
          ].map((text) => (
            <KangurLessonCallout key={text} accent='amber' className='text-sm text-gray-700' padding='sm'>
              ✅ {text}
            </KangurLessonCallout>
          ))}
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
];

export default function GeometryPerimeterLesson({ onBack }: GeometryPerimeterLessonProps): React.JSX.Element {
  const [activeSection, setActiveSection] = useState<SectionId | null>(null);

  const handleComplete = (): void => {
    const progress = loadProgress();
    addXp(XP_REWARDS.lesson_completed, {
      lessonsCompleted: progress.lessonsCompleted + 1,
      lessonMastery: buildLessonMasteryUpdate(progress, 'geometry_perimeter', 100),
    });
  };

  if (activeSection) {
    return (
      <LessonSlideSection
        slides={SLIDES[activeSection]}
        onBack={() => setActiveSection(null)}
        onComplete={activeSection === 'podsumowanie' ? handleComplete : undefined}
        dotActiveClass='bg-amber-500'
        dotDoneClass='bg-amber-300'
        gradientClass='from-amber-500 to-orange-500'
      />
    );
  }

  return (
    <LessonHub
      lessonEmoji='📏'
      lessonTitle='Obwód figur'
      gradientClass='from-amber-500 to-orange-500'
      sections={HUB_SECTIONS}
      onSelect={(id) => setActiveSection(id as SectionId)}
      onBack={onBack}
    />
  );
}
