import { useState } from 'react';

import LessonHub from '@/features/kangur/ui/components/LessonHub';
import LessonSlideSection, {
  type LessonSlide,
} from '@/features/kangur/ui/components/LessonSlideSection';
import { KangurLessonCallout } from '@/features/kangur/ui/design/lesson-primitives';

type LogicalPatternsLessonProps = { onBack: () => void };
type SectionId = 'intro' | 'ciagi_arytm' | 'ciagi_geom' | 'strategie';

export const SLIDES: Record<SectionId, LessonSlide[]> = {
  intro: [
    {
      title: 'Co to jest wzorzec?',
      content: (
        <div className='flex flex-col items-center gap-4'>
          <p className='text-gray-700 text-center'>
            Wzorzec to układ, który powtarza sie według pewnej reguły. Gdy ja znajdziesz — mozesz przewidziec, co bedzie dalej!
          </p>
          <KangurLessonCallout accent='violet' className='w-full text-sm text-gray-600'>
            <p className='font-semibold text-violet-700 mb-2'>Wzorce sa wszedzie:</p>
            <ul className='space-y-1'>
              <li>🔴🔵🔴🔵 — naprzemienne kolory</li>
              <li>1, 2, 3, 4, 5 — kazda liczba o 1 wieksza</li>
              <li>♦️🔷♦️🔷 — powtarzajacy sie kształt</li>
              <li>pon., wt., sr., czw. — dni tygodnia</li>
            </ul>
          </KangurLessonCallout>
        </div>
      ),
    },
    {
      title: 'Wzorce kolorów i kształtów',
      content: (
        <div className='flex flex-col items-center gap-4'>
          <p className='text-gray-700 text-center'>
            Wzorce moga uzywac kolorów, kształtów lub obu naraz. Patrz na powtarzajaca sie grupe — to jest jednostka wzorca.
          </p>
          <div className='flex flex-col gap-3 w-full'>
            {[
              { label: 'Wzorzec AB', seq: '🔴 🔵 🔴 🔵 🔴 ❓', answer: '🔵' },
              { label: 'Wzorzec AAB', seq: '⭐ ⭐ 🌙 ⭐ ⭐ ❓', answer: '🌙' },
              { label: 'Wzorzec ABBC', seq: '🟥 🟦 🟦 🟩 🟥 🟦 ❓', answer: '🟦' },
            ].map(({ label, seq, answer }) => (
              <KangurLessonCallout
                key={label}
                accent='slate'
                className='border-violet-100/90 text-center'
                padding='sm'
              >
                <p className='text-xs text-gray-400 mb-1'>{label}</p>
                <p className='text-2xl tracking-widest'>{seq}</p>
                <p className='text-violet-600 font-bold text-sm mt-1'>Odpowiedz: {answer}</p>
              </KangurLessonCallout>
            ))}
          </div>
        </div>
      ),
    },
  ],
  ciagi_arytm: [
    {
      title: 'Ciagi liczbowe — dodawanie',
      content: (
        <div className='flex flex-col items-center gap-4'>
          <p className='text-gray-700 text-center'>
            W ciagu liczbowym kazda liczba powstaje z poprzedniej według tej samej zasady. Najczesciej dodajemy ta sama wartosc.
          </p>
          <div className='flex flex-col gap-3 w-full'>
            {[
              { hint: '+2 co krok', seq: '2, 4, 6, 8, 10, ❓', answer: '12' },
              { hint: '+5 co krok', seq: '5, 10, 15, 20, ❓', answer: '25' },
              { hint: '+10, +9, +8... (malejacy krok)', seq: '1, 11, 20, 28, ❓', answer: '35 (krok maleje o 1)' },
            ].map(({ hint, seq, answer }) => (
              <KangurLessonCallout key={hint} accent='violet' padding='sm'>
                <p className='text-xs text-gray-500 mb-1'>{hint}</p>
                <p className='text-lg font-extrabold text-violet-700'>{seq}</p>
                <p className='text-sm text-gray-500 mt-1'>Odpowiedz: <b>{answer}</b></p>
              </KangurLessonCallout>
            ))}
          </div>
        </div>
      ),
    },
  ],
  ciagi_geom: [
    {
      title: 'Ciagi liczbowe — mnozenie i Fibonacci',
      content: (
        <div className='flex flex-col items-center gap-4'>
          <p className='text-gray-700 text-center'>
            Gdy kazda liczba jest wielokrotnoscia poprzedniej, ciag rosnie bardzo szybko! To ciag geometryczny.
          </p>
          <div className='flex flex-col gap-3 w-full'>
            {[
              { hint: '×2 co krok', seq: '1, 2, 4, 8, 16, ❓', answer: '32' },
              { hint: '×3 co krok', seq: '2, 6, 18, 54, ❓', answer: '162' },
              { hint: 'Ciag Fibonacciego (a+b=c)', seq: '1, 1, 2, 3, 5, 8, ❓', answer: '13 (5+8=13)' },
            ].map(({ hint, seq, answer }) => (
              <KangurLessonCallout key={hint} accent='violet' padding='sm'>
                <p className='text-xs text-gray-500 mb-1'>{hint}</p>
                <p className='text-lg font-extrabold text-purple-700'>{seq}</p>
                <p className='text-sm text-gray-500 mt-1'>Odpowiedz: <b>{answer}</b></p>
              </KangurLessonCallout>
            ))}
          </div>
        </div>
      ),
    },
  ],
  strategie: [
    {
      title: 'Jak szukac reguły?',
      content: (
        <div className='flex flex-col items-center gap-4'>
          <KangurLessonCallout accent='slate' className='w-full border-violet-200/85'>
            <ol className='text-gray-700 space-y-3 text-sm list-decimal list-inside'>
              <li><b>Policz elementy jednostki</b> — jak wiele przed powtórzeniem?</li>
              <li><b>Sprawdz róznicę</b> — odejmij sasiednie liczby. Czy jest stała?</li>
              <li><b>Sprawdz iloraz</b> — podziel sasiednie liczby. Czy jest stały?</li>
              <li><b>Szukaj relacji dwóch poprzednich</b> — jak Fibonacci.</li>
              <li><b>Zweryfikuj regułe</b> — sprawdz ja na wszystkich znanych elementach!</li>
            </ol>
          </KangurLessonCallout>
          <KangurLessonCallout accent='violet' className='w-full text-center' padding='sm'>
            <p className='text-sm text-gray-600'>Cwiczenie: <b>3, 6, 12, 24, ❓</b></p>
            <p className='text-violet-600 font-bold text-sm mt-1'>
              Iloraz: 2, 2, 2 — stały! Reguła: ×2 → <b>48</b>
            </p>
          </KangurLessonCallout>
        </div>
      ),
    },
    {
      title: 'Podsumowanie',
      content: (
        <div className='flex flex-col items-center gap-4'>
          <KangurLessonCallout accent='amber' className='w-full'>
            <ul className='text-gray-700 space-y-2 text-sm'>
              <li>🔁 <b>Wzorzec AB/AAB</b> — powtarzajaca sie jednostka</li>
              <li>➕ <b>Ciag arytmetyczny</b> — stała róznica miedzy elementami</li>
              <li>✖️ <b>Ciag geometryczny</b> — stały iloraz miedzy elementami</li>
              <li>🌀 <b>Fibonacci</b> — suma dwóch poprzednich</li>
              <li>🔍 <b>Strategia</b> — szukaj roznicy, ilorazu lub relacji</li>
            </ul>
          </KangurLessonCallout>
          <p className='text-violet-600 font-bold text-center'>
            Wzorce i ciagi to podstawa matematyki i informatyki!
          </p>
        </div>
      ),
    },
  ],
};

