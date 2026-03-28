'use client';

import React from 'react';
import { useGeometrySurfaceIds, GeometrySurface } from './GeometryAnimationSurface';

export function GeometryShapesOrbitAnimation(): React.JSX.Element {
  const surfaceIds = useGeometrySurfaceIds('geometry-shapes-orbit');

  return (
    <svg aria-label='Animacja: figury poruszają się po okręgu.' className='h-auto w-full' data-testid='geometry-shapes-orbit-animation' role='img' viewBox='0 0 240 166'>
      <style>{`
        .orbit { transform-origin: 120px 80px; animation: spin 6s linear infinite; }
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        @media (prefers-reduced-motion: reduce) { .orbit { animation: none; } }
      `}</style>
      <GeometrySurface accentEnd='#faf5ff' accentStart='#a855f7' atmosphereA='rgba(168, 85, 247, 0.08)' atmosphereB='rgba(236, 72, 153, 0.06)' ids={surfaceIds} stroke='rgba(168, 85, 247, 0.12)' testIdPrefix='geometry-shapes-orbit' x={12} y={12} width={216} height={142} rx={22} />
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
    <svg aria-label='Animacja: symetria względem osi.' className='h-auto w-full' data-testid='geometry-symmetry-fold-animation' role='img' viewBox='0 0 260 166'>
      <style>{`
        .half { fill: #34d399; opacity: 0.8; animation: fold 3.6s ease-in-out infinite; }
        .mirror { fill: #34d399; opacity: 0.2; animation: mirror 3.6s ease-in-out infinite; }
        .axis { stroke: #10b981; stroke-width: 4; stroke-dasharray: 6 6; }
        @keyframes fold { 0%, 100% { opacity: 0.9; } 50% { opacity: 0.4; } }
        @keyframes mirror { 0%, 100% { opacity: 0.2; } 50% { opacity: 0.9; } }
        @media (prefers-reduced-motion: reduce) { .half, .mirror { animation: none; opacity: 0.8; } }
      `}</style>
      <GeometrySurface accentEnd='#ecfdf5' accentStart='#10b981' atmosphereA='rgba(16, 185, 129, 0.08)' atmosphereB='rgba(52, 211, 153, 0.06)' ids={surfaceIds} stroke='rgba(16, 185, 129, 0.12)' testIdPrefix='geometry-symmetry-fold' x={12} y={12} width={236} height={142} rx={22} />
      <rect className='half' height='70' rx='20' width='60' x='40' y='45' />
      <rect className='mirror' height='70' rx='20' width='60' x='160' y='45' />
      <line className='axis' x1='130' x2='130' y1='30' y2='130' />
    </svg>
  );
}

export function GeometrySymmetryAxesAnimation(): React.JSX.Element {
  const surfaceIds = useGeometrySurfaceIds('geometry-symmetry-axes');

  return (
    <svg aria-label='Animacja: figura ma wiele osi symetrii.' className='h-auto w-full' data-testid='geometry-symmetry-axes-animation' role='img' viewBox='0 0 240 166'>
      <style>{`
        .axis { stroke: #10b981; stroke-width: 4; stroke-dasharray: 6 6; animation: axisFade 3.6s ease-in-out infinite; }
        .axis-h { animation-delay: 1.8s; }
        .shape { fill: #34d399; opacity: 0.85; }
        @keyframes axisFade { 0%, 100% { opacity: 0.2; } 50% { opacity: 1; } }
        @media (prefers-reduced-motion: reduce) { .axis { animation: none; opacity: 1; } }
      `}</style>
      <GeometrySurface accentEnd='#ecfdf5' accentStart='#10b981' atmosphereA='rgba(16, 185, 129, 0.08)' atmosphereB='rgba(52, 211, 153, 0.06)' ids={surfaceIds} stroke='rgba(16, 185, 129, 0.12)' testIdPrefix='geometry-symmetry-axes' x={12} y={12} width={216} height={142} rx={22} />
      <circle className='shape' cx='120' cy='80' r='36' />
      <line className='axis' x1='120' x2='120' y1='30' y2='130' />
      <line className='axis axis-h' x1='70' x2='170' y1='80' y2='80' />
    </svg>
  );
}

