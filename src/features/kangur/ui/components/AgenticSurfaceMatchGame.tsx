'use client';

import { useMemo, useState } from 'react';

import {
  KangurLessonCallout,
  KangurLessonCaption,
  KangurLessonInset,
  KangurLessonLead,
  KangurLessonStack,
} from '@/features/kangur/ui/design/lesson-primitives';
import {
  KangurButton,
  KangurGradientHeading,
  KangurInfoCard,
  KangurProgressBar,
  KangurStatusChip,
} from '@/features/kangur/ui/design/primitives';
import {
  KANGUR_GRID_TIGHT_CLASSNAME,
  KANGUR_PANEL_GAP_CLASSNAME,
  KANGUR_WRAP_ROW_SPACED_CLASSNAME,
} from '@/features/kangur/ui/design/tokens';
import { useKangurCoarsePointer } from '@/features/kangur/ui/hooks/useKangurCoarsePointer';
import type { KangurMiniGameFinishActionProps } from '@/features/kangur/ui/types';
import { cn } from '@/features/kangur/shared/utils';

type SurfaceOption = {
  id: string;
  label: string;
  description: string;
  colorClass: string;
};

type Scenario = {
  id: string;
  text: string;
  answer: string;
};

const SURFACE_OPTIONS: SurfaceOption[] = [
  {
    id: 'cli',
    label: 'CLI',
    description: 'Fast local iteration in the terminal.',
    colorClass: 'border-emerald-200/80 bg-emerald-50 text-emerald-900',
  },
  {
    id: 'ide',
    label: 'IDE Extension',
    description: 'Best when open files and selections matter.',
    colorClass: 'border-sky-200/80 bg-sky-50 text-sky-900',
  },
  {
    id: 'app',
    label: 'App / Cloud',
    description: 'Parallel threads, worktrees, and background runs.',
    colorClass: 'border-teal-200/80 bg-teal-50 text-teal-900',
  },
  {
    id: 'api',
    label: 'API / Custom',
    description: 'Integrations, automations, and bespoke tooling.',
    colorClass: 'border-violet-200/80 bg-violet-50 text-violet-900',
  },
];

const SCENARIOS: Scenario[] = [
  {
    id: 'fast-bug',
    text: 'You have a clear repro and want to run quick local tests.',
    answer: 'cli',
  },
  {
    id: 'inline-edit',
    text: 'You need inline edits using the active file context.',
    answer: 'ide',
  },
  {
    id: 'parallel',
    text: 'Two parallel workstreams must stay isolated from your WIP.',
    answer: 'app',
  },
  {
    id: 'background',
    text: 'A long-running scan should run in the background.',
    answer: 'app',
  },
  {
    id: 'integration',
    text: 'You must connect Codex with internal tools or services.',
    answer: 'api',
  },
  {
    id: 'context-heavy',
    text: 'The task depends on open files and selections in your editor.',
    answer: 'ide',
  },
];

const SurfaceOrbitVisual = (): JSX.Element => (
  <svg
    aria-label='Animated rings showing multiple work surfaces.'
    className='h-auto w-full max-w-[280px]'
    role='img'
    viewBox='0 0 260 180'
  >
    <style>{`
      .ring {
        fill: none;
        stroke: rgba(16,185,129,0.28);
        stroke-width: 2;
        stroke-dasharray: 6 10;
        animation: spin 10s linear infinite;
        transform-origin: 130px 90px;
      }
      .ring-2 {
        stroke: rgba(14,165,233,0.3);
        animation-duration: 14s;
        animation-direction: reverse;
      }
      .dot {
        fill: rgba(139,92,246,0.5);
        animation: pulse 2.4s ease-in-out infinite;
      }
      .dot-2 { animation-delay: 0.6s; }
      .dot-3 { animation-delay: 1.2s; }
      @keyframes spin {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
      }
      @keyframes pulse {
        0%, 100% { transform: scale(1); opacity: 0.6; }
        50% { transform: scale(1.4); opacity: 1; }
      }
    `}</style>
    <rect x='28' y='34' width='70' height='46' rx='12' fill='rgba(16,185,129,0.18)' />
    <rect x='160' y='28' width='72' height='46' rx='12' fill='rgba(14,165,233,0.18)' />
    <rect x='90' y='108' width='80' height='50' rx='14' fill='rgba(139,92,246,0.18)' />
    <circle className='ring' cx='130' cy='90' r='64' />
    <circle className='ring ring-2' cx='130' cy='90' r='44' />
    <circle className='dot' cx='60' cy='60' r='5' />
    <circle className='dot dot-2' cx='200' cy='62' r='5' />
    <circle className='dot dot-3' cx='132' cy='135' r='5' />
  </svg>
);

