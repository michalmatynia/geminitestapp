import { useState } from 'react';

import LessonHub from '@/features/kangur/ui/components/LessonHub';
import LessonSlideSection, {
  type LessonSlide,
} from '@/features/kangur/ui/components/LessonSlideSection';
import {
  KangurLessonCallout,
  KangurLessonCaption,
  KangurLessonLead,
  KangurLessonStack,
} from '@/features/kangur/ui/design/lesson-primitives';
import { useLessonHubProgress } from '@/features/kangur/ui/hooks/useLessonHubProgress';

type SectionId =
  | 'wprowadzenie'
  | 'wzorce'
  | 'klasyfikacja'
  | 'wnioskowanie'
  | 'analogie'
  | 'zapamietaj';

const INTRO_SLIDES: LessonSlide[] = [
  {
    title: 'Co to jest myślenie logiczne? 🧠',
    content: (
      <KangurLessonStack>
        <KangurLessonLead>
          Myślenie logiczne to umiejętność zauważania zasad, porządkowania informacji i wyciągania
          wniosków krok po kroku.
        </KangurLessonLead>
        <KangurLessonCallout accent='violet' className='w-full text-sm [color:var(--kangur-page-text)]'>
          <p className='mb-2 font-semibold text-violet-700'>Logiczne myślenie pomaga:</p>
          <ul className='space-y-1'>
            <li>🔍 Znajdować wzorce i ciągi</li>
            <li>📦 Porządkować i grupować rzeczy</li>
            <li>💡 Rozwiązywać zagadki i łamigłówki</li>
            <li>✅ Sprawdzać, czy coś ma sens</li>
          </ul>
        </KangurLessonCallout>
      </KangurLessonStack>
    ),
  },
];

const PATTERN_SLIDES: LessonSlide[] = [
  {
    title: 'Wzorce i ciągi 🔢',
    content: (
      <KangurLessonStack>
        <KangurLessonLead>
          Wzorzec to powtarzający się układ. Gdy go znajdziesz, możesz przewidzieć, co będzie dalej!
        </KangurLessonLead>
        <KangurLessonCallout accent='sky' className='w-full text-center'>
          <KangurLessonCaption className='mb-2'>Co jest dalej?</KangurLessonCaption>
          <p className='text-3xl tracking-widest'>🔴 🔵 🔴 🔵 🔴 ❓</p>
          <p className='mt-2 font-bold text-blue-600'>
            Odpowiedź: 🔵 (wzorzec: czerwony – niebieski)
          </p>
        </KangurLessonCallout>
        <KangurLessonCallout accent='sky' className='w-full text-center'>
          <KangurLessonCaption className='mb-2'>Ciąg liczbowy – co dalej?</KangurLessonCaption>
          <p className='text-2xl font-extrabold text-blue-700'>2, 4, 6, 8, ❓</p>
          <p className='mt-2 font-bold text-blue-600'>Odpowiedź: 10 (co 2 w górę)</p>
        </KangurLessonCallout>
      </KangurLessonStack>
    ),
  },
];

