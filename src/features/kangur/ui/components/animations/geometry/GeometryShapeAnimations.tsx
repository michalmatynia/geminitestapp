'use client';

import React from 'react';
import { useGeometrySurfaceIds, GeometrySurface } from './GeometryAnimationSurface';

export function GeometryRightAngleAnimation(): React.JSX.Element {
  const surfaceIds = useGeometrySurfaceIds('geometry-right-angle');

  return (
    <svg aria-label='Animacja: kąt prosty.' className='h-auto w-full' data-testid='geometry-right-angle-animation' role='img' viewBox='0 0 240 166'>
      <style>{`
        .ray { stroke: #0ea5e9; stroke-width: 6; stroke-linecap: round; }
        .marker { fill: rgba(14, 165, 233, 0.12); stroke: #0ea5e9; stroke-width: 4; opacity: 0.6; animation: markerPulse 2.8s ease-in-out infinite; }
        .dot { fill: #0ea5e9; opacity: 0.7; animation: dotPulse 2.8s ease-in-out infinite; }
        @keyframes markerPulse { 0%, 100% { opacity: 0.55; } 50% { opacity: 1; } }
        @keyframes dotPulse { 0%, 100% { opacity: 0.6; } 50% { opacity: 1; } }
        @media (prefers-reduced-motion: reduce) { .marker, .dot { animation: none; opacity: 1; } }
      `}</style>
      <GeometrySurface accentEnd='#ecfeff' accentStart='#0ea5e9' atmosphereA='rgba(14, 165, 233, 0.08)' atmosphereB='rgba(34, 211, 238, 0.06)' ids={surfaceIds} stroke='rgba(14, 165, 233, 0.12)' testIdPrefix='geometry-right-angle' x={12} y={12} width={216} height={142} rx={22} />
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
    <svg aria-label='Animacja: punkt przesuwa się po odcinku.' className='h-auto w-full' data-testid='geometry-moving-point-animation' role='img' viewBox='0 0 320 126'>
      <style>{`
        .track { stroke: rgba(6, 182, 212, 0.2); stroke-width: 10; stroke-linecap: round; }
        .line { stroke: #06b6d4; stroke-width: 5; stroke-linecap: round; }
        .walker { animation: walk 3.2s ease-in-out infinite; transform-origin: center; }
        .dot { fill: #22d3ee; }
        @keyframes walk { 0%, 100% { transform: translateX(0); } 50% { transform: translateX(160px); } }
        @media (prefers-reduced-motion: reduce) { .walker { animation: none; transform: translateX(80px); } }
      `}</style>
      <GeometrySurface accentEnd='#ecfeff' accentStart='#06b6d4' atmosphereA='rgba(34, 211, 238, 0.08)' atmosphereB='rgba(103, 232, 249, 0.06)' ids={surfaceIds} stroke='rgba(6, 182, 212, 0.12)' testIdPrefix='geometry-moving-point' x={12} y={12} width={296} height={102} rx={22} />
      <line className='track' x1='60' x2='260' y1='60' y2='60' />
      <line className='line' x1='60' x2='260' y1='60' y2='60' />
      <g className='walker'><circle className='dot' cx='60' cy='60' r='8' /></g>
    </svg>
  );
}