export function GeometrySymmetryMirrorAnimation(): React.JSX.Element {
  const surfaceIds = useGeometrySurfaceIds('geometry-symmetry-mirror');

  return (
    <svg aria-label='Animacja: odbicie lustrzane po osi symetrii.' className='h-auto w-full' data-testid='geometry-symmetry-mirror-animation' role='img' viewBox='0 0 280 166'>
      <style>{`
        .axis { stroke: #10b981; stroke-width: 4; stroke-dasharray: 6 6; }
        .left { fill: #34d399; opacity: 0.9; }
        .right { fill: #34d399; opacity: 0.25; transform-origin: 140px 80px; animation: mirrorPulse 3.6s ease-in-out infinite; }
        @keyframes mirrorPulse { 0%, 100% { opacity: 0.25; transform: translateX(10px); } 50% { opacity: 0.9; transform: translateX(0); } }
        @media (prefers-reduced-motion: reduce) { .right { animation: none; opacity: 0.7; } }
      `}</style>
      <GeometrySurface accentEnd='#ecfdf5' accentStart='#10b981' atmosphereA='rgba(16, 185, 129, 0.08)' atmosphereB='rgba(52, 211, 153, 0.06)' ids={surfaceIds} stroke='rgba(16, 185, 129, 0.12)' testIdPrefix='geometry-symmetry-mirror' x={12} y={12} width={256} height={142} rx={22} />
      <line className='axis' x1='140' x2='140' y1='25' y2='135' />
      <path className='left' d='M70 110 C40 95, 40 55, 70 50 C80 32, 110 32, 120 50 C150 55, 150 95, 120 110 Z' />
      <g className='right'><path d='M210 110 C240 95, 240 55, 210 50 C200 32, 170 32, 160 50 C130 55, 130 95, 160 110 Z' /></g>
    </svg>
  );
}

export function GeometrySymmetryRotationAnimation(): React.JSX.Element {
  const surfaceIds = useGeometrySurfaceIds('geometry-symmetry-rotation');

  return (
    <svg aria-label='Animacja: obrót figury zachowuje symetrię obrotową.' className='h-auto w-full' data-testid='geometry-symmetry-rotation-animation' role='img' viewBox='0 0 240 166'>
      <style>{`
        .shape { fill: #34d399; transform-origin: 120px 80px; animation: rotate 4.2s ease-in-out infinite; }
        .ring { fill: none; stroke: rgba(16, 185, 129, 0.22); stroke-width: 2; stroke-dasharray: 6 8; }
        @keyframes rotate { 0%, 100% { transform: rotate(0deg); } 50% { transform: rotate(90deg); } }
        @media (prefers-reduced-motion: reduce) { .shape { animation: none; } }
      `}</style>
      <GeometrySurface accentEnd='#ecfdf5' accentStart='#10b981' atmosphereA='rgba(16, 185, 129, 0.08)' atmosphereB='rgba(52, 211, 153, 0.06)' ids={surfaceIds} stroke='rgba(16, 185, 129, 0.12)' testIdPrefix='geometry-symmetry-rotation' x={12} y={12} width={216} height={142} rx={22} />
      <circle className='ring' cx='120' cy='80' r='46' />
      <rect className='shape' x='80' y='40' width='80' height='80' rx='10' />
    </svg>
  );
}

export function GeometrySymmetryCheckAnimation(): React.JSX.Element {
  const surfaceIds = useGeometrySurfaceIds('geometry-symmetry-check');

  return (
    <svg aria-label='Animacja: porównanie figury symetrycznej i niesymetrycznej.' className='h-auto w-full' data-testid='geometry-symmetry-check-animation' role='img' viewBox='0 0 320 146'>
      <style>{`
        .box { fill: rgba(255,255,255,0.72); stroke: #e2e8f0; stroke-width: 2; }
        .sym { fill: #34d399; opacity: 0.9; }
        .asym { fill: #fb7185; opacity: 0.85; }
        .check { stroke: #10b981; stroke-width: 5; stroke-linecap: round; stroke-linejoin: round; animation: checkPulse 3.4s ease-in-out infinite; }
        .cross { stroke: #e11d48; stroke-width: 5; stroke-linecap: round; animation: crossPulse 3.4s ease-in-out infinite 1.7s; }
        @keyframes checkPulse { 0%, 100% { opacity: 0.4; } 50% { opacity: 1; } }
        @keyframes crossPulse { 0%, 100% { opacity: 0.4; } 50% { opacity: 1; } }
        @media (prefers-reduced-motion: reduce) { .check, .cross { animation: none; opacity: 1; } }
      `}</style>
      <GeometrySurface accentEnd='#ecfdf5' accentStart='#10b981' atmosphereA='rgba(16, 185, 129, 0.06)' atmosphereB='rgba(244, 63, 94, 0.06)' ids={surfaceIds} stroke='rgba(148, 163, 184, 0.12)' testIdPrefix='geometry-symmetry-check' x={12} y={12} width={296} height={122} rx={22} />
      <rect className='box' x='30' y='25' width='110' height='90' rx='14' />
      <rect className='box' x='180' y='25' width='110' height='90' rx='14' />
      <path className='sym' d='M60 95 C45 80, 45 55, 60 50 C65 38, 80 38, 85 50 C100 55, 100 80, 85 95 Z' />
      <path className='sym' d='M110 95 C125 80, 125 55, 110 50 C105 38, 90 38, 85 50 C70 55, 70 80, 85 95 Z' />
      <path className='asym' d='M215 95 C200 80, 200 55, 215 50 C220 38, 235 38, 240 50 C255 55, 255 80, 240 95 Z' />
      <path className='asym' d='M260 95 C270 80, 270 60, 260 55 C255 45, 242 45, 236 55 C224 60, 224 80, 236 95 Z' />
      <path className='check' d='M60 120 L75 132 L105 102' />
      <line className='cross' x1='205' y1='120' x2='235' y2='132' /><line className='cross' x1='235' y1='120' x2='205' y2='132' />
    </svg>
  );
}

