'use client';

import type { LessonSlide } from '@/features/kangur/ui/components/LessonSlideSection';
import {
  DeductionFlowAnimation,
  EliminationGridAnimation,
  IfThenArrowAnimation,
  InductionGatherAnimation,
  QuantifierScopeAnimation,
} from '@/features/kangur/ui/components/LogicalReasoningAnimations';
import LogicalReasoningIfThenGame from '@/features/kangur/ui/components/LogicalReasoningIfThenGame';
import {
  KangurLessonCallout,
  KangurLessonCaption,
  KangurLessonInset,
  KangurLessonLead,
  KangurLessonStack,
} from '@/features/kangur/ui/design/lesson-primitives';
import { KANGUR_STACK_TIGHT_CLASSNAME, KANGUR_START_ROW_CLASSNAME } from '@/features/kangur/ui/design/tokens';
import { KangurUnifiedLesson } from '@/features/kangur/ui/lessons/lesson-components';

type SectionId = 'wnioskowanie' | 'kwantyfikatory' | 'zagadki' | 'podsumowanie' | 'gra';

const IF_THEN_GAME_CASES = [
  {
    id: 'case-umbrella',
    rule: 'Jeśli pada deszcz, to biorę parasol.',
    fact: 'Pada deszcz.',
    conclusion: 'Biorę parasol.',
    valid: true,
    explanation: 'Warunek jest spełniony, więc wniosek wynika.',
  },
  {
    id: 'case-even',
    rule: 'Jeśli liczba jest parzysta, to dzieli się przez 2.',
    fact: '8 jest parzyste.',
    conclusion: '8 ÷ 2 = 4.',
    valid: true,
    explanation: 'Z parzystości wynika podzielność przez 2.',
  },
  {
    id: 'case-reverse',
    rule: 'Jeśli jestem kotem, to mam wąsy.',
    fact: 'Mam wąsy.',
    conclusion: 'Jestem kotem.',
    valid: false,
    explanation: 'To odwrotność. Wąsy nie oznaczają, że to na pewno kot.',
  },
  {
    id: 'case-contrary',
    rule: 'Jeśli mam bilet, to mogę wejść.',
    fact: 'Nie mam biletu.',
    conclusion: 'Nie mogę wejść.',
    valid: false,
    explanation: 'To zaprzeczenie warunku. Brak biletu nie mówi nic pewnego.',
  },
  {
    id: 'case-sun',
    rule: 'Jeśli świeci słońce, to jest jasno.',
    fact: 'Świeci słońce.',
    conclusion: 'Jest jasno.',
    valid: true,
    explanation: 'Gdy P jest prawdziwe, Q też musi być prawdziwe.',
  },
];

