'use client';

import type { LessonSlide } from '@/features/kangur/ui/components/LessonSlideSection';
import LogicalPatternsWorkshopGame from '@/features/kangur/ui/components/LogicalPatternsWorkshopGame';
import {
  KangurLessonCallout,
  KangurLessonCaption,
  KangurLessonLead,
  KangurLessonStack,
} from '@/features/kangur/ui/design/lesson-primitives';
import {
  ArithmeticStepAnimation,
  ArithmeticReverseAnimation,
  FibonacciSumAnimation,
  GeometricDotsAnimation,
  GeometricGrowthAnimation,
  PatternCycleAnimation,
  PatternMissingAnimation,
  PatternUnitAnimation,
  RuleChecklistAnimation,
  RuleCheckAnimation,
} from '@/features/kangur/ui/components/LogicalPatternsAnimations';
import { KangurUnifiedLesson } from '@/features/kangur/ui/lessons/lesson-components';

type SectionId = 'intro' | 'ciagi_arytm' | 'ciagi_geom' | 'strategie' | 'game_warsztat';
type SlideSectionId = Exclude<SectionId, 'game_warsztat'>;

export const SLIDES: Record<SlideSectionId, LessonSlide[]> = {
  intro: [
    {
      title: 'Co to jest wzorzec?',
      content: (
        <KangurLessonStack>
          <KangurLessonLead>
            Wzorzec to układ, który powtarza się według pewnej reguły. Gdy ją znajdziesz — możesz
            przewidzieć, co będzie dalej!
          </KangurLessonLead>
          <KangurLessonCallout
            accent='violet'
            className='w-full text-sm [color:var(--kangur-page-muted-text)]'
          >
            <p className='font-semibold text-violet-700 mb-2'>Wzorce są wszędzie:</p>
            <ul className='space-y-1'>
              <li>🔴🔵🔴🔵 — naprzemienne kolory</li>
              <li>1, 2, 3, 4, 5 — każda liczba o 1 większa</li>
              <li>♦️🔷♦️🔷 — powtarzający się kształt</li>
              <li>pon., wt., śr., czw. — dni tygodnia</li>
            </ul>
          </KangurLessonCallout>
        </KangurLessonStack>
      ),
    },
    {
      title: 'Wzorce kolorów i kształtów',
      content: (
        <KangurLessonStack>
          <KangurLessonLead>
            Wzorce mogą używać kolorów, kształtów lub obu naraz. Patrz na powtarzającą się grupę —
            to jest jednostka wzorca.
          </KangurLessonLead>
          <div className='flex flex-col kangur-panel-gap w-full'>
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
                <KangurLessonCaption className='mb-1'>{label}</KangurLessonCaption>
                <p className='text-2xl tracking-widest'>{seq}</p>
                <p className='text-violet-600 font-bold text-sm mt-1'>Odpowiedź: {answer}</p>
              </KangurLessonCallout>
            ))}
          </div>
        </KangurLessonStack>
      ),
    },
    {
      title: 'Jednostka wzorca',
      content: (
        <KangurLessonStack>
          <KangurLessonLead>
            Jednostka wzorca to najmniejszy fragment, który się powtarza.
          </KangurLessonLead>
          <KangurLessonCallout accent='violet' className='w-full text-center' padding='sm'>
            <div className='mx-auto h-20 w-72 max-w-full'>
              <PatternUnitAnimation />
            </div>
            <KangurLessonCaption className='mt-2'>
              Zaznaczamy powtarzającą się parę i przesuwamy dalej.
            </KangurLessonCaption>
          </KangurLessonCallout>
        </KangurLessonStack>
      ),
    },
    {
      title: 'Uzupełnij brakujący element',
      content: (
        <KangurLessonStack>
          <KangurLessonLead>
            Gdy znasz jednostkę, możesz szybko uzupełnić brakujące miejsce.
          </KangurLessonLead>
          <KangurLessonCallout accent='violet' className='w-full text-center' padding='sm'>
            <div className='mx-auto h-20 w-72 max-w-full'>
              <PatternMissingAnimation />
            </div>
            <KangurLessonCaption className='mt-2'>
              Wzorzec AAB powtarza się w tej samej kolejności.
            </KangurLessonCaption>
          </KangurLessonCallout>
        </KangurLessonStack>
      ),
    },
    {
      title: 'Wzorzec trzy-elementowy',
      content: (
        <KangurLessonStack>
          <KangurLessonLead>
            Czasem wzorzec ma trzy elementy, które powtarzają się w tej samej kolejności.
          </KangurLessonLead>
          <KangurLessonCallout accent='violet' className='w-full text-center' padding='sm'>
            <div className='mx-auto h-20 w-72 max-w-full'>
              <PatternCycleAnimation />
            </div>
            <KangurLessonCaption className='mt-2'>
              Zaznacz cykl A-B-C i obserwuj, jak się powtarza.
            </KangurLessonCaption>
          </KangurLessonCallout>
        </KangurLessonStack>
      ),
    },
  ],
  ciagi_arytm: [
    {
      title: 'Ciągi liczbowe — dodawanie',
      content: (
        <KangurLessonStack>
          <KangurLessonLead>
            W ciągu liczbowym każda liczba powstaje z poprzedniej według tej samej zasady.
            Najczęściej dodajemy tę samą wartość.
          </KangurLessonLead>
          <div className='flex flex-col kangur-panel-gap w-full'>
            {[
              { hint: '+2 co krok', seq: '2, 4, 6, 8, 10, ❓', answer: '12' },
              { hint: '+5 co krok', seq: '5, 10, 15, 20, ❓', answer: '25' },
              {
                hint: '+10, +9, +8... (malejący krok)',
                seq: '1, 11, 20, 28, ❓',
                answer: '35 (krok maleje o 1)',
              },
            ].map(({ hint, seq, answer }) => (
              <KangurLessonCallout key={hint} accent='violet' padding='sm'>
                <KangurLessonCaption className='mb-1'>{hint}</KangurLessonCaption>
                <p className='text-lg font-extrabold text-violet-700'>{seq}</p>
                <KangurLessonCaption className='mt-1'>
                  Odpowiedź: <b>{answer}</b>
                </KangurLessonCaption>
              </KangurLessonCallout>
            ))}
          </div>
        </KangurLessonStack>
      ),
    },
    {
      title: 'Stały krok',
      content: (
        <KangurLessonStack>
          <KangurLessonLead>
            W ciągu arytmetycznym dodajemy tę samą liczbę na każdym kroku.
          </KangurLessonLead>
          <KangurLessonCallout accent='violet' className='w-full text-center' padding='sm'>
            <div className='mx-auto h-24 w-72 max-w-full'>
              <ArithmeticStepAnimation />
            </div>
            <KangurLessonCaption className='mt-2'>
              Ten sam krok powtarza się w każdym miejscu.
            </KangurLessonCaption>
          </KangurLessonCallout>
        </KangurLessonStack>
      ),
    },
    {
      title: 'Ciąg malejący',
      content: (
        <KangurLessonStack>
          <KangurLessonLead>
            W ciągu arytmetycznym możemy też odejmować stałą liczbę.
          </KangurLessonLead>
          <KangurLessonCallout accent='sky' className='w-full text-center' padding='sm'>
            <div className='mx-auto h-24 w-72 max-w-full'>
              <ArithmeticReverseAnimation />
            </div>
            <KangurLessonCaption className='mt-2'>
              Każdy krok to ten sam spadek.
            </KangurLessonCaption>
          </KangurLessonCallout>
        </KangurLessonStack>
      ),
    },
  ],
  ciagi_geom: [
    {
      title: 'Ciągi liczbowe — mnożenie i Fibonacci',
      content: (
        <KangurLessonStack>
          <KangurLessonLead>
            Gdy każda liczba jest wielokrotnością poprzedniej, ciąg rośnie bardzo szybko! To ciąg
            geometryczny.
          </KangurLessonLead>
          <div className='flex flex-col kangur-panel-gap w-full'>
            {[
              { hint: '×2 co krok', seq: '1, 2, 4, 8, 16, ❓', answer: '32' },
              { hint: '×3 co krok', seq: '2, 6, 18, 54, ❓', answer: '162' },
              {
                hint: 'Ciąg Fibonacciego (a+b=c)',
                seq: '1, 1, 2, 3, 5, 8, ❓',
                answer: '13 (5+8=13)',
              },
            ].map(({ hint, seq, answer }) => (
              <KangurLessonCallout key={hint} accent='violet' padding='sm'>
                <KangurLessonCaption className='mb-1'>{hint}</KangurLessonCaption>
                <p className='text-lg font-extrabold text-purple-700'>{seq}</p>
                <KangurLessonCaption className='mt-1'>
                  Odpowiedź: <b>{answer}</b>
                </KangurLessonCaption>
              </KangurLessonCallout>
            ))}
          </div>
        </KangurLessonStack>
      ),
    },
    {
      title: 'Wzrost geometryczny',
      content: (
        <KangurLessonStack>
          <KangurLessonLead>
            Gdy iloraz jest stały, każdy wyraz rośnie szybciej od poprzedniego.
          </KangurLessonLead>
          <KangurLessonCallout accent='violet' className='w-full text-center' padding='sm'>
            <div className='mx-auto w-72 max-w-full'>
              <GeometricGrowthAnimation />
            </div>
            <KangurLessonCaption className='mt-2'>
              Podwajanie daje coraz wyższe słupki.
            </KangurLessonCaption>
          </KangurLessonCallout>
        </KangurLessonStack>
      ),
    },
    {
      title: 'Fibonacci w ruchu',
      content: (
        <KangurLessonStack>
          <KangurLessonLead>
            Każdy wyraz to suma dwóch poprzednich.
          </KangurLessonLead>
          <KangurLessonCallout accent='amber' className='w-full text-center' padding='sm'>
            <div className='mx-auto w-72 max-w-full'>
              <FibonacciSumAnimation />
            </div>
            <KangurLessonCaption className='mt-2'>
              3 + 5 daje 8.
            </KangurLessonCaption>
          </KangurLessonCallout>
        </KangurLessonStack>
      ),
    },
    {
      title: 'Podwajanie w kropkach',
      content: (
        <KangurLessonStack>
          <KangurLessonLead>
            Geometria liczb może być widoczna jako rosnąca liczba kropek.
          </KangurLessonLead>
          <KangurLessonCallout accent='emerald' className='w-full text-center' padding='sm'>
            <div className='mx-auto w-72 max-w-full'>
              <GeometricDotsAnimation />
            </div>
            <KangurLessonCaption className='mt-2'>
              Każdy etap to dwa razy więcej elementów.
            </KangurLessonCaption>
          </KangurLessonCallout>
        </KangurLessonStack>
      ),
    },
  ],
  strategie: [
    {
      title: 'Jak szukać reguły?',
      content: (
        <KangurLessonStack>
          <KangurLessonCallout accent='slate' className='w-full border-violet-200/85'>
            <ol className='list-decimal list-inside space-y-3 text-sm [color:var(--kangur-page-text)]'>
              <li>
                <b>Policz elementy jednostki</b> — jak wiele przed powtórzeniem?
              </li>
              <li>
                <b>Sprawdź różnicę</b> — odejmij sąsiednie liczby. Czy jest stała?
              </li>
              <li>
                <b>Sprawdź iloraz</b> — podziel sąsiednie liczby. Czy jest stały?
              </li>
              <li>
                <b>Szukaj relacji dwóch poprzednich</b> — jak Fibonacci.
              </li>
              <li>
                <b>Zweryfikuj regułę</b> — sprawdź ją na wszystkich znanych elementach!
              </li>
            </ol>
          </KangurLessonCallout>
          <KangurLessonCallout accent='violet' className='w-full text-center' padding='sm'>
            <KangurLessonCaption>
              Ćwiczenie: <b>3, 6, 12, 24, ❓</b>
            </KangurLessonCaption>
            <p className='text-violet-600 font-bold text-sm mt-1'>
              Iloraz: 2, 2, 2 — stały! Reguła: ×2 → <b>48</b>
            </p>
          </KangurLessonCallout>
        </KangurLessonStack>
      ),
    },
    {
      title: 'Sprawdź różnicę i iloraz',
      content: (
        <KangurLessonStack>
          <KangurLessonLead>
            Najpierw sprawdź różnicę, a jeśli nie działa, poszukaj stałego ilorazu.
          </KangurLessonLead>
          <KangurLessonCallout accent='violet' className='w-full text-center' padding='sm'>
            <div className='mx-auto h-28 w-72 max-w-full'>
              <RuleCheckAnimation />
            </div>
            <KangurLessonCaption className='mt-2'>
              Dwie szybkie kontrole pomagają znaleźć regułę.
            </KangurLessonCaption>
          </KangurLessonCallout>
        </KangurLessonStack>
      ),
    },
    {
      title: 'Lista kontrolna',
      content: (
        <KangurLessonStack>
          <KangurLessonLead>
            Zawsze przechodź po tych samych krokach, a reguła szybko się ujawni.
          </KangurLessonLead>
          <KangurLessonCallout accent='violet' className='w-full text-center' padding='sm'>
            <div className='mx-auto h-28 w-72 max-w-full'>
              <RuleChecklistAnimation />
            </div>
            <KangurLessonCaption className='mt-2'>
              Odhaczaj kolejne pomysły, aż znajdziesz właściwy.
            </KangurLessonCaption>
          </KangurLessonCallout>
        </KangurLessonStack>
      ),
    },
    {
      title: 'Podsumowanie',
      content: (
        <KangurLessonStack>
          <KangurLessonCallout accent='amber' className='w-full'>
            <ul className='space-y-2 text-sm [color:var(--kangur-page-text)]'>
              <li>
                🔁 <b>Wzorzec AB/AAB</b> — powtarzająca się jednostka
              </li>
              <li>
                ➕ <b>Ciąg arytmetyczny</b> — stała różnica między elementami
              </li>
              <li>
                ✖️ <b>Ciąg geometryczny</b> — stały iloraz między elementami
              </li>
              <li>
                🌀 <b>Fibonacci</b> — suma dwóch poprzednich
              </li>
              <li>
                🔍 <b>Strategia</b> — szukaj różnicy, ilorazu lub relacji
              </li>
            </ul>
          </KangurLessonCallout>
          <p className='text-violet-600 font-bold text-center'>
            Wzorce i ciągi to podstawa matematyki i informatyki!
          </p>
        </KangurLessonStack>
      ),
    },
  ],
};

