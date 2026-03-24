import React, { useId } from 'react';

type GeometrySurfaceIds = {
  clipId: string;
  frameGradientId: string;
  panelGradientId: string;
};

type GeometrySurfaceProps = {
  accentEnd: string;
  accentStart: string;
  atmosphereA: string;
  atmosphereB: string;
  ids: GeometrySurfaceIds;
  stroke: string;
  testIdPrefix: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rx: number;
};

function useGeometrySurfaceIds(prefix: string): GeometrySurfaceIds {
  const baseId = useId().replace(/:/g, '');

  return {
    clipId: `${prefix}-${baseId}-clip`,
    frameGradientId: `${prefix}-${baseId}-frame`,
    panelGradientId: `${prefix}-${baseId}-panel`,
  };
}

function GeometrySurface({
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
}: GeometrySurfaceProps): React.JSX.Element {
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

function GeometryLabel({
  fill,
  text,
  textColor,
  width,
  x,
  y,
}: {
  fill: string;
  text: string;
  textColor: string;
  width: number;
  x: number;
  y: number;
}): React.JSX.Element {
  return (
    <g>
      <rect x={x} y={y} width={width} height='22' rx='11' fill={fill} />
      <text
        fill={textColor}
        fontSize='11'
        fontWeight='700'
        textAnchor='middle'
        x={x + width / 2}
        y={y + 15}
      >
        {text}
      </text>
    </g>
  );
}

export function GeometryPointSegmentAnimation(): React.JSX.Element {
  const surfaceIds = useGeometrySurfaceIds('geometry-point-segment');

  return (
    <svg
      aria-label='Animacja: punkt i odcinek.'
      className='h-auto w-full'
      data-testid='geometry-point-segment-animation'
      role='img'
      viewBox='0 0 320 126'
    >
      <style>{`
        .dot { fill: #22d3ee; }
        .dotA { animation: dotPop 4.2s ease-in-out infinite; }
        .dotB { animation: dotPop 4.2s ease-in-out infinite 0.5s; }
        .label {
          fill: #0891b2;
          font-size: 12px;
          font-weight: 700;
          opacity: 0;
          animation: labelFade 4.2s ease-in-out infinite 0.9s;
        }
        .segment-label {
          fill: #0e7490;
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 0.02em;
          opacity: 0;
          animation: labelSegment 4.8s ease-in-out infinite 1.9s;
        }
        .segment-pill {
          fill: #cffafe;
          opacity: 0;
          animation: labelSegment 4.8s ease-in-out infinite 1.9s;
        }
        .line {
          stroke: #06b6d4;
          stroke-width: 5;
          stroke-linecap: round;
          stroke-dasharray: 180;
          stroke-dashoffset: 180;
          animation: draw 4.8s ease-in-out infinite 0.9s;
        }
        .glow {
          stroke: #67e8f9;
          stroke-width: 10;
          stroke-linecap: round;
          opacity: 0;
          animation: glow 4.8s ease-in-out infinite 1.8s;
        }
        @keyframes draw {
          0%, 32% { stroke-dashoffset: 180; }
          60%, 100% { stroke-dashoffset: 0; }
        }
        @keyframes dotPop {
          0%, 10% { transform: scale(0.2); opacity: 0; }
          22%, 100% { transform: scale(1); opacity: 1; }
        }
        @keyframes labelFade {
          0%, 28% { opacity: 0; }
          40%, 100% { opacity: 1; }
        }
        @keyframes labelSegment {
          0%, 46% { opacity: 0; }
          62%, 100% { opacity: 1; }
        }
        @keyframes glow {
          0%, 38% { opacity: 0; }
          56% { opacity: 0.45; }
          100% { opacity: 0; }
        }
        @media (prefers-reduced-motion: reduce) {
          .line { animation: none; stroke-dashoffset: 0; }
          .glow { animation: none; opacity: 0.2; }
          .dotA, .dotB { animation: none; opacity: 1; transform: scale(1); }
          .label { animation: none; opacity: 1; }
          .segment-label, .segment-pill { animation: none; opacity: 1; }
        }
      `}</style>
      <GeometrySurface
        accentEnd='#ecfeff'
        accentStart='#06b6d4'
        atmosphereA='rgba(34, 211, 238, 0.08)'
        atmosphereB='rgba(103, 232, 249, 0.08)'
        ids={surfaceIds}
        stroke='rgba(6, 182, 212, 0.12)'
        testIdPrefix='geometry-point-segment'
        x={12}
        y={12}
        width={296}
        height={102}
        rx={22}
      />
      <line className='glow' x1='70' x2='250' y1='60' y2='60' />
      <line className='line' x1='70' x2='250' y1='60' y2='60' />
      <circle className='dot dotA' cx='70' cy='60' r='8' />
      <circle className='dot dotB' cx='250' cy='60' r='8' />
      <rect className='segment-pill' x='114' y='28' width='92' height='20' rx='10' />
      <text className='segment-label' x='160' y='42' textAnchor='middle'>Odcinek AB</text>
      <text className='label' x='50' y='85'>A</text>
      <text className='label' x='255' y='85'>B</text>
    </svg>
  );
}

export function GeometryVerticesAnimation(): React.JSX.Element {
  const surfaceIds = useGeometrySurfaceIds('geometry-vertices');

  return (
    <svg
      aria-label='Animacja: wierzchołki wielokąta.'
      className='h-auto w-full'
      data-testid='geometry-vertices-animation'
      role='img'
      viewBox='0 0 240 166'
    >
      <style>{`
        .edge { fill: rgba(224, 242, 254, 0.4); stroke: #22d3ee; stroke-width: 6; }
        .vertex {
          fill: #0ea5e9;
          animation: vertexPulse 2.8s ease-in-out infinite;
        }
        .v2 { animation-delay: 0.7s; }
        .v3 { animation-delay: 1.4s; }
        .v4 { animation-delay: 2.1s; }
        @keyframes vertexPulse {
          0%, 100% { transform: scale(1); opacity: 0.7; }
          50% { transform: scale(1.2); opacity: 1; }
        }
        @media (prefers-reduced-motion: reduce) {
          .vertex { animation: none; opacity: 1; }
        }
      `}</style>
      <GeometrySurface
        accentEnd='#ecfeff'
        accentStart='#0ea5e9'
        atmosphereA='rgba(14, 165, 233, 0.08)'
        atmosphereB='rgba(34, 211, 238, 0.06)'
        ids={surfaceIds}
        stroke='rgba(14, 165, 233, 0.12)'
        testIdPrefix='geometry-vertices'
        x={12}
        y={12}
        width={216}
        height={142}
        rx={22}
      />
      <polygon className='edge' points='60,40 180,40 200,120 40,120' />
      <circle className='vertex' cx='60' cy='40' r='6' />
      <circle className='vertex v2' cx='180' cy='40' r='6' />
      <circle className='vertex v3' cx='200' cy='120' r='6' />
      <circle className='vertex v4' cx='40' cy='120' r='6' />
    </svg>
  );
}

export function GeometryAngleAnimation(): React.JSX.Element {
  const surfaceIds = useGeometrySurfaceIds('geometry-angle');

  return (
    <svg
      aria-label='Animacja: kąt otwiera się i zamyka.'
      className='h-auto w-full'
      data-testid='geometry-angle-animation'
      role='img'
      viewBox='0 0 240 166'
    >
      <style>{`
        .ray { stroke: #0ea5e9; stroke-width: 6; stroke-linecap: round; }
        .moving {
          transform-origin: 120px 90px;
          animation: swing 3.2s ease-in-out infinite;
        }
        .arc {
          fill: rgba(14, 165, 233, 0.12);
          stroke: rgba(14, 165, 233, 0.26);
          stroke-width: 2;
        }
        @keyframes swing {
          0%, 100% { transform: rotate(10deg); }
          50% { transform: rotate(80deg); }
        }
        @media (prefers-reduced-motion: reduce) {
          .moving { animation: none; transform: rotate(60deg); }
        }
      `}</style>
      <GeometrySurface
        accentEnd='#ecfeff'
        accentStart='#0ea5e9'
        atmosphereA='rgba(14, 165, 233, 0.08)'
        atmosphereB='rgba(34, 211, 238, 0.06)'
        ids={surfaceIds}
        stroke='rgba(14, 165, 233, 0.12)'
        testIdPrefix='geometry-angle'
        x={12}
        y={12}
        width={216}
        height={142}
        rx={22}
      />
      <path className='arc' d='M120 90 L70 90 A50 50 0 0 1 104 43 Z' />
      <line className='ray' x1='120' x2='40' y1='90' y2='90' />
      <line className='ray moving' x1='120' x2='120' y1='90' y2='20' />
      <circle cx='120' cy='90' r='6' fill='#0ea5e9' />
    </svg>
  );
}

export function GeometryRightAngleAnimation(): React.JSX.Element {
  const surfaceIds = useGeometrySurfaceIds('geometry-right-angle');

  return (
    <svg
      aria-label='Animacja: kąt prosty.'
      className='h-auto w-full'
      data-testid='geometry-right-angle-animation'
      role='img'
      viewBox='0 0 240 166'
    >
      <style>{`
        .ray { stroke: #0ea5e9; stroke-width: 6; stroke-linecap: round; }
        .marker {
          fill: rgba(14, 165, 233, 0.12);
          stroke: #0ea5e9;
          stroke-width: 4;
          opacity: 0.6;
          animation: markerPulse 2.8s ease-in-out infinite;
        }
        .dot {
          fill: #0ea5e9;
          opacity: 0.7;
          animation: dotPulse 2.8s ease-in-out infinite;
        }
        @keyframes markerPulse {
          0%, 100% { opacity: 0.55; }
          50% { opacity: 1; }
        }
        @keyframes dotPulse {
          0%, 100% { opacity: 0.6; }
          50% { opacity: 1; }
        }
        @media (prefers-reduced-motion: reduce) {
          .marker, .dot { animation: none; opacity: 1; }
        }
      `}</style>
      <GeometrySurface
        accentEnd='#ecfeff'
        accentStart='#0ea5e9'
        atmosphereA='rgba(14, 165, 233, 0.08)'
        atmosphereB='rgba(34, 211, 238, 0.06)'
        ids={surfaceIds}
        stroke='rgba(14, 165, 233, 0.12)'
        testIdPrefix='geometry-right-angle'
        x={12}
        y={12}
        width={216}
        height={142}
        rx={22}
      />
      <line className='ray' x1='120' x2='40' y1='90' y2='90' />
      <line className='ray' x1='120' x2='120' y1='90' y2='20' />
      <rect className='marker' height='20' width='20' x='100' y='70' />
      <circle className='dot' cx='120' cy='90' r='6' />
    </svg>
  );
}

export function GeometryMovingPointAnimation(): React.JSX.Element {
  const surfaceIds = useGeometrySurfaceIds('geometry-moving-point');

  return (
    <svg
      aria-label='Animacja: punkt przesuwa się po odcinku.'
      className='h-auto w-full'
      data-testid='geometry-moving-point-animation'
      role='img'
      viewBox='0 0 320 126'
    >
      <style>{`
        .track { stroke: rgba(6, 182, 212, 0.2); stroke-width: 10; stroke-linecap: round; }
        .line { stroke: #06b6d4; stroke-width: 5; stroke-linecap: round; }
        .walker {
          animation: walk 3.2s ease-in-out infinite;
          transform-origin: center;
        }
        .dot { fill: #22d3ee; }
        @keyframes walk {
          0%, 100% { transform: translateX(0); }
          50% { transform: translateX(160px); }
        }
        @media (prefers-reduced-motion: reduce) {
          .walker { animation: none; transform: translateX(80px); }
        }
      `}</style>
      <GeometrySurface
        accentEnd='#ecfeff'
        accentStart='#06b6d4'
        atmosphereA='rgba(34, 211, 238, 0.08)'
        atmosphereB='rgba(103, 232, 249, 0.06)'
        ids={surfaceIds}
        stroke='rgba(6, 182, 212, 0.12)'
        testIdPrefix='geometry-moving-point'
        x={12}
        y={12}
        width={296}
        height={102}
        rx={22}
      />
      <line className='track' x1='60' x2='260' y1='60' y2='60' />
      <line className='line' x1='60' x2='260' y1='60' y2='60' />
      <g className='walker'>
        <circle className='dot' cx='60' cy='60' r='8' />
      </g>
    </svg>
  );
}

export function GeometrySideHighlightAnimation(): React.JSX.Element {
  const surfaceIds = useGeometrySurfaceIds('geometry-side-highlight');

  return (
    <svg
      aria-label='Animacja: kolejne boki figury są podświetlane.'
      className='h-auto w-full'
      data-testid='geometry-side-highlight-animation'
      role='img'
      viewBox='0 0 240 166'
    >
      <style>{`
        .base { fill: rgba(186, 230, 253, 0.32); stroke: #bae6fd; stroke-width: 6; }
        .side { fill: none; stroke: #0ea5e9; stroke-width: 6; opacity: 0.3; }
        .s1 { animation: glow 3.2s ease-in-out infinite; }
        .s2 { animation: glow 3.2s ease-in-out infinite 0.8s; }
        .s3 { animation: glow 3.2s ease-in-out infinite 1.6s; }
        .s4 { animation: glow 3.2s ease-in-out infinite 2.4s; }
        @keyframes glow {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 1; }
        }
        @media (prefers-reduced-motion: reduce) {
          .side { animation: none; opacity: 1; }
        }
      `}</style>
      <GeometrySurface
        accentEnd='#ecfeff'
        accentStart='#0ea5e9'
        atmosphereA='rgba(14, 165, 233, 0.08)'
        atmosphereB='rgba(34, 211, 238, 0.06)'
        ids={surfaceIds}
        stroke='rgba(14, 165, 233, 0.12)'
        testIdPrefix='geometry-side-highlight'
        x={12}
        y={12}
        width={216}
        height={142}
        rx={22}
      />
      <rect className='base' x='50' y='40' width='140' height='80' rx='8' />
      <line className='side s1' x1='50' y1='40' x2='190' y2='40' />
      <line className='side s2' x1='190' y1='40' x2='190' y2='120' />
      <line className='side s3' x1='190' y1='120' x2='50' y2='120' />
      <line className='side s4' x1='50' y1='120' x2='50' y2='40' />
    </svg>
  );
}

export function GeometryAngleTypesAnimation(): React.JSX.Element {
  const surfaceIds = useGeometrySurfaceIds('geometry-angle-types');

  return (
    <svg
      aria-label='Animacja: różne rodzaje kątów.'
      className='h-auto w-full'
      data-testid='geometry-angle-types-animation'
      role='img'
      viewBox='0 0 320 146'
    >
      <style>{`
        .ray { stroke: #0ea5e9; stroke-width: 5; stroke-linecap: round; }
        .group { animation: pop 3.6s ease-in-out infinite; opacity: 0.4; }
        .g2 { animation-delay: 1.2s; }
        .g3 { animation-delay: 2.4s; }
        @keyframes pop {
          0%, 100% { opacity: 0.4; transform: scale(0.95); }
          50% { opacity: 1; transform: scale(1); }
        }
        @media (prefers-reduced-motion: reduce) {
          .group { animation: none; opacity: 1; }
        }
      `}</style>
      <GeometrySurface
        accentEnd='#ecfeff'
        accentStart='#0ea5e9'
        atmosphereA='rgba(14, 165, 233, 0.08)'
        atmosphereB='rgba(34, 211, 238, 0.06)'
        ids={surfaceIds}
        stroke='rgba(14, 165, 233, 0.12)'
        testIdPrefix='geometry-angle-types'
        x={12}
        y={12}
        width={296}
        height={122}
        rx={22}
      />
      <g className='group'>
        <line className='ray' x1='40' y1='100' x2='80' y2='100' />
        <line className='ray' x1='40' y1='100' x2='70' y2='70' />
        <text fill='#0891b2' fontSize='10' fontWeight='700' x='35' y='118'>ostry</text>
      </g>
      <g className='group g2'>
        <line className='ray' x1='140' y1='100' x2='180' y2='100' />
        <line className='ray' x1='140' y1='100' x2='140' y2='60' />
        <text fill='#0891b2' fontSize='10' fontWeight='700' x='132' y='118'>prosty</text>
      </g>
      <g className='group g3'>
        <line className='ray' x1='240' y1='100' x2='280' y2='100' />
        <line className='ray' x1='240' y1='100' x2='290' y2='70' />
        <text fill='#0891b2' fontSize='10' fontWeight='700' x='228' y='118'>rozwarty</text>
      </g>
    </svg>
  );
}

export function GeometryPerimeterTraceAnimation(): React.JSX.Element {
  const surfaceIds = useGeometrySurfaceIds('geometry-perimeter-trace');

  return (
    <svg
      aria-label='Animacja: obwód figury jest liczony dookoła.'
      className='h-auto w-full'
      data-testid='geometry-perimeter-trace-animation'
      role='img'
      viewBox='0 0 260 166'
    >
      <style>{`
        .base { fill: rgba(254, 243, 199, 0.45); stroke: rgba(245, 158, 11, 0.18); stroke-width: 6; }
        .trace {
          fill: none;
          stroke: #f59e0b;
          stroke-width: 6;
          stroke-linecap: round;
          stroke-dasharray: 480;
          stroke-dashoffset: 480;
          animation: trace 3.8s ease-in-out infinite;
        }
        @keyframes trace {
          0%, 20% { stroke-dashoffset: 480; }
          70%, 100% { stroke-dashoffset: 0; }
        }
        @media (prefers-reduced-motion: reduce) {
          .trace { animation: none; stroke-dashoffset: 0; }
        }
      `}</style>
      <GeometrySurface
        accentEnd='#fff7ed'
        accentStart='#f59e0b'
        atmosphereA='rgba(245, 158, 11, 0.08)'
        atmosphereB='rgba(251, 191, 36, 0.06)'
        ids={surfaceIds}
        stroke='rgba(245, 158, 11, 0.12)'
        testIdPrefix='geometry-perimeter-trace'
        x={12}
        y={12}
        width={236}
        height={142}
        rx={22}
      />
      <rect className='base' height='80' rx='10' width='160' x='50' y='40' />
      <rect className='trace' height='80' rx='10' width='160' x='50' y='40' />
    </svg>
  );
}

export function GeometryPerimeterOppositeSidesAnimation(): React.JSX.Element {
  const surfaceIds = useGeometrySurfaceIds('geometry-perimeter-opposite-sides');

  return (
    <svg
      aria-label='Animacja: przeciwległe boki mają tę samą długość.'
      className='h-auto w-full'
      data-testid='geometry-perimeter-opposite-sides-animation'
      role='img'
      viewBox='0 0 260 166'
    >
      <style>{`
        .pair-a {
          stroke: #0ea5e9;
          stroke-width: 6;
          stroke-linecap: round;
          opacity: 0.2;
          animation: pairGlow 4.6s ease-in-out infinite;
        }
        .pair-b {
          stroke: #f59e0b;
          stroke-width: 6;
          stroke-linecap: round;
          opacity: 0.2;
          animation: pairGlow 4.6s ease-in-out infinite 2.3s;
        }
        .label { font: 700 12px/1.1 system-ui, sans-serif; fill: #334155; }
        @keyframes pairGlow {
          0%, 20% { opacity: 0.2; }
          50%, 80% { opacity: 1; }
          100% { opacity: 0.2; }
        }
        @media (prefers-reduced-motion: reduce) {
          .pair-a, .pair-b { animation: none; opacity: 1; }
        }
      `}</style>
      <GeometrySurface
        accentEnd='#fff7ed'
        accentStart='#f59e0b'
        atmosphereA='rgba(245, 158, 11, 0.08)'
        atmosphereB='rgba(14, 165, 233, 0.06)'
        ids={surfaceIds}
        stroke='rgba(245, 158, 11, 0.12)'
        testIdPrefix='geometry-perimeter-opposite-sides'
        x={12}
        y={12}
        width={236}
        height={142}
        rx={22}
      />
      <line className='pair-a' x1='50' y1='40' x2='210' y2='40' />
      <line className='pair-a' x1='50' y1='120' x2='210' y2='120' />
      <line className='pair-b' x1='50' y1='40' x2='50' y2='120' />
      <line className='pair-b' x1='210' y1='40' x2='210' y2='120' />
      <text className='label' x='120' y='32'>a</text>
      <text className='label' x='120' y='142'>a</text>
      <text className='label' x='32' y='84'>b</text>
      <text className='label' x='222' y='84'>b</text>
    </svg>
  );
}

export function GeometryPerimeterSumAnimation(): React.JSX.Element {
  const surfaceIds = useGeometrySurfaceIds('geometry-perimeter-sum');

  return (
    <svg
      aria-label='Animacja: obwód to suma wszystkich boków.'
      className='h-auto w-full'
      data-testid='geometry-perimeter-sum-animation'
      role='img'
      viewBox='0 0 260 176'
    >
      <style>{`
        .base { fill: rgba(254, 230, 138, 0.28); stroke: #fde68a; stroke-width: 6; }
        .side {
          fill: none;
          stroke: #f59e0b;
          stroke-width: 6;
          stroke-linecap: round;
          opacity: 0.2;
          animation: sideGlow 4.8s ease-in-out infinite;
        }
        .s2 { animation-delay: 0.6s; }
        .s3 { animation-delay: 1.2s; }
        .s4 { animation-delay: 1.8s; }
        .sum {
          font: 700 12px/1.1 system-ui, sans-serif;
          fill: #92400e;
          opacity: 0.3;
          animation: sumReveal 4.8s ease-in-out infinite;
        }
        @keyframes sideGlow {
          0%, 20% { opacity: 0.2; }
          45%, 80% { opacity: 1; }
          100% { opacity: 0.2; }
        }
        @keyframes sumReveal {
          0%, 45% { opacity: 0.2; }
          70%, 100% { opacity: 1; }
        }
        @media (prefers-reduced-motion: reduce) {
          .side { animation: none; opacity: 1; }
          .sum { animation: none; opacity: 1; }
        }
      `}</style>
      <GeometrySurface
        accentEnd='#fff7ed'
        accentStart='#f59e0b'
        atmosphereA='rgba(245, 158, 11, 0.08)'
        atmosphereB='rgba(251, 191, 36, 0.06)'
        ids={surfaceIds}
        stroke='rgba(245, 158, 11, 0.12)'
        testIdPrefix='geometry-perimeter-sum'
        x={12}
        y={12}
        width={236}
        height={152}
        rx={22}
      />
      <rect className='base' height='80' rx='10' width='160' x='50' y='40' />
      <line className='side s1' x1='50' y1='40' x2='210' y2='40' />
      <line className='side s2' x1='210' y1='40' x2='210' y2='120' />
      <line className='side s3' x1='210' y1='120' x2='50' y2='120' />
      <line className='side s4' x1='50' y1='120' x2='50' y2='40' />
      <text className='sum' x='62' y='160'>O = 6 + 4 + 6 + 4 = 20</text>
    </svg>
  );
}

export function GeometryShapeBuildAnimation(): React.JSX.Element {
  const surfaceIds = useGeometrySurfaceIds('geometry-shape-build');

  return (
    <svg
      aria-label='Animacja: figura powstaje z odcinków.'
      className='h-auto w-full'
      data-testid='geometry-shape-build-animation'
      role='img'
      viewBox='0 0 240 166'
    >
      <style>{`
        .edge {
          stroke: #a855f7;
          stroke-width: 6;
          stroke-linecap: round;
          stroke-dasharray: 140;
          stroke-dashoffset: 140;
          animation: draw 4.2s ease-in-out infinite;
        }
        .e2 { animation-delay: 0.7s; }
        .e3 { animation-delay: 1.4s; }
        .e4 { animation-delay: 2.1s; }
        .node {
          fill: #c026d3;
          animation: nodePop 4.2s ease-in-out infinite;
        }
        .n2 { animation-delay: 0.7s; }
        .n3 { animation-delay: 1.4s; }
        .n4 { animation-delay: 2.1s; }
        @keyframes draw {
          0%, 15% { stroke-dashoffset: 140; }
          55%, 100% { stroke-dashoffset: 0; }
        }
        @keyframes nodePop {
          0%, 20% { opacity: 0.3; transform: scale(0.9); }
          45%, 100% { opacity: 1; transform: scale(1); }
        }
        @media (prefers-reduced-motion: reduce) {
          .edge { animation: none; stroke-dashoffset: 0; }
          .node { animation: none; }
        }
      `}</style>
      <GeometrySurface
        accentEnd='#faf5ff'
        accentStart='#a855f7'
        atmosphereA='rgba(168, 85, 247, 0.08)'
        atmosphereB='rgba(217, 70, 239, 0.06)'
        ids={surfaceIds}
        stroke='rgba(168, 85, 247, 0.12)'
        testIdPrefix='geometry-shape-build'
        x={12}
        y={12}
        width={216}
        height={142}
        rx={22}
      />
      <line className='edge e1' x1='60' x2='180' y1='40' y2='40' />
      <line className='edge e2' x1='180' x2='180' y1='40' y2='120' />
      <line className='edge e3' x1='180' x2='60' y1='120' y2='120' />
      <line className='edge e4' x1='60' x2='60' y1='120' y2='40' />
      <circle className='node n1' cx='60' cy='40' r='6' />
      <circle className='node n2' cx='180' cy='40' r='6' />
      <circle className='node n3' cx='180' cy='120' r='6' />
      <circle className='node n4' cx='60' cy='120' r='6' />
    </svg>
  );
}

export function GeometryShapeFillAnimation(): React.JSX.Element {
  const surfaceIds = useGeometrySurfaceIds('geometry-shape-fill');

  return (
    <svg
      aria-label='Animacja: wnętrze figury jest wypełnione.'
      className='h-auto w-full'
      data-testid='geometry-shape-fill-animation'
      role='img'
      viewBox='0 0 240 166'
    >
      <style>{`
        .outline { fill: none; stroke: #a855f7; stroke-width: 6; }
        .fill {
          fill: #f0abfc;
          opacity: 0.2;
          animation: fillPulse 3.6s ease-in-out infinite;
        }
        @keyframes fillPulse {
          0%, 100% { opacity: 0.2; }
          50% { opacity: 0.7; }
        }
        @media (prefers-reduced-motion: reduce) {
          .fill { animation: none; opacity: 0.5; }
        }
      `}</style>
      <GeometrySurface
        accentEnd='#faf5ff'
        accentStart='#a855f7'
        atmosphereA='rgba(168, 85, 247, 0.08)'
        atmosphereB='rgba(217, 70, 239, 0.06)'
        ids={surfaceIds}
        stroke='rgba(168, 85, 247, 0.12)'
        testIdPrefix='geometry-shape-fill'
        x={12}
        y={12}
        width={216}
        height={142}
        rx={22}
      />
      <polygon className='fill' points='120,30 190,70 165,130 75,130 50,70' />
      <polygon className='outline' points='120,30 190,70 165,130 75,130 50,70' />
    </svg>
  );
}

export function GeometryShapesOrbitAnimation(): React.JSX.Element {
  const surfaceIds = useGeometrySurfaceIds('geometry-shapes-orbit');

  return (
    <svg
      aria-label='Animacja: figury poruszają się po okręgu.'
      className='h-auto w-full'
      data-testid='geometry-shapes-orbit-animation'
      role='img'
      viewBox='0 0 240 166'
    >
      <style>{`
        .orbit {
          transform-origin: 120px 80px;
          animation: spin 6s linear infinite;
        }
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @media (prefers-reduced-motion: reduce) {
          .orbit { animation: none; }
        }
      `}</style>
      <GeometrySurface
        accentEnd='#faf5ff'
        accentStart='#a855f7'
        atmosphereA='rgba(168, 85, 247, 0.08)'
        atmosphereB='rgba(236, 72, 153, 0.06)'
        ids={surfaceIds}
        stroke='rgba(168, 85, 247, 0.12)'
        testIdPrefix='geometry-shapes-orbit'
        x={12}
        y={12}
        width={216}
        height={142}
        rx={22}
      />
      <circle cx='120' cy='80' r='40' fill='none' stroke='#e2e8f0' strokeDasharray='4 6' />
      <g className='orbit'>
        <circle cx='120' cy='40' r='10' fill='#a855f7' />
        <rect x='170' y='70' width='16' height='16' rx='3' fill='#ec4899' />
        <polygon points='120,120 110,140 130,140' fill='#f97316' />
      </g>
    </svg>
  );
}

export function GeometrySymmetryFoldAnimation(): React.JSX.Element {
  const surfaceIds = useGeometrySurfaceIds('geometry-symmetry-fold');

  return (
    <svg
      aria-label='Animacja: symetria względem osi.'
      className='h-auto w-full'
      data-testid='geometry-symmetry-fold-animation'
      role='img'
      viewBox='0 0 260 166'
    >
      <style>{`
        .half {
          fill: #34d399;
          opacity: 0.8;
          animation: fold 3.6s ease-in-out infinite;
        }
        .mirror {
          fill: #34d399;
          opacity: 0.2;
          animation: mirror 3.6s ease-in-out infinite;
        }
        .axis { stroke: #10b981; stroke-width: 4; stroke-dasharray: 6 6; }
        @keyframes fold {
          0%, 100% { opacity: 0.9; }
          50% { opacity: 0.4; }
        }
        @keyframes mirror {
          0%, 100% { opacity: 0.2; }
          50% { opacity: 0.9; }
        }
        @media (prefers-reduced-motion: reduce) {
          .half, .mirror { animation: none; opacity: 0.8; }
        }
      `}</style>
      <GeometrySurface
        accentEnd='#ecfdf5'
        accentStart='#10b981'
        atmosphereA='rgba(16, 185, 129, 0.08)'
        atmosphereB='rgba(52, 211, 153, 0.06)'
        ids={surfaceIds}
        stroke='rgba(16, 185, 129, 0.12)'
        testIdPrefix='geometry-symmetry-fold'
        x={12}
        y={12}
        width={236}
        height={142}
        rx={22}
      />
      <rect className='half' height='70' rx='20' width='60' x='40' y='45' />
      <rect className='mirror' height='70' rx='20' width='60' x='160' y='45' />
      <line className='axis' x1='130' x2='130' y1='30' y2='130' />
    </svg>
  );
}

export function GeometrySymmetryAxesAnimation(): React.JSX.Element {
  const surfaceIds = useGeometrySurfaceIds('geometry-symmetry-axes');

  return (
    <svg
      aria-label='Animacja: figura ma wiele osi symetrii.'
      className='h-auto w-full'
      data-testid='geometry-symmetry-axes-animation'
      role='img'
      viewBox='0 0 240 166'
    >
      <style>{`
        .axis {
          stroke: #10b981;
          stroke-width: 4;
          stroke-dasharray: 6 6;
          animation: axisFade 3.6s ease-in-out infinite;
        }
        .axis-h { animation-delay: 1.8s; }
        .shape { fill: #34d399; opacity: 0.85; }
        @keyframes axisFade {
          0%, 100% { opacity: 0.2; }
          50% { opacity: 1; }
        }
        @media (prefers-reduced-motion: reduce) {
          .axis { animation: none; opacity: 1; }
        }
      `}</style>
      <GeometrySurface
        accentEnd='#ecfdf5'
        accentStart='#10b981'
        atmosphereA='rgba(16, 185, 129, 0.08)'
        atmosphereB='rgba(52, 211, 153, 0.06)'
        ids={surfaceIds}
        stroke='rgba(16, 185, 129, 0.12)'
        testIdPrefix='geometry-symmetry-axes'
        x={12}
        y={12}
        width={216}
        height={142}
        rx={22}
      />
      <circle className='shape' cx='120' cy='80' r='36' />
      <line className='axis' x1='120' x2='120' y1='30' y2='130' />
      <line className='axis axis-h' x1='70' x2='170' y1='80' y2='80' />
    </svg>
  );
}

export function GeometrySymmetryMirrorAnimation(): React.JSX.Element {
  const surfaceIds = useGeometrySurfaceIds('geometry-symmetry-mirror');

  return (
    <svg
      aria-label='Animacja: odbicie lustrzane po osi symetrii.'
      className='h-auto w-full'
      data-testid='geometry-symmetry-mirror-animation'
      role='img'
      viewBox='0 0 280 166'
    >
      <style>{`
        .axis { stroke: #10b981; stroke-width: 4; stroke-dasharray: 6 6; }
        .left { fill: #34d399; opacity: 0.9; }
        .right {
          fill: #34d399;
          opacity: 0.25;
          transform-origin: 140px 80px;
          animation: mirrorPulse 3.6s ease-in-out infinite;
        }
        @keyframes mirrorPulse {
          0%, 100% { opacity: 0.25; transform: translateX(10px); }
          50% { opacity: 0.9; transform: translateX(0); }
        }
        @media (prefers-reduced-motion: reduce) {
          .right { animation: none; opacity: 0.7; }
        }
      `}</style>
      <GeometrySurface
        accentEnd='#ecfdf5'
        accentStart='#10b981'
        atmosphereA='rgba(16, 185, 129, 0.08)'
        atmosphereB='rgba(52, 211, 153, 0.06)'
        ids={surfaceIds}
        stroke='rgba(16, 185, 129, 0.12)'
        testIdPrefix='geometry-symmetry-mirror'
        x={12}
        y={12}
        width={256}
        height={142}
        rx={22}
      />
      <line className='axis' x1='140' x2='140' y1='25' y2='135' />
      <path
        className='left'
        d='M70 110 C40 95, 40 55, 70 50 C80 32, 110 32, 120 50 C150 55, 150 95, 120 110 Z'
      />
      <g className='right'>
        <path
          d='M210 110 C240 95, 240 55, 210 50 C200 32, 170 32, 160 50 C130 55, 130 95, 160 110 Z'
        />
      </g>
    </svg>
  );
}

export function GeometrySymmetryRotationAnimation(): React.JSX.Element {
  const surfaceIds = useGeometrySurfaceIds('geometry-symmetry-rotation');

  return (
    <svg
      aria-label='Animacja: obrót figury zachowuje symetrię obrotową.'
      className='h-auto w-full'
      data-testid='geometry-symmetry-rotation-animation'
      role='img'
      viewBox='0 0 240 166'
    >
      <style>{`
        .shape {
          fill: #34d399;
          transform-origin: 120px 80px;
          animation: rotate 4.2s ease-in-out infinite;
        }
        .ring { fill: none; stroke: rgba(16, 185, 129, 0.22); stroke-width: 2; stroke-dasharray: 6 8; }
        @keyframes rotate {
          0%, 100% { transform: rotate(0deg); }
          50% { transform: rotate(90deg); }
        }
        @media (prefers-reduced-motion: reduce) {
          .shape { animation: none; }
        }
      `}</style>
      <GeometrySurface
        accentEnd='#ecfdf5'
        accentStart='#10b981'
        atmosphereA='rgba(16, 185, 129, 0.08)'
        atmosphereB='rgba(52, 211, 153, 0.06)'
        ids={surfaceIds}
        stroke='rgba(16, 185, 129, 0.12)'
        testIdPrefix='geometry-symmetry-rotation'
        x={12}
        y={12}
        width={216}
        height={142}
        rx={22}
      />
      <circle className='ring' cx='120' cy='80' r='46' />
      <rect className='shape' x='80' y='40' width='80' height='80' rx='10' />
    </svg>
  );
}

export function GeometrySymmetryCheckAnimation(): React.JSX.Element {
  const surfaceIds = useGeometrySurfaceIds('geometry-symmetry-check');

  return (
    <svg
      aria-label='Animacja: porównanie figury symetrycznej i niesymetrycznej.'
      className='h-auto w-full'
      data-testid='geometry-symmetry-check-animation'
      role='img'
      viewBox='0 0 320 146'
    >
      <style>{`
        .box { fill: rgba(255,255,255,0.72); stroke: #e2e8f0; stroke-width: 2; }
        .sym { fill: #34d399; opacity: 0.9; }
        .asym { fill: #fb7185; opacity: 0.85; }
        .check {
          stroke: #10b981;
          stroke-width: 5;
          stroke-linecap: round;
          stroke-linejoin: round;
          animation: checkPulse 3.4s ease-in-out infinite;
        }
        .cross {
          stroke: #e11d48;
          stroke-width: 5;
          stroke-linecap: round;
          animation: crossPulse 3.4s ease-in-out infinite 1.7s;
        }
        @keyframes checkPulse {
          0%, 100% { opacity: 0.4; }
          50% { opacity: 1; }
        }
        @keyframes crossPulse {
          0%, 100% { opacity: 0.4; }
          50% { opacity: 1; }
        }
        @media (prefers-reduced-motion: reduce) {
          .check, .cross { animation: none; opacity: 1; }
        }
      `}</style>
      <GeometrySurface
        accentEnd='#ecfdf5'
        accentStart='#10b981'
        atmosphereA='rgba(16, 185, 129, 0.06)'
        atmosphereB='rgba(244, 63, 94, 0.06)'
        ids={surfaceIds}
        stroke='rgba(148, 163, 184, 0.12)'
        testIdPrefix='geometry-symmetry-check'
        x={12}
        y={12}
        width={296}
        height={122}
        rx={22}
      />
      <rect className='box' x='30' y='25' width='110' height='90' rx='14' />
      <rect className='box' x='180' y='25' width='110' height='90' rx='14' />
      <path className='sym' d='M60 95 C45 80, 45 55, 60 50 C65 38, 80 38, 85 50 C100 55, 100 80, 85 95 Z' />
      <path className='sym' d='M110 95 C125 80, 125 55, 110 50 C105 38, 90 38, 85 50 C70 55, 70 80, 85 95 Z' />
      <path className='asym' d='M215 95 C200 80, 200 55, 215 50 C220 38, 235 38, 240 50 C255 55, 255 80, 240 95 Z' />
      <path className='asym' d='M260 95 C270 80, 270 60, 260 55 C255 45, 242 45, 236 55 C224 60, 224 80, 236 95 Z' />
      <path className='check' d='M60 120 L75 132 L105 102' />
      <line className='cross' x1='205' y1='120' x2='235' y2='132' />
      <line className='cross' x1='235' y1='120' x2='205' y2='132' />
    </svg>
  );
}

export function GeometryPerimeterSidesAnimation(): React.JSX.Element {
  const surfaceIds = useGeometrySurfaceIds('geometry-perimeter-sides');

  return (
    <svg
      aria-label='Animacja: boki a i b w prostokącie.'
      className='h-auto w-full'
      data-testid='geometry-perimeter-sides-animation'
      role='img'
      viewBox='0 0 260 166'
    >
      <style>{`
        .base { fill: rgba(254, 230, 138, 0.28); stroke: #fde68a; stroke-width: 6; }
        .side-a { stroke: #f59e0b; stroke-width: 6; opacity: 0.3; animation: glow 3.2s ease-in-out infinite; }
        .side-b { stroke: #fb7185; stroke-width: 6; opacity: 0.3; animation: glow 3.2s ease-in-out infinite 1.6s; }
        @keyframes glow {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 1; }
        }
        @media (prefers-reduced-motion: reduce) {
          .side-a, .side-b { animation: none; opacity: 1; }
        }
      `}</style>
      <GeometrySurface
        accentEnd='#fff7ed'
        accentStart='#f59e0b'
        atmosphereA='rgba(245, 158, 11, 0.08)'
        atmosphereB='rgba(251, 113, 133, 0.06)'
        ids={surfaceIds}
        stroke='rgba(245, 158, 11, 0.12)'
        testIdPrefix='geometry-perimeter-sides'
        x={12}
        y={12}
        width={236}
        height={142}
        rx={22}
      />
      <rect className='base' x='50' y='40' width='160' height='80' rx='10' />
      <line className='side-a' x1='50' y1='40' x2='210' y2='40' />
      <line className='side-a' x1='50' y1='120' x2='210' y2='120' />
      <line className='side-b' x1='50' y1='40' x2='50' y2='120' />
      <line className='side-b' x1='210' y1='40' x2='210' y2='120' />
      <text fill='#b45309' fontSize='12' fontWeight='700' x='120' y='32'>a</text>
      <text fill='#be123c' fontSize='12' fontWeight='700' x='220' y='85'>b</text>
    </svg>
  );
}

export function GeometryPolygonSidesAnimation(): React.JSX.Element {
  const surfaceIds = useGeometrySurfaceIds('geometry-polygon-sides');

  return (
    <svg
      aria-label='Animacja: więcej boków, bardziej złożona figura.'
      className='h-auto w-full'
      data-testid='geometry-polygon-sides-animation'
      role='img'
      viewBox='0 0 320 146'
    >
      <style>{`
        .shape { fill: rgba(168, 85, 247, 0.08); stroke: #a855f7; stroke-width: 5; opacity: 0.4; }
        .s1 { animation: pop 3.6s ease-in-out infinite; }
        .s2 { animation: pop 3.6s ease-in-out infinite 1.2s; }
        .s3 { animation: pop 3.6s ease-in-out infinite 2.4s; }
        @keyframes pop {
          0%, 100% { opacity: 0.4; transform: scale(0.95); }
          50% { opacity: 1; transform: scale(1); }
        }
        @media (prefers-reduced-motion: reduce) {
          .shape { animation: none; opacity: 1; }
        }
      `}</style>
      <GeometrySurface
        accentEnd='#faf5ff'
        accentStart='#a855f7'
        atmosphereA='rgba(168, 85, 247, 0.08)'
        atmosphereB='rgba(236, 72, 153, 0.06)'
        ids={surfaceIds}
        stroke='rgba(168, 85, 247, 0.12)'
        testIdPrefix='geometry-polygon-sides'
        x={12}
        y={12}
        width={296}
        height={122}
        rx={22}
      />
      <g className='shape s1'>
        <polygon points='60,95 80,55 100,95' />
        <text fill='#7c3aed' fontSize='10' fontWeight='700' x='70' y='112'>3</text>
      </g>
      <g className='shape s2'>
        <rect x='140' y='55' width='40' height='40' rx='6' />
        <text fill='#7c3aed' fontSize='10' fontWeight='700' x='156' y='112'>4</text>
      </g>
      <g className='shape s3'>
        <polygon points='240,50 265,65 255,95 225,95 215,65' />
        <text fill='#7c3aed' fontSize='10' fontWeight='700' x='238' y='112'>5</text>
      </g>
    </svg>
  );
}