const CLASSIFICATION_SLIDES: LessonSlide[] = [
  {
    title: 'Klasyfikacja – grupowanie 📦',
    content: (
      <KangurLessonStack>
        <KangurLessonLead>
          Klasyfikacja to układanie rzeczy w grupy według wspólnej cechy.
        </KangurLessonLead>
        <div className='grid w-full grid-cols-1 gap-3 min-[360px]:grid-cols-2'>
          <KangurLessonCallout accent='emerald' className='text-center' padding='sm'>
            <p className='mb-1 text-sm font-bold text-green-700'>Owoce</p>
            <p className='text-2xl'>🍎 🍌 🍇 🍓</p>
          </KangurLessonCallout>
          <KangurLessonCallout accent='amber' className='text-center' padding='sm'>
            <p className='mb-1 text-sm font-bold text-orange-700'>Warzywa</p>
            <p className='text-2xl'>🥕 🥦 🧅 🌽</p>
          </KangurLessonCallout>
          <KangurLessonCallout accent='sky' className='text-center' padding='sm'>
            <p className='mb-1 text-sm font-bold text-sky-700'>Zwierzęta morskie</p>
            <p className='text-2xl'>🐠 🐙 🦈 🐚</p>
          </KangurLessonCallout>
          <KangurLessonCallout accent='amber' className='text-center' padding='sm'>
            <p className='mb-1 text-sm font-bold text-yellow-700'>Zwierzęta lądowe</p>
            <p className='text-2xl'>🐘 🦁 🐄 🐇</p>
          </KangurLessonCallout>
        </div>
        <p className='text-center text-sm font-semibold text-violet-600'>
          Cecha wspólna to klucz do grupowania!
        </p>
      </KangurLessonStack>
    ),
  },
  {
    title: 'Znajdź intruza 🔎',
    content: (
      <KangurLessonStack>
        <KangurLessonLead>
          W każdej grupie jeden element do niej nie pasuje. Znajdź go i wyjaśnij dlaczego!
        </KangurLessonLead>
        <KangurLessonCallout accent='rose' className='w-full text-center'>
          <p className='mb-2 text-3xl'>🍎 🍌 🥕 🍇</p>
          <KangurLessonCaption>Który nie pasuje?</KangurLessonCaption>
          <p className='mt-2 font-bold text-rose-600'>🥕 – to warzywo, reszta to owoce</p>
        </KangurLessonCallout>
        <KangurLessonCallout accent='rose' className='w-full text-center'>
          <p className='mb-2 text-2xl font-extrabold [color:var(--kangur-page-text)]'>2, 4, 7, 8, 10</p>
          <KangurLessonCaption>Która liczba nie pasuje?</KangurLessonCaption>
          <p className='mt-2 font-bold text-rose-600'>7 – tylko ona jest nieparzysta</p>
        </KangurLessonCallout>
      </KangurLessonStack>
    ),
  },
];

const REASONING_SLIDES: LessonSlide[] = [
  {
    title: 'Wnioskowanie: jeśli... to... 💡',
    content: (
      <KangurLessonStack>
        <KangurLessonLead>
          Wnioskowanie to wyciąganie wniosków z tego, co wiemy. Używamy schematu: jeśli... to...
        </KangurLessonLead>
        <div className='flex w-full flex-col gap-3'>
          <KangurLessonCallout accent='indigo' padding='sm'>
            <p className='text-sm text-indigo-800'>
              <b>Jeśli</b> pada deszcz, <b>to</b> wezmę parasol. ☔
            </p>
          </KangurLessonCallout>
          <KangurLessonCallout accent='indigo' padding='sm'>
            <p className='text-sm text-indigo-800'>
              <b>Jeśli</b> wszystkie koty mają cztery łapy, a Mruczek jest kotem, <b>to</b> Mruczek
              ma cztery łapy. 🐱
            </p>
          </KangurLessonCallout>
          <KangurLessonCallout accent='indigo' padding='sm'>
            <p className='text-sm text-indigo-800'>
              <b>Jeśli</b> liczba jest parzysta, <b>to</b> dzieli się przez 2. Czy 6 jest parzyste?{' '}
              <b className='text-indigo-600'>Tak! 6 ÷ 2 = 3 ✓</b>
            </p>
          </KangurLessonCallout>
        </div>
      </KangurLessonStack>
    ),
  },
];

const ANALOGIES_SLIDES: LessonSlide[] = [
  {
    title: 'Analogie – co pasuje? 🔗',
    content: (
      <KangurLessonStack>
        <KangurLessonLead>
          Analogia to podobna relacja między różnymi parami. Uzupełnij brakujące ogniwo!
        </KangurLessonLead>
        <div className='flex w-full flex-col gap-3'>
          <KangurLessonCallout accent='violet' className='text-center' padding='sm'>
            <p className='text-sm [color:var(--kangur-page-text)]'>
              Ptak lata, ryba... <span className='font-bold text-purple-700'>pływa 🐟</span>
            </p>
          </KangurLessonCallout>
          <KangurLessonCallout accent='violet' className='text-center' padding='sm'>
            <p className='text-sm [color:var(--kangur-page-text)]'>
              Dzień jest do słońca, jak noc jest do...{' '}
              <span className='font-bold text-purple-700'>księżyca 🌙</span>
            </p>
          </KangurLessonCallout>
          <KangurLessonCallout accent='violet' className='text-center' padding='sm'>
            <p className='text-sm [color:var(--kangur-page-text)]'>
              2 jest do 4, jak 3 jest do...{' '}
              <span className='font-bold text-purple-700'>6 (×2)</span>
            </p>
          </KangurLessonCallout>
        </div>
      </KangurLessonStack>
    ),
  },
];

