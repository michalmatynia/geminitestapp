import React from 'react';

import {
  AgenticAnimationSurface as AgenticSecondarySurface,
  useAgenticAnimationSurfaceIds as useAgenticSecondarySurfaceIds,
} from '@/features/kangur/ui/components/animations/AgenticAnimationSurface';

export function AgenticRoutingDialAnimation(): React.JSX.Element {
  const surfaceIds = useAgenticSecondarySurfaceIds('agentic-routing-dial');

  return (
    <svg
      aria-label='Animacja: routing między szybkością, kosztem i głębią.'
      className='h-auto w-full'
      data-testid='agentic-routing-dial-animation'
      role='img'
      viewBox='0 0 360 160'
    >
      <style>{`
        .agentic-routing-dial {
          fill: rgba(255,255,255,0.82);
          stroke: rgba(226,232,240,0.9);
          stroke-width: 2;
        }
        .agentic-routing-label {
          font: 700 10px/1.2 "Space Grotesk", "IBM Plex Sans", sans-serif;
          fill: #0f172a;
        }
        .agentic-routing-tick {
          stroke: #cbd5f5;
          stroke-width: 2;
          stroke-linecap: round;
        }
        .agentic-routing-needle {
          stroke: #14b8a6;
          stroke-width: 3;
          stroke-linecap: round;
          transform-origin: center;
          animation: agenticRoutingNeedle 6s ease-in-out infinite;
        }
        .agentic-routing-needle-2 {
          stroke: #6366f1;
          animation-delay: 1.5s;
        }
        @keyframes agenticRoutingNeedle {
          0% { transform: rotate(-40deg); }
          40% { transform: rotate(10deg); }
          70% { transform: rotate(35deg); }
          100% { transform: rotate(-40deg); }
        }
        @media (prefers-reduced-motion: reduce) {
          .agentic-routing-needle { animation: none; transform: rotate(10deg); }
        }
      `}</style>
      <AgenticSecondarySurface
        accentEnd='#e0e7ff'
        accentStart='#6366f1'
        atmosphereA='rgba(99,102,241,0.08)'
        atmosphereB='rgba(20,184,166,0.08)'
        ids={surfaceIds}
        stroke='rgba(99,102,241,0.12)'
        testIdPrefix='agentic-routing-dial'
        x={12}
        y={12}
        width={336}
        height={136}
        rx={24}
      />
      <circle className='agentic-routing-dial' cx='110' cy='86' r='44' />
      <circle className='agentic-routing-dial' cx='250' cy='86' r='44' />
      <line className='agentic-routing-tick' x1='110' x2='110' y1='40' y2='52' />
      <line className='agentic-routing-tick' x1='84' x2='92' y1='48' y2='58' />
      <line className='agentic-routing-tick' x1='136' x2='128' y1='48' y2='58' />
      <line className='agentic-routing-tick' x1='250' x2='250' y1='40' y2='52' />
      <line className='agentic-routing-tick' x1='224' x2='232' y1='48' y2='58' />
      <line className='agentic-routing-tick' x1='276' x2='268' y1='48' y2='58' />
      <line className='agentic-routing-needle' x1='110' x2='110' y1='86' y2='54' />
      <line className='agentic-routing-needle agentic-routing-needle-2' x1='250' x2='250' y1='86' y2='54' />
      <text className='agentic-routing-label' x='84' y='128'>Speed</text>
      <text className='agentic-routing-label' x='228' y='128'>Depth</text>
    </svg>
  );
}

