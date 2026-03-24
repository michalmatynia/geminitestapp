'use client';

import { useId } from 'react';

import {
  AgenticAssignmentGame,
  type AgenticAssignmentGameItem,
  type AgenticAssignmentGameOption,
} from '@/features/kangur/ui/components/AgenticAssignmentGame';
import {
  renderSoftAtmosphereGradients,
  renderSoftAtmosphereOvals,
} from '@/features/kangur/ui/components/animations/svgAtmosphere';
import type { KangurMiniGameFinishActionProps } from '@/features/kangur/ui/types';

type ReasoningLevelId = 'low' | 'medium' | 'high' | 'xhigh';

const REASONING_LEVELS: AgenticAssignmentGameOption<ReasoningLevelId>[] = [
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

const ROUTER_TASKS: AgenticAssignmentGameItem<ReasoningLevelId>[] = [
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

export const ReasoningDialVisual = (): JSX.Element => {
  const baseId = useId().replace(/:/g, '');
  const clipId = `agentic-reasoning-dial-${baseId}-clip`;
  const panelGradientId = `agentic-reasoning-dial-${baseId}-panel`;
  const frameGradientId = `agentic-reasoning-dial-${baseId}-frame`;
  const atmosphereId = `agentic-reasoning-dial-${baseId}-atmosphere-oval`;

  return (
    <svg
      aria-label='Animated dial showing reasoning levels.'
      className='h-auto w-full max-w-[260px]'
      data-testid='agentic-reasoning-dial-animation'
      role='img'
      viewBox='0 0 240 180'
    >
      <defs>
        <clipPath id={clipId}>
          <rect x='12' y='12' width='216' height='156' rx='24' />
        </clipPath>
        <linearGradient
          id={panelGradientId}
          x1='18'
          x2='222'
          y1='16'
          y2='168'
          gradientUnits='userSpaceOnUse'
        >
          <stop offset='0%' stopColor='#f0fdfa' />
          <stop offset='48%' stopColor='#ecfeff' />
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
          <stop offset='0%' stopColor='rgba(20,184,166,0.82)' />
          <stop offset='50%' stopColor='rgba(45,212,191,0.82)' />
          <stop offset='100%' stopColor='rgba(56,189,248,0.82)' />
        </linearGradient>
        {renderSoftAtmosphereGradients(atmosphereId, [
          { key: 'left', cx: 68, cy: 30, rx: 56, ry: 16, color: '#2dd4bf', opacity: 0.06, glowBias: '40%' },
          { key: 'right', cx: 176, cy: 36, rx: 52, ry: 16, color: '#38bdf8', opacity: 0.05, glowBias: '42%' },
          { key: 'bottom', cx: 120, cy: 154, rx: 74, ry: 18, color: '#14b8a6', opacity: 0.045, glowBias: '60%' },
        ])}
      </defs>
      <style>{`
        .reasoning-dial-needle {
          transform-origin: 120px 120px;
          animation: sweep 6s ease-in-out infinite;
        }
        .reasoning-dial-pulse {
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
      <g clipPath={`url(#${clipId})`} data-testid='agentic-reasoning-dial-atmosphere'>
        <rect
          x='12'
          y='12'
          width='216'
          height='156'
          rx='24'
          fill={`url(#${panelGradientId})`}
          stroke='rgba(20,184,166,0.16)'
          strokeWidth='2'
        />
        {renderSoftAtmosphereOvals(atmosphereId, [
          { key: 'left', cx: 68, cy: 30, rx: 56, ry: 16, color: '#2dd4bf', opacity: 0.06, glowBias: '40%' },
          { key: 'right', cx: 176, cy: 36, rx: 52, ry: 16, color: '#38bdf8', opacity: 0.05, glowBias: '42%' },
          { key: 'bottom', cx: 120, cy: 154, rx: 74, ry: 18, color: '#14b8a6', opacity: 0.045, glowBias: '60%' },
        ])}
        <circle cx='120' cy='120' r='72' fill='rgba(20,184,166,0.08)' stroke='rgba(20,184,166,0.35)' strokeWidth='3' />
        <circle cx='120' cy='120' r='52' fill='rgba(255,255,255,0.24)' />
        <line x1='120' x2='120' y1='38' y2='52' stroke='rgba(15,118,110,0.5)' strokeWidth='2' strokeLinecap='round' />
        <line x1='60' x2='70' y1='70' y2='80' stroke='rgba(15,118,110,0.5)' strokeWidth='2' strokeLinecap='round' />
        <line x1='180' x2='170' y1='70' y2='80' stroke='rgba(15,118,110,0.5)' strokeWidth='2' strokeLinecap='round' />
        <line x1='40' x2='54' y1='120' y2='120' stroke='rgba(15,118,110,0.5)' strokeWidth='2' strokeLinecap='round' />
        <line x1='200' x2='186' y1='120' y2='120' stroke='rgba(15,118,110,0.5)' strokeWidth='2' strokeLinecap='round' />
        <line className='reasoning-dial-needle' x1='120' x2='120' y1='120' y2='58' stroke='#0f766e' strokeWidth='4' strokeLinecap='round' />
        <circle cx='120' cy='120' r='6' fill='#0f766e' />
        <circle className='reasoning-dial-pulse' cx='120' cy='42' r='6' fill='rgba(45,212,191,0.4)' />
        <circle className='reasoning-dial-pulse' cx='48' cy='120' r='6' fill='rgba(45,212,191,0.4)' style={{ animationDelay: '0.6s' }} />
        <circle className='reasoning-dial-pulse' cx='192' cy='120' r='6' fill='rgba(45,212,191,0.4)' style={{ animationDelay: '1.2s' }} />
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
        data-testid='agentic-reasoning-dial-frame'
      />
    </svg>
  );
};

export default function AgenticReasoningRouterGame({
  onFinish,
}: KangurMiniGameFinishActionProps): JSX.Element {
  return (
    <AgenticAssignmentGame
      copy={{
        statusLabel: 'Reasoning Router',
        heading: 'Route Tasks by Reasoning Level',
        lead:
          'Pick a task card, then assign the right reasoning level. Aim for the lightest effort that still keeps quality high.',
        instructions: [
          'Select a task to focus it.',
          'Click a reasoning level to route.',
          'Check your routing once all tasks are set.',
        ],
        leftPanelTitle: 'Routing Queue',
        leftPanelCaption: {
          coarsePointer: 'Tap a task to focus it.',
          finePointer: 'Choose the right effort.',
        },
        leftPanelCountLabel: (assignedCount, total) => `${assignedCount}/${total} routed`,
        leftPanelGroupLabel: 'Select a task to route',
        leftPanelTouchHint: {
          idle: 'Tap a task card, then tap a reasoning level.',
          selected: (itemText) => `Selected task: ${itemText} Tap a reasoning level.`,
          testId: 'agentic-reasoning-touch-hint',
        },
        rightPanelTitle: 'Reasoning Levels',
        rightPanelCaption: {
          coarsePointer: 'Tap to route the selected task.',
          finePointer: 'Click to route.',
        },
        rightPanelGroupLabel: 'Choose a reasoning level',
        successMessage: 'Perfect routing. Your effort levels are spot on.',
        failureMessage: (score, total) =>
          `You routed ${score}/${total} correctly. Adjust the mismatches and try again.`,
      }}
      items={ROUTER_TASKS}
      onFinish={onFinish}
      options={REASONING_LEVELS}
      theme={{
        accent: 'teal',
        heroClassName:
          'border border-teal-200/80 bg-gradient-to-br from-teal-50 via-white to-sky-50',
        heroTopGlowClassName: '-right-14 top-4 bg-teal-200/40',
        heroBottomGlowClassName: '-left-10 bottom-4 bg-sky-200/40',
        headingGradientClass: 'from-teal-500 via-cyan-500 to-sky-500',
        instructionListClassName: 'space-y-2 text-sm text-teal-950',
        leftPanelGlowClassName:
          '[background:radial-gradient(circle_at_top,_rgba(45,212,191,0.3),_transparent_55%)]',
        leftPanelTitleClassName: 'text-teal-950',
        leftPanelCaptionClassName: 'text-teal-800',
        leftTouchHintClassName: 'border-teal-200/80 text-teal-950',
        leftItemFocusRingClassName: 'focus-visible:ring-teal-400/70',
        leftItemActiveClassName: 'border-teal-400 bg-teal-50',
        leftItemInactiveClassName: 'border-teal-100/80',
        leftItemCorrectClassName: 'border-teal-400 bg-teal-50',
        leftItemWrongClassName: 'border-amber-300 bg-amber-50',
        leftAssignedBadgeClassName:
          'border-teal-200/70 bg-teal-100 text-teal-700',
        rightPanelGlowClassName:
          '[background:radial-gradient(circle_at_top,_rgba(14,116,144,0.25),_transparent_60%)]',
        rightPanelTitleClassName: 'text-teal-950',
        rightPanelCaptionClassName: 'text-teal-800',
        rightOptionFocusRingClassName: 'focus-visible:ring-teal-400/70',
        rightOptionDescriptionClassName: 'text-teal-900',
      }}
      visual={<ReasoningDialVisual />}
    />
  );
}
