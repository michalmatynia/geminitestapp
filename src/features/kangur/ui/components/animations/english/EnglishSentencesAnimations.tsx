import React from 'react';
import {
  renderSoftAtmosphereGradients,
  renderSoftAtmosphereOvals,
} from '@/features/kangur/ui/components/animations/svgAtmosphere';
import { useEnglishAnimationSurfaceIds } from './EnglishAnimationSurface';

export function EnglishSentenceBlueprintAnimation(): React.JSX.Element {
  const surfaceIds = useEnglishAnimationSurfaceIds('english-sentence-blueprint');

  return (
    <svg
      aria-label='Animacja: schemat zdania Subject-Verb-Object.'
      className='h-auto w-full'
      data-testid='english-sentence-blueprint-animation'
      role='img'
      viewBox='0 0 440 140'
    >
      <style>{`
        .panel { stroke-width: 2; stroke: rgba(196, 181, 253, 0.34); }
        .block { stroke-width: 2; stroke: rgba(196, 181, 253, 0.52); }
        .label { font: 600 12px/1.2 "Space Grotesk", sans-serif; fill: #0f172a; }
        .accent { fill: rgba(167, 139, 250, 0.22); }
        .pulse-1 { animation: highlight 4.8s ease-in-out infinite; }
        .pulse-2 { animation: highlight 4.8s ease-in-out infinite; animation-delay: 1.6s; }
        .pulse-3 { animation: highlight 4.8s ease-in-out infinite; animation-delay: 3.2s; }
        .arrow { stroke: #a78bfa; stroke-width: 2; fill: none; stroke-linecap: round; stroke-linejoin: round; opacity: 0.6; }
        .frame { fill: none; stroke: rgba(255, 255, 255, 0.72); stroke-width: 1.6; }
        @keyframes highlight { 0%, 65% { opacity: 0.2; } 75%, 100% { opacity: 1; } }
        @media (prefers-reduced-motion: reduce) { .pulse-1, .pulse-2, .pulse-3 { animation: none; opacity: 1; } }
      `}</style>
      <defs>
        <clipPath id={surfaceIds.clipId}><rect x='30' y='24' width='380' height='92' rx='18' /></clipPath>
        <linearGradient id={surfaceIds.panelGradientId} x1='30' x2='410' y1='24' y2='116' gradientUnits='userSpaceOnUse'>
          <stop offset='0%' stopColor='#f5f3ff' /><stop offset='55%' stopColor='#f8fafc' /><stop offset='100%' stopColor='#eff6ff' />
        </linearGradient>
        {renderSoftAtmosphereGradients(`${surfaceIds.atmosphereGradientId}-soft`, [
          { key: 'left', cx: 112, cy: 36, rx: 82, ry: 18, color: '#a78bfa', opacity: 0.055, glowBias: '40%' },
          { key: 'right', cx: 330, cy: 114, rx: 110, ry: 20, color: '#38bdf8', opacity: 0.042, glowBias: '58%' },
        ])}
      </defs>
      <g clipPath={`url(#${surfaceIds.clipId})`}>
        <rect className='panel' fill={`url(#${surfaceIds.panelGradientId})`} height='92' rx='18' width='380' x='30' y='24' />
        {renderSoftAtmosphereOvals(`${surfaceIds.atmosphereGradientId}-soft`, [
          { key: 'left', cx: 112, cy: 36, rx: 82, ry: 18, color: '#a78bfa', opacity: 0.055, glowBias: '40%' },
          { key: 'right', cx: 330, cy: 114, rx: 110, ry: 20, color: '#38bdf8', opacity: 0.042, glowBias: '58%' },
        ])}
      </g>
      <rect className='frame' height='80' rx='14' width='368' x='36' y='30' />
      <g transform='translate(50, 44)'>
        <rect className='block' fill='rgba(255, 255, 255, 0.68)' height='52' rx='14' width='90' />
        <rect className='accent pulse-1' height='52' rx='14' width='90' />
        <text className='label' x='18' y='32'>Subject</text>
      </g>
      <g transform='translate(175, 44)'>
        <rect className='block' fill='rgba(255, 255, 255, 0.68)' height='52' rx='14' width='90' />
        <rect className='accent pulse-2' height='52' rx='14' width='90' />
        <text className='label' x='28' y='32'>Verb</text>
      </g>
      <g transform='translate(300, 44)'>
        <rect className='block' fill='rgba(255, 255, 255, 0.68)' height='52' rx='14' width='90' />
        <rect className='accent pulse-3' height='52' rx='14' width='90' />
        <text className='label' x='18' y='32'>Object</text>
      </g>
      <path className='arrow' d='M142 70 L168 70' /><path className='arrow' d='M267 70 L293 70' />
      <path className='arrow' d='M165 70 L160 65' /><path className='arrow' d='M165 70 L160 75' />
      <path className='arrow' d='M292 70 L287 65' /><path className='arrow' d='M292 70 L287 75' />
    </svg>
  );
}