export const SLIDES: Record<SectionId, LessonSlide[]> = {
  wnioskowanie: [
    {
      title: 'Co to jest wnioskowanie?',
      content: (
        <KangurLessonStack>
          <KangurLessonLead>
            Wnioskowanie to wyciąganie nowych wniosków z tego, co już wiemy. Idziemy od znanych
            faktów do nowej prawdy.
          </KangurLessonLead>
          <KangurLessonCallout
            accent='indigo'
            className='w-full text-sm [color:var(--kangur-page-muted-text)]'
          >
            <p className='font-semibold text-indigo-700 mb-2'>Dwa typy wnioskowania:</p>
            <div className='space-y-2'>
              <KangurLessonInset accent='indigo' padding='sm'>
                <p className='font-bold text-indigo-600 text-xs'>
                  Dedukcja (od ogółu do szczegółu)
                </p>
                <p className='text-xs mt-1'>
                  Wszystkie psy szczekają. Burek jest psem. → Burek szczeka.
                </p>
              </KangurLessonInset>
              <KangurLessonInset accent='indigo' padding='sm'>
                <p className='font-bold text-indigo-600 text-xs'>
                  Indukcja (od szczegółu do ogółu)
                </p>
                <p className='text-xs mt-1'>
                  Obserwuję 100 łabędzi — wszystkie są białe. → (Prawdopodobnie) wszystkie łabędzie
                  są białe.
                </p>
              </KangurLessonInset>
            </div>
          </KangurLessonCallout>
        </KangurLessonStack>
      ),
    },
    {
      title: 'Jeśli… to…',
      content: (
        <KangurLessonStack>
          <KangurLessonLead>
            Zdanie <b>„Jeśli P, to Q"</b> znaczy: gdy P jest prawdziwe, Q też musi być prawdziwe.
          </KangurLessonLead>
          <div className={`${KANGUR_STACK_TIGHT_CLASSNAME} w-full`}>
            {[
              {
                rule: 'Jeśli pada deszcz → wezmę parasol.',
                note: 'Pada deszcz? → wezmę parasol. ✅',
                type: 'indigo',
              },
              {
                rule: 'Jeśli liczba jest parzysta → dzieli się przez 2.',
                note: '8 jest parzyste → 8 ÷ 2 = 4 ✅',
                type: 'indigo',
              },
            ].map(({ rule, note }) => (
              <KangurLessonCallout key={rule} accent='indigo' className='text-sm' padding='sm'>
                <p className='font-bold text-indigo-700'>{rule}</p>
                <KangurLessonCaption className='mt-1'>{note}</KangurLessonCaption>
              </KangurLessonCallout>
            ))}
            <KangurLessonCallout accent='amber' className='text-sm' padding='sm'>
              <p className='font-bold text-amber-700'>Uwaga na odwrotność!</p>
              <KangurLessonCaption className='mt-1'>
                „Jeśli P, to Q" NIE znaczy „Jeśli Q, to P"! Biorę parasol → nie musi padać. ❌
              </KangurLessonCaption>
            </KangurLessonCallout>
          </div>
        </KangurLessonStack>
      ),
    },
    {
      title: 'Dedukcja w praktyce',
      content: (
        <KangurLessonStack>
          <KangurLessonLead>
            Dedukcja prowadzi od ogólnej reguły do konkretnego wniosku.
          </KangurLessonLead>
          <KangurLessonInset accent='indigo' className='w-full text-center' padding='sm'>
            <div className='mx-auto w-72 max-w-full'>
              <DeductionFlowAnimation />
            </div>
            <KangurLessonCaption className='mt-2'>
              Reguła + fakt = pewny wniosek.
            </KangurLessonCaption>
          </KangurLessonInset>
        </KangurLessonStack>
      ),
    },
    {
      title: 'Indukcja — szukanie reguły',
      content: (
        <KangurLessonStack>
          <KangurLessonLead>
            Indukcja zbiera obserwacje i buduje prawdopodobną regułę.
          </KangurLessonLead>
          <KangurLessonInset accent='emerald' className='w-full text-center' padding='sm'>
            <div className='mx-auto h-28 w-72 max-w-full'>
              <InductionGatherAnimation />
            </div>
            <KangurLessonCaption className='mt-2'>
              Im więcej przykładów, tym pewniejsza reguła.
            </KangurLessonCaption>
          </KangurLessonInset>
        </KangurLessonStack>
      ),
    },
    {
      title: 'Warunek logiczny',
      content: (
        <KangurLessonStack>
          <KangurLessonLead>
            Warunek pokazuje związek: gdy P jest prawdziwe, Q musi być prawdziwe.
          </KangurLessonLead>
          <KangurLessonInset accent='indigo' className='w-full text-center' padding='sm'>
            <div className='mx-auto h-24 w-72 max-w-full'>
              <IfThenArrowAnimation />
            </div>
            <KangurLessonCaption className='mt-2'>
              Strzałka oznacza kierunek wniosku.
            </KangurLessonCaption>
          </KangurLessonInset>
        </KangurLessonStack>
      ),
    },
  ],
  kwantyfikatory: [
    {
      title: 'Wszyscy, niektórzy, żaden',
      content: (
        <KangurLessonStack>
          <KangurLessonLead>
            Kwantyfikatory mówią o <b>zasięgu</b> twierdzenia.
          </KangurLessonLead>
          <div className={`${KANGUR_STACK_TIGHT_CLASSNAME} w-full`}>
            {[
              {
                icon: '✅',
                label: 'Wszyscy',
                accent: 'emerald' as const,
                text: 'Wszyscy ludzie oddychają. → Jeśli jesteś człowiekiem, oddychasz.',
              },
              {
                icon: '⚠️',
                label: 'Niektórzy',
                accent: 'amber' as const,
                text: 'Niektóre koty są rude. → Nie możesz powiedzieć, że TWÓJ kot jest rudy!',
              },
              {
                icon: '❌',
                label: 'Żaden',
                accent: 'rose' as const,
                text: 'Żaden ptak nie jest ssakiem. → Orzeł jest ptakiem → Orzeł nie jest ssakiem.',
              },
            ].map(({ icon, label, accent, text }) => (
              <KangurLessonCallout key={label} accent={accent} padding='sm'>
                <p className='text-sm font-bold [color:var(--kangur-page-text)]'>
                  {icon} {label}
                </p>
                <KangurLessonCaption className='mt-1'>{text}</KangurLessonCaption>
              </KangurLessonCallout>
            ))}
          </div>
        </KangurLessonStack>
      ),
    },
    {
      title: 'Prawda czy fałsz?',
      content: (
        <KangurLessonStack>
          <KangurLessonLead>
            Zdanie logiczne musi być albo prawdziwe, albo fałszywe. Sprawdzaj każde twierdzenie
            osobno!
          </KangurLessonLead>
          <div className={`${KANGUR_STACK_TIGHT_CLASSNAME} w-full`}>
            {[
              { stmt: '4 + 3 = 7', answer: true, explain: 'Poprawne obliczenie.' },
              { stmt: 'Trójkąt ma 4 boki.', answer: false, explain: 'Trójkąt ma 3 boki.' },
              { stmt: 'Jeśli 5>3 i 3>1, to 5>1.', answer: true, explain: 'Przechodniość: 5>3>1.' },
              {
                stmt: 'Liczba 9 jest parzysta.',
                answer: false,
                explain: '9÷2=4 reszty 1 — nieparzysta.',
              },
            ].map(({ stmt, answer, explain }) => (
              <KangurLessonCallout
                key={stmt}
                accent={answer ? 'emerald' : 'rose'}
                className='text-sm'
                padding='sm'
              >
                <div className={KANGUR_START_ROW_CLASSNAME}>
                  <span className='text-lg'>{answer ? '✅' : '❌'}</span>
                  <div>
                    <p className='font-bold [color:var(--kangur-page-text)]'>{stmt}</p>
                    <KangurLessonCaption className='mt-0.5'>
                      {explain}
                    </KangurLessonCaption>
                  </div>
                </div>
              </KangurLessonCallout>
            ))}
          </div>
        </KangurLessonStack>
      ),
    },
    {
      title: 'Zasięg kwantyfikatorów',
      content: (
        <KangurLessonStack>
          <KangurLessonLead>
            Sprawdzaj, czy zdanie dotyczy wszystkich, tylko niektórych, czy żadnych elementów.
          </KangurLessonLead>
          <KangurLessonInset accent='emerald' className='w-full text-center' padding='sm'>
            <div className='mx-auto h-24 w-72 max-w-full'>
              <QuantifierScopeAnimation />
            </div>
            <KangurLessonCaption className='mt-2'>
              Zmiana kwantyfikatora potrafi całkowicie zmienić sens zdania.
            </KangurLessonCaption>
          </KangurLessonInset>
        </KangurLessonStack>
      ),
    },
  ],
  zagadki: [
    {
      title: 'Zagadka logiczna',
      content: (
        <KangurLessonStack>
          <KangurLessonLead>
            Zagadki logiczne wymagają łączenia kilku informacji naraz.
          </KangurLessonLead>
          <KangurLessonCallout accent='indigo' className='w-full text-sm'>
            <p className='font-bold text-indigo-700 mb-2'>Zagadka: Kto mieszka w którym domu?</p>
            <ul className='space-y-1 text-xs [color:var(--kangur-page-muted-text)]'>
              <li>🏠 Są trzy domy: czerwony, niebieski, zielony.</li>
              <li>👧 Ania nie mieszka w czerwonym.</li>
              <li>👦 Bartek mieszka w niebieskim.</li>
              <li>👩 Celina nie mieszka w zielonym.</li>
            </ul>
            <KangurLessonInset accent='indigo' className='mt-3' padding='sm'>
              <p className='text-xs font-bold text-indigo-600'>Rozwiązanie:</p>
              <p className='text-xs [color:var(--kangur-page-muted-text)]'>
                Bartek → niebieski ✅<br />
                Celina → nie zielony, nie niebieski → czerwony ✅<br />
                Ania → zielony ✅
              </p>
            </KangurLessonInset>
          </KangurLessonCallout>
        </KangurLessonStack>
      ),
    },
    {
          title: 'Rozwiązywanie krok po kroku',
          content: (
            <KangurLessonStack>
              <KangurLessonInset accent='indigo' className='w-full' padding='md'>
            <ol className='w-full list-decimal list-inside space-y-3 text-sm text-left break-words [color:var(--kangur-page-text)]'>
                <li>
                  <b>Przeczytaj wszystkie wskazówki</b> — nie spiesz się.
                </li>
              <li>
                <b>Wypisz, co jest pewne</b> — zacznij od faktów bezpośrednich.
              </li>
              <li>
                <b>Eliminuj niemożliwe opcje</b> — to zwęża pole odpowiedzi.
              </li>
              <li>
                <b>Wnioskuj ze znanych faktów</b> — zastosuj „Jeśli… to…".
              </li>
              <li>
                <b>Sprawdź odpowiedź</b> — czy pasuje do wszystkich wskazówek?
              </li>
            </ol>
          </KangurLessonInset>
          <KangurLessonCallout
            accent='indigo'
            className='w-full text-center text-xs [color:var(--kangur-page-muted-text)]'
            padding='sm'
          >
            Dobry logik nigdy nie zgaduje — zawsze uzasadnia każdy krok!
          </KangurLessonCallout>
        </KangurLessonStack>
      ),
    },
    {
      title: 'Eliminuj niemożliwe',
      content: (
        <KangurLessonStack>
          <KangurLessonLead>
            Skreślaj opcje, które nie pasują do wskazówek, aż zostanie właściwa odpowiedź.
          </KangurLessonLead>
          <KangurLessonInset accent='rose' className='w-full text-center' padding='sm'>
            <div className='mx-auto w-full max-w-sm'>
              <EliminationGridAnimation />
            </div>
            <KangurLessonCaption className='mt-2'>
              Eliminacja to najkrótsza droga do poprawnego rozwiązania.
            </KangurLessonCaption>
          </KangurLessonInset>
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
                💡 <b>Wnioskowanie</b> — od faktów do nowych wniosków
              </li>
              <li>
                ➡️ <b>Jeśli… to…</b> — warunek i jego konsekwencja
              </li>
              <li>
                🔢 <b>Wszyscy/Niektórzy/Żaden</b> — zasięg twierdzenia
              </li>
              <li>
                ✅❌ <b>Prawda/fałsz</b> — każde zdanie ma jedną wartość
              </li>
              <li>
                🧩 <b>Zagadki</b> — łącz wskazówki, eliminuj błędy
              </li>
              <li>
                🪜 <b>Krok po kroku</b> — cierpliwość i plan to klucz
              </li>
            </ul>
          </KangurLessonCallout>
          <p className='text-indigo-600 font-bold text-center'>
            Wnioskowanie to supermocy detektywa — używaj go każdy dzień!
          </p>
        </KangurLessonStack>
      ),
    },
  ],
  gra: [
    {
      title: 'Gra: Czy wniosek wynika?',
      containerClassName: 'max-w-[min(760px,90vw)]',
      panelClassName: 'w-full mx-auto lg:w-[min(760px,90vw)]',
      content: (
        <KangurLessonStack>
          <KangurLessonLead>
            Przeciągnij karty do pola „Wynika” lub „Nie wynika” i sprawdź poprawność.
          </KangurLessonLead>
          <KangurLessonInset accent='indigo' className='w-full' padding='sm'>
            <LogicalReasoningIfThenGame cases={IF_THEN_GAME_CASES} />
          </KangurLessonInset>
        </KangurLessonStack>
      ),
    },
  ],
};