export const HUB_SECTIONS = [
  {
    id: 'intro',
    emoji: '🔢',
    title: 'Wzorce — wprowadzenie',
    description: 'Co to wzorzec? Kolory i kształty',
  },
  {
    id: 'ciagi_arytm',
    emoji: '➕',
    title: 'Ciągi arytmetyczne',
    description: 'Stała różnica co krok',
  },
  {
    id: 'ciagi_geom',
    emoji: '✖️',
    title: 'Ciągi geometryczne i Fibonacci',
    description: 'Mnożenie i specjalne ciągi',
  },
  {
    id: 'strategie',
    emoji: '🔍',
    title: 'Jak szukać reguły?',
    description: 'Strategia + podsumowanie',
  },
  {
    id: 'game_warsztat',
    emoji: '🛠️',
    title: 'Gra: Warsztat wzorców',
    description: 'Uzupełnij sekwencje i poznaj reguły',
    isGame: true,
  },
];

export default function LogicalPatternsLesson(): React.JSX.Element {
  return (
    <KangurUnifiedLesson
      progressMode='panel'
      lessonId='logical_patterns'
      lessonEmoji='🔢'
      lessonTitle='Wzorce i ciągi'
      sections={HUB_SECTIONS}
      slides={SLIDES}
      gradientClass='kangur-gradient-accent-violet'
      progressDotClassName='bg-violet-300'
      dotActiveClass='bg-violet-500'
      dotDoneClass='bg-violet-300'
      skipMarkFor={['game_warsztat']}
      games={[
        {
          sectionId: 'game_warsztat',
          stage: {
            accent: 'violet',
            icon: '🛠️',
            maxWidthClassName: 'max-w-3xl',
            shellTestId: 'logical-patterns-game-shell',
            title: 'Warsztat wzorców',
          },
          render: ({ onFinish }) => <LogicalPatternsWorkshopGame onFinish={onFinish} />,
        },
      ]}
    />
  );
}
