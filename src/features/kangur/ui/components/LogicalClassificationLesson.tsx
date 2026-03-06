import { useState } from 'react';

import LessonHub from '@/features/kangur/ui/components/LessonHub';
import LessonSlideSection, {
  type LessonSlide,
} from '@/features/kangur/ui/components/LessonSlideSection';

type LogicalClassificationLessonProps = { onBack: () => void };
type SectionId = 'intro' | 'diagram' | 'intruz' | 'podsumowanie';

const SLIDES: Record<SectionId, LessonSlide[]> = {
  intro: [
    {
      title: 'Co to jest klasyfikacja?',
      content: (
        <div className='flex flex-col items-center gap-4'>
          <p className='text-gray-700 text-center'>
            Klasyfikacja to układanie rzeczy w grupy według wspólnej cechy. To podstawa porzadku w mysleniu i w zyciu!
          </p>
          <div className='bg-teal-50 border border-teal-200 rounded-2xl p-4 w-full text-sm text-gray-600'>
            <p className='font-semibold text-teal-700 mb-2'>Klasyfikujemy według:</p>
            <ul className='space-y-1'>
              <li>🎨 <b>Koloru</b> — czerwone vs. niebieskie</li>
              <li>🔷 <b>Kształtu</b> — okrągłe vs. kwadratowe</li>
              <li>📏 <b>Rozmiaru</b> — duze vs. małe</li>
              <li>📂 <b>Kategorii</b> — owoce vs. warzywa</li>
              <li>🔢 <b>Liczby</b> — parzyste vs. nieparzyste</li>
            </ul>
          </div>
        </div>
      ),
    },
    {
      title: 'Grupowanie według cech',
      content: (
        <div className='flex flex-col items-center gap-4'>
          <p className='text-gray-700 text-center'>
            Patrz na wszystkie cechy i wybierz te, która jest wspólna dla całej grupy.
          </p>
          <div className='grid grid-cols-2 gap-3 w-full'>
            <div className='bg-green-50 border border-green-200 rounded-2xl p-3 text-center'>
              <p className='font-bold text-green-700 text-xs mb-1'>Zwierzeta latajace</p>
              <p className='text-2xl'>🦅 🦆 🐝 🦋</p>
              <p className='text-xs text-gray-500 mt-1'>Cecha: maja skrzydła</p>
            </div>
            <div className='bg-blue-50 border border-blue-200 rounded-2xl p-3 text-center'>
              <p className='font-bold text-blue-700 text-xs mb-1'>Zwierzeta wodne</p>
              <p className='text-2xl'>🐟 🐬 🦈 🐙</p>
              <p className='text-xs text-gray-500 mt-1'>Cecha: zyja w wodzie</p>
            </div>
            <div className='bg-orange-50 border border-orange-200 rounded-2xl p-3 text-center'>
              <p className='font-bold text-orange-700 text-xs mb-1'>Liczby parzyste</p>
              <p className='text-2xl font-extrabold text-orange-600'>2 4 6 8</p>
              <p className='text-xs text-gray-500 mt-1'>Cecha: dziela sie przez 2</p>
            </div>
            <div className='bg-rose-50 border border-rose-200 rounded-2xl p-3 text-center'>
              <p className='font-bold text-rose-700 text-xs mb-1'>Liczby nieparzyste</p>
              <p className='text-2xl font-extrabold text-rose-600'>1 3 5 7</p>
              <p className='text-xs text-gray-500 mt-1'>Cecha: nie dziela sie przez 2</p>
            </div>
          </div>
        </div>
      ),
    },
  ],
  diagram: [
    {
      title: 'Wiele cech naraz',
      content: (
        <div className='flex flex-col items-center gap-4'>
          <p className='text-gray-700 text-center'>
            Czasem trzeba wziac pod uwage dwie cechy jednoczesnie. To trudniejsze, ale daje precyzyjniejszy podział.
          </p>
          <div className='bg-teal-50 border border-teal-200 rounded-2xl p-4 w-full'>
            <p className='text-sm font-semibold text-teal-700 mb-3 text-center'>
              Figury: duze/małe × czerwone/niebieskie
            </p>
            <div className='grid grid-cols-2 gap-2 text-center text-sm'>
              {[
                ['Duze czerwone', '🔴🔴'],
                ['Duze niebieskie', '🔵🔵'],
                ['Małe czerwone', '🔴'],
                ['Małe niebieskie', '🔵'],
              ].map(([label, icon]) => (
                <div key={label} className='bg-white rounded-xl p-2 border border-teal-100'>
                  <p className='text-xs text-gray-400'>{label}</p>
                  <p className='text-2xl'>{icon}</p>
                </div>
              ))}
            </div>
            <p className='text-xs text-gray-500 mt-2 text-center'>2 cechy × 2 wartosci = 4 rózne grupy</p>
          </div>
        </div>
      ),
    },
    {
      title: 'Diagram Venna',
      content: (
        <div className='flex flex-col items-center gap-4'>
          <p className='text-gray-700 text-center'>
            Diagram Venna pokazuje, co nalezy do jednej grupy, do drugiej, lub do obu jednoczesnie — to czesc wspólna (przeciecie).
          </p>
          <div className='bg-cyan-50 border border-cyan-200 rounded-2xl p-4 w-full'>
            <p className='text-xs text-gray-500 text-center mb-3'>Kocha sport vs. kocha muzyke</p>
            <div className='flex justify-center items-center gap-0'>
              <div className='w-32 h-24 rounded-full bg-sky-200/70 border-2 border-sky-400 flex flex-col items-start justify-center pl-3'>
                <p className='text-xs font-bold text-sky-700'>Tylko sport</p>
                <p className='text-lg'>⚽ 🏀</p>
              </div>
              <div className='w-16 h-24 rounded-none bg-teal-200/80 border-y-2 border-teal-400 flex flex-col items-center justify-center -mx-4 z-10'>
                <p className='text-xs font-bold text-teal-700 text-center'>Oba!</p>
                <p className='text-lg'>🤸</p>
              </div>
              <div className='w-32 h-24 rounded-full bg-yellow-200/70 border-2 border-yellow-400 flex flex-col items-end justify-center pr-3'>
                <p className='text-xs font-bold text-yellow-700'>Tylko muzyka</p>
                <p className='text-lg'>🎸 🎹</p>
              </div>
            </div>
          </div>
        </div>
      ),
    },
  ],
  intruz: [
    {
      title: 'Znajdz intruza — poziom 1',
      content: (
        <div className='flex flex-col items-center gap-4'>
          <p className='text-gray-700 text-center'>
            Jeden element nie pasuje do grupy. Znajdz go i wyjasnij, dlaczego wyłamuje sie z reguły.
          </p>
          <div className='flex flex-col gap-3 w-full'>
            {[
              { items: '🍎 🍌 🥕 🍇 🍓', answer: '🥕 — to warzywo, reszta to owoce' },
              { items: '2, 4, 7, 8, 10', answer: '7 — tylko ona jest nieparzysta' },
              { items: '🐦 🦅 🐝 🐈 🦋', answer: '🐈 — kot nie lata, reszta ma skrzydła' },
            ].map(({ items, answer }) => (
              <div key={items} className='bg-rose-50 border border-rose-200 rounded-2xl p-3 text-center'>
                <p className='text-2xl mb-1'>{items}</p>
                <p className='text-rose-600 font-bold text-sm mt-1'>{answer}</p>
              </div>
            ))}
          </div>
        </div>
      ),
    },
    {
      title: 'Znajdz intruza — poziom 2',
      content: (
        <div className='flex flex-col items-center gap-4'>
          <p className='text-gray-700 text-center'>
            Trudniejsze zagadki — intruz moze byc ukryty pod nieoczywista cecha.
          </p>
          <div className='flex flex-col gap-3 w-full'>
            {[
              { items: '3, 6, 9, 12, 16', answer: '16 — nie jest wielokrotnoscia 3' },
              { items: '🌍 🌙 ☀️ ⭐ 🪐', answer: '🌙 — tylko ksiezyc nie swnieci własnym swiatłem' },
              { items: 'kwadrat, trójkat, koło, romb', answer: 'Koło — jedyna figura bez katów i prostych boków' },
            ].map(({ items, answer }) => (
              <div key={items} className='bg-amber-50 border border-amber-200 rounded-2xl p-3 text-center'>
                <p className='text-lg font-bold text-gray-800 mb-1'>{items}</p>
                <p className='text-amber-700 font-bold text-sm mt-1'>{answer}</p>
              </div>
            ))}
          </div>
        </div>
      ),
    },
  ],
  podsumowanie: [
    {
      title: 'Podsumowanie',
      content: (
        <div className='flex flex-col items-center gap-4'>
          <div className='bg-yellow-50 border border-yellow-200 rounded-2xl p-4 w-full'>
            <ul className='text-gray-700 space-y-2 text-sm'>
              <li>🗂️ <b>Klasyfikacja</b> — grupuj według jednej wspólnej cechy</li>
              <li>🔀 <b>Wiele cech</b> — precyzyjny podział wymaga kilku kryteriów</li>
              <li>🔵🟡 <b>Diagram Venna</b> — czesc wspólna to przeciecie dwóch zbiorów</li>
              <li>🔎 <b>Intruz poz. 1</b> — oczywista cecha łamana przez jeden element</li>
              <li>🧩 <b>Intruz poz. 2</b> — nieoczywiste cechy ukryte głebiej</li>
            </ul>
          </div>
          <p className='text-teal-600 font-bold text-center'>
            Klasyfikacja to klucz do porzadku w swiecie i w głowie!
          </p>
        </div>
      ),
    },
  ],
};

