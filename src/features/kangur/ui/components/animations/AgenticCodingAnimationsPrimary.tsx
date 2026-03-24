import React, { useId } from 'react';

type AgenticSurfaceIds = {
  clipId: string;
  frameGradientId: string;
  panelGradientId: string;
};

type AgenticSurfaceProps = {
  accentEnd: string;
  accentStart: string;
  atmosphereA: string;
  atmosphereB: string;
  ids: AgenticSurfaceIds;
  stroke: string;
  testIdPrefix: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rx: number;
};

function useAgenticSurfaceIds(prefix: string): AgenticSurfaceIds {
  const baseId = useId().replace(/:/g, '');

  return {
    clipId: `${prefix}-${baseId}-clip`,
    frameGradientId: `${prefix}-${baseId}-frame`,
    panelGradientId: `${prefix}-${baseId}-panel`,
  };
}

function AgenticSurface({
  accentEnd,
  accentStart,
  atmosphereA,
  atmosphereB,
  ids,
  stroke,
  testIdPrefix,
  x,
  y,
  width,
  height,
  rx,
}: AgenticSurfaceProps): React.JSX.Element {
  return (
    <>
      <defs>
        <clipPath id={ids.clipId}>
          <rect x={x} y={y} width={width} height={height} rx={rx} />
        </clipPath>
        <linearGradient
          id={ids.panelGradientId}
          x1={x}
          x2={x + width}
          y1={y}
          y2={y + height}
          gradientUnits='userSpaceOnUse'
        >
          <stop offset='0%' stopColor='#f8fafc' />
          <stop offset='55%' stopColor='#eff6ff' />
          <stop offset='100%' stopColor={accentEnd} />
        </linearGradient>
        <linearGradient
          id={ids.frameGradientId}
          x1={x}
          x2={x + width}
          y1={y}
          y2={y}
          gradientUnits='userSpaceOnUse'
        >
          <stop offset='0%' stopColor={accentStart} stopOpacity='0.74' />
          <stop offset='100%' stopColor='#ffffff' stopOpacity='0.92' />
        </linearGradient>
      </defs>
      <g clipPath={`url(#${ids.clipId})`} data-testid={`${testIdPrefix}-atmosphere`}>
        <rect
          fill={`url(#${ids.panelGradientId})`}
          height={height}
          rx={rx}
          stroke={stroke}
          strokeWidth='2'
          width={width}
          x={x}
          y={y}
        />
        <ellipse cx={x + width * 0.2} cy={y + height * 0.18} fill={atmosphereA} rx={width * 0.22} ry={height * 0.16} />
        <ellipse cx={x + width * 0.82} cy={y + height * 0.88} fill={atmosphereB} rx={width * 0.32} ry={height * 0.22} />
      </g>
      <rect
        data-testid={`${testIdPrefix}-frame`}
        fill='none'
        height={height - 12}
        rx={Math.max(rx - 4, 8)}
        stroke={`url(#${ids.frameGradientId})`}
        strokeWidth='1.5'
        width={width - 12}
        x={x + 6}
        y={y + 6}
      />
    </>
  );
}

