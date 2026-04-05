import React from 'react';
import { useGeometrySurfaceIds, GeometrySurface } from './GeometryAnimationSurface';

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
        .label { fill: #0891b2; font-size: 12px; font-weight: 700; opacity: 0; animation: labelFade 4.2s ease-in-out infinite 0.9s; }
        .segment-label { fill: #0e7490; font-size: 11px; font-weight: 600; letter-spacing: 0.02em; opacity: 0; animation: labelSegment 4.8s ease-in-out infinite 1.9s; }
        .segment-pill { fill: #cffafe; opacity: 0; animation: labelSegment 4.8s ease-in-out infinite 1.9s; }
        .line { stroke: #06b6d4; stroke-width: 5; stroke-linecap: round; stroke-dasharray: 180; stroke-dashoffset: 180; animation: draw 4.8s ease-in-out infinite 0.9s; }
        .glow { stroke: #67e8f9; stroke-width: 10; stroke-linecap: round; opacity: 0; animation: glow 4.8s ease-in-out infinite 1.8s; }
        @keyframes draw { 0%, 32% { stroke-dashoffset: 180; } 60%, 100% { stroke-dashoffset: 0; } }
        @keyframes dotPop { 0%, 10% { transform: scale(0.2); opacity: 0; } 22%, 100% { transform: scale(1); opacity: 1; } }
        @keyframes labelFade { 0%, 28% { opacity: 0; } 40%, 100% { opacity: 1; } }
        @keyframes labelSegment { 0%, 46% { opacity: 0; } 62%, 100% { opacity: 1; } }
        @keyframes glow { 0%, 38% { opacity: 0; } 56% { opacity: 0.45; } 100% { opacity: 0; } }
        @media (prefers-reduced-motion: reduce) { .line { animation: none; stroke-dashoffset: 0; } .glow { animation: none; opacity: 0.2; } .dotA, .dotB { animation: none; opacity: 1; transform: scale(1); } .label { animation: none; opacity: 1; } .segment-label, .segment-pill { animation: none; opacity: 1; } }
      `}</style>
      <GeometrySurface accentEnd='#ecfeff' accentStart='#06b6d4' atmosphereA='rgba(34, 211, 238, 0.08)' atmosphereB='rgba(103, 232, 249, 0.08)' ids={surfaceIds} stroke='rgba(6, 182, 212, 0.12)' testIdPrefix='geometry-point-segment' x={12} y={12} width={296} height={102} rx={22} />
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
    <svg aria-label='Animacja: wierzchołki wielokąta.' className='h-auto w-full' data-testid='geometry-vertices-animation' role='img' viewBox='0 0 240 166'>
      <style>{`
        .edge { fill: rgba(224, 242, 254, 0.4); stroke: #22d3ee; stroke-width: 6; }
        .vertex { fill: #0ea5e9; animation: vertexPulse 2.8s ease-in-out infinite; }
        .v2 { animation-delay: 0.7s; } .v3 { animation-delay: 1.4s; } .v4 { animation-delay: 2.1s; }
        @keyframes vertexPulse { 0%, 100% { transform: scale(1); opacity: 0.7; } 50% { transform: scale(1.2); opacity: 1; } }
        @media (prefers-reduced-motion: reduce) { .vertex { animation: none; opacity: 1; } }
      `}</style>
      <GeometrySurface accentEnd='#ecfeff' accentStart='#0ea5e9' atmosphereA='rgba(14, 165, 233, 0.08)' atmosphereB='rgba(34, 211, 238, 0.06)' ids={surfaceIds} stroke='rgba(14, 165, 233, 0.12)' testIdPrefix='geometry-vertices' x={12} y={12} width={216} height={142} rx={22} />
      <polygon className='edge' points='60,40 180,40 200,120 40,120' />
      <circle className='vertex' cx='60' cy='40' r='6' /><circle className='vertex v2' cx='180' cy='40' r='6' /><circle className='vertex v3' cx='200' cy='120' r='6' /><circle className='vertex v4' cx='40' cy='120' r='6' />
    </svg>
  );
}

export function GeometryAngleAnimation(): React.JSX.Element {
  const surfaceIds = useGeometrySurfaceIds('geometry-angle');

  return (
    <svg aria-label='Animacja: kąt otwiera się i zamyka.' className='h-auto w-full' data-testid='geometry-angle-animation' role='img' viewBox='0 0 240 166'>
      <style>{`
        .ray { stroke: #0ea5e9; stroke-width: 6; stroke-linecap: round; }
        .moving { transform-origin: 120px 90px; animation: swing 3.2s ease-in-out infinite; }
        .arc { fill: rgba(14, 165, 233, 0.12); stroke: rgba(14, 165, 233, 0.26); stroke-width: 2; }
        @keyframes swing { 0%, 100% { transform: rotate(10deg); } 50% { transform: rotate(80deg); } }
        @media (prefers-reduced-motion: reduce) { .moving { animation: none; transform: rotate(60deg); } }
      `}</style>
      <GeometrySurface accentEnd='#ecfeff' accentStart='#0ea5e9' atmosphereA='rgba(14, 165, 233, 0.08)' atmosphereB='rgba(34, 211, 238, 0.06)' ids={surfaceIds} stroke='rgba(14, 165, 233, 0.12)' testIdPrefix='geometry-angle' x={12} y={12} width={216} height={142} rx={22} />
      <path className='arc' d='M 120 90 L 180 100 A 60 60 0 0 0 180 20 Z' />
      <line className='ray' x1='120' y1='90' x2='200' y2='90' />
      <line className='ray moving' x1='120' y1='90' x2='200' y2='90' />
      <circle fill='#0284c7' cx='120' cy='90' r='5' />
    </svg>
  );
}
