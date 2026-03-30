import React from 'react';
import {
  type KangurAnimationSurfaceIdsDto,
  type KangurAnimationSurfacePropsDto,
  useKangurAnimationSurfaceIds,
} from '@/features/kangur/ui/components/animations/animation-surface-contracts';

type LogicalReasoningSurfaceIds = KangurAnimationSurfaceIdsDto;

type LogicalReasoningSurfaceProps = KangurAnimationSurfacePropsDto;

function useLogicalReasoningSurfaceIds(prefix: string): LogicalReasoningSurfaceIds {
  return useKangurAnimationSurfaceIds(prefix);
}

function LogicalReasoningSurface({
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
}: LogicalReasoningSurfaceProps): React.JSX.Element {
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
          <stop offset='50%' stopColor='#f8fafc' />
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
        <ellipse cx={x + width * 0.22} cy={y + height * 0.2} fill={atmosphereA} rx={width * 0.2} ry={height * 0.16} />
        <ellipse cx={x + width * 0.8} cy={y + height * 0.88} fill={atmosphereB} rx={width * 0.32} ry={height * 0.18} />
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

export function DeductionFlowAnimation(): React.JSX.Element {
  const surfaceIds = useLogicalReasoningSurfaceIds('logical-reasoning-deduction');

  return (
    <svg
      aria-label='Animacja dedukcji: od ogólnej reguły do konkretnego wniosku.'
      className='h-auto w-full'
      data-testid='logical-reasoning-deduction-animation'
      role='img'
      viewBox='0 0 320 158'
    >
      <style>{`
        .node { fill: rgba(238, 242, 255, 0.96); stroke: rgba(129, 140, 248, 0.42); stroke-width: 2; }
        .label { font: 700 13px/1 system-ui, sans-serif; fill: #4338ca; }
        .arrow-track { stroke: rgba(99, 102, 241, 0.18); stroke-width: 8; stroke-linecap: round; }
        .arrow { stroke: #6366f1; stroke-width: 3; stroke-linecap: round; stroke-dasharray: 12 10; animation: flow 4.8s ease-in-out infinite; }
        @keyframes flow {
          0%, 20% { stroke-dashoffset: 22; opacity: 0.35; }
          55%, 80% { stroke-dashoffset: 0; opacity: 1; }
          100% { stroke-dashoffset: 22; opacity: 0.35; }
        }
        @media (prefers-reduced-motion: reduce) {
          .arrow { animation: none; opacity: 1; stroke-dashoffset: 0; }
        }
      `}</style>
      <LogicalReasoningSurface
        accentEnd='#eef2ff'
        accentStart='#818cf8'
        atmosphereA='rgba(129, 140, 248, 0.08)'
        atmosphereB='rgba(99, 102, 241, 0.08)'
        ids={surfaceIds}
        stroke='rgba(99, 102, 241, 0.12)'
        testIdPrefix='logical-reasoning-deduction'
        x={12}
        y={12}
        width={296}
        height={134}
        rx={22}
      />
      <rect className='node' x='60' y='16' width='200' height='34' rx='14' />
      <text className='label' x='92' y='38'>Ogólna reguła</text>
      <rect className='node' x='90' y='64' width='140' height='30' rx='12' />
      <text className='label' x='128' y='84'>Fakt</text>
      <rect className='node' x='70' y='106' width='180' height='32' rx='12' />
      <text className='label' x='108' y='126'>Wniosek</text>
      <line className='arrow-track' x1='160' y1='50' x2='160' y2='64' />
      <line className='arrow-track' x1='160' y1='94' x2='160' y2='106' />
      <line className='arrow' x1='160' y1='50' x2='160' y2='64' />
      <line className='arrow' x1='160' y1='94' x2='160' y2='106' />
    </svg>
  );
}

export function InductionGatherAnimation(): React.JSX.Element {
  const surfaceIds = useLogicalReasoningSurfaceIds('logical-reasoning-induction');

  return (
    <svg
      aria-label='Animacja indukcji: wiele obserwacji prowadzi do reguły.'
      className='h-auto w-full'
      data-testid='logical-reasoning-induction-animation'
      role='img'
      viewBox='0 0 320 158'
    >
      <style>{`
        .connector { stroke: rgba(191, 219, 254, 0.7); stroke-width: 2; }
        .dot { fill: #60a5fa; opacity: 0.35; animation: gather 4.8s ease-in-out infinite; }
        .dot-1 { animation-delay: 0s; }
        .dot-2 { animation-delay: 0.4s; }
        .dot-3 { animation-delay: 0.8s; }
        .dot-4 { animation-delay: 1.2s; }
        .dot-5 { animation-delay: 1.6s; }
        .rule {
          fill: rgba(187, 247, 208, 0.95);
          stroke: rgba(34, 197, 94, 0.42);
          stroke-width: 2;
          animation: rulePulse 4.8s ease-in-out infinite;
        }
        .label { font: 700 11px/1 system-ui, sans-serif; fill: #15803d; }
        @keyframes gather {
          0%, 25% { opacity: 0.25; transform: translateY(12px); }
          50%, 80% { opacity: 1; transform: translateY(0); }
          100% { opacity: 0.25; transform: translateY(12px); }
        }
        @keyframes rulePulse {
          0%, 35% { opacity: 0.35; }
          60%, 100% { opacity: 1; }
        }
        @media (prefers-reduced-motion: reduce) {
          .dot, .rule { animation: none; opacity: 1; transform: none; }
        }
      `}</style>
      <LogicalReasoningSurface
        accentEnd='#ecfdf5'
        accentStart='#22c55e'
        atmosphereA='rgba(34, 197, 94, 0.08)'
        atmosphereB='rgba(96, 165, 250, 0.08)'
        ids={surfaceIds}
        stroke='rgba(34, 197, 94, 0.12)'
        testIdPrefix='logical-reasoning-induction'
        x={12}
        y={12}
        width={296}
        height={134}
        rx={22}
      />
      <circle className='rule' cx='160' cy='40' r='24' />
      <text className='label' x='144' y='44'>Reguła</text>
      <circle className='dot dot-1' cx='70' cy='110' r='8' />
      <circle className='dot dot-2' cx='110' cy='110' r='8' />
      <circle className='dot dot-3' cx='150' cy='110' r='8' />
      <circle className='dot dot-4' cx='190' cy='110' r='8' />
      <circle className='dot dot-5' cx='230' cy='110' r='8' />
      <line className='connector' x1='70' y1='96' x2='140' y2='58' />
      <line className='connector' x1='110' y1='96' x2='148' y2='58' />
      <line className='connector' x1='150' y1='96' x2='156' y2='58' />
      <line className='connector' x1='190' y1='96' x2='164' y2='58' />
      <line className='connector' x1='230' y1='96' x2='172' y2='58' />
    </svg>
  );
}

export function IfThenArrowAnimation(): React.JSX.Element {
  const surfaceIds = useLogicalReasoningSurfaceIds('logical-reasoning-if-then');

  return (
    <svg
      aria-label='Animacja warunku logicznego: jeśli P, to Q.'
      className='h-auto w-full'
      data-testid='logical-reasoning-if-then-animation'
      role='img'
      viewBox='0 0 320 126'
    >
      <style>{`
        .node { fill: rgba(224, 231, 255, 0.95); stroke: rgba(99, 102, 241, 0.42); stroke-width: 2; }
        .label { font: 700 12px/1 system-ui, sans-serif; fill: #4338ca; }
        .arrow-track { stroke: rgba(99, 102, 241, 0.18); stroke-width: 8; stroke-linecap: round; }
        .arrow { stroke: #6366f1; stroke-width: 3; stroke-linecap: round; animation: blink 4s ease-in-out infinite; }
        @keyframes blink {
          0%, 35% { opacity: 0.35; }
          55%, 100% { opacity: 1; }
        }
        @media (prefers-reduced-motion: reduce) {
          .arrow { animation: none; opacity: 1; }
        }
      `}</style>
      <LogicalReasoningSurface
        accentEnd='#eef2ff'
        accentStart='#6366f1'
        atmosphereA='rgba(99, 102, 241, 0.08)'
        atmosphereB='rgba(56, 189, 248, 0.06)'
        ids={surfaceIds}
        stroke='rgba(99, 102, 241, 0.12)'
        testIdPrefix='logical-reasoning-if-then'
        x={12}
        y={12}
        width={296}
        height={102}
        rx={22}
      />
      <circle className='node' cx='70' cy='60' r='24' />
      <text className='label' x='63' y='64'>P</text>
      <circle className='node' cx='250' cy='60' r='24' />
      <text className='label' x='243' y='64'>Q</text>
      <line className='arrow-track' x1='96' y1='60' x2='224' y2='60' />
      <line className='arrow' x1='96' y1='60' x2='224' y2='60' />
      <polygon points='224,54 238,60 224,66' fill='#6366f1' />
      <text className='label' x='58' y='24'>Jeśli</text>
      <text className='label' x='234' y='24'>to</text>
    </svg>
  );
}

export function QuantifierScopeAnimation(): React.JSX.Element {
  const surfaceIds = useLogicalReasoningSurfaceIds('logical-reasoning-quantifiers');

  return (
    <svg
      aria-label='Animacja kwantyfikatorów: wszyscy, niektórzy, żaden.'
      className='h-auto w-full'
      data-testid='logical-reasoning-quantifiers-animation'
      role='img'
      viewBox='0 0 320 126'
    >
      <style>{`
        .dot { fill: #94a3b8; }
        .scope-all, .scope-some, .scope-none {
          animation: scopePulse 6s ease-in-out infinite;
          opacity: 0;
        }
        .scope-all { animation-delay: 0s; }
        .scope-some { animation-delay: 2s; }
        .scope-none { animation-delay: 4s; }
        .label { font: 700 10px/1 system-ui, sans-serif; fill: #475569; }
        @keyframes scopePulse {
          0%, 20% { opacity: 0; }
          35%, 65% { opacity: 1; }
          100% { opacity: 0; }
        }
        @media (prefers-reduced-motion: reduce) {
          .scope-all, .scope-some, .scope-none { animation: none; opacity: 1; }
        }
      `}</style>
      <LogicalReasoningSurface
        accentEnd='#f8fafc'
        accentStart='#94a3b8'
        atmosphereA='rgba(16, 185, 129, 0.08)'
        atmosphereB='rgba(244, 63, 94, 0.08)'
        ids={surfaceIds}
        stroke='rgba(148, 163, 184, 0.12)'
        testIdPrefix='logical-reasoning-quantifiers'
        x={12}
        y={12}
        width={296}
        height={102}
        rx={22}
      />
      {[0, 1, 2, 3, 4, 5].map((index) => (
        <circle key={`dot-${index}`} className='dot' cx={70 + index * 32} cy='60' r='8' />
      ))}
      <rect className='scope-all' x='52' y='44' width='212' height='32' rx='16' fill='rgba(16,185,129,0.18)' />
      <rect className='scope-some' x='116' y='44' width='84' height='32' rx='16' fill='rgba(245,158,11,0.22)' />
      <line className='scope-none' x1='52' y1='44' x2='264' y2='76' stroke='#f43f5e' strokeWidth='3' />
      <line className='scope-none' x1='264' y1='44' x2='52' y2='76' stroke='#f43f5e' strokeWidth='3' />
      <text className='label' x='60' y='24'>Wszyscy</text>
      <text className='label' x='136' y='24'>Niektórzy</text>
      <text className='label' x='226' y='24'>Żaden</text>
    </svg>
  );
}

export function EliminationGridAnimation(): React.JSX.Element {
  const surfaceIds = useLogicalReasoningSurfaceIds('logical-reasoning-elimination');

  return (
    <svg
      aria-label='Animacja eliminacji: odrzucaj niemożliwe opcje.'
      className='h-auto w-full'
      data-testid='logical-reasoning-elimination-animation'
      role='img'
      viewBox='0 0 320 146'
    >
      <style>{`
        .cell { fill: rgba(248, 250, 252, 0.96); stroke: rgba(203, 213, 245, 0.4); stroke-width: 2; }
        .x {
          stroke: #f43f5e;
          stroke-width: 3;
          stroke-linecap: round;
          opacity: 0;
          animation: xPulse 5s ease-in-out infinite;
        }
        .x-1 { animation-delay: 0s; }
        .x-2 { animation-delay: 0.7s; }
        .x-3 { animation-delay: 1.4s; }
        .x-4 { animation-delay: 2.1s; }
        .keep {
          fill: rgba(187, 247, 208, 0.96);
          stroke: rgba(34, 197, 94, 0.42);
          stroke-width: 2;
          animation: keepGlow 5s ease-in-out infinite;
        }
        @keyframes xPulse {
          0%, 30% { opacity: 0; }
          45%, 70% { opacity: 1; }
          100% { opacity: 0; }
        }
        @keyframes keepGlow {
          0%, 40% { opacity: 0.35; }
          60%, 100% { opacity: 1; }
        }
        @media (prefers-reduced-motion: reduce) {
          .x { animation: none; opacity: 1; }
          .keep { animation: none; opacity: 1; }
        }
      `}</style>
      <LogicalReasoningSurface
        accentEnd='#f8fafc'
        accentStart='#94a3b8'
        atmosphereA='rgba(99, 102, 241, 0.06)'
        atmosphereB='rgba(34, 197, 94, 0.08)'
        ids={surfaceIds}
        stroke='rgba(148, 163, 184, 0.12)'
        testIdPrefix='logical-reasoning-elimination'
        x={12}
        y={12}
        width={296}
        height={122}
        rx={22}
      />
      {[0, 1, 2].map((row) =>
        [0, 1, 2].map((col) => (
          <rect
            key={`cell-${row}-${col}`}
            className='cell'
            x={60 + col * 60}
            y={24 + row * 36}
            width='48'
            height='28'
            rx='8'
          />
        ))
      )}
      <rect className='keep' x='180' y='60' width='48' height='28' rx='8' />
      <line className='x x-1' x1='66' y1='30' x2='102' y2='46' />
      <line className='x x-1' x1='102' y1='30' x2='66' y2='46' />
      <line className='x x-2' x1='126' y1='66' x2='162' y2='82' />
      <line className='x x-2' x1='162' y1='66' x2='126' y2='82' />
      <line className='x x-3' x1='186' y1='102' x2='222' y2='118' />
      <line className='x x-3' x1='222' y1='102' x2='186' y2='118' />
      <line className='x x-4' x1='246' y1='30' x2='282' y2='46' />
      <line className='x x-4' x1='282' y1='30' x2='246' y2='46' />
    </svg>
  );
}