export function AgenticBriefContractAnimation(): React.JSX.Element {
  const surfaceIds = useAgenticSurfaceIds('agentic-brief-contract');

  return (
    <svg
      aria-label='Animacja: brief jako kontrakt (Goal, Context, Constraints, Done).'
      className='h-auto w-full'
      data-testid='agentic-brief-contract-animation'
      role='img'
      viewBox='0 0 360 150'
    >
      <style>{`
        .agentic-brief-card {
          fill: rgba(255,255,255,0.78);
          stroke: rgba(226,232,240,0.9);
          stroke-width: 2;
        }
        .agentic-brief-label {
          font: 700 11px/1.2 "Space Grotesk", "IBM Plex Sans", sans-serif;
          fill: #0f172a;
        }
        .agentic-brief-caption {
          font: 600 10px/1.2 "Space Grotesk", "IBM Plex Sans", sans-serif;
          fill: #64748b;
        }
        .agentic-brief-pulse-1, .agentic-brief-pulse-2, .agentic-brief-pulse-3, .agentic-brief-pulse-4 {
          animation: agenticBriefPulse 6s ease-in-out infinite;
        }
        .agentic-brief-pulse-2 { animation-delay: 1.5s; }
        .agentic-brief-pulse-3 { animation-delay: 3s; }
        .agentic-brief-pulse-4 { animation-delay: 4.5s; }
        @keyframes agenticBriefPulse {
          0%, 18% { fill: rgba(255,255,255,0.78); stroke: rgba(226,232,240,0.9); }
          30%, 50% { fill: rgba(224,231,255,0.96); stroke: #6366f1; }
          100% { fill: rgba(255,255,255,0.78); stroke: rgba(226,232,240,0.9); }
        }
        @media (prefers-reduced-motion: reduce) {
          .agentic-brief-pulse-1, .agentic-brief-pulse-2, .agentic-brief-pulse-3, .agentic-brief-pulse-4 { animation: none; }
        }
      `}</style>
      <AgenticSurface
        accentEnd='#e0e7ff'
        accentStart='#6366f1'
        atmosphereA='rgba(99,102,241,0.08)'
        atmosphereB='rgba(56,189,248,0.08)'
        ids={surfaceIds}
        stroke='rgba(99,102,241,0.12)'
        testIdPrefix='agentic-brief-contract'
        x={12}
        y={12}
        width={336}
        height={126}
        rx={24}
      />
      <rect className='agentic-brief-card agentic-brief-pulse-1' height='44' rx='12' width='150' x='20' y='24' />
      <rect className='agentic-brief-card agentic-brief-pulse-2' height='44' rx='12' width='150' x='190' y='24' />
      <rect className='agentic-brief-card agentic-brief-pulse-3' height='44' rx='12' width='150' x='20' y='82' />
      <rect className='agentic-brief-card agentic-brief-pulse-4' height='44' rx='12' width='150' x='190' y='82' />
      <text className='agentic-brief-label' x='34' y='48'>Goal</text>
      <text className='agentic-brief-caption' x='34' y='62'>Outcome</text>
      <text className='agentic-brief-label' x='204' y='48'>Context</text>
      <text className='agentic-brief-caption' x='204' y='62'>Repo + logs</text>
      <text className='agentic-brief-label' x='34' y='106'>Constraints</text>
      <text className='agentic-brief-caption' x='34' y='120'>Guardrails</text>
      <text className='agentic-brief-label' x='204' y='106'>Done</text>
      <text className='agentic-brief-caption' x='204' y='120'>Proof loop</text>
    </svg>
  );
}

export function AgenticOperatingLoopAnimation(): React.JSX.Element {
  const surfaceIds = useAgenticSurfaceIds('agentic-operating-loop');

  return (
    <svg
      aria-label='Animacja: pętla planu, wykonania i weryfikacji.'
      className='h-auto w-full'
      data-testid='agentic-operating-loop-animation'
      role='img'
      viewBox='0 0 360 150'
    >
      <style>{`
        .agentic-loop-node {
          fill: rgba(255,255,255,0.8);
          stroke: rgba(226,232,240,0.9);
          stroke-width: 2;
        }
        .agentic-loop-label {
          font: 700 10px/1.2 "Space Grotesk", "IBM Plex Sans", sans-serif;
          fill: #0f172a;
        }
        .agentic-loop-pulse-1, .agentic-loop-pulse-2, .agentic-loop-pulse-3 {
          animation: agenticLoopPulse 6s ease-in-out infinite;
        }
        .agentic-loop-pulse-2 { animation-delay: 2s; }
        .agentic-loop-pulse-3 { animation-delay: 4s; }
        .agentic-loop-arrow { stroke: #94a3b8; stroke-width: 2.5; fill: none; }
        @keyframes agenticLoopPulse {
          0%, 18% { fill: rgba(255,255,255,0.8); stroke: rgba(226,232,240,0.9); }
          30%, 55% { fill: rgba(224,242,254,0.98); stroke: #38bdf8; }
          100% { fill: rgba(255,255,255,0.8); stroke: rgba(226,232,240,0.9); }
        }
        @media (prefers-reduced-motion: reduce) {
          .agentic-loop-pulse-1, .agentic-loop-pulse-2, .agentic-loop-pulse-3 { animation: none; }
        }
      `}</style>
      <defs>
        <marker id='agentic-loop-arrowhead' markerHeight='8' markerWidth='8' orient='auto' refX='6' refY='3'>
          <path d='M0,0 L0,6 L6,3 z' fill='#94a3b8' />
        </marker>
      </defs>
      <AgenticSurface
        accentEnd='#cffafe'
        accentStart='#38bdf8'
        atmosphereA='rgba(56,189,248,0.08)'
        atmosphereB='rgba(16,185,129,0.08)'
        ids={surfaceIds}
        stroke='rgba(56,189,248,0.12)'
        testIdPrefix='agentic-operating-loop'
        x={12}
        y={12}
        width={336}
        height={126}
        rx={24}
      />
      <path className='agentic-loop-arrow' d='M110 96 Q180 136 250 96' markerEnd='url(#agentic-loop-arrowhead)' />
      <path className='agentic-loop-arrow' d='M250 56 Q180 16 110 56' markerEnd='url(#agentic-loop-arrowhead)' />
      <circle className='agentic-loop-node agentic-loop-pulse-1' cx='90' cy='96' r='28' />
      <circle className='agentic-loop-node agentic-loop-pulse-2' cx='180' cy='46' r='28' />
      <circle className='agentic-loop-node agentic-loop-pulse-3' cx='270' cy='96' r='28' />
      <text className='agentic-loop-label' x='72' y='100'>Plan</text>
      <text className='agentic-loop-label' x='156' y='50'>Exec</text>
      <text className='agentic-loop-label' x='252' y='100'>Verify</text>
    </svg>
  );
}

