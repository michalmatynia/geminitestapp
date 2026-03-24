import React, { useId } from 'react';

type AgenticSecondarySurfaceIds = {
  clipId: string;
  frameGradientId: string;
  panelGradientId: string;
};

type AgenticSecondarySurfaceProps = {
  accentEnd: string;
  accentStart: string;
  atmosphereA: string;
  atmosphereB: string;
  ids: AgenticSecondarySurfaceIds;
  stroke: string;
  testIdPrefix: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rx: number;
};

function useAgenticSecondarySurfaceIds(prefix: string): AgenticSecondarySurfaceIds {
  const baseId = useId().replace(/:/g, '');

  return {
    clipId: `${prefix}-${baseId}-clip`,
    frameGradientId: `${prefix}-${baseId}-frame`,
    panelGradientId: `${prefix}-${baseId}-panel`,
  };
}

function AgenticSecondarySurface({
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
}: AgenticSecondarySurfaceProps): React.JSX.Element {
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

export function AgenticApprovalGateAnimation(): React.JSX.Element {
  const surfaceIds = useAgenticSecondarySurfaceIds('agentic-approval-gate');

  return (
    <svg
      aria-label='Animacja: approval gate przed wykonaniem komendy.'
      className='h-auto w-full'
      data-testid='agentic-approval-gate-animation'
      role='img'
      viewBox='0 0 360 150'
    >
      <style>{`
        .agentic-approval-box {
          fill: rgba(255,255,255,0.82);
          stroke: rgba(226,232,240,0.9);
          stroke-width: 2;
        }
        .agentic-approval-label {
          font: 700 10px/1.2 "Space Grotesk", "IBM Plex Sans", sans-serif;
          fill: #0f172a;
        }
        .agentic-approval-line {
          stroke: #cbd5f5;
          stroke-width: 2.5;
          stroke-linecap: round;
        }
        .agentic-approval-dot {
          fill: #38bdf8;
          transform-box: fill-box;
          transform-origin: center;
          animation: agenticApprovalMoveDot 6s ease-in-out infinite;
        }
        .agentic-approval-gate {
          fill: #e2e8f0;
          animation: agenticApprovalGatePulse 6s ease-in-out infinite;
        }
        .agentic-approval-lock {
          stroke: #64748b;
          stroke-width: 2;
          fill: none;
        }
        @keyframes agenticApprovalMoveDot {
          0% { transform: translateX(0); opacity: 0; }
          10% { opacity: 1; }
          30% { transform: translateX(95px); opacity: 1; }
          45% { transform: translateX(95px); opacity: 1; }
          65% { transform: translateX(190px); opacity: 1; }
          85% { opacity: 1; }
          100% { transform: translateX(250px); opacity: 0; }
        }
        @keyframes agenticApprovalGatePulse {
          0%, 30% { fill: #e2e8f0; }
          45%, 65% { fill: #bfdbfe; }
          100% { fill: #e2e8f0; }
        }
        @media (prefers-reduced-motion: reduce) {
          .agentic-approval-dot, .agentic-approval-gate { animation: none; }
        }
      `}</style>
      <AgenticSecondarySurface
        accentEnd='#dbeafe'
        accentStart='#38bdf8'
        atmosphereA='rgba(56,189,248,0.08)'
        atmosphereB='rgba(251,146,60,0.08)'
        ids={surfaceIds}
        stroke='rgba(56,189,248,0.12)'
        testIdPrefix='agentic-approval-gate'
        x={12}
        y={12}
        width={336}
        height={126}
        rx={24}
      />
      <rect className='agentic-approval-box' height='56' rx='14' width='90' x='20' y='48' />
      <rect className='agentic-approval-box' height='56' rx='14' width='90' x='135' y='48' />
      <rect className='agentic-approval-box' height='56' rx='14' width='90' x='250' y='48' />
      <text className='agentic-approval-label' x='34' y='78'>Command</text>
      <text className='agentic-approval-label' x='150' y='78'>Approval</text>
      <text className='agentic-approval-label' x='270' y='78'>Execute</text>
      <line className='agentic-approval-line' x1='110' x2='135' y1='76' y2='76' />
      <line className='agentic-approval-line' x1='225' x2='250' y1='76' y2='76' />
      <rect className='agentic-approval-gate' height='30' rx='8' width='44' x='158' y='62' />
      <rect className='agentic-approval-lock' height='14' rx='6' width='16' x='170' y='72' />
      <path className='agentic-approval-lock' d='M172 72 V68 C172 64 184 64 184 68 V72' />
      <circle className='agentic-approval-dot' cx='30' cy='76' r='5' />
    </svg>
  );
}

export function AgenticModelSelectorAnimation(): React.JSX.Element {
  const surfaceIds = useAgenticSecondarySurfaceIds('agentic-model-selector');

  return (
    <svg
      aria-label='Animacja: dobór modelu między szybkością a głębokim reasoning.'
      className='h-auto w-full'
      data-testid='agentic-model-selector-animation'
      role='img'
      viewBox='0 0 360 150'
    >
      <style>{`
        .agentic-model-line {
          stroke: #cbd5f5;
          stroke-width: 4;
          stroke-linecap: round;
        }
        .agentic-model-node {
          fill: rgba(255,255,255,0.82);
          stroke: rgba(226,232,240,0.9);
          stroke-width: 2;
        }
        .agentic-model-label {
          font: 700 10px/1.2 "Space Grotesk", "IBM Plex Sans", sans-serif;
          fill: #0f172a;
        }
        .agentic-model-pulse-1, .agentic-model-pulse-2, .agentic-model-pulse-3 {
          animation: agenticModelPulse 6s ease-in-out infinite;
        }
        .agentic-model-pulse-2 { animation-delay: 2s; }
        .agentic-model-pulse-3 { animation-delay: 4s; }
        @keyframes agenticModelPulse {
          0%, 20% { fill: rgba(255,255,255,0.82); stroke: rgba(226,232,240,0.9); }
          35%, 55% { fill: rgba(204,251,241,0.96); stroke: #14b8a6; }
          100% { fill: rgba(255,255,255,0.82); stroke: rgba(226,232,240,0.9); }
        }
        @media (prefers-reduced-motion: reduce) {
          .agentic-model-pulse-1, .agentic-model-pulse-2, .agentic-model-pulse-3 { animation: none; }
        }
      `}</style>
      <AgenticSecondarySurface
        accentEnd='#ccfbf1'
        accentStart='#14b8a6'
        atmosphereA='rgba(20,184,166,0.08)'
        atmosphereB='rgba(129,140,248,0.08)'
        ids={surfaceIds}
        stroke='rgba(20,184,166,0.12)'
        testIdPrefix='agentic-model-selector'
        x={12}
        y={12}
        width={336}
        height={126}
        rx={24}
      />
      <line className='agentic-model-line' x1='40' x2='320' y1='76' y2='76' />
      <circle className='agentic-model-node agentic-model-pulse-1' cx='80' cy='76' r='18' />
      <circle className='agentic-model-node agentic-model-pulse-2' cx='180' cy='76' r='18' />
      <circle className='agentic-model-node agentic-model-pulse-3' cx='280' cy='76' r='18' />
      <text className='agentic-model-label' x='60' y='108'>Fast</text>
      <text className='agentic-model-label' x='160' y='108'>Balanced</text>
      <text className='agentic-model-label' x='258' y='108'>Deep</text>
      <text className='agentic-model-label' x='40' y='56'>Speed</text>
      <text className='agentic-model-label' x='278' y='56'>Reasoning</text>
    </svg>
  );
}

export function AgenticSkillPipelineAnimation(): React.JSX.Element {
  const surfaceIds = useAgenticSecondarySurfaceIds('agentic-skill-pipeline');

  return (
    <svg
      aria-label='Animacja: pipeline skilla od promptu do wyniku.'
      className='h-auto w-full'
      data-testid='agentic-skill-pipeline-animation'
      role='img'
      viewBox='0 0 360 150'
    >
      <style>{`
        .agentic-skill-box {
          fill: rgba(255,255,255,0.82);
          stroke: rgba(226,232,240,0.9);
          stroke-width: 2;
        }
        .agentic-skill-label {
          font: 700 10px/1.2 "Space Grotesk", "IBM Plex Sans", sans-serif;
          fill: #0f172a;
        }
        .agentic-skill-flow {
          stroke: #94a3b8;
          stroke-width: 2.5;
          stroke-linecap: round;
        }
        .agentic-skill-pulse-1, .agentic-skill-pulse-2, .agentic-skill-pulse-3, .agentic-skill-pulse-4 {
          animation: agenticSkillPulse 6s ease-in-out infinite;
        }
        .agentic-skill-pulse-2 { animation-delay: 1.5s; }
        .agentic-skill-pulse-3 { animation-delay: 3s; }
        .agentic-skill-pulse-4 { animation-delay: 4.5s; }
        @keyframes agenticSkillPulse {
          0%, 20% { fill: rgba(255,255,255,0.82); stroke: rgba(226,232,240,0.9); }
          30%, 55% { fill: rgba(236,253,243,0.96); stroke: #34d399; }
          100% { fill: rgba(255,255,255,0.82); stroke: rgba(226,232,240,0.9); }
        }
        @media (prefers-reduced-motion: reduce) {
          .agentic-skill-pulse-1, .agentic-skill-pulse-2, .agentic-skill-pulse-3, .agentic-skill-pulse-4 { animation: none; }
        }
      `}</style>
      <AgenticSecondarySurface
        accentEnd='#dcfce7'
        accentStart='#34d399'
        atmosphereA='rgba(52,211,153,0.08)'
        atmosphereB='rgba(56,189,248,0.08)'
        ids={surfaceIds}
        stroke='rgba(52,211,153,0.12)'
        testIdPrefix='agentic-skill-pipeline'
        x={12}
        y={12}
        width={336}
        height={126}
        rx={24}
      />
      <rect className='agentic-skill-box agentic-skill-pulse-1' height='40' rx='12' width='70' x='20' y='54' />
      <rect className='agentic-skill-box agentic-skill-pulse-2' height='40' rx='12' width='70' x='110' y='54' />
      <rect className='agentic-skill-box agentic-skill-pulse-3' height='40' rx='12' width='70' x='200' y='54' />
      <rect className='agentic-skill-box agentic-skill-pulse-4' height='40' rx='12' width='70' x='290' y='54' />
      <text className='agentic-skill-label' x='34' y='78'>Prompt</text>
      <text className='agentic-skill-label' x='128' y='78'>Skill</text>
      <text className='agentic-skill-label' x='215' y='78'>Tools</text>
      <text className='agentic-skill-label' x='304' y='78'>Output</text>
      <line className='agentic-skill-flow' x1='90' x2='110' y1='74' y2='74' />
      <line className='agentic-skill-flow' x1='180' x2='200' y1='74' y2='74' />
      <line className='agentic-skill-flow' x1='270' x2='290' y1='74' y2='74' />
    </svg>
  );
}

export function AgenticMilestoneTimelineAnimation(): React.JSX.Element {
  const surfaceIds = useAgenticSecondarySurfaceIds('agentic-milestone-timeline');

  return (
    <svg
      aria-label='Animacja: milestone timeline w długich zadaniach.'
      className='h-auto w-full'
      data-testid='agentic-milestone-timeline-animation'
      role='img'
      viewBox='0 0 360 150'
    >
      <style>{`
        .agentic-milestone-line {
          stroke: #cbd5f5;
          stroke-width: 3;
          stroke-linecap: round;
        }
        .agentic-milestone-node {
          fill: rgba(255,255,255,0.82);
          stroke: rgba(226,232,240,0.9);
          stroke-width: 2;
        }
        .agentic-milestone-label {
          font: 700 10px/1.2 "Space Grotesk", "IBM Plex Sans", sans-serif;
          fill: #0f172a;
        }
        .agentic-milestone-pulse-1, .agentic-milestone-pulse-2, .agentic-milestone-pulse-3, .agentic-milestone-pulse-4 {
          animation: agenticMilestonePulse 6s ease-in-out infinite;
        }
        .agentic-milestone-pulse-2 { animation-delay: 1.5s; }
        .agentic-milestone-pulse-3 { animation-delay: 3s; }
        .agentic-milestone-pulse-4 { animation-delay: 4.5s; }
        @keyframes agenticMilestonePulse {
          0%, 20% { fill: rgba(255,255,255,0.82); stroke: rgba(226,232,240,0.9); }
          30%, 55% { fill: rgba(224,242,254,0.98); stroke: #38bdf8; }
          100% { fill: rgba(255,255,255,0.82); stroke: rgba(226,232,240,0.9); }
        }
        @media (prefers-reduced-motion: reduce) {
          .agentic-milestone-pulse-1, .agentic-milestone-pulse-2, .agentic-milestone-pulse-3, .agentic-milestone-pulse-4 { animation: none; }
        }
      `}</style>
      <AgenticSecondarySurface
        accentEnd='#dbeafe'
        accentStart='#38bdf8'
        atmosphereA='rgba(56,189,248,0.08)'
        atmosphereB='rgba(129,140,248,0.08)'
        ids={surfaceIds}
        stroke='rgba(56,189,248,0.12)'
        testIdPrefix='agentic-milestone-timeline'
        x={12}
        y={12}
        width={336}
        height={126}
        rx={24}
      />
      <line className='agentic-milestone-line' x1='40' x2='320' y1='76' y2='76' />
      <circle className='agentic-milestone-node agentic-milestone-pulse-1' cx='70' cy='76' r='14' />
      <circle className='agentic-milestone-node agentic-milestone-pulse-2' cx='150' cy='76' r='14' />
      <circle className='agentic-milestone-node agentic-milestone-pulse-3' cx='230' cy='76' r='14' />
      <circle className='agentic-milestone-node agentic-milestone-pulse-4' cx='310' cy='76' r='14' />
      <text className='agentic-milestone-label' x='48' y='106'>Spec</text>
      <text className='agentic-milestone-label' x='130' y='106'>Plan</text>
      <text className='agentic-milestone-label' x='208' y='106'>Build</text>
      <text className='agentic-milestone-label' x='290' y='106'>Verify</text>
    </svg>
  );
}

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
      aria-label='Animacja: soczewka kontekstu skanuje najważniejsze pliki.'
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