export function GeometrySideHighlightAnimation(): React.JSX.Element {
  const surfaceIds = useGeometrySurfaceIds('geometry-side-highlight');

  return (
    <svg aria-label='Animacja: kolejne boki figury są podświetlane.' className='h-auto w-full' data-testid='geometry-side-highlight-animation' role='img' viewBox='0 0 240 166'>
      <style>{`
        .base { fill: rgba(186, 230, 253, 0.32); stroke: #bae6fd; stroke-width: 6; }
        .side { fill: none; stroke: #0ea5e9; stroke-width: 6; opacity: 0.3; }
        .s1 { animation: glow 3.2s ease-in-out infinite; }
        .s2 { animation: glow 3.2s ease-in-out infinite 0.8s; }
        .s3 { animation: glow 3.2s ease-in-out infinite 1.6s; }
        .s4 { animation: glow 3.2s ease-in-out infinite 2.4s; }
        @keyframes glow { 0%, 100% { opacity: 0.3; } 50% { opacity: 1; } }
        @media (prefers-reduced-motion: reduce) { .side { animation: none; opacity: 1; } }
      `}</style>
      <GeometrySurface accentEnd='#ecfeff' accentStart='#0ea5e9' atmosphereA='rgba(14, 165, 233, 0.08)' atmosphereB='rgba(34, 211, 238, 0.06)' ids={surfaceIds} stroke='rgba(14, 165, 233, 0.12)' testIdPrefix='geometry-side-highlight' x={12} y={12} width={216} height={142} rx={22} />
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
    <svg aria-label='Animacja: różne rodzaje kątów.' className='h-auto w-full' data-testid='geometry-angle-types-animation' role='img' viewBox='0 0 320 146'>
      <style>{`
        .ray { stroke: #0ea5e9; stroke-width: 5; stroke-linecap: round; }
        .group { animation: pop 3.6s ease-in-out infinite; opacity: 0.4; }
        .g2 { animation-delay: 1.2s; } .g3 { animation-delay: 2.4s; }
        @keyframes pop { 0%, 100% { opacity: 0.4; transform: scale(0.95); } 50% { opacity: 1; transform: scale(1); } }
        @media (prefers-reduced-motion: reduce) { .group { animation: none; opacity: 1; } }
      `}</style>
      <GeometrySurface accentEnd='#ecfeff' accentStart='#0ea5e9' atmosphereA='rgba(14, 165, 233, 0.08)' atmosphereB='rgba(34, 211, 238, 0.06)' ids={surfaceIds} stroke='rgba(14, 165, 233, 0.12)' testIdPrefix='geometry-angle-types' x={12} y={12} width={296} height={122} rx={22} />
      <g className='group'><line className='ray' x1='40' y1='100' x2='80' y2='100' /><line className='ray' x1='40' y1='100' x2='70' y2='70' /><text fill='#0891b2' fontSize='10' fontWeight='700' x='35' y='118'>ostry</text></g>
      <g className='group g2'><line className='ray' x1='140' y1='100' x2='180' y2='100' /><line className='ray' x1='140' y1='100' x2='140' y2='60' /><text fill='#0891b2' fontSize='10' fontWeight='700' x='132' y='118'>prosty</text></g>
      <g className='group g3'><line className='ray' x1='240' y1='100' x2='280' y2='100' /><line className='ray' x1='240' y1='100' x2='290' y2='70' /><text fill='#0891b2' fontSize='10' fontWeight='700' x='228' y='118'>rozwarty</text></g>
    </svg>
  );
}

export function GeometryPerimeterTraceAnimation(): React.JSX.Element {
  const surfaceIds = useGeometrySurfaceIds('geometry-perimeter-trace');

  return (
    <svg aria-label='Animacja: obwód figury jest liczony dookoła.' className='h-auto w-full' data-testid='geometry-perimeter-trace-animation' role='img' viewBox='0 0 260 166'>
      <style>{`
        .base { fill: rgba(254, 243, 199, 0.45); stroke: rgba(245, 158, 11, 0.18); stroke-width: 6; }
        .trace { fill: none; stroke: #f59e0b; stroke-width: 6; stroke-linecap: round; stroke-dasharray: 480; stroke-dashoffset: 480; animation: trace 3.8s ease-in-out infinite; }
        @keyframes trace { 0%, 20% { stroke-dashoffset: 480; } 70%, 100% { stroke-dashoffset: 0; } }
        @media (prefers-reduced-motion: reduce) { .trace { animation: none; stroke-dashoffset: 0; } }
      `}</style>
      <GeometrySurface accentEnd='#fff7ed' accentStart='#f59e0b' atmosphereA='rgba(245, 158, 11, 0.08)' atmosphereB='rgba(251, 191, 36, 0.06)' ids={surfaceIds} stroke='rgba(245, 158, 11, 0.12)' testIdPrefix='geometry-perimeter-trace' x={12} y={12} width={236} height={142} rx={22} />
      <rect className='base' height='80' rx='10' width='160' x='50' y='40' />
      <rect className='trace' height='80' rx='10' width='160' x='50' y='40' />
    </svg>
  );
}

