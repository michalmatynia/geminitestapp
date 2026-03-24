'use client';

import { useId, useMemo, useState } from 'react';

import {
  renderSoftAtmosphereGradients,
  renderSoftAtmosphereOvals,
} from '@/features/kangur/ui/components/animations/svgAtmosphere';
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

export const ApprovalGateVisual = (): JSX.Element => {
  const baseId = useId().replace(/:/g, '');
  const clipId = `agentic-approval-gate-${baseId}-clip`;
  const panelGradientId = `agentic-approval-gate-${baseId}-panel`;
  const frameGradientId = `agentic-approval-gate-${baseId}-frame`;
  const glowGradientId = `agentic-approval-gate-${baseId}-glow`;
  const atmosphereId = `agentic-approval-gate-${baseId}-atmosphere-oval`;

  return (
    <svg
      aria-label='Animated approval gate opening and closing.'
      className='h-auto w-full max-w-[260px]'
      data-testid='agentic-approval-gate-visual-animation'
      role='img'
      viewBox='0 0 240 180'
    >
      <defs>
        <clipPath id={clipId}>
          <rect x='12' y='12' width='216' height='156' rx='24' />
        </clipPath>
        <linearGradient
          id={panelGradientId}
          x1='20'
          x2='220'
          y1='20'
          y2='160'
          gradientUnits='userSpaceOnUse'
        >
          <stop offset='0%' stopColor='#f8fafc' />
          <stop offset='52%' stopColor='#fff7ed' />
          <stop offset='100%' stopColor='#eff6ff' />
        </linearGradient>
        <linearGradient
          id={frameGradientId}
          x1='18'
          x2='222'
          y1='18'
          y2='18'
          gradientUnits='userSpaceOnUse'
        >
          <stop offset='0%' stopColor='rgba(248,113,113,0.82)' />
          <stop offset='50%' stopColor='rgba(251,191,36,0.82)' />
          <stop offset='100%' stopColor='rgba(56,189,248,0.82)' />
        </linearGradient>
        <linearGradient
          id={glowGradientId}
          x1='108'
          x2='132'
          y1='52'
          y2='128'
          gradientUnits='userSpaceOnUse'
        >
          <stop offset='0%' stopColor='rgba(255,255,255,0.7)' />
          <stop offset='100%' stopColor='rgba(56,189,248,0.2)' />
        </linearGradient>
        {renderSoftAtmosphereGradients(atmosphereId, [
          { key: 'left', cx: 66, cy: 34, rx: 54, ry: 16, color: '#f87171', opacity: 0.06, glowBias: '40%' },
          { key: 'right', cx: 176, cy: 36, rx: 48, ry: 16, color: '#38bdf8', opacity: 0.05, glowBias: '42%' },
          { key: 'bottom', cx: 120, cy: 150, rx: 74, ry: 18, color: '#fbbf24', opacity: 0.045, glowBias: '60%' },
        ])}
      </defs>
      <style>{`
        .approval-gate-door {
          animation: slide 3.6s ease-in-out infinite;
        }
        .approval-gate-door.right {
          animation-delay: 0.2s;
        }
        .approval-gate-lock {
          animation: pulse 2.4s ease-in-out infinite;
        }
        .approval-gate-glow {
          animation: glow 2.6s ease-in-out infinite;
        }
        @keyframes slide {
          0%, 100% { transform: translateX(0); }
          45% { transform: translateX(-16px); }
          60% { transform: translateX(0); }
        }
        @keyframes pulse {
          0%, 100% { transform: scale(1); opacity: 0.7; }
          50% { transform: scale(1.15); opacity: 1; }
        }
        @keyframes glow {
          0%, 100% { opacity: 0.25; }
          50% { opacity: 0.7; }
        }
      `}</style>
      <g clipPath={`url(#${clipId})`} data-testid='agentic-approval-gate-visual-atmosphere'>
        <rect
          x='12'
          y='12'
          width='216'
          height='156'
          rx='24'
          fill={`url(#${panelGradientId})`}
          stroke='rgba(148,163,184,0.16)'
          strokeWidth='2'
        />
        {renderSoftAtmosphereOvals(atmosphereId, [
          { key: 'left', cx: 66, cy: 34, rx: 54, ry: 16, color: '#f87171', opacity: 0.06, glowBias: '40%' },
          { key: 'right', cx: 176, cy: 36, rx: 48, ry: 16, color: '#38bdf8', opacity: 0.05, glowBias: '42%' },
          { key: 'bottom', cx: 120, cy: 150, rx: 74, ry: 18, color: '#fbbf24', opacity: 0.045, glowBias: '60%' },
        ])}
        <rect x='34' y='30' width='172' height='120' rx='18' fill='rgba(15,23,42,0.06)' stroke='rgba(15,23,42,0.25)' strokeWidth='3' />
        <rect x='48' y='42' width='144' height='96' rx='16' fill='rgba(255,255,255,0.2)' />
        <rect className='approval-gate-door' x='52' y='50' width='62' height='80' rx='10' fill='rgba(248,113,113,0.4)' stroke='rgba(248,113,113,0.82)' strokeWidth='2' />
        <rect className='approval-gate-door right' x='126' y='50' width='62' height='80' rx='10' fill='rgba(251,146,60,0.28)' stroke='rgba(251,146,60,0.78)' strokeWidth='2' />
        <rect className='approval-gate-glow' x='108' y='52' width='24' height='76' rx='12' fill={`url(#${glowGradientId})`} />
        <circle className='approval-gate-lock' cx='120' cy='112' r='10' fill='rgba(15,23,42,0.68)' />
      </g>
      <rect
        x='18'
        y='18'
        width='204'
        height='144'
        rx='20'
        fill='none'
        stroke={`url(#${frameGradientId})`}
        strokeWidth='1.8'
        data-testid='agentic-approval-gate-visual-frame'
      />
    </svg>
  );
};

