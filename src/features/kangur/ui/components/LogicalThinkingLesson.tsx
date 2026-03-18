'use client';

import type { LessonSlide } from '@/features/kangur/ui/components/LessonSlideSection';
import {
  LogicalAnalogyMapAnimation,
  LogicalAnalogiesAnimation,
  LogicalClassificationAnimation,
  LogicalClassificationKeyAnimation,
  LogicalPatternAnimation,
  LogicalPatternGrowthAnimation,
  LogicalReasoningAnimation,
  LogicalSummaryAnimation,
  LogicalThinkingIntroAnimation,
  LogicalThinkingStepsAnimation,
} from '@/features/kangur/ui/components/LogicalThinkingAnimations';
import LogicalThinkingLabGame from '@/features/kangur/ui/components/LogicalThinkingLabGame';
import LogicalIfThenStepsGame from '@/features/kangur/ui/components/LogicalIfThenStepsGame';
import {
  KangurLessonCallout,
  KangurLessonCaption,
  KangurLessonInset,
  KangurLessonLead,
  KangurLessonStack,
} from '@/features/kangur/ui/design/lesson-primitives';
import type { LessonHubSectionProgress } from '@/features/kangur/ui/hooks/useLessonHubProgress';
import { KangurUnifiedLesson } from '@/features/kangur/ui/lessons/lesson-components';
import type { KangurUnifiedLessonSection } from '@/features/kangur/ui/components/KangurUnifiedLesson';