export function GeometryPerimeterOppositeSidesAnimation(): React.JSX.Element {
  const surfaceIds = useGeometrySurfaceIds('geometry-perimeter-opposite-sides');

  return (
    <svg aria-label='Animacja: przeciwległe boki mają tę samą długość.' className='h-auto w-full' data-testid='geometry-perimeter-opposite-sides-animation' role='img' viewBox='0 0 260 166'>
      <style>{`
        .pair-a { stroke: #0ea5e9; stroke-width: 6; stroke-linecap: round; opacity: 0.2; animation: pairGlow 4.6s ease-in-out infinite; }
        .pair-b { stroke: #f59e0b; stroke-width: 6; stroke-linecap: round; opacity: 0.2; animation: pairGlow 4.6s ease-in-out infinite 2.3s; }
        .label { font: 700 12px/1.1 system-ui, sans-serif; fill: #334155; }
        @keyframes pairGlow { 0%, 20% { opacity: 0.2; } 50%, 80% { opacity: 1; } 100% { opacity: 0.2; } }
        @media (prefers-reduced-motion: reduce) { .pair-a, .pair-b { animation: none; opacity: 1; } }
      `}</style>
      <GeometrySurface accentEnd='#fff7ed' accentStart='#f59e0b' atmosphereA='rgba(245, 158, 11, 0.08)' atmosphereB='rgba(14, 165, 233, 0.06)' ids={surfaceIds} stroke='rgba(245, 158, 11, 0.12)' testIdPrefix='geometry-perimeter-opposite-sides' x={12} y={12} width={236} height={142} rx={22} />
      <line className='pair-a' x1='50' y1='40' x2='210' y2='40' /><line className='pair-a' x1='50' y1='120' x2='210' y2='120' /><line className='pair-b' x1='50' y1='40' x2='50' y2='120' /><line className='pair-b' x1='210' y1='40' x2='210' y2='120' /><text className='label' x='120' y='32'>a</text><text className='label' x='120' y='142'>a</text><text className='label' x='32' y='84'>b</text><text className='label' x='222' y='84'>b</text>
    </svg>
  );
}

export function GeometryPerimeterSumAnimation(): React.JSX.Element {
  const surfaceIds = useGeometrySurfaceIds('geometry-perimeter-sum');

  return (
    <svg aria-label='Animacja: obwód to suma wszystkich boków.' className='h-auto w-full' data-testid='geometry-perimeter-sum-animation' role='img' viewBox='0 0 260 176'>
      <style>{`
        .base { fill: rgba(254, 230, 138, 0.28); stroke: #fde68a; stroke-width: 6; }
        .side { fill: none; stroke: #f59e0b; stroke-width: 6; stroke-linecap: round; opacity: 0.2; animation: sideGlow 4.8s ease-in-out infinite; }
        .s2 { animation-delay: 0.6s; } .s3 { animation-delay: 1.2s; } .s4 { animation-delay: 1.8s; }
        .sum { font: 700 12px/1.1 system-ui, sans-serif; fill: #92400e; opacity: 0.3; animation: sumReveal 4.8s ease-in-out infinite; }
        @keyframes sideGlow { 0%, 20% { opacity: 0.2; } 45%, 80% { opacity: 1; } 100% { opacity: 0.2; } }
        @keyframes sumReveal { 0%, 45% { opacity: 0.2; } 70%, 100% { opacity: 1; } }
        @media (prefers-reduced-motion: reduce) { .side { animation: none; opacity: 1; } .sum { animation: none; opacity: 1; } }
      `}</style>
      <GeometrySurface accentEnd='#fff7ed' accentStart='#f59e0b' atmosphereA='rgba(245, 158, 11, 0.08)' atmosphereB='rgba(251, 191, 36, 0.06)' ids={surfaceIds} stroke='rgba(245, 158, 11, 0.12)' testIdPrefix='geometry-perimeter-sum' x={12} y={12} width={236} height={152} rx={22} />
      <rect className='base' height='80' rx='10' width='160' x='50' y='40' />
      <line className='side s1' x1='50' y1='40' x2='210' y2='40' /><line className='side s2' x1='210' y1='40' x2='210' y2='120' /><line className='side s3' x1='210' y1='120' x2='50' y2='120' /><line className='side s4' x1='50' y1='120' x2='50' y2='40' /><text className='sum' x='62' y='160'>O = 6 + 4 + 6 + 4 = 20</text>
    </svg>
  );
}

