import React from 'react';

import {
  AgenticAnimationSurface as AgenticSecondarySurface,
  useAgenticAnimationSurfaceIds as useAgenticSecondarySurfaceIds,
} from '@/features/kangur/ui/components/animations/AgenticAnimationSurface';

export function AgenticAutomationScheduleAnimation(): React.JSX.Element {
  const surfaceIds = useAgenticSecondarySurfaceIds('agentic-automation-schedule');

  return (
    <svg
      aria-label='Animacja: harmonogram automations w kalendarzu.'
      className='h-auto w-full'
      data-testid='agentic-automation-schedule-animation'
      role='img'
      viewBox='0 0 360 160'
    >
      <style>{`
        .agentic-automation-panel {
          fill: rgba(255,255,255,0.82);
          stroke: rgba(226,232,240,0.9);
          stroke-width: 2;
        }
        .agentic-automation-label {
          font: 700 10px/1.2 "Space Grotesk", "IBM Plex Sans", sans-serif;
          fill: #0f172a;
        }
        .agentic-automation-slot {
          fill: #f1f5f9;
          stroke: #cbd5f5;
          stroke-width: 1.5;
          animation: agenticAutomationSlot 7s ease-in-out infinite;
        }
        .agentic-automation-slot-2 { animation-delay: 1.2s; }
        .agentic-automation-slot-3 { animation-delay: 2.4s; }
        .agentic-automation-slot-4 { animation-delay: 3.6s; }
        .agentic-automation-slot-5 { animation-delay: 4.8s; }
        .agentic-automation-dot {
          fill: #6366f1;
          animation: agenticAutomationDot 7s ease-in-out infinite;
          transform-box: fill-box;
          transform-origin: center;
        }
        @keyframes agenticAutomationSlot {
          0%, 15% { fill: #f1f5f9; stroke: #cbd5f5; }
          30%, 55% { fill: #eef2ff; stroke: #6366f1; }
          100% { fill: #f1f5f9; stroke: #cbd5f5; }
        }
        @keyframes agenticAutomationDot {
          0% { transform: translateX(0); opacity: 0; }
          20% { opacity: 1; }
          50% { transform: translateX(140px); opacity: 1; }
          80% { opacity: 1; }
          100% { transform: translateX(200px); opacity: 0; }
        }
        @media (prefers-reduced-motion: reduce) {
          .agentic-automation-slot, .agentic-automation-dot { animation: none; }
        }
      `}</style>
      <AgenticSecondarySurface
        accentEnd='#e0e7ff'
        accentStart='#6366f1'
        atmosphereA='rgba(99,102,241,0.08)'
        atmosphereB='rgba(56,189,248,0.08)'
        ids={surfaceIds}
        stroke='rgba(99,102,241,0.12)'
        testIdPrefix='agentic-automation-schedule'
        x={12}
        y={12}
        width={336}
        height={136}
        rx={24}
      />
      <rect className='agentic-automation-panel' height='98' rx='16' width='300' x='30' y='32' />
      <text className='agentic-automation-label' x='50' y='54'>Automation schedule</text>
      <rect className='agentic-automation-slot agentic-automation-slot-1' height='16' rx='6' width='80' x='50' y='68' />
      <rect className='agentic-automation-slot agentic-automation-slot-2' height='16' rx='6' width='90' x='145' y='68' />
      <rect className='agentic-automation-slot agentic-automation-slot-3' height='16' rx='6' width='70' x='240' y='68' />
      <rect className='agentic-automation-slot agentic-automation-slot-4' height='16' rx='6' width='110' x='50' y='92' />
      <rect className='agentic-automation-slot agentic-automation-slot-5' height='16' rx='6' width='120' x='170' y='92' />
      <circle className='agentic-automation-dot' cx='60' cy='120' r='4' />
    </svg>
  );
}