export const HUB_SECTIONS = [
  { id: 'intro', emoji: '🔢', title: 'Wzorce — wprowadzenie', description: 'Co to wzorzec? Kolory i kształty' },
  { id: 'ciagi_arytm', emoji: '➕', title: 'Ciagi arytmetyczne', description: 'Stała róznica co krok' },
  { id: 'ciagi_geom', emoji: '✖️', title: 'Ciagi geometryczne i Fibonacci', description: 'Mnozenie i specjalne ciagi' },
  { id: 'strategie', emoji: '🔍', title: 'Jak szukac reguły?', description: 'Strategia + podsumowanie' },
];

export default function LogicalPatternsLesson({ onBack }: LogicalPatternsLessonProps): React.JSX.Element {
  const [activeSection, setActiveSection] = useState<SectionId | null>(null);

  if (activeSection) {
    return (
      <LessonSlideSection
        slides={SLIDES[activeSection]}
        onBack={() => setActiveSection(null)}
        dotActiveClass='bg-violet-500'
        dotDoneClass='bg-violet-300'
        gradientClass='from-violet-500 to-purple-600'
      />
    );
  }

  return (
    <LessonHub
      lessonEmoji='🔢'
      lessonTitle='Wzorce i ciagi'
      gradientClass='from-violet-500 to-purple-600'
      sections={HUB_SECTIONS}
      onSelect={(id) => setActiveSection(id as SectionId)}
      onBack={onBack}
    />
  );
}
