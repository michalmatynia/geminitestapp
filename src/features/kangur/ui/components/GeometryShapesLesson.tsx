import { useState } from 'react';

import GeometryDrawingGame from '@/features/kangur/ui/components/GeometryDrawingGame';
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

type GeometryShapesLessonProps = { onBack: () => void };
type SectionId = 'podstawowe' | 'ile_bokow' | 'game';

const SHAPE_CARDS = [
  { emoji: '⚪', name: 'Koło', details: '0 boków i 0 rogów' },
  { emoji: '🔺', name: 'Trójkąt', details: '3 boki i 3 rogi' },
  { emoji: '🟦', name: 'Kwadrat', details: '4 równe boki i 4 rogi' },
  { emoji: '▭', name: 'Prostokąt', details: '4 boki i 4 rogi' },
  { emoji: '⬟', name: 'Pieciokąt', details: '5 boków i 5 rogów' },
  { emoji: '⬢', name: 'Szesciokąt', details: '6 boków i 6 rogów' },
] as const;

const SLIDES: Record<Exclude<SectionId, 'game'>, LessonSlide[]> = {
  podstawowe: [
    {
      title: 'Poznaj figury',
      content: (
        <div className='grid grid-cols-2 gap-2'>
          {SHAPE_CARDS.slice(0, 4).map((shape) => (
            <div
              key={shape.name}
              className='rounded-2xl border border-fuchsia-200 bg-fuchsia-50 p-3 text-center'
            >
              <div className='text-3xl'>{shape.emoji}</div>
              <div className='mt-1 text-sm font-bold text-fuchsia-700'>{shape.name}</div>
              <div className='text-xs text-fuchsia-600'>{shape.details}</div>
            </div>
          ))}
        </div>
      ),
    },
  ],
  ile_bokow: [
    {
      title: 'Ile boków i rogów?',
      content: (
        <div className='space-y-2'>
          {SHAPE_CARDS.map((shape) => (
            <div
              key={shape.name}
              className='rounded-2xl border border-fuchsia-200 bg-white px-3 py-2'
            >
              <div className='flex items-center gap-2'>
                <span className='text-2xl'>{shape.emoji}</span>
                <div>
                  <p className='text-sm font-bold text-gray-800'>{shape.name}</p>
                  <p className='text-xs text-gray-500'>{shape.details}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      ),
    },
  ],
};

const HUB_SECTIONS = [
  { id: 'podstawowe', emoji: '🔺', title: 'Podstawowe figury', description: 'Koło, trójkąt, kwadrat, prostokąt' },
  { id: 'ile_bokow', emoji: '🔢', title: 'Boki i rogi', description: 'Każda figura pod lupą' },
  { id: 'game', emoji: '✍️', title: 'Rysuj figury', description: 'Narysuj kształt i zdobadz XP', isGame: true },
];

export default function GeometryShapesLesson({ onBack }: GeometryShapesLessonProps): React.JSX.Element {
  const [activeSection, setActiveSection] = useState<SectionId | null>(null);
  const [rewarded, setRewarded] = useState(false);

  const handleGameStart = (): void => {
    if (!rewarded) {
      const progress = loadProgress();
      addXp(XP_REWARDS.lesson_completed, {
        lessonsCompleted: progress.lessonsCompleted + 1,
        lessonMastery: buildLessonMasteryUpdate(progress, 'geometry_shapes', 60),
      });
      setRewarded(true);
    }
    setActiveSection('game');
  };

  if (activeSection === 'game') {
    return (
      <div className='flex w-full max-w-md flex-col items-center gap-4'>
        <button
          onClick={() => setActiveSection(null)}
          className='self-start rounded-xl border border-fuchsia-200 px-3 py-1 text-sm font-semibold text-fuchsia-700 hover:bg-fuchsia-50'
        >
          Wróc do menu
        </button>
        <div className='w-full rounded-3xl bg-white p-5 shadow-xl'>
          <h2 className='mb-4 text-center text-xl font-extrabold text-fuchsia-700'>
            🔷 Trening figur
          </h2>
          <GeometryDrawingGame onFinish={() => setActiveSection(null)} />
        </div>
      </div>
    );
  }

  if (activeSection) {
    return (
      <LessonSlideSection
        slides={SLIDES[activeSection as Exclude<SectionId, 'game'>]}
        onBack={() => setActiveSection(null)}
        dotActiveClass='bg-fuchsia-500'
        dotDoneClass='bg-fuchsia-300'
        gradientClass='from-fuchsia-500 to-violet-500'
      />
    );
  }

  return (
    <LessonHub
      lessonEmoji='🔷'
      lessonTitle='Figury geometryczne'
      gradientClass='from-fuchsia-500 to-violet-500'
      sections={HUB_SECTIONS}
      onSelect={(id) => {
        if (id === 'game') {
          handleGameStart();
        } else {
          setActiveSection(id as SectionId);
        }
      }}
      onBack={onBack}
    />
  );
}
