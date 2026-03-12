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

type SectionId = 'intro' | 'liczby_ksztalty' | 'relacje' | 'podsumowanie';

export const SLIDES: Record<SectionId, LessonSlide[]> = {
  intro: [
    {
      title: 'Co to jest analogia?',
      content: (
        <KangurLessonStack>
          <KangurLessonLead>
            Analogia to ta sama relacja między różnymi parami. Zamiast myśleć o konkretnych
            rzeczach, szukasz <b>wzorca połączenia</b>.
          </KangurLessonLead>
          <KangurLessonCallout accent='rose' className='w-full text-sm'>
            <p className='font-semibold text-pink-700 mb-2'>Zapis analogii:</p>
            <p className='text-center text-lg font-bold [color:var(--kangur-page-text)]'>A : B = C : D</p>
            <KangurLessonCaption className='mt-1'>
              „A do B tak jak C do D"
            </KangurLessonCaption>
            <KangurLessonInset accent='rose' className='mt-2 text-center' padding='sm'>
              <p className='font-bold text-pink-700'>Ptak : latać = ryba : ❓</p>
              <KangurLessonCaption className='mt-1'>
                Relacja: stworzenie → sposób poruszania
              </KangurLessonCaption>
              <p className='text-pink-600 font-bold mt-1'>Odpowiedź: pływać 🐟</p>
            </KangurLessonInset>
          </KangurLessonCallout>
        </KangurLessonStack>
      ),
    },
    {
      title: 'Analogie słowne',
      content: (
        <KangurLessonStack>
          <KangurLessonLead>
            Analogie słowne korzystają z relacji między słowami: kategoria, przeciwieństwo, część
            całości, czynność i inne.
          </KangurLessonLead>
          <div className='flex flex-col gap-2 w-full'>
            {[
              {
                pair: 'Pies : szczekać = kot : ❓',
                hint: 'Zwierzę → wydawany dźwięk',
                answer: 'miauczeć 🐈',
              },
              {
                pair: 'Gorący : zimny = dzień : ❓',
                hint: 'Antonim (przeciwieństwo)',
                answer: 'noc 🌙',
              },
              { pair: 'Palec : ręka = liść : ❓', hint: 'Część → całość', answer: 'drzewo 🌳' },
              {
                pair: 'Nożyczki : cięcie = ołówek : ❓',
                hint: 'Narzędzie → jego funkcja',
                answer: 'pisanie ✏️',
              },
            ].map(({ pair, hint, answer }) => (
              <KangurLessonCallout key={pair} accent='rose' className='text-sm' padding='sm'>
                <p className='font-bold [color:var(--kangur-page-text)]'>{pair}</p>
                <KangurLessonCaption className='mt-0.5'>{hint}</KangurLessonCaption>
                <p className='text-pink-600 font-bold text-sm mt-1'>→ {answer}</p>
              </KangurLessonCallout>
            ))}
          </div>
        </KangurLessonStack>
      ),
    },
  ],
  liczby_ksztalty: [
    {
      title: 'Analogie liczbowe',
      content: (
        <KangurLessonStack>
          <KangurLessonLead>
            W analogiach liczbowych szukasz tej samej operacji matematycznej w obu parach.
          </KangurLessonLead>
          <div className='flex flex-col gap-2 w-full'>
            {[
              {
                pair: '2 : 4 = 5 : ❓',
                hint: 'Relacja: ×2',
                answer: '10',
                workings: '2×2=4, 5×2=10',
              },
              {
                pair: '10 : 5 = 8 : ❓',
                hint: 'Relacja: ÷2',
                answer: '4',
                workings: '10÷2=5, 8÷2=4',
              },
              {
                pair: '3 : 9 = 4 : ❓',
                hint: 'Relacja: do kwadratu (×siebie)',
                answer: '16',
                workings: '3²=9, 4²=16',
              },
              {
                pair: '1 : 3 = 4 : ❓',
                hint: 'Relacja: ×3',
                answer: '12',
                workings: '1×3=3, 4×3=12',
              },
            ].map(({ pair, hint, answer, workings }) => (
              <KangurLessonCallout key={pair} accent='rose' className='text-sm' padding='sm'>
                <p className='text-base font-bold [color:var(--kangur-page-text)]'>{pair}</p>
                <KangurLessonCaption className='mt-0.5'>{hint}</KangurLessonCaption>
                <p className='text-rose-600 font-bold mt-1'>
                  → {answer}{' '}
                  <span className='font-normal [color:var(--kangur-page-muted-text)]'>
                    ({workings})
                  </span>
                </p>
              </KangurLessonCallout>
            ))}
          </div>
        </KangurLessonStack>
      ),
    },
    {
      title: 'Analogie kształtów',
      content: (
        <KangurLessonStack>
          <KangurLessonLead>
            Analogie kształtów zmieniają rozmiar, orientację, kolor lub liczbę elementów według tej
            samej reguły.
          </KangurLessonLead>
          <div className='flex flex-col gap-3 w-full'>
            {[
              { rule: 'Reguła: obrót o 90° w prawo', seq: '➡️ : ⬇️ = ⬆️ : ➡️' },
              { rule: 'Reguła: dodaj jeden element', seq: '⭐ : ⭐⭐ = 🔵 : 🔵🔵' },
            ].map(({ rule, seq }) => (
              <KangurLessonCallout key={rule} accent='rose' className='text-center' padding='sm'>
                <KangurLessonCaption className='mb-1'>{rule}</KangurLessonCaption>
                <div className='text-2xl'>{seq}</div>
              </KangurLessonCallout>
            ))}
          </div>
        </KangurLessonStack>
      ),
    },
  ],
  relacje: [
    {
      title: 'Analogie część–całość',
      content: (
        <KangurLessonStack>
          <KangurLessonLead>
            Relacja część–całość to jedna z najczęstszych w analogiach.
          </KangurLessonLead>
          <div className='flex flex-col gap-2 w-full'>
            {[
              { pair: 'Strona : książka = cegła : ❓', answer: 'mur / budynek 🧱' },
              { pair: 'Nuta : melodia = litera : ❓', answer: 'słowo / zdanie 🔤' },
              { pair: 'Płatek : kwiat = piksel : ❓', answer: 'obraz / zdjęcie 🖼️' },
              { pair: 'Kropla : ocean = ziarnko : ❓', answer: 'plaża / piasek 🏖️' },
            ].map(({ pair, answer }) => (
              <KangurLessonCallout key={pair} accent='rose' className='text-sm' padding='sm'>
                <p className='font-bold [color:var(--kangur-page-text)]'>{pair}</p>
                <p className='text-rose-600 font-bold mt-1'>→ {answer}</p>
              </KangurLessonCallout>
            ))}
          </div>
        </KangurLessonStack>
      ),
    },
    {
      title: 'Analogie przyczyna–skutek',
      content: (
        <KangurLessonStack>
          <KangurLessonLead>
            Przyczyna powoduje skutek. Analogia przenosi tę samą zależność na inną parę.
          </KangurLessonLead>
          <div className='flex flex-col gap-2 w-full'>
            {[
              {
                pair: 'Deszcz : mokra ziemia = słońce : ❓',
                answer: 'sucha ziemia / opalenizna ☀️',
              },
              {
                pair: 'Ćwiczenie : silniejsze mięśnie = czytanie : ❓',
                answer: 'więcej wiedzy / mądrość 📚',
              },
              { pair: 'Zima : śnieg = wiosna : ❓', answer: 'kwiaty / deszcz 🌸' },
            ].map(({ pair, answer }) => (
              <KangurLessonCallout key={pair} accent='rose' className='text-sm' padding='sm'>
                <p className='font-bold [color:var(--kangur-page-text)]'>{pair}</p>
                <p className='text-pink-600 font-bold mt-1'>→ {answer}</p>
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
                🔗 <b>Analogia</b> — A:B = C:D, ta sama relacja w nowej parze
              </li>
              <li>
                🗣️ <b>Słowne</b> — kategoria, antonim, czynność, cecha
              </li>
              <li>
                🔢 <b>Liczbowe</b> — +, −, ×, ÷, potęga — szukaj operacji
              </li>
              <li>
                🔷 <b>Kształtów</b> — obrót, kolor, liczba, rozmiar
              </li>
              <li>
                🧩 <b>Część–całość</b> — element → zbiór, do którego należy
              </li>
              <li>
                ⚡ <b>Przyczyna–skutek</b> — co wywołuje co?
              </li>
            </ul>
        </KangurLessonCallout>
        <p className='text-pink-600 font-bold text-center'>
          Analogie pozwalają przenosić wiedzę do zupełnie nowych sytuacji!
        </p>
        </KangurLessonStack>
      ),
    },
  ],
};

export const HUB_SECTIONS = [
  {
    id: 'intro',
    emoji: '🔗',
    title: 'Analogia — wstęp i słowne',
    description: 'Co to analogia? Relacje między słowami',
  },
  {
    id: 'liczby_ksztalty',
    emoji: '🔢',
    title: 'Analogie liczbowe i kształtów',
    description: 'Operacje matematyczne i transformacje kształtów',
  },
  {
    id: 'relacje',
    emoji: '🧩',
    title: 'Część–całość i przyczyna–skutek',
    description: 'Dwa ważne typy analogii relacyjnych',
  },
  {
    id: 'podsumowanie',
    emoji: '📋',
    title: 'Podsumowanie',
    description: 'Wszystkie typy analogii razem',
  },
];

export default function LogicalAnalogiesLesson(): React.JSX.Element {
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
      progressDotClassName='bg-pink-300'
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
