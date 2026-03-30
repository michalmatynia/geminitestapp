'use client';

import React, { useId } from 'react';
import {
  renderSoftAtmosphereGradients,
  renderSoftAtmosphereOvals,
} from '@/features/kangur/ui/components/animations/svgAtmosphere';

type SubtractingAnimationSurfaceProps = {
  ariaLabel: string;
  children: React.ReactNode;
  surfaceHeight: number;
  surfaceWidth: number;
  testIdPrefix: string;
  viewBox: string;
};

export function SubtractingAnimationSurface({
  ariaLabel,
  children,
  surfaceHeight,
  surfaceWidth,
  testIdPrefix,
  viewBox,
}: SubtractingAnimationSurfaceProps): React.JSX.Element {
  const baseId = useId().replace(/:/g, '');
  const clipId = `${testIdPrefix}-${baseId}-clip`;
  const panelGradientId = `${testIdPrefix}-${baseId}-panel`;
  const frameGradientId = `${testIdPrefix}-${baseId}-frame-gradient`;
  const atmosphereId = `${testIdPrefix}-${baseId}-atmosphere-oval`;

  return (
    <svg
      aria-label={ariaLabel}
      className='h-auto w-full'
      data-testid={`${testIdPrefix}-animation`}
      role='img'
      viewBox={viewBox}
    >
      <defs>
        <clipPath id={clipId}>
          <rect x='8' y='8' width={surfaceWidth} height={surfaceHeight} rx='24' />
        </clipPath>
        <linearGradient
          id={panelGradientId}
          x1='16'
          x2={surfaceWidth}
          y1='12'
          y2={surfaceHeight}
          gradientUnits='userSpaceOnUse'
        >
          <stop offset='0%' stopColor='#f8fafc' />
          <stop offset='55%' stopColor='#eff6ff' />
          <stop offset='100%' stopColor='#ecfeff' />
        </linearGradient>
        <linearGradient
          id={frameGradientId}
          x1='16'
          x2={surfaceWidth}
          y1='16'
          y2='16'
          gradientUnits='userSpaceOnUse'
        >
          <stop offset='0%' stopColor='rgba(245,158,11,0.8)' />
          <stop offset='50%' stopColor='rgba(96,165,250,0.82)' />
          <stop offset='100%' stopColor='rgba(52,211,153,0.84)' />
        </linearGradient>
        {renderSoftAtmosphereGradients(atmosphereId, [
          { key: 'left', cx: 86, cy: 34, rx: 76, ry: 20, color: '#f59e0b', opacity: 0.05, glowBias: '40%' },
          {
            key: 'bottom',
            cx: Math.max(surfaceWidth - 92, 120),
            cy: Math.max(surfaceHeight - 16, 52),
            rx: 102,
            ry: 32,
            color: '#60a5fa',
            opacity: 0.05,
            glowBias: '60%',
          },
          {
            key: 'top',
            cx: Math.max(surfaceWidth - 104, 116),
            cy: 28,
            rx: 66,
            ry: 18,
            color: '#34d399',
            opacity: 0.04,
            glowBias: '38%',
          },
        ])}
      </defs>
      <g clipPath={`url(#${clipId})`} data-testid={`${testIdPrefix}-atmosphere`}>
        <rect
          x='8'
          y='8'
          width={surfaceWidth}
          height={surfaceHeight}
          rx='24'
          fill={`url(#${panelGradientId})`}
          stroke='rgba(148,163,184,0.16)'
          strokeWidth='2'
        />
        {renderSoftAtmosphereOvals(atmosphereId, [
          { key: 'left', cx: 86, cy: 34, rx: 76, ry: 20, color: '#f59e0b', opacity: 0.05, glowBias: '40%' },
          {
            key: 'bottom',
            cx: Math.max(surfaceWidth - 92, 120),
            cy: Math.max(surfaceHeight - 16, 52),
            rx: 102,
            ry: 32,
            color: '#60a5fa',
            opacity: 0.05,
            glowBias: '60%',
          },
          {
            key: 'top',
            cx: Math.max(surfaceWidth - 104, 116),
            cy: 28,
            rx: 66,
            ry: 18,
            color: '#34d399',
            opacity: 0.04,
            glowBias: '38%',
          },
        ])}
        {children}
      </g>
      <rect
        x='16'
        y='16'
        width={surfaceWidth - 16}
        height={surfaceHeight - 16}
        rx='20'
        fill='none'
        stroke={`url(#${frameGradientId})`}
        strokeWidth='1.75'
        data-testid={`${testIdPrefix}-frame`}
      />
    </svg>
  );
}

