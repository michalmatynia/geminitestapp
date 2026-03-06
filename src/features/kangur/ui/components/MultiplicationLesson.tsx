import { useState } from 'react';

import MultiplicationGame from '@/features/kangur/ui/components/MultiplicationGame';
import MultiplicationArrayGame from '@/features/kangur/ui/components/MultiplicationArrayGame';
import LessonHub from '@/features/kangur/ui/components/LessonHub';
import LessonSlideSection, {
  type LessonSlide,
} from '@/features/kangur/ui/components/LessonSlideSection';
import { KangurLessonCallout } from '@/features/kangur/ui/design/lesson-primitives';

type MultiplicationLessonProps = { onBack: () => void };
type SectionId = 'intro' | 'tabela23' | 'tabela45' | 'triki' | 'game_array' | 'game_quiz';

export const SLIDES: Record<Exclude<SectionId, 'game_array' | 'game_quiz'>, LessonSlide[]> = {
  intro: [
    {
      title: 'Co to znaczy mnozyc?',
      content: (
        <div className='flex flex-col items-center gap-4'>
          <p className='text-gray-700 text-center'>
            Mnozenie to skrócone dodawanie tej samej liczby kilka razy.
          </p>
          <div className='flex flex-col items-center gap-2'>
            <div className='flex gap-2 text-3xl'>🍬🍬🍬 🍬🍬🍬 🍬🍬🍬</div>
            <p className='text-gray-500 text-sm'>3 grupy po 3 cukierki</p>
            <p className='text-purple-600 font-bold text-2xl'>3 × 3 = 9</p>
            <p className='text-gray-400 text-sm'>(to samo co 3+3+3=9)</p>
          </div>
        </div>
      ),
    },
  ],
  tabela23: [
    {
      title: 'Tabliczka mnozenia × 2 i × 3',
      content: (
        <div className='flex flex-col gap-2 w-full'>
          <div className='grid grid-cols-2 gap-2'>
            {[2, 3].map((base) => (
              <KangurLessonCallout key={base} accent='violet' className='rounded-xl' padding='sm'>
                <p className='text-xs font-extrabold text-purple-600 mb-1 text-center'>× {base}</p>
                {[1,2,3,4,5,6,7,8,9,10].map((n) => (
                  <p key={n} className='text-xs text-gray-700 text-center'>
                    {n} × {base} = <b>{n * base}</b>
                  </p>
                ))}
              </KangurLessonCallout>
            ))}
          </div>
        </div>
      ),
    },
  ],
  tabela45: [
    {
      title: 'Tabliczka mnozenia × 4 i × 5',
      content: (
        <div className='flex flex-col gap-2 w-full'>
          <div className='grid grid-cols-2 gap-2'>
            {[4, 5].map((base) => (
              <KangurLessonCallout key={base} accent='indigo' className='rounded-xl' padding='sm'>
                <p className='text-xs font-extrabold text-indigo-600 mb-1 text-center'>× {base}</p>
                {[1,2,3,4,5,6,7,8,9,10].map((n) => (
                  <p key={n} className='text-xs text-gray-700 text-center'>
                    {n} × {base} = <b>{n * base}</b>
                  </p>
                ))}
              </KangurLessonCallout>
            ))}
          </div>
        </div>
      ),
    },
  ],
  triki: [
    {
      title: 'Triki do zapamietania',
      content: (
        <div className='flex flex-col items-center gap-3'>
          <KangurLessonCallout accent='amber' className='max-w-xs'>
            <ul className='text-gray-700 space-y-2 text-sm'>
              <li>✖️ × 1 = ta sama liczba: <b>7×1=7</b></li>
              <li>✖️ × 2 = podwojnie: <b>6×2=12</b></li>
              <li>✖️ × 5 = konczy sie na 0 lub 5: <b>7×5=35</b></li>
              <li>✖️ × 10 = dodaj zero: <b>8×10=80</b></li>
              <li>✅ Kolejnosc nie ma znaczenia: <b>3×4=4×3</b></li>
            </ul>
          </KangurLessonCallout>
        </div>
      ),
    },
  ],
};

export const HUB_SECTIONS = [
  { id: 'intro', emoji: '🍬', title: 'Co to mnozenie?', description: 'Mnozenie jako powtarzane dodawanie' },
  { id: 'tabela23', emoji: '📋', title: 'Tabliczka × 2 i × 3', description: 'Tabliczka mnozenia dla 2 i 3' },
  { id: 'tabela45', emoji: '📋', title: 'Tabliczka × 4 i × 5', description: 'Tabliczka mnozenia dla 4 i 5' },
  { id: 'triki', emoji: '🧠', title: 'Triki mnozenia', description: 'Szybkie zasady do zapamietania' },
  { id: 'game_array', emoji: '✨', title: 'Gra z grupami', description: 'Zbieraj grupy kropcek — odkryj mnozenie!', isGame: true },
  { id: 'game_quiz', emoji: '📝', title: 'Quiz tabliczki', description: 'Sprawdz tabliczkę — 8 pytan', isGame: true },
];

export default function MultiplicationLesson({ onBack }: MultiplicationLessonProps): React.JSX.Element {
  const [activeSection, setActiveSection] = useState<SectionId | null>(null);

  if (activeSection === 'game_array') {
    return (
      <div className='flex flex-col items-center gap-4 w-full max-w-sm'>
        <h2 className='text-2xl font-extrabold text-purple-600'>✨ Gra z grupami!</h2>
        <MultiplicationArrayGame onFinish={() => setActiveSection(null)} />
      </div>
    );
  }

  if (activeSection === 'game_quiz') {
    return (
      <div className='flex flex-col items-center gap-4 w-full max-w-sm'>
        <h2 className='text-2xl font-extrabold text-purple-600'>📝 Quiz mnozenia!</h2>
        <MultiplicationGame onFinish={() => setActiveSection(null)} />
      </div>
    );
  }

  if (activeSection) {
    return (
      <LessonSlideSection
        slides={SLIDES[activeSection]}
        onBack={() => setActiveSection(null)}
        dotActiveClass='bg-purple-500'
        dotDoneClass='bg-purple-300'
        gradientClass='from-purple-500 to-indigo-500'
      />
    );
  }

  return (
    <LessonHub
      lessonEmoji='✖️'
      lessonTitle='Mnozenie'
      gradientClass='from-purple-500 to-indigo-500'
      sections={HUB_SECTIONS}
      onSelect={(id) => setActiveSection(id as SectionId)}
      onBack={onBack}
    />
  );
}
