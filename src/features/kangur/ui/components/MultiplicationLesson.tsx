'use client';

import type { LessonSlide } from '@/features/kangur/ui/components/LessonSlideSection';
import {
  MultiplicationArrayAnimation,
  MultiplicationCommutativeAnimation,
  MultiplicationDoubleDoubleAnimation,
  MultiplicationFiveRhythmAnimation,
  MultiplicationGamePreviewAnimation,
  MultiplicationGroupsAnimation,
  MultiplicationIntroPatternAnimation,
  MultiplicationSkipCountAnimation,
  MultiplicationTenShiftAnimation,
} from '@/features/kangur/ui/components/LessonAnimations';
import {
  KangurLessonCallout,
  KangurLessonCaption,
  KangurLessonChip,
  KangurLessonInset,
  KangurLessonLead,
  KangurLessonStack,
} from '@/features/kangur/ui/design/lesson-primitives';
import {
  KangurDisplayEmoji,
  KangurEquationDisplay,
  KangurStatusChip,
} from '@/features/kangur/ui/design/primitives';
import { getKangurLessonStageGameRuntimeSpec } from '@/features/kangur/games/lesson-stage-runtime-specs';
import { KangurUnifiedLesson } from '@/features/kangur/ui/lessons/lesson-components';

type SectionId =
  | 'intro'
  | 'tabela23'
  | 'tabela45'
  | 'triki'
  | 'game_array';

const MULTIPLICATION_ARRAY_LESSON_STAGE_RUNTIME = getKangurLessonStageGameRuntimeSpec(
  'multiplication_array_lesson_stage'
);

const MULTIPLICATION_GAME_ARRAY_PRELUDE = (
  <KangurLessonCallout accent='violet' className='text-center'>
    <KangurLessonChip accent='violet' className='mb-2'>
      Zobacz grupy
    </KangurLessonChip>
    <div className='mx-auto w-full max-w-xs'>
      <MultiplicationGamePreviewAnimation />
    </div>
    <KangurLessonCaption className='mt-1'>
      Łącz równe grupy kropek, aby zobaczyć mnożenie.
    </KangurLessonCaption>
  </KangurLessonCallout>
);

const MULTIPLICATION_GROUPS_SLIDE: LessonSlide = {
  title: 'Mnożenie jako grupy',
  content: (
    <KangurLessonStack align='start'>
      <KangurLessonLead align='left'>
        Gdy masz równe grupy, liczysz grupy i liczbę elementów w każdej.
      </KangurLessonLead>
      <KangurLessonInset accent='emerald' className='text-center'>
        <KangurLessonChip accent='emerald' className='mb-2'>
          Równe grupy
        </KangurLessonChip>
        <div className='mx-auto w-full max-w-sm'>
          <MultiplicationGroupsAnimation />
        </div>
        <KangurEquationDisplay accent='emerald' className='mt-2' size='sm'>
          3 × 4 = 12
        </KangurEquationDisplay>
        <KangurLessonCaption className='mt-1'>3 grupy, po 4 elementy.</KangurLessonCaption>
      </KangurLessonInset>
    </KangurLessonStack>
  ),
};

const MULTIPLICATION_ARRAY_SLIDE: LessonSlide = {
  title: 'Rzędy w tablicy',
  content: (
    <KangurLessonStack>
      <KangurLessonLead align='left'>
        Tablica pokazuje rzędy i kolumny, które liczymy raz i mnożymy.
      </KangurLessonLead>
      <KangurLessonCallout accent='teal' className='text-center'>
        <KangurLessonChip accent='teal' className='mb-2'>
          Tablica
        </KangurLessonChip>
        <div className='mx-auto w-full max-w-sm'>
          <MultiplicationArrayAnimation />
        </div>
        <KangurEquationDisplay accent='teal' className='mt-2' size='sm'>
          4 + 4 + 4 = 12
        </KangurEquationDisplay>
        <KangurLessonCaption className='mt-1'>Trzy rzędy po cztery.</KangurLessonCaption>
      </KangurLessonCallout>
    </KangurLessonStack>
  ),
};