export function SubtractingSvgAnimation({ ariaLabel }: { ariaLabel: string }): React.JSX.Element {
  return (
    <SubtractingAnimationSurface
      ariaLabel={ariaLabel}
      surfaceHeight={104}
      surfaceWidth={404}
      testIdPrefix='subtracting-basics-motion'
      viewBox='0 0 420 120'
    >
      <style>{`
        .dot-a { fill: #f59e0b; }
        .dot-b { fill: #60a5fa; }
        .dot-rest { fill: #34d399; }
        .group-a, .group-b, .rest-group {
          transform-box: fill-box;
          transform-origin: center;
        }
        .group-b { animation: moveOut 6s ease-in-out infinite; }
        .rest-group { animation: restReveal 6s ease-in-out infinite; }
        @keyframes moveOut {
          0%, 25% { transform: translateX(0); opacity: 1; }
          50% { transform: translateX(120px); opacity: 1; }
          65% { transform: translateX(150px); opacity: 0; }
          100% { transform: translateX(0); opacity: 1; }
        }
        @keyframes restReveal {
          0%, 45% { opacity: 0; transform: scale(0.9); }
          60%, 100% { opacity: 1; transform: scale(1); }
        }
        @media (prefers-reduced-motion: reduce) {
          .group-b, .rest-group { animation: none; }
        }
      `}</style>
      <rect
        fill='none'
        height='46'
        rx='12'
        stroke='#e2e8f0'
        strokeDasharray='6 6'
        width='150'
        x='250'
        y='37'
      />
      <g className='group-a'>
        {[0, 1, 2, 3, 4].map((index) => (
          <circle key={`base-${index}`} className='dot-a' cx={50 + index * 22} cy='60' r='9' />
        ))}
      </g>
      <g className='group-b'>
        {[0, 1].map((index) => (
          <circle key={`sub-${index}`} className='dot-b' cx={96 + index * 22} cy='60' r='9' />
        ))}
      </g>
      <g fill='none' stroke='#94a3b8' strokeLinecap='round' strokeWidth='5'>
        <line x1='165' x2='190' y1='60' y2='60' />
        <line x1='210' x2='240' y1='52' y2='52' />
        <line x1='210' x2='240' y1='68' y2='68' />
      </g>
      <g className='rest-group'>
        {[0, 1, 2].map((index) => (
          <circle key={`rest-${index}`} className='dot-rest' cx={270 + index * 22} cy='60' r='9' />
        ))}
      </g>
    </SubtractingAnimationSurface>
  );
}

export function SubtractingNumberLineAnimation({ ariaLabel }: { ariaLabel: string }): React.JSX.Element {
  return (
    <SubtractingAnimationSurface
      ariaLabel={ariaLabel}
      surfaceHeight={104}
      surfaceWidth={404}
      testIdPrefix='subtracting-number-line'
      viewBox='0 0 420 120'
    >
      <style>{`
        .line-base { stroke: #cbd5f5; }
        .tick { stroke: #94a3b8; }
        .jump-one { stroke: #60a5fa; }
        .jump-two { stroke: #34d399; }
        .marker {
          fill: #f59e0b;
          animation: markerMoveBack 7s ease-in-out infinite;
        }
        .label-ten { animation: tenPulse 7s ease-in-out infinite; }
        @keyframes markerMoveBack {
          0%, 20% { transform: translateX(0); }
          45% { transform: translateX(-120px); }
          65% { transform: translateX(-200px); }
          100% { transform: translateX(0); }
        }
        @keyframes tenPulse {
          0%, 35% { opacity: 0.35; }
          55%, 100% { opacity: 1; }
        }
        @media (prefers-reduced-motion: reduce) {
          .marker, .label-ten { animation: none; }
        }
      `}</style>
      <line className='line-base' strokeWidth='6' x1='40' x2='380' y1='70' y2='70' />
      {[0, 1, 2, 3, 4, 5, 6, 7].map((index) => (
        <line
          key={`tick-${index}`}
          className='tick'
          strokeWidth='3'
          x1={60 + index * 40}
          x2={60 + index * 40}
          y1='62'
          y2='78'
        />
      ))}
      <text fill='#475569' fontSize='12' x='52' y='95'>8</text>
      <text className='label-ten' fill='#0f172a' fontSize='12' fontWeight='600' x='132' y='95'>10</text>
      <text fill='#475569' fontSize='12' x='212' y='95'>12</text>
      <text fill='#475569' fontSize='12' x='292' y='95'>14</text>
      <text fill='#0f172a' fontSize='12' fontWeight='600' x='252' y='50'>13</text>
      <path className='jump-one' d='M260 60 Q200 20 140 60' fill='none' strokeWidth='4' />
      <path className='jump-two' d='M140 60 Q110 20 80 60' fill='none' strokeWidth='4' />
      <circle className='marker' cx='260' cy='70' r='8' />
    </SubtractingAnimationSurface>
  );
}