export function AgenticSurfacePickerAnimation(): React.JSX.Element {
  const surfaceIds = useAgenticSurfaceIds('agentic-surface-picker');

  return (
    <svg
      aria-label='Animacja: wybór powierzchni (CLI, IDE, Cloud, API).'
      className='h-auto w-full'
      data-testid='agentic-surface-picker-animation'
      role='img'
      viewBox='0 0 360 150'
    >
      <style>{`
        .agentic-surface-card {
          fill: rgba(255,255,255,0.82);
          stroke: rgba(226,232,240,0.9);
          stroke-width: 2;
        }
        .agentic-surface-label {
          font: 700 11px/1.2 "Space Grotesk", "IBM Plex Sans", sans-serif;
          fill: #0f172a;
        }
        .agentic-surface-pulse-1, .agentic-surface-pulse-2, .agentic-surface-pulse-3, .agentic-surface-pulse-4 {
          animation: agenticSurfacePulse 6s ease-in-out infinite;
        }
        .agentic-surface-pulse-2 { animation-delay: 1.5s; }
        .agentic-surface-pulse-3 { animation-delay: 3s; }
        .agentic-surface-pulse-4 { animation-delay: 4.5s; }
        @keyframes agenticSurfacePulse {
          0%, 18% { fill: rgba(255,255,255,0.82); stroke: rgba(226,232,240,0.9); }
          30%, 50% { fill: rgba(236,253,245,0.96); stroke: #10b981; }
          100% { fill: rgba(255,255,255,0.82); stroke: rgba(226,232,240,0.9); }
        }
        @media (prefers-reduced-motion: reduce) {
          .agentic-surface-pulse-1, .agentic-surface-pulse-2, .agentic-surface-pulse-3, .agentic-surface-pulse-4 { animation: none; }
        }
      `}</style>
      <AgenticSurface
        accentEnd='#dcfce7'
        accentStart='#10b981'
        atmosphereA='rgba(16,185,129,0.08)'
        atmosphereB='rgba(56,189,248,0.08)'
        ids={surfaceIds}
        stroke='rgba(16,185,129,0.12)'
        testIdPrefix='agentic-surface-picker'
        x={12}
        y={12}
        width={336}
        height={126}
        rx={24}
      />
      <rect className='agentic-surface-card agentic-surface-pulse-1' height='64' rx='14' width='70' x='20' y='44' />
      <rect className='agentic-surface-card agentic-surface-pulse-2' height='64' rx='14' width='70' x='100' y='44' />
      <rect className='agentic-surface-card agentic-surface-pulse-3' height='64' rx='14' width='70' x='180' y='44' />
      <rect className='agentic-surface-card agentic-surface-pulse-4' height='64' rx='14' width='70' x='260' y='44' />
      <text className='agentic-surface-label' x='40' y='82'>CLI</text>
      <text className='agentic-surface-label' x='118' y='82'>IDE</text>
      <text className='agentic-surface-label' x='195' y='82'>Cloud</text>
      <text className='agentic-surface-label' x='282' y='82'>API</text>
    </svg>
  );
}

