'use client';

import React from 'react';
import {
  renderSoftAtmosphereGradients,
  renderSoftAtmosphereOvals,
} from '@/features/kangur/ui/components/animations/svgAtmosphere';
import { useEnglishAnimationSurfaceIds } from './EnglishAnimationSurface';

export function EnglishAgreementBalanceAnimation(): React.JSX.Element {
  const surfaceIds = useEnglishAnimationSurfaceIds('english-agreement-balance');

  return (
    <svg
      aria-label='Animacja: zgodność podmiotu i czasownika w Present Simple.'
      className='h-auto w-full'
      data-testid='english-agreement-balance-animation'
      role='img'
      viewBox='0 0 380 160'
    >
      <style>{`
        .panel { stroke-width: 2; stroke: rgba(125, 211, 252, 0.3); }
        .beam { stroke: #94a3b8; stroke-width: 4; stroke-linecap: round; }
        .pivot { fill: #64748b; }
        .plate { fill: #f1f5f9; stroke: #cbd5e1; stroke-width: 2; }
        .text-main { font: 800 14px "Space Grotesk", sans-serif; fill: #0f172a; text-anchor: middle; }
        .text-sub { font: 600 11px "Space Grotesk", sans-serif; fill: #64748b; text-anchor: middle; }
        .frame { fill: none; stroke: rgba(255, 255, 255, 0.7); stroke-width: 1.5; }
        .balance { animation: balanceMove 5s ease-in-out infinite; transform-origin: 190px 110px; }
        @keyframes balanceMove {
          0%, 100% { transform: rotate(0deg); }
          25% { transform: rotate(-6deg); }
          75% { transform: rotate(6deg); }
        }
        @media (prefers-reduced-motion: reduce) { .balance { animation: none; } }
      `}</style>
      <defs>
        <clipPath id={surfaceIds.clipId}>
          <rect x='20' y='20' width='340' height='120' rx='20' />
        </clipPath>
        <linearGradient id={surfaceIds.panelGradientId} x1='20' x2='360' y1='20' y2='140' gradientUnits='userSpaceOnUse'>
          <stop offset='0%' stopColor='#f0f9ff' />
          <stop offset='100%' stopColor='#e0f2fe' />
        </linearGradient>
        {renderSoftAtmosphereGradients(`${surfaceIds.atmosphereGradientId}-soft`, [
          { key: 'top', cx: 190, cy: 40, rx: 120, ry: 30, color: '#0ea5e9', opacity: 0.06, glowBias: '40%' },
        ])}
      </defs>
      <g clipPath={`url(#${surfaceIds.clipId})`}>
        <rect className='panel' fill={`url(#${surfaceIds.panelGradientId})`} height='120' rx='20' width='340' x='20' y='20' />
        {renderSoftAtmosphereOvals(`${surfaceIds.atmosphereGradientId}-soft`, [
          { key: 'top', cx: 190, cy: 40, rx: 120, ry: 30, color: '#0ea5e9', opacity: 0.06, glowBias: '40%' },
        ])}
      </g>
      <rect className='frame' x='26' y='26' width='328' height='108' rx='16' />
      <g className='balance'>
        <line className='beam' x1='90' x2='290' y1='110' y2='110' />
        <g transform='translate(90, 110)'>
          <rect className='plate' height='40' rx='10' width='80' x='-40' y='-50' />
          <text className='text-main' x='0' y='-32'>I / You</text>
          <text className='text-sub' x='0' y='-18'>We / They</text>
        </g>
        <g transform='translate(290, 110)'>
          <rect className='plate' height='40' rx='10' width='80' x='-40' y='-50' />
          <text className='text-main' x='0' y='-25'>solve</text>
        </g>
      </g>
      <path className='pivot' d='M180 130 L190 110 L200 130 Z' />
    </svg>
  );
}

