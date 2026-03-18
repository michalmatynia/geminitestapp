'use client';

import type { LessonSlide } from '@/features/kangur/ui/components/LessonSlideSection';
import LogicalClassificationGame from '@/features/kangur/ui/components/LogicalClassificationGame';
import {
  ClassificationCategoryBinsAnimation,
  ClassificationCriteriaAxesAnimation,
  ClassificationCriteriaSwitchAnimation,
  ClassificationHiddenRuleAnimation,
  ClassificationOddOneOutAnimation,
  ClassificationOddOneOutPatternAnimation,
  ClassificationParityAnimation,
  ClassificationRecapSequenceAnimation,
  ClassificationSortByColorAnimation,
  ClassificationSortByShapeAnimation,
  ClassificationSortBySizeAnimation,
  ClassificationTwoCriteriaGridAnimation,
  ClassificationVennUnionAnimation,
  ClassificationVennOverlapAnimation,
} from '@/features/kangur/ui/components/LogicalLessonAnimations';
import {
  KangurLessonCallout,
  KangurLessonCaption,
  KangurLessonInset,
  KangurLessonLead,
  KangurLessonStack,
} from '@/features/kangur/ui/design/lesson-primitives';
import { KangurUnifiedLesson } from '@/features/kangur/ui/lessons/lesson-components';

type SectionId = 'intro' | 'diagram' | 'intruz' | 'podsumowanie' | 'game';
type SlideSectionId = Exclude<SectionId, 'game'>;