export function AgenticCodexCliCommandMapAnimation(): React.JSX.Element {
  const surfaceIds = useAgenticSurfaceIds('agentic-codex-cli-command-map');

  return (
    <svg
      aria-label='Animacja: mapa komend Codex CLI.'
      className='h-auto w-full'
      data-testid='agentic-codex-cli-command-map-animation'
      role='img'
      viewBox='0 0 360 170'
    >
      <style>{`
        .agentic-cli-card {
          fill: rgba(255,255,255,0.82);
          stroke: rgba(226,232,240,0.9);
          stroke-width: 2;
        }
        .agentic-cli-title {
          font: 700 11px/1.2 "Space Grotesk", "IBM Plex Sans", sans-serif;
          fill: #0f172a;
          letter-spacing: 0.2em;
          text-transform: uppercase;
        }
        .agentic-cli-label {
          font: 700 11px/1.2 "Space Grotesk", "IBM Plex Sans", sans-serif;
          fill: #0f172a;
        }
        .agentic-cli-pulse-1, .agentic-cli-pulse-2, .agentic-cli-pulse-3, .agentic-cli-pulse-4, .agentic-cli-pulse-5, .agentic-cli-pulse-6 {
          animation: agenticCliPulse 7s ease-in-out infinite;
        }
        .agentic-cli-pulse-2 { animation-delay: 1.2s; }
        .agentic-cli-pulse-3 { animation-delay: 2.4s; }
        .agentic-cli-pulse-4 { animation-delay: 3.6s; }
        .agentic-cli-pulse-5 { animation-delay: 4.8s; }
        .agentic-cli-pulse-6 { animation-delay: 6s; }
        @keyframes agenticCliPulse {
          0%, 15% { fill: rgba(255,255,255,0.82); stroke: rgba(226,232,240,0.9); }
          30%, 50% { fill: rgba(236,253,245,0.96); stroke: #10b981; }
          100% { fill: rgba(255,255,255,0.82); stroke: rgba(226,232,240,0.9); }
        }
        @media (prefers-reduced-motion: reduce) {
          .agentic-cli-pulse-1, .agentic-cli-pulse-2, .agentic-cli-pulse-3, .agentic-cli-pulse-4, .agentic-cli-pulse-5, .agentic-cli-pulse-6 { animation: none; }
        }
      `}</style>
      <AgenticSurface
        accentEnd='#dcfce7'
        accentStart='#10b981'
        atmosphereA='rgba(16,185,129,0.08)'
        atmosphereB='rgba(129,140,248,0.08)'
        ids={surfaceIds}
        stroke='rgba(16,185,129,0.12)'
        testIdPrefix='agentic-codex-cli-command-map'
        x={12}
        y={12}
        width={336}
        height={146}
        rx={24}
      />
      <text className='agentic-cli-title' x='20' y='30'>codex cli</text>
      <rect className='agentic-cli-card agentic-cli-pulse-1' height='44' rx='12' width='100' x='20' y='42' />
      <rect className='agentic-cli-card agentic-cli-pulse-2' height='44' rx='12' width='100' x='130' y='42' />
      <rect className='agentic-cli-card agentic-cli-pulse-3' height='44' rx='12' width='100' x='240' y='42' />
      <rect className='agentic-cli-card agentic-cli-pulse-4' height='44' rx='12' width='100' x='20' y='98' />
      <rect className='agentic-cli-card agentic-cli-pulse-5' height='44' rx='12' width='100' x='130' y='98' />
      <rect className='agentic-cli-card agentic-cli-pulse-6' height='44' rx='12' width='100' x='240' y='98' />
      <text className='agentic-cli-label' x='44' y='68'>exec</text>
      <text className='agentic-cli-label' x='150' y='68'>cloud</text>
      <text className='agentic-cli-label' x='262' y='68'>apply</text>
      <text className='agentic-cli-label' x='36' y='124'>resume</text>
      <text className='agentic-cli-label' x='162' y='124'>mcp</text>
      <text className='agentic-cli-label' x='242' y='124'>app-server</text>
    </svg>
  );
}

