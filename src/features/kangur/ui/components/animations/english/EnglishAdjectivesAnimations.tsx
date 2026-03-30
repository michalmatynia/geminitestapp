import React from 'react';
import {
  renderSoftAtmosphereGradients,
  renderSoftAtmosphereOvals,
} from '@/features/kangur/ui/components/animations/svgAtmosphere';
import { useEnglishAnimationSurfaceIds } from './EnglishAnimationSurface';

export function EnglishAdjectiveRoomAnimation(): React.JSX.Element {
  const surfaceIds = useEnglishAnimationSurfaceIds('english-adjective-room');

  return (
    <svg
      aria-label='Animacja: zwykły pokój zamienia się w pokój opisany przymiotnikami.'
      className='h-auto w-full'
      data-testid='english-adjective-room-animation'
      role='img'
      viewBox='0 0 420 190'
    >
      <style>{`
        .wall { stroke-width: 2; stroke: rgba(147, 197, 253, 0.34); }
        .floor { fill: url(#${surfaceIds.accentGradientId}); }
        .label { font: 700 12px/1.2 "Space Grotesk", sans-serif; fill: #3730a3; text-transform: uppercase; letter-spacing: 0.08em; }
        .text { font: 600 12px/1.2 "Space Grotesk", sans-serif; fill: #0f172a; }
        .cupboard { animation: cupboardGrow 4.2s ease-in-out infinite; transform-origin: 90px 122px; }
        .curtains { animation: curtainsStretch 4.2s ease-in-out infinite; transform-origin: 304px 46px; }
        .rug { animation: rugWave 4.2s ease-in-out infinite; transform-origin: 208px 150px; }
        .sparkle { animation: sparkleBlink 2.2s ease-in-out infinite; }
        .frame { fill: none; stroke: rgba(255, 255, 255, 0.72); stroke-width: 1.6; }
        @keyframes cupboardGrow { 0%, 20% { transform: scale(1); fill: #d6b89b; } 45%, 100% { transform: scale(1.15, 1.08); fill: #facc15; } }
        @keyframes curtainsStretch { 0%, 20% { transform: scaleY(1); fill: #cbd5f5; } 45%, 100% { transform: scaleY(1.26); fill: #60a5fa; } }
        @keyframes rugWave { 0%, 20% { transform: scaleX(1); } 45%, 100% { transform: scaleX(1.06); } }
        @keyframes sparkleBlink { 0%, 100% { opacity: 0.3; transform: scale(0.92); } 50% { opacity: 1; transform: scale(1); } }
        @media (prefers-reduced-motion: reduce) { .cupboard, .curtains, .rug, .sparkle { animation: none; } }
      `}</style>
      <defs>
        <clipPath id={surfaceIds.clipId}><rect x='19' y='18' width='382' height='140' rx='22' /></clipPath>
        <linearGradient id={surfaceIds.panelGradientId} x1='19' x2='401' y1='18' y2='158' gradientUnits='userSpaceOnUse'>
          <stop offset='0%' stopColor='#eef2ff' /><stop offset='58%' stopColor='#f8fafc' /><stop offset='100%' stopColor='#eff6ff' />
        </linearGradient>
        {renderSoftAtmosphereGradients(`${surfaceIds.atmosphereGradientId}-soft`, [
          { key: 'top', cx: 104, cy: 40, rx: 86, ry: 26, color: '#6366f1', opacity: 0.05, glowBias: '40%' },
          { key: 'bottom', cx: 312, cy: 146, rx: 126, ry: 28, color: '#6366f1', opacity: 0.065, glowBias: '58%' },
        ])}
        <linearGradient id={surfaceIds.accentGradientId} x1='19' x2='401' y1='126' y2='168' gradientUnits='userSpaceOnUse'>
          <stop offset='0%' stopColor='#e2e8f0' /><stop offset='100%' stopColor='#cbd5e1' />
        </linearGradient>
        <linearGradient id={`${surfaceIds.panelGradientId}-cupboard`} x1='56' x2='128' y1='74' y2='152' gradientUnits='userSpaceOnUse'>
          <stop offset='0%' stopColor='#fcd34d' /><stop offset='100%' stopColor='#b45309' />
        </linearGradient>
        <linearGradient id={`${surfaceIds.panelGradientId}-curtains`} x1='264' x2='344' y1='56' y2='124' gradientUnits='userSpaceOnUse'>
          <stop offset='0%' stopColor='#93c5fd' /><stop offset='100%' stopColor='#2563eb' />
        </linearGradient>
        <linearGradient id={`${surfaceIds.panelGradientId}-rug`} x1='146' x2='266' y1='120' y2='156' gradientUnits='userSpaceOnUse'>
          <stop offset='0%' stopColor='#fdba74' /><stop offset='100%' stopColor='#f97316' />
        </linearGradient>
      </defs>
      <g clipPath={`url(#${surfaceIds.clipId})`}>
        <rect className='wall' fill={`url(#${surfaceIds.panelGradientId})`} height='140' rx='22' width='382' x='19' y='18' />
        {renderSoftAtmosphereOvals(`${surfaceIds.atmosphereGradientId}-soft`, [
          { key: 'top', cx: 104, cy: 40, rx: 86, ry: 26, color: '#6366f1', opacity: 0.05, glowBias: '40%' },
          { key: 'bottom', cx: 312, cy: 146, rx: 126, ry: 28, color: '#6366f1', opacity: 0.065, glowBias: '58%' },
        ])}
      </g>
      <rect className='frame' height='128' rx='18' width='370' x='25' y='24' />
      <rect className='floor' height='42' rx='16' width='382' x='19' y='126' />
      <text className='label' x='36' y='40'>plain room</text>
      <text className='text' x='36' y='58'>add adjectives and the room changes</text>
      <g className='cupboard'>
        <rect x='56' y='74' width='72' height='78' rx='14' fill={`url(#${surfaceIds.panelGradientId}-cupboard)`} stroke='#8b5e3c' strokeWidth='2' />
        <line x1='92' y1='84' x2='92' y2='142' stroke='#78350f' strokeWidth='2' />
      </g>
      <g className='curtains'>
        <rect x='258' y='46' width='92' height='10' rx='5' fill='#94a3b8' />
        <rect x='264' y='56' width='28' height='64' rx='10' fill={`url(#${surfaceIds.panelGradientId}-curtains)`} />
        <rect x='316' y='56' width='28' height='64' rx='10' fill={`url(#${surfaceIds.panelGradientId}-curtains)`} />
      </g>
      <g className='rug'>
        <ellipse cx='206' cy='142' rx='64' ry='18' fill='#cbd5e1' opacity='0.45' />
        <ellipse cx='206' cy='138' rx='60' ry='18' fill={`url(#${surfaceIds.panelGradientId}-rug)`} stroke='#fb923c' strokeWidth='2' />
      </g>
      <g className='sparkle'>
        <circle cx='144' cy='62' r='5' fill='#f59e0b' /><circle cx='338' cy='36' r='4' fill='#a855f7' /><circle cx='258' cy='150' r='4' fill='#38bdf8' />
      </g>
    </svg>
  );
}