export function EnglishThirdPersonSAnimation(): React.JSX.Element {
  const surfaceIds = useEnglishAnimationSurfaceIds('english-third-person-s');

  return (
    <svg
      aria-label='Animacja: końcówka -s w trzeciej osobie liczby pojedynczej.'
      className='h-auto w-full'
      data-testid='english-third-person-s-animation'
      role='img'
      viewBox='0 0 380 140'
    >
      <style>{`
        .panel { stroke-width: 2; stroke: rgba(168, 85, 247, 0.24); }
        .base-text { font: 800 18px "Space Grotesk", sans-serif; fill: #0f172a; }
        .s-tag { font: 900 20px "Space Grotesk", sans-serif; fill: #a855f7; }
        .frame { fill: none; stroke: rgba(255, 255, 255, 0.75); stroke-width: 1.6; }
        .reveal-s { animation: sReveal 4s ease-in-out infinite; }
        @keyframes sReveal {
          0%, 20% { opacity: 0; transform: scale(0.5) translateY(10px); }
          40%, 80% { opacity: 1; transform: scale(1.1) translateY(0); }
          90%, 100% { opacity: 0; transform: scale(1) translateY(-5px); }
        }
        @media (prefers-reduced-motion: reduce) { .reveal-s { animation: none; opacity: 1; } }
      `}</style>
      <defs>
        <clipPath id={surfaceIds.clipId}>
          <rect x='20' y='20' width='340' height='100' rx='22' />
        </clipPath>
        <linearGradient id={surfaceIds.panelGradientId} x1='20' x2='360' y1='20' y2='120' gradientUnits='userSpaceOnUse'>
          <stop offset='0%' stopColor='#faf5ff' />
          <stop offset='100%' stopColor='#f3e8ff' />
        </linearGradient>
      </defs>
      <g clipPath={`url(#${surfaceIds.clipId})`}>
        <rect className='panel' fill={`url(#${surfaceIds.panelGradientId})`} height='100' rx='22' width='340' x='20' y='20' />
      </g>
      <rect className='frame' x='26' y='26' width='328' height='88' rx='18' />
      <g transform='translate(60, 75)'>
        <text className='base-text' x='0' y='0'>He solve</text>
        <text className='s-tag reveal-s' x='84' y='0'>s</text>
        <text className='base-text' x='102' y='0'>the task.</text>
      </g>
    </svg>
  );
}

export function EnglishBeVerbSwitchAnimation(): React.JSX.Element {
  const surfaceIds = useEnglishAnimationSurfaceIds('english-be-verb-switch');

  return (
    <svg
      aria-label='Animacja: odmiana czasownika to be.'
      className='h-auto w-full'
      data-testid='english-be-verb-switch-animation'
      role='img'
      viewBox='0 0 400 150'
    >
      <style>{`
        .panel { stroke-width: 2; stroke: rgba(56, 189, 248, 0.28); }
        .subject { font: 800 15px "Space Grotesk", sans-serif; fill: #0f172a; }
        .be-verb { font: 900 16px "Space Grotesk", sans-serif; fill: #0ea5e9; }
        .frame { fill: none; stroke: rgba(255, 255, 255, 0.7); stroke-width: 1.5; }
        .step { animation: beStep 9s steps(1) infinite; }
        .step-1 { animation-delay: 0s; }
        .step-2 { animation-delay: 3s; }
        .step-3 { animation-delay: 6s; }
        @keyframes beStep {
          0%, 33.32% { opacity: 1; transform: translateY(0); }
          33.33%, 100% { opacity: 0; transform: translateY(10px); }
        }
        @media (prefers-reduced-motion: reduce) { .step { animation: none; opacity: 1; } }
      `}</style>
      <defs>
        <clipPath id={surfaceIds.clipId}>
          <rect x='20' y='20' width='360' height='110' rx='20' />
        </clipPath>
        <linearGradient id={surfaceIds.panelGradientId} x1='20' x2='380' y1='20' y2='130' gradientUnits='userSpaceOnUse'>
          <stop offset='0%' stopColor='#f0f9ff' />
          <stop offset='100%' stopColor='#e0f2fe' />
        </linearGradient>
      </defs>
      <g clipPath={`url(#${surfaceIds.clipId})`}>
        <rect className='panel' fill={`url(#${surfaceIds.panelGradientId})`} height='110' rx='20' width='360' x='20' y='20' />
      </g>
      <rect className='frame' x='26' y='26' width='348' height='98' rx='16' />
      <g transform='translate(50, 75)'>
        <g className='step step-1'>
          <text className='subject' x='0' y='0'>I</text>
          <text className='be-verb' x='20' y='0'>am</text>
          <text className='subject' x='55' y='0'>a learner.</text>
        </g>
        <g className='step step-2'>
          <text className='subject' x='0' y='0'>You / We / They</text>
          <text className='be-verb' x='125' y='0'>are</text>
          <text className='subject' x='160' y='0'>learners.</text>
        </g>
        <g className='step step-3'>
          <text className='subject' x='0' y='0'>He / She / It</text>
          <text className='be-verb' x='105' y='0'>is</text>
          <text className='subject' x='130' y='0'>a learner.</text>
        </g>
      </g>
    </svg>
  );
}
