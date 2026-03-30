'use client';

import React from 'react';
import {
  renderSoftAtmosphereGradients,
  renderSoftAtmosphereOvals,
} from '@/features/kangur/ui/components/animations/svgAtmosphere';
import { useEnglishAnimationSurfaceIds } from './EnglishAnimationSurface';

export function EnglishPrepositionsTimeAnimation(): React.JSX.Element {
  const surfaceIds = useEnglishAnimationSurfaceIds('english-prepositions-time');

  return (
    <svg
      aria-label='Animacja: at / on / in na osi czasu.'
      className='h-auto w-full'
      data-testid='english-prepositions-time-animation'
      role='img'
      viewBox='0 0 420 150'
    >
      <style>{`
        .card { stroke-width: 2; stroke: rgba(248, 113, 113, 0.26); }
        .label { font: 700 11px/1.1 "Space Grotesk", sans-serif; letter-spacing: 0.12em; text-transform: uppercase; fill: #be123c; }
        .text { font: 600 12px/1.2 "Space Grotesk", sans-serif; fill: #0f172a; }
        .frame { fill: none; stroke: rgba(255, 255, 255, 0.72); stroke-width: 1.5; }
        .pulse { animation: cardGlow 5.4s ease-in-out infinite; transform-box: fill-box; transform-origin: center; }
        .pulse-2 { animation-delay: 1.8s; }
        .pulse-3 { animation-delay: 3.6s; }
        @keyframes cardGlow { 0%, 15% { opacity: 0.4; transform: translateY(6px); } 35%, 55% { opacity: 1; transform: translateY(0); } 100% { opacity: 0.4; transform: translateY(6px); } }
        @media (prefers-reduced-motion: reduce) { .pulse, .pulse-2, .pulse-3 { animation: none; opacity: 1; transform: none; } }
      `}</style>
      <defs>
        <linearGradient id={`${surfaceIds.panelGradientId}-at`} x1='20' x2='140' y1='28' y2='122' gradientUnits='userSpaceOnUse'>
          <stop offset='0%' stopColor='#fff1f2' /><stop offset='100%' stopColor='#ffe4e6' />
        </linearGradient>
        <linearGradient id={`${surfaceIds.panelGradientId}-on`} x1='150' x2='270' y1='28' y2='122' gradientUnits='userSpaceOnUse'>
          <stop offset='0%' stopColor='#eff6ff' /><stop offset='100%' stopColor='#dbeafe' />
        </linearGradient>
        <linearGradient id={`${surfaceIds.panelGradientId}-in`} x1='280' x2='400' y1='28' y2='122' gradientUnits='userSpaceOnUse'>
          <stop offset='0%' stopColor='#ecfdf5' /><stop offset='100%' stopColor='#dcfce7' />
        </linearGradient>
      </defs>
      <g className='pulse' transform='translate(20, 28)'>
        <rect className='card' fill={`url(#${surfaceIds.panelGradientId}-at)`} height='94' rx='18' width='120' />
        <rect className='frame' x='4' y='4' width='112' height='86' rx='14' />
        <text className='label' x='16' y='30'>AT</text>
        <text className='text' x='16' y='56'>7:30</text><text className='text' x='16' y='76'>noon</text>
      </g>
      <g className='pulse pulse-2' transform='translate(150, 28)'>
        <rect className='card' fill={`url(#${surfaceIds.panelGradientId}-on)`} height='94' rx='18' width='120' />
        <rect className='frame' x='4' y='4' width='112' height='86' rx='14' />
        <text className='label' x='16' y='30'>ON</text>
        <text className='text' x='16' y='56'>Monday</text><text className='text' x='16' y='76'>14 May</text>
      </g>
      <g className='pulse pulse-3' transform='translate(280, 28)'>
        <rect className='card' fill={`url(#${surfaceIds.panelGradientId}-in)`} height='94' rx='18' width='120' />
        <rect className='frame' x='4' y='4' width='112' height='86' rx='14' />
        <text className='label' x='16' y='30'>IN</text>
        <text className='text' x='16' y='56'>July</text><text className='text' x='16' y='76'>2026</text>
      </g>
    </svg>
  );
}

