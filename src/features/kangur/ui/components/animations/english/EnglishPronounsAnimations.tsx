'use client';

import React from 'react';
import {
  renderSoftAtmosphereGradients,
  renderSoftAtmosphereOvals,
} from '@/features/kangur/ui/components/animations/svgAtmosphere';
import { useEnglishAnimationSurfaceIds } from './EnglishAnimationSurface';

export function EnglishPronounSwapAnimation(): React.JSX.Element {
  const surfaceIds = useEnglishAnimationSurfaceIds('english-pronoun-swap');

  return (
    <svg
      aria-label='Animacja: imię zamieniane na zaimek w zdaniu matematycznym.'
      className='h-auto w-full'
      data-testid='english-pronoun-swap-animation'
      role='img'
      viewBox='0 0 380 140'
    >
      <style>{`
        .panel {
          stroke-width: 2;
          stroke: rgba(125, 211, 252, 0.34);
        }
        .accent {
          fill: url(#${surfaceIds.accentGradientId});
        }
        .line {
          font: 600 13px/1.2 "Space Grotesk", "IBM Plex Sans", sans-serif;
          fill: #0f172a;
        }
        .line-muted {
          fill: #64748b;
          font: 600 12px/1.2 "Space Grotesk", "IBM Plex Sans", sans-serif;
        }
        .frame {
          fill: none;
          stroke: rgba(255, 255, 255, 0.72);
          stroke-width: 1.6;
        }
        .swap-a { animation: swapA 4.4s ease-in-out infinite; }
        .swap-b { animation: swapB 4.4s ease-in-out infinite; }
        @keyframes swapA {
          0%, 45% { opacity: 1; }
          55%, 100% { opacity: 0; }
        }
        @keyframes swapB {
          0%, 55% { opacity: 0; }
          65%, 100% { opacity: 1; }
        }
        @media (prefers-reduced-motion: reduce) {
          .swap-a, .swap-b { animation: none; opacity: 1; }
        }
      `}</style>
      <defs>
        <clipPath id={surfaceIds.clipId}>
          <rect x='20' y='20' width='340' height='90' rx='18' />
        </clipPath>
        <linearGradient id={surfaceIds.panelGradientId} x1='20' x2='360' y1='20' y2='110' gradientUnits='userSpaceOnUse'>
          <stop offset='0%' stopColor='#eff6ff' />
          <stop offset='55%' stopColor='#f8fafc' />
          <stop offset='100%' stopColor='#f0fdf4' />
        </linearGradient>
        <radialGradient id={surfaceIds.atmosphereGradientId} cx='50%' cy='40%' r='76%'>
          <stop offset='0%' stopColor='rgba(56, 189, 248, 0.16)' />
          <stop offset='100%' stopColor='rgba(56, 189, 248, 0)' />
        </radialGradient>
        {renderSoftAtmosphereGradients(`${surfaceIds.atmosphereGradientId}-soft`, [
          { key: 'top', cx: 86, cy: 34, rx: 64, ry: 18, color: '#38bdf8', opacity: 0.055, glowBias: '38%' },
          { key: 'bottom', cx: 300, cy: 108, rx: 110, ry: 24, color: '#38bdf8', opacity: 0.07, glowBias: '58%' },
        ])}
        <linearGradient id={surfaceIds.accentGradientId} x1='40' x2='100' y1='34' y2='42' gradientUnits='userSpaceOnUse'>
          <stop offset='0%' stopColor='#38bdf8' />
          <stop offset='100%' stopColor='#22c55e' />
        </linearGradient>
      </defs>
      <g clipPath={`url(#${surfaceIds.clipId})`} data-testid='english-pronoun-swap-atmosphere'>
        <rect className='panel' fill={`url(#${surfaceIds.panelGradientId})`} height='90' rx='18' width='340' x='20' y='20' />
        {renderSoftAtmosphereOvals(`${surfaceIds.atmosphereGradientId}-soft`, [
          { key: 'top', cx: 86, cy: 34, rx: 64, ry: 18, color: '#38bdf8', opacity: 0.055, glowBias: '38%' },
          { key: 'bottom', cx: 300, cy: 108, rx: 110, ry: 24, color: '#38bdf8', opacity: 0.07, glowBias: '58%' },
        ])}
      </g>
      <rect
        className='frame'
        data-testid='english-pronoun-swap-frame'
        x='26'
        y='26'
        width='328'
        height='78'
        rx='14'
      />
      <rect className='accent' height='8' rx='4' width='60' x='40' y='34' />
      <g className='swap-a'>
        <text className='line' x='40' y='68'>Maya solves x + 4 = 10.</text>
        <text className='line-muted' x='40' y='88'>Maya = she</text>
      </g>
      <g className='swap-b'>
        <text className='line' x='40' y='68'>She solves x + 4 = 10.</text>
        <text className='line-muted' x='40' y='88'>he / she / it + -s</text>
      </g>
    </svg>
  );
}

