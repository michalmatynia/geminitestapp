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
import type { KangurMiniGameFinishActionProps } from '@/features/kangur/ui/types';
import { cn } from '@/features/kangur/shared/utils';

type ReasoningLevelId = 'low' | 'medium' | 'high' | 'xhigh';

type ReasoningLevel = {
  id: ReasoningLevelId;
  label: string;
  description: string;
  colorClass: string;
};

type RouterTask = {
  id: string;
  text: string;
  answer: ReasoningLevelId;
};

type AgenticReasoningRouterGameProps = KangurMiniGameFinishActionProps;

const REASONING_LEVELS: ReasoningLevel[] = [
  {
    id: 'low',
    label: 'Low',
    description: 'Quick fixes, clear scope, low risk.',
    colorClass: 'border-emerald-200/80 bg-emerald-50 text-emerald-900',
  },
  {
    id: 'medium',
    label: 'Medium',
    description: 'Standard product work and refactors.',
    colorClass: 'border-teal-200/80 bg-teal-50 text-teal-900',
  },
  {
    id: 'high',
    label: 'High',
    description: 'Complex debugging and architectural decisions.',
    colorClass: 'border-sky-200/80 bg-sky-50 text-sky-900',
  },
  {
    id: 'xhigh',
    label: 'XHigh',
    description: 'Highest risk, unknowns, or deep redesign.',
    colorClass: 'border-indigo-200/80 bg-indigo-50 text-indigo-900',
  },
];

const ROUTER_TASKS: RouterTask[] = [
  {
    id: 'typo-fix',
    text: 'Fix a typo in README and rerun lint.',
    answer: 'low',
  },
  {
    id: 'feature-flag',
    text: 'Add a small feature flag and update one test.',
    answer: 'medium',
  },
  {
    id: 'cache-refactor',
    text: 'Refactor the caching layer across three services.',
    answer: 'high',
  },
  {
    id: 'architecture',
    text: 'Design a new event ingestion architecture for 10x traffic.',
    answer: 'xhigh',
  },
  {
    id: 'error-budget',
    text: 'Investigate a regression with partial logs and no repro.',
    answer: 'high',
  },
  {
    id: 'ui-polish',
    text: 'Polish a UI component and adjust copy.',
    answer: 'low',
  },
];

const ReasoningDialVisual = (): JSX.Element => (
  <svg
    aria-label='Animated dial showing reasoning levels.'
    className='h-auto w-full max-w-[260px]'
    role='img'
    viewBox='0 0 240 180'
  >
    <style>{`
      .dial {
        fill: rgba(20,184,166,0.08);
        stroke: rgba(20,184,166,0.35);
        stroke-width: 3;
      }
      .tick {
        stroke: rgba(15,118,110,0.5);
        stroke-width: 2;
        stroke-linecap: round;
      }
      .needle {
        stroke: #0f766e;
        stroke-width: 4;
        stroke-linecap: round;
        transform-origin: 120px 120px;
        animation: sweep 6s ease-in-out infinite;
      }
      .hub {
        fill: #0f766e;
      }
      .pulse {
        fill: rgba(45,212,191,0.4);
        animation: pulse 2.4s ease-in-out infinite;
      }
      @keyframes sweep {
        0% { transform: rotate(-50deg); }
        45% { transform: rotate(30deg); }
        70% { transform: rotate(60deg); }
        100% { transform: rotate(-50deg); }
      }
      @keyframes pulse {
        0%, 100% { opacity: 0.4; transform: scale(1); }
        50% { opacity: 0.9; transform: scale(1.25); }
      }
    `}</style>
    <circle className='dial' cx='120' cy='120' r='72' />
    <line className='tick' x1='120' x2='120' y1='38' y2='52' />
    <line className='tick' x1='60' x2='70' y1='70' y2='80' />
    <line className='tick' x1='180' x2='170' y1='70' y2='80' />
    <line className='tick' x1='40' x2='54' y1='120' y2='120' />
    <line className='tick' x1='200' x2='186' y1='120' y2='120' />
    <line className='needle' x1='120' x2='120' y1='120' y2='58' />
    <circle className='hub' cx='120' cy='120' r='6' />
    <circle className='pulse' cx='120' cy='42' r='6' />
    <circle className='pulse' cx='48' cy='120' r='6' style={{ animationDelay: '0.6s' }} />
    <circle className='pulse' cx='192' cy='120' r='6' style={{ animationDelay: '1.2s' }} />
  </svg>
);