export const SLIDES: Record<Exclude<SectionId, 'game_array'>, LessonSlide[]> = {
  intro: [
    {
      title: 'Co to znaczy mnożyć?',
      content: (
        <KangurLessonStack align='start'>
          <KangurLessonLead align='left'>
            Mnożenie zbiera powtarzane grupy w jedno krótkie działanie.
          </KangurLessonLead>
          <KangurLessonCallout accent='rose' className='text-center'>
            <div className='flex items-center justify-center gap-2'>
              <KangurDisplayEmoji size='xs'>🍬</KangurDisplayEmoji>
              <KangurLessonChip accent='rose'>Powtarzamy</KangurLessonChip>
            </div>
            <div className='mx-auto w-full max-w-sm'>
              <MultiplicationIntroPatternAnimation />
            </div>
            <KangurLessonCaption className='mt-1'>Trzy takie same porcje.</KangurLessonCaption>
          </KangurLessonCallout>
          <KangurLessonInset accent='violet' className='text-center'>
            <KangurEquationDisplay
              accent='violet'
              data-testid='multiplication-lesson-intro-equation'
              size='md'
            >
              3 × 3 = 9
            </KangurEquationDisplay>
            <KangurLessonCaption>To samo co 3 + 3 + 3.</KangurLessonCaption>
          </KangurLessonInset>
        </KangurLessonStack>
      ),
    },
    MULTIPLICATION_GROUPS_SLIDE,
  ],
  tabela23: [
    {
      title: 'Tabliczka mnożenia × 2 i × 3',
      content: (
        <KangurLessonStack align='start'>
          <KangurLessonLead align='left'>
            Dwójki i trójki mają rytm: liczymy skokami po osi.
          </KangurLessonLead>
          <div className='grid w-full grid-cols-1 gap-2 min-[420px]:grid-cols-2'>
            {[2, 3].map((base) => (
              <KangurLessonCallout
                key={base}
                accent={base === 2 ? 'sky' : 'violet'}
                className='w-full rounded-xl'
                padding='sm'
              >
                <KangurStatusChip
                  accent={base === 2 ? 'sky' : 'violet'}
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
          <KangurLessonInset accent='sky' className='text-center'>
            <KangurLessonChip accent='sky' className='mb-2'>
              Skoki na osi
            </KangurLessonChip>
            <div className='mx-auto w-full max-w-sm'>
              <MultiplicationSkipCountAnimation />
            </div>
            <KangurLessonCaption className='mt-1'>
              0 → 2 → 4 → 6 i 0 → 3 → 6 → 9.
            </KangurLessonCaption>
          </KangurLessonInset>
        </KangurLessonStack>
      ),
    },
  ],
  tabela45: [
    {
      title: 'Tabliczka mnożenia × 4 i × 5',
      content: (
        <KangurLessonStack align='start'>
          <KangurLessonLead align='left'>
            Czwórki to podwójne dwójki, a piątki mają rytm co pięć.
          </KangurLessonLead>
          <div className='grid w-full grid-cols-1 gap-2 min-[420px]:grid-cols-2'>
            {[4, 5].map((base) => (
              <KangurLessonCallout
                key={base}
                accent='indigo'
                className='w-full rounded-xl'
                padding='sm'
              >
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
          <div className='grid grid-cols-1 gap-2 min-[420px]:grid-cols-2'>
            <KangurLessonInset accent='rose' className='text-center'>
              <KangurLessonChip accent='rose' className='mb-2'>
                ×4 = podwójnie
              </KangurLessonChip>
              <div className='mx-auto w-full max-w-xs'>
                <MultiplicationDoubleDoubleAnimation />
              </div>
              <KangurLessonCaption className='mt-1'>Podwój, potem jeszcze raz.</KangurLessonCaption>
            </KangurLessonInset>
            <KangurLessonInset accent='amber' className='text-center'>
              <KangurLessonChip accent='amber' className='mb-2'>
                ×5 = rytm
              </KangurLessonChip>
              <div className='mx-auto w-full max-w-xs'>
                <MultiplicationFiveRhythmAnimation />
              </div>
              <KangurLessonCaption className='mt-1'>Wynik kończy się na 0 lub 5.</KangurLessonCaption>
            </KangurLessonInset>
          </div>
        </KangurLessonStack>
      ),
    },
    MULTIPLICATION_ARRAY_SLIDE,
  ],
  triki: [
    {
      title: 'Triki do zapamiętania',
      content: (
        <KangurLessonStack align='start' className='kangur-panel-gap'>
          <KangurLessonLead align='left'>
            Zapamiętaj kilka skrótów, które przyspieszają liczenie.
          </KangurLessonLead>
          <div className='grid grid-cols-1 kangur-panel-gap min-[420px]:grid-cols-[1.2fr_1fr]'>
            <KangurLessonCallout accent='amber' className='w-full'>
              <ul className='space-y-2 text-sm [color:var(--kangur-page-text)]'>
                <li>
                  ✖️ × 1 = ta sama liczba: <b>7×1=7</b>
                </li>
                <li>
                  ✖️ × 2 = podwójnie: <b>6×2=12</b>
                </li>
                <li>
                  ✖️ × 5 = kończy się na 0 lub 5: <b>7×5=35</b>
                </li>
                <li>
                  ✖️ × 10 = dodaj zero: <b>8×10=80</b>
                </li>
                <li>
                  ✅ Kolejność nie ma znaczenia: <b>3×4=4×3</b>
                </li>
              </ul>
            </KangurLessonCallout>
            <KangurLessonInset accent='teal' className='text-center'>
              <KangurLessonChip accent='teal' className='mb-2'>
                ×10 w sekundę
              </KangurLessonChip>
              <div className='mx-auto w-full max-w-xs'>
                <MultiplicationTenShiftAnimation />
              </div>
              <KangurLessonCaption className='mt-1'>
                Dopisz 0 i gotowe.
              </KangurLessonCaption>
            </KangurLessonInset>
          </div>
        </KangurLessonStack>
      ),
    },
    {
      title: 'Kolejność czynników',
      content: (
        <KangurLessonStack>
          <KangurLessonLead align='left'>3 × 4 to to samo co 4 × 3.</KangurLessonLead>
          <KangurLessonInset accent='sky' className='max-w-sm text-center'>
            <KangurLessonChip accent='sky' className='mb-2'>
              Zamiana miejsc
            </KangurLessonChip>
            <div className='mx-auto w-full max-w-xs'>
              <MultiplicationCommutativeAnimation />
            </div>
            <KangurLessonCaption className='mt-2'>
              Zamiana czynników nie zmienia wyniku.
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
    emoji: '🍬',
    title: 'Co to mnożenie?',
    description: 'Mnożenie jako powtarzane dodawanie',
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
  return (
    <KangurUnifiedLesson
      progressMode='panel'
      lessonId='multiplication'
      lessonEmoji='✖️'
      lessonTitle='Mnożenie'
      sections={HUB_SECTIONS}
      slides={SLIDES}
      gradientClass='kangur-gradient-accent-indigo'
      progressDotClassName='bg-purple-300'
      dotActiveClass='bg-purple-500'
      dotDoneClass='bg-purple-300'
      skipMarkFor={['game_array']}
      games={[
        {
          sectionId: 'game_array',
          stage: {
            accent: 'violet',
            bodyPrelude: MULTIPLICATION_GAME_ARRAY_PRELUDE,
            icon: '✨',
            maxWidthClassName: 'max-w-sm',
            headerTestId: 'multiplication-lesson-game-array-header',
            shellTestId: 'multiplication-lesson-game-array-shell',
            title: 'Gra z grupami!',
          },
          runtime: MULTIPLICATION_ARRAY_LESSON_STAGE_RUNTIME,
        },
      ]}
    />
  );
}
