import React from 'react';
import {
  renderSoftAtmosphereGradients,
  renderSoftAtmosphereOvals,
} from '@/features/kangur/ui/components/animations/svgAtmosphere';
import { useEnglishAnimationSurfaceIds } from './EnglishAnimationSurface';

export function EnglishArticleFocusAnimation(): React.JSX.Element {
  const baseIds = useEnglishAnimationSurfaceIds('english-article-focus');
  const panelAGradientId = `${baseIds.panelGradientId}-a`;
  const panelBGradientId = `${baseIds.panelGradientId}-b`;
  const panelAClipId = `${baseIds.clipId}-a`;
  const panelBClipId = `${baseIds.clipId}-b`;
  const haloGradientId = `${baseIds.accentGradientId}-halo`;
  const locatorGradientId = `${baseIds.accentGradientId}-locator`;

  return (
    <svg
      aria-label='Animacja: a triangle kontra the triangle.'
      className='h-auto w-full'
      data-testid='english-article-focus-animation'
      role='img'
      viewBox='0 0 380 140'
    >
      <style>{`
        .panel { stroke: rgba(148, 163, 184, 0.34); stroke-width: 2; }
        .label { font: 700 12px/1.2 "Space Grotesk", "IBM Plex Sans", sans-serif; fill: #f59e0b; }
        .text { font: 600 12px/1.2 "Space Grotesk", "IBM Plex Sans", sans-serif; fill: #0f172a; }
        .triangle { fill: url(#${haloGradientId}); }
        .pulse { animation: focusPulse 4s ease-in-out infinite; }
        .pulse-2 { animation-delay: 2s; }
        .locator { fill: url(#${locatorGradientId}); filter: drop-shadow(0 4px 10px rgba(14, 165, 233, 0.35)); }
        .focus-ring { stroke: rgba(56, 189, 248, 0.92); stroke-width: 3; fill: none; stroke-dasharray: 5 7; }
        .shadow { fill: rgba(15, 23, 42, 0.12); }
        @keyframes focusPulse { 0%, 100% { opacity: 0.35; } 40% { opacity: 1; } }
        @media (prefers-reduced-motion: reduce) { .pulse, .pulse-2 { animation: none; opacity: 1; } }
      `}</style>
      <defs>
        <clipPath id={panelAClipId}>
          <rect height='92' rx='16' width='150' x='24' y='24' />
        </clipPath>
        <clipPath id={panelBClipId}>
          <rect height='92' rx='16' width='150' x='206' y='24' />
        </clipPath>
        <linearGradient id={panelAGradientId} x1='24' x2='174' y1='24' y2='116' gradientUnits='userSpaceOnUse'>
          <stop offset='0%' stopColor='#fff7ed' />
          <stop offset='100%' stopColor='#ffedd5' />
        </linearGradient>
        <linearGradient id={panelBGradientId} x1='206' x2='356' y1='24' y2='116' gradientUnits='userSpaceOnUse'>
          <stop offset='0%' stopColor='#eff6ff' />
          <stop offset='100%' stopColor='#dbeafe' />
        </linearGradient>
        <linearGradient id={haloGradientId} x1='40' x2='118' y1='36' y2='82' gradientUnits='userSpaceOnUse'>
          <stop offset='0%' stopColor='#fde68a' />
          <stop offset='100%' stopColor='#f59e0b' />
        </linearGradient>
        <radialGradient id={locatorGradientId} cx='50%' cy='50%' r='70%'>
          <stop offset='0%' stopColor='#e0f2fe' />
          <stop offset='100%' stopColor='#0ea5e9' />
        </radialGradient>
        {renderSoftAtmosphereGradients(`${baseIds.atmosphereGradientId}-soft`, [
          { key: 'panel-a-top', cx: 78, cy: 46, rx: 54, ry: 24, color: '#f59e0b', opacity: 0.075, glowBias: '42%' },
          { key: 'panel-a-bottom', cx: 146, cy: 104, rx: 46, ry: 18, color: '#fbbf24', opacity: 0.05, glowBias: '58%' },
          { key: 'panel-b-top', cx: 248, cy: 42, rx: 50, ry: 22, color: '#3b82f6', opacity: 0.06, glowBias: '42%' },
          { key: 'panel-b-bottom', cx: 322, cy: 104, rx: 52, ry: 20, color: '#38bdf8', opacity: 0.05, glowBias: '58%' },
        ])}
      </defs>
      <g data-testid='english-article-focus-atmosphere'>
        <g clipPath={`url(#${panelAClipId})`}>
          {renderSoftAtmosphereOvals(`${baseIds.atmosphereGradientId}-soft`, [
            { key: 'panel-a-top', cx: 78, cy: 46, rx: 54, ry: 24, color: '#f59e0b', opacity: 0.075, glowBias: '42%' },
            { key: 'panel-a-bottom', cx: 146, cy: 104, rx: 46, ry: 18, color: '#fbbf24', opacity: 0.05, glowBias: '58%' },
          ])}
        </g>
        <g clipPath={`url(#${panelBClipId})`}>
          {renderSoftAtmosphereOvals(`${baseIds.atmosphereGradientId}-soft`, [
            { key: 'panel-b-top', cx: 248, cy: 42, rx: 50, ry: 22, color: '#3b82f6', opacity: 0.06, glowBias: '42%' },
            { key: 'panel-b-bottom', cx: 322, cy: 104, rx: 52, ry: 20, color: '#38bdf8', opacity: 0.05, glowBias: '58%' },
          ])}
        </g>
      </g>
      <g transform='translate(24, 24)'>
        <rect className='panel' fill={`url(#${panelAGradientId})`} height='92' rx='16' width='150' />
        <rect fill='none' height='84' rx='13' stroke='rgba(255, 255, 255, 0.72)' strokeWidth='1.5' width='142' x='4' y='4' />
        <text className='label pulse' x='18' y='26'>a</text>
        <text className='text' x='34' y='26'>triangle</text>
        <ellipse className='shadow' cx='75' cy='82' rx='42' ry='8' />
        <polygon className='triangle' points='40,80 110,80 75,36' />
      </g>
      <g transform='translate(206, 24)'>
        <rect className='panel' fill={`url(#${panelBGradientId})`} height='92' rx='16' width='150' />
        <rect fill='none' height='84' rx='13' stroke='rgba(255, 255, 255, 0.74)' strokeWidth='1.5' width='142' x='4' y='4' />
        <text className='label pulse-2' x='18' y='26'>the</text>
        <text className='text' x='46' y='26'>triangle</text>
        <ellipse className='shadow' cx='75' cy='82' rx='42' ry='8' />
        <circle className='focus-ring pulse-2' cx='75' cy='58' r='36' />
        <polygon className='triangle' points='40,80 110,80 75,36' />
        <circle className='locator' cx='118' cy='36' r='6' />
      </g>
    </svg>
  );
}