export default function AgenticReasoningRouterGame({
  onFinish,
}: AgenticReasoningRouterGameProps): JSX.Element {
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  const [assignments, setAssignments] = useState<Record<string, ReasoningLevelId>>({});
  const [checked, setChecked] = useState(false);

  const assignedCount = Object.keys(assignments).length;
  const progress = Math.round((assignedCount / ROUTER_TASKS.length) * 100);

  const score = useMemo(
    () => ROUTER_TASKS.filter((task) => assignments[task.id] === task.answer).length,
    [assignments]
  );

  const isPerfect = score === ROUTER_TASKS.length && assignedCount === ROUTER_TASKS.length;

  const handleAssign = (levelId: ReasoningLevelId) => {
    if (!activeTaskId) return;

    setAssignments((prev) => ({
      ...prev,
      [activeTaskId]: levelId,
    }));
    setActiveTaskId(null);
    setChecked(false);
  };

  const handleReset = () => {
    setAssignments({});
    setActiveTaskId(null);
    setChecked(false);
  };

  const handleCheck = () => {
    setChecked(true);
  };

  return (
    <KangurLessonStack align='start' className='w-full'>
      <div className='relative w-full overflow-hidden rounded-[28px] border border-teal-200/80 bg-gradient-to-br from-teal-50 via-white to-sky-50 p-6'>
        <div className='pointer-events-none absolute -right-14 top-4 h-36 w-36 rounded-full bg-teal-200/40 blur-3xl' />
        <div className='pointer-events-none absolute -left-10 bottom-4 h-28 w-28 rounded-full bg-sky-200/40 blur-3xl' />
        <div className='relative flex flex-col gap-4'>
          <KangurStatusChip accent='teal' labelStyle='caps'>
            Reasoning Router
          </KangurStatusChip>
          <KangurGradientHeading gradientClass='from-teal-500 via-cyan-500 to-sky-500' size='lg'>
            Route Tasks by Reasoning Level
          </KangurGradientHeading>
          <KangurLessonLead align='left'>
            Pick a task card, then assign the right reasoning level. Aim for the lightest
            effort that still keeps quality high.
          </KangurLessonLead>
          <KangurLessonCallout accent='teal' padding='sm' className='text-left'>
            <ul className='space-y-2 text-sm text-teal-950'>
              <li>Select a task to focus it.</li>
              <li>Click a reasoning level to route.</li>
              <li>Check your routing once all tasks are set.</li>
            </ul>
          </KangurLessonCallout>
        </div>
      </div>

      <div className={`grid ${KANGUR_PANEL_GAP_CLASSNAME} lg:grid-cols-[1.6fr_1fr]`}>
        <KangurInfoCard tone='accent' accent='teal' className='relative overflow-hidden'>
          <div className='pointer-events-none absolute inset-0 opacity-40 [background:radial-gradient(circle_at_top,_rgba(45,212,191,0.3),_transparent_55%)]' />
          <div className='relative flex flex-col gap-4'>
            <div className='flex flex-wrap items-center justify-between gap-3'>
              <div>
                <p className='text-sm font-semibold text-teal-950'>Routing Queue</p>
                <KangurLessonCaption className='text-teal-800'>Choose the right effort.</KangurLessonCaption>
              </div>
              <KangurStatusChip accent='teal' size='sm'>
                {assignedCount}/{ROUTER_TASKS.length} routed
              </KangurStatusChip>
            </div>
            <KangurProgressBar accent='teal' value={progress} size='sm' />

            <div className='grid gap-3'>
              {ROUTER_TASKS.map((task) => {
                const assignedLevel = assignments[task.id];
                const isActive = activeTaskId === task.id;
                const isCorrect = checked && assignedLevel === task.answer;
                const isWrong = checked && assignedLevel && assignedLevel !== task.answer;

                return (
                  <button
                    key={task.id}
                    type='button'
                    onClick={() => setActiveTaskId(task.id)}
                    className={cn(
                      'w-full rounded-2xl border px-4 py-3 text-left text-sm font-semibold transition-all',
                      'bg-white/80 hover:-translate-y-0.5 hover:shadow-md',
                      isActive && 'border-teal-400 bg-teal-50',
                      !isActive && 'border-teal-100/80',
                      isCorrect && 'border-teal-400 bg-teal-50',
                      isWrong && 'border-amber-300 bg-amber-50'
                    )}
                    aria-pressed={isActive}
                  >
                    <div className='flex flex-wrap items-center justify-between gap-2'>
                      <span>{task.text}</span>
                      {assignedLevel ? (
                        <span className='rounded-full border border-teal-200/70 bg-teal-100 px-2 py-0.5 text-[10px] uppercase tracking-[0.18em] text-teal-700'>
                          {REASONING_LEVELS.find((level) => level.id === assignedLevel)?.label ?? 'Selected'}
                        </span>
                      ) : null}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </KangurInfoCard>

        <KangurLessonInset accent='teal' className='relative overflow-hidden'>
          <div className='pointer-events-none absolute inset-0 opacity-40 [background:radial-gradient(circle_at_top,_rgba(14,116,144,0.25),_transparent_60%)]' />
          <div className='relative flex h-full flex-col gap-4'>
            <div className='flex items-center justify-between'>
              <div>
                <p className='text-sm font-semibold text-teal-950'>Reasoning Levels</p>
                <KangurLessonCaption className='text-teal-800'>Click to route.</KangurLessonCaption>
              </div>
              <ReasoningDialVisual />
            </div>
            <div className={cn('grid gap-3', KANGUR_GRID_TIGHT_CLASSNAME)}>
              {REASONING_LEVELS.map((level) => (
                <button
                  key={level.id}
                  type='button'
                  onClick={() => handleAssign(level.id)}
                  className={cn(
                    'rounded-2xl border px-4 py-3 text-left text-sm font-semibold transition-all',
                    'hover:-translate-y-0.5 hover:shadow-md',
                    level.colorClass,
                    activeTaskId ? 'opacity-100' : 'opacity-60'
                  )}
                  disabled={!activeTaskId}
                  aria-disabled={!activeTaskId}
                >
                  <div className='text-xs font-semibold uppercase tracking-[0.2em]'>{level.label}</div>
                  <KangurLessonCaption className='mt-1 text-teal-900'>
                    {level.description}
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
                  ? 'Perfect routing. Your effort levels are spot on.'
                  : `You routed ${score}/${ROUTER_TASKS.length} correctly. Adjust the mismatches and try again.`}
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