const SUMMARY_SLIDES: LessonSlide[] = [
  {
    title: 'Zapamiętaj! 🌟',
    content: (
      <KangurLessonStack>
        <KangurLessonCallout accent='amber' className='w-full'>
          <ul className='space-y-2 text-sm [color:var(--kangur-page-text)]'>
            <li>
              🔁 <b>Wzorzec</b> – znajdź regułę i przewiduj, co dalej
            </li>
            <li>
              📦 <b>Klasyfikacja</b> – grupuj według wspólnej cechy
            </li>
            <li>
              🔎 <b>Intruz</b> – jeden element łamie regułę grupy
            </li>
            <li>
              💡 <b>Jeśli... to...</b> – wyciągaj wnioski krok po kroku
            </li>
            <li>
              🔗 <b>Analogia</b> – ta sama relacja, inny przykład
            </li>
          </ul>
        </KangurLessonCallout>
        <p className='text-center font-bold text-violet-600'>
          Myślenie logiczne to supermoc! Ćwicz je każdego dnia. 🧠✨
        </p>
      </KangurLessonStack>
    ),
  },
];

export const SECTION_SLIDES: Record<SectionId, LessonSlide[]> = {
  wprowadzenie: INTRO_SLIDES,
  wzorce: PATTERN_SLIDES,
  klasyfikacja: CLASSIFICATION_SLIDES,
  wnioskowanie: REASONING_SLIDES,
  analogie: ANALOGIES_SLIDES,
  zapamietaj: SUMMARY_SLIDES,
};

export const SLIDES: LessonSlide[] = [
  ...INTRO_SLIDES,
  ...PATTERN_SLIDES,
  ...CLASSIFICATION_SLIDES,
  ...REASONING_SLIDES,
  ...ANALOGIES_SLIDES,
  ...SUMMARY_SLIDES,
];

export const HUB_SECTIONS = [
  {
    id: 'wprowadzenie',
    emoji: '🧠',
    title: 'Wprowadzenie',
    description: 'Czym jest myślenie logiczne?',
  },
  {
    id: 'wzorce',
    emoji: '🔢',
    title: 'Wzorce i ciągi',
    description: 'Powtarzające się układy i przewidywanie',
  },
  {
    id: 'klasyfikacja',
    emoji: '📦',
    title: 'Klasyfikacja',
    description: 'Grupowanie i szukanie intruza',
  },
  {
    id: 'wnioskowanie',
    emoji: '💡',
    title: 'Wnioskowanie',
    description: 'Myślenie krok po kroku: jeśli... to...',
  },
  {
    id: 'analogie',
    emoji: '🔗',
    title: 'Analogie',
    description: 'Ta sama relacja w nowym przykładzie',
  },
  {
    id: 'zapamietaj',
    emoji: '🌟',
    title: 'Zapamiętaj',
    description: 'Najważniejsze zasady logicznego myślenia',
  },
];

export default function LogicalThinkingLesson(): React.JSX.Element {
  const [activeSection, setActiveSection] = useState<SectionId | null>(null);
  const { markSectionOpened, markSectionViewedCount, sectionProgress } =
    useLessonHubProgress(SECTION_SLIDES);

  if (activeSection) {
    return (
      <LessonSlideSection
        slides={SECTION_SLIDES[activeSection]}
        sectionHeader={HUB_SECTIONS.find((section) => section.id === activeSection) ?? null}
        onBack={() => setActiveSection(null)}
        onProgressChange={(viewedCount) => markSectionViewedCount(activeSection, viewedCount)}
        dotActiveClass='bg-violet-500'
        dotDoneClass='bg-violet-300'
        gradientClass='from-violet-500 to-blue-500'
      />
    );
  }

  return (
    <LessonHub
      lessonEmoji='🧠'
      lessonTitle='Myślenie logiczne'
      gradientClass='from-violet-500 to-blue-500'
      progressDotClassName='bg-violet-300'
      sections={HUB_SECTIONS.map((section) => ({
        ...section,
        progress: sectionProgress[section.id as keyof typeof SECTION_SLIDES],
      }))}
      onSelect={(id) => {
        markSectionOpened(id as keyof typeof SECTION_SLIDES);
        setActiveSection(id as SectionId);
      }}
    />
  );
}
