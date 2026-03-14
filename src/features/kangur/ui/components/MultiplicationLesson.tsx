import { useState } from 'react';

import LessonActivityStage from '@/features/kangur/ui/components/LessonActivityStage';
import LessonHub from '@/features/kangur/ui/components/LessonHub';
import LessonSlideSection, {
  type LessonSlide,
} from '@/features/kangur/ui/components/LessonSlideSection';
import {
  MultiplicationArrayAnimation,
  MultiplicationCommutativeAnimation,
  MultiplicationGroupsAnimation,
} from '@/features/kangur/ui/components/LessonAnimations';
import MultiplicationArrayGame from '@/features/kangur/ui/components/MultiplicationArrayGame';
import {
  KangurLessonCallout,
  KangurLessonCaption,
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
  | 'tabela23'
  | 'tabela45'
  | 'triki'
  | 'game_array';

const MULTIPLICATION_GROUPS_SLIDE: LessonSlide = {
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
};

const MULTIPLICATION_ARRAY_SLIDE: LessonSlide = {
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
};

export const SLIDES: Record<Exclude<SectionId, 'game_array'>, LessonSlide[]> = {
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
    MULTIPLICATION_GROUPS_SLIDE,
  ],
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
    MULTIPLICATION_ARRAY_SLIDE,
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
                ✖️ × 5 = konczy się na 0 lub 5: <b>7×5=35</b>
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
        if (id !== 'game_array') {
          markSectionOpened(id as keyof typeof SLIDES);
        }
        setActiveSection(id as SectionId);
      }}
    />
  );
}