export function AgenticCliQueueTipAnimation(): React.JSX.Element {
  const surfaceIds = useAgenticSurfaceIds('agentic-cli-queue-tip');

  return (
    <svg
      aria-label='Animacja: kolejkuj wiadomości w CLI podczas pracy zadania.'
      className='h-auto w-full'
      data-testid='agentic-cli-queue-tip-animation'
      role='img'
      viewBox='0 0 360 160'
    >
      <style>{`
        .agentic-queue-panel {
          fill: rgba(255,255,255,0.82);
          stroke: rgba(226,232,240,0.9);
          stroke-width: 2;
        }
        .agentic-queue-label {
          font: 700 10px/1.2 "Space Grotesk", "IBM Plex Sans", sans-serif;
          fill: #0f172a;
        }
        .agentic-queue-muted {
          font: 600 9px/1.2 "Space Grotesk", "IBM Plex Sans", sans-serif;
          fill: #64748b;
        }
        .agentic-queue-dot {
          fill: #94a3b8;
          animation: agenticQueueDot 1.5s ease-in-out infinite;
        }
        .agentic-queue-dot-2 { animation-delay: 0.3s; }
        .agentic-queue-dot-3 { animation-delay: 0.6s; }
        .agentic-queue-item {
          fill: #ecfdf5;
          stroke: #10b981;
          stroke-width: 1.5;
        }
        .agentic-queue-key {
          fill: #f1f5f9;
          stroke: #cbd5f5;
          stroke-width: 2;
        }
        .agentic-queue-key-label {
          font: 700 10px/1.2 "Space Grotesk", "IBM Plex Sans", sans-serif;
          fill: #0f172a;
        }
        .agentic-queue-arrow {
          stroke: #cbd5f5;
          stroke-width: 2;
          fill: none;
        }
        .agentic-queue-bubble {
          fill: #38bdf8;
          opacity: 0;
          transform-box: fill-box;
          transform-origin: center;
          animation: agenticQueueBubble 6s ease-in-out infinite;
        }
        @keyframes agenticQueueDot {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 1; }
        }
        @keyframes agenticQueueBubble {
          0% { transform: translateX(0); opacity: 0; }
          15% { opacity: 1; }
          50% { transform: translateX(120px); opacity: 1; }
          70% { opacity: 0; }
          100% { opacity: 0; }
        }
        @media (prefers-reduced-motion: reduce) {
          .agentic-queue-dot, .agentic-queue-bubble { animation: none; }
        }
      `}</style>
      <AgenticSurface
        accentEnd='#cffafe'
        accentStart='#38bdf8'
        atmosphereA='rgba(56,189,248,0.08)'
        atmosphereB='rgba(16,185,129,0.08)'
        ids={surfaceIds}
        stroke='rgba(56,189,248,0.12)'
        testIdPrefix='agentic-cli-queue-tip'
        x={12}
        y={12}
        width={336}
        height={136}
        rx={24}
      />
      <rect className='agentic-queue-panel' height='72' rx='14' width='150' x='20' y='34' />
      <text className='agentic-queue-label' x='36' y='56'>Task running</text>
      <text className='agentic-queue-muted' x='36' y='72'>Working...</text>
      <circle className='agentic-queue-dot' cx='44' cy='88' r='3.5' />
      <circle className='agentic-queue-dot agentic-queue-dot-2' cx='56' cy='88' r='3.5' />
      <circle className='agentic-queue-dot agentic-queue-dot-3' cx='68' cy='88' r='3.5' />
      <rect className='agentic-queue-panel' height='90' rx='14' width='140' x='200' y='28' />
      <text className='agentic-queue-label' x='214' y='50'>Queue</text>
      <rect className='agentic-queue-item' height='16' rx='6' width='108' x='214' y='60' />
      <rect className='agentic-queue-item' height='16' rx='6' width='86' x='214' y='80' />
      <rect className='agentic-queue-key' height='22' rx='6' width='50' x='70' y='118' />
      <text className='agentic-queue-key-label' x='84' y='133'>Tab</text>
      <path className='agentic-queue-arrow' d='M120 129 L200 96' />
      <rect className='agentic-queue-bubble' height='12' rx='5' width='34' x='78' y='102' />
    </svg>
  );
}

export function AgenticResponsesStreamAnimation(): React.JSX.Element {
  const surfaceIds = useAgenticSurfaceIds('agentic-responses-stream');

  return (
    <svg
      aria-label='Animacja: Responses API stream i zdarzenia.'
      className='h-auto w-full'
      data-testid='agentic-responses-stream-animation'
      role='img'
      viewBox='0 0 360 150'
    >
      <style>{`
        .agentic-stream-line { stroke: #cbd5f5; stroke-width: 2.5; }
        .agentic-stream-node {
          fill: rgba(255,255,255,0.82);
          stroke: rgba(226,232,240,0.9);
          stroke-width: 2;
        }
        .agentic-stream-label {
          font: 700 9px/1.2 "Space Grotesk", "IBM Plex Sans", sans-serif;
          fill: #0f172a;
        }
        .agentic-stream-pulse-1, .agentic-stream-pulse-2, .agentic-stream-pulse-3, .agentic-stream-pulse-4 {
          animation: agenticStreamPulse 6s ease-in-out infinite;
        }
        .agentic-stream-pulse-2 { animation-delay: 1.5s; }
        .agentic-stream-pulse-3 { animation-delay: 3s; }
        .agentic-stream-pulse-4 { animation-delay: 4.5s; }
        @keyframes agenticStreamPulse {
          0%, 20% { fill: rgba(255,255,255,0.82); stroke: rgba(226,232,240,0.9); }
          35%, 55% { fill: rgba(224,242,254,0.98); stroke: #38bdf8; }
          100% { fill: rgba(255,255,255,0.82); stroke: rgba(226,232,240,0.9); }
        }
        @media (prefers-reduced-motion: reduce) {
          .agentic-stream-pulse-1, .agentic-stream-pulse-2, .agentic-stream-pulse-3, .agentic-stream-pulse-4 { animation: none; }
        }
      `}</style>
      <AgenticSurface
        accentEnd='#dbeafe'
        accentStart='#38bdf8'
        atmosphereA='rgba(56,189,248,0.08)'
        atmosphereB='rgba(129,140,248,0.08)'
        ids={surfaceIds}
        stroke='rgba(56,189,248,0.12)'
        testIdPrefix='agentic-responses-stream'
        x={12}
        y={12}
        width={336}
        height={126}
        rx={24}
      />
      <line className='agentic-stream-line' x1='40' x2='320' y1='76' y2='76' />
      <circle className='agentic-stream-node agentic-stream-pulse-1' cx='60' cy='76' r='14' />
      <circle className='agentic-stream-node agentic-stream-pulse-2' cx='150' cy='76' r='14' />
      <circle className='agentic-stream-node agentic-stream-pulse-3' cx='240' cy='76' r='14' />
      <circle className='agentic-stream-node agentic-stream-pulse-4' cx='320' cy='76' r='14' />
      <text className='agentic-stream-label' x='40' y='104'>created</text>
      <text className='agentic-stream-label' x='132' y='104'>in_progress</text>
      <text className='agentic-stream-label' x='218' y='104'>output_text</text>
      <text className='agentic-stream-label' x='298' y='104'>done</text>
    </svg>
  );
}