export function EnglishAdjectiveOrderAnimation(): React.JSX.Element {
  const surfaceIds = useEnglishAnimationSurfaceIds('english-adjective-order');

  return (
    <svg
      aria-label='Animacja: przymiotniki ustawiają się przed rzeczownikiem.'
      className='h-auto w-full'
      data-testid='english-adjective-order-animation'
      role='img'
      viewBox='0 0 420 150'
    >
      <style>{`
        .panel { stroke-width: 2; stroke: rgba(147, 197, 253, 0.34); }
        .card { stroke-width: 2; }
        .adj { stroke: #818cf8; animation: slideAdj 4.4s ease-in-out infinite; }
        .adj-2 { animation-delay: 0.3s; }
        .noun { stroke: #f59e0b; }
        .label { font: 700 12px/1.2 "Space Grotesk", sans-serif; fill: #1e293b; }
        .hint { font: 600 11px/1.2 "Space Grotesk", sans-serif; fill: #64748b; }
        .guide { fill: rgba(255, 255, 255, 0.58); stroke: rgba(255, 255, 255, 0.74); stroke-width: 1.4; }
        .frame { fill: none; stroke: rgba(255, 255, 255, 0.72); stroke-width: 1.6; }
        .order-line { stroke: rgba(99, 102, 241, 0.42); stroke-width: 2; stroke-dasharray: 4 6; }
        @keyframes slideAdj { 0%, 18% { transform: translateX(108px); opacity: 0.55; } 38%, 100% { transform: translateX(0); opacity: 1; } }
        @media (prefers-reduced-motion: reduce) { .adj, .adj-2 { animation: none; opacity: 1; transform: translateX(0); } }
      `}</style>
      <defs>
        <clipPath id={surfaceIds.clipId}><rect x='16' y='18' width='388' height='112' rx='20' /></clipPath>
        <linearGradient id={surfaceIds.panelGradientId} x1='16' x2='404' y1='18' y2='130' gradientUnits='userSpaceOnUse'>
          <stop offset='0%' stopColor='#eef2ff' /><stop offset='56%' stopColor='#f8fafc' /><stop offset='100%' stopColor='#fff7ed' />
        </linearGradient>
        {renderSoftAtmosphereGradients(`${surfaceIds.atmosphereGradientId}-soft`, [
          { key: 'top', cx: 98, cy: 40, rx: 92, ry: 24, color: '#6366f1', opacity: 0.052, glowBias: '40%' },
          { key: 'bottom', cx: 318, cy: 126, rx: 126, ry: 26, color: '#6366f1', opacity: 0.065, glowBias: '58%' },
        ])}
        <linearGradient id={surfaceIds.accentGradientId} x1='48' x2='330' y1='66' y2='100' gradientUnits='userSpaceOnUse'>
          <stop offset='0%' stopColor='#e0e7ff' /><stop offset='65%' stopColor='#fef3c7' /><stop offset='100%' stopColor='#fde68a' />
        </linearGradient>
        <linearGradient id={`${surfaceIds.panelGradientId}-small`} x1='48' x2='132' y1='66' y2='100' gradientUnits='userSpaceOnUse'>
          <stop offset='0%' stopColor='#eef2ff' /><stop offset='100%' stopColor='#c7d2fe' />
        </linearGradient>
        <linearGradient id={`${surfaceIds.panelGradientId}-blue`} x1='140' x2='220' y1='66' y2='100' gradientUnits='userSpaceOnUse'>
          <stop offset='0%' stopColor='#dbeafe' /><stop offset='100%' stopColor='#93c5fd' />
        </linearGradient>
      </defs>
      <g clipPath={`url(#${surfaceIds.clipId})`}>
        <rect className='panel' fill={`url(#${surfaceIds.panelGradientId})`} height='112' rx='20' width='388' x='16' y='18' />
        {renderSoftAtmosphereOvals(`${surfaceIds.atmosphereGradientId}-soft`, [
          { key: 'top', cx: 98, cy: 40, rx: 92, ry: 24, color: '#6366f1', opacity: 0.052, glowBias: '40%' },
          { key: 'bottom', cx: 318, cy: 126, rx: 126, ry: 26, color: '#6366f1', opacity: 0.065, glowBias: '58%' },
        ])}
      </g>
      <rect className='frame' height='100' rx='16' width='376' x='22' y='24' />
      <text className='hint' x='36' y='42'>Adjectives come before the noun.</text>
      <rect className='guide' x='40' y='54' width='320' height='40' rx='18' />
      <line className='order-line' x1='52' x2='344' y1='86' y2='86' />
      <g transform='translate(48,66)'>
        <g className='adj'>
          <rect className='card adj' x='0' y='0' width='84' height='34' rx='12' fill={`url(#${surfaceIds.panelGradientId}-small)`} />
          <text className='label' x='22' y='22'>small</text>
        </g>
        <g className='adj adj-2' transform='translate(92,0)'>
          <rect className='card adj' x='0' y='0' width='80' height='34' rx='12' fill={`url(#${surfaceIds.panelGradientId}-blue)`} />
          <text className='label' x='24' y='22'>blue</text>
        </g>
        <g transform='translate(184,0)'>
          <rect className='card noun' x='0' y='0' width='98' height='34' rx='12' fill={`url(#${surfaceIds.accentGradientId})`} />
          <text className='label' x='25' y='22'>teddy</text>
        </g>
      </g>
      <text className='hint' x='48' y='118'>small blue teddy</text>
    </svg>
  );
}