export function AgenticApprovalScopeMapAnimation(): React.JSX.Element {
  const surfaceIds = useAgenticSecondarySurfaceIds('agentic-approval-scope-map');

  return (
    <svg
      aria-label='Animacja: eskalacja uprawnień od read-only do network.'
      className='h-auto w-full'
      data-testid='agentic-approval-scope-map-animation'
      role='img'
      viewBox='0 0 360 150'
    >
      <style>{`
        .agentic-scope-node {
          fill: rgba(255,255,255,0.82);
          stroke: rgba(226,232,240,0.9);
          stroke-width: 2;
        }
        .agentic-scope-label {
          font: 700 10px/1.2 "Space Grotesk", "IBM Plex Sans", sans-serif;
          fill: #0f172a;
        }
        .agentic-scope-line {
          stroke: #cbd5f5;
          stroke-width: 2.5;
          stroke-linecap: round;
        }
        .agentic-scope-dot {
          fill: #f97316;
          animation: agenticScopeDot 6s ease-in-out infinite;
          transform-box: fill-box;
          transform-origin: center;
        }
        @keyframes agenticScopeDot {
          0% { transform: translateX(0); opacity: 0; }
          15% { opacity: 1; }
          50% { transform: translateX(120px); opacity: 1; }
          80% { opacity: 1; }
          100% { transform: translateX(200px); opacity: 0; }
        }
        @media (prefers-reduced-motion: reduce) {
          .agentic-scope-dot { animation: none; opacity: 1; transform: translateX(120px); }
        }
      `}</style>
      <AgenticSecondarySurface
        accentEnd='#ffedd5'
        accentStart='#f97316'
        atmosphereA='rgba(249,115,22,0.08)'
        atmosphereB='rgba(56,189,248,0.08)'
        ids={surfaceIds}
        stroke='rgba(249,115,22,0.12)'
        testIdPrefix='agentic-approval-scope-map'
        x={12}
        y={12}
        width={336}
        height={126}
        rx={24}
      />
      <line className='agentic-scope-line' x1='80' x2='280' y1='76' y2='76' />
      <circle className='agentic-scope-node' cx='80' cy='76' r='22' />
      <circle className='agentic-scope-node' cx='180' cy='76' r='22' />
      <circle className='agentic-scope-node' cx='280' cy='76' r='22' />
      <text className='agentic-scope-label' x='52' y='114'>Read-only</text>
      <text className='agentic-scope-label' x='158' y='114'>Workspace</text>
      <text className='agentic-scope-label' x='258' y='114'>Network</text>
      <circle className='agentic-scope-dot' cx='80' cy='76' r='5' />
    </svg>
  );
}

export function AgenticSkillManifestAnimation(): React.JSX.Element {
  const surfaceIds = useAgenticSecondarySurfaceIds('agentic-skill-manifest');

  return (
    <svg
      aria-label='Animacja: manifest skilla z wejściami, narzędziami i outputem.'
      className='h-auto w-full'
      data-testid='agentic-skill-manifest-animation'
      role='img'
      viewBox='0 0 360 150'
    >
      <style>{`
        .agentic-manifest-card {
          fill: rgba(255,255,255,0.82);
          stroke: rgba(226,232,240,0.9);
          stroke-width: 2;
        }
        .agentic-manifest-label {
          font: 700 10px/1.2 "Space Grotesk", "IBM Plex Sans", sans-serif;
          fill: #0f172a;
        }
        .agentic-manifest-pulse-1, .agentic-manifest-pulse-2, .agentic-manifest-pulse-3, .agentic-manifest-pulse-4 {
          animation: agenticManifestPulse 6s ease-in-out infinite;
        }
        .agentic-manifest-pulse-2 { animation-delay: 1.5s; }
        .agentic-manifest-pulse-3 { animation-delay: 3s; }
        .agentic-manifest-pulse-4 { animation-delay: 4.5s; }
        @keyframes agenticManifestPulse {
          0%, 18% { fill: rgba(255,255,255,0.82); stroke: rgba(226,232,240,0.9); }
          30%, 55% { fill: rgba(236,254,255,0.96); stroke: #22d3ee; }
          100% { fill: rgba(255,255,255,0.82); stroke: rgba(226,232,240,0.9); }
        }
        @media (prefers-reduced-motion: reduce) {
          .agentic-manifest-pulse-1, .agentic-manifest-pulse-2, .agentic-manifest-pulse-3, .agentic-manifest-pulse-4 { animation: none; }
        }
      `}</style>
      <AgenticSecondarySurface
        accentEnd='#ecfeff'
        accentStart='#22d3ee'
        atmosphereA='rgba(34,211,238,0.08)'
        atmosphereB='rgba(56,189,248,0.08)'
        ids={surfaceIds}
        stroke='rgba(34,211,238,0.12)'
        testIdPrefix='agentic-skill-manifest'
        x={12}
        y={12}
        width={336}
        height={126}
        rx={24}
      />
      <rect className='agentic-manifest-card agentic-manifest-pulse-1' height='44' rx='12' width='140' x='20' y='32' />
      <rect className='agentic-manifest-card agentic-manifest-pulse-2' height='44' rx='12' width='140' x='200' y='32' />
      <rect className='agentic-manifest-card agentic-manifest-pulse-3' height='44' rx='12' width='140' x='20' y='84' />
      <rect className='agentic-manifest-card agentic-manifest-pulse-4' height='44' rx='12' width='140' x='200' y='84' />
      <text className='agentic-manifest-label' x='44' y='58'>Inputs</text>
      <text className='agentic-manifest-label' x='226' y='58'>Tools</text>
      <text className='agentic-manifest-label' x='44' y='110'>Outputs</text>
      <text className='agentic-manifest-label' x='226' y='110'>Safety</text>
    </svg>
  );
}

