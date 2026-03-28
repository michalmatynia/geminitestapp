import React from 'react';

import {
  AgenticAnimationSurface as AgenticSecondarySurface,
  useAgenticAnimationSurfaceIds as useAgenticSecondarySurfaceIds,
} from '@/features/kangur/ui/components/animations/AgenticAnimationSurface';

export function AgenticRolloutStagesAnimation(): React.JSX.Element {
  const surfaceIds = useAgenticSecondarySurfaceIds('agentic-rollout-stages');

  return (
    <svg
      aria-label='Animacja: etapy rolloutu zespołowego.'
      className='h-auto w-full'
      data-testid='agentic-rollout-stages-animation'
      role='img'
      viewBox='0 0 360 150'
    >
      <style>{`
        .agentic-rollout-line {
          stroke: #cbd5f5;
          stroke-width: 3;
          stroke-linecap: round;
        }
        .agentic-rollout-node {
          fill: rgba(255,255,255,0.82);
          stroke: rgba(226,232,240,0.9);
          stroke-width: 2;
        }
        .agentic-rollout-label {
          font: 700 10px/1.2 "Space Grotesk", "IBM Plex Sans", sans-serif;
          fill: #0f172a;
        }
        .agentic-rollout-pulse-1, .agentic-rollout-pulse-2, .agentic-rollout-pulse-3, .agentic-rollout-pulse-4 {
          animation: agenticRolloutPulse 6s ease-in-out infinite;
        }
        .agentic-rollout-pulse-2 { animation-delay: 1.5s; }
        .agentic-rollout-pulse-3 { animation-delay: 3s; }
        .agentic-rollout-pulse-4 { animation-delay: 4.5s; }
        @keyframes agenticRolloutPulse {
          0%, 20% { fill: rgba(255,255,255,0.82); stroke: rgba(226,232,240,0.9); }
          30%, 55% { fill: rgba(204,251,241,0.96); stroke: #14b8a6; }
          100% { fill: rgba(255,255,255,0.82); stroke: rgba(226,232,240,0.9); }
        }
        @media (prefers-reduced-motion: reduce) {
          .agentic-rollout-pulse-1, .agentic-rollout-pulse-2, .agentic-rollout-pulse-3, .agentic-rollout-pulse-4 { animation: none; }
        }
      `}</style>
      <AgenticSecondarySurface
        accentEnd='#ccfbf1'
        accentStart='#14b8a6'
        atmosphereA='rgba(20,184,166,0.08)'
        atmosphereB='rgba(56,189,248,0.08)'
        ids={surfaceIds}
        stroke='rgba(20,184,166,0.12)'
        testIdPrefix='agentic-rollout-stages'
        x={12}
        y={12}
        width={336}
        height={126}
        rx={24}
      />
      <line className='agentic-rollout-line' x1='40' x2='320' y1='76' y2='76' />
      <circle className='agentic-rollout-node agentic-rollout-pulse-1' cx='70' cy='76' r='14' />
      <circle className='agentic-rollout-node agentic-rollout-pulse-2' cx='150' cy='76' r='14' />
      <circle className='agentic-rollout-node agentic-rollout-pulse-3' cx='230' cy='76' r='14' />
      <circle className='agentic-rollout-node agentic-rollout-pulse-4' cx='310' cy='76' r='14' />
      <text className='agentic-rollout-label' x='52' y='106'>Pilot</text>
      <text className='agentic-rollout-label' x='118' y='106'>Playbook</text>
      <text className='agentic-rollout-label' x='208' y='106'>Metrics</text>
      <text className='agentic-rollout-label' x='292' y='106'>Scale</text>
    </svg>
  );
}

