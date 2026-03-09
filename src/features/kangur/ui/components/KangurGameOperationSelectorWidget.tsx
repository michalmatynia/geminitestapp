'use client';

import { KangurGrajmyWordmark } from '@/features/kangur/ui/components/KangurGrajmyWordmark';
import { KangurPageIntroCard } from '@/features/kangur/ui/components/KangurPageIntroCard';
import KangurPracticeAssignmentBanner from '@/features/kangur/ui/components/KangurPracticeAssignmentBanner';
import OperationSelector from '@/features/kangur/ui/components/OperationSelector';
import { useKangurGameRuntime } from '@/features/kangur/ui/context/KangurGameRuntimeContext';
import {
  KangurIconBadge,
  KangurOptionCardButton,
  KangurSectionHeading,
  KangurStatusChip,
} from '@/features/kangur/ui/design/primitives';

const QUICK_PRACTICE_OPTIONS = [
  {
    accent: 'emerald',
    description: 'Sprawdz daty, dni tygodnia i miesiace w krotkich zadaniach.',
    emoji: '📅',
    label: 'Ćwiczenia z Kalendarzem',
    onSelectScreen: 'calendar_quiz',
  },
  {
    accent: 'violet',
    description: 'Rozpoznawaj figury i cwicz ich rysowanie w szybkich wyzwaniach.',
    emoji: '🔷',
    label: 'Ćwiczenia z Figurami',
    onSelectScreen: 'geometry_quiz',
  },
] as const;

export function KangurGameOperationSelectorWidget(): React.JSX.Element | null {
  const {
    activePracticeAssignment,
    basePath,
    handleHome,
    handleSelectOperation,
    practiceAssignmentsByOperation,
    screen,
    setScreen,
  } = useKangurGameRuntime();

  if (screen !== 'operation') {
    return null;
  }

  return (
    <div className='w-full flex flex-col items-center gap-4'>
      <KangurPageIntroCard
        className='max-w-md'
        description='Wybierz rodzaj gry i przejdz od razu do matematycznej zabawy.'
        headingSize='lg'
        onBack={handleHome}
        testId='kangur-game-operation-top-section'
        title='Grajmy!'
        visualTitle={
          <KangurGrajmyWordmark className='mx-auto' data-testid='kangur-grajmy-heading-art' />
        }
      />
      {activePracticeAssignment ? (
        <div className='flex w-full justify-center px-4'>
          <KangurPracticeAssignmentBanner
            assignment={activePracticeAssignment}
            basePath={basePath}
            mode='queue'
          />
        </div>
      ) : null}
      <OperationSelector
        onSelect={handleSelectOperation}
        priorityAssignmentsByOperation={practiceAssignmentsByOperation}
      />
      <section
        aria-labelledby='kangur-game-quick-practice-heading'
        className='w-full max-w-3xl space-y-4'
      >
        <KangurSectionHeading
          accent='violet'
          align='left'
          description='Dwa szybkie tryby cwiczen w tej samej karcie i rytmie co mini-gry z Lekcji.'
          headingAs='h3'
          headingSize='sm'
          title='Szybkie ćwiczenia'
          titleId='kangur-game-quick-practice-heading'
        />
        <div className='flex w-full flex-col gap-3'>
          {QUICK_PRACTICE_OPTIONS.map((option) => (
            <KangurOptionCardButton
              key={option.onSelectScreen}
              accent={option.accent}
              className='flex w-full items-center gap-4 rounded-[28px] p-4 text-left'
              data-doc-id='home_quick_practice_action'
              emphasis='accent'
              onClick={() => setScreen(option.onSelectScreen)}
            >
              <KangurIconBadge accent={option.accent} className='shrink-0' size='xl'>
                {option.emoji}
              </KangurIconBadge>
              <div className='min-w-0'>
                <p className='text-base font-extrabold leading-tight text-slate-800'>
                  {option.label}
                </p>
                <p className='mt-0.5 text-sm text-slate-500'>{option.description}</p>
              </div>
              <div className='ml-auto flex shrink-0 flex-col items-end gap-2 self-start'>
                <KangurStatusChip
                  accent={option.accent}
                  className='uppercase tracking-[0.14em]'
                  size='sm'
                >
                  Gra
                </KangurStatusChip>
              </div>
            </KangurOptionCardButton>
          ))}
        </div>
      </section>
    </div>
  );
}
