import { useState } from 'react';

import LessonHub from '@/features/kangur/ui/components/LessonHub';
import LessonSlideSection, {
  type LessonSlide,
} from '@/features/kangur/ui/components/LessonSlideSection';
import {
  KangurLessonCallout,
  KangurLessonCaption,
  KangurLessonInset,
  KangurLessonLead,
  KangurLessonStack,
} from '@/features/kangur/ui/design/lesson-primitives';
import { useLessonHubProgress } from '@/features/kangur/ui/hooks/useLessonHubProgress';

type SectionId = 'intro' | 'diagram' | 'intruz' | 'podsumowanie';

export const SLIDES: Record<SectionId, LessonSlide[]> = {
  intro: [
    {
      title: 'Co to jest klasyfikacja?',
      content: (
        <KangurLessonStack>
          <KangurLessonLead>
            Klasyfikacja to układanie rzeczy w grupy według wspólnej cechy. To podstawa porzadku w
            mysleniu i w zyciu!
          </KangurLessonLead>
          <KangurLessonCallout
            accent='teal'
            className='w-full text-sm [color:var(--kangur-page-muted-text)]'
          >
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
        </KangurLessonStack>
      ),
    },
    {
      title: 'Grupowanie według cech',
      content: (
        <KangurLessonStack>
          <KangurLessonLead>
            Patrz na wszystkie cechy i wybierz te, która jest wspólna dla całej grupy.
          </KangurLessonLead>
          <div className='grid w-full grid-cols-1 gap-3 min-[360px]:grid-cols-2'>
            <KangurLessonCallout accent='emerald' className='text-center' padding='sm'>
              <p className='font-bold text-green-700 text-xs mb-1'>Zwierzeta latajace</p>
              <p className='text-2xl'>🦅 🦆 🐝 🦋</p>
              <KangurLessonCaption className='mt-1'>
                Cecha: maja skrzydła
              </KangurLessonCaption>
            </KangurLessonCallout>
            <KangurLessonCallout accent='sky' className='text-center' padding='sm'>
              <p className='font-bold text-blue-700 text-xs mb-1'>Zwierzeta wodne</p>
              <p className='text-2xl'>🐟 🐬 🦈 🐙</p>
              <KangurLessonCaption className='mt-1'>
                Cecha: zyja w wodzie
              </KangurLessonCaption>
            </KangurLessonCallout>
            <KangurLessonCallout accent='amber' className='text-center' padding='sm'>
              <p className='font-bold text-orange-700 text-xs mb-1'>Liczby parzyste</p>
              <p className='text-2xl font-extrabold text-orange-600'>2 4 6 8</p>
              <KangurLessonCaption className='mt-1'>
                Cecha: dziela sie przez 2
              </KangurLessonCaption>
            </KangurLessonCallout>
            <KangurLessonCallout accent='rose' className='text-center' padding='sm'>
              <p className='font-bold text-rose-700 text-xs mb-1'>Liczby nieparzyste</p>
              <p className='text-2xl font-extrabold text-rose-600'>1 3 5 7</p>
              <KangurLessonCaption className='mt-1'>
                Cecha: nie dziela sie przez 2
              </KangurLessonCaption>
            </KangurLessonCallout>
          </div>
        </KangurLessonStack>
      ),
    },
  ],
  diagram: [
    {
      title: 'Wiele cech naraz',
      content: (
        <KangurLessonStack>
          <KangurLessonLead>
            Czasem trzeba wziac pod uwage dwie cechy jednoczesnie. To trudniejsze, ale daje
            precyzyjniejszy podział.
          </KangurLessonLead>
          <KangurLessonCallout accent='teal' className='w-full'>
            <p className='text-sm font-semibold text-teal-700 mb-3 text-center'>
              Figury: duze/małe × czerwone/niebieskie
            </p>
            <div className='grid grid-cols-1 gap-2 text-center text-sm min-[360px]:grid-cols-2'>
              {[
                ['Duze czerwone', '🔴🔴'],
                ['Duze niebieskie', '🔵🔵'],
                ['Małe czerwone', '🔴'],
                ['Małe niebieskie', '🔵'],
              ].map(([label, icon]) => (
                <KangurLessonInset key={label} accent='teal' padding='sm'>
                  <p className='text-xs [color:var(--kangur-page-muted-text)]'>{label}</p>
                  <p className='text-2xl'>{icon}</p>
                </KangurLessonInset>
              ))}
            </div>
            <KangurLessonCaption className='mt-2'>
              2 cechy × 2 wartosci = 4 rózne grupy
            </KangurLessonCaption>
          </KangurLessonCallout>
        </KangurLessonStack>
      ),
    },
    {
      title: 'Diagram Venna',
      content: (
        <KangurLessonStack>
          <KangurLessonLead>
            Diagram Venna pokazuje, co nalezy do jednej grupy, do drugiej, lub do obu jednoczesnie —
            to czesc wspólna (przeciecie).
          </KangurLessonLead>
          <KangurLessonCallout accent='sky' className='w-full'>
            <KangurLessonCaption className='mb-3'>
              Kocha sport vs. kocha muzyke
            </KangurLessonCaption>
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
        </KangurLessonStack>
      ),
    },
  ],
  intruz: [
    {
      title: 'Znajdz intruza — poziom 1',
      content: (
        <KangurLessonStack>
          <KangurLessonLead>
            Jeden element nie pasuje do grupy. Znajdz go i wyjasnij, dlaczego wyłamuje sie z reguły.
          </KangurLessonLead>
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
        </KangurLessonStack>
      ),
    },
    {
      title: 'Znajdz intruza — poziom 2',
      content: (
        <KangurLessonStack>
          <KangurLessonLead>
            Trudniejsze zagadki — intruz moze byc ukryty pod nieoczywista cecha.
          </KangurLessonLead>
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
                <p className='mb-1 text-lg font-bold [color:var(--kangur-page-text)]'>{items}</p>
                <p className='text-amber-700 font-bold text-sm mt-1'>{answer}</p>
              </KangurLessonCallout>
            ))}
          </div>
        </KangurLessonStack>
      ),
    },
  ],
  podsumowanie: [
    {
      title: 'Podsumowanie',
      content: (
        <KangurLessonStack>
          <KangurLessonCallout accent='amber' className='w-full'>
            <ul className='space-y-2 text-sm [color:var(--kangur-page-text)]'>
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
        </KangurLessonStack>
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
  const { markSectionOpened, markSectionViewedCount, sectionProgress } =
    useLessonHubProgress(SLIDES);

  if (activeSection) {
    return (
      <LessonSlideSection
        slides={SLIDES[activeSection]}
        sectionHeader={HUB_SECTIONS.find((section) => section.id === activeSection) ?? null}
        onBack={() => setActiveSection(null)}
        onProgressChange={(viewedCount) => markSectionViewedCount(activeSection, viewedCount)}
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
      progressDotClassName='bg-teal-300'
      sections={HUB_SECTIONS.map((section) => ({
        ...section,
        progress: sectionProgress[section.id as SectionId],
      }))}
      onSelect={(id) => {
        markSectionOpened(id as SectionId);
        setActiveSection(id as SectionId);
      }}
    />
  );
}