export function EnglishPrepositionsTimelineAnimation(): React.JSX.Element {
  const surfaceIds = useEnglishAnimationSurfaceIds('english-prepositions-timeline');

  return (
    <svg
      aria-label='Animacja: before, during, after na osi czasu.'
      className='h-auto w-full'
      data-testid='english-prepositions-timeline-animation'
      role='img'
      viewBox='0 0 420 150'
    >
      <style>{`
        .panel { stroke-width: 2; stroke: rgba(148, 163, 184, 0.28); }
        .axis { stroke: #94a3b8; stroke-width: 2; stroke-linecap: round; }
        .event { fill: #fee2e2; stroke: #fda4af; stroke-width: 2; }
        .label { font: 700 11px/1.1 "Space Grotesk", sans-serif; letter-spacing: 0.12em; text-transform: uppercase; fill: #be123c; }
        .text { font: 600 12px/1.2 "Space Grotesk", sans-serif; fill: #0f172a; }
        .dot { fill: #f43f5e; animation: markerPulse 4.8s ease-in-out infinite; transform-box: fill-box; transform-origin: center; }
        .dot-2 { animation-delay: 1.6s; }
        .dot-3 { animation-delay: 3.2s; }
        .frame { fill: none; stroke: rgba(255, 255, 255, 0.72); stroke-width: 1.6; }
        @keyframes markerPulse { 0%, 15% { opacity: 0.35; transform: scale(0.9); } 40%, 60% { opacity: 1; transform: scale(1); } 100% { opacity: 0.35; transform: scale(0.9); } }
        @media (prefers-reduced-motion: reduce) { .dot, .dot-2, .dot-3 { animation: none; opacity: 1; transform: none; } }
      `}</style>
      <defs>
        <clipPath id={surfaceIds.clipId}><rect x='20' y='20' width='380' height='110' rx='18' /></clipPath>
        <linearGradient id={surfaceIds.panelGradientId} x1='20' x2='400' y1='20' y2='130' gradientUnits='userSpaceOnUse'>
          <stop offset='0%' stopColor='#eff6ff' /><stop offset='55%' stopColor='#f8fafc' /><stop offset='100%' stopColor='#fff7ed' />
        </linearGradient>
        {renderSoftAtmosphereGradients(`${surfaceIds.atmosphereGradientId}-soft`, [
          { key: 'left', cx: 98, cy: 34, rx: 84, ry: 18, color: '#38bdf8', opacity: 0.05, glowBias: '40%' },
          { key: 'right', cx: 320, cy: 130, rx: 116, ry: 22, color: '#fbbf24', opacity: 0.04, glowBias: '58%' },
        ])}
      </defs>
      <g clipPath={`url(#${surfaceIds.clipId})`}>
        <rect className='panel' fill={`url(#${surfaceIds.panelGradientId})`} height='110' rx='18' width='380' x='20' y='20' />
        {renderSoftAtmosphereOvals(`${surfaceIds.atmosphereGradientId}-soft`, [
          { key: 'left', cx: 98, cy: 34, rx: 84, ry: 18, color: '#38bdf8', opacity: 0.05, glowBias: '40%' },
          { key: 'right', cx: 320, cy: 130, rx: 116, ry: 22, color: '#fbbf24', opacity: 0.04, glowBias: '58%' },
        ])}
      </g>
      <rect className='frame' height='98' rx='14' width='368' x='26' y='26' />
      <line className='axis' x1='40' y1='78' x2='380' y2='78' />
      <rect className='event' x='170' y='58' width='80' height='40' rx='12' />
      <text className='text' x='186' y='83'>class</text>
      <circle className='dot' cx='90' cy='78' r='7' /><circle className='dot dot-2' cx='210' cy='50' r='7' /><circle className='dot dot-3' cx='330' cy='78' r='7' />
      <text className='label' x='68' y='52'>before</text><text className='label' x='188' y='32'>during</text><text className='label' x='308' y='52'>after</text>
    </svg>
  );
}

