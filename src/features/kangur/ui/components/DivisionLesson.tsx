import { useState } from 'react';

import DivisionGame from '@/features/kangur/ui/components/DivisionGame';
import LessonHub from '@/features/kangur/ui/components/LessonHub';
import LessonSlideSection, {
  type LessonSlide,
} from '@/features/kangur/ui/components/LessonSlideSection';

type DivisionLessonProps = { onBack: () => void };
type SectionId = 'intro' | 'odwrotnosc' | 'reszta' | 'zapamietaj' | 'game';

const SLIDES: Record<Exclude<SectionId, 'game'>, LessonSlide[]> = {
  intro: [
    {
      title: 'Co to znaczy dzielic?',
      content: (
        <div className='flex flex-col items-center gap-4'>
          <p className='text-gray-700 text-center'>
            Dzielenie to równy podział na grupy. Pytamy: ile w każdej grupie?
          </p>
          <div className='flex flex-col items-center gap-2'>
            <div className='flex gap-3 text-4xl'>🍪🍪🍪🍪🍪🍪</div>
            <p className='text-gray-500 text-sm'>6 ciastek podzielone na 2 osoby</p>
            <p className='text-blue-600 font-bold text-2xl'>6 ÷ 2 = 3</p>
            <div className='flex gap-4 text-2xl'>
              <span>🧒🍪🍪🍪</span>
              <span>🧒🍪🍪🍪</span>
            </div>
          </div>
        </div>
      ),
    },
  ],
  odwrotnosc: [
    {
      title: 'Dzielenie i mnozenie',
      content: (
        <div className='flex flex-col items-center gap-4'>
          <p className='text-gray-700 text-center'>Każde mnozenie ma swoje dzielenie!</p>
          <div className='bg-blue-50 border border-blue-200 rounded-2xl p-4 w-full max-w-xs'>
            <div className='flex flex-col gap-2 text-center'>
              <p className='text-gray-700'>4 × 3 = <b>12</b></p>
              <div className='flex gap-3 justify-center text-blue-600 font-bold'>
                <p>12 ÷ 4 = 3</p>
                <p>12 ÷ 3 = 4</p>
              </div>
            </div>
          </div>
          <p className='text-sm text-gray-500 text-center'>
            Znajac tabliczkę mnozenia, znasz tez tabliczkę dzielenia!
          </p>
        </div>
      ),
    },
  ],
  reszta: [
    {
      title: 'Reszta z dzielenia',
      content: (
        <div className='flex flex-col items-center gap-4'>
          <p className='text-gray-700 text-center'>
            Nie zawsze dzielenie wychodzi równo — wtedy zostaje reszta.
          </p>
          <div className='bg-teal-50 border border-teal-200 rounded-2xl p-4 text-center w-full max-w-xs'>
            <p className='text-3xl font-extrabold text-teal-600'>7 ÷ 2 = ?</p>
            <p className='text-gray-500 mt-2'>2×3=6 (za mało), 2×4=8 (za duzo)</p>
            <p className='text-teal-700 font-bold mt-1'>7 ÷ 2 = <b>3</b> reszta <b>1</b></p>
          </div>
          <div className='flex gap-3 text-3xl'>🍫🍫🍫🍫🍫🍫🍫</div>
          <p className='text-sm text-gray-500'>7 czekolad → 3 dla każdego, 1 zostaje</p>
        </div>
      ),
    },
  ],
  zapamietaj: [
    {
      title: 'Zapamietaj!',
      content: (
        <div className='flex flex-col items-center gap-4'>
          <div className='bg-yellow-50 border border-yellow-200 rounded-2xl p-4 w-full max-w-xs'>
            <ul className='text-gray-700 space-y-2 text-sm'>
              <li>✅ Podziel przez 1 = ta sama liczba: <b>9÷1=9</b></li>
              <li>✅ Podziel przez siebie = 1: <b>5÷5=1</b></li>
              <li>✅ 0 podzielone przez cokolwiek = 0: <b>0÷4=0</b></li>
              <li>✅ Reszta jest zawsze mniejsza od dzielnika</li>
              <li>✅ Sprawdz: wynik × dzielnik + reszta = liczba</li>
            </ul>
          </div>
        </div>
      ),
    },
  ],
};

const HUB_SECTIONS = [
  { id: 'intro', emoji: '÷', title: 'Co to dzielenie?', description: 'Podział na równe grupy' },
  { id: 'odwrotnosc', emoji: '🔄', title: 'Dzielenie i mnozenie', description: 'Odwrotne działania' },
  { id: 'reszta', emoji: '🍫', title: 'Reszta z dzielenia', description: 'Gdy nie wychodzi równo' },
  { id: 'zapamietaj', emoji: '🧠', title: 'Zapamietaj!', description: 'Ważne zasady dzielenia' },
  { id: 'game', emoji: '🎮', title: 'Gra z dzieleniem', description: 'Cwicz dzielenie w grze', isGame: true },
];

export default function DivisionLesson({ onBack }: DivisionLessonProps): React.JSX.Element {
  const [activeSection, setActiveSection] = useState<SectionId | null>(null);

  if (activeSection === 'game') {
    return (
      <div className='flex flex-col items-center gap-4 w-full max-w-sm'>
        <h2 className='text-2xl font-extrabold text-blue-600'>🎮 Gra z dzieleniem!</h2>
        <DivisionGame onFinish={() => setActiveSection(null)} />
      </div>
    );
  }

  if (activeSection) {
    return (
      <LessonSlideSection
        slides={SLIDES[activeSection as Exclude<SectionId, 'game'>]}
        onBack={() => setActiveSection(null)}
        dotActiveClass='bg-blue-500'
        dotDoneClass='bg-blue-300'
        gradientClass='from-blue-500 to-teal-400'
      />
    );
  }

  return (
    <LessonHub
      lessonEmoji='➗'
      lessonTitle='Dzielenie'
      gradientClass='from-blue-500 to-teal-400'
      sections={HUB_SECTIONS}
      onSelect={(id) => setActiveSection(id as SectionId)}
      onBack={onBack}
    />
  );
}
