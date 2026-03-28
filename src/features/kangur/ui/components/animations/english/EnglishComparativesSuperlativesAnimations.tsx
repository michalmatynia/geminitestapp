'use client';

import React from 'react';

import { renderSoftAtmosphereGradients, renderSoftAtmosphereOvals } from '../svgAtmosphere';
import { useEnglishAnimationSurfaceIds } from './EnglishAnimationSurface';

export function EnglishComparativeScaleAnimation(): React.JSX.Element {
  const surfaceIds = useEnglishAnimationSurfaceIds('english-comparative-scale');
  const atmosphere = [
    { key: 'left', cx: 88, cy: 40, rx: 86, ry: 28, color: '#a855f7', opacity: 0.12 },
    { key: 'right', cx: 310, cy: 138, rx: 132, ry: 34, color: '#38bdf8', opacity: 0.1 },
  ] as const;

  return (
    <svg
      aria-label='Animation: comparing two things with a comparative adjective.'
      className='h-auto w-full'
      data-testid='english-comparative-scale-animation'
      role='img'
      viewBox='0 0 420 180'
    >
      <style>{`
        .panel { stroke: rgba(168, 85, 247, 0.28); stroke-width: 2; }
        .frame { fill: none; stroke: rgba(255, 255, 255, 0.74); stroke-width: 1.6; }
        .label { font: 700 12px/1.2 "Space Grotesk", sans-serif; fill: #0f172a; }
        .hint { font: 700 10px/1.2 "Space Grotesk", sans-serif; fill: #7c3aed; text-transform: uppercase; letter-spacing: 0.12em; }
        .compare { stroke: #7c3aed; stroke-width: 3; stroke-linecap: round; stroke-linejoin: round; fill: none; }
        .pulse { animation: comparativePulse 2.8s ease-in-out infinite; transform-box: fill-box; transform-origin: center; }
        @keyframes comparativePulse { 0%, 100% { opacity: 0.82; transform: translateY(0); } 50% { opacity: 1; transform: translateY(-2px); } }
        @media (prefers-reduced-motion: reduce) { .pulse { animation: none; } }
      `}</style>
      <defs>
        <clipPath id={surfaceIds.clipId}>
          <rect x='16' y='16' width='388' height='148' rx='24' />
        </clipPath>
        <linearGradient id={surfaceIds.panelGradientId} x1='16' x2='404' y1='16' y2='164' gradientUnits='userSpaceOnUse'>
          <stop offset='0%' stopColor='#faf5ff' />
          <stop offset='55%' stopColor='#f8fafc' />
          <stop offset='100%' stopColor='#eff6ff' />
        </linearGradient>
        <linearGradient id={surfaceIds.accentGradientId} x1='0%' x2='100%' y1='0%' y2='100%'>
          <stop offset='0%' stopColor='#d8b4fe' />
          <stop offset='100%' stopColor='#7dd3fc' />
        </linearGradient>
        {renderSoftAtmosphereGradients(`${surfaceIds.atmosphereGradientId}-soft`, atmosphere)}
      </defs>
      <g clipPath={`url(#${surfaceIds.clipId})`}>
        <rect className='panel' fill={`url(#${surfaceIds.panelGradientId})`} x='16' y='16' width='388' height='148' rx='24' />
        <g data-testid='english-comparative-scale-atmosphere'>
          {renderSoftAtmosphereOvals(`${surfaceIds.atmosphereGradientId}-soft`, atmosphere)}
        </g>
      </g>
      <rect className='frame' data-testid='english-comparative-scale-frame' x='22' y='22' width='376' height='136' rx='20' />
      <text className='hint' x='34' y='42'>Compare two things</text>
      <rect x='58' y='82' width='58' height='42' rx='14' fill='#bfdbfe' stroke='#60a5fa' strokeWidth='2' />
      <rect className='pulse' x='180' y='58' width='70' height='66' rx='16' fill={`url(#${surfaceIds.accentGradientId})`} stroke='#8b5cf6' strokeWidth='2' />
      <path className='compare' d='M 132 92 L 166 92' />
      <path className='compare' d='M 158 84 L 166 92 L 158 100' />
      <text className='label' x='50' y='142'>small tower</text>
      <text className='label' x='164' y='142'>taller tower</text>
      <text className='label' x='106' y='66'>tall → taller</text>
      <circle cx='304' cy='76' r='22' fill='#fde68a' stroke='#f59e0b' strokeWidth='2' />
      <circle cx='338' cy='66' r='28' fill='#fcd34d' stroke='#f59e0b' strokeWidth='2' />
      <text className='label' x='282' y='124'>big → bigger</text>
    </svg>
  );
}