export default function AgenticSurfaceMatchGame({
  onFinish,
}: KangurMiniGameFinishActionProps): JSX.Element {
  const isCoarsePointer = useKangurCoarsePointer();
  const [activeScenarioId, setActiveScenarioId] = useState<string | null>(null);
  const [assignments, setAssignments] = useState<Record<string, string>>({});
  const [checked, setChecked] = useState(false);

  const assignedCount = Object.keys(assignments).length;
  const progress = Math.round((assignedCount / SCENARIOS.length) * 100);

  const score = useMemo(
    () => SCENARIOS.filter((scenario) => assignments[scenario.id] === scenario.answer).length,
    [assignments]
  );

  const isPerfect = score === SCENARIOS.length && assignedCount === SCENARIOS.length;
  const activeScenario = activeScenarioId
    ? SCENARIOS.find((scenario) => scenario.id === activeScenarioId) ?? null
    : null;
  const touchHint = activeScenario
    ? `Selected scenario: ${activeScenario.text} Tap a surface.`
    : 'Tap a scenario card, then tap a surface.';

  const handleAssign = (surfaceId: string) => {
    if (!activeScenarioId) return;

    setAssignments((prev) => ({
      ...prev,
      [activeScenarioId]: surfaceId,
    }));
    setActiveScenarioId(null);
    setChecked(false);
  };

  const handleReset = () => {
    setAssignments({});
    setActiveScenarioId(null);
    setChecked(false);
  };

  const handleCheck = () => {
    setChecked(true);
  };

  return (
    <KangurLessonStack align='start' className='w-full'>
      <div className='relative w-full overflow-hidden rounded-[28px] border border-emerald-200/80 bg-gradient-to-br from-emerald-50 via-white to-sky-50 p-6'>
        <div className='pointer-events-none absolute -right-14 top-2 h-36 w-36 rounded-full bg-emerald-200/40 blur-3xl' />
        <div className='pointer-events-none absolute -left-10 bottom-4 h-28 w-28 rounded-full bg-sky-200/40 blur-3xl' />
        <div className='relative flex flex-col gap-4'>
          <KangurStatusChip accent='emerald' labelStyle='caps'>
            Surface Match
          </KangurStatusChip>
          <KangurGradientHeading gradientClass='from-emerald-500 via-teal-500 to-sky-500' size='lg'>
            Pick the Right Surface
          </KangurGradientHeading>
          <KangurLessonLead align='left'>
            Each scenario belongs to a specific Codex surface. Select a scenario, then click the
            surface that fits best.
          </KangurLessonLead>
          <KangurLessonCallout accent='emerald' padding='sm' className='text-left'>
            <ul className='space-y-2 text-sm text-emerald-950'>
              <li>Click a scenario card to focus it.</li>
              <li>Choose the surface that gives the most context.</li>
              <li>Check your routing when you are done.</li>
            </ul>
          </KangurLessonCallout>
        </div>
      </div>

      <div className={`grid ${KANGUR_PANEL_GAP_CLASSNAME} lg:grid-cols-[1.6fr_1fr]`}>
        <KangurInfoCard tone='accent' accent='emerald' className='relative overflow-hidden'>
          <div className='pointer-events-none absolute inset-0 opacity-40 [background:radial-gradient(circle_at_top,_rgba(16,185,129,0.25),_transparent_55%)]' />
          <div className='relative flex flex-col gap-4'>
            <div className='flex flex-wrap items-center justify-between gap-3'>
              <div>
                <p className='text-sm font-semibold text-emerald-950'>Scenarios</p>
                <KangurLessonCaption className='text-emerald-800'>
                  {isCoarsePointer ? 'Tap a scenario to focus it.' : 'Select, then match.'}
                </KangurLessonCaption>
              </div>
              <KangurStatusChip accent='emerald' size='sm'>
                {assignedCount}/{SCENARIOS.length} matched
              </KangurStatusChip>
            </div>
            <KangurProgressBar accent='emerald' value={progress} size='sm' />
            {isCoarsePointer ? (
              <div
                aria-live='polite'
                className='rounded-2xl border border-emerald-200/80 bg-white/80 px-4 py-3 text-sm font-semibold text-emerald-950 shadow-sm'
                data-testid='agentic-surface-touch-hint'
              >
                {touchHint}
              </div>
            ) : null}

            <div className='grid gap-3' role='group' aria-label='Select a scenario to match'>
              {SCENARIOS.map((scenario) => {
                const assignedSurface = assignments[scenario.id];
                const isActive = activeScenarioId === scenario.id;
                const isCorrect = checked && assignedSurface === scenario.answer;
                const isWrong = checked && assignedSurface && assignedSurface !== scenario.answer;

                return (
                  <button
                    key={scenario.id}
                    type='button'
                    onClick={() => setActiveScenarioId(scenario.id)}
                    className={cn(
                      'w-full rounded-2xl border bg-white/80 text-left text-sm font-semibold transition-all touch-manipulation select-none',
                      isCoarsePointer
                        ? 'min-h-[5rem] px-4 py-4 active:scale-[0.99] active:shadow-sm'
                        : 'px-4 py-3 hover:-translate-y-0.5 hover:shadow-md',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/70 focus-visible:ring-offset-2 ring-offset-white',
                      isActive && 'border-emerald-400 bg-emerald-50',
                      !isActive && 'border-emerald-100/80',
                      isCorrect && 'border-emerald-400 bg-emerald-50',
                      isWrong && 'border-amber-300 bg-amber-50'
                    )}
                    aria-pressed={isActive}
                  >
                    <div className='flex flex-wrap items-center justify-between gap-2'>
                      <span>{scenario.text}</span>
                      {assignedSurface ? (
                        <span className='rounded-full border border-emerald-200/70 bg-emerald-100 px-2 py-0.5 text-[10px] uppercase tracking-[0.18em] text-emerald-700'>
                          {SURFACE_OPTIONS.find((surface) => surface.id === assignedSurface)?.label ?? 'Selected'}
                        </span>
                      ) : null}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </KangurInfoCard>

        <KangurLessonInset accent='emerald' className='relative overflow-hidden'>
          <div className='pointer-events-none absolute inset-0 opacity-40 [background:radial-gradient(circle_at_top,_rgba(14,165,233,0.25),_transparent_60%)]' />
          <div className='relative flex h-full flex-col gap-4'>
            <div className='flex items-center justify-between'>
              <div>
                <p className='text-sm font-semibold text-emerald-950'>Surfaces</p>
                <KangurLessonCaption className='text-emerald-800'>
                  {isCoarsePointer ? 'Tap to match the selected scenario.' : 'Pick the best match.'}
                </KangurLessonCaption>
              </div>
              <SurfaceOrbitVisual />
            </div>
            <div className={cn('grid gap-3', KANGUR_GRID_TIGHT_CLASSNAME)} role='group' aria-label='Choose a surface'>
              {SURFACE_OPTIONS.map((surface) => (
                <button
                  key={surface.id}
                  type='button'
                  onClick={() => handleAssign(surface.id)}
                  className={cn(
                    'rounded-2xl border text-left text-sm font-semibold transition-all touch-manipulation select-none',
                    isCoarsePointer
                      ? 'min-h-[5rem] px-4 py-4 active:scale-[0.99] active:shadow-sm'
                      : 'px-4 py-3 hover:-translate-y-0.5 hover:shadow-md',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/70 focus-visible:ring-offset-2 ring-offset-white',
                    surface.colorClass,
                    activeScenarioId ? 'opacity-100' : 'opacity-60'
                  )}
                  disabled={!activeScenarioId}
                  aria-disabled={!activeScenarioId}
                  aria-label={surface.label}
                >
                  <div className='text-xs font-semibold uppercase tracking-[0.2em]'>{surface.label}</div>
                  <KangurLessonCaption className='mt-1 text-emerald-900'>
                    {surface.description}
                  </KangurLessonCaption>
                </button>
              ))}
            </div>

            {checked ? (
              <div
                className={cn(
                  'rounded-2xl border px-4 py-3 text-xs font-semibold',
                  isPerfect
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
                    : 'border-amber-200 bg-amber-50 text-amber-900'
                )}
              >
                {isPerfect
                  ? 'Perfect routing. You matched every scenario.'
                  : `You matched ${score}/${SCENARIOS.length}. Review the mismatches and try again.`}
              </div>
            ) : null}

            <div className={cn('mt-auto flex flex-wrap items-center gap-2', KANGUR_WRAP_ROW_SPACED_CLASSNAME)}>
              <KangurButton size='sm' variant='surface' type='button' onClick={handleReset}>
                Reset
              </KangurButton>
              <KangurButton size='sm' variant='primary' type='button' onClick={handleCheck}>
                Check
              </KangurButton>
              <div className='flex-1' />
              <KangurButton size='sm' variant='ghost' type='button' onClick={onFinish}>
                Back to lesson
              </KangurButton>
            </div>
          </div>
        </KangurLessonInset>
      </div>
    </KangurLessonStack>
  );
}
