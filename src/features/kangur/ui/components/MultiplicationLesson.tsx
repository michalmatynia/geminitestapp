import { useState } from 'react';

import LessonActivityStage from '@/features/kangur/ui/components/LessonActivityStage';
import LessonHub from '@/features/kangur/ui/components/LessonHub';
import LessonSlideSection, {
  type LessonSlide,
} from '@/features/kangur/ui/components/LessonSlideSection';
import MultiplicationArrayGame from '@/features/kangur/ui/components/MultiplicationArrayGame';
import MultiplicationGame from '@/features/kangur/ui/components/MultiplicationGame';
import { KangurLessonCallout } from '@/features/kangur/ui/design/lesson-primitives';
import {
  KangurDisplayEmoji,
  KangurEquationDisplay,
  KangurStatusChip,
} from '@/features/kangur/ui/design/primitives';
import { useLessonHubProgress } from '@/features/kangur/ui/hooks/useLessonHubProgress';

type SectionId = 'intro' | 'tabela23' | 'tabela45' | 'triki' | 'game_array' | 'game_quiz';

export const SLIDES: Record<Exclude<SectionId, 'game_array' | 'game_quiz'>, LessonSlide[]> = {
  intro: [
    {
      title: 'Co to znaczy mnozyc?',
      content: (
        <div className='flex flex-col items-center gap-4'>
          <p className='text-center text-slate-700'>
            Mnozenie to skrócone dodawanie tej samej liczby kilka razy.
          </p>
          <div className='flex flex-col items-center gap-2'>
            <KangurDisplayEmoji size='xs'>🍬🍬🍬 🍬🍬🍬 🍬🍬🍬</KangurDisplayEmoji>
            <p className='text-sm text-slate-500'>3 grupy po 3 cukierki</p>
            <KangurEquationDisplay
              accent='violet'
              data-testid='multiplication-lesson-intro-equation'
              size='md'
            >
              3 × 3 = 9
            </KangurEquationDisplay>
            <p className='text-sm text-slate-400'>(to samo co 3+3+3=9)</p>
          </div>
        </div>
      ),
    },
  ],
  tabela23: [
    {
      title: 'Tabliczka mnozenia × 2 i × 3',
      content: (
        <div className='flex flex-col gap-2 w-full'>
          <div className='grid grid-cols-2 gap-2'>
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
                  <p key={n} className='text-center text-xs text-slate-700'>
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
      title: 'Tabliczka mnozenia × 4 i × 5',
      content: (
        <div className='flex flex-col gap-2 w-full'>
          <div className='grid grid-cols-2 gap-2'>
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
                  <p key={n} className='text-center text-xs text-slate-700'>
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
      title: 'Triki do zapamietania',
      content: (
        <div className='flex flex-col items-center gap-3'>
          <KangurLessonCallout accent='amber' className='max-w-xs'>
            <ul className='space-y-2 text-sm text-slate-700'>
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
        </div>
      ),
    },
  ],
};

export const HUB_SECTIONS = [
  {
    id: 'intro',
    emoji: '🍬',
    title: 'Co to mnozenie?',
    description: 'Mnozenie jako powtarzane dodawanie',
  },
  {
    id: 'tabela23',
    emoji: '📋',
    title: 'Tabliczka × 2 i × 3',
    description: 'Tabliczka mnozenia dla 2 i 3',
  },
  {
    id: 'tabela45',
    emoji: '📋',
    title: 'Tabliczka × 4 i × 5',
    description: 'Tabliczka mnozenia dla 4 i 5',
  },
  {
    id: 'triki',
    emoji: '🧠',
    title: 'Triki mnozenia',
    description: 'Szybkie zasady do zapamietania',
  },
  {
    id: 'game_array',
    emoji: '✨',
    title: 'Gra z grupami',
    description: 'Zbieraj grupy kropcek — odkryj mnozenie!',
    isGame: true,
  },
  {
    id: 'game_quiz',
    emoji: '📝',
    title: 'Quiz tabliczki',
    description: 'Sprawdz tabliczkę — 8 pytan',
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
        title='Quiz mnozenia!'
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
        gradientClass='from-purple-500 to-indigo-500'
      />
    );
  }

  return (
    <LessonHub
      lessonEmoji='✖️'
      lessonTitle='Mnozenie'
      gradientClass='from-purple-500 to-indigo-500'
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