export function EnglishPrepositionsPlaceAnimation(): React.JSX.Element {
  const surfaceIds = useEnglishAnimationSurfaceIds('english-prepositions-place');

  return (
    <svg
      aria-label='Animacja: at / in / on w miejscu.'
      className='h-auto w-full'
      data-testid='english-prepositions-place-animation'
      role='img'
      viewBox='0 0 420 150'
    >
      <style>{`
        .card { stroke-width: 2; stroke: rgba(248, 113, 113, 0.26); }
        .label { font: 700 11px/1.1 "Space Grotesk", sans-serif; letter-spacing: 0.12em; text-transform: uppercase; fill: #be123c; }
        .text { font: 600 12px/1.2 "Space Grotesk", sans-serif; fill: #0f172a; }
        .pin { fill: #f43f5e; }
        .surface { fill: #fecdd3; }
        .box { fill: #fef2f2; stroke: #fda4af; stroke-width: 2; }
        .frame { fill: none; stroke: rgba(255, 255, 255, 0.72); stroke-width: 1.5; }
        .pulse { animation: placeGlow 5.4s ease-in-out infinite; transform-box: fill-box; transform-origin: center; }
        .pulse-2 { animation-delay: 1.8s; }
        .pulse-3 { animation-delay: 3.6s; }
        @keyframes placeGlow { 0%, 15% { opacity: 0.4; transform: translateY(6px); } 35%, 55% { opacity: 1; transform: translateY(0); } 100% { opacity: 0.4; transform: translateY(6px); } }
        @media (prefers-reduced-motion: reduce) { .pulse, .pulse-2, .pulse-3 { animation: none; opacity: 1; transform: none; } }
      `}</style>
      <defs>
        <linearGradient id={`${surfaceIds.panelGradientId}-at`} x1='20' x2='140' y1='28' y2='122' gradientUnits='userSpaceOnUse'>
          <stop offset='0%' stopColor='#fff1f2' /><stop offset='100%' stopColor='#ffe4e6' />
        </linearGradient>
        <linearGradient id={`${surfaceIds.panelGradientId}-in`} x1='150' x2='270' y1='28' y2='122' gradientUnits='userSpaceOnUse'>
          <stop offset='0%' stopColor='#eff6ff' /><stop offset='100%' stopColor='#dbeafe' />
        </linearGradient>
        <linearGradient id={`${surfaceIds.panelGradientId}-on`} x1='280' x2='400' y1='28' y2='122' gradientUnits='userSpaceOnUse'>
          <stop offset='0%' stopColor='#ecfdf5' /><stop offset='100%' stopColor='#dcfce7' />
        </linearGradient>
      </defs>
      <g className='pulse' transform='translate(20, 28)'>
        <rect className='card' fill={`url(#${surfaceIds.panelGradientId}-at)`} height='94' rx='18' width='120' />
        <rect className='frame' x='4' y='4' width='112' height='86' rx='14' />
        <text className='label' x='16' y='28'>AT</text>
        <circle className='pin' cx='38' cy='66' r='8' /><path className='pin' d='M38 74 L30 92 L46 92 Z' /><text className='text' x='60' y='70'>school</text>
      </g>
      <g className='pulse pulse-2' transform='translate(150, 28)'>
        <rect className='card' fill={`url(#${surfaceIds.panelGradientId}-in)`} height='94' rx='18' width='120' />
        <rect className='frame' x='4' y='4' width='112' height='86' rx='14' />
        <text className='label' x='16' y='28'>IN</text>
        <rect className='box' x='20' y='46' width='60' height='40' rx='10' /><circle className='pin' cx='50' cy='66' r='6' /><text className='text' x='86' y='70'>room</text>
      </g>
      <g className='pulse pulse-3' transform='translate(280, 28)'>
        <rect className='card' fill={`url(#${surfaceIds.panelGradientId}-on)`} height='94' rx='18' width='120' />
        <rect className='frame' x='4' y='4' width='112' height='86' rx='14' />
        <text className='label' x='16' y='28'>ON</text>
        <rect className='surface' x='20' y='56' width='70' height='10' rx='5' /><circle className='pin' cx='44' cy='50' r='7' /><text className='text' x='86' y='70'>board</text>
      </g>
    </svg>
  );
}

