import { useState } from 'react';

import LessonHub from '@/features/kangur/ui/components/LessonHub';
import LessonSlideSection, {
  type LessonSlide,
} from '@/features/kangur/ui/components/LessonSlideSection';

type LogicalReasoningLessonProps = { onBack: () => void };
type SectionId = 'wnioskowanie' | 'kwantyfikatory' | 'zagadki' | 'podsumowanie';

const SLIDES: Record<SectionId, LessonSlide[]> = {
  wnioskowanie: [
    {
      title: 'Co to jest wnioskowanie?',
      content: (
        <div className='flex flex-col items-center gap-4'>
          <p className='text-gray-700 text-center'>
            Wnioskowanie to wyciaganie nowych wniosków z tego, co juz wiemy. Idziemy od znanych faktów do nowej prawdy.
          </p>
          <div className='bg-indigo-50 border border-indigo-200 rounded-2xl p-4 w-full text-sm text-gray-600'>
            <p className='font-semibold text-indigo-700 mb-2'>Dwa typy wnioskowania:</p>
            <div className='space-y-2'>
              <div className='bg-white rounded-xl p-2 border border-indigo-100'>
                <p className='font-bold text-indigo-600 text-xs'>Dedukcja (od ogółu do szczegółu)</p>
                <p className='text-xs mt-1'>Wszystkie psy szczekaja. Burek jest psem. → Burek szczeka.</p>
              </div>
              <div className='bg-white rounded-xl p-2 border border-indigo-100'>
                <p className='font-bold text-indigo-600 text-xs'>Indukcja (od szczegółu do ogółu)</p>
                <p className='text-xs mt-1'>Obserwuje 100 łabedzi — wszystkie sa białe. → (Prawdopodobnie) wszystkie łabedzie sa białe.</p>
              </div>
            </div>
          </div>
        </div>
      ),
    },
    {
      title: 'Jesli… to…',
      content: (
        <div className='flex flex-col items-center gap-4'>
          <p className='text-gray-700 text-center'>
            Zdanie <b>„Jesli P, to Q"</b> znaczy: gdy P jest prawdziwe, Q tez musi byc prawdziwe.
          </p>
          <div className='flex flex-col gap-2 w-full'>
            {[
              { rule: 'Jesli pada deszcz → wezme parasol.', note: 'Pada deszcz? → wezme parasol. ✅', type: 'indigo' },
              { rule: 'Jesli liczba jest parzysta → dzieli sie przez 2.', note: '8 jest parzyste → 8 ÷ 2 = 4 ✅', type: 'indigo' },
            ].map(({ rule, note }) => (
              <div key={rule} className='bg-indigo-50 border border-indigo-200 rounded-2xl p-3 text-sm'>
                <p className='font-bold text-indigo-700'>{rule}</p>
                <p className='text-gray-500 text-xs mt-1'>{note}</p>
              </div>
            ))}
            <div className='bg-amber-50 border border-amber-200 rounded-2xl p-3 text-sm'>
              <p className='font-bold text-amber-700'>Uwaga na odwrotnosc!</p>
              <p className='text-gray-500 text-xs mt-1'>„Jesli P, to Q" NIE znaczy „Jesli Q, to P"! Biore parasol → nie musi padac. ❌</p>
            </div>
          </div>
        </div>
      ),
    },
  ],
  kwantyfikatory: [
    {
      title: 'Wszyscy, niektórzy, zaden',
      content: (
        <div className='flex flex-col items-center gap-4'>
          <p className='text-gray-700 text-center'>
            Kwantyfikatory mówia o <b>zasięgu</b> twierdzenia.
          </p>
          <div className='flex flex-col gap-2 w-full'>
            {[
              { icon: '✅', label: 'Wszyscy', color: 'green', text: 'Wszyscy ludzie oddychaja. → Jesli jestes człowiekiem, oddychasz.' },
              { icon: '⚠️', label: 'Niektorzy', color: 'yellow', text: 'Niektóre koty sa rude. → Nie mozesz powiedziec, ze TWÓJ kot jest rudy!' },
              { icon: '❌', label: 'Zaden', color: 'rose', text: 'Zaden ptak nie jest ssakiem. → Orzeł jest ptakiem → Orzeł nie jest ssakiem.' },
            ].map(({ icon, label, color, text }) => (
              <div key={label} className={`bg-${color}-50 border border-${color}-200 rounded-2xl p-3`}>
                <p className={`font-bold text-${color}-700 text-sm`}>{icon} {label}</p>
                <p className='text-xs text-gray-600 mt-1'>{text}</p>
              </div>
            ))}
          </div>
        </div>
      ),
    },
    {
      title: 'Prawda czy falsz?',
      content: (
        <div className='flex flex-col items-center gap-4'>
          <p className='text-gray-700 text-center'>
            Zdanie logiczne musi byc albo prawdziwe, albo fałszywe. Sprawdzaj kazde twierdzenie osobno!
          </p>
          <div className='flex flex-col gap-2 w-full'>
            {[
              { stmt: '4 + 3 = 7', answer: true, explain: 'Poprawne obliczenie.' },
              { stmt: 'Trójkat ma 4 boki.', answer: false, explain: 'Trójkat ma 3 boki.' },
              { stmt: 'Jesli 5>3 i 3>1, to 5>1.', answer: true, explain: 'Przechodniocs: 5>3>1.' },
              { stmt: 'Liczba 9 jest parzysta.', answer: false, explain: '9÷2=4 reszty 1 — nieparzysta.' },
            ].map(({ stmt, answer, explain }) => (
              <div key={stmt} className={`rounded-2xl p-3 border text-sm ${answer ? 'bg-green-50 border-green-200' : 'bg-rose-50 border-rose-200'}`}>
                <div className='flex items-start gap-2'>
                  <span className='text-lg'>{answer ? '✅' : '❌'}</span>
                  <div>
                    <p className='font-bold text-gray-800'>{stmt}</p>
                    <p className='text-xs text-gray-500 mt-0.5'>{explain}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ),
    },
  ],
  zagadki: [
    {
      title: 'Zagadka logiczna',
      content: (
        <div className='flex flex-col items-center gap-4'>
          <p className='text-gray-700 text-center'>
            Zagadki logiczne wymagaja łaczenia kilku informacji naraz.
          </p>
          <div className='bg-indigo-50 border border-indigo-200 rounded-2xl p-4 w-full text-sm'>
            <p className='font-bold text-indigo-700 mb-2'>Zagadka: Kto mieszka w którym domu?</p>
            <ul className='text-gray-600 space-y-1 text-xs'>
              <li>🏠 Sa trzy domy: czerwony, niebieski, zielony.</li>
              <li>👧 Ania nie mieszka w czerwonym.</li>
              <li>👦 Bartek mieszka w niebieskim.</li>
              <li>👩 Celina nie mieszka w zielonym.</li>
            </ul>
            <div className='mt-3 bg-white rounded-xl p-2 border border-indigo-100'>
              <p className='text-xs font-bold text-indigo-600'>Rozwiazanie:</p>
              <p className='text-xs text-gray-600'>
                Bartek → niebieski ✅<br />
                Celina → nie zielony, nie niebieski → czerwony ✅<br />
                Ania → zielony ✅
              </p>
            </div>
          </div>
        </div>
      ),
    },
    {
      title: 'Rozwiazywanie krok po kroku',
      content: (
        <div className='flex flex-col items-center gap-4'>
          <div className='bg-white border border-indigo-200 rounded-2xl p-4 w-full'>
            <ol className='text-gray-700 space-y-3 text-sm list-decimal list-inside'>
              <li><b>Przeczytaj wszystkie wskazówki</b> — nie spiesz sie.</li>
              <li><b>Wypisz, co jest pewne</b> — zacznij od faktów bezposrednich.</li>
              <li><b>Eliminuj niemozliwe opcje</b> — to zweza pole odpowiedzi.</li>
              <li><b>Wnioskuj ze znanych faktów</b> — zastosuj „Jesli… to…".</li>
              <li><b>Sprawdz odpowiedz</b> — czy pasuje do wszystkich wskazówek?</li>
            </ol>
          </div>
          <div className='bg-indigo-50 border border-indigo-200 rounded-2xl p-3 w-full text-center text-xs text-gray-600'>
            Dobry logik nigdy nie zgaduje — zawsze uzasadnia kazdy krok!
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
              <li>💡 <b>Wnioskowanie</b> — od faktów do nowych wniosków</li>
              <li>➡️ <b>Jesli… to…</b> — warunek i jego konsekwencja</li>
              <li>🔢 <b>Wszyscy/Niektórzy/Zaden</b> — zasieg twierdzenia</li>
              <li>✅❌ <b>Prawda/falsz</b> — kazde zdanie ma jedna wartosc</li>
              <li>🧩 <b>Zagadki</b> — łacz wskazówki, eliminuj błedy</li>
              <li>🪜 <b>Krok po kroku</b> — cierpliwosc i plan to klucz</li>
            </ul>
          </div>
          <p className='text-indigo-600 font-bold text-center'>
            Wnioskowanie to supermocy detektywa — uzywaj go kazdy dzien!
          </p>
        </div>
      ),
    },
  ],
};

const HUB_SECTIONS = [
  { id: 'wnioskowanie', emoji: '💡', title: 'Wnioskowanie i Jesli…to…', description: 'Dedukcja, indukcja, warunek logiczny' },
  { id: 'kwantyfikatory', emoji: '🔢', title: 'Wszyscy / Niektorzy / Zaden', description: 'Zasieg twierdzen i prawda/falsz' },
  { id: 'zagadki', emoji: '🧩', title: 'Zagadki logiczne', description: 'Rozwiazywanie zagadek krok po kroku' },
  { id: 'podsumowanie', emoji: '📋', title: 'Podsumowanie', description: 'Wszystkie zasady razem' },
];

export default function LogicalReasoningLesson({ onBack }: LogicalReasoningLessonProps): React.JSX.Element {
  const [activeSection, setActiveSection] = useState<SectionId | null>(null);

  if (activeSection) {
    return (
      <LessonSlideSection
        slides={SLIDES[activeSection]}
        onBack={() => setActiveSection(null)}
        dotActiveClass='bg-indigo-500'
        dotDoneClass='bg-indigo-300'
        gradientClass='from-indigo-500 to-blue-600'
      />
    );
  }

  return (
    <LessonHub
      lessonEmoji='💡'
      lessonTitle='Wnioskowanie'
      gradientClass='from-indigo-500 to-blue-600'
      sections={HUB_SECTIONS}
      onSelect={(id) => setActiveSection(id as SectionId)}
      onBack={onBack}
    />
  );
}