export function EnglishPossessiveAdjectiveAnimation(): React.JSX.Element {
  const surfaceIds = useEnglishAnimationSurfaceIds('english-possessive-adjective');
  const cards = [
    { label: 'my', noun: 'solution', accent: '#0ea5e9', glow: '#7dd3fc' },
    { label: 'your', noun: 'calculator', accent: '#14b8a6', glow: '#5eead4' },
    { label: 'their', noun: 'graph', accent: '#a855f7', glow: '#d8b4fe' },
  ] as const;

  return (
    <svg
      aria-label='Animacja: my, your, their przed rzeczownikiem.'
      className='h-auto w-full'
      data-testid='english-possessive-adjective-animation'
      role='img'
      viewBox='0 0 420 140'
    >
      <style>{`
        .card {
          stroke-width: 2;
          stroke: rgba(148, 163, 184, 0.28);
        }
        .label {
          font: 700 12px/1.2 "Space Grotesk", "IBM Plex Sans", sans-serif;
          fill: #0f172a;
        }
        .noun {
          font: 600 12px/1.2 "Space Grotesk", "IBM Plex Sans", sans-serif;
          fill: #0f172a;
        }
        .icon {
          fill: #94a3b8;
        }
        .frame {
          fill: none;
          stroke: rgba(255, 255, 255, 0.72);
          stroke-width: 1.5;
        }
        .pulse { animation: labelPulse 3.6s ease-in-out infinite; }
        .pulse-2 { animation-delay: 1.2s; }
        .pulse-3 { animation-delay: 2.4s; }
        @keyframes labelPulse {
          0%, 100% { opacity: 0.4; transform: translateY(2px); }
          40% { opacity: 1; transform: translateY(-2px); }
        }
        @media (prefers-reduced-motion: reduce) {
          .pulse, .pulse-2, .pulse-3 { animation: none; opacity: 1; }
        }
      `}</style>
      <defs>
        {cards.map((item, index) => (
          <linearGradient
            key={`grad-${item.label}`}
            id={`${surfaceIds.panelGradientId}-${item.label}`}
            x1={30 + index * 130}
            x2={140 + index * 130}
            y1='24'
            y2='114'
            gradientUnits='userSpaceOnUse'
          >
            <stop offset='0%' stopColor='#f8fafc' />
            <stop offset='100%' stopColor={item.glow} />
          </linearGradient>
        ))}
      </defs>
      <g data-testid='english-possessive-adjective-atmosphere'>
        {cards.map((item, index) => (
          <ellipse
            key={`atm-${item.label}`}
            cx={82 + index * 130}
            cy='38'
            fill={item.glow}
            opacity='0.12'
            rx='44'
            ry='18'
          />
        ))}
      </g>
      {cards.map((item, index) => (
        <g key={`card-${index}`} transform={`translate(${30 + index * 130}, 24)`}>
          <rect className='card' fill={`url(#${surfaceIds.panelGradientId}-${item.label})`} height='90' rx='16' width='110' />
          <rect
            className='frame'
            data-testid={`english-possessive-adjective-${item.label}-frame`}
            x='4'
            y='4'
            width='102'
            height='82'
            rx='13'
          />
          <rect fill={item.accent} height='14' opacity='0.16' rx='7' width='32' x='12' y='14' />
          <text className={`label pulse pulse-${index + 1}`} fill={item.accent} x='12' y='24'>
            {item.label}
          </text>
          <rect className='icon' height='36' rx='8' width='36' x='12' y='32' />
          <rect className='icon' height='6' rx='3' width='40' x='52' y='40' />
          <rect className='icon' height='6' rx='3' width='30' x='52' y='52' />
          <text className='noun' x='12' y='86'>
            {item.noun}
          </text>
        </g>
      ))}
    </svg>
  );
}