export function SubtractingTenFrameAnimation({ ariaLabel }: { ariaLabel: string }): React.JSX.Element {
  return (
    <SubtractingAnimationSurface
      ariaLabel={ariaLabel}
      surfaceHeight={124}
      surfaceWidth={404}
      testIdPrefix='subtracting-ten-frame'
      viewBox='0 0 420 140'
    >
      <style>{`
        .frame { stroke: #e2e8f0; }
        .cell { fill: #f1f5f9; }
        .base { fill: #f59e0b; }
        .extra { fill: #60a5fa; }
        .remove { fill: #f87171; animation: removeDots 7s ease-in-out infinite; }
        .remain { fill: #34d399; animation: remainDots 7s ease-in-out infinite; }
        .base-group, .extra-group { animation: baseFade 7s ease-in-out infinite; }
        @keyframes removeDots {
          0%, 25% { opacity: 1; transform: translateX(0); }
          50% { opacity: 1; transform: translateX(20px); }
          65%, 100% { opacity: 0; transform: translateX(40px); }
        }
        @keyframes remainDots {
          0%, 50% { opacity: 0; transform: scale(0.95); }
          65%, 100% { opacity: 1; transform: scale(1); }
        }
        @keyframes baseFade {
          0%, 50% { opacity: 1; }
          65%, 100% { opacity: 0.25; }
        }
        @media (prefers-reduced-motion: reduce) {
          .remove, .remain, .base-group, .extra-group { animation: none; }
        }
      `}</style>
      <rect className='frame' fill='none' height='80' rx='14' strokeWidth='2' width='220' x='30' y='30' />
      {[0, 1].map((row) =>
        [0, 1, 2, 3, 4].map((col) => (
          <rect key={`cell-${row}-${col}`} className='cell' height='24' width='24' x={50 + col * 38} y={45 + row * 34} />
        ))
      )}
      <g className='base-group'>
        {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((index) => (
          <circle key={`base-dot-${index}`} className='base' cx={62 + (index % 5) * 38} cy={57 + Math.floor(index / 5) * 34} r='10' />
        ))}
      </g>
      <g className='extra-group'>
        {[0, 1, 2].map((index) => (
          <circle key={`extra-dot-${index}`} className='extra' cx={310 + index * 32} cy='70' r='10' />
        ))}
      </g>
      <g>
        {[8, 9].map((index) => (
          <circle key={`remove-base-${index}`} className='remove' cx={62 + (index % 5) * 38} cy={57 + Math.floor(index / 5) * 34} r='10' />
        ))}
        {[0, 1, 2].map((index) => (
          <circle key={`remove-extra-${index}`} className='remove' cx={310 + index * 32} cy='70' r='10' />
        ))}
      </g>
      <g>
        {[0, 1, 2, 3, 4, 5, 6, 7].map((index) => (
          <circle key={`remain-dot-${index}`} className='remain' cx={62 + (index % 5) * 38} cy={57 + Math.floor(index / 5) * 34} r='10' />
        ))}
      </g>
      <text fill='#475569' fontSize='12' x='290' y='40'>−5</text>
      <line stroke='#94a3b8' strokeWidth='3' x1='265' x2='295' y1='70' y2='70' />
    </SubtractingAnimationSurface>
  );
}

export function SubtractingDifferenceBarAnimation({
  ariaLabel,
  differenceLabel,
}: {
  ariaLabel: string;
  differenceLabel: string;
}): React.JSX.Element {
  return (
    <SubtractingAnimationSurface
      ariaLabel={ariaLabel}
      surfaceHeight={124}
      surfaceWidth={404}
      testIdPrefix='subtracting-difference-bar'
      viewBox='0 0 420 140'
    >
      <style>{`
        .unit-top { fill: #f59e0b; }
        .unit-bottom { fill: #60a5fa; }
        .unit-diff {
          fill: #34d399;
          transform-box: fill-box;
          transform-origin: left center;
          animation: diffReveal 6s ease-in-out infinite;
        }
        .label { fill: #475569; font-size: 12px; font-weight: 600; }
        .diff-label { fill: #0f172a; font-size: 12px; font-weight: 700; }
        @keyframes diffReveal {
          0%, 35% { opacity: 0; transform: scaleX(0.6); }
          55%, 100% { opacity: 1; transform: scaleX(1); }
        }
        @media (prefers-reduced-motion: reduce) {
          .unit-diff { animation: none; opacity: 1; transform: none; }
        }
      `}</style>
      <text className='label' x='18' y='48'>12</text>
      <text className='label' x='18' y='92'>7</text>
      <text className='diff-label' x='300' y='118'>{differenceLabel}</text>
      <g>
        {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((index) => (
          <rect key={`top-${index}`} className='unit-top' height='18' rx='4' width='22' x={40 + index * 28} y='36' />
        ))}
      </g>
      <g>
        {[0, 1, 2, 3, 4, 5, 6].map((index) => (
          <rect key={`bottom-${index}`} className='unit-bottom' height='18' rx='4' width='22' x={40 + index * 28} y='80' />
        ))}
      </g>
      <g>
        {[7, 8, 9, 10, 11].map((index) => (
          <rect key={`diff-${index}`} className='unit-diff' height='18' rx='4' width='22' x={40 + index * 28} y='36' />
        ))}
      </g>
    </SubtractingAnimationSurface>
  );
}