export function EnglishAdjectiveRepairAnimation(): React.JSX.Element {
  const surfaceIds = useEnglishAnimationSurfaceIds('english-adjective-repair');

  return (
    <svg
      aria-label='Animacja: błędny zapis przymiotnika zamienia się w poprawny.'
      className='h-auto w-full'
      data-testid='english-adjective-repair-animation'
      role='img'
      viewBox='0 0 420 150'
    >
      <style>{`
        .panel { stroke-width: 2; stroke: rgba(251, 191, 36, 0.34); }
        .bad { animation: badFade 4.6s ease-in-out infinite; }
        .good { animation: goodFade 4.6s ease-in-out infinite; }
        .line { font: 700 13px/1.2 "Space Grotesk", sans-serif; }
        .line-bad { fill: #be123c; }
        .line-good { fill: #15803d; }
        .cross { stroke: #e11d48; stroke-width: 3; stroke-linecap: round; }
        .hint { font: 600 11px/1.2 "Space Grotesk", sans-serif; fill: #7c2d12; }
        .frame { fill: none; stroke: rgba(255, 255, 255, 0.72); stroke-width: 1.6; }
        @keyframes badFade { 0%, 42% { opacity: 1; } 52%, 100% { opacity: 0; } }
        @keyframes goodFade { 0%, 46% { opacity: 0; } 56%, 100% { opacity: 1; } }
        @media (prefers-reduced-motion: reduce) { .bad, .good { animation: none; opacity: 1; } }
      `}</style>
      <defs>
        <clipPath id={surfaceIds.clipId}><rect x='16' y='18' width='388' height='112' rx='20' /></clipPath>
        <linearGradient id={surfaceIds.panelGradientId} x1='16' x2='404' y1='18' y2='130' gradientUnits='userSpaceOnUse'>
          <stop offset='0%' stopColor='#fff7ed' /><stop offset='58%' stopColor='#fefce8' /><stop offset='100%' stopColor='#f0fdf4' />
        </linearGradient>
        {renderSoftAtmosphereGradients(`${surfaceIds.atmosphereGradientId}-soft`, [
          { key: 'top', cx: 104, cy: 42, rx: 88, ry: 24, color: '#f97316', opacity: 0.052, glowBias: '40%' },
          { key: 'bottom', cx: 320, cy: 126, rx: 128, ry: 26, color: '#f97316', opacity: 0.065, glowBias: '58%' },
        ])}
      </defs>
      <g clipPath={`url(#${surfaceIds.clipId})`}>
        <rect className='panel' fill={`url(#${surfaceIds.panelGradientId})`} height='112' rx='20' width='388' x='16' y='18' />
        {renderSoftAtmosphereOvals(`${surfaceIds.atmosphereGradientId}-soft`, [
          { key: 'top', cx: 104, cy: 42, rx: 88, ry: 24, color: '#f97316', opacity: 0.052, glowBias: '40%' },
          { key: 'bottom', cx: 320, cy: 126, rx: 128, ry: 26, color: '#f97316', opacity: 0.065, glowBias: '58%' },
        ])}
      </g>
      <rect className='frame' height='100' rx='16' width='376' x='22' y='24' />
      <text className='hint' x='34' y='42'>Fix the ending and the order.</text>
      <g className='bad'>
        <text className='line line-bad' x='34' y='78'>two reds shoes</text>
        <line className='cross' x1='30' y1='84' x2='180' y2='58' />
        <text className='line line-bad' x='222' y='78'>a car small</text>
        <line className='cross' x1='218' y1='84' x2='344' y2='58' />
      </g>
      <g className='good'>
        <text className='line line-good' x='34' y='78'>two red shoes</text>
        <text className='line line-good' x='222' y='78'>a small car</text>
      </g>
    </svg>
  );
}