export default function AgenticApprovalGateGame({
  onFinish,
}: KangurMiniGameFinishActionProps): JSX.Element {
  const isCoarsePointer = useKangurCoarsePointer();
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
  const activeAction = activeActionId
    ? APPROVAL_ACTIONS.find((action) => action.id === activeActionId) ?? null
    : null;
  const touchHint = activeAction
    ? `Selected action: ${activeAction.text} Tap a gate choice.`
    : 'Tap an action card, then tap a gate choice.';

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
                <KangurLessonCaption className='text-slate-800'>
                  {isCoarsePointer ? 'Tap a card to focus it.' : 'Route through the gate.'}
                </KangurLessonCaption>
              </div>
              <KangurStatusChip accent='slate' size='sm'>
                {assignedCount}/{APPROVAL_ACTIONS.length} decided
              </KangurStatusChip>
            </div>
            <KangurProgressBar accent='slate' value={progress} size='sm' />
            {isCoarsePointer ? (
              <div
                aria-live='polite'
                className='rounded-2xl border border-slate-200/80 bg-white/80 px-4 py-3 text-sm font-semibold text-slate-900 shadow-sm'
                data-testid='agentic-approval-touch-hint'
              >
                {touchHint}
              </div>
            ) : null}

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
                      'w-full rounded-2xl border bg-white/80 text-left text-sm font-semibold transition-all touch-manipulation select-none',
                      isCoarsePointer
                        ? 'min-h-[5rem] px-4 py-4 active:scale-[0.99] active:shadow-sm'
                        : 'px-4 py-3 hover:-translate-y-0.5 hover:shadow-md',
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
                <KangurLessonCaption className='text-slate-800'>
                  {isCoarsePointer ? 'Tap to route the selected action.' : 'Click to route.'}
                </KangurLessonCaption>
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
                    'rounded-2xl border text-left text-sm font-semibold transition-all touch-manipulation select-none',
                    isCoarsePointer
                      ? 'min-h-[5rem] px-4 py-4 active:scale-[0.99] active:shadow-sm'
                      : 'px-4 py-3 hover:-translate-y-0.5 hover:shadow-md',
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