export function EnglishPrepositionsRelationsDiagram(): React.JSX.Element {
  const surfaceIds = useEnglishAnimationSurfaceIds('english-prepositions-relations');

  return (
    <svg
      aria-label='Rysunek: between, above, below.'
      className='h-auto w-full'
      data-testid='english-prepositions-relations-animation'
      role='img'
      viewBox='0 0 420 140'
    >
      <style>{`
        .panel { stroke-width: 2; stroke: rgba(148, 163, 184, 0.28); }
        .label { font: 700 11px/1.1 "Space Grotesk", sans-serif; letter-spacing: 0.12em; text-transform: uppercase; fill: #0f172a; }
        .text { font: 600 12px/1.2 "Space Grotesk", sans-serif; fill: #0f172a; }
        .dot { fill: #be123c; }
        .muted { fill: #64748b; }
        .line { stroke: #94a3b8; stroke-width: 2; }
        .frame { fill: none; stroke: rgba(255, 255, 255, 0.72); stroke-width: 1.5; }
      `}</style>
      <defs>
        <linearGradient id={`${surfaceIds.panelGradientId}-between`} x1='20' x2='200' y1='26' y2='114' gradientUnits='userSpaceOnUse'>
          <stop offset='0%' stopColor='#eff6ff' /><stop offset='100%' stopColor='#dbeafe' />
        </linearGradient>
        <linearGradient id={`${surfaceIds.panelGradientId}-vertical`} x1='230' x2='400' y1='26' y2='114' gradientUnits='userSpaceOnUse'>
          <stop offset='0%' stopColor='#fff7ed' /><stop offset='100%' stopColor='#ffedd5' />
        </linearGradient>
      </defs>
      <g transform='translate(20, 26)'>
        <rect className='panel' fill={`url(#${surfaceIds.panelGradientId}-between)`} height='88' rx='16' width='180' />
        <rect className='frame' x='4' y='4' width='172' height='80' rx='13' />
        <text className='label' x='16' y='26'>BETWEEN</text>
        <line className='line' x1='24' y1='56' x2='156' y2='56' />
        <circle className='muted' cx='40' cy='56' r='6' /><circle className='muted' cx='140' cy='56' r='6' /><circle className='dot' cx='90' cy='56' r='7' />
        <text className='text' x='28' y='78'>A</text><text className='text' x='135' y='78'>B</text>
      </g>
      <g transform='translate(230, 26)'>
        <rect className='panel' fill={`url(#${surfaceIds.panelGradientId}-vertical)`} height='88' rx='16' width='170' />
        <rect className='frame' x='4' y='4' width='162' height='80' rx='13' />
        <text className='label' x='16' y='26'>ABOVE / BELOW</text>
        <rect x='60' y='48' rx='8' width='50' height='28' fill='#fee2e2' stroke='#fda4af' strokeWidth='2' />
        <circle className='dot' cx='85' cy='40' r='6' /><circle className='dot' cx='85' cy='90' r='6' />
        <text className='text' x='22' y='44'>above</text><text className='text' x='22' y='94'>below</text>
      </g>
    </svg>
  );
}
