import { useState } from 'react';

import LessonHub from '@/features/kangur/ui/components/LessonHub';
import LessonSlideSection, {
  type LessonSlide,
} from '@/features/kangur/ui/components/LessonSlideSection';
import { KangurLessonCallout } from '@/features/kangur/ui/design/lesson-primitives';

type LogicalAnalogiesLessonProps = { onBack: () => void };
type SectionId = 'intro' | 'liczby_ksztalty' | 'relacje' | 'podsumowanie';

export const SLIDES: Record<SectionId, LessonSlide[]> = {
  intro: [
    {
      title: 'Co to jest analogia?',
      content: (
        <div className='flex flex-col items-center gap-4'>
          <p className='text-gray-700 text-center'>
            Analogia to ta sama relacja miedzy roznymi parami. Zamiast myslec o konkretnych rzeczach, szukasz <b>wzorca połaczenia</b>.
          </p>
          <KangurLessonCallout accent='rose' className='w-full text-sm'>
            <p className='font-semibold text-pink-700 mb-2'>Zapis analogii:</p>
            <p className='text-center text-lg font-bold text-gray-700'>A : B = C : D</p>
            <p className='text-center text-xs text-gray-500 mt-1'>„A do B tak jak C do D"</p>
            <KangurLessonCallout
              accent='slate'
              className='mt-2 rounded-xl border-pink-100/90 text-center'
              padding='sm'
            >
              <p className='font-bold text-pink-700'>Ptak : latac = ryba : ❓</p>
              <p className='text-gray-600 text-xs mt-1'>Relacja: stworzenie → sposób poruszania</p>
              <p className='text-pink-600 font-bold mt-1'>Odpowiedz: pływac 🐟</p>
            </KangurLessonCallout>
          </KangurLessonCallout>
        </div>
      ),
    },
    {
      title: 'Analogie słowne',
      content: (
        <div className='flex flex-col items-center gap-4'>
          <p className='text-gray-700 text-center'>
            Analogie słowne korzystaja z relacji miedzy słowami: kategoria, przeciwienstwo, czesc całosci, czynnosc i inne.
          </p>
          <div className='flex flex-col gap-2 w-full'>
            {[
              { pair: 'Pies : szczekac = kot : ❓', hint: 'Zwierze → wydawany dzwiek', answer: 'miauczec 🐈' },
              { pair: 'Goracy : zimny = dzien : ❓', hint: 'Antonim (przeciwienstwo)', answer: 'noc 🌙' },
              { pair: 'Palec : reka = lisc : ❓', hint: 'Czesc → całosc', answer: 'drzewo 🌳' },
              { pair: 'Nozyczki : ciecie = ołówek : ❓', hint: 'Narzedzie → jego funkcja', answer: 'pisanie ✏️' },
            ].map(({ pair, hint, answer }) => (
              <KangurLessonCallout key={pair} accent='rose' className='text-sm' padding='sm'>
                <p className='font-bold text-gray-800'>{pair}</p>
                <p className='text-xs text-gray-400 mt-0.5'>{hint}</p>
                <p className='text-pink-600 font-bold text-sm mt-1'>→ {answer}</p>
              </KangurLessonCallout>
            ))}
          </div>
        </div>
      ),
    },
  ],
  liczby_ksztalty: [
    {
      title: 'Analogie liczbowe',
      content: (
        <div className='flex flex-col items-center gap-4'>
          <p className='text-gray-700 text-center'>
            W analogiach liczbowych szukasz tej samej operacji matematycznej w obu parach.
          </p>
          <div className='flex flex-col gap-2 w-full'>
            {[
              { pair: '2 : 4 = 5 : ❓', hint: 'Relacja: ×2', answer: '10', workings: '2×2=4, 5×2=10' },
              { pair: '10 : 5 = 8 : ❓', hint: 'Relacja: ÷2', answer: '4', workings: '10÷2=5, 8÷2=4' },
              { pair: '3 : 9 = 4 : ❓', hint: 'Relacja: do kwadratu (×siebie)', answer: '16', workings: '3²=9, 4²=16' },
              { pair: '1 : 3 = 4 : ❓', hint: 'Relacja: ×3', answer: '12', workings: '1×3=3, 4×3=12' },
            ].map(({ pair, hint, answer, workings }) => (
              <KangurLessonCallout key={pair} accent='rose' className='text-sm' padding='sm'>
                <p className='font-bold text-gray-800 text-base'>{pair}</p>
                <p className='text-xs text-gray-400 mt-0.5'>{hint}</p>
                <p className='text-rose-600 font-bold mt-1'>→ {answer} <span className='font-normal text-gray-400'>({workings})</span></p>
              </KangurLessonCallout>
            ))}
          </div>
        </div>
      ),
    },
    {
      title: 'Analogie kształtów',
      content: (
        <div className='flex flex-col items-center gap-4'>
          <p className='text-gray-700 text-center'>
            Analogie kształtów zmieniaja rozmiar, orientacje, kolor lub liczbe elementów według tej samej reguły.
          </p>
          <div className='flex flex-col gap-3 w-full'>
            {[
              { rule: 'Reguła: obrót o 90° w prawo', seq: '➡️ : ⬇️ = ⬆️ : ➡️' },
              { rule: 'Reguła: dodaj jeden element', seq: '⭐ : ⭐⭐ = 🔵 : 🔵🔵' },
            ].map(({ rule, seq }) => (
              <KangurLessonCallout key={rule} accent='rose' className='text-center' padding='sm'>
                <p className='text-xs text-gray-500 mb-1'>{rule}</p>
                <div className='text-2xl'>{seq}</div>
              </KangurLessonCallout>
            ))}
          </div>
        </div>
      ),
    },
  ],
  relacje: [
    {
      title: 'Analogie czesc–całosc',
      content: (
        <div className='flex flex-col items-center gap-4'>
          <p className='text-gray-700 text-center'>
            Relacja czesc–całosc to jedna z najczestszych w analogiach.
          </p>
          <div className='flex flex-col gap-2 w-full'>
            {[
              { pair: 'Strona : ksiazka = cegła : ❓', answer: 'mur / budynek 🧱' },
              { pair: 'Nuta : melodia = litera : ❓', answer: 'słowo / zdanie 🔤' },
              { pair: 'Płatek : kwiat = piksel : ❓', answer: 'obraz / zdjecie 🖼️' },
              { pair: 'Kropla : ocean = ziarnko : ❓', answer: 'plaza / piasek 🏖️' },
            ].map(({ pair, answer }) => (
              <KangurLessonCallout key={pair} accent='rose' className='text-sm' padding='sm'>
                <p className='font-bold text-gray-800'>{pair}</p>
                <p className='text-rose-600 font-bold mt-1'>→ {answer}</p>
              </KangurLessonCallout>
            ))}
          </div>
        </div>
      ),
    },
    {
      title: 'Analogie przyczyna–skutek',
      content: (
        <div className='flex flex-col items-center gap-4'>
          <p className='text-gray-700 text-center'>
            Przyczyna powoduje skutek. Analogia przenosi te sama zaleznosc na inna pare.
          </p>
          <div className='flex flex-col gap-2 w-full'>
            {[
              { pair: 'Deszcz : mokra ziemia = słonce : ❓', answer: 'sucha ziemia / opalenizna ☀️' },
              { pair: 'Cwiczenie : silniejsze miesnie = czytanie : ❓', answer: 'wiecej wiedzy / madrosc 📚' },
              { pair: 'Zima : snieg = wiosna : ❓', answer: 'kwiaty / deszcz 🌸' },
            ].map(({ pair, answer }) => (
              <KangurLessonCallout key={pair} accent='rose' className='text-sm' padding='sm'>
                <p className='font-bold text-gray-800'>{pair}</p>
                <p className='text-pink-600 font-bold mt-1'>→ {answer}</p>
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
            <ul className='text-gray-700 space-y-2 text-sm'>
              <li>🔗 <b>Analogia</b> — A:B = C:D, ta sama relacja w nowej parze</li>
              <li>🗣️ <b>Słowne</b> — kategoria, antonim, czynnosc, cecha</li>
              <li>🔢 <b>Liczbowe</b> — +, −, ×, ÷, potega — szukaj operacji</li>
              <li>🔷 <b>Kształtów</b> — obrót, kolor, liczba, rozmiar</li>
              <li>🧩 <b>Czesc–całosc</b> — element → zbiór, do którego nalezy</li>
              <li>⚡ <b>Przyczyna–skutek</b> — co wywołuje co?</li>
            </ul>
          </KangurLessonCallout>
          <p className='text-pink-600 font-bold text-center'>
            Analogie pozwalaja przenosic wiedze do zupełnie nowych sytuacji!
          </p>
        </div>
      ),
    },
  ],
};

export const HUB_SECTIONS = [
  { id: 'intro', emoji: '🔗', title: 'Analogia — wstep i słowne', description: 'Co to analogia? Relacje miedzy słowami' },
  { id: 'liczby_ksztalty', emoji: '🔢', title: 'Analogie liczbowe i kształtów', description: 'Operacje matematyczne i transformacje kształtów' },
  { id: 'relacje', emoji: '🧩', title: 'Czesc–całosc i przyczyna–skutek', description: 'Dwa wazne typy analogii relacyjnych' },
  { id: 'podsumowanie', emoji: '📋', title: 'Podsumowanie', description: 'Wszystkie typy analogii razem' },
];

export default function LogicalAnalogiesLesson({ onBack }: LogicalAnalogiesLessonProps): React.JSX.Element {
  const [activeSection, setActiveSection] = useState<SectionId | null>(null);

  if (activeSection) {
    return (
      <LessonSlideSection
        slides={SLIDES[activeSection]}
        onBack={() => setActiveSection(null)}
        dotActiveClass='bg-pink-500'
        dotDoneClass='bg-pink-300'
        gradientClass='from-pink-500 to-rose-500'
      />
    );
  }

  return (
    <LessonHub
      lessonEmoji='🔗'
      lessonTitle='Analogie'
      gradientClass='from-pink-500 to-rose-500'
      sections={HUB_SECTIONS}
      onSelect={(id) => setActiveSection(id as SectionId)}
      onBack={onBack}
    />
  );
}
