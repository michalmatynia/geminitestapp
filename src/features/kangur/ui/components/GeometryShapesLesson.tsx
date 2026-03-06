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
import { KangurLessonCallout } from '@/features/kangur/ui/design/lesson-primitives';
import { KangurButton, KangurPanel } from '@/features/kangur/ui/design/primitives';

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

export const SLIDES: Record<Exclude<SectionId, 'game'>, LessonSlide[]> = {
  podstawowe: [
    {
      title: 'Poznaj figury',
      content: (
        <div className='grid grid-cols-2 gap-2'>
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
                  <p className='text-sm font-bold text-gray-800'>{shape.name}</p>
                  <p className='text-xs text-gray-500'>{shape.details}</p>
                </div>
              </div>
            </KangurLessonCallout>
          ))}
        </div>
      ),
    },
  ],
};

export const HUB_SECTIONS = [
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
        <KangurButton
          onClick={() => setActiveSection(null)}
          className='self-start'
          size='sm'
          type='button'
          variant='ghost'
        >
          Wróc do menu
        </KangurButton>
        <KangurPanel className='w-full' padding='xl' variant='soft'>
          <h2 className='mb-4 text-center text-xl font-extrabold text-slate-800'>
            🔷 Trening figur
          </h2>
          <GeometryDrawingGame onFinish={() => setActiveSection(null)} />
        </KangurPanel>
      </div>
    );
  }

  if (activeSection) {
    return (
      <LessonSlideSection
        slides={SLIDES[activeSection]}
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