const HUB_SECTIONS = [
  { id: 'intro', emoji: '📦', title: 'Klasyfikacja — wstep', description: 'Co to klasyfikacja? Grupowanie według cech' },
  { id: 'diagram', emoji: '🔵🟡', title: 'Wiele cech i diagram Venna', description: 'Wielokryteriowe grupowanie i przeciecia zbiorów' },
  { id: 'intruz', emoji: '🔎', title: 'Znajdz intruza', description: 'Poziom 1 i poziom 2 — co nie pasuje?' },
  { id: 'podsumowanie', emoji: '📋', title: 'Podsumowanie', description: 'Wszystkie zasady razem' },
];

export default function LogicalClassificationLesson({ onBack }: LogicalClassificationLessonProps): React.JSX.Element {
  const [activeSection, setActiveSection] = useState<SectionId | null>(null);

  if (activeSection) {
    return (
      <LessonSlideSection
        slides={SLIDES[activeSection]}
        onBack={() => setActiveSection(null)}
        dotActiveClass='bg-teal-500'
        dotDoneClass='bg-teal-300'
        gradientClass='from-teal-500 to-cyan-500'
      />
    );
  }

  return (
    <LessonHub
      lessonEmoji='📦'
      lessonTitle='Klasyfikacja'
      gradientClass='from-teal-500 to-cyan-500'
      sections={HUB_SECTIONS}
      onSelect={(id) => setActiveSection(id as SectionId)}
      onBack={onBack}
    />
  );
}