export function AgenticToolLoopAnimation(): React.JSX.Element {
  const surfaceIds = useAgenticSurfaceIds('agentic-tool-loop');

  return (
    <svg
      aria-label='Animacja: pętla tool-calling (model → tool → result → response).'
      className='h-auto w-full'
      data-testid='agentic-tool-loop-animation'
      role='img'
      viewBox='0 0 360 180'
    >
      <style>{`
        .agentic-tool-node {
          fill: rgba(255,255,255,0.82);
          stroke: rgba(226,232,240,0.9);
          stroke-width: 2;
        }
        .agentic-tool-label {
          font: 700 10px/1.2 "Space Grotesk", "IBM Plex Sans", sans-serif;
          fill: #0f172a;
        }
        .agentic-tool-arrow {
          stroke: #94a3b8;
          stroke-width: 2.5;
          fill: none;
        }
        .agentic-tool-pulse, .agentic-tool-delay-2, .agentic-tool-delay-3, .agentic-tool-delay-4 {
          animation: agenticToolPulse 6s ease-in-out infinite;
        }
        .agentic-tool-delay-2 { animation-delay: 1.5s; }
        .agentic-tool-delay-3 { animation-delay: 3s; }
        .agentic-tool-delay-4 { animation-delay: 4.5s; }
        @keyframes agenticToolPulse {
          0%, 20% { fill: rgba(255,255,255,0.82); stroke: rgba(226,232,240,0.9); }
          35%, 60% { fill: rgba(236,253,245,0.96); stroke: #10b981; }
          100% { fill: rgba(255,255,255,0.82); stroke: rgba(226,232,240,0.9); }
        }
        @media (prefers-reduced-motion: reduce) {
          .agentic-tool-pulse, .agentic-tool-delay-2, .agentic-tool-delay-3, .agentic-tool-delay-4 { animation: none; }
        }
      `}</style>
      <defs>
        <marker id='agentic-tool-arrowhead' markerHeight='8' markerWidth='8' orient='auto' refX='6' refY='3'>
          <path d='M0,0 L0,6 L6,3 z' fill='#94a3b8' />
        </marker>
      </defs>
      <AgenticSurface
        accentEnd='#dcfce7'
        accentStart='#10b981'
        atmosphereA='rgba(16,185,129,0.08)'
        atmosphereB='rgba(56,189,248,0.08)'
        ids={surfaceIds}
        stroke='rgba(16,185,129,0.12)'
        testIdPrefix='agentic-tool-loop'
        x={12}
        y={12}
        width={336}
        height={156}
        rx={24}
      />
      <path className='agentic-tool-arrow' d='M120 48 L240 48' markerEnd='url(#agentic-tool-arrowhead)' />
      <path className='agentic-tool-arrow' d='M270 74 L270 120' markerEnd='url(#agentic-tool-arrowhead)' />
      <path className='agentic-tool-arrow' d='M240 146 L120 146' markerEnd='url(#agentic-tool-arrowhead)' />
      <path className='agentic-tool-arrow' d='M90 120 L90 74' markerEnd='url(#agentic-tool-arrowhead)' />
      <circle className='agentic-tool-node agentic-tool-pulse' cx='90' cy='48' r='24' />
      <circle className='agentic-tool-node agentic-tool-delay-2' cx='270' cy='48' r='24' />
      <circle className='agentic-tool-node agentic-tool-delay-3' cx='270' cy='146' r='24' />
      <circle className='agentic-tool-node agentic-tool-delay-4' cx='90' cy='146' r='24' />
      <text className='agentic-tool-label' x='70' y='52'>Model</text>
      <text className='agentic-tool-label' x='252' y='52'>Tool</text>
      <text className='agentic-tool-label' x='244' y='151'>Result</text>
      <text className='agentic-tool-label' x='58' y='151'>Response</text>
    </svg>
  );
}

