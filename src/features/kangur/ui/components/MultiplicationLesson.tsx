import { useState } from 'react';

import LessonActivityStage from '@/features/kangur/ui/components/LessonActivityStage';
import LessonHub from '@/features/kangur/ui/components/LessonHub';
import LessonSlideSection, {
  type LessonSlide,
} from '@/features/kangur/ui/components/LessonSlideSection';
import {
  AddingAbacusAnimation,
  AddingColumnAnimation,
  AddingCommutativeAnimation,
  AddingCrossTenSvgAnimation,
  AddingMakeTenPairsAnimation,
  AddingNumberLineAnimation,
  AddingSvgAnimation,
  AddingTenFrameAnimation,
  AddingTwoDigitAnimation,
  AddingZeroAnimation,
  MultiplicationArrayAnimation,
  MultiplicationCommutativeAnimation,
  MultiplicationGroupsAnimation,
} from '@/features/kangur/ui/components/LessonAnimations';
import MultiplicationArrayGame from '@/features/kangur/ui/components/MultiplicationArrayGame';
import MultiplicationGame from '@/features/kangur/ui/components/MultiplicationGame';
import {
  KangurLessonCallout,
  KangurLessonCaption,
  KangurLessonInset,
  KangurLessonLead,
  KangurLessonStack,
} from '@/features/kangur/ui/design/lesson-primitives';
import {
  KangurDisplayEmoji,
  KangurEquationDisplay,
  KangurStatusChip,
} from '@/features/kangur/ui/design/primitives';
import { useLessonHubProgress } from '@/features/kangur/ui/hooks/useLessonHubProgress';

type SectionId =
  | 'intro'
  | 'animacje'
  | 'tabela23'
  | 'tabela45'
  | 'triki'
  | 'game_array'
  | 'game_quiz';

const MULTIPLICATION_ANIMATION_SLIDES: LessonSlide[] = [
  {
    title: 'Mnożenie jako grupy',
    content: (
      <KangurLessonStack>
        <KangurLessonLead>
          Mnożenie to powtarzane dodawanie równych grup.
        </KangurLessonLead>
        <KangurLessonCallout accent='violet' className='text-center'>
          <div className='mx-auto w-full max-w-sm'>
            <MultiplicationGroupsAnimation />
          </div>
          <KangurEquationDisplay accent='violet' className='mt-2' size='sm'>
            3 × 4 = 12
          </KangurEquationDisplay>
          <KangurLessonCaption className='mt-1'>3 grupy po 4.</KangurLessonCaption>
        </KangurLessonCallout>
      </KangurLessonStack>
    ),
  },
  {
    title: 'Rzędy w tablicy',
    content: (
      <KangurLessonStack>
        <KangurLessonLead>
          Każdy rząd ma tyle samo elementów, więc łatwo liczyć skokami.
        </KangurLessonLead>
        <KangurLessonCallout accent='indigo' className='text-center'>
          <div className='mx-auto w-full max-w-sm'>
            <MultiplicationArrayAnimation />
          </div>
          <KangurEquationDisplay accent='indigo' className='mt-2' size='sm'>
            4 + 4 + 4 = 12
          </KangurEquationDisplay>
          <KangurLessonCaption className='mt-1'>Skoki co 4: 4, 8, 12.</KangurLessonCaption>
        </KangurLessonCallout>
      </KangurLessonStack>
    ),
  },
];