export function EnglishSuperlativeCrownAnimation(): React.JSX.Element {
  const surfaceIds = useEnglishAnimationSurfaceIds('english-superlative-crown');
  const atmosphere = [
    { key: 'top', cx: 100, cy: 36, rx: 90, ry: 26, color: '#f59e0b', opacity: 0.12 },
    { key: 'bottom', cx: 312, cy: 144, rx: 128, ry: 30, color: '#a855f7', opacity: 0.1 },
  ] as const;

  return (
    <svg
      aria-label='Animation: choosing the top one in a group with a superlative.'
      className='h-auto w-full'
      data-testid='english-superlative-crown-animation'
      role='img'
      viewBox='0 0 420 180'
    >
      <style>{`
        .panel { stroke: rgba(245, 158, 11, 0.28); stroke-width: 2; }
        .frame { fill: none; stroke: rgba(255, 255, 255, 0.74); stroke-width: 1.6; }
        .label { font: 700 12px/1.2 "Space Grotesk", sans-serif; fill: #0f172a; }
        .hint { font: 700 10px/1.2 "Space Grotesk", sans-serif; fill: #b45309; text-transform: uppercase; letter-spacing: 0.12em; }
        .winner { animation: winnerLift 3s ease-in-out infinite; transform-box: fill-box; transform-origin: center; }
        @keyframes winnerLift { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-4px); } }
        @media (prefers-reduced-motion: reduce) { .winner { animation: none; } }
      `}</style>
      <defs>
        <clipPath id={surfaceIds.clipId}>
          <rect x='16' y='16' width='388' height='148' rx='24' />
        </clipPath>
        <linearGradient id={surfaceIds.panelGradientId} x1='16' x2='404' y1='16' y2='164' gradientUnits='userSpaceOnUse'>
          <stop offset='0%' stopColor='#fff7ed' />
          <stop offset='55%' stopColor='#fefce8' />
          <stop offset='100%' stopColor='#faf5ff' />
        </linearGradient>
        {renderSoftAtmosphereGradients(`${surfaceIds.atmosphereGradientId}-soft`, atmosphere)}
      </defs>
      <g clipPath={`url(#${surfaceIds.clipId})`}>
        <rect className='panel' fill={`url(#${surfaceIds.panelGradientId})`} x='16' y='16' width='388' height='148' rx='24' />
        <g data-testid='english-superlative-crown-atmosphere'>
          {renderSoftAtmosphereOvals(`${surfaceIds.atmosphereGradientId}-soft`, atmosphere)}
        </g>
      </g>
      <rect className='frame' data-testid='english-superlative-crown-frame' x='22' y='22' width='376' height='136' rx='20' />
      <text className='hint' x='34' y='42'>Choose one winner</text>
      <rect x='58' y='106' width='74' height='20' rx='10' fill='#fbcfe8' />
      <rect x='172' y='88' width='82' height='38' rx='12' fill='#fde68a' />
      <rect x='294' y='98' width='74' height='28' rx='12' fill='#bfdbfe' />
      <g className='winner'>
        <path d='M 196 54 L 206 34 L 220 52 L 232 34 L 244 54 L 244 64 L 196 64 Z' fill='#facc15' stroke='#eab308' strokeWidth='2' />
        <circle cx='220' cy='72' r='18' fill='#c084fc' stroke='#8b5cf6' strokeWidth='2' />
      </g>
      <circle cx='96' cy='86' r='16' fill='#f9a8d4' stroke='#ec4899' strokeWidth='2' />
      <circle cx='332' cy='80' r='16' fill='#93c5fd' stroke='#3b82f6' strokeWidth='2' />
      <text className='label' x='56' y='146'>funny</text>
      <text className='label' x='178' y='146'>the funniest</text>
      <text className='label' x='302' y='146'>funny</text>
    </svg>
  );
}