export function AgenticStateChainAnimation(): React.JSX.Element {
  const surfaceIds = useAgenticSurfaceIds('agentic-state-chain');

  return (
    <svg
      aria-label='Animacja: łańcuch odpowiedzi i previous_response_id.'
      className='h-auto w-full'
      data-testid='agentic-state-chain-animation'
      role='img'
      viewBox='0 0 360 150'
    >
      <style>{`
        .agentic-chain-card {
          fill: rgba(255,255,255,0.82);
          stroke: rgba(226,232,240,0.9);
          stroke-width: 2;
        }
        .agentic-chain-label {
          font: 700 10px/1.2 "Space Grotesk", "IBM Plex Sans", sans-serif;
          fill: #0f172a;
        }
        .agentic-chain-arrow {
          stroke: #94a3b8;
          stroke-width: 2.2;
          fill: none;
        }
        .agentic-chain-pulse, .agentic-chain-delay-2 {
          animation: agenticChainPulse 5.5s ease-in-out infinite;
        }
        .agentic-chain-delay-2 { animation-delay: 2.2s; }
        @keyframes agenticChainPulse {
          0%, 20% { fill: rgba(255,255,255,0.82); stroke: rgba(226,232,240,0.9); }
          40%, 60% { fill: rgba(237,233,254,0.98); stroke: #8b5cf6; }
          100% { fill: rgba(255,255,255,0.82); stroke: rgba(226,232,240,0.9); }
        }
        @media (prefers-reduced-motion: reduce) {
          .agentic-chain-pulse, .agentic-chain-delay-2 { animation: none; }
        }
      `}</style>
      <defs>
        <marker id='agentic-chain-arrowhead' markerHeight='8' markerWidth='8' orient='auto' refX='6' refY='3'>
          <path d='M0,0 L0,6 L6,3 z' fill='#94a3b8' />
        </marker>
      </defs>
      <AgenticSurface
        accentEnd='#ede9fe'
        accentStart='#8b5cf6'
        atmosphereA='rgba(139,92,246,0.08)'
        atmosphereB='rgba(56,189,248,0.08)'
        ids={surfaceIds}
        stroke='rgba(139,92,246,0.12)'
        testIdPrefix='agentic-state-chain'
        x={12}
        y={12}
        width={336}
        height={126}
        rx={24}
      />
      <rect className='agentic-chain-card agentic-chain-pulse' height='44' rx='12' width='90' x='30' y='52' />
      <rect className='agentic-chain-card agentic-chain-delay-2' height='44' rx='12' width='90' x='150' y='52' />
      <rect className='agentic-chain-card' height='44' rx='12' width='90' x='270' y='52' />
      <text className='agentic-chain-label' x='46' y='78'>resp_01</text>
      <text className='agentic-chain-label' x='166' y='78'>resp_02</text>
      <text className='agentic-chain-label' x='286' y='78'>resp_03</text>
      <path className='agentic-chain-arrow' d='M120 74 L150 74' markerEnd='url(#agentic-chain-arrowhead)' />
      <path className='agentic-chain-arrow' d='M240 74 L270 74' markerEnd='url(#agentic-chain-arrowhead)' />
    </svg>
  );
}