export function EnglishArticleVowelAnimation(): React.JSX.Element {
  const baseIds = useEnglishAnimationSurfaceIds('english-article-vowel');
  const cards = [
    { article: 'an', word: 'equation', fill: '#fff7ed', accent: '#f97316', soft: '#fdba74' },
    { article: 'a', word: 'graph', fill: '#eff6ff', accent: '#0ea5e9', soft: '#7dd3fc' },
    { article: 'an', word: 'angle', fill: '#fdf4ff', accent: '#c084fc', soft: '#d8b4fe' },
  ] as const;

  return (
    <svg
      aria-label='Animacja: a/an zależne od dźwięku.'
      className='h-auto w-full'
      data-testid='english-article-vowel-animation'
      role='img'
      viewBox='0 0 420 140'
    >
      <style>{`
        .card { stroke-width: 2; stroke: rgba(148, 163, 184, 0.28); }
        .tag { font: 700 12px/1.2 "Space Grotesk", "IBM Plex Sans", sans-serif; fill: #0f172a; }
        .word { font: 600 12px/1.2 "Space Grotesk", "IBM Plex Sans", sans-serif; fill: #0f172a; }
        .frame { fill: none; stroke: rgba(255, 255, 255, 0.7); stroke-width: 1.5; }
        .pulse { animation: tagPulse 3.6s ease-in-out infinite; }
        .pulse-2 { animation-delay: 1.2s; }
        .pulse-3 { animation-delay: 2.4s; }
        @keyframes tagPulse { 0%, 100% { opacity: 0.4; transform: translateY(1px); } 40% { opacity: 1; transform: translateY(-1px); } }
        @media (prefers-reduced-motion: reduce) { .pulse, .pulse-2, .pulse-3 { animation: none; opacity: 1; } }
      `}</style>
      <defs>
        {cards.map((item, index) => {
          const cardGradientId = `${baseIds.panelGradientId}-${item.word}`;
          const cardClipId = `${baseIds.clipId}-${item.word}`;
          return (
            <React.Fragment key={`defs-${item.word}`}>
              <clipPath id={cardClipId}><rect height='92' rx='16' width='120' x={24 + index * 130} y='24' /></clipPath>
              <linearGradient id={cardGradientId} x1={24 + index * 130} x2={144 + index * 130} y1='24' y2='116' gradientUnits='userSpaceOnUse'>
                <stop offset='0%' stopColor={item.fill} />
                <stop offset='100%' stopColor='#ffffff' />
              </linearGradient>
            </React.Fragment>
          );
        })}
      </defs>
      <g data-testid='english-article-vowel-atmosphere'>
        {cards.map((item, index) => (
          <g key={`atm-${item.word}`} clipPath={`url(#${baseIds.clipId}-${item.word})`}>
            <ellipse cx={62 + index * 130} cy='44' fill={item.soft} opacity='0.18' rx='38' ry='18' />
            <ellipse cx={114 + index * 130} cy='102' fill={item.soft} opacity='0.12' rx='36' ry='14' />
          </g>
        ))}
      </g>
      {cards.map((item, index) => (
        <g key={item.word} transform={`translate(${24 + index * 130}, 24)`}>
          <rect className='card' fill={`url(#${baseIds.panelGradientId}-${item.word})`} height='92' rx='16' width='120' />
          <rect className='frame' height='84' rx='13' width='112' x='4' y='4' />
          <rect fill={item.accent} height='16' opacity='0.14' rx='8' width='38' x='14' y='16' />
          <text className={`tag pulse pulse-${index + 1}`} fill={item.accent} x='16' y='30'>{item.article}</text>
          <text className='word' x='48' y='30'>{item.word}</text>
          <rect fill={item.soft} height='10' rx='5' width='74' x='20' y='50' />
          <rect fill={item.accent} height='10' opacity='0.82' rx='5' width='56' x='20' y='66' />
        </g>
      ))}
    </svg>
  );
}