export function AgenticDoDontAnimation(): React.JSX.Element {
  const surfaceIds = useAgenticSecondarySurfaceIds('agentic-do-dont');

  return (
    <svg
      aria-label='Animacja: do i don’t w agentic coding.'
      className='h-auto w-full'
      data-testid='agentic-do-dont-animation'
      role='img'
      viewBox='0 0 360 150'
    >
      <style>{`
        .agentic-dodont-panel {
          fill: rgba(255,255,255,0.82);
          stroke: rgba(226,232,240,0.9);
          stroke-width: 2;
        }
        .agentic-dodont-label {
          font: 700 12px/1.2 "Space Grotesk", "IBM Plex Sans", sans-serif;
          fill: #0f172a;
        }
        .agentic-dodont-check {
          stroke: #22c55e;
          stroke-width: 6;
          stroke-linecap: round;
          stroke-linejoin: round;
          animation: agenticDoCheck 4.8s ease-in-out infinite;
        }
        .agentic-dodont-cross {
          stroke: #f43f5e;
          stroke-width: 6;
          stroke-linecap: round;
          animation: agenticDoCross 4.8s ease-in-out infinite;
        }
        @keyframes agenticDoCheck {
          0%, 30% { opacity: 0.4; }
          50%, 100% { opacity: 1; }
        }
        @keyframes agenticDoCross {
          0%, 55% { opacity: 0.4; }
          70%, 100% { opacity: 1; }
        }
        @media (prefers-reduced-motion: reduce) {
          .agentic-dodont-check, .agentic-dodont-cross { animation: none; opacity: 1; }
        }
      `}</style>
      <AgenticSecondarySurface
        accentEnd='#fee2e2'
        accentStart='#f43f5e'
        atmosphereA='rgba(244,63,94,0.08)'
        atmosphereB='rgba(34,197,94,0.08)'
        ids={surfaceIds}
        stroke='rgba(244,63,94,0.12)'
        testIdPrefix='agentic-do-dont'
        x={12}
        y={12}
        width={336}
        height={126}
        rx={24}
      />
      <rect className='agentic-dodont-panel' height='90' rx='16' width='150' x='20' y='28' />
      <rect className='agentic-dodont-panel' height='90' rx='16' width='150' x='190' y='28' />
      <text className='agentic-dodont-label' x='70' y='52'>Do</text>
      <text className='agentic-dodont-label' x='230' y='52'>Don&apos;t</text>
      <path className='agentic-dodont-check' d='M60 84 L80 102 L120 64' />
      <line className='agentic-dodont-cross' x1='220' x2='300' y1='66' y2='106' />
      <line className='agentic-dodont-cross' x1='300' x2='220' y1='66' y2='106' />
    </svg>
  );
}

export function AgenticDocsStackAnimation(): React.JSX.Element {
  const surfaceIds = useAgenticSecondarySurfaceIds('agentic-docs-stack');

  return (
    <svg
      aria-label='Animacja: stos dokumentów z AGENTS.md na wierzchu.'
      className='h-auto w-full'
      data-testid='agentic-docs-stack-animation'
      role='img'
      viewBox='0 0 360 150'
    >
      <style>{`
        .agentic-docs-sheet {
          fill: rgba(255,255,255,0.86);
          stroke: rgba(226,232,240,0.9);
          stroke-width: 2;
        }
        .agentic-docs-title {
          font: 700 11px/1.2 "Space Grotesk", "IBM Plex Sans", sans-serif;
          fill: #0f172a;
        }
        .agentic-docs-pulse { animation: agenticDocsPulse 5.4s ease-in-out infinite; }
        @keyframes agenticDocsPulse {
          0%, 30% { fill: rgba(255,255,255,0.86); stroke: rgba(226,232,240,0.9); }
          45%, 70% { fill: rgba(254,243,199,0.96); stroke: #f59e0b; }
          100% { fill: rgba(255,255,255,0.86); stroke: rgba(226,232,240,0.9); }
        }
        @media (prefers-reduced-motion: reduce) {
          .agentic-docs-pulse { animation: none; }
        }
      `}</style>
      <AgenticSecondarySurface
        accentEnd='#fef3c7'
        accentStart='#f59e0b'
        atmosphereA='rgba(245,158,11,0.08)'
        atmosphereB='rgba(56,189,248,0.08)'
        ids={surfaceIds}
        stroke='rgba(245,158,11,0.12)'
        testIdPrefix='agentic-docs-stack'
        x={12}
        y={12}
        width={336}
        height={126}
        rx={24}
      />
      <rect className='agentic-docs-sheet' height='60' rx='12' width='200' x='80' y='34' />
      <rect className='agentic-docs-sheet' height='60' rx='12' width='200' x='70' y='42' />
      <rect className='agentic-docs-sheet agentic-docs-pulse' height='60' rx='12' width='200' x='60' y='50' />
      <text className='agentic-docs-title' x='88' y='80'>AGENTS.md</text>
      <text className='agentic-docs-title' x='88' y='96'>Repo playbook</text>
    </svg>
  );
}