const ADDITION_ANIMATION_SLIDES: LessonSlide[] = [
  {
    title: 'Dodawanie w ruchu (SVG)',
    content: (
      <KangurLessonStack>
        <KangurLessonLead>
          Animacja pokazuje, jak dwie grupy przesuwają się i łączą w jedną sumę.
        </KangurLessonLead>
        <KangurLessonCallout accent='teal' className='max-w-md text-center'>
          <div className='mx-auto w-full max-w-sm'>
            <AddingSvgAnimation />
          </div>
          <KangurEquationDisplay accent='teal' className='mt-2' size='sm'>
            2 + 3 = 5
          </KangurEquationDisplay>
          <KangurLessonCaption className='mt-1'>
            Kropki łączą się w jedną grupę i tworzą sumę.
          </KangurLessonCaption>
        </KangurLessonCallout>
      </KangurLessonStack>
    ),
  },
  {
    title: 'Dodawanie z przekroczeniem 10',
    content: (
      <KangurLessonStack>
        <KangurLessonLead>
          Gdy suma przekracza 10, mozesz uzupełnic do 10 i dodac reszte.
        </KangurLessonLead>
        <KangurLessonCallout accent='sky' className='text-center'>
          <div className='mx-auto w-full max-w-sm'>
            <AddingCrossTenSvgAnimation />
          </div>
          <KangurEquationDisplay accent='sky'>7 + 5 = ?</KangurEquationDisplay>
          <KangurLessonCaption className='mt-2'>
            7 + <b>3</b> = 10, zostaje jeszcze <b>2</b>, więc 10 + 2 = <b>12</b> ✓
          </KangurLessonCaption>
        </KangurLessonCallout>
      </KangurLessonStack>
    ),
  },
  {
    title: 'Skoki na osi liczbowej',
    content: (
      <KangurLessonStack>
        <KangurLessonLead>Skocz do 10, a potem dodaj resztę.</KangurLessonLead>
        <KangurLessonCallout accent='sky' className='text-center'>
          <div className='mx-auto w-full max-w-sm'>
            <AddingNumberLineAnimation />
          </div>
          <KangurEquationDisplay accent='sky'>8 + 5 = 13</KangurEquationDisplay>
          <KangurLessonCaption className='mt-2'>
            8 + <b>2</b> = 10, zostaje <b>3</b>, więc 10 + 3 = <b>13</b>.
          </KangurLessonCaption>
        </KangurLessonCallout>
      </KangurLessonStack>
    ),
  },
  {
    title: 'Ramka dziesiątki',
    content: (
      <KangurLessonStack>
        <KangurLessonLead>
          Wypełnij brakujące pola do 10, a resztę dodaj obok.
        </KangurLessonLead>
        <KangurLessonCallout accent='sky' className='text-center'>
          <div className='mx-auto w-full max-w-sm'>
            <AddingTenFrameAnimation />
          </div>
          <KangurEquationDisplay accent='sky'>7 + 5 = 12</KangurEquationDisplay>
          <KangurLessonCaption className='mt-2'>
            Najpierw <b>+3</b> do 10, potem jeszcze <b>+2</b>.
          </KangurLessonCaption>
        </KangurLessonCallout>
      </KangurLessonStack>
    ),
  },
  {
    title: 'Dodawanie dwucyfrowe w ruchu',
    content: (
      <KangurLessonStack>
        <KangurLessonLead>
          Najpierw zsumuj dziesiatki, potem jednosci. Animacja pokazuje, jak grupy
          łączą się w wynik.
        </KangurLessonLead>
        <KangurLessonCallout accent='emerald' className='text-center'>
          <div className='mx-auto w-full max-w-sm'>
            <AddingTwoDigitAnimation />
          </div>
          <KangurEquationDisplay accent='emerald' className='mt-2' size='sm'>
            24 + 13 = 37
          </KangurEquationDisplay>
          <KangurLessonCaption className='mt-1'>
            Dziesiatki: 20 + 10, jednosci: 4 + 3.
          </KangurLessonCaption>
        </KangurLessonCallout>
      </KangurLessonStack>
    ),
  },
  {
    title: 'Kolumny dziesiatek i jednosci',
    content: (
      <KangurLessonStack>
        <KangurLessonLead>
          Uloz liczby w kolumnach: dziesiatki pod dziesiatkami, jednosci pod
          jednosciami. Potem dodaj osobno.
        </KangurLessonLead>
        <KangurLessonCallout accent='emerald' className='text-center'>
          <div className='mx-auto w-full max-w-sm'>
            <AddingColumnAnimation />
          </div>
          <KangurLessonCaption className='mt-1'>
            Najpierw dziesiatki, potem jednosci. Wynik sklada sie z obu kolumn.
          </KangurLessonCaption>
        </KangurLessonCallout>
      </KangurLessonStack>
    ),
  },
  {
    title: 'Liczydlo',
    content: (
      <KangurLessonStack>
        <KangurLessonLead>
          Liczydlo pomaga przesuwac koraliki: osobno dziesiatki i jednosci, a potem
          odczytac sume.
        </KangurLessonLead>
        <KangurLessonCallout accent='emerald' className='text-center'>
          <div className='mx-auto w-full max-w-sm'>
            <AddingAbacusAnimation />
          </div>
          <KangurLessonCaption className='mt-1'>
            Koraliki przesuwaja sie do wspolnej sumy.
          </KangurLessonCaption>
        </KangurLessonCallout>
      </KangurLessonStack>
    ),
  },
  {
    title: 'Zapamiętaj!',
    content: (
      <KangurLessonStack>
        <KangurLessonCallout accent='amber' className='max-w-xs'>
          <ul className='space-y-2 text-sm [color:var(--kangur-page-text)]'>
            <li>
              ✅ Kolejnosc nie ma znaczenia: <b>3+5 = 5+3</b>
            </li>
            <li>
              ✅ Dodawanie 0 nic nie zmienia: <b>7+0 = 7</b>
            </li>
            <li>✅ Zacznij od wiekszej liczby, zeby liczyc szybciej!</li>
            <li>✅ Grupuj do 10 przy przekroczeniu</li>
            <li>✅ Szukaj par do 10 (np. 6 + 4 = 10)</li>
          </ul>
        </KangurLessonCallout>
        <div className='grid gap-3 sm:grid-cols-2 lg:grid-cols-3'>
          <KangurLessonInset accent='slate' className='text-center'>
            <AddingCommutativeAnimation />
            <KangurLessonCaption className='mt-2'>
              Kolejność składników nie zmienia wyniku.
            </KangurLessonCaption>
          </KangurLessonInset>
          <KangurLessonInset accent='slate' className='text-center'>
            <AddingZeroAnimation />
            <KangurLessonCaption className='mt-2'>Dodanie zera nic nie zmienia.</KangurLessonCaption>
          </KangurLessonInset>
          <KangurLessonInset accent='slate' className='text-center'>
            <AddingMakeTenPairsAnimation />
            <KangurLessonCaption className='mt-2'>
              Szukaj par do 10 (np. 6 + 4).
            </KangurLessonCaption>
          </KangurLessonInset>
        </div>
      </KangurLessonStack>
    ),
  },
];