type SectionId =
  | 'wprowadzenie'
  | 'wzorce'
  | 'klasyfikacja'
  | 'wnioskowanie'
  | 'wnioskowanie_gra'
  | 'laboratorium_gra'
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
        <KangurLessonCallout accent='violet' className='w-full text-center' padding='sm'>
          <div className='mx-auto h-20 w-40 max-w-full'>
            <LogicalThinkingIntroAnimation />
          </div>
          <KangurLessonCaption className='mt-2'>
            Najpierw obserwujesz, potem łączysz fakty i wyciągasz wniosek.
          </KangurLessonCaption>
        </KangurLessonCallout>
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
  {
    title: 'Trzy kroki logiki 🧩',
    content: (
      <KangurLessonStack>
        <KangurLessonLead>
          Najpierw obserwujesz, potem łączysz fakty, a na końcu sprawdzasz wniosek.
        </KangurLessonLead>
        <KangurLessonCallout accent='violet' className='w-full text-center' padding='sm'>
          <div className='mx-auto h-28 w-56 max-w-full sm:h-32 sm:w-64'>
            <LogicalThinkingStepsAnimation />
          </div>
          <KangurLessonCaption className='mt-2'>
            Obserwuj → łącz → wniosek.
          </KangurLessonCaption>
        </KangurLessonCallout>
        <KangurLessonCallout accent='violet' className='w-full text-center'>
          <KangurLessonCaption className='mb-2'>Spróbuj znaleźć regułę:</KangurLessonCaption>
          <p className='text-2xl font-extrabold text-violet-700'>🔺 🔺 🔵 🔺 🔺 🔵 ❓</p>
          <p className='mt-2 font-bold text-violet-600'>
            Odpowiedź: 🔺 🔺 🔵 (powtarza się układ).
          </p>
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
        <KangurLessonCallout accent='sky' className='w-full text-center' padding='sm'>
          <div className='mx-auto h-20 w-40 max-w-full'>
            <LogicalPatternAnimation />
          </div>
          <KangurLessonCaption className='mt-2'>
            Wzorzec powtarza się w stałym rytmie.
          </KangurLessonCaption>
        </KangurLessonCallout>
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
  {
    title: 'Wzorzec rośnie 📈',
    content: (
      <KangurLessonStack>
        <KangurLessonLead>
          Wzorzec może się powtarzać i jednocześnie rosnąć. To też jest reguła!
        </KangurLessonLead>
        <KangurLessonCallout accent='sky' className='w-full text-center' padding='sm'>
          <div className='mx-auto h-20 w-40 max-w-full'>
            <LogicalPatternGrowthAnimation />
          </div>
          <KangurLessonCaption className='mt-2'>
            Każdy kolejny element jest większy.
          </KangurLessonCaption>
        </KangurLessonCallout>
        <KangurLessonCallout accent='sky' className='w-full text-center'>
          <KangurLessonCaption className='mb-2'>Ciąg rosnący – co dalej?</KangurLessonCaption>
          <p className='text-2xl font-extrabold text-sky-700'>1, 2, 4, 8, ❓</p>
          <p className='mt-2 font-bold text-sky-600'>Odpowiedź: 16 (×2)</p>
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
        <KangurLessonCallout accent='emerald' className='w-full text-center' padding='sm'>
          <div className='mx-auto h-20 w-40 max-w-full'>
            <LogicalClassificationAnimation />
          </div>
          <KangurLessonCaption className='mt-2'>
            Ta sama cecha prowadzi do tej samej grupy.
          </KangurLessonCaption>
        </KangurLessonCallout>
        <div className='grid w-full grid-cols-1 kangur-panel-gap min-[420px]:grid-cols-2'>
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
    title: 'Klucz klasyfikacji 🗝️',
    content: (
      <KangurLessonStack>
        <KangurLessonLead>
          Najpierw wybierasz cechę, a potem elementy trafiają do właściwej grupy.
        </KangurLessonLead>
        <KangurLessonCallout accent='emerald' className='w-full text-center' padding='sm'>
          <div className='mx-auto h-28 w-56 max-w-full sm:h-32 sm:w-64'>
            <LogicalClassificationKeyAnimation />
          </div>
          <KangurLessonCaption className='mt-2'>
            Jedna cecha = jedna decyzja.
          </KangurLessonCaption>
        </KangurLessonCallout>
        <KangurLessonCallout accent='emerald' className='w-full text-center'>
          <KangurLessonCaption className='mb-2'>Cecha: ma skrzydła</KangurLessonCaption>
          <p className='text-2xl'>🕊️ 🐝 🐟 🐶</p>
          <p className='mt-2 font-bold text-emerald-600'>Grupa "tak": 🕊️ 🐝</p>
        </KangurLessonCallout>
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
        <KangurLessonCallout accent='indigo' className='w-full text-center' padding='sm'>
          <div className='mx-auto h-28 w-56 max-w-full sm:h-32 sm:w-64'>
            <LogicalReasoningAnimation />
          </div>
          <KangurLessonCaption className='mt-2'>
            Jeśli spełniony jest warunek, to pojawia się wniosek.
          </KangurLessonCaption>
        </KangurLessonCallout>
        <div className='flex w-full flex-col kangur-panel-gap'>
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

const REASONING_GAME_SLIDES: LessonSlide[] = [
  {
    title: 'Gra: Jeśli… to… krok po kroku',
    containerClassName: 'max-w-[min(760px,90vw)]',
    panelClassName: 'w-full mx-auto lg:w-[min(760px,90vw)]',
    content: (
      <KangurLessonStack>
        <KangurLessonLead>
          Ułóż fakt, regułę i wniosek w odpowiedniej kolejności.
        </KangurLessonLead>
        <KangurLessonInset accent='indigo' className='w-full' padding='sm'>
          <LogicalIfThenStepsGame />
        </KangurLessonInset>
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
        <KangurLessonCallout accent='violet' className='w-full text-center' padding='sm'>
          <div className='mx-auto h-20 w-40 max-w-full'>
            <LogicalAnalogiesAnimation />
          </div>
          <KangurLessonCaption className='mt-2'>
            Szukamy tej samej relacji w dwóch parach.
          </KangurLessonCaption>
        </KangurLessonCallout>
        <div className='flex w-full flex-col kangur-panel-gap'>
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
  {
    title: 'Mapa analogii 🧭',
    content: (
      <KangurLessonStack>
        <KangurLessonLead>
          Sprawdź relację w pierwszej parze i przenieś ją na drugą.
        </KangurLessonLead>
        <KangurLessonCallout accent='violet' className='w-full text-center' padding='sm'>
          <div className='mx-auto h-20 w-40 max-w-full'>
            <LogicalAnalogyMapAnimation />
          </div>
          <KangurLessonCaption className='mt-2'>
            Relacja A → B powtarza się w C → D.
          </KangurLessonCaption>
        </KangurLessonCallout>
        <KangurLessonCallout accent='violet' className='w-full text-center' padding='sm'>
          <p className='text-sm [color:var(--kangur-page-text)]'>
            Nóż : kroi = pędzel :{' '}
            <span className='font-bold text-purple-700'>maluje 🎨</span>
          </p>
        </KangurLessonCallout>
      </KangurLessonStack>
    ),
  },
];

const SUMMARY_SLIDES: LessonSlide[] = [
  {
    title: 'Zapamiętaj! 🌟',
    content: (
      <KangurLessonStack>
        <KangurLessonCallout accent='amber' className='w-full text-center' padding='sm'>
          <div className='mx-auto h-20 w-40 max-w-full'>
            <LogicalSummaryAnimation />
          </div>
          <KangurLessonCaption className='mt-2'>
            Zapamiętaj najważniejsze pojęcia i wracaj do nich często.
          </KangurLessonCaption>
        </KangurLessonCallout>
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

const LAB_GAME_SLIDES: LessonSlide[] = [
  {
    title: 'Gra: Logiczne Laboratorium 🧪',
    containerClassName: 'max-w-[min(760px,90vw)]',
    panelClassName: 'w-full mx-auto lg:w-[min(760px,90vw)]',
    content: (
      <KangurLessonStack>
        <KangurLessonLead>
          Wykonaj trzy misje: wzorzec, klasyfikacja i analogia. Przeciągaj i klikaj!
        </KangurLessonLead>
        <KangurLessonCallout accent='violet' className='w-full' padding='sm'>
          <LogicalThinkingLabGame />
        </KangurLessonCallout>
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
  wnioskowanie_gra: REASONING_GAME_SLIDES,
  laboratorium_gra: LAB_GAME_SLIDES,
};

export const SLIDES: LessonSlide[] = [
  ...INTRO_SLIDES,
  ...PATTERN_SLIDES,
  ...CLASSIFICATION_SLIDES,
  ...REASONING_SLIDES,
  ...ANALOGIES_SLIDES,
  ...SUMMARY_SLIDES,
  ...REASONING_GAME_SLIDES,
  ...LAB_GAME_SLIDES,
];

export const HUB_SECTIONS: ReadonlyArray<
  KangurUnifiedLessonSection<SectionId> & { description: string }
> = [
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
  {
    id: 'wnioskowanie_gra',
    emoji: '🎮',
    title: 'Gra: Jeśli… to…',
    description: 'Układanie faktów, reguły i wniosku',
    isGame: true,
  },
  {
    id: 'laboratorium_gra',
    emoji: '🎮',
    title: 'Gra: Logiczne Laboratorium 🧪',
    description: 'Wzorzec, klasyfikacja i analogia',
    isGame: true,
  },
];

const SECTION_LABELS: Partial<Record<SectionId, string>> = Object.fromEntries(
  HUB_SECTIONS.filter((section) => !section.isGame).map((section) => [
    section.id,
    section.title,
  ])
);

export default function LogicalThinkingLesson(): React.JSX.Element {
  return (
    <KangurUnifiedLesson
      progressMode='panel'
      lessonId='logical_thinking'
      lessonEmoji='🧠'
      lessonTitle='Myślenie logiczne'
      sections={HUB_SECTIONS}
      slides={SECTION_SLIDES}
      gradientClass='kangur-gradient-accent-indigo'
      progressDotClassName='bg-violet-300'
      dotActiveClass='bg-violet-500'
      dotDoneClass='bg-violet-300'
      sectionLabels={SECTION_LABELS}
      buildHubSections={(sections, sectionProgress) => {
        const typedProgress = sectionProgress as Partial<Record<SectionId, LessonHubSectionProgress>>;
        return sections.map((section) => ({
          ...section,
          progress: typedProgress[section.id],
        }));
      }}
    />
  );
}
