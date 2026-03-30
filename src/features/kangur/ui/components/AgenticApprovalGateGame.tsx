'use client';

import { useId } from 'react';

import {
  createAgenticAssignmentGameComponent,
  type AgenticAssignmentGameItem,
  type AgenticAssignmentGameOption,
} from '@/features/kangur/ui/components/AgenticAssignmentGame';
import {
  renderSoftAtmosphereGradients,
  renderSoftAtmosphereOvals,
} from '@/features/kangur/ui/components/animations/svgAtmosphere';

type ApprovalDecision = 'safe' | 'approval';

const APPROVAL_OPTIONS: AgenticAssignmentGameOption<ApprovalDecision>[] = [
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

const APPROVAL_ACTIONS: AgenticAssignmentGameItem<ApprovalDecision>[] = [
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

export default createAgenticAssignmentGameComponent({
  copy: {
    statusLabel: 'Approval Gate',
    heading: 'Decide What Needs Approval',
    lead:
      'Each action must go through the gate. Select an action and decide if it needs user approval or is safe to run.',
    instructions: [
      'Pick an action card to focus it.',
      'Choose whether it needs approval or not.',
      'Check to see if you kept the scope safe.',
    ],
    leftPanelTitle: 'Actions',
    leftPanelCaption: {
      coarsePointer: 'Tap a card to focus it.',
      finePointer: 'Route through the gate.',
    },
    leftPanelCountLabel: (assignedCount, total) => `${assignedCount}/${total} decided`,
    leftPanelGroupLabel: 'Select an action to review',
    leftPanelTouchHint: {
      idle: 'Tap an action card, then tap a gate choice.',
      selected: (itemText) => `Selected action: ${itemText} Tap a gate choice.`,
      testId: 'agentic-approval-touch-hint',
    },
    rightPanelTitle: 'Gate Choices',
    rightPanelCaption: {
      coarsePointer: 'Tap to route the selected action.',
      finePointer: 'Click to route.',
    },
    rightPanelGroupLabel: 'Choose an approval decision',
    successMessage: 'Great job. You kept the gate tight and safe.',
    failureMessage: (score, total) =>
      `You classified ${score}/${total}. Recheck what triggers approval.`,
  },
  items: APPROVAL_ACTIONS,
  options: APPROVAL_OPTIONS,
  theme: {
    accent: 'slate',
    heroClassName:
      'border border-slate-200/80 bg-gradient-to-br from-slate-50 via-white to-slate-100',
    heroTopGlowClassName: '-right-14 top-4 bg-slate-200/40',
    heroBottomGlowClassName: '-left-10 bottom-4 bg-slate-200/40',
    headingGradientClass: 'from-slate-500 via-slate-700 to-orange-500',
    instructionListClassName: 'space-y-2 text-sm text-slate-950',
    leftPanelGlowClassName:
      '[background:radial-gradient(circle_at_top,_rgba(148,163,184,0.3),_transparent_55%)]',
    leftPanelTitleClassName: 'text-slate-950',
    leftPanelCaptionClassName: 'text-slate-800',
    leftTouchHintClassName: 'border-slate-200/80 text-slate-900',
    leftItemFocusRingClassName: 'focus-visible:ring-indigo-400/70',
    leftItemActiveClassName: 'border-slate-400 bg-slate-50',
    leftItemInactiveClassName: 'border-slate-100/80',
    leftItemCorrectClassName: 'border-emerald-300 bg-emerald-50',
    leftItemWrongClassName: 'border-amber-300 bg-amber-50',
    leftAssignedBadgeClassName:
      'border-slate-200/70 bg-slate-100 text-slate-700',
    rightPanelGlowClassName:
      '[background:radial-gradient(circle_at_top,_rgba(71,85,105,0.25),_transparent_60%)]',
    rightPanelTitleClassName: 'text-slate-950',
    rightPanelCaptionClassName: 'text-slate-800',
    rightOptionFocusRingClassName: 'focus-visible:ring-indigo-400/70',
    rightOptionDescriptionClassName: 'text-slate-900',
  },
  visual: <ApprovalGateVisual />,
  displayName: 'AgenticApprovalGateGame',
});