export function EnglishZeroArticleAnimation(): React.JSX.Element {
  const surfaceIds = useEnglishAnimationSurfaceIds('english-zero-article');

  return (
    <svg
      aria-label='Animacja: brak przedimka z math, homework i graphs.'
      className='h-auto w-full'
      data-testid='english-zero-article-animation'
      role='img'
      viewBox='0 0 360 140'
    >
      <style>{`
        .panel { stroke-width: 2; stroke: rgba(248, 113, 113, 0.3); }
        .word { font: 700 13px/1.2 "Space Grotesk", "IBM Plex Sans", sans-serif; fill: #0f172a; }
        .frame { fill: none; stroke: rgba(255, 255, 255, 0.72); stroke-width: 1.6; }
        .strike { stroke: #f87171; stroke-width: 4; stroke-linecap: round; animation: strikePulse 3.4s ease-in-out infinite; }
        @keyframes strikePulse { 0%, 100% { opacity: 0.35; } 45% { opacity: 1; } }
        @media (prefers-reduced-motion: reduce) { .strike { animation: none; opacity: 1; } }
      `}</style>
      <defs>
        <clipPath id={surfaceIds.clipId}><rect x='20' y='24' width='320' height='90' rx='18' /></clipPath>
        <linearGradient id={surfaceIds.panelGradientId} x1='20' x2='340' y1='24' y2='114' gradientUnits='userSpaceOnUse'>
          <stop offset='0%' stopColor='#fff1f2' />
          <stop offset='100%' stopColor='#fff7ed' />
        </linearGradient>
      </defs>
      <g clipPath={`url(#${surfaceIds.clipId})`}>
        <rect className='panel' fill={`url(#${surfaceIds.panelGradientId})`} height='90' rx='18' width='320' x='20' y='24' />
      </g>
      <rect className='frame' x='26' y='30' width='308' height='78' rx='14' />
      <text className='word' x='40' y='60'>math</text>
      <text className='word' x='120' y='60'>homework</text>
      <text className='word' x='230' y='60'>graphs</text>
      <text className='word' x='40' y='90'>no article</text>
      <line className='strike' x1='40' x2='110' y1='44' y2='44' />
    </svg>
  );
}