export function GeometryPerimeterSidesAnimation(): React.JSX.Element {
  const surfaceIds = useGeometrySurfaceIds('geometry-perimeter-sides');

  return (
    <svg aria-label='Animacja: boki a i b w prostokącie.' className='h-auto w-full' data-testid='geometry-perimeter-sides-animation' role='img' viewBox='0 0 260 166'>
      <style>{`
        .base { fill: rgba(254, 230, 138, 0.28); stroke: #fde68a; stroke-width: 6; }
        .side-a { stroke: #f59e0b; stroke-width: 6; opacity: 0.3; animation: glow 3.2s ease-in-out infinite; }
        .side-b { stroke: #fb7185; stroke-width: 6; opacity: 0.3; animation: glow 3.2s ease-in-out infinite 1.6s; }
        @keyframes glow { 0%, 100% { opacity: 0.3; } 50% { opacity: 1; } }
        @media (prefers-reduced-motion: reduce) { .side-a, .side-b { animation: none; opacity: 1; } }
      `}</style>
      <GeometrySurface accentEnd='#fff7ed' accentStart='#f59e0b' atmosphereA='rgba(245, 158, 11, 0.08)' atmosphereB='rgba(251, 113, 133, 0.06)' ids={surfaceIds} stroke='rgba(245, 158, 11, 0.12)' testIdPrefix='geometry-perimeter-sides' x={12} y={12} width={236} height={142} rx={22} />
      <rect className='base' x='50' y='40' width='160' height='80' rx='10' />
      <line className='side-a' x1='50' y1='40' x2='210' y2='40' /><line className='side-a' x1='50' y1='120' x2='210' y2='120' /><line className='side-b' x1='50' y1='40' x2='50' y2='120' /><line className='side-b' x1='210' y1='40' x2='210' y2='120' /><text fill='#b45309' fontSize='12' fontWeight='700' x='120' y='32'>a</text><text fill='#be123c' fontSize='12' fontWeight='700' x='220' y='85'>b</text>
    </svg>
  );
}

export function GeometryPolygonSidesAnimation(): React.JSX.Element {
  const surfaceIds = useGeometrySurfaceIds('geometry-polygon-sides');

  return (
    <svg aria-label='Animacja: więcej boków, bardziej złożona figura.' className='h-auto w-full' data-testid='geometry-polygon-sides-animation' role='img' viewBox='0 0 320 146'>
      <style>{`
        .shape { fill: rgba(168, 85, 247, 0.08); stroke: #a855f7; stroke-width: 5; opacity: 0.4; }
        .s1 { animation: pop 3.6s ease-in-out infinite; }
        .s2 { animation: pop 3.6s ease-in-out infinite 1.2s; } .s3 { animation: pop 3.6s ease-in-out infinite 2.4s; }
        @keyframes pop { 0%, 100% { opacity: 0.4; transform: scale(0.95); } 50% { opacity: 1; transform: scale(1); } }
        @media (prefers-reduced-motion: reduce) { .shape { animation: none; opacity: 1; } }
      `}</style>
      <GeometrySurface accentEnd='#faf5ff' accentStart='#a855f7' atmosphereA='rgba(168, 85, 247, 0.08)' atmosphereB='rgba(236, 72, 153, 0.06)' ids={surfaceIds} stroke='rgba(168, 85, 247, 0.12)' testIdPrefix='geometry-polygon-sides' x={12} y={12} width={296} height={122} rx={22} />
      <g className='shape s1'><polygon points='60,95 80,55 100,95' /><text fill='#7c3aed' fontSize='10' fontWeight='700' x='70' y='112'>3</text></g>
      <g className='shape s2'><rect x='140' y='55' width='40' height='40' rx='6' /><text fill='#7c3aed' fontSize='10' fontWeight='700' x='156' y='112'>4</text></g>
      <g className='shape s3'><polygon points='240,50 265,65 255,95 225,95 215,65' /><text fill='#7c3aed' fontSize='10' fontWeight='700' x='238' y='112'>5</text></g>
    </svg>
  );
}