export function GeometryShapeBuildAnimation(): React.JSX.Element {
  const surfaceIds = useGeometrySurfaceIds('geometry-shape-build');

  return (
    <svg aria-label='Animacja: figura powstaje z odcinków.' className='h-auto w-full' data-testid='geometry-shape-build-animation' role='img' viewBox='0 0 240 166'>
      <style>{`
        .edge { stroke: #a855f7; stroke-width: 6; stroke-linecap: round; stroke-dasharray: 140; stroke-dashoffset: 140; animation: draw 4.2s ease-in-out infinite; }
        .e2 { animation-delay: 0.7s; } .e3 { animation-delay: 1.4s; } .e4 { animation-delay: 2.1s; }
        .node { fill: #c026d3; animation: nodePop 4.2s ease-in-out infinite; }
        .n2 { animation-delay: 0.7s; } .n3 { animation-delay: 1.4s; } .n4 { animation-delay: 2.1s; }
        @keyframes draw { 0%, 15% { stroke-dashoffset: 140; } 55%, 100% { stroke-dashoffset: 0; } }
        @keyframes nodePop { 0%, 20% { opacity: 0.3; transform: scale(0.9); } 45%, 100% { opacity: 1; transform: scale(1); } }
        @media (prefers-reduced-motion: reduce) { .edge { animation: none; stroke-dashoffset: 0; } .node { animation: none; } }
      `}</style>
      <GeometrySurface accentEnd='#faf5ff' accentStart='#a855f7' atmosphereA='rgba(168, 85, 247, 0.08)' atmosphereB='rgba(217, 70, 239, 0.06)' ids={surfaceIds} stroke='rgba(168, 85, 247, 0.12)' testIdPrefix='geometry-shape-build' x={12} y={12} width={216} height={142} rx={22} />
      <line className='edge e1' x1='60' x2='180' y1='40' y2='40' /><line className='edge e2' x1='180' x2='180' y1='40' y2='120' /><line className='edge e3' x1='180' x2='60' y1='120' y2='120' /><line className='edge e4' x1='60' x2='60' y1='120' y2='40' /><circle className='node n1' cx='60' cy='40' r='6' /><circle className='node n2' cx='180' cy='40' r='6' /><circle className='node n3' cx='180' cy='120' r='6' /><circle className='node n4' cx='60' cy='120' r='6' />
    </svg>
  );
}

export function GeometryShapeFillAnimation(): React.JSX.Element {
  const surfaceIds = useGeometrySurfaceIds('geometry-shape-fill');

  return (
    <svg aria-label='Animacja: wnętrze figury jest wypełnione.' className='h-auto w-full' data-testid='geometry-shape-fill-animation' role='img' viewBox='0 0 240 166'>
      <style>{`
        .outline { fill: none; stroke: #a855f7; stroke-width: 6; }
        .fill { fill: #f0abfc; opacity: 0.2; animation: fillPulse 3.6s ease-in-out infinite; }
        @keyframes fillPulse { 0%, 100% { opacity: 0.2; } 50% { opacity: 0.7; } }
        @media (prefers-reduced-motion: reduce) { .fill { animation: none; opacity: 0.5; } }
      `}</style>
      <GeometrySurface accentEnd='#faf5ff' accentStart='#a855f7' atmosphereA='rgba(168, 85, 247, 0.08)' atmosphereB='rgba(217, 70, 239, 0.06)' ids={surfaceIds} stroke='rgba(168, 85, 247, 0.12)' testIdPrefix='geometry-shape-fill' x={12} y={12} width={216} height={142} rx={22} />
      <rect className='fill' x='60' y='40' width='120' height='80' rx='8' />
      <rect className='outline' x='60' y='40' width='120' height='80' rx='8' />
    </svg>
  );
}
