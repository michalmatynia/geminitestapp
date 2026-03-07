import { useState } from 'react';

import SubtractingGame from '@/features/kangur/ui/components/SubtractingGame';
import LessonHub from '@/features/kangur/ui/components/LessonHub';
import LessonSlideSection, {
  type LessonSlide,
} from '@/features/kangur/ui/components/LessonSlideSection';
import { KangurLessonCallout } from '@/features/kangur/ui/design/lesson-primitives';
import { KangurIconBadge } from '@/features/kangur/ui/design/primitives';

type SectionId = 'podstawy' | 'przekroczenie' | 'dwucyfrowe' | 'zapamietaj' | 'game';

export const SLIDES: Record<Exclude<SectionId, 'game'>, LessonSlide[]> = {
  podstawy: [
    {
      title: 'Co to znaczy odejmowac?',
      content: (
        <div className='flex flex-col items-center gap-4'>
          <p className='text-gray-700 text-center'>
            Odejmowanie to zabieranie czesci z grupy. Pytamy: ile zostało?
          </p>
          <div className='flex items-center gap-4 text-5xl'>
            <span>🍎🍎🍎🍎🍎</span>
            <span className='text-2xl font-bold text-gray-400'>−</span>
            <span>🍎🍎</span>
            <span className='text-2xl font-bold text-gray-400'>=</span>
            <span>🍎🍎🍎</span>
          </div>
          <p className='text-red-500 font-bold text-xl'>5 − 2 = 3</p>
        </div>
      ),
    },
    {
      title: 'Odejmowanie jednocyfrowe',
      content: (
        <div className='flex flex-col items-center gap-4'>
          <p className='text-gray-700 text-center'>
            Cofaj sie na osi liczbowej lub licz, ile brakuje do wyniku.
          </p>
          <KangurLessonCallout accent='rose' className='text-center'>
            <p className='text-3xl font-extrabold text-red-500'>9 − 4 = ?</p>
            <p className='text-gray-500 mt-2'>
              Zacznij od <b>9</b>, cofnij sie 4: 8, 7, 6, <b>5</b> ✓
            </p>
          </KangurLessonCallout>
          <div className='flex gap-1 flex-wrap justify-center'>
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
              <KangurIconBadge key={n} accent='rose' size='sm'>
                {n}
              </KangurIconBadge>
            ))}
          </div>
        </div>
      ),
    },
  ],
  przekroczenie: [
    {
      title: 'Odejmowanie z przekroczeniem 10',
      content: (
        <div className='flex flex-col items-center gap-4'>
          <p className='text-gray-700 text-center'>
            Rozdziel odjemnik na dwie czesci: najpierw zejdz do 10, potem odejmij reszte.
          </p>
          <KangurLessonCallout accent='rose' className='text-center'>
            <p className='text-3xl font-extrabold text-pink-500'>13 − 5 = ?</p>
            <p className='text-gray-500 mt-2'>
              13 − <b>3</b> = 10, 10 − <b>2</b> = <b>8</b> ✓
            </p>
          </KangurLessonCallout>
          <KangurLessonCallout
            accent='slate'
            className='max-w-xs text-sm text-gray-600'
            padding='sm'
          >
            <p>🔹 Rozłóz 5 = 3 + 2</p>
            <p>🔹 Odejmij 3: 13 − 3 = 10</p>
            <p>
              🔹 Odejmij 2: 10 − 2 = <b>8</b>
            </p>
          </KangurLessonCallout>
        </div>
      ),
    },
  ],
  dwucyfrowe: [
    {
      title: 'Odejmowanie dwucyfrowe',
      content: (
        <div className='flex flex-col items-center gap-4'>
          <p className='text-gray-700 text-center'>Odejmuj osobno dziesiatki i jednosci!</p>
          <KangurLessonCallout accent='amber' className='max-w-xs text-center'>
            <p className='text-3xl font-extrabold text-orange-500'>47 − 23 = ?</p>
            <div className='mt-2 text-gray-600 text-left'>
              <p>
                🔹 Dziesiatki: <b>40 − 20 = 20</b>
              </p>
              <p>
                🔹 Jednosci: <b>7 − 3 = 4</b>
              </p>
              <p className='mt-1 text-orange-700 font-bold'>
                20 + 4 = <span className='text-2xl'>24</span> ✓
              </p>
            </div>
          </KangurLessonCallout>
        </div>
      ),
    },
  ],
  zapamietaj: [
    {
      title: 'Zapamietaj!',
      content: (
        <div className='flex flex-col items-center gap-4'>
          <KangurLessonCallout accent='amber' className='max-w-xs'>
            <ul className='text-gray-700 space-y-2 text-sm'>
              <li>
                ✅ Odejmowanie NIE jest przemienne: <b>7−3 ≠ 3−7</b>
              </li>
              <li>
                ✅ Odejmowanie 0 nic nie zmienia: <b>8−0 = 8</b>
              </li>
              <li>✅ Cofaj sie na osi lub rozkładaj na składniki</li>
              <li>
                ✅ Sprawdz wynik dodawaniem: <b>5+3=8 → 8−3=5</b>
              </li>
            </ul>
          </KangurLessonCallout>
        </div>
      ),
    },
  ],
};

export const HUB_SECTIONS = [
  {
    id: 'podstawy',
    emoji: '➖',
    title: 'Podstawy odejmowania',
    description: 'Co to odejmowanie? Jednocyfrowe',
  },
  {
    id: 'przekroczenie',
    emoji: '🔟',
    title: 'Odejmowanie przez 10',
    description: 'Rozklad przez dziesiec',
  },
  {
    id: 'dwucyfrowe',
    emoji: '💡',
    title: 'Odejmowanie dwucyfrowe',
    description: 'Dziesiatki i jednosci osobno',
  },
  { id: 'zapamietaj', emoji: '🧠', title: 'Zapamietaj!', description: 'Zasady odejmowania' },
  {
    id: 'game',
    emoji: '🎮',
    title: 'Gra z odejmowaniem',
    description: 'Cwicz w interaktywnej grze',
    isGame: true,
  },
];

export default function SubtractingLesson(): React.JSX.Element {
  const [activeSection, setActiveSection] = useState<SectionId | null>(null);

  if (activeSection === 'game') {
    return (
      <div className='flex flex-col items-center gap-4 w-full max-w-sm'>
        <h2 className='text-2xl font-extrabold text-red-500'>🎮 Gra z odejmowaniem!</h2>
        <SubtractingGame onFinish={() => setActiveSection(null)} />
      </div>
    );
  }

  if (activeSection) {
    return (
      <LessonSlideSection
        slides={SLIDES[activeSection]}
        onBack={() => setActiveSection(null)}
        dotActiveClass='bg-red-400'
        dotDoneClass='bg-red-200'
        gradientClass='from-red-400 to-pink-400'
      />
    );
  }

  return (
    <LessonHub
      lessonEmoji='➖'
      lessonTitle='Odejmowanie'
      gradientClass='from-red-400 to-pink-400'
      sections={HUB_SECTIONS}
      onSelect={(id) => setActiveSection(id as SectionId)}
    />
  );
}