export function AgenticContextLensAnimation(): React.JSX.Element {
  const surfaceIds = useAgenticSecondarySurfaceIds('agentic-context-lens');

  return (
    <svg
      aria-label='Animacja: soczewka kontekstu skansuje najważniejsze pliki.'
      className='h-auto w-full'
      data-testid='agentic-context-lens-animation'
      role='img'
      viewBox='0 0 360 150'
    >
      <style>{`
        .agentic-context-card {
          fill: rgba(255,255,255,0.82);
          stroke: rgba(226,232,240,0.9);
          stroke-width: 2;
        }
        .agentic-context-label {
          font: 700 10px/1.2 "Space Grotesk", "IBM Plex Sans", sans-serif;
          fill: #0f172a;
        }
        .agentic-context-muted {
          font: 600 9px/1.2 "Space Grotesk", "IBM Plex Sans", sans-serif;
          fill: #64748b;
        }
        .agentic-context-lens {
          fill: rgba(56, 189, 248, 0.12);
          stroke: #38bdf8;
          stroke-width: 3;
        }
        .agentic-context-handle {
          stroke: #38bdf8;
          stroke-width: 3;
          stroke-linecap: round;
        }
        .agentic-context-scan {
          animation: agenticContextScan 6s ease-in-out infinite;
          transform-box: fill-box;
          transform-origin: center;
        }
        @keyframes agenticContextScan {
          0% { transform: translateX(0); opacity: 0; }
          15% { opacity: 1; }
          50% { transform: translateX(140px); opacity: 1; }
          80% { opacity: 1; }
          100% { transform: translateX(200px); opacity: 0; }
        }
        @media (prefers-reduced-motion: reduce) {
          .agentic-context-scan { animation: none; opacity: 1; transform: translateX(120px); }
        }
      `}</style>
      <AgenticSecondarySurface
        accentEnd='#dbeafe'
        accentStart='#38bdf8'
        atmosphereA='rgba(56,189,248,0.08)'
        atmosphereB='rgba(129,140,248,0.08)'
        ids={surfaceIds}
        stroke='rgba(56,189,248,0.12)'
        testIdPrefix='agentic-context-lens'
        x={12}
        y={12}
        width={336}
        height={126}
        rx={24}
      />
      <rect className='agentic-context-card' height='36' rx='10' width='140' x='30' y='28' />
      <rect className='agentic-context-card' height='36' rx='10' width='140' x='30' y='76' />
      <rect className='agentic-context-card' height='36' rx='10' width='140' x='190' y='28' />
      <rect className='agentic-context-card' height='36' rx='10' width='140' x='190' y='76' />
      <text className='agentic-context-label' x='46' y='50'>app/editor.tsx</text>
      <text className='agentic-context-muted' x='46' y='62'>UI surface</text>
      <text className='agentic-context-label' x='46' y='98'>shared/hooks.ts</text>
      <text className='agentic-context-muted' x='46' y='110'>shared logic</text>
      <text className='agentic-context-label' x='206' y='50'>resources.ts</text>
      <text className='agentic-context-muted' x='206' y='62'>data source</text>
      <text className='agentic-context-label' x='206' y='98'>tests/editor.spec</text>
      <text className='agentic-context-muted' x='206' y='110'>proof</text>
      <g className='agentic-context-scan'>
        <circle className='agentic-context-lens' cx='80' cy='70' r='24' />
        <line className='agentic-context-handle' x1='96' x2='120' y1='86' y2='108' />
      </g>
    </svg>
  );
}
