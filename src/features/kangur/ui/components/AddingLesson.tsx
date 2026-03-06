import { useState } from 'react';

import AddingBallGame from '@/features/kangur/ui/components/AddingBallGame';
import LessonHub from '@/features/kangur/ui/components/LessonHub';
import LessonSlideSection, {
  type LessonSlide,
} from '@/features/kangur/ui/components/LessonSlideSection';

type AddingLessonProps = { onBack: () => void };
type SectionId = 'podstawy' | 'przekroczenie' | 'dwucyfrowe' | 'zapamietaj' | 'game';

const SLIDES: Record<Exclude<SectionId, 'game'>, LessonSlide[]> = {
  podstawy: [
    {
      title: 'Co to znaczy dodawac?',
      content: (
        <div className='flex flex-col items-center gap-4'>
          <p className='text-gray-700 text-center'>
            Dodawanie to łączenie dwóch grup razem, zeby policzyc, ile ich jest łacznie.
          </p>
          <div className='flex items-center gap-4 text-5xl'>
            <span>🍎🍎</span>
            <span className='text-2xl font-bold text-gray-400'>+</span>
            <span>🍎🍎🍎</span>
            <span className='text-2xl font-bold text-gray-400'>=</span>
            <span>🍎🍎🍎🍎🍎</span>
          </div>
          <p className='text-orange-600 font-bold text-xl'>2 + 3 = 5</p>
        </div>
      ),
    },
    {
      title: 'Dodawanie jednocyfrowe',
      content: (
        <div className='flex flex-col items-center gap-4'>
          <p className='text-gray-700 text-center'>
            Mozesz liczyc na palcach lub w myslach. Zacznij od wiekszej liczby!
          </p>
          <div className='bg-orange-50 border border-orange-200 rounded-2xl p-4 text-center'>
            <p className='text-3xl font-extrabold text-orange-500'>4 + 3 = ?</p>
            <p className='text-gray-500 mt-2'>
              Zacznij od <b>4</b>, dolicz 3 w góre: 5, 6, <b>7</b> ✓
            </p>
          </div>
          <div className='flex gap-1 flex-wrap justify-center'>
            {[1,2,3,4,5,6,7,8,9].map((n) => (
              <span key={n} className='w-9 h-9 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-sm'>
                {n}
              </span>
            ))}
          </div>
        </div>
      ),
    },
  ],
  przekroczenie: [
    {
      title: 'Dodawanie z przekroczeniem 10',
      content: (
        <div className='flex flex-col items-center gap-4'>
          <p className='text-gray-700 text-center'>
            Gdy suma przekracza 10, mozesz uzupełnic do 10 i dodac reszte.
          </p>
          <div className='bg-blue-50 border border-blue-200 rounded-2xl p-4 text-center'>
            <p className='text-3xl font-extrabold text-blue-500'>7 + 5 = ?</p>
            <p className='text-gray-500 mt-2'>
              7 + <b>3</b> = 10, zostaje jeszcze <b>2</b>, więc 10 + 2 = <b>12</b> ✓
            </p>
          </div>
        </div>
      ),
    },
  ],
  dwucyfrowe: [
    {
      title: 'Dodawanie dwucyfrowe',
      content: (
        <div className='flex flex-col items-center gap-4'>
          <p className='text-gray-700 text-center'>Dodawaj osobno dziesiatki i jednosci!</p>
          <div className='bg-green-50 border border-green-200 rounded-2xl p-4 text-center w-full max-w-xs'>
            <p className='text-3xl font-extrabold text-green-600'>24 + 13 = ?</p>
            <div className='mt-2 text-gray-600 text-left'>
              <p>🔹 Dziesiatki: <b>20 + 10 = 30</b></p>
              <p>🔹 Jednosci: <b>4 + 3 = 7</b></p>
              <p className='mt-1 text-green-700 font-bold'>30 + 7 = <span className='text-2xl'>37</span> ✓</p>
            </div>
          </div>
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
              <li>✅ Kolejnosc nie ma znaczenia: <b>3+5 = 5+3</b></li>
              <li>✅ Dodawanie 0 nic nie zmienia: <b>7+0 = 7</b></li>
              <li>✅ Zacznij od wiekszej liczby, zeby liczyc szybciej!</li>
              <li>✅ Grupuj do 10 przy przekroczeniu</li>
            </ul>
          </div>
        </div>
      ),
    },
  ],
};

const HUB_SECTIONS = [
  { id: 'podstawy', emoji: '➕', title: 'Podstawy dodawania', description: 'Co to dodawanie? Jednocyfrowe' },
  { id: 'przekroczenie', emoji: '🔟', title: 'Dodawanie przez 10', description: 'Uzupełnianie do dziesięci' },
  { id: 'dwucyfrowe', emoji: '💡', title: 'Dodawanie dwucyfrowe', description: 'Dziesiatki i jednosci osobno' },
  { id: 'zapamietaj', emoji: '🧠', title: 'Zapamietaj!', description: 'Zasady dodawania' },
  { id: 'game', emoji: '⚽', title: 'Gra z piłkami', description: 'Cwicz dodawanie przesuwajac piłki', isGame: true },
];

export default function AddingLesson({ onBack }: AddingLessonProps): React.JSX.Element {
  const [activeSection, setActiveSection] = useState<SectionId | null>(null);

  if (activeSection === 'game') {
    return (
      <div className='flex flex-col items-center gap-4 w-full max-w-sm'>
        <h2 className='text-2xl font-extrabold text-orange-500'>🎮 Gra z piłkami!</h2>
        <AddingBallGame onFinish={() => setActiveSection(null)} />
      </div>
    );
  }

  if (activeSection) {
    return (
      <LessonSlideSection
        slides={SLIDES[activeSection]}
        onBack={() => setActiveSection(null)}
        dotActiveClass='bg-orange-400'
        dotDoneClass='bg-orange-200'
        gradientClass='from-orange-400 to-yellow-400'
      />
    );
  }

  return (
    <LessonHub
      lessonEmoji='➕'
      lessonTitle='Dodawanie'
      gradientClass='from-orange-400 to-yellow-400'
      sections={HUB_SECTIONS}
      onSelect={(id) => setActiveSection(id as SectionId)}
      onBack={onBack}
    />
  );
}