export function EnglishComparativeSpellingAnimation(): React.JSX.Element {
  const surfaceIds = useEnglishAnimationSurfaceIds('english-comparative-spelling');
  const cards = [
    ['big', 'bigger', 'the biggest'],
    ['funny', 'funnier', 'the funniest'],
    ['beautiful', 'more beautiful', 'the most beautiful'],
    ['good', 'better', 'the best'],
  ] as const;

  return (
    <svg
      aria-label='Animation: building comparative and superlative forms.'
      className='h-auto w-full'
      data-testid='english-comparative-spelling-animation'
      role='img'
      viewBox='0 0 420 184'
    >
      <style>{`
        .panel { stroke: rgba(56, 189, 248, 0.28); stroke-width: 2; }
        .frame { fill: none; stroke: rgba(255, 255, 255, 0.74); stroke-width: 1.6; }
        .label { font: 700 12px/1.2 "Space Grotesk", sans-serif; fill: #0f172a; }
        .hint { font: 700 10px/1.2 "Space Grotesk", sans-serif; fill: #0369a1; text-transform: uppercase; letter-spacing: 0.12em; }
      `}</style>
      <defs>
        <clipPath id={surfaceIds.clipId}>
          <rect x='16' y='16' width='388' height='152' rx='24' />
        </clipPath>
        <linearGradient id={surfaceIds.panelGradientId} x1='16' x2='404' y1='16' y2='168' gradientUnits='userSpaceOnUse'>
          <stop offset='0%' stopColor='#eff6ff' />
          <stop offset='55%' stopColor='#f8fafc' />
          <stop offset='100%' stopColor='#fdf4ff' />
        </linearGradient>
        <radialGradient id={surfaceIds.atmosphereGradientId} cx='50%' cy='40%' r='78%'>
          <stop offset='0%' stopColor='#38bdf8' stopOpacity='0.12' />
          <stop offset='100%' stopColor='#38bdf8' stopOpacity='0' />
        </radialGradient>
      </defs>
      <g clipPath={`url(#${surfaceIds.clipId})`}>
        <rect className='panel' fill={`url(#${surfaceIds.panelGradientId})`} x='16' y='16' width='388' height='152' rx='24' />
        <g data-testid='english-comparative-spelling-atmosphere'>
          <ellipse cx='100' cy='34' rx='92' ry='24' fill={`url(#${surfaceIds.atmosphereGradientId})`} data-kangur-soft-oval='true' />
          <ellipse cx='316' cy='150' rx='126' ry='28' fill={`url(#${surfaceIds.atmosphereGradientId})`} data-kangur-soft-oval='true' />
        </g>
      </g>
      <rect className='frame' data-testid='english-comparative-spelling-frame' x='22' y='22' width='376' height='140' rx='20' />
      <text className='hint' x='34' y='42'>Change the word</text>
      {cards.map((row, index) => (
        <g key={row[0]} transform={`translate(36, ${56 + index * 26})`}>
          <rect x='0' y='-14' width='348' height='20' rx='10' fill='rgba(255,255,255,0.72)' />
          <text className='label' x='10' y='0'>{row[0]}</text>
          <text className='label' x='120' y='0'>{row[1]}</text>
          <text className='label' x='242' y='0'>{row[2]}</text>
        </g>
      ))}
    </svg>
  );
}

export function EnglishComparativeRepairAnimation(): React.JSX.Element {
  const surfaceIds = useEnglishAnimationSurfaceIds('english-comparative-repair');

  return (
    <svg
      aria-label='Animation: repairing wrong comparative and superlative forms.'
      className='h-auto w-full'
      data-testid='english-comparative-repair-animation'
      role='img'
      viewBox='0 0 420 176'
    >
      <style>{`
        .panel { stroke: rgba(251, 113, 133, 0.28); stroke-width: 2; }
        .frame { fill: none; stroke: rgba(255, 255, 255, 0.74); stroke-width: 1.6; }
        .tag { font: 700 10px/1.2 "Space Grotesk", sans-serif; text-transform: uppercase; letter-spacing: 0.12em; }
        .wrong { fill: #be123c; }
        .right { fill: #15803d; }
        .line { font: 700 12px/1.2 "Space Grotesk", sans-serif; fill: #0f172a; }
        .arrow { stroke: #38bdf8; stroke-width: 3; stroke-linecap: round; stroke-linejoin: round; fill: none; }
      `}</style>
      <defs>
        <clipPath id={surfaceIds.clipId}>
          <rect x='16' y='16' width='388' height='144' rx='24' />
        </clipPath>
        <linearGradient id={surfaceIds.panelGradientId} x1='16' x2='404' y1='16' y2='160' gradientUnits='userSpaceOnUse'>
          <stop offset='0%' stopColor='#fff1f2' />
          <stop offset='50%' stopColor='#f8fafc' />
          <stop offset='100%' stopColor='#f0fdf4' />
        </linearGradient>
      </defs>
      <g clipPath={`url(#${surfaceIds.clipId})`}>
        <rect className='panel' fill={`url(#${surfaceIds.panelGradientId})`} x='16' y='16' width='388' height='144' rx='24' />
        <g data-testid='english-comparative-repair-atmosphere'>
          <ellipse cx='96' cy='36' rx='88' ry='24' fill='rgba(251,113,133,0.1)' data-kangur-soft-oval='true' />
          <ellipse cx='316' cy='146' rx='132' ry='28' fill='rgba(34,197,94,0.08)' data-kangur-soft-oval='true' />
        </g>
      </g>
      <rect className='frame' data-testid='english-comparative-repair-frame' x='22' y='22' width='376' height='132' rx='20' />
      <g transform='translate(38, 54)'>
        <text className='tag wrong' x='0' y='0'>Wrong</text>
        <text className='line' x='0' y='22'>more large → bigger</text>
        <text className='line' x='0' y='46'>gooder → better</text>
        <text className='line' x='0' y='70'>worser → worse</text>
      </g>
      <path className='arrow' d='M 182 88 L 238 88' />
      <path className='arrow' d='M 228 80 L 238 88 L 228 96' />
      <g transform='translate(256, 54)'>
        <text className='tag right' x='0' y='0'>Right</text>
        <text className='line' x='0' y='22'>bigger → the biggest</text>
        <text className='line' x='0' y='46'>better → the best</text>
        <text className='line' x='0' y='70'>worse → the worst</text>
      </g>
    </svg>
  );
}
