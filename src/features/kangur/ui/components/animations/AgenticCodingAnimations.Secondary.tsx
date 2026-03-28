import React from 'react';

import {
  AgenticAnimationSurface as AgenticSecondarySurface,
  useAgenticAnimationSurfaceIds as useAgenticSecondarySurfaceIds,
} from '@/features/kangur/ui/components/animations/AgenticAnimationSurface';

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
