import React from 'react';
import {
  type KangurAnimationSurfaceIdsDto,
  type KangurAnimationSurfacePropsDto,
  useKangurAnimationSurfaceIds,
} from './animation-surface-contracts';

type MathSurfaceIds = KangurAnimationSurfaceIdsDto;

type MathSurfaceProps = KangurAnimationSurfacePropsDto;

type MathChipProps = {
  fill: string;
  label: string;
  stroke: string;
  width?: number;
  x: number;
  y: number;
};

function useMathSurfaceIds(prefix: string): MathSurfaceIds {
  return useKangurAnimationSurfaceIds(prefix);
}

function MathSurface({
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
}: MathSurfaceProps): React.JSX.Element {
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
        <ellipse cx={x + width * 0.2} cy={y + height * 0.2} fill={atmosphereA} rx={width * 0.2} ry={height * 0.16} />
        <ellipse cx={x + width * 0.82} cy={y + height * 0.86} fill={atmosphereB} rx={width * 0.32} ry={height * 0.2} />
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

function MathChip({
  fill,
  label,
  stroke,
  width = 92,
  x,
  y,
}: MathChipProps): React.JSX.Element {
  return (
    <g>
      <rect fill={fill} height='26' rx='13' stroke={stroke} strokeWidth='1.5' width={width} x={x} y={y} />
      <text fill='#0f172a' fontSize='12' fontWeight='700' textAnchor='middle' x={x + width / 2} y={y + 17}>
        {label}
      </text>
    </g>
  );
}

export function DivisionEqualGroupsAnimation(): React.JSX.Element {
  const surfaceIds = useMathSurfaceIds('division-equal-groups');

  return (
    <svg
      aria-label='Animacja dzielenia: 12 kropek podzielone na 3 równe grupy.'
      className='h-auto w-full'
      data-testid='division-equal-groups-animation'
      role='img'
      viewBox='0 0 420 150'
    >
      <style>{`
        .division-equal-groups-dot { fill: #38bdf8; filter: drop-shadow(0 5px 9px rgba(56, 189, 248, 0.22)); }
        .division-equal-groups-box {
          fill: rgba(255, 255, 255, 0.7);
          stroke: rgba(148, 163, 184, 0.28);
          stroke-dasharray: 6 6;
        }
        .division-equal-groups-group { animation: divisionEqualGroupsPulse 4.8s ease-in-out infinite; }
        .division-equal-groups-group-2 { animation-delay: 1.6s; }
        .division-equal-groups-group-3 { animation-delay: 3.2s; }
        @keyframes divisionEqualGroupsPulse {
          0%, 100% { opacity: 0.35; }
          45% { opacity: 1; }
        }
        @media (prefers-reduced-motion: reduce) {
          .division-equal-groups-group { animation: none; opacity: 1; }
        }
      `}</style>
      <MathSurface
        accentEnd='#dbeafe'
        accentStart='#38bdf8'
        atmosphereA='rgba(56, 189, 248, 0.08)'
        atmosphereB='rgba(96, 165, 250, 0.08)'
        ids={surfaceIds}
        stroke='rgba(56, 189, 248, 0.12)'
        testIdPrefix='division-equal-groups'
        x={12}
        y={12}
        width={396}
        height={126}
        rx={24}
      />
      <MathChip fill='rgba(255,255,255,0.88)' label='12 ÷ 3 = 4' stroke='rgba(56,189,248,0.2)' width={106} x={24} y={22} />
      <rect className='division-equal-groups-box' height='84' rx='18' width='110' x='30' y='40' />
      <rect className='division-equal-groups-box' height='84' rx='18' width='110' x='155' y='40' />
      <rect className='division-equal-groups-box' height='84' rx='18' width='110' x='280' y='40' />
      {[0, 1, 2].map((group) => (
        <g key={`group-${group}`} className={`division-equal-groups-group division-equal-groups-group-${group + 1}`}>
          {[0, 1, 2, 3].map((index) => (
            <circle
              key={`dot-${group}-${index}`}
              className='division-equal-groups-dot'
              cx={55 + group * 125 + (index % 2) * 30}
              cy={64 + Math.floor(index / 2) * 30}
              r='8'
            />
          ))}
        </g>
      ))}
    </svg>
  );
}

export function DivisionInverseAnimation(): React.JSX.Element {
  const surfaceIds = useMathSurfaceIds('division-inverse');

  return (
    <svg
      aria-label='Animacja: mnożenie i dzielenie są odwrotne.'
      className='h-auto w-full'
      data-testid='division-inverse-animation'
      role='img'
      viewBox='0 0 360 150'
    >
      <style>{`
        .division-inverse-dot { fill: #22c55e; }
        .division-inverse-row { animation: divisionInversePulse 3.8s ease-in-out infinite; }
        .division-inverse-row-2 { animation-delay: 1.2s; }
        .division-inverse-row-3 { animation-delay: 2.4s; }
        @keyframes divisionInversePulse {
          0%, 100% { opacity: 0.35; }
          45% { opacity: 1; }
        }
        @media (prefers-reduced-motion: reduce) {
          .division-inverse-row { animation: none; opacity: 1; }
        }
      `}</style>
      <MathSurface
        accentEnd='#dcfce7'
        accentStart='#22c55e'
        atmosphereA='rgba(34, 197, 94, 0.08)'
        atmosphereB='rgba(96, 165, 250, 0.08)'
        ids={surfaceIds}
        stroke='rgba(34, 197, 94, 0.12)'
        testIdPrefix='division-inverse'
        x={12}
        y={12}
        width={336}
        height={126}
        rx={24}
      />
      <rect fill='rgba(255,255,255,0.7)' height='90' rx='18' stroke='rgba(148,163,184,0.28)' strokeDasharray='6 6' width='170' x='26' y='34' />
      {[0, 1, 2].map((row) => (
        <g key={`row-${row}`} className={`division-inverse-row division-inverse-row-${row + 1}`}>
          {[0, 1, 2, 3].map((col) => (
            <circle key={`row-${row}-col-${col}`} className='division-inverse-dot' cx={52 + col * 30} cy={56 + row * 24} r='7' />
          ))}
        </g>
      ))}
      <text fill='#64748b' fontSize='12' fontWeight='700' x='220' y='64'>12 ÷ 3 = 4</text>
      <text fill='#64748b' fontSize='12' fontWeight='700' x='220' y='90'>4 × 3 = 12</text>
    </svg>
  );
}

export function DivisionRemainderAnimation(): React.JSX.Element {
  const surfaceIds = useMathSurfaceIds('division-remainder');

  return (
    <svg
      aria-label='Animacja dzielenia z resztą: 7 podzielone na 2 daje 3 reszta 1.'
      className='h-auto w-full'
      data-testid='division-remainder-animation'
      role='img'
      viewBox='0 0 360 140'
    >
      <style>{`
        .division-remainder-dot { fill: #14b8a6; }
        .division-remainder-leftover {
          fill: #f97316;
          animation: divisionRemainderPulse 3.6s ease-in-out infinite;
        }
        @keyframes divisionRemainderPulse {
          0%, 100% { opacity: 0.4; transform: scale(0.95); }
          50% { opacity: 1; transform: scale(1); }
        }
        @media (prefers-reduced-motion: reduce) {
          .division-remainder-leftover { animation: none; opacity: 1; }
        }
      `}</style>
      <MathSurface
        accentEnd='#ccfbf1'
        accentStart='#14b8a6'
        atmosphereA='rgba(20, 184, 166, 0.08)'
        atmosphereB='rgba(249, 115, 22, 0.08)'
        ids={surfaceIds}
        stroke='rgba(20, 184, 166, 0.12)'
        testIdPrefix='division-remainder'
        x={12}
        y={12}
        width={336}
        height={116}
        rx={24}
      />
      <MathChip fill='rgba(255,255,255,0.88)' label='7 ÷ 2 = 3 r 1' stroke='rgba(20,184,166,0.2)' width={110} x={24} y={22} />
      <rect fill='rgba(255,255,255,0.7)' height='72' rx='18' stroke='rgba(148,163,184,0.28)' strokeDasharray='6 6' width='200' x='22' y='44' />
      {[0, 1, 2].map((group) => (
        <g key={`pair-${group}`}>
          <circle className='division-remainder-dot' cx={48 + group * 56} cy='70' r='7.5' />
          <circle className='division-remainder-dot' cx={48 + group * 56} cy='94' r='7.5' />
        </g>
      ))}
      <circle className='division-remainder-leftover' cx='193' cy='70' r='7.5' />
      <text fill='#64748b' fontSize='12' fontWeight='700' x='236' y='82'>reszta 1</text>
    </svg>
  );
}

export function MultiplicationGroupsAnimation(): React.JSX.Element {
  const surfaceIds = useMathSurfaceIds('multiplication-groups');

  return (
    <svg
      aria-label='Animacja mnożenia: 3 grupy po 4 tworzą 12.'
      className='h-auto w-full'
      data-testid='multiplication-groups-animation'
      role='img'
      viewBox='0 0 420 150'
    >
      <style>{`
        .multiplication-groups-a { fill: #f59e0b; }
        .multiplication-groups-b { fill: #60a5fa; }
        .multiplication-groups-c { fill: #34d399; }
        .multiplication-groups-array { fill: #a855f7; }
        .multiplication-groups-left { animation: multiplicationGroupsFade 6s ease-in-out infinite; }
        .multiplication-groups-grid { animation: multiplicationGroupsReveal 6s ease-in-out infinite; }
        @keyframes multiplicationGroupsFade {
          0%, 45% { opacity: 1; }
          65%, 100% { opacity: 0.3; }
        }
        @keyframes multiplicationGroupsReveal {
          0%, 45% { opacity: 0; transform: scale(0.98); }
          65%, 100% { opacity: 1; transform: scale(1); }
        }
        @media (prefers-reduced-motion: reduce) {
          .multiplication-groups-left,
          .multiplication-groups-grid { animation: none; opacity: 1; transform: none; }
        }
      `}</style>
      <MathSurface
        accentEnd='#ede9fe'
        accentStart='#8b5cf6'
        atmosphereA='rgba(139, 92, 246, 0.08)'
        atmosphereB='rgba(245, 158, 11, 0.08)'
        ids={surfaceIds}
        stroke='rgba(139, 92, 246, 0.12)'
        testIdPrefix='multiplication-groups'
        x={12}
        y={12}
        width={396}
        height={126}
        rx={24}
      />
      <g className='multiplication-groups-left'>
        {[0, 1, 2, 3].map((index) => <circle key={`a-${index}`} className='multiplication-groups-a' cx={40 + index * 18} cy='52' r='7.5' />)}
        {[0, 1, 2, 3].map((index) => <circle key={`b-${index}`} className='multiplication-groups-b' cx={40 + index * 18} cy='84' r='7.5' />)}
        {[0, 1, 2, 3].map((index) => <circle key={`c-${index}`} className='multiplication-groups-c' cx={40 + index * 18} cy='116' r='7.5' />)}
      </g>
      <g fill='none' stroke='#94a3b8' strokeLinecap='round' strokeWidth='4'>
        <line x1='136' x2='186' y1='84' y2='84' />
        <polyline points='174,76 188,84 174,92' />
      </g>
      <rect fill='rgba(255,255,255,0.7)' height='98' rx='18' stroke='rgba(148,163,184,0.28)' strokeDasharray='6 6' width='154' x='228' y='36' />
      <g className='multiplication-groups-grid'>
        {[0, 1, 2].map((row) =>
          [0, 1, 2, 3].map((col) => (
            <circle key={`grid-${row}-${col}`} className='multiplication-groups-array' cx={252 + col * 30} cy={58 + row * 24} r='7' />
          ))
        )}
      </g>
    </svg>
  );
}

export function MultiplicationArrayAnimation(): React.JSX.Element {
  const surfaceIds = useMathSurfaceIds('multiplication-array');

  return (
    <svg
      aria-label='Animacja mnożenia: rzędy w tablicy pokazują kolejne sumy.'
      className='h-auto w-full'
      data-testid='multiplication-array-animation'
      role='img'
      viewBox='0 0 360 150'
    >
      <style>{`
        .multiplication-array-row { animation: multiplicationArrayPulse 3.6s ease-in-out infinite; }
        .multiplication-array-row-2 { animation-delay: 1.2s; }
        .multiplication-array-row-3 { animation-delay: 2.4s; }
        .multiplication-array-dot { fill: #a855f7; }
        @keyframes multiplicationArrayPulse {
          0%, 100% { opacity: 0.35; }
          45% { opacity: 1; }
        }
        @media (prefers-reduced-motion: reduce) {
          .multiplication-array-row { animation: none; opacity: 1; }
        }
      `}</style>
      <MathSurface
        accentEnd='#ede9fe'
        accentStart='#8b5cf6'
        atmosphereA='rgba(139, 92, 246, 0.08)'
        atmosphereB='rgba(96, 165, 250, 0.08)'
        ids={surfaceIds}
        stroke='rgba(139, 92, 246, 0.12)'
        testIdPrefix='multiplication-array'
        x={12}
        y={12}
        width={336}
        height={126}
        rx={24}
      />
      <rect fill='rgba(255,255,255,0.7)' height='92' rx='18' stroke='rgba(148,163,184,0.28)' strokeDasharray='6 6' width='194' x='34' y='34' />
      {[0, 1, 2].map((row) => (
        <g key={`row-${row}`} className={`multiplication-array-row multiplication-array-row-${row + 1}`}>
          {[0, 1, 2, 3].map((col) => (
            <circle key={`row-${row}-col-${col}`} className='multiplication-array-dot' cx={64 + col * 40} cy={58 + row * 24} r='7' />
          ))}
          <text fill='#64748b' fontSize='12' fontWeight='700' x='244' y={62 + row * 24}>{(row + 1) * 4}</text>
        </g>
      ))}
      <text fill='#64748b' fontSize='12' fontWeight='700' x='242' y='42'>suma</text>
    </svg>
  );
}

export function MultiplicationCommutativeAnimation(): React.JSX.Element {
  const surfaceIds = useMathSurfaceIds('multiplication-commutative');

  return (
    <svg
      aria-label='Animacja: 3×4 to to samo co 4×3.'
      className='h-auto w-full'
      data-testid='multiplication-commutative-animation'
      role='img'
      viewBox='0 0 320 150'
    >
      <style>{`
        .multiplication-commutative-a { animation: multiplicationCommutativeA 6s ease-in-out infinite; }
        .multiplication-commutative-b { animation: multiplicationCommutativeB 6s ease-in-out infinite; }
        .multiplication-commutative-dot-a { fill: #60a5fa; }
        .multiplication-commutative-dot-b { fill: #f59e0b; }
        @keyframes multiplicationCommutativeA {
          0%, 45% { opacity: 1; }
          60%, 100% { opacity: 0; }
        }
        @keyframes multiplicationCommutativeB {
          0%, 45% { opacity: 0; }
          60%, 100% { opacity: 1; }
        }
        @media (prefers-reduced-motion: reduce) {
          .multiplication-commutative-a,
          .multiplication-commutative-b { animation: none; opacity: 1; }
        }
      `}</style>
      <MathSurface
        accentEnd='#fef3c7'
        accentStart='#f59e0b'
        atmosphereA='rgba(245, 158, 11, 0.08)'
        atmosphereB='rgba(96, 165, 250, 0.08)'
        ids={surfaceIds}
        stroke='rgba(245, 158, 11, 0.12)'
        testIdPrefix='multiplication-commutative'
        x={12}
        y={12}
        width={296}
        height={126}
        rx={24}
      />
      <g className='multiplication-commutative-a'>
        {[0, 1, 2].map((row) =>
          [0, 1, 2, 3].map((col) => (
            <circle key={`a-${row}-${col}`} className='multiplication-commutative-dot-a' cx={70 + col * 24} cy={56 + row * 24} r='6' />
          ))
        )}
      </g>
      <g className='multiplication-commutative-b'>
        {[0, 1, 2, 3].map((row) =>
          [0, 1, 2].map((col) => (
            <circle key={`b-${row}-${col}`} className='multiplication-commutative-dot-b' cx={70 + col * 24} cy={56 + row * 24} r='6' />
          ))
        )}
      </g>
      <text fill='#0f172a' fontSize='14' fontWeight='700' x='162' y='114'>3×4 = 4×3</text>
    </svg>
  );
}

export function MultiplicationIntroPatternAnimation(): React.JSX.Element {
  const surfaceIds = useMathSurfaceIds('multiplication-intro-pattern');

  return (
    <svg
      aria-label='Animacja mnożenia: powtarzane grupy zamieniają się w tablicę.'
      className='h-auto w-full'
      data-testid='multiplication-intro-pattern-animation'
      role='img'
      viewBox='0 0 360 150'
    >
      <style>{`
        .multiplication-intro-card { fill: rgba(255,247,237,0.92); stroke: rgba(251,146,60,0.32); stroke-width: 2; }
        .multiplication-intro-dot-a { fill: #fb7185; }
        .multiplication-intro-dot-b { fill: #f97316; }
        .multiplication-intro-dot-c { fill: #60a5fa; }
        .multiplication-intro-groups { animation: multiplicationIntroGroups 6s ease-in-out infinite; }
        .multiplication-intro-grid { animation: multiplicationIntroGrid 6s ease-in-out infinite; }
        .multiplication-intro-arrow { animation: multiplicationIntroArrow 6s ease-in-out infinite; }
        .multiplication-intro-group-card {
          transform-box: fill-box;
          transform-origin: center;
          animation: multiplicationIntroPulse 6s ease-in-out infinite;
        }
        .multiplication-intro-group-2 { animation-delay: 0.4s; }
        .multiplication-intro-group-3 { animation-delay: 0.8s; }
        .multiplication-intro-grid-dot { fill: #a855f7; }
        @keyframes multiplicationIntroPulse {
          0%, 36% { transform: translateY(0); opacity: 0.95; }
          50% { transform: translateY(-4px); opacity: 1; }
          70%, 100% { transform: translateY(0); opacity: 0.34; }
        }
        @keyframes multiplicationIntroGroups {
          0%, 46% { opacity: 1; }
          66%, 100% { opacity: 0.25; }
        }
        @keyframes multiplicationIntroArrow {
          0%, 46% { opacity: 0.25; }
          60%, 100% { opacity: 1; }
        }
        @keyframes multiplicationIntroGrid {
          0%, 46% { opacity: 0; transform: scale(0.95); }
          60%, 100% { opacity: 1; transform: scale(1); }
        }
        @media (prefers-reduced-motion: reduce) {
          .multiplication-intro-groups,
          .multiplication-intro-grid,
          .multiplication-intro-arrow,
          .multiplication-intro-group-card { animation: none; opacity: 1; transform: none; }
        }
      `}</style>
      <MathSurface
        accentEnd='#ffedd5'
        accentStart='#fb923c'
        atmosphereA='rgba(251, 146, 60, 0.08)'
        atmosphereB='rgba(168, 85, 247, 0.08)'
        ids={surfaceIds}
        stroke='rgba(251, 146, 60, 0.12)'
        testIdPrefix='multiplication-intro-pattern'
        x={12}
        y={12}
        width={336}
        height={126}
        rx={24}
      />
      <g className='multiplication-intro-groups'>
        {[0, 1, 2].map((group) => (
          <g key={`group-${group}`} className={`multiplication-intro-group-card multiplication-intro-group-${group + 1}`}>
            <rect className='multiplication-intro-card' height='84' rx='16' width='64' x={18 + group * 74} y='38' />
            {[0, 1, 2].map((dot) => (
              <circle
                key={`group-${group}-dot-${dot}`}
                className={group === 0 ? 'multiplication-intro-dot-a' : group === 1 ? 'multiplication-intro-dot-b' : 'multiplication-intro-dot-c'}
                cx={50 + group * 74}
                cy={62 + dot * 20}
                r='7'
              />
            ))}
          </g>
        ))}
      </g>
      <g className='multiplication-intro-arrow' fill='none' stroke='#94a3b8' strokeLinecap='round' strokeWidth='4'>
        <line x1='236' x2='256' y1='80' y2='80' />
        <polyline points='248,72 258,80 248,88' />
      </g>
      <g className='multiplication-intro-grid'>
        <rect fill='rgba(255,255,255,0.7)' height='96' rx='16' stroke='rgba(148,163,184,0.28)' strokeDasharray='6 6' width='90' x='258' y='32' />
        {[0, 1, 2].map((row) =>
          [0, 1, 2].map((col) => (
            <circle key={`grid-${row}-${col}`} className='multiplication-intro-grid-dot' cx={276 + col * 24} cy={54 + row * 24} r='6' />
          ))
        )}
      </g>
    </svg>
  );
}

export function MultiplicationSkipCountAnimation(): React.JSX.Element {
  const surfaceIds = useMathSurfaceIds('multiplication-skip-count');
  const doubles = [0, 2, 4, 6, 8, 10];
  const triples = [0, 3, 6, 9, 12];
  const doubleStart = 44;
  const doubleStep = 45;
  const tripleStart = 44;
  const tripleStep = 55;

  return (
    <svg
      aria-label='Animacja mnożenia: skoki co 2 i co 3 na osi liczbowej.'
      className='h-auto w-full'
      data-testid='multiplication-skip-count-animation'
      role='img'
      viewBox='0 0 360 170'
    >
      <style>{`
        .multiplication-skip-count-line { stroke: rgba(99, 102, 241, 0.24); stroke-width: 4; stroke-linecap: round; }
        .multiplication-skip-count-tick { stroke: #94a3b8; stroke-width: 2; }
        .multiplication-skip-count-label { fill: #0f172a; font-size: 12px; font-weight: 700; }
        .multiplication-skip-count-value { fill: #64748b; font-size: 11px; font-weight: 600; }
        .multiplication-skip-count-hop {
          transform-box: fill-box;
          transform-origin: center;
          animation: multiplicationSkipCountHop 3.6s ease-in-out infinite;
          opacity: 0.35;
        }
        .multiplication-skip-count-two { fill: #60a5fa; }
        .multiplication-skip-count-three { fill: #f59e0b; }
        @keyframes multiplicationSkipCountHop {
          0%, 100% { transform: translateY(0); opacity: 0.35; }
          40% { transform: translateY(-6px); opacity: 1; }
        }
        @media (prefers-reduced-motion: reduce) {
          .multiplication-skip-count-hop { animation: none; opacity: 1; }
        }
      `}</style>
      <MathSurface
        accentEnd='#ede9fe'
        accentStart='#8b5cf6'
        atmosphereA='rgba(139, 92, 246, 0.08)'
        atmosphereB='rgba(245, 158, 11, 0.08)'
        ids={surfaceIds}
        stroke='rgba(139, 92, 246, 0.12)'
        testIdPrefix='multiplication-skip-count'
        x={12}
        y={12}
        width={336}
        height={146}
        rx={24}
      />
      <text className='multiplication-skip-count-label' x='18' y='54'>×2</text>
      <line className='multiplication-skip-count-line' x1={doubleStart} x2={doubleStart + doubleStep * (doubles.length - 1)} y1='48' y2='48' />
      {doubles.map((value, index) => {
        const x = doubleStart + doubleStep * index;
        return (
          <g key={`double-${value}`}>
            <line className='multiplication-skip-count-tick' x1={x} x2={x} y1='42' y2='54' />
            <circle className='multiplication-skip-count-hop multiplication-skip-count-two' cx={x} cy='48' r='6' style={{ animationDelay: `${index * 0.35}s` }} />
            <text className='multiplication-skip-count-value' x={x - 6} y='68'>{value}</text>
          </g>
        );
      })}
      <text className='multiplication-skip-count-label' x='18' y='126'>×3</text>
      <line className='multiplication-skip-count-line' x1={tripleStart} x2={tripleStart + tripleStep * (triples.length - 1)} y1='120' y2='120' />
      {triples.map((value, index) => {
        const x = tripleStart + tripleStep * index;
        return (
          <g key={`triple-${value}`}>
            <line className='multiplication-skip-count-tick' x1={x} x2={x} y1='114' y2='126' />
            <circle className='multiplication-skip-count-hop multiplication-skip-count-three' cx={x} cy='120' r='6' style={{ animationDelay: `${index * 0.45}s` }} />
            <text className='multiplication-skip-count-value' x={x - 6} y='140'>{value}</text>
          </g>
        );
      })}
    </svg>
  );
}

export function MultiplicationDoubleDoubleAnimation(): React.JSX.Element {
  const surfaceIds = useMathSurfaceIds('multiplication-double-double');

  return (
    <svg
      aria-label='Animacja mnożenia: razy 4 to podwójnie i jeszcze raz podwójnie.'
      className='h-auto w-full'
      data-testid='multiplication-double-double-animation'
      role='img'
      viewBox='0 0 360 150'
    >
      <style>{`
        .multiplication-double-double-frame {
          fill: rgba(255,255,255,0.74);
          stroke: rgba(148,163,184,0.26);
          stroke-width: 2;
        }
        .multiplication-double-double-frame-a { animation: multiplicationDoubleDoubleFrame 6s ease-in-out infinite; }
        .multiplication-double-double-frame-b { animation-delay: 2s; }
        .multiplication-double-double-frame-c { animation-delay: 4s; }
        .multiplication-double-double-dot-a { fill: #fb7185; }
        .multiplication-double-double-dot-b { fill: #38bdf8; }
        .multiplication-double-double-dot-c { fill: #22c55e; }
        @keyframes multiplicationDoubleDoubleFrame {
          0%, 60%, 100% { stroke: rgba(148,163,184,0.26); }
          20%, 40% { stroke: #f97316; }
        }
        @media (prefers-reduced-motion: reduce) {
          .multiplication-double-double-frame-a,
          .multiplication-double-double-frame-b,
          .multiplication-double-double-frame-c { animation: none; }
        }
      `}</style>
      <MathSurface
        accentEnd='#ffedd5'
        accentStart='#fb923c'
        atmosphereA='rgba(251, 146, 60, 0.08)'
        atmosphereB='rgba(34, 197, 94, 0.08)'
        ids={surfaceIds}
        stroke='rgba(251, 146, 60, 0.12)'
        testIdPrefix='multiplication-double-double'
        x={12}
        y={12}
        width={336}
        height={126}
        rx={24}
      />
      <rect className='multiplication-double-double-frame multiplication-double-double-frame-a' height='88' rx='16' width='90' x='20' y='34' />
      <rect className='multiplication-double-double-frame multiplication-double-double-frame-b' height='88' rx='16' width='90' x='135' y='34' />
      <rect className='multiplication-double-double-frame multiplication-double-double-frame-c' height='88' rx='16' width='90' x='250' y='34' />
      {[0, 1, 2].map((index) => <circle key={`a-${index}`} className='multiplication-double-double-dot-a' cx={45 + index * 22} cy='78' r='6' />)}
      {[0, 1].map((row) =>
        [0, 1, 2].map((col) => (
          <circle key={`b-${row}-${col}`} className='multiplication-double-double-dot-b' cx={160 + col * 22} cy={64 + row * 20} r='5.5' />
        ))
      )}
      {[0, 1, 2].map((row) =>
        [0, 1, 2, 3].map((col) => (
          <circle key={`c-${row}-${col}`} className='multiplication-double-double-dot-c' cx={266 + col * 16} cy={58 + row * 20} r='5' />
        ))
      )}
      <g fill='none' stroke='#94a3b8' strokeLinecap='round' strokeWidth='4'>
        <line x1='112' x2='132' y1='78' y2='78' />
        <polyline points='124,70 134,78 124,86' />
        <line x1='227' x2='247' y1='78' y2='78' />
        <polyline points='239,70 249,78 239,86' />
      </g>
    </svg>
  );
}

export function MultiplicationFiveRhythmAnimation(): React.JSX.Element {
  const surfaceIds = useMathSurfaceIds('multiplication-five-rhythm');
  const values = [5, 10, 15, 20, 25];
  const startX = 50;
  const step = 55;

  return (
    <svg
      aria-label='Animacja mnożenia: piątki rosną w rytmie 5, 10, 15, 20, 25.'
      className='h-auto w-full'
      data-testid='multiplication-five-rhythm-animation'
      role='img'
      viewBox='0 0 360 150'
    >
      <style>{`
        .multiplication-five-rhythm-star { fill: #fbbf24; }
        .multiplication-five-rhythm-pulse {
          fill: none;
          stroke: #f59e0b;
          stroke-width: 2;
          opacity: 0.2;
          animation: multiplicationFiveRhythmPulse 3.6s ease-in-out infinite;
        }
        .multiplication-five-rhythm-label { fill: #0f172a; font-size: 12px; font-weight: 700; }
        .multiplication-five-rhythm-value { fill: #64748b; font-size: 11px; font-weight: 600; }
        @keyframes multiplicationFiveRhythmPulse {
          0%, 100% { opacity: 0.2; transform: scale(0.9); }
          50% { opacity: 0.9; transform: scale(1.05); }
        }
        @media (prefers-reduced-motion: reduce) {
          .multiplication-five-rhythm-pulse { animation: none; opacity: 0.6; }
        }
      `}</style>
      <MathSurface
        accentEnd='#fef3c7'
        accentStart='#f59e0b'
        atmosphereA='rgba(245, 158, 11, 0.08)'
        atmosphereB='rgba(251, 191, 36, 0.08)'
        ids={surfaceIds}
        stroke='rgba(245, 158, 11, 0.12)'
        testIdPrefix='multiplication-five-rhythm'
        x={12}
        y={12}
        width={336}
        height={126}
        rx={24}
      />
      <text className='multiplication-five-rhythm-label' x='16' y='44'>×5</text>
      {values.map((value, index) => {
        const x = startX + step * index;
        return (
          <g key={`five-${value}`}>
            <circle className='multiplication-five-rhythm-pulse' cx={x} cy='72' r='16' style={{ animationDelay: `${index * 0.5}s` }} />
            <polygon className='multiplication-five-rhythm-star' points={`${x},56 ${x + 4},68 ${x + 16},68 ${x + 6},76 ${x + 10},88 ${x},80 ${x - 10},88 ${x - 6},76 ${x - 16},68 ${x - 4},68`} />
            <text className='multiplication-five-rhythm-value' x={x - 8} y='112'>{value}</text>
          </g>
        );
      })}
    </svg>
  );
}

export function MultiplicationTenShiftAnimation(): React.JSX.Element {
  const surfaceIds = useMathSurfaceIds('multiplication-ten-shift');

  return (
    <svg
      aria-label='Animacja mnożenia: razy 10 dodaje zero na końcu.'
      className='h-auto w-full'
      data-testid='multiplication-ten-shift-animation'
      role='img'
      viewBox='0 0 360 150'
    >
      <style>{`
        .multiplication-ten-shift-base { fill: #0f172a; font-size: 36px; font-weight: 800; }
        .multiplication-ten-shift-result { fill: #0f172a; font-size: 36px; font-weight: 800; }
        .multiplication-ten-shift-zero {
          fill: #f97316;
          font-size: 36px;
          font-weight: 800;
          animation: multiplicationTenShiftZero 4.5s ease-in-out infinite;
        }
        .multiplication-ten-shift-arrow { animation: multiplicationTenShiftArrow 4.5s ease-in-out infinite; }
        @keyframes multiplicationTenShiftZero {
          0%, 35% { opacity: 0.2; transform: translateX(-18px); }
          55%, 100% { opacity: 1; transform: translateX(0); }
        }
        @keyframes multiplicationTenShiftArrow {
          0%, 35% { opacity: 0.3; }
          55%, 100% { opacity: 1; }
        }
        @media (prefers-reduced-motion: reduce) {
          .multiplication-ten-shift-zero,
          .multiplication-ten-shift-arrow { animation: none; opacity: 1; }
        }
      `}</style>
      <MathSurface
        accentEnd='#ffedd5'
        accentStart='#fb923c'
        atmosphereA='rgba(251, 146, 60, 0.08)'
        atmosphereB='rgba(96, 165, 250, 0.08)'
        ids={surfaceIds}
        stroke='rgba(251, 146, 60, 0.12)'
        testIdPrefix='multiplication-ten-shift'
        x={12}
        y={12}
        width={336}
        height={126}
        rx={24}
      />
      <text className='multiplication-ten-shift-base' x='62' y='86'>8</text>
      <text className='multiplication-ten-shift-result' x='230' y='86'>8</text>
      <text className='multiplication-ten-shift-zero' x='252' y='86'>0</text>
      <g className='multiplication-ten-shift-arrow' fill='none' stroke='#94a3b8' strokeLinecap='round' strokeWidth='4'>
        <line x1='98' x2='190' y1='74' y2='74' />
        <polyline points='178,66 192,74 178,82' />
      </g>
      <text fill='#64748b' fontSize='12' fontWeight='700' x='48' y='40'>×10</text>
      <text fill='#64748b' fontSize='12' fontWeight='700' x='206' y='40'>dopisz 0</text>
    </svg>
  );
}

export function MultiplicationGamePreviewAnimation(): React.JSX.Element {
  const surfaceIds = useMathSurfaceIds('multiplication-game-preview');

  return (
    <svg
      aria-label='Animacja gry: zaznaczaj grupy kropek, aby zobaczyć mnożenie.'
      className='h-auto w-full'
      data-testid='multiplication-game-preview-animation'
      role='img'
      viewBox='0 0 360 150'
    >
      <style>{`
        .multiplication-game-preview-dot { fill: #a855f7; }
        .multiplication-game-preview-focus {
          fill: rgba(167, 139, 250, 0.18);
          stroke: #8b5cf6;
          stroke-width: 2;
          animation: multiplicationGamePreviewFocus 4.8s ease-in-out infinite;
        }
        @keyframes multiplicationGamePreviewFocus {
          0%, 25% { transform: translate(0, 0); }
          45%, 70% { transform: translate(0, 28px); }
          85%, 100% { transform: translate(0, 56px); }
        }
        @media (prefers-reduced-motion: reduce) {
          .multiplication-game-preview-focus { animation: none; }
        }
      `}</style>
      <MathSurface
        accentEnd='#ede9fe'
        accentStart='#8b5cf6'
        atmosphereA='rgba(139, 92, 246, 0.08)'
        atmosphereB='rgba(167, 139, 250, 0.08)'
        ids={surfaceIds}
        stroke='rgba(139, 92, 246, 0.12)'
        testIdPrefix='multiplication-game-preview'
        x={12}
        y={12}
        width={336}
        height={126}
        rx={24}
      />
      <rect fill='rgba(255,255,255,0.72)' height='96' rx='18' stroke='rgba(148,163,184,0.28)' strokeDasharray='6 6' width='200' x='72' y='32' />
      <rect className='multiplication-game-preview-focus' height='24' rx='10' width='160' x='92' y='46' />
      {[0, 1, 2].map((row) =>
        [0, 1, 2, 3].map((col) => (
          <circle key={`game-${row}-${col}`} className='multiplication-game-preview-dot' cx={112 + col * 40} cy={58 + row * 28} r='7' />
        ))
      )}
    </svg>
  );
}