export function AgenticEvidencePackAnimation(): React.JSX.Element {
  const surfaceIds = useAgenticSecondarySurfaceIds('agentic-evidence-pack');

  return (
    <svg
      aria-label='Animacja: pakiet dowodów (diff, testy, podsumowanie).'
      className='h-auto w-full'
      data-testid='agentic-evidence-pack-animation'
      role='img'
      viewBox='0 0 360 150'
    >
      <style>{`
        .agentic-evidence-panel {
          fill: rgba(255,255,255,0.82);
          stroke: rgba(226,232,240,0.9);
          stroke-width: 2;
        }
        .agentic-evidence-label {
          font: 700 10px/1.2 "Space Grotesk", "IBM Plex Sans", sans-serif;
          fill: #0f172a;
        }
        .agentic-evidence-check {
          stroke: #22c55e;
          stroke-width: 3.5;
          stroke-linecap: round;
          stroke-linejoin: round;
          opacity: 0.2;
          animation: agenticEvidenceCheck 6s ease-in-out infinite;
        }
        .agentic-evidence-check-2 { animation-delay: 1.5s; }
        .agentic-evidence-check-3 { animation-delay: 3s; }
        @keyframes agenticEvidenceCheck {
          0%, 35% { opacity: 0.2; }
          55%, 100% { opacity: 1; }
        }
        @media (prefers-reduced-motion: reduce) {
          .agentic-evidence-check { animation: none; opacity: 1; }
        }
      `}</style>
      <AgenticSecondarySurface
        accentEnd='#dcfce7'
        accentStart='#22c55e'
        atmosphereA='rgba(34,197,94,0.08)'
        atmosphereB='rgba(56,189,248,0.08)'
        ids={surfaceIds}
        stroke='rgba(34,197,94,0.12)'
        testIdPrefix='agentic-evidence-pack'
        x={12}
        y={12}
        width={336}
        height={126}
        rx={24}
      />
      <rect className='agentic-evidence-panel' height='70' rx='14' width='90' x='30' y='42' />
      <rect className='agentic-evidence-panel' height='70' rx='14' width='90' x='135' y='42' />
      <rect className='agentic-evidence-panel' height='70' rx='14' width='90' x='240' y='42' />
      <text className='agentic-evidence-label' x='52' y='64'>Diff</text>
      <text className='agentic-evidence-label' x='152' y='64'>Tests</text>
      <text className='agentic-evidence-label' x='252' y='64'>Summary</text>
      <path className='agentic-evidence-check' d='M50 88 L60 98 L78 78' />
      <path className='agentic-evidence-check agentic-evidence-check-2' d='M155 88 L165 98 L183 78' />
      <path className='agentic-evidence-check agentic-evidence-check-3' d='M260 88 L270 98 L288 78' />
    </svg>
  );
}

export function AgenticFitQuadrantAnimation(): React.JSX.Element {
  const surfaceIds = useAgenticSecondarySurfaceIds('agentic-fit-quadrant');

  return (
    <svg
      aria-label='Animacja: matryca fit (klarowny scope i weryfikacja).'
      className='h-auto w-full'
      data-testid='agentic-fit-quadrant-animation'
      role='img'
      viewBox='0 0 360 160'
    >
      <style>{`
        .agentic-fit-cell {
          fill: rgba(255,255,255,0.82);
          stroke: rgba(226,232,240,0.9);
          stroke-width: 2;
        }
        .agentic-fit-good {
          fill: rgba(236,253,245,0.96);
          stroke: #10b981;
        }
        .agentic-fit-label {
          font: 700 9px/1.2 "Space Grotesk", "IBM Plex Sans", sans-serif;
          fill: #0f172a;
        }
        .agentic-fit-muted {
          font: 600 8px/1.2 "Space Grotesk", "IBM Plex Sans", sans-serif;
          fill: #64748b;
        }
        .agentic-fit-pulse { animation: agenticFitPulse 6s ease-in-out infinite; }
        @keyframes agenticFitPulse {
          0%, 30% { opacity: 0.4; }
          50%, 100% { opacity: 1; }
        }
        @media (prefers-reduced-motion: reduce) {
          .agentic-fit-pulse { animation: none; opacity: 1; }
        }
      `}</style>
      <AgenticSecondarySurface
        accentEnd='#dcfce7'
        accentStart='#10b981'
        atmosphereA='rgba(16,185,129,0.08)'
        atmosphereB='rgba(56,189,248,0.08)'
        ids={surfaceIds}
        stroke='rgba(16,185,129,0.12)'
        testIdPrefix='agentic-fit-quadrant'
        x={12}
        y={12}
        width={336}
        height={136}
        rx={24}
      />
      <rect className='agentic-fit-cell' height='48' rx='12' width='120' x='40' y='40' />
      <rect className='agentic-fit-cell' height='48' rx='12' width='120' x='200' y='40' />
      <rect className='agentic-fit-cell' height='48' rx='12' width='120' x='40' y='96' />
      <rect className='agentic-fit-good agentic-fit-pulse' height='48' rx='12' width='120' x='200' y='96' />
      <text className='agentic-fit-label' x='60' y='68'>Low scope</text>
      <text className='agentic-fit-label' x='216' y='68'>Clear scope</text>
      <text className='agentic-fit-label' x='60' y='124'>Weak proof</text>
      <text className='agentic-fit-label' x='216' y='124'>Strong proof</text>
      <text className='agentic-fit-muted' x='44' y='28'>Verification</text>
      <text className='agentic-fit-muted' x='250' y='28'>Scope clarity</text>
    </svg>
  );
}

