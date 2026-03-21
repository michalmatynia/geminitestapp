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

type ApprovalDecision = 'safe' | 'approval';

type ApprovalOption = {
  id: ApprovalDecision;
  label: string;
  description: string;
  colorClass: string;
};

type ApprovalAction = {
  id: string;
  text: string;
  answer: ApprovalDecision;
};

const APPROVAL_OPTIONS: ApprovalOption[] = [
  {
    id: 'safe',
    label: 'Safe without approval',
    description: 'Read-only actions with no side effects.',
    colorClass: 'border-emerald-200/80 bg-emerald-50 text-emerald-900',
  },
  {
    id: 'approval',
    label: 'Needs approval',
    description: 'Writes, network, or external side effects.',
    colorClass: 'border-orange-200/80 bg-orange-50 text-orange-900',
  },
];

const APPROVAL_ACTIONS: ApprovalAction[] = [
  {
    id: 'read-files',
    text: 'Read log files and summarize the issue.',
    answer: 'safe',
  },
  {
    id: 'run-tests',
    text: 'Run a full test suite in the repo.',
    answer: 'approval',
  },
  {
    id: 'web-search',
    text: 'Enable live web search to check a pricing change.',
    answer: 'approval',
  },
  {
    id: 'plan-only',
    text: 'Draft a plan without touching any files.',
    answer: 'safe',
  },
  {
    id: 'delete-artifacts',
    text: 'Delete build artifacts with a cleanup script.',
    answer: 'approval',
  },
  {
    id: 'diff-review',
    text: 'Review git diff and list risks.',
    answer: 'safe',
  },
];

const ApprovalGateVisual = (): JSX.Element => (
  <svg
    aria-label='Animated approval gate opening and closing.'
    className='h-auto w-full max-w-[260px]'
    role='img'
    viewBox='0 0 240 180'
  >
    <style>{`
      .frame {
        fill: rgba(15,23,42,0.06);
        stroke: rgba(15,23,42,0.25);
        stroke-width: 3;
      }
      .door {
        fill: rgba(248,113,113,0.35);
        stroke: rgba(248,113,113,0.8);
        stroke-width: 2;
        animation: slide 3.6s ease-in-out infinite;
      }
      .door.right {
        animation-delay: 0.2s;
      }
      .lock {
        fill: rgba(15,23,42,0.6);
        animation: pulse 2.4s ease-in-out infinite;
      }
      .glow {
        fill: rgba(56,189,248,0.35);
        animation: glow 2.6s ease-in-out infinite;
      }
      @keyframes slide {
        0%, 100% { transform: translateX(0); }
        45% { transform: translateX(-16px); }
        60% { transform: translateX(0); }
      }
      @keyframes pulse {
        0%, 100% { transform: scale(1); opacity: 0.6; }
        50% { transform: scale(1.15); opacity: 1; }
      }
      @keyframes glow {
        0%, 100% { opacity: 0.25; }
        50% { opacity: 0.7; }
      }
    `}</style>
    <rect className='frame' x='34' y='30' width='172' height='120' rx='16' />
    <rect className='door' x='52' y='50' width='62' height='80' rx='10' />
    <rect className='door right' x='126' y='50' width='62' height='80' rx='10' />
    <rect className='glow' x='108' y='52' width='24' height='76' rx='12' />
    <circle className='lock' cx='120' cy='112' r='10' />
  </svg>
);

