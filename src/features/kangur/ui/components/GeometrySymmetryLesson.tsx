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

type GeometrySymmetryLessonProps = { onBack: () => void };
type SectionId = 'intro' | 'os' | 'figury' | 'podsumowanie';

const SLIDES: Record<SectionId, LessonSlide[]> = {
  intro: [
    {
      title: 'Co to jest symetria?',
      content: (
        <div className='flex flex-col gap-4 text-center'>
          <p className='text-gray-700'>
            Figura jest <strong>symetryczna</strong>, gdy po złożeniu na pół obie strony pasuja do siebie.
          </p>
          <div className='rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-5xl'>
            🦋
            <p className='mt-2 text-sm text-emerald-700'>Motyl jest prawie symetryczny.</p>
          </div>
          <p className='text-gray-500 text-sm'>
            Symetria to reguła: lewa strona = prawa strona (lub góra = dół).
          </p>
        </div>
      ),
    },
  ],
  os: [
    {
      title: 'Os symetrii',
      content: (
        <div className='flex flex-col gap-4 text-center'>
          <p className='text-gray-700'>
            <strong>Os symetrii</strong> to linia, po której dzielimy figurę na dwie pasujace czesci.
          </p>
          <div className='rounded-2xl border border-emerald-200 bg-white p-4'>
            <div className='mx-auto flex h-28 w-40 items-center justify-center gap-4'>
              <div className='h-20 w-16 rounded-l-full bg-emerald-300' />
              <div className='h-24 w-0.5 bg-emerald-600' />
              <div className='h-20 w-16 rounded-r-full bg-emerald-300' />
            </div>
            <p className='mt-2 text-sm text-gray-600'>Pionowa kreska to os symetrii.</p>
          </div>
          <p className='text-gray-500 text-sm'>Figura może miec więcej niż jedna os symetrii!</p>
        </div>
      ),
    },
  ],
  figury: [
    {
      title: 'Które figury sa symetryczne?',
      content: (
        <div className='flex flex-col gap-3'>
          <div className='grid grid-cols-2 gap-2 text-sm'>
            {[
              ['✅', 'Kwadrat', 'emerald'],
              ['✅', 'Prostokąt', 'emerald'],
              ['✅', 'Koło', 'emerald'],
              ['✅', 'Trójkąt równoramienny', 'emerald'],
              ['❌', 'Dowolny zygzak', 'rose'],
              ['❌', 'Nieregularny wielokat', 'rose'],
            ].map(([icon, name, color]) => (
              <div
                key={name}
                className={`rounded-2xl border border-${color}-200 bg-${color}-50 p-3 text-center`}
              >
                {icon} {name}
              </div>
            ))}
          </div>
          <p className='text-xs text-gray-500 text-center'>
            Koło ma nieskonczona liczbe osi symetrii!
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
            'Symetria oznacza, że dwie strony sa takie same.',
            'Os symetrii to linia dzielaca figurę na dwie pasujace czesci.',
            'Wiele figur ma więcej niż jedna os symetrii.',
            'Koło ma nieskonczona liczbe osi symetrii.',
          ].map((text) => (
            <div key={text} className='rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-gray-700'>
              ✅ {text}
            </div>
          ))}
        </div>
      ),
    },
  ],
};

const HUB_SECTIONS = [
  { id: 'intro', emoji: '🦋', title: 'Co to symetria?', description: 'Definicja i przykłady' },
  { id: 'os', emoji: '|', title: 'Os symetrii', description: 'Linia podziału figury' },
  { id: 'figury', emoji: '🔵', title: 'Figury symetryczne', description: 'Które figury maja symetrię?' },
  { id: 'podsumowanie', emoji: '📋', title: 'Podsumowanie', description: 'Wszystko razem' },
];

export default function GeometrySymmetryLesson({ onBack }: GeometrySymmetryLessonProps): React.JSX.Element {
  const [activeSection, setActiveSection] = useState<SectionId | null>(null);

  const handleComplete = (): void => {
    const progress = loadProgress();
    addXp(XP_REWARDS.lesson_completed, {
      lessonsCompleted: progress.lessonsCompleted + 1,
      lessonMastery: buildLessonMasteryUpdate(progress, 'geometry_symmetry', 100),
    });
  };

  if (activeSection) {
    return (
      <LessonSlideSection
        slides={SLIDES[activeSection]}
        onBack={() => setActiveSection(null)}
        onComplete={activeSection === 'podsumowanie' ? handleComplete : undefined}
        dotActiveClass='bg-emerald-500'
        dotDoneClass='bg-emerald-300'
        gradientClass='from-emerald-500 to-lime-500'
      />
    );
  }

  return (
    <LessonHub
      lessonEmoji='🪞'
      lessonTitle='Symetria'
      gradientClass='from-emerald-500 to-lime-500'
      sections={HUB_SECTIONS}
      onSelect={(id) => setActiveSection(id as SectionId)}
      onBack={onBack}
    />
  );
}