const ALL_ANIMATION_SLIDES: LessonSlide[] = [
  ...MULTIPLICATION_ANIMATION_SLIDES,
  ...ADDITION_ANIMATION_SLIDES,
];

export const SLIDES: Record<Exclude<SectionId, 'game_array' | 'game_quiz'>, LessonSlide[]> = {
  intro: [
    {
      title: 'Co to znaczy mnozyc?',
      content: (
        <KangurLessonStack>
          <KangurLessonLead>
            Mnozenie to skrócone dodawanie tej samej liczby kilka razy.
          </KangurLessonLead>
          <KangurLessonStack gap='sm'>
            <KangurDisplayEmoji size='xs'>🍬🍬🍬 🍬🍬🍬 🍬🍬🍬</KangurDisplayEmoji>
            <KangurLessonCaption>3 grupy po 3 cukierki</KangurLessonCaption>
            <KangurEquationDisplay
              accent='violet'
              data-testid='multiplication-lesson-intro-equation'
              size='md'
            >
              3 × 3 = 9
            </KangurEquationDisplay>
            <KangurLessonCaption>(to samo co 3+3+3=9)</KangurLessonCaption>
          </KangurLessonStack>
        </KangurLessonStack>
      ),
    },
    ...MULTIPLICATION_ANIMATION_SLIDES,
    ...ADDITION_ANIMATION_SLIDES,
  ],
  animacje: ALL_ANIMATION_SLIDES,
  tabela23: [
    {
      title: 'Tabliczka mnożenia × 2 i × 3',
      content: (
        <div className='flex flex-col gap-2 w-full'>
          <div className='grid grid-cols-1 gap-2 min-[360px]:grid-cols-2'>
            {[2, 3].map((base) => (
              <KangurLessonCallout key={base} accent='violet' className='rounded-xl' padding='sm'>
                <KangurStatusChip
                  accent='violet'
                  className='mb-2 flex w-full justify-center text-[11px] font-extrabold'
                  size='sm'
                >
                  × {base}
                </KangurStatusChip>
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                  <p key={n} className='text-center text-xs [color:var(--kangur-page-text)]'>
                    {n} × {base} = <b>{n * base}</b>
                  </p>
                ))}
              </KangurLessonCallout>
            ))}
          </div>
        </div>
      ),
    },
  ],
  tabela45: [
    {
      title: 'Tabliczka mnożenia × 4 i × 5',
      content: (
        <div className='flex flex-col gap-2 w-full'>
          <div className='grid grid-cols-1 gap-2 min-[360px]:grid-cols-2'>
            {[4, 5].map((base) => (
              <KangurLessonCallout key={base} accent='indigo' className='rounded-xl' padding='sm'>
                <KangurStatusChip
                  accent='indigo'
                  className='mb-2 flex w-full justify-center text-[11px] font-extrabold'
                  size='sm'
                >
                  × {base}
                </KangurStatusChip>
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                  <p key={n} className='text-center text-xs [color:var(--kangur-page-text)]'>
                    {n} × {base} = <b>{n * base}</b>
                  </p>
                ))}
              </KangurLessonCallout>
            ))}
          </div>
        </div>
      ),
    },
  ],
  triki: [
    {
      title: 'Triki do zapamiętania',
      content: (
        <KangurLessonStack className='gap-3'>
          <KangurLessonCallout accent='amber' className='max-w-xs'>
            <ul className='space-y-2 text-sm [color:var(--kangur-page-text)]'>
              <li>
                ✖️ × 1 = ta sama liczba: <b>7×1=7</b>
              </li>
              <li>
                ✖️ × 2 = podwojnie: <b>6×2=12</b>
              </li>
              <li>
                ✖️ × 5 = konczy sie na 0 lub 5: <b>7×5=35</b>
              </li>
              <li>
                ✖️ × 10 = dodaj zero: <b>8×10=80</b>
              </li>
              <li>
                ✅ Kolejnosc nie ma znaczenia: <b>3×4=4×3</b>
              </li>
            </ul>
          </KangurLessonCallout>
        </KangurLessonStack>
      ),
    },
    {
      title: 'Kolejność czynników',
      content: (
        <KangurLessonStack>
          <KangurLessonLead>3 × 4 to to samo co 4 × 3.</KangurLessonLead>
          <KangurLessonCallout accent='amber' className='max-w-sm text-center'>
            <div className='mx-auto w-full max-w-xs'>
              <MultiplicationCommutativeAnimation />
            </div>
            <KangurLessonCaption className='mt-2'>
              Zamiana czynników nie zmienia wyniku.
            </KangurLessonCaption>
          </KangurLessonCallout>
        </KangurLessonStack>
      ),
    },
  ],
};