export const HUB_SECTIONS = [
  {
    id: 'wnioskowanie',
    emoji: '💡',
    title: 'Wnioskowanie i Jeśli…to…',
    description: 'Dedukcja, indukcja, warunek logiczny',
  },
  {
    id: 'kwantyfikatory',
    emoji: '🔢',
    title: 'Wszyscy / Niektórzy / Żaden',
    description: 'Zasięg twierdzeń i prawda/fałsz',
  },
  {
    id: 'zagadki',
    emoji: '🧩',
    title: 'Zagadki logiczne',
    description: 'Rozwiązywanie zagadek krok po kroku',
  },
  { id: 'podsumowanie', emoji: '📋', title: 'Podsumowanie', description: 'Wszystkie zasady razem' },
  {
    id: 'gra',
    emoji: '🎮',
    title: 'Gra: Wniosek',
    description: 'Oceń, czy wniosek wynika',
  },
];

export default function LogicalReasoningLesson(): React.JSX.Element {
  return (
    <KangurUnifiedLesson
      progressMode='panel'
      lessonId='logical_reasoning'
      lessonEmoji='💡'
      lessonTitle='Wnioskowanie'
      sections={HUB_SECTIONS}
      slides={SLIDES}
      gradientClass='kangur-gradient-accent-indigo'
      progressDotClassName='bg-indigo-300'
      dotActiveClass='bg-indigo-500'
      dotDoneClass='bg-indigo-300'
    />
  );
}