export default function AgenticApprovalGateGame({
  onFinish,
}: KangurMiniGameFinishActionProps): JSX.Element {
  const [activeActionId, setActiveActionId] = useState<string | null>(null);
  const [assignments, setAssignments] = useState<Record<string, ApprovalDecision>>({});
  const [checked, setChecked] = useState(false);

  const assignedCount = Object.keys(assignments).length;
  const progress = Math.round((assignedCount / APPROVAL_ACTIONS.length) * 100);

  const score = useMemo(
    () => APPROVAL_ACTIONS.filter((action) => assignments[action.id] === action.answer).length,
    [assignments]
  );

  const isPerfect = score === APPROVAL_ACTIONS.length && assignedCount === APPROVAL_ACTIONS.length;

  const handleAssign = (decision: ApprovalDecision) => {
    if (!activeActionId) return;

    setAssignments((prev) => ({
      ...prev,
      [activeActionId]: decision,
    }));
    setActiveActionId(null);
    setChecked(false);
  };

  const handleReset = () => {
    setAssignments({});
    setActiveActionId(null);
    setChecked(false);
  };

  const handleCheck = () => {
    setChecked(true);
  };

  return (
    <KangurLessonStack align='start' className='w-full'>
      <div className='relative w-full overflow-hidden rounded-[28px] border border-slate-200/80 bg-gradient-to-br from-slate-50 via-white to-slate-100 p-6'>
        <div className='pointer-events-none absolute -right-14 top-4 h-36 w-36 rounded-full bg-slate-200/40 blur-3xl' />
        <div className='pointer-events-none absolute -left-10 bottom-4 h-28 w-28 rounded-full bg-slate-200/40 blur-3xl' />
        <div className='relative flex flex-col gap-4'>
          <KangurStatusChip accent='slate' labelStyle='caps'>
            Approval Gate
          </KangurStatusChip>
          <KangurGradientHeading gradientClass='from-slate-500 via-slate-700 to-orange-500' size='lg'>
            Decide What Needs Approval
          </KangurGradientHeading>
          <KangurLessonLead align='left'>
            Each action must go through the gate. Select an action and decide if it needs user
            approval or is safe to run.
          </KangurLessonLead>
          <KangurLessonCallout accent='slate' padding='sm' className='text-left'>
            <ul className='space-y-2 text-sm text-slate-950'>
              <li>Pick an action card to focus it.</li>
              <li>Choose whether it needs approval or not.</li>
              <li>Check to see if you kept the scope safe.</li>
            </ul>
          </KangurLessonCallout>
        </div>
      </div>

      <div className={`grid ${KANGUR_PANEL_GAP_CLASSNAME} lg:grid-cols-[1.6fr_1fr]`}>
        <KangurInfoCard tone='accent' accent='slate' className='relative overflow-hidden'>
          <div className='pointer-events-none absolute inset-0 opacity-40 [background:radial-gradient(circle_at_top,_rgba(148,163,184,0.3),_transparent_55%)]' />
          <div className='relative flex flex-col gap-4'>
            <div className='flex flex-wrap items-center justify-between gap-3'>
              <div>
                <p className='text-sm font-semibold text-slate-950'>Actions</p>
                <KangurLessonCaption className='text-slate-800'>Route through the gate.</KangurLessonCaption>
              </div>
              <KangurStatusChip accent='slate' size='sm'>
                {assignedCount}/{APPROVAL_ACTIONS.length} decided
              </KangurStatusChip>
            </div>
            <KangurProgressBar accent='slate' value={progress} size='sm' />

            <div className='grid gap-3' role='group' aria-label='Select an action to review'>
              {APPROVAL_ACTIONS.map((action) => {
                const assignedDecision = assignments[action.id];
                const isActive = activeActionId === action.id;
                const isCorrect = checked && assignedDecision === action.answer;
                const isWrong = checked && assignedDecision && assignedDecision !== action.answer;

                return (
                  <button
                    key={action.id}
                    type='button'
                    onClick={() => setActiveActionId(action.id)}
                    className={cn(
                      'w-full rounded-2xl border px-4 py-3 text-left text-sm font-semibold transition-all',
                      'bg-white/80 hover:-translate-y-0.5 hover:shadow-md',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400/70 focus-visible:ring-offset-2 ring-offset-white',
                      isActive && 'border-slate-400 bg-slate-50',
                      !isActive && 'border-slate-100/80',
                      isCorrect && 'border-emerald-300 bg-emerald-50',
                      isWrong && 'border-amber-300 bg-amber-50'
                    )}
                    aria-pressed={isActive}
                  >
                    <div className='flex flex-wrap items-center justify-between gap-2'>
                      <span>{action.text}</span>
                      {assignedDecision ? (
                        <span className='rounded-full border border-slate-200/70 bg-slate-100 px-2 py-0.5 text-[10px] uppercase tracking-[0.18em] text-slate-700'>
                          {APPROVAL_OPTIONS.find((option) => option.id === assignedDecision)?.label ?? 'Selected'}
                        </span>
                      ) : null}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </KangurInfoCard>

        <KangurLessonInset accent='slate' className='relative overflow-hidden'>
          <div className='pointer-events-none absolute inset-0 opacity-40 [background:radial-gradient(circle_at_top,_rgba(71,85,105,0.25),_transparent_60%)]' />
          <div className='relative flex h-full flex-col gap-4'>
            <div className='flex items-center justify-between'>
              <div>
                <p className='text-sm font-semibold text-slate-950'>Gate Choices</p>
                <KangurLessonCaption className='text-slate-800'>Click to route.</KangurLessonCaption>
              </div>
              <ApprovalGateVisual />
            </div>
            <div className={cn('grid gap-3', KANGUR_GRID_TIGHT_CLASSNAME)} role='group' aria-label='Choose an approval decision'>
              {APPROVAL_OPTIONS.map((option) => (
                <button
                  key={option.id}
                  type='button'
                  onClick={() => handleAssign(option.id)}
                  className={cn(
                    'rounded-2xl border px-4 py-3 text-left text-sm font-semibold transition-all',
                    'hover:-translate-y-0.5 hover:shadow-md',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400/70 focus-visible:ring-offset-2 ring-offset-white',
                    option.colorClass,
                    activeActionId ? 'opacity-100' : 'opacity-60'
                  )}
                  disabled={!activeActionId}
                  aria-disabled={!activeActionId}
                  aria-label={option.label}
                >
                  <div className='text-xs font-semibold uppercase tracking-[0.2em]'>{option.label}</div>
                  <KangurLessonCaption className='mt-1 text-slate-900'>
                    {option.description}
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
                  ? 'Great job. You kept the gate tight and safe.'
                  : `You classified ${score}/${APPROVAL_ACTIONS.length}. Recheck what triggers approval.`}
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