export const HUB_SECTIONS = [
  {
    id: 'intro',
    emoji: '🍬',
    title: 'Co to mnożenie?',
    description: 'Mnozenie jako powtarzane dodawanie',
  },
  {
    id: 'animacje',
    emoji: '🎞️',
    title: 'Animacje',
    description: 'Mnozenie + animacje z dodawania',
  },
  {
    id: 'tabela23',
    emoji: '📋',
    title: 'Tabliczka × 2 i × 3',
    description: 'Tabliczka mnożenia dla 2 i 3',
  },
  {
    id: 'tabela45',
    emoji: '📋',
    title: 'Tabliczka × 4 i × 5',
    description: 'Tabliczka mnożenia dla 4 i 5',
  },
  {
    id: 'triki',
    emoji: '🧠',
    title: 'Triki mnożenia',
    description: 'Szybkie zasady do zapamiętania',
  },
  {
    id: 'game_array',
    emoji: '✨',
    title: 'Gra z grupami',
    description: 'Zbieraj grupy kropek — odkryj mnożenie!',
    isGame: true,
  },
  {
    id: 'game_quiz',
    emoji: '📝',
    title: 'Quiz tabliczki',
    description: 'Sprawdź tabliczkę — 8 pytań',
    isGame: true,
  },
];

