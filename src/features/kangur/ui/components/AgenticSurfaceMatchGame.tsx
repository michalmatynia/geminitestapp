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

const SURFACE_OPTIONS: AgenticAssignmentGameOption<string>[] = [
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

const SCENARIOS: AgenticAssignmentGameItem<string>[] = [
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

export const SurfaceOrbitVisual = (): JSX.Element => {
  const baseId = useId().replace(/:/g, '');
  const clipId = `agentic-surface-orbit-${baseId}-clip`;
  const panelGradientId = `agentic-surface-orbit-${baseId}-panel`;
  const frameGradientId = `agentic-surface-orbit-${baseId}-frame`;
  const atmosphereId = `agentic-surface-orbit-${baseId}-atmosphere-oval`;

  return (
    <svg
      aria-label='Animated rings showing multiple work surfaces.'
      className='h-auto w-full max-w-[280px]'
      data-testid='agentic-surface-orbit-animation'
      role='img'
      viewBox='0 0 260 180'
    >
      <defs>
        <clipPath id={clipId}>
          <rect x='10' y='10' width='240' height='160' rx='24' />
        </clipPath>
        <linearGradient
          id={panelGradientId}
          x1='18'
          x2='242'
          y1='16'
          y2='168'
          gradientUnits='userSpaceOnUse'
        >
          <stop offset='0%' stopColor='#f0fdfa' />
          <stop offset='48%' stopColor='#ecfeff' />
          <stop offset='100%' stopColor='#f5f3ff' />
        </linearGradient>
        <linearGradient
          id={frameGradientId}
          x1='18'
          x2='242'
          y1='18'
          y2='18'
          gradientUnits='userSpaceOnUse'
        >
          <stop offset='0%' stopColor='rgba(16,185,129,0.82)' />
          <stop offset='50%' stopColor='rgba(14,165,233,0.82)' />
          <stop offset='100%' stopColor='rgba(139,92,246,0.82)' />
        </linearGradient>
        {renderSoftAtmosphereGradients(atmosphereId, [
          { key: 'left', cx: 66, cy: 28, rx: 56, ry: 16, color: '#10b981', opacity: 0.06, glowBias: '40%' },
          { key: 'right', cx: 198, cy: 34, rx: 52, ry: 16, color: '#0ea5e9', opacity: 0.05, glowBias: '42%' },
          { key: 'bottom', cx: 132, cy: 154, rx: 76, ry: 18, color: '#8b5cf6', opacity: 0.045, glowBias: '60%' },
        ])}
      </defs>
      <style>{`
        .surface-orbit-ring {
          fill: none;
          stroke: rgba(16,185,129,0.28);
          stroke-width: 2;
          stroke-dasharray: 6 10;
          animation: spin 10s linear infinite;
          transform-origin: 130px 90px;
        }
        .surface-orbit-ring-2 {
          stroke: rgba(14,165,233,0.3);
          animation-duration: 14s;
          animation-direction: reverse;
        }
        .surface-orbit-dot {
          fill: rgba(139,92,246,0.5);
          animation: pulse 2.4s ease-in-out infinite;
        }
        .surface-orbit-dot-2 { animation-delay: 0.6s; }
        .surface-orbit-dot-3 { animation-delay: 1.2s; }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes pulse {
          0%, 100% { transform: scale(1); opacity: 0.6; }
          50% { transform: scale(1.4); opacity: 1; }
        }
      `}</style>
      <g clipPath={`url(#${clipId})`} data-testid='agentic-surface-orbit-atmosphere'>
        <rect
          x='10'
          y='10'
          width='240'
          height='160'
          rx='24'
          fill={`url(#${panelGradientId})`}
          stroke='rgba(16,185,129,0.16)'
          strokeWidth='2'
        />
        {renderSoftAtmosphereOvals(atmosphereId, [
          { key: 'left', cx: 66, cy: 28, rx: 56, ry: 16, color: '#10b981', opacity: 0.06, glowBias: '40%' },
          { key: 'right', cx: 198, cy: 34, rx: 52, ry: 16, color: '#0ea5e9', opacity: 0.05, glowBias: '42%' },
          { key: 'bottom', cx: 132, cy: 154, rx: 76, ry: 18, color: '#8b5cf6', opacity: 0.045, glowBias: '60%' },
        ])}
        <rect x='28' y='34' width='70' height='46' rx='12' fill='rgba(16,185,129,0.2)' stroke='rgba(16,185,129,0.28)' strokeWidth='1.5' />
        <rect x='160' y='28' width='72' height='46' rx='12' fill='rgba(14,165,233,0.18)' stroke='rgba(14,165,233,0.28)' strokeWidth='1.5' />
        <rect x='90' y='108' width='80' height='50' rx='14' fill='rgba(139,92,246,0.18)' stroke='rgba(139,92,246,0.28)' strokeWidth='1.5' />
        <circle className='surface-orbit-ring' cx='130' cy='90' r='64' />
        <circle className='surface-orbit-ring surface-orbit-ring-2' cx='130' cy='90' r='44' />
        <circle className='surface-orbit-dot' cx='60' cy='60' r='5' />
        <circle className='surface-orbit-dot surface-orbit-dot-2' cx='200' cy='62' r='5' />
        <circle className='surface-orbit-dot surface-orbit-dot-3' cx='132' cy='135' r='5' />
      </g>
      <rect
        x='18'
        y='18'
        width='224'
        height='144'
        rx='20'
        fill='none'
        stroke={`url(#${frameGradientId})`}
        strokeWidth='1.8'
        data-testid='agentic-surface-orbit-frame'
      />
    </svg>
  );
};

export default createAgenticAssignmentGameComponent({
  copy: {
    statusLabel: 'Surface Match',
    heading: 'Pick the Right Surface',
    lead:
      'Each scenario belongs to a specific Codex surface. Select a scenario, then click the surface that fits best.',
    instructions: [
      'Click a scenario card to focus it.',
      'Choose the surface that gives the most context.',
      'Check your routing when you are done.',
    ],
    leftPanelTitle: 'Scenarios',
    leftPanelCaption: {
      coarsePointer: 'Tap a scenario to focus it.',
      finePointer: 'Select, then match.',
    },
    leftPanelCountLabel: (assignedCount, total) => `${assignedCount}/${total} matched`,
    leftPanelGroupLabel: 'Select a scenario to match',
    leftPanelTouchHint: {
      idle: 'Tap a scenario card, then tap a surface.',
      selected: (itemText) => `Selected scenario: ${itemText} Tap a surface.`,
      testId: 'agentic-surface-touch-hint',
    },
    rightPanelTitle: 'Surfaces',
    rightPanelCaption: {
      coarsePointer: 'Tap to match the selected scenario.',
      finePointer: 'Pick the best match.',
    },
    rightPanelGroupLabel: 'Choose a surface',
    successMessage: 'Perfect routing. You matched every scenario.',
    failureMessage: (score, total) =>
      `You matched ${score}/${total}. Review the mismatches and try again.`,
  },
  items: SCENARIOS,
  options: SURFACE_OPTIONS,
  theme: {
    accent: 'emerald',
    heroClassName:
      'border border-emerald-200/80 bg-gradient-to-br from-emerald-50 via-white to-sky-50',
    heroTopGlowClassName: '-right-14 top-2 bg-emerald-200/40',
    heroBottomGlowClassName: '-left-10 bottom-4 bg-sky-200/40',
    headingGradientClass: 'from-emerald-500 via-teal-500 to-sky-500',
    instructionListClassName: 'space-y-2 text-sm text-emerald-950',
    leftPanelGlowClassName:
      '[background:radial-gradient(circle_at_top,_rgba(16,185,129,0.25),_transparent_55%)]',
    leftPanelTitleClassName: 'text-emerald-950',
    leftPanelCaptionClassName: 'text-emerald-800',
    leftTouchHintClassName: 'border-emerald-200/80 text-emerald-950',
    leftItemFocusRingClassName: 'focus-visible:ring-emerald-400/70',
    leftItemActiveClassName: 'border-emerald-400 bg-emerald-50',
    leftItemInactiveClassName: 'border-emerald-100/80',
    leftItemCorrectClassName: 'border-emerald-400 bg-emerald-50',
    leftItemWrongClassName: 'border-amber-300 bg-amber-50',
    leftAssignedBadgeClassName:
      'border-emerald-200/70 bg-emerald-100 text-emerald-700',
    rightPanelGlowClassName:
      '[background:radial-gradient(circle_at_top,_rgba(14,165,233,0.25),_transparent_60%)]',
    rightPanelTitleClassName: 'text-emerald-950',
    rightPanelCaptionClassName: 'text-emerald-800',
    rightOptionFocusRingClassName: 'focus-visible:ring-emerald-400/70',
    rightOptionDescriptionClassName: 'text-emerald-900',
  },
  visual: <SurfaceOrbitVisual />,
  displayName: 'AgenticSurfaceMatchGame',
});