export function EnglishQuestionFlipAnimation(): React.JSX.Element {
  const surfaceIds = useEnglishAnimationSurfaceIds('english-question-flip');

  return (
    <svg
      aria-label='Animacja: zdanie oznajmujące zamienia się w pytanie.'
      className='h-auto w-full'
      data-testid='english-question-flip-animation'
      role='img'
      viewBox='0 0 440 150'
    >
      <style>{`
        .panel { stroke-width: 2; stroke: rgba(167, 139, 250, 0.34); }
        .line { font: 600 12px/1.2 "Space Grotesk", sans-serif; fill: #0f172a; }
        .muted { fill: #64748b; }
        .swap-a { animation: swapFade 4.6s ease-in-out infinite; }
        .swap-b { animation: swapFade 4.6s ease-in-out infinite; animation-delay: 2.3s; }
        .accent { fill: #a78bfa; }
        .frame { fill: none; stroke: rgba(255, 255, 255, 0.72); stroke-width: 1.6; }
        @keyframes swapFade { 0%, 45% { opacity: 1; } 55%, 100% { opacity: 0.15; } }
        @media (prefers-reduced-motion: reduce) { .swap-a, .swap-b { animation: none; opacity: 1; } }
      `}</style>
      <defs>
        <clipPath id={surfaceIds.clipId}><rect x='30' y='24' width='380' height='100' rx='18' /></clipPath>
        <linearGradient id={surfaceIds.panelGradientId} x1='30' x2='410' y1='24' y2='124' gradientUnits='userSpaceOnUse'>
          <stop offset='0%' stopColor='#f5f3ff' /><stop offset='55%' stopColor='#f8fafc' /><stop offset='100%' stopColor='#eef2ff' />
        </linearGradient>
        {renderSoftAtmosphereGradients(`${surfaceIds.atmosphereGradientId}-soft`, [
          { key: 'left', cx: 102, cy: 36, rx: 84, ry: 18, color: '#a78bfa', opacity: 0.055, glowBias: '40%' },
          { key: 'right', cx: 328, cy: 120, rx: 112, ry: 22, color: '#60a5fa', opacity: 0.042, glowBias: '58%' },
        ])}
      </defs>
      <g clipPath={`url(#${surfaceIds.clipId})`}>
        <rect className='panel' fill={`url(#${surfaceIds.panelGradientId})`} height='100' rx='18' width='380' x='30' y='24' />
        {renderSoftAtmosphereOvals(`${surfaceIds.atmosphereGradientId}-soft`, [
          { key: 'left', cx: 102, cy: 36, rx: 84, ry: 18, color: '#a78bfa', opacity: 0.055, glowBias: '40%' },
          { key: 'right', cx: 328, cy: 120, rx: 112, ry: 22, color: '#60a5fa', opacity: 0.042, glowBias: '58%' },
        ])}
      </g>
      <rect className='frame' height='88' rx='14' width='368' x='36' y='30' />
      <circle className='accent' cx='56' cy='50' r='6' /><circle className='accent' cx='56' cy='86' r='6' opacity='0.4' />
      <g className='swap-a'>
        <text className='line' x='74' y='54'>You play the guitar.</text>
        <text className='line muted' x='74' y='76'>Statement</text>
      </g>
      <g className='swap-b'>
        <text className='line' x='74' y='54'>Do you play the guitar?</text>
        <text className='line muted' x='74' y='76'>Question with do</text>
      </g>
    </svg>
  );
}