export function SubtractingAbacusAnimation({
  ariaLabel,
  tensLabel,
  onesLabel,
  startLabel,
  subtractLabel,
  resultLabel,
}: {
  ariaLabel: string;
  tensLabel: string;
  onesLabel: string;
  startLabel: string;
  subtractLabel: string;
  resultLabel: string;
}): React.JSX.Element {
  return (
    <SubtractingAnimationSurface
      ariaLabel={ariaLabel}
      surfaceHeight={174}
      surfaceWidth={424}
      testIdPrefix='subtracting-abacus'
      viewBox='0 0 440 190'
    >
      <style>{`
        .frame { stroke: #e2e8f0; }
        .rod { stroke: #cbd5f5; }
        .divider { stroke: #e2e8f0; }
        .bead-a { fill: #f59e0b; }
        .bead-b { fill: #60a5fa; }
        .bead-rest { fill: #34d399; }
        .row-sub, .row-rest {
          transform-box: fill-box;
          transform-origin: center;
        }
        .row-sub { animation: abacusSub 7s ease-in-out infinite; }
        .row-rest { animation: abacusRest 7s ease-in-out infinite; }
        @keyframes abacusSub {
          0%, 30% { opacity: 1; transform: translateX(0); }
          55% { opacity: 1; transform: translateX(80px); }
          70%, 100% { opacity: 0; transform: translateX(110px); }
        }
        @keyframes abacusRest {
          0%, 50% { opacity: 0; transform: scale(0.98); }
          65%, 100% { opacity: 1; transform: scale(1); }
        }
        @media (prefers-reduced-motion: reduce) {
          .row-sub, .row-rest { animation: none; }
        }
      `}</style>
      <rect className='frame' fill='none' height='140' rx='18' strokeWidth='2' width='380' x='30' y='24' />
      {[0, 1, 2].map((row) => (
        <line key={`rod-${row}`} className='rod' strokeWidth='6' x1='60' x2='380' y1={60 + row * 40} y2={60 + row * 40} />
      ))}
      <line className='divider' strokeWidth='2' x1='220' x2='220' y1='36' y2='152' />
      <text fill='#475569' fontSize='12' fontWeight='600' x='70' y='44'>{tensLabel}</text>
      <text fill='#475569' fontSize='12' fontWeight='600' x='250' y='44'>{onesLabel}</text>
      <text fill='#475569' fontSize='12' fontWeight='600' x='36' y='56'>{startLabel}</text>
      <text fill='#475569' fontSize='12' fontWeight='600' x='36' y='96'>{subtractLabel}</text>
      <text fill='#475569' fontSize='12' fontWeight='600' x='36' y='136'>{resultLabel}</text>
      <g>
        {[0, 1, 2, 3].map((index) => ( <circle key={`start-tens-${index}`} className='bead-a' cx={80 + index * 22} cy='60' r='9' /> ))}
        {[0, 1, 2, 3, 4, 5, 6].map((index) => ( <circle key={`start-ones-${index}`} className='bead-a' cx={250 + index * 18} cy='60' r='8' /> ))}
      </g>
      <g className='row-sub'>
        {[0, 1].map((index) => ( <circle key={`sub-tens-${index}`} className='bead-b' cx={80 + index * 22} cy='100' r='9' /> ))}
        {[0, 1, 2].map((index) => ( <circle key={`sub-ones-${index}`} className='bead-b' cx={250 + index * 18} cy='100' r='8' /> ))}
      </g>
      <g className='row-rest'>
        {[0, 1].map((index) => ( <circle key={`rest-tens-${index}`} className='bead-rest' cx={80 + index * 22} cy='140' r='9' /> ))}
        {[0, 1, 2, 3].map((index) => ( <circle key={`rest-ones-${index}`} className='bead-rest' cx={250 + index * 18} cy='140' r='8' /> ))}
      </g>
    </SubtractingAnimationSurface>
  );
}