export function EnglishPossessivePronounAnimation(): React.JSX.Element {
  const surfaceIds = useEnglishAnimationSurfaceIds('english-possessive-pronoun');

  return (
    <svg
      aria-label='Animacja: mine i yours zastępują rzeczownik.'
      className='h-auto w-full'
      data-testid='english-possessive-pronoun-animation'
      role='img'
      viewBox='0 0 360 140'
    >
      <style>{`
        .card {
          stroke-width: 2;
          stroke: rgba(148, 163, 184, 0.28);
        }
        .tag {
          font: 700 12px/1.2 "Space Grotesk", "IBM Plex Sans", sans-serif;
          fill: #14b8a6;
        }
        .text {
          font: 600 12px/1.2 "Space Grotesk", "IBM Plex Sans", sans-serif;
          fill: #0f172a;
        }
        .frame {
          fill: none;
          stroke: rgba(255, 255, 255, 0.72);
          stroke-width: 1.5;
        }
        .pulse { animation: tagGlow 3.8s ease-in-out infinite; }
        .pulse-2 { animation-delay: 1.9s; }
        @keyframes tagGlow {
          0%, 100% { opacity: 0.5; transform: scale(0.98); }
          45% { opacity: 1; transform: scale(1); }
        }
        @media (prefers-reduced-motion: reduce) {
          .pulse, .pulse-2 { animation: none; opacity: 1; }
        }
      `}</style>
      <defs>
        <linearGradient id={`${surfaceIds.panelGradientId}-mine`} x1='30' x2='160' y1='26' y2='114' gradientUnits='userSpaceOnUse'>
          <stop offset='0%' stopColor='#f0fdfa' />
          <stop offset='100%' stopColor='#ccfbf1' />
        </linearGradient>
        <linearGradient id={`${surfaceIds.panelGradientId}-yours`} x1='200' x2='330' y1='26' y2='114' gradientUnits='userSpaceOnUse'>
          <stop offset='0%' stopColor='#eff6ff' />
          <stop offset='100%' stopColor='#dbeafe' />
        </linearGradient>
      </defs>
      <g transform='translate(30, 26)'>
        <rect className='card' fill={`url(#${surfaceIds.panelGradientId}-mine)`} height='88' rx='16' width='130' />
        <rect className='frame' data-testid='english-possessive-pronoun-mine-frame' x='4' y='4' width='122' height='80' rx='13' />
        <text className='tag pulse' x='16' y='26'>mine</text>
        <text className='text' x='16' y='52'>Solution A</text>
        <text className='text' x='16' y='70'>x = 4</text>
      </g>
      <g transform='translate(200, 26)'>
        <rect className='card' fill={`url(#${surfaceIds.panelGradientId}-yours)`} height='88' rx='16' width='130' />
        <rect className='frame' data-testid='english-possessive-pronoun-yours-frame' x='4' y='4' width='122' height='80' rx='13' />
        <text className='tag pulse-2' x='16' y='26'>yours</text>
        <text className='text' x='16' y='52'>Solution B</text>
        <text className='text' x='16' y='70'>x = 6</text>
      </g>
    </svg>
  );
}