export function AgenticRolloutMetricsAnimation(): React.JSX.Element {
  const surfaceIds = useAgenticSecondarySurfaceIds('agentic-rollout-metrics');

  return (
    <svg
      aria-label='Animacja: metryki rolloutu (adopcja i jakość).'
      className='h-auto w-full'
      data-testid='agentic-rollout-metrics-animation'
      role='img'
      viewBox='0 0 360 150'
    >
      <style>{`
        .agentic-metrics-grid { stroke: #e2e8f0; stroke-width: 1.5; }
        .agentic-metrics-bar {
          fill: #ccfbf1;
          stroke: #14b8a6;
          stroke-width: 1.5;
          transform-origin: bottom;
          animation: agenticMetricsBar 6s ease-in-out infinite;
        }
        .agentic-metrics-bar-2 { animation-delay: 0.5s; }
        .agentic-metrics-bar-3 { animation-delay: 1s; }
        .agentic-metrics-bar-4 { animation-delay: 1.5s; }
        .agentic-metrics-line {
          stroke: #0ea5e9;
          stroke-width: 2.5;
          fill: none;
          stroke-linecap: round;
        }
        .agentic-metrics-dot { fill: #0ea5e9; }
        .agentic-metrics-label {
          font: 700 9px/1.2 "Space Grotesk", "IBM Plex Sans", sans-serif;
          fill: #0f172a;
        }
        @keyframes agenticMetricsBar {
          0%, 20% { transform: scaleY(0.5); }
          40%, 100% { transform: scaleY(1); }
        }
        @media (prefers-reduced-motion: reduce) {
          .agentic-metrics-bar { animation: none; }
        }
      `}</style>
      <AgenticSecondarySurface
        accentEnd='#ccfbf1'
        accentStart='#14b8a6'
        atmosphereA='rgba(20,184,166,0.08)'
        atmosphereB='rgba(14,165,233,0.08)'
        ids={surfaceIds}
        stroke='rgba(20,184,166,0.12)'
        testIdPrefix='agentic-rollout-metrics'
        x={12}
        y={12}
        width={336}
        height={126}
        rx={24}
      />
      <line className='agentic-metrics-grid' x1='40' x2='320' y1='106' y2='106' />
      <line className='agentic-metrics-grid' x1='40' x2='320' y1='68' y2='68' />
      <rect className='agentic-metrics-bar agentic-metrics-bar-1' height='40' rx='6' width='36' x='60' y='66' />
      <rect className='agentic-metrics-bar agentic-metrics-bar-2' height='52' rx='6' width='36' x='120' y='54' />
      <rect className='agentic-metrics-bar agentic-metrics-bar-3' height='62' rx='6' width='36' x='180' y='44' />
      <rect className='agentic-metrics-bar agentic-metrics-bar-4' height='72' rx='6' width='36' x='240' y='34' />
      <path className='agentic-metrics-line' d='M78 90 L138 76 L198 66 L258 56' />
      <circle className='agentic-metrics-dot' cx='78' cy='90' r='3.5' />
      <circle className='agentic-metrics-dot' cx='138' cy='76' r='3.5' />
      <circle className='agentic-metrics-dot' cx='198' cy='66' r='3.5' />
      <circle className='agentic-metrics-dot' cx='258' cy='56' r='3.5' />
      <text className='agentic-metrics-label' x='44' y='28'>Adoption</text>
      <text className='agentic-metrics-label' x='252' y='28'>Quality</text>
    </svg>
  );
}
