import React from 'react';
import {
  type KangurAnimationSurfaceIdsDto,
  type KangurAnimationSurfacePropsDto,
  useKangurAnimationSurfaceIds,
} from '@/features/kangur/ui/components/animations/animation-surface-contracts';

type LogicalThinkingSurfaceIds = KangurAnimationSurfaceIdsDto;

type LogicalThinkingSurfaceProps = KangurAnimationSurfacePropsDto;

type LogicalThinkingAnimationProps = {
  ariaLabel?: string;
};

function useLogicalThinkingSurfaceIds(prefix: string): LogicalThinkingSurfaceIds {
  return useKangurAnimationSurfaceIds(prefix);
}

function LogicalThinkingSurface({
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
}: LogicalThinkingSurfaceProps): React.JSX.Element {
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
          <stop offset='0%' stopColor='#eff6ff' />
          <stop offset='52%' stopColor='#f8fafc' />
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
          <stop offset='0%' stopColor={accentStart} stopOpacity='0.72' />
          <stop offset='100%' stopColor='#ffffff' stopOpacity='0.9' />
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
        <ellipse cx={x + width * 0.22} cy={y + height * 0.2} fill={atmosphereA} rx={width * 0.22} ry={height * 0.16} />
        <ellipse cx={x + width * 0.78} cy={y + height * 0.88} fill={atmosphereB} rx={width * 0.32} ry={height * 0.18} />
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

export function LogicalThinkingIntroAnimation({
  ariaLabel,
}: LogicalThinkingAnimationProps = {}): React.JSX.Element {
  const surfaceIds = useLogicalThinkingSurfaceIds('logical-thinking-intro');

  return (
    <svg
      aria-label={ariaLabel ?? 'Animacja: kroki logicznego myślenia połączone strzałkami.'}
      className='h-auto w-full'
      data-testid='logical-thinking-intro-animation'
      role='img'
      viewBox='0 0 360 126'
    >
      <style>{`
        .track { stroke: rgba(124, 58, 237, 0.2); stroke-width: 8; stroke-linecap: round; }
        .node {
          fill: url(#introNodeGradient);
          opacity: 0.42;
          transform-box: fill-box;
          transform-origin: center;
          animation: introPulse 4.2s ease-in-out infinite;
        }
        .node-ring { fill: rgba(196, 181, 253, 0.18); }
        .n2 { animation-delay: 0.7s; }
        .n3 { animation-delay: 1.4s; }
        .link { stroke: #7c3aed; stroke-width: 4; stroke-linecap: round; }
        @keyframes introPulse {
          0%, 100% { opacity: 0.42; transform: scale(0.95); }
          50% { opacity: 1; transform: scale(1); }
        }
        @media (prefers-reduced-motion: reduce) {
          .node { animation: none; opacity: 1; }
        }
      `}</style>
      <LogicalThinkingSurface
        accentEnd='#f5f3ff'
        accentStart='#8b5cf6'
        atmosphereA='rgba(168, 85, 247, 0.1)'
        atmosphereB='rgba(59, 130, 246, 0.08)'
        ids={surfaceIds}
        stroke='rgba(124, 58, 237, 0.14)'
        testIdPrefix='logical-thinking-intro'
        x={12}
        y={12}
        width={336}
        height={102}
        rx={22}
      />
      <defs>
        <linearGradient id='introNodeGradient' x1='0' x2='1' y1='0' y2='1'>
          <stop offset='0%' stopColor='#c4b5fd' />
          <stop offset='100%' stopColor='#7c3aed' />
        </linearGradient>
      </defs>
      <line className='track' x1='78' x2='282' y1='63' y2='63' />
      <line className='link' x1='80' x2='160' y1='63' y2='63' />
      <line className='link' x1='200' x2='280' y1='63' y2='63' />
      <circle className='node-ring' cx='60' cy='63' r='23' />
      <circle className='node-ring' cx='180' cy='63' r='23' />
      <circle className='node-ring' cx='300' cy='63' r='23' />
      <circle className='node n1' cx='60' cy='63' r='16' />
      <circle className='node n2' cx='180' cy='63' r='16' />
      <circle className='node n3' cx='300' cy='63' r='16' />
    </svg>
  );
}

export function LogicalThinkingStepsAnimation({
  ariaLabel,
}: LogicalThinkingAnimationProps = {}): React.JSX.Element {
  const surfaceIds = useLogicalThinkingSurfaceIds('logical-thinking-steps');

  return (
    <svg
      aria-label={ariaLabel ?? 'Animacja: trzy kroki logiki podświetlane po kolei.'}
      className='h-auto w-full'
      data-testid='logical-thinking-steps-animation'
      role='img'
      viewBox='0 0 360 126'
    >
      <style>{`
        .step {
          stroke-width: 2;
          opacity: 0.38;
          transform-box: fill-box;
          transform-origin: center;
          animation: stepGlow 4.6s ease-in-out infinite;
        }
        .s1 { fill: rgba(237, 233, 254, 0.98); stroke: rgba(168, 85, 247, 0.35); }
        .s2 { fill: rgba(224, 242, 254, 0.98); stroke: rgba(56, 189, 248, 0.35); animation-delay: 0.8s; }
        .s3 { fill: rgba(236, 253, 245, 0.98); stroke: rgba(52, 211, 153, 0.35); animation-delay: 1.6s; }
        .label { font: 700 13px/1.1 system-ui, sans-serif; fill: #312e81; }
        .arrow-track { stroke: rgba(148, 163, 184, 0.28); stroke-width: 6; stroke-linecap: round; }
        .arrow { stroke: #a78bfa; stroke-width: 3; stroke-linecap: round; }
        @keyframes stepGlow {
          0%, 100% { opacity: 0.38; transform: scale(0.96); }
          50% { opacity: 1; transform: scale(1); }
        }
        @media (prefers-reduced-motion: reduce) {
          .step { animation: none; opacity: 1; }
        }
      `}</style>
      <LogicalThinkingSurface
        accentEnd='#eef2ff'
        accentStart='#a78bfa'
        atmosphereA='rgba(168, 85, 247, 0.08)'
        atmosphereB='rgba(52, 211, 153, 0.08)'
        ids={surfaceIds}
        stroke='rgba(99, 102, 241, 0.12)'
        testIdPrefix='logical-thinking-steps'
        x={12}
        y={12}
        width={336}
        height={102}
        rx={22}
      />
      <line className='arrow-track' x1='118' y1='63' x2='132' y2='63' />
      <line className='arrow-track' x1='228' y1='63' x2='242' y2='63' />
      <rect className='step s1' x='20' y='41' width='100' height='44' rx='14' />
      <rect className='step s2' x='130' y='41' width='100' height='44' rx='14' />
      <rect className='step s3' x='240' y='41' width='100' height='44' rx='14' />
      <line className='arrow' x1='120' y1='63' x2='130' y2='63' />
      <line className='arrow' x1='230' y1='63' x2='240' y2='63' />
      <text className='label' x='70' y='68' textAnchor='middle'>OBSERWUJ</text>
      <text className='label' x='180' y='68' textAnchor='middle'>ŁĄCZ</text>
      <text className='label' x='290' y='68' textAnchor='middle'>WNIOSEK</text>
    </svg>
  );
}

export function LogicalPatternAnimation({
  ariaLabel,
}: LogicalThinkingAnimationProps = {}): React.JSX.Element {
  const surfaceIds = useLogicalThinkingSurfaceIds('logical-thinking-pattern');
  const itemGradientId = `${surfaceIds.panelGradientId}-item`;
  const highlightGradientId = `${surfaceIds.panelGradientId}-highlight`;

  return (
    <svg
      aria-label={ariaLabel ?? 'Animacja: wzorzec powtarza się w rytmie.'}
      className='h-auto w-full'
      data-testid='logical-thinking-pattern-animation'
      role='img'
      viewBox='0 0 360 126'
    >
      <style>{`
        .rail { fill: rgba(224, 242, 254, 0.5); stroke: rgba(56, 189, 248, 0.22); stroke-width: 1.5; }
        .item { fill: url(#${itemGradientId}); opacity: 0.38; }
        .hi { fill: url(#${highlightGradientId}); animation: patternGlow 3.8s ease-in-out infinite; }
        @keyframes patternGlow {
          0%, 100% { opacity: 0.4; transform: scale(0.95); }
          50% { opacity: 1; transform: scale(1); }
        }
        @media (prefers-reduced-motion: reduce) {
          .hi { animation: none; opacity: 1; }
        }
      `}</style>
      <LogicalThinkingSurface
        accentEnd='#ecfeff'
        accentStart='#38bdf8'
        atmosphereA='rgba(56, 189, 248, 0.08)'
        atmosphereB='rgba(14, 165, 233, 0.08)'
        ids={surfaceIds}
        stroke='rgba(14, 165, 233, 0.12)'
        testIdPrefix='logical-thinking-pattern'
        x={12}
        y={12}
        width={336}
        height={102}
        rx={22}
      />
      <defs>
        <linearGradient id={itemGradientId} x1='0' x2='1' y1='0' y2='1'>
          <stop offset='0%' stopColor='#7dd3fc' />
          <stop offset='100%' stopColor='#0284c7' />
        </linearGradient>
        <linearGradient id={highlightGradientId} x1='0' x2='1' y1='0' y2='1'>
          <stop offset='0%' stopColor='#38bdf8' />
          <stop offset='100%' stopColor='#0ea5e9' />
        </linearGradient>
      </defs>
      <rect className='rail' height='38' rx='18' width='292' x='34' y='44' />
      <circle className='item' cx='60' cy='63' r='12' />
      <circle className='hi' cx='120' cy='63' r='12' />
      <circle className='item' cx='180' cy='63' r='12' />
      <circle className='hi' cx='240' cy='63' r='12' />
      <circle className='item' cx='300' cy='63' r='12' />
    </svg>
  );
}

export function LogicalPatternGrowthAnimation({
  ariaLabel,
}: LogicalThinkingAnimationProps = {}): React.JSX.Element {
  const surfaceIds = useLogicalThinkingSurfaceIds('logical-thinking-growth');
  const barGradientId = `${surfaceIds.panelGradientId}-bar`;

  return (
    <svg
      aria-label={ariaLabel ?? 'Animacja: wzorzec rośnie krok po kroku.'}
      className='h-auto w-full'
      data-testid='logical-thinking-growth-animation'
      role='img'
      viewBox='0 0 360 132'
    >
      <style>{`
        .guide { stroke: rgba(14, 165, 233, 0.35); stroke-width: 2; stroke-dasharray: 6 6; opacity: 0.6; }
        .bar {
          fill: url(#${barGradientId});
          opacity: 0.42;
          transform-box: fill-box;
          transform-origin: bottom;
          animation: barPulse 4s ease-in-out infinite;
        }
        .b2 { animation-delay: 0.5s; }
        .b3 { animation-delay: 1s; }
        .b4 { animation-delay: 1.5s; }
        @keyframes barPulse {
          0%, 100% { opacity: 0.38; transform: scaleY(0.92); }
          50% { opacity: 1; transform: scaleY(1); }
        }
        @media (prefers-reduced-motion: reduce) {
          .bar { animation: none; opacity: 1; }
        }
      `}</style>
      <LogicalThinkingSurface
        accentEnd='#ecfeff'
        accentStart='#38bdf8'
        atmosphereA='rgba(14, 165, 233, 0.08)'
        atmosphereB='rgba(168, 85, 247, 0.08)'
        ids={surfaceIds}
        stroke='rgba(14, 165, 233, 0.12)'
        testIdPrefix='logical-thinking-growth'
        x={12}
        y={12}
        width={336}
        height={108}
        rx={22}
      />
      <defs>
        <linearGradient id={barGradientId} x1='0' x2='0' y1='0' y2='1'>
          <stop offset='0%' stopColor='#93c5fd' />
          <stop offset='100%' stopColor='#0284c7' />
        </linearGradient>
      </defs>
      <line className='guide' x1='50' x2='310' y1='96' y2='96' />
      <rect className='bar b1' x='60' y='64' width='36' height='32' rx='6' />
      <rect className='bar b2' x='120' y='54' width='36' height='42' rx='6' />
      <rect className='bar b3' x='180' y='44' width='36' height='52' rx='6' />
      <rect className='bar b4' x='240' y='34' width='36' height='62' rx='6' />
    </svg>
  );
}

export function LogicalClassificationAnimation({
  ariaLabel,
}: LogicalThinkingAnimationProps = {}): React.JSX.Element {
  const surfaceIds = useLogicalThinkingSurfaceIds('logical-thinking-classification');

  return (
    <svg
      aria-label={ariaLabel ?? 'Animacja: elementy trafiają do dwóch grup.'}
      className='h-auto w-full'
      data-testid='logical-thinking-classification-animation'
      role='img'
      viewBox='0 0 360 140'
    >
      <style>{`
        .box-a { fill: rgba(16, 185, 129, 0.12); stroke: rgba(16, 185, 129, 0.35); stroke-width: 2; stroke-dasharray: 6 6; }
        .box-b { fill: rgba(245, 158, 11, 0.12); stroke: rgba(245, 158, 11, 0.35); stroke-width: 2; stroke-dasharray: 6 6; }
        .dot-a { fill: #10b981; }
        .dot-b { fill: #f59e0b; }
        .group-a, .group-b { transform-box: fill-box; transform-origin: center; }
        .group-a { animation: classifyA 5s ease-in-out infinite; }
        .group-b { animation: classifyB 5s ease-in-out infinite; }
        @keyframes classifyA {
          0%, 20% { transform: translateX(90px); opacity: 0.35; }
          50%, 80% { transform: translateX(0); opacity: 1; }
          100% { transform: translateX(90px); opacity: 0.35; }
        }
        @keyframes classifyB {
          0%, 20% { transform: translateX(-90px); opacity: 0.35; }
          50%, 80% { transform: translateX(0); opacity: 1; }
          100% { transform: translateX(-90px); opacity: 0.35; }
        }
        @media (prefers-reduced-motion: reduce) {
          .group-a, .group-b { animation: none; opacity: 1; }
        }
      `}</style>
      <LogicalThinkingSurface
        accentEnd='#ecfdf5'
        accentStart='#34d399'
        atmosphereA='rgba(16, 185, 129, 0.08)'
        atmosphereB='rgba(245, 158, 11, 0.08)'
        ids={surfaceIds}
        stroke='rgba(16, 185, 129, 0.12)'
        testIdPrefix='logical-thinking-classification'
        x={12}
        y={12}
        width={336}
        height={116}
        rx={22}
      />
      <rect className='box-a' x='30' y='32' width='120' height='80' rx='14' />
      <rect className='box-b' x='210' y='32' width='120' height='80' rx='14' />
      <g className='group-a'>
        <circle className='dot-a' cx='70' cy='62' r='9' />
        <circle className='dot-a' cx='105' cy='84' r='9' />
      </g>
      <g className='group-b'>
        <circle className='dot-b' cx='250' cy='62' r='9' />
        <circle className='dot-b' cx='285' cy='84' r='9' />
      </g>
    </svg>
  );
}

export function LogicalClassificationKeyAnimation({
  ariaLabel,
}: LogicalThinkingAnimationProps = {}): React.JSX.Element {
  const surfaceIds = useLogicalThinkingSurfaceIds('logical-thinking-key');

  return (
    <svg
      aria-label={ariaLabel ?? 'Animacja: cecha kieruje elementy do odpowiednich grup.'}
      className='h-auto w-full'
      data-testid='logical-thinking-key-animation'
      role='img'
      viewBox='0 0 360 140'
    >
      <style>{`
        .tag { fill: rgba(236, 253, 245, 0.96); stroke: rgba(16, 185, 129, 0.38); stroke-width: 2; }
        .tag-label { font: 700 13px/1.1 system-ui, sans-serif; fill: #047857; }
        .bin-a, .bin-b { stroke-width: 2; }
        .bin-a { fill: rgba(240, 253, 244, 0.95); stroke: rgba(16, 185, 129, 0.3); }
        .bin-b { fill: rgba(255, 247, 237, 0.95); stroke: rgba(245, 158, 11, 0.3); }
        .branch { stroke: #34d399; stroke-width: 3; stroke-linecap: round; }
        .dot {
          fill: #10b981;
          opacity: 0.35;
          transform-box: fill-box;
          transform-origin: center;
          animation: sortDot 4.8s ease-in-out infinite;
        }
        .dot-b { fill: #f59e0b; animation-delay: 0.8s; }
        @keyframes sortDot {
          0%, 20% { transform: translate(0, 0); opacity: 0.35; }
          55%, 80% { transform: translate(-70px, 36px); opacity: 1; }
          100% { transform: translate(0, 0); opacity: 0.35; }
        }
        .dot-b { animation-name: sortDotRight; }
        @keyframes sortDotRight {
          0%, 20% { transform: translate(0, 0); opacity: 0.35; }
          55%, 80% { transform: translate(70px, 36px); opacity: 1; }
          100% { transform: translate(0, 0); opacity: 0.35; }
        }
        @media (prefers-reduced-motion: reduce) {
          .dot, .dot-b { animation: none; opacity: 1; }
        }
      `}</style>
      <LogicalThinkingSurface
        accentEnd='#ecfdf5'
        accentStart='#34d399'
        atmosphereA='rgba(16, 185, 129, 0.08)'
        atmosphereB='rgba(59, 130, 246, 0.06)'
        ids={surfaceIds}
        stroke='rgba(16, 185, 129, 0.12)'
        testIdPrefix='logical-thinking-key'
        x={12}
        y={12}
        width={336}
        height={116}
        rx={22}
      />
      <rect className='tag' x='120' y='10' width='120' height='32' rx='14' />
      <text className='tag-label' x='180' y='31' textAnchor='middle'>CECHA</text>
      <line className='branch' x1='180' y1='42' x2='85' y2='66' />
      <line className='branch' x1='180' y1='42' x2='275' y2='66' />
      <rect className='bin-a' x='20' y='66' width='130' height='48' rx='14' />
      <rect className='bin-b' x='210' y='66' width='130' height='48' rx='14' />
      <circle className='dot' cx='180' cy='56' r='8' />
      <circle className='dot dot-b' cx='180' cy='56' r='8' />
    </svg>
  );
}

export function LogicalReasoningAnimation({
  ariaLabel,
}: LogicalThinkingAnimationProps = {}): React.JSX.Element {
  const surfaceIds = useLogicalThinkingSurfaceIds('logical-thinking-reasoning');

  return (
    <svg
      aria-label={ariaLabel ?? 'Animacja: jeśli to prowadzi do wtedy.'}
      className='h-auto w-full'
      data-testid='logical-thinking-reasoning-animation'
      role='img'
      viewBox='0 0 360 126'
    >
      <style>{`
        .box {
          fill: rgba(238, 242, 255, 0.95);
          stroke: rgba(99, 102, 241, 0.35);
          stroke-width: 2;
        }
        .arrow-track { stroke: rgba(99, 102, 241, 0.18); stroke-width: 8; stroke-linecap: round; }
        .arrow { stroke: #6366f1; stroke-width: 4; stroke-linecap: round; animation: arrowPulse 3.8s ease-in-out infinite; }
        .label { font: 700 14px/1.1 system-ui, sans-serif; fill: #4338ca; }
        @keyframes arrowPulse {
          0%, 100% { opacity: 0.4; }
          50% { opacity: 1; }
        }
        @media (prefers-reduced-motion: reduce) {
          .arrow { animation: none; opacity: 1; }
        }
      `}</style>
      <LogicalThinkingSurface
        accentEnd='#eef2ff'
        accentStart='#6366f1'
        atmosphereA='rgba(99, 102, 241, 0.08)'
        atmosphereB='rgba(168, 85, 247, 0.06)'
        ids={surfaceIds}
        stroke='rgba(99, 102, 241, 0.12)'
        testIdPrefix='logical-thinking-reasoning'
        x={12}
        y={12}
        width={336}
        height={102}
        rx={22}
      />
      <rect className='box' x='30' y='39' width='110' height='48' rx='12' />
      <rect className='box' x='220' y='39' width='110' height='48' rx='12' />
      <text className='label' x='85' y='69' textAnchor='middle'>JEŚLI</text>
      <text className='label' x='275' y='69' textAnchor='middle'>WTEDY</text>
      <line className='arrow-track' x1='150' y1='63' x2='210' y2='63' />
      <line className='arrow' x1='150' y1='63' x2='210' y2='63' />
      <polyline className='arrow' fill='none' points='200,55 210,63 200,71' />
    </svg>
  );
}

export function LogicalAnalogiesAnimation({
  ariaLabel,
}: LogicalThinkingAnimationProps = {}): React.JSX.Element {
  const surfaceIds = useLogicalThinkingSurfaceIds('logical-thinking-analogies');

  return (
    <svg
      aria-label={ariaLabel ?? 'Animacja: analogia łączy dwie pary.'}
      className='h-auto w-full'
      data-testid='logical-thinking-analogies-animation'
      role='img'
      viewBox='0 0 360 126'
    >
      <style>{`
        .pair {
          fill: rgba(243, 232, 255, 0.95);
          stroke: rgba(168, 85, 247, 0.36);
          stroke-width: 2;
        }
        .track { stroke: rgba(168, 85, 247, 0.18); stroke-width: 8; stroke-linecap: round; }
        .link { stroke: #a855f7; stroke-width: 3; stroke-linecap: round; animation: linkPulse 3.6s ease-in-out infinite; }
        .pair-a { fill: #a855f7; }
        .pair-b { fill: #c084fc; }
        @keyframes linkPulse {
          0%, 100% { opacity: 0.4; }
          50% { opacity: 1; }
        }
        @media (prefers-reduced-motion: reduce) {
          .link { animation: none; opacity: 1; }
        }
      `}</style>
      <LogicalThinkingSurface
        accentEnd='#faf5ff'
        accentStart='#a855f7'
        atmosphereA='rgba(168, 85, 247, 0.08)'
        atmosphereB='rgba(244, 114, 182, 0.06)'
        ids={surfaceIds}
        stroke='rgba(168, 85, 247, 0.12)'
        testIdPrefix='logical-thinking-analogies'
        x={12}
        y={12}
        width={336}
        height={102}
        rx={22}
      />
      <rect className='pair' x='40' y='38' width='80' height='50' rx='12' />
      <rect className='pair' x='240' y='38' width='80' height='50' rx='12' />
      <line className='track' x1='120' y1='63' x2='240' y2='63' />
      <line className='link' x1='120' y1='63' x2='240' y2='63' />
      <circle className='pair-a' cx='70' cy='63' r='8' />
      <circle className='pair-b' cx='90' cy='63' r='8' />
      <circle className='pair-a' cx='270' cy='63' r='8' />
      <circle className='pair-b' cx='290' cy='63' r='8' />
    </svg>
  );
}

export function LogicalAnalogyMapAnimation({
  ariaLabel,
}: LogicalThinkingAnimationProps = {}): React.JSX.Element {
  const surfaceIds = useLogicalThinkingSurfaceIds('logical-thinking-analogy-map');

  return (
    <svg
      aria-label={ariaLabel ?? 'Animacja: relacja przenosi się z jednej pary na drugą.'}
      className='h-auto w-full'
      data-testid='logical-thinking-analogy-map-animation'
      role='img'
      viewBox='0 0 360 138'
    >
      <style>{`
        .cell { fill: rgba(250, 245, 255, 0.96); stroke: rgba(192, 132, 252, 0.36); stroke-width: 2; }
        .label { font: 700 12px/1.1 system-ui, sans-serif; fill: #7e22ce; }
        .pair-link { stroke: #c084fc; stroke-width: 3; stroke-linecap: round; }
        .map-link {
          stroke: #a855f7;
          stroke-width: 3;
          stroke-linecap: round;
          opacity: 0.4;
          animation: mapPulse 3.6s ease-in-out infinite;
        }
        .beacon { fill: #a855f7; }
        @keyframes mapPulse {
          0%, 100% { opacity: 0.4; }
          50% { opacity: 1; }
        }
        @media (prefers-reduced-motion: reduce) {
          .map-link { animation: none; opacity: 1; }
        }
      `}</style>
      <LogicalThinkingSurface
        accentEnd='#faf5ff'
        accentStart='#a855f7'
        atmosphereA='rgba(168, 85, 247, 0.08)'
        atmosphereB='rgba(244, 114, 182, 0.06)'
        ids={surfaceIds}
        stroke='rgba(168, 85, 247, 0.12)'
        testIdPrefix='logical-thinking-analogy-map'
        x={12}
        y={12}
        width={336}
        height={114}
        rx={22}
      />
      <rect className='cell' x='40' y='22' width='60' height='34' rx='10' />
      <rect className='cell' x='130' y='22' width='60' height='34' rx='10' />
      <rect className='cell' x='40' y='74' width='60' height='34' rx='10' />
      <rect className='cell' x='130' y='74' width='60' height='34' rx='10' />
      <text className='label' x='63' y='44'>A</text>
      <text className='label' x='153' y='44'>B</text>
      <text className='label' x='63' y='96'>C</text>
      <text className='label' x='153' y='96'>D</text>
      <line className='pair-link' x1='100' y1='39' x2='130' y2='39' />
      <line className='pair-link' x1='100' y1='91' x2='130' y2='91' />
      <line className='map-link' x1='210' y1='39' x2='300' y2='91' />
      <line className='map-link' x1='210' y1='91' x2='300' y2='39' />
      <circle className='beacon' cx='315' cy='65' r='8' />
    </svg>
  );
}

export function LogicalSummaryAnimation({
  ariaLabel,
}: LogicalThinkingAnimationProps = {}): React.JSX.Element {
  const surfaceIds = useLogicalThinkingSurfaceIds('logical-thinking-summary');

  return (
    <svg
      aria-label={ariaLabel ?? 'Animacja: podsumowanie kroków logicznego myślenia.'}
      className='h-auto w-full'
      data-testid='logical-thinking-summary-animation'
      role='img'
      viewBox='0 0 360 126'
    >
      <style>{`
        .pill {
          stroke-width: 2;
          opacity: 0.34;
          animation: summaryPop 4.4s ease-in-out infinite;
        }
        .p1 { fill: rgba(254, 243, 199, 0.96); stroke: rgba(245, 158, 11, 0.35); }
        .p2 { fill: rgba(224, 242, 254, 0.96); stroke: rgba(56, 189, 248, 0.35); animation-delay: 0.6s; }
        .p3 { fill: rgba(243, 232, 255, 0.96); stroke: rgba(168, 85, 247, 0.35); animation-delay: 1.2s; }
        .label { font: 700 11px/1.1 system-ui, sans-serif; fill: #92400e; }
        @keyframes summaryPop {
          0%, 100% { opacity: 0.34; transform: scale(0.95); }
          50% { opacity: 1; transform: scale(1); }
        }
        @media (prefers-reduced-motion: reduce) {
          .pill { animation: none; opacity: 1; }
        }
      `}</style>
      <LogicalThinkingSurface
        accentEnd='#fff7ed'
        accentStart='#f59e0b'
        atmosphereA='rgba(245, 158, 11, 0.08)'
        atmosphereB='rgba(168, 85, 247, 0.08)'
        ids={surfaceIds}
        stroke='rgba(245, 158, 11, 0.12)'
        testIdPrefix='logical-thinking-summary'
        x={12}
        y={12}
        width={336}
        height={102}
        rx={22}
      />
      <rect className='pill p1' x='30' y='43' width='90' height='30' rx='12' />
      <rect className='pill p2' x='135' y='43' width='90' height='30' rx='12' />
      <rect className='pill p3' x='240' y='43' width='90' height='30' rx='12' />
      <text className='label' x='48' y='63'>WZORCE</text>
      <text className='label' x='146' y='63'>WNIOSKI</text>
      <text className='label' x='248' y='63'>ANALOGIE</text>
    </svg>
  );
}