export function AgenticBackgroundWebhookAnimation(): React.JSX.Element {
  const surfaceIds = useAgenticSurfaceIds('agentic-background-webhook');

  return (
    <svg
      aria-label='Animacja: background mode i webhook callbacks.'
      className='h-auto w-full'
      data-testid='agentic-background-webhook-animation'
      role='img'
      viewBox='0 0 360 160'
    >
      <style>{`
        .agentic-bg-card {
          fill: rgba(255,255,255,0.82);
          stroke: rgba(226,232,240,0.9);
          stroke-width: 2;
        }
        .agentic-bg-label {
          font: 700 10px/1.2 "Space Grotesk", "IBM Plex Sans", sans-serif;
          fill: #0f172a;
        }
        .agentic-bg-arrow {
          stroke: #94a3b8;
          stroke-width: 2.2;
          fill: none;
        }
        .agentic-bg-pulse, .agentic-bg-delay-2, .agentic-bg-delay-3 {
          animation: agenticBgPulse 6s ease-in-out infinite;
        }
        .agentic-bg-delay-2 { animation-delay: 2s; }
        .agentic-bg-delay-3 { animation-delay: 4s; }
        @keyframes agenticBgPulse {
          0%, 20% { fill: rgba(255,255,255,0.82); stroke: rgba(226,232,240,0.9); }
          35%, 55% { fill: rgba(224,242,254,0.98); stroke: #38bdf8; }
          100% { fill: rgba(255,255,255,0.82); stroke: rgba(226,232,240,0.9); }
        }
        @media (prefers-reduced-motion: reduce) {
          .agentic-bg-pulse, .agentic-bg-delay-2, .agentic-bg-delay-3 { animation: none; }
        }
      `}</style>
      <defs>
        <marker id='agentic-bg-arrowhead' markerHeight='8' markerWidth='8' orient='auto' refX='6' refY='3'>
          <path d='M0,0 L0,6 L6,3 z' fill='#94a3b8' />
        </marker>
      </defs>
      <AgenticSurface
        accentEnd='#dbeafe'
        accentStart='#38bdf8'
        atmosphereA='rgba(56,189,248,0.08)'
        atmosphereB='rgba(16,185,129,0.08)'
        ids={surfaceIds}
        stroke='rgba(56,189,248,0.12)'
        testIdPrefix='agentic-background-webhook'
        x={12}
        y={12}
        width={336}
        height={136}
        rx={24}
      />
      <rect className='agentic-bg-card agentic-bg-pulse' height='44' rx='12' width='90' x='20' y='56' />
      <rect className='agentic-bg-card agentic-bg-delay-2' height='44' rx='12' width='120' x='130' y='56' />
      <rect className='agentic-bg-card agentic-bg-delay-3' height='44' rx='12' width='90' x='250' y='56' />
      <text className='agentic-bg-label' x='36' y='82'>Request</text>
      <text className='agentic-bg-label' x='146' y='82'>Background</text>
      <text className='agentic-bg-label' x='270' y='82'>Webhook</text>
      <path className='agentic-bg-arrow' d='M110 78 L130 78' markerEnd='url(#agentic-bg-arrowhead)' />
      <path className='agentic-bg-arrow' d='M250 78 L270 78' markerEnd='url(#agentic-bg-arrowhead)' />
    </svg>
  );
}

export function AgenticCacheCompactionAnimation(): React.JSX.Element {
  const surfaceIds = useAgenticSurfaceIds('agentic-cache-compaction');

  return (
    <svg
      aria-label='Animacja: compaction i prompt caching.'
      className='h-auto w-full'
      data-testid='agentic-cache-compaction-animation'
      role='img'
      viewBox='0 0 360 160'
    >
      <style>{`
        .agentic-cache-stack {
          fill: rgba(255,255,255,0.82);
          stroke: rgba(226,232,240,0.9);
          stroke-width: 2;
        }
        .agentic-cache-summary {
          fill: #ecfdf5;
          stroke: #10b981;
          stroke-width: 2;
        }
        .agentic-cache-prefix {
          fill: #e0f2fe;
          stroke: #38bdf8;
          stroke-width: 2;
        }
        .agentic-cache-label {
          font: 700 9px/1.2 "Space Grotesk", "IBM Plex Sans", sans-serif;
          fill: #0f172a;
        }
        .agentic-cache-pulse {
          animation: agenticCachePulse 6s ease-in-out infinite;
        }
        @keyframes agenticCachePulse {
          0%, 20% { opacity: 0.5; }
          45%, 60% { opacity: 1; }
          100% { opacity: 0.5; }
        }
        @media (prefers-reduced-motion: reduce) {
          .agentic-cache-pulse { animation: none; }
        }
      `}</style>
      <AgenticSurface
        accentEnd='#dcfce7'
        accentStart='#10b981'
        atmosphereA='rgba(16,185,129,0.08)'
        atmosphereB='rgba(56,189,248,0.08)'
        ids={surfaceIds}
        stroke='rgba(16,185,129,0.12)'
        testIdPrefix='agentic-cache-compaction'
        x={12}
        y={12}
        width={336}
        height={136}
        rx={24}
      />
      <rect className='agentic-cache-stack' height='70' rx='14' width='120' x='30' y='48' />
      <rect className='agentic-cache-prefix agentic-cache-pulse' height='22' rx='10' width='110' x='35' y='53' />
      <rect className='agentic-cache-summary' height='44' rx='12' width='90' x='220' y='61' />
      <text className='agentic-cache-label' x='54' y='92'>Context</text>
      <text className='agentic-cache-label' x='232' y='86'>Summary</text>
      <text className='agentic-cache-label' x='42' y='68'>cached prefix</text>
      <path d='M150 84 L220 84' stroke='#94a3b8' strokeWidth='2' />
    </svg>
  );
}