export function EnglishConnectorBridgeAnimation(): React.JSX.Element {
  const surfaceIds = useEnglishAnimationSurfaceIds('english-connector-bridge');

  return (
    <svg
      aria-label='Animacja: dwa zdania połączone spójnikiem.'
      className='h-auto w-full'
      data-testid='english-connector-bridge-animation'
      role='img'
      viewBox='0 0 440 150'
    >
      <style>{`
        .card { stroke-width: 2; stroke: rgba(148, 163, 184, 0.28); }
        .connector { stroke: #f59e0b; stroke-width: 1.5; }
        .text { font: 600 12px/1.2 "Space Grotesk", sans-serif; fill: #0f172a; }
        .frame { fill: none; stroke: rgba(255, 255, 255, 0.72); stroke-width: 1.5; }
        .pulse { animation: pulse 3.8s ease-in-out infinite; }
        @keyframes pulse { 0%, 100% { transform: scale(1); opacity: 0.7; } 50% { transform: scale(1.05); opacity: 1; } }
        @media (prefers-reduced-motion: reduce) { .pulse { animation: none; opacity: 1; } }
      `}</style>
      <defs>
        <linearGradient id={`${surfaceIds.panelGradientId}-left`} x1='24' x2='194' y1='30' y2='116' gradientUnits='userSpaceOnUse'>
          <stop offset='0%' stopColor='#eff6ff' /><stop offset='100%' stopColor='#f8fafc' />
        </linearGradient>
        <linearGradient id={`${surfaceIds.panelGradientId}-right`} x1='246' x2='416' y1='30' y2='116' gradientUnits='userSpaceOnUse'>
          <stop offset='0%' stopColor='#f8fafc' /><stop offset='100%' stopColor='#fff7ed' />
        </linearGradient>
        <linearGradient id={surfaceIds.accentGradientId} x1='190' x2='250' y1='60' y2='90' gradientUnits='userSpaceOnUse'>
          <stop offset='0%' stopColor='#fde68a' /><stop offset='100%' stopColor='#f59e0b' />
        </linearGradient>
      </defs>
      <g transform='translate(24, 30)'>
        <rect className='card' fill={`url(#${surfaceIds.panelGradientId}-left)`} height='86' rx='16' width='170' />
        <rect className='frame' x='4' y='4' width='162' height='78' rx='13' />
        <text className='text' x='16' y='38'>I finished my essay</text>
        <text className='text' x='16' y='60'>before class.</text>
      </g>
      <g transform='translate(246, 30)'>
        <rect className='card' fill={`url(#${surfaceIds.panelGradientId}-right)`} height='86' rx='16' width='170' />
        <rect className='frame' x='4' y='4' width='162' height='78' rx='13' />
        <text className='text' x='16' y='38'>so I helped my</text>
        <text className='text' x='16' y='60'>friend revise.</text>
      </g>
      <g className='pulse' transform='translate(190, 60)'>
        <rect className='connector' fill={`url(#${surfaceIds.accentGradientId})`} height='30' rx='12' width='60' />
        <text className='text' x='18' y='20'>so</text>
      </g>
      <path d='M194 75 L246 75' stroke='#f59e0b' strokeWidth='2' fill='none' opacity='0.6' />
    </svg>
  );
}