export function AgenticCliIdeFlowAnimation(): React.JSX.Element {
  const surfaceIds = useAgenticSecondarySurfaceIds('agentic-cli-ide-flow');

  return (
    <svg
      aria-label='Animacja: przepływ między IDE a CLI.'
      className='h-auto w-full'
      data-testid='agentic-cli-ide-flow-animation'
      role='img'
      viewBox='0 0 360 160'
    >
      <style>{`
        .agentic-cliide-panel {
          fill: rgba(255,255,255,0.82);
          stroke: rgba(226,232,240,0.9);
          stroke-width: 2;
        }
        .agentic-cliide-label {
          font: 700 10px/1.2 "Space Grotesk", "IBM Plex Sans", sans-serif;
          fill: #0f172a;
        }
        .agentic-cliide-line {
          stroke: #bae6fd;
          stroke-width: 3;
          stroke-linecap: round;
        }
        .agentic-cliide-dot {
          fill: #38bdf8;
          animation: agenticCliIdeDot 5.8s ease-in-out infinite;
          transform-box: fill-box;
          transform-origin: center;
        }
        @keyframes agenticCliIdeDot {
          0% { transform: translateX(0); opacity: 0; }
          15% { opacity: 1; }
          55% { transform: translateX(150px); opacity: 1; }
          100% { transform: translateX(210px); opacity: 0; }
        }
        @media (prefers-reduced-motion: reduce) {
          .agentic-cliide-dot { animation: none; opacity: 1; transform: translateX(130px); }
        }
      `}</style>
      <AgenticSecondarySurface
        accentEnd='#dbeafe'
        accentStart='#38bdf8'
        atmosphereA='rgba(56,189,248,0.08)'
        atmosphereB='rgba(129,140,248,0.08)'
        ids={surfaceIds}
        stroke='rgba(56,189,248,0.12)'
        testIdPrefix='agentic-cli-ide-flow'
        x={12}
        y={12}
        width={336}
        height={136}
        rx={24}
      />
      <rect className='agentic-cliide-panel' height='70' rx='14' width='120' x='30' y='46' />
      <rect className='agentic-cliide-panel' height='70' rx='14' width='120' x='210' y='46' />
      <text className='agentic-cliide-label' x='68' y='76'>IDE</text>
      <text className='agentic-cliide-label' x='248' y='76'>CLI</text>
      <line className='agentic-cliide-line' x1='150' x2='210' y1='81' y2='81' />
      <circle className='agentic-cliide-dot' cx='150' cy='81' r='5' />
    </svg>
  );
}
