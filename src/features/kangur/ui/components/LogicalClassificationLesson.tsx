import { useState } from 'react';

import LessonHub from '@/features/kangur/ui/components/LessonHub';
import LessonSlideSection, {
  type LessonSlide,
} from '@/features/kangur/ui/components/LessonSlideSection';
import {
  KangurLessonCallout,
  KangurLessonInset,
} from '@/features/kangur/ui/design/lesson-primitives';

type SectionId = 'intro' | 'diagram' | 'intruz' | 'podsumowanie';

export const SLIDES: Record<SectionId, LessonSlide[]> = {
  intro: [
    {
      title: 'Co to jest klasyfikacja?',
      content: (
        <div className='flex flex-col items-center gap-4'>
          <p className='text-center text-slate-700'>
            Klasyfikacja to układanie rzeczy w grupy według wspólnej cechy. To podstawa porzadku w
            mysleniu i w zyciu!
          </p>
          <KangurLessonCallout accent='teal' className='w-full text-sm text-slate-600'>
            <p className='font-semibold text-teal-700 mb-2'>Klasyfikujemy według:</p>
            <ul className='space-y-1'>
              <li>
                🎨 <b>Koloru</b> — czerwone vs. niebieskie
              </li>
              <li>
                🔷 <b>Kształtu</b> — okrągłe vs. kwadratowe
              </li>
              <li>
                📏 <b>Rozmiaru</b> — duze vs. małe
              </li>
              <li>
                📂 <b>Kategorii</b> — owoce vs. warzywa
              </li>
              <li>
                🔢 <b>Liczby</b> — parzyste vs. nieparzyste
              </li>
            </ul>
          </KangurLessonCallout>
        </div>
      ),
    },
    {
      title: 'Grupowanie według cech',
      content: (
        <div className='flex flex-col items-center gap-4'>
          <p className='text-center text-slate-700'>
            Patrz na wszystkie cechy i wybierz te, która jest wspólna dla całej grupy.
          </p>
          <div className='grid grid-cols-2 gap-3 w-full'>
            <KangurLessonCallout accent='emerald' className='text-center' padding='sm'>
              <p className='font-bold text-green-700 text-xs mb-1'>Zwierzeta latajace</p>
              <p className='text-2xl'>🦅 🦆 🐝 🦋</p>
              <p className='mt-1 text-xs text-slate-500'>Cecha: maja skrzydła</p>
            </KangurLessonCallout>
            <KangurLessonCallout accent='sky' className='text-center' padding='sm'>
              <p className='font-bold text-blue-700 text-xs mb-1'>Zwierzeta wodne</p>
              <p className='text-2xl'>🐟 🐬 🦈 🐙</p>
              <p className='mt-1 text-xs text-slate-500'>Cecha: zyja w wodzie</p>
            </KangurLessonCallout>
            <KangurLessonCallout accent='amber' className='text-center' padding='sm'>
              <p className='font-bold text-orange-700 text-xs mb-1'>Liczby parzyste</p>
              <p className='text-2xl font-extrabold text-orange-600'>2 4 6 8</p>
              <p className='mt-1 text-xs text-slate-500'>Cecha: dziela sie przez 2</p>
            </KangurLessonCallout>
            <KangurLessonCallout accent='rose' className='text-center' padding='sm'>
              <p className='font-bold text-rose-700 text-xs mb-1'>Liczby nieparzyste</p>
              <p className='text-2xl font-extrabold text-rose-600'>1 3 5 7</p>
              <p className='mt-1 text-xs text-slate-500'>Cecha: nie dziela sie przez 2</p>
            </KangurLessonCallout>
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
          <p className='text-center text-slate-700'>
            Czasem trzeba wziac pod uwage dwie cechy jednoczesnie. To trudniejsze, ale daje
            precyzyjniejszy podział.
          </p>
          <KangurLessonCallout accent='teal' className='w-full'>
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
                <KangurLessonInset key={label} accent='teal' padding='sm'>
                  <p className='text-xs text-slate-400'>{label}</p>
                  <p className='text-2xl'>{icon}</p>
                </KangurLessonInset>
              ))}
            </div>
            <p className='mt-2 text-center text-xs text-slate-500'>
              2 cechy × 2 wartosci = 4 rózne grupy
            </p>
          </KangurLessonCallout>
        </div>
      ),
    },
    {
      title: 'Diagram Venna',
      content: (
        <div className='flex flex-col items-center gap-4'>
          <p className='text-center text-slate-700'>
            Diagram Venna pokazuje, co nalezy do jednej grupy, do drugiej, lub do obu jednoczesnie —
            to czesc wspólna (przeciecie).
          </p>
          <KangurLessonCallout accent='sky' className='w-full'>
            <p className='mb-3 text-center text-xs text-slate-500'>Kocha sport vs. kocha muzyke</p>
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
          </KangurLessonCallout>
        </div>
      ),
    },
  ],
  intruz: [
    {
      title: 'Znajdz intruza — poziom 1',
      content: (
        <div className='flex flex-col items-center gap-4'>
          <p className='text-center text-slate-700'>
            Jeden element nie pasuje do grupy. Znajdz go i wyjasnij, dlaczego wyłamuje sie z reguły.
          </p>
          <div className='flex flex-col gap-3 w-full'>
            {[
              { items: '🍎 🍌 🥕 🍇 🍓', answer: '🥕 — to warzywo, reszta to owoce' },
              { items: '2, 4, 7, 8, 10', answer: '7 — tylko ona jest nieparzysta' },
              { items: '🐦 🦅 🐝 🐈 🦋', answer: '🐈 — kot nie lata, reszta ma skrzydła' },
            ].map(({ items, answer }) => (
              <KangurLessonCallout key={items} accent='rose' className='text-center' padding='sm'>
                <p className='text-2xl mb-1'>{items}</p>
                <p className='text-rose-600 font-bold text-sm mt-1'>{answer}</p>
              </KangurLessonCallout>
            ))}
          </div>
        </div>
      ),
    },
    {
      title: 'Znajdz intruza — poziom 2',
      content: (
        <div className='flex flex-col items-center gap-4'>
          <p className='text-center text-slate-700'>
            Trudniejsze zagadki — intruz moze byc ukryty pod nieoczywista cecha.
          </p>
          <div className='flex flex-col gap-3 w-full'>
            {[
              { items: '3, 6, 9, 12, 16', answer: '16 — nie jest wielokrotnoscia 3' },
              {
                items: '🌍 🌙 ☀️ ⭐ 🪐',
                answer: '🌙 — tylko ksiezyc nie swnieci własnym swiatłem',
              },
              {
                items: 'kwadrat, trójkat, koło, romb',
                answer: 'Koło — jedyna figura bez katów i prostych boków',
              },
            ].map(({ items, answer }) => (
              <KangurLessonCallout key={items} accent='amber' className='text-center' padding='sm'>
                <p className='mb-1 text-lg font-bold text-slate-800'>{items}</p>
                <p className='text-amber-700 font-bold text-sm mt-1'>{answer}</p>
              </KangurLessonCallout>
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
          <KangurLessonCallout accent='amber' className='w-full'>
            <ul className='space-y-2 text-sm text-slate-700'>
              <li>
                🗂️ <b>Klasyfikacja</b> — grupuj według jednej wspólnej cechy
              </li>
              <li>
                🔀 <b>Wiele cech</b> — precyzyjny podział wymaga kilku kryteriów
              </li>
              <li>
                🔵🟡 <b>Diagram Venna</b> — czesc wspólna to przeciecie dwóch zbiorów
              </li>
              <li>
                🔎 <b>Intruz poz. 1</b> — oczywista cecha łamana przez jeden element
              </li>
              <li>
                🧩 <b>Intruz poz. 2</b> — nieoczywiste cechy ukryte głebiej
              </li>
            </ul>
          </KangurLessonCallout>
          <p className='text-teal-600 font-bold text-center'>
            Klasyfikacja to klucz do porzadku w swiecie i w głowie!
          </p>
        </div>
      ),
    },
  ],
};

export const HUB_SECTIONS = [
  {
    id: 'intro',
    emoji: '📦',
    title: 'Klasyfikacja — wstep',
    description: 'Co to klasyfikacja? Grupowanie według cech',
  },
  {
    id: 'diagram',
    emoji: '🔵🟡',
    title: 'Wiele cech i diagram Venna',
    description: 'Wielokryteriowe grupowanie i przeciecia zbiorów',
  },
  {
    id: 'intruz',
    emoji: '🔎',
    title: 'Znajdz intruza',
    description: 'Poziom 1 i poziom 2 — co nie pasuje?',
  },
  { id: 'podsumowanie', emoji: '📋', title: 'Podsumowanie', description: 'Wszystkie zasady razem' },
];

export default function LogicalClassificationLesson(): React.JSX.Element {
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
    />
  );
}