export const SLIDES: Record<SlideSectionId, LessonSlide[]> = {
  intro: [
    {
      title: 'Co to jest klasyfikacja?',
      content: (
        <KangurLessonStack>
          <KangurLessonLead>
            Klasyfikacja to układanie rzeczy w grupy według wspólnej cechy. To podstawa porządku w
            myśleniu i w życiu!
          </KangurLessonLead>
          <KangurLessonInset accent='teal' className='w-full' padding='sm'>
            <ClassificationSortByColorAnimation />
            <KangurLessonCaption className='mt-2'>
              Najpierw zauważ cechę — potem przyporządkuj do właściwej grupy.
            </KangurLessonCaption>
          </KangurLessonInset>
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
                📏 <b>Rozmiaru</b> — duże vs. małe
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
          <KangurLessonInset accent='emerald' className='w-full' padding='sm'>
            <ClassificationSortBySizeAnimation />
            <KangurLessonCaption className='mt-2'>
              Rozmiar to prosta cecha — duże i małe elementy tworzą różne zbiory.
            </KangurLessonCaption>
          </KangurLessonInset>
          <div className='grid w-full grid-cols-1 kangur-panel-gap min-[420px]:grid-cols-2'>
            <KangurLessonCallout accent='emerald' className='text-center' padding='sm'>
              <p className='font-bold text-green-700 text-xs mb-1'>Zwierzęta latające</p>
              <p className='text-2xl'>🦅 🦆 🐝 🦋</p>
              <KangurLessonCaption className='mt-1'>
                Cecha: mają skrzydła
              </KangurLessonCaption>
            </KangurLessonCallout>
            <KangurLessonCallout accent='sky' className='text-center' padding='sm'>
              <p className='font-bold text-blue-700 text-xs mb-1'>Zwierzęta wodne</p>
              <p className='text-2xl'>🐟 🐬 🦈 🐙</p>
              <KangurLessonCaption className='mt-1'>
                Cecha: żyją w wodzie
              </KangurLessonCaption>
            </KangurLessonCallout>
            <KangurLessonCallout accent='amber' className='text-center' padding='sm'>
              <p className='font-bold text-orange-700 text-xs mb-1'>Liczby parzyste</p>
              <p className='text-2xl font-extrabold text-orange-600'>2 4 6 8</p>
              <KangurLessonCaption className='mt-1'>
                Cecha: dzielą się przez 2
              </KangurLessonCaption>
            </KangurLessonCallout>
            <KangurLessonCallout accent='rose' className='text-center' padding='sm'>
              <p className='font-bold text-rose-700 text-xs mb-1'>Liczby nieparzyste</p>
              <p className='text-2xl font-extrabold text-rose-600'>1 3 5 7</p>
              <KangurLessonCaption className='mt-1'>
                Cecha: nie dzielą się przez 2
              </KangurLessonCaption>
            </KangurLessonCallout>
          </div>
        </KangurLessonStack>
      ),
    },
    {
      title: 'Sortowanie według kształtu',
      content: (
        <KangurLessonStack>
          <KangurLessonLead>
            Kształt to cecha, którą łatwo rozpoznać — wystarczy spojrzeć na krawędzie i kąty.
          </KangurLessonLead>
          <KangurLessonInset accent='sky' className='w-full' padding='sm'>
            <ClassificationSortByShapeAnimation />
            <KangurLessonCaption className='mt-2'>
              Koła i kwadraty trafiają do różnych pojemników.
            </KangurLessonCaption>
          </KangurLessonInset>
          <div className='grid w-full grid-cols-1 kangur-panel-gap min-[420px]:grid-cols-2'>
            <KangurLessonCallout accent='violet' className='text-center' padding='sm'>
              <p className='font-bold text-violet-700 text-xs mb-1'>Koła</p>
              <p className='text-2xl'>⚪ ⚪ ⚪</p>
              <KangurLessonCaption className='mt-1'>
                Cecha: brak kątów
              </KangurLessonCaption>
            </KangurLessonCallout>
            <KangurLessonCallout accent='sky' className='text-center' padding='sm'>
              <p className='font-bold text-blue-700 text-xs mb-1'>Kwadraty</p>
              <p className='text-2xl'>⬜ ⬜ ⬜</p>
              <KangurLessonCaption className='mt-1'>
                Cecha: cztery równe boki
              </KangurLessonCaption>
            </KangurLessonCallout>
          </div>
        </KangurLessonStack>
      ),
    },
    {
      title: 'Kategorie i sortowanie',
      content: (
        <KangurLessonStack>
          <KangurLessonLead>
            Kategorie to większe „pudełka” na rzeczy. Dzięki nim łatwo utrzymasz porządek.
          </KangurLessonLead>
          <KangurLessonInset accent='amber' className='w-full' padding='sm'>
            <ClassificationCategoryBinsAnimation />
            <KangurLessonCaption className='mt-2'>
              Każdy element ląduje w odpowiednim koszyku.
            </KangurLessonCaption>
          </KangurLessonInset>
          <KangurLessonCallout
            accent='amber'
            className='w-full text-sm [color:var(--kangur-page-muted-text)]'
          >
            <p className='font-semibold text-amber-700 mb-2'>Przykłady kategorii:</p>
            <ul className='space-y-1'>
              <li>🍎 Owoce</li>
              <li>🥕 Warzywa</li>
              <li>🧸 Zabawki</li>
            </ul>
          </KangurLessonCallout>
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
            Czasem trzeba wziąć pod uwagę dwie cechy jednocześnie. To trudniejsze, ale daje
            precyzyjniejszy podział.
          </KangurLessonLead>
          <KangurLessonInset accent='teal' className='w-full' padding='sm'>
            <ClassificationTwoCriteriaGridAnimation />
            <KangurLessonCaption className='mt-2'>
              Dwie cechy tworzą siatkę 2×2 — każda kratka to osobna grupa.
            </KangurLessonCaption>
          </KangurLessonInset>
          <KangurLessonInset accent='teal' className='w-full' padding='sm'>
            <ClassificationCriteriaAxesAnimation />
            <KangurLessonCaption className='mt-2'>
              Najpierw wybierz osie kryteriów, a potem przypisz elementy do pola.
            </KangurLessonCaption>
          </KangurLessonInset>
          <KangurLessonCallout accent='teal' className='w-full'>
            <p className='text-sm font-semibold text-teal-700 mb-3 text-center'>
              Figury: duże/małe × czerwone/niebieskie
            </p>
            <div className='grid grid-cols-1 gap-2 text-center text-sm min-[420px]:grid-cols-2'>
              {[
                ['Duże czerwone', '🔴🔴'],
                ['Duże niebieskie', '🔵🔵'],
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
              2 cechy × 2 wartości = 4 różne grupy
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
            Diagram Venna pokazuje, co należy do jednej grupy, do drugiej, lub do obu jednocześnie —
            to część wspólna (przecięcie).
          </KangurLessonLead>
          <KangurLessonInset accent='sky' className='w-full' padding='sm'>
            <ClassificationVennOverlapAnimation />
            <KangurLessonCaption className='mt-2'>
              Środek diagramu to część wspólna — elementy należące do obu grup.
            </KangurLessonCaption>
          </KangurLessonInset>
          <KangurLessonInset accent='sky' className='w-full' padding='sm'>
            <ClassificationVennUnionAnimation />
            <KangurLessonCaption className='mt-2'>
              Unia to wszystko, co jest w zbiorze A lub w zbiorze B.
            </KangurLessonCaption>
          </KangurLessonInset>
          <KangurLessonCallout accent='sky' className='w-full'>
            <KangurLessonCaption className='mb-3'>
              Kocha sport vs. kocha muzykę
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
    {
      title: 'Zmiana kryterium',
      content: (
        <KangurLessonStack>
          <KangurLessonLead>
            Te same elementy można posortować na różne sposoby — zależy od tego, jakie kryterium
            wybierzesz.
          </KangurLessonLead>
          <KangurLessonInset accent='teal' className='w-full' padding='sm'>
            <ClassificationCriteriaSwitchAnimation />
            <KangurLessonCaption className='mt-2'>
              Najpierw kolor, potem kształt — układ grup się zmienia.
            </KangurLessonCaption>
          </KangurLessonInset>
          <KangurLessonCallout
            accent='teal'
            className='w-full text-sm [color:var(--kangur-page-muted-text)]'
          >
            <p className='font-semibold text-teal-700 mb-2'>Wybierz kryterium:</p>
            <ul className='space-y-1'>
              <li>Najpierw najprostsza cecha (np. kolor).</li>
              <li>Potem dokładniejsza (np. kształt).</li>
            </ul>
          </KangurLessonCallout>
        </KangurLessonStack>
      ),
    },
  ],
  intruz: [
    {
      title: 'Znajdź intruza — poziom 1',
      content: (
        <KangurLessonStack>
          <KangurLessonLead>
            Jeden element nie pasuje do grupy. Znajdź go i wyjaśnij, dlaczego wyłamuje się z reguły.
          </KangurLessonLead>
          <KangurLessonInset accent='rose' className='w-full' padding='sm'>
            <ClassificationOddOneOutAnimation />
            <KangurLessonCaption className='mt-2'>
              Intruz łamie regułę — dlatego wyróżnia się na tle grupy.
            </KangurLessonCaption>
          </KangurLessonInset>
          <div className='flex flex-col kangur-panel-gap w-full'>
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
      title: 'Znajdź intruza — poziom 2',
      content: (
        <KangurLessonStack>
          <KangurLessonLead>
            Trudniejsze zagadki — intruz może być ukryty pod nieoczywistą cechą.
          </KangurLessonLead>
          <KangurLessonInset accent='amber' className='w-full' padding='sm'>
            <ClassificationHiddenRuleAnimation />
            <KangurLessonCaption className='mt-2'>
              Najpierw znajdź regułę, a potem element, który jej nie spełnia.
            </KangurLessonCaption>
          </KangurLessonInset>
          <div className='flex flex-col kangur-panel-gap w-full'>
            {[
              { items: '3, 6, 9, 12, 16', answer: '16 — nie jest wielokrotnością 3' },
              {
                items: '🌍 🌙 ☀️ ⭐ 🪐',
                answer: '🌙 — tylko księżyc nie świeci własnym światłem',
              },
              {
                items: 'kwadrat, trójkąt, koło, romb',
                answer: 'Koło — jedyna figura bez kątów i prostych boków',
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
    {
      title: 'Znajdź intruza — poziom 3',
      content: (
        <KangurLessonStack>
          <KangurLessonLead>
            Intruz może zaburzać wzór lub kolejność. Sprawdź, co się powtarza.
          </KangurLessonLead>
          <KangurLessonInset accent='rose' className='w-full' padding='sm'>
            <ClassificationOddOneOutPatternAnimation />
            <KangurLessonCaption className='mt-2'>
              Wzór się powtarza, ale jeden element go psuje.
            </KangurLessonCaption>
          </KangurLessonInset>
          <div className='flex flex-col kangur-panel-gap w-full'>
            {[
              { items: '⚪ ⬜ ⚪ 🔺 ⚪ ⬜', answer: '🔺 — inny kształt niż reszta' },
              { items: '🔴 🔵 🔴 🔵 🟢 🔴', answer: '🟢 — inny kolor w środku wzoru' },
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
  ],
  podsumowanie: [
    {
      title: 'Podsumowanie',
      content: (
        <KangurLessonStack>
          <KangurLessonInset accent='teal' className='w-full' padding='sm'>
            <ClassificationRecapSequenceAnimation />
            <KangurLessonCaption className='mt-2'>
              Pamiętaj: cecha, grupowanie, przecięcie i intruz.
            </KangurLessonCaption>
          </KangurLessonInset>
          <KangurLessonCallout accent='amber' className='w-full'>
            <ul className='space-y-2 text-sm [color:var(--kangur-page-text)]'>
              <li>
                🗂️ <b>Klasyfikacja</b> — grupuj według jednej wspólnej cechy
              </li>
              <li>
                🔀 <b>Wiele cech</b> — precyzyjny podział wymaga kilku kryteriów
              </li>
              <li>
                🔵🟡 <b>Diagram Venna</b> — część wspólna to przecięcie dwóch zbiorów
              </li>
              <li>
                🔎 <b>Intruz poz. 1</b> — oczywista cecha łamana przez jeden element
              </li>
              <li>
                🧩 <b>Intruz poz. 2</b> — nieoczywiste cechy ukryte głębiej
              </li>
              <li>
                🎯 <b>Intruz poz. 3</b> — zaburzony wzór lub sekwencja
              </li>
            </ul>
          </KangurLessonCallout>
          <p className='text-teal-600 font-bold text-center'>
            Klasyfikacja to klucz do porządku w świecie i w głowie!
          </p>
        </KangurLessonStack>
      ),
    },
    {
      title: 'Kolor',
      content: (
        <KangurLessonStack>
          <KangurLessonInset accent='teal' className='w-full text-center' padding='sm'>
            <ClassificationSortByColorAnimation />
            <KangurLessonCaption className='mt-2 text-center'>
              Kolor
            </KangurLessonCaption>
          </KangurLessonInset>
        </KangurLessonStack>
      ),
    },
    {
      title: 'Kształt',
      content: (
        <KangurLessonStack>
          <KangurLessonInset accent='sky' className='w-full text-center' padding='sm'>
            <ClassificationSortByShapeAnimation />
            <KangurLessonCaption className='mt-2 text-center'>
              Kształt
            </KangurLessonCaption>
          </KangurLessonInset>
        </KangurLessonStack>
      ),
    },
    {
      title: 'Parzyste i nieparzyste',
      content: (
        <KangurLessonStack>
          <KangurLessonInset accent='amber' className='w-full text-center' padding='sm'>
            <ClassificationParityAnimation />
            <KangurLessonCaption className='mt-2 text-center'>
              Parzyste i nieparzyste
            </KangurLessonCaption>
          </KangurLessonInset>
        </KangurLessonStack>
      ),
    },
    {
      title: 'Dwie cechy naraz',
      content: (
        <KangurLessonStack>
          <KangurLessonInset accent='emerald' className='w-full text-center' padding='sm'>
            <ClassificationTwoCriteriaGridAnimation />
            <KangurLessonCaption className='mt-2 text-center'>
              Dwie cechy naraz
            </KangurLessonCaption>
          </KangurLessonInset>
        </KangurLessonStack>
      ),
    },
    {
      title: 'Przecięcie zbiorów',
      content: (
        <KangurLessonStack>
          <KangurLessonInset accent='slate' className='w-full text-center' padding='sm'>
            <ClassificationVennOverlapAnimation />
            <KangurLessonCaption className='mt-2 text-center'>
              Przecięcie zbiorów
            </KangurLessonCaption>
          </KangurLessonInset>
        </KangurLessonStack>
      ),
    },
    {
      title: 'Intruz',
      content: (
        <KangurLessonStack>
          <KangurLessonInset accent='rose' className='w-full text-center' padding='sm'>
            <ClassificationOddOneOutPatternAnimation />
            <KangurLessonCaption className='mt-2 text-center'>
              Intruz
            </KangurLessonCaption>
          </KangurLessonInset>
        </KangurLessonStack>
      ),
    },
  ],
};

export const HUB_SECTIONS = [
  {
    id: 'intro',
    emoji: '📦',
    title: 'Klasyfikacja — wstęp',
    description: 'Co to klasyfikacja? Grupowanie według cech',
  },
  {
    id: 'diagram',
    emoji: '🔵🟡',
    title: 'Wiele cech i diagram Venna',
    description: 'Wielokryteriowe grupowanie i przecięcia zbiorów',
  },
  {
    id: 'intruz',
    emoji: '🔎',
    title: 'Znajdź intruza',
    description: 'Poziom 1, 2 i 3 — co nie pasuje?',
  },
  { id: 'podsumowanie', emoji: '📋', title: 'Podsumowanie', description: 'Wszystkie zasady razem' },
  {
    id: 'game',
    emoji: '🎯',
    title: 'Laboratorium klasyfikacji',
    description: 'Sortuj i znajdź intruza',
    isGame: true,
  },
];

export default function LogicalClassificationLesson(): React.JSX.Element {
  return (
    <KangurUnifiedLesson
      progressMode='panel'
      lessonId='logical_classification'
      lessonEmoji='📦'
      lessonTitle='Klasyfikacja'
      sections={HUB_SECTIONS}
      slides={SLIDES}
      gradientClass='kangur-gradient-accent-teal'
      progressDotClassName='bg-teal-300'
      dotActiveClass='bg-teal-500'
      dotDoneClass='bg-teal-300'
      skipMarkFor={['game']}
      games={[
        {
          sectionId: 'game',
          stage: {
            accent: 'teal',
            icon: '🎯',
            maxWidthClassName: 'max-w-3xl',
            shellTestId: 'logical-classification-game-shell',
            title: 'Laboratorium klasyfikacji',
          },
          render: ({ onFinish }) => <LogicalClassificationGame onFinish={onFinish} />,
        },
      ]}
    />
  );
}