export default function MultiplicationLesson(): React.JSX.Element {
  const [activeSection, setActiveSection] = useState<SectionId | null>(null);
  const { markSectionOpened, markSectionViewedCount, sectionProgress } =
    useLessonHubProgress(SLIDES);

  if (activeSection === 'game_array') {
    return (
      <LessonActivityStage
        accent='violet'
        headerTestId='multiplication-lesson-game-array-header'
        icon='✨'
        maxWidthClassName='max-w-sm'
        onBack={() => setActiveSection(null)}
        sectionHeader={HUB_SECTIONS.find((section) => section.id === activeSection) ?? null}
        shellTestId='multiplication-lesson-game-array-shell'
        title='Gra z grupami!'
      >
        <MultiplicationArrayGame
          finishLabel='Wróć do tematów'
          onFinish={() => setActiveSection(null)}
        />
      </LessonActivityStage>
    );
  }

  if (activeSection === 'game_quiz') {
    return (
      <LessonActivityStage
        accent='violet'
        headerTestId='multiplication-lesson-game-quiz-header'
        icon='📝'
        maxWidthClassName='max-w-sm'
        onBack={() => setActiveSection(null)}
        sectionHeader={HUB_SECTIONS.find((section) => section.id === activeSection) ?? null}
        shellTestId='multiplication-lesson-game-quiz-shell'
        title='Quiz mnożenia!'
      >
        <MultiplicationGame
          finishLabel='Wróć do tematów'
          onFinish={() => setActiveSection(null)}
        />
      </LessonActivityStage>
    );
  }

  if (activeSection) {
    return (
      <LessonSlideSection
        slides={SLIDES[activeSection]}
        sectionHeader={HUB_SECTIONS.find((section) => section.id === activeSection) ?? null}
        onBack={() => setActiveSection(null)}
        onProgressChange={(viewedCount) => markSectionViewedCount(activeSection, viewedCount)}
        dotActiveClass='bg-purple-500'
        dotDoneClass='bg-purple-300'
        gradientClass='kangur-gradient-accent-indigo'
      />
    );
  }

  return (
    <LessonHub
      lessonEmoji='✖️'
      lessonTitle='Mnozenie'
      gradientClass='kangur-gradient-accent-indigo'
      progressDotClassName='bg-purple-300'
      sections={HUB_SECTIONS.map((section) =>
        section.isGame
          ? section
          : {
            ...section,
            progress: sectionProgress[section.id as keyof typeof SLIDES],
          }
      )}
      onSelect={(id) => {
        if (id !== 'game_array' && id !== 'game_quiz') {
          markSectionOpened(id as keyof typeof SLIDES);
        }
        setActiveSection(id as SectionId);
      }}
    />
  );
}
