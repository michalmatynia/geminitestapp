import React, { useId } from 'react';

type PartsOfSpeechSurfaceIds = {
  clipId: string;
  frameGradientId: string;
  panelGradientId: string;
};

type PartsOfSpeechSurfaceProps = {
  accentEnd: string;
  accentStart: string;
  atmosphereA: string;
  atmosphereB: string;
  ids: PartsOfSpeechSurfaceIds;
  stroke: string;
  testIdPrefix: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rx: number;
};

function usePartsOfSpeechSurfaceIds(prefix: string): PartsOfSpeechSurfaceIds {
  const baseId = useId().replace(/:/g, '');

  return {
    clipId: `${prefix}-${baseId}-clip`,
    frameGradientId: `${prefix}-${baseId}-frame`,
    panelGradientId: `${prefix}-${baseId}-panel`,
  };
}

function PartsOfSpeechSurface({
  accentEnd,
  accentStart,
  atmosphereA,
  atmosphereB,
  ids,
  stroke,
  testIdPrefix,
  x,
  y,
  width,
  height,
  rx,
}: PartsOfSpeechSurfaceProps): React.JSX.Element {
  return (
    <>
      <defs>
        <clipPath id={ids.clipId}>
          <rect x={x} y={y} width={width} height={height} rx={rx} />
        </clipPath>
        <linearGradient
          id={ids.panelGradientId}
          x1={x}
          x2={x + width}
          y1={y}
          y2={y + height}
          gradientUnits='userSpaceOnUse'
        >
          <stop offset='0%' stopColor='#eff6ff' />
          <stop offset='50%' stopColor='#f8fafc' />
          <stop offset='100%' stopColor={accentEnd} />
        </linearGradient>
        <linearGradient
          id={ids.frameGradientId}
          x1={x}
          x2={x + width}
          y1={y}
          y2={y}
          gradientUnits='userSpaceOnUse'
        >
          <stop offset='0%' stopColor={accentStart} stopOpacity='0.72' />
          <stop offset='100%' stopColor='#ffffff' stopOpacity='0.92' />
        </linearGradient>
      </defs>
      <g clipPath={`url(#${ids.clipId})`} data-testid={`${testIdPrefix}-atmosphere`}>
        <rect
          fill={`url(#${ids.panelGradientId})`}
          height={height}
          rx={rx}
          stroke={stroke}
          strokeWidth='2'
          width={width}
          x={x}
          y={y}
        />
        <ellipse cx={x + width * 0.2} cy={y + height * 0.2} fill={atmosphereA} rx={width * 0.2} ry={height * 0.16} />
        <ellipse cx={x + width * 0.8} cy={y + height * 0.86} fill={atmosphereB} rx={width * 0.3} ry={height * 0.2} />
      </g>
      <rect
        data-testid={`${testIdPrefix}-frame`}
        fill='none'
        height={height - 12}
        rx={Math.max(rx - 4, 8)}
        stroke={`url(#${ids.frameGradientId})`}
        strokeWidth='1.5'
        width={width - 12}
        x={x + 6}
        y={y + 6}
      />
    </>
  );
}

export function PartsOfSpeechCardPulseAnimation(): React.JSX.Element {
  const surfaceIds = usePartsOfSpeechSurfaceIds('english-parts-of-speech-cards');
  const nounGradientId = `${surfaceIds.panelGradientId}-noun-card`;
  const verbGradientId = `${surfaceIds.panelGradientId}-verb-card`;
  const adverbGradientId = `${surfaceIds.panelGradientId}-adverb-card`;

  return (
    <svg
      aria-label='Animacja: części mowy pojawiają się kolejno na kartach z przykładami matematycznymi.'
      className='h-auto w-full'
      data-testid='english-parts-of-speech-cards-animation'
      role='img'
      viewBox='0 0 420 156'
    >
      <defs>
        <linearGradient id={nounGradientId} x1='0' x2='1' y1='0' y2='1'>
          <stop offset='0%' stopColor='#e0f2fe' />
          <stop offset='100%' stopColor='#bae6fd' />
        </linearGradient>
        <linearGradient id={verbGradientId} x1='0' x2='1' y1='0' y2='1'>
          <stop offset='0%' stopColor='#ede9fe' />
          <stop offset='100%' stopColor='#c4b5fd' />
        </linearGradient>
        <linearGradient id={adverbGradientId} x1='0' x2='1' y1='0' y2='1'>
          <stop offset='0%' stopColor='#fef3c7' />
          <stop offset='100%' stopColor='#fde68a' />
        </linearGradient>
      </defs>
      <style>{`
        .english-parts-of-speech-card {
          stroke: rgba(255, 255, 255, 0.85);
          stroke-width: 1.5;
          filter: drop-shadow(0 8px 18px rgba(148, 163, 184, 0.18));
        }
        .english-parts-of-speech-label {
          font: 700 11px/1.1 system-ui, sans-serif;
          text-transform: uppercase;
          letter-spacing: 0.12em;
          fill: #0284c7;
        }
        .english-parts-of-speech-word { font: 700 13px/1.2 system-ui, sans-serif; fill: #0f172a; }
        .english-parts-of-speech-sub { font: 600 10px/1 system-ui, sans-serif; fill: #64748b; }
        .english-parts-of-speech-noun,
        .english-parts-of-speech-verb,
        .english-parts-of-speech-adverb {
          animation: partsOfSpeechCardPulse 6s ease-in-out infinite;
          transform-box: fill-box;
          transform-origin: center;
        }
        .english-parts-of-speech-verb { animation-delay: 2s; }
        .english-parts-of-speech-adverb { animation-delay: 4s; }
        @keyframes partsOfSpeechCardPulse {
          0%, 15% { opacity: 0.35; transform: translateY(8px) scale(0.98); }
          35%, 55% { opacity: 1; transform: translateY(0) scale(1); }
          100% { opacity: 0.35; transform: translateY(8px) scale(0.98); }
        }
        @media (prefers-reduced-motion: reduce) {
          .english-parts-of-speech-noun,
          .english-parts-of-speech-verb,
          .english-parts-of-speech-adverb { animation: none; opacity: 1; transform: none; }
        }
      `}</style>
      <PartsOfSpeechSurface
        accentEnd='#e0f2fe'
        accentStart='#38bdf8'
        atmosphereA='rgba(56, 189, 248, 0.08)'
        atmosphereB='rgba(251, 191, 36, 0.08)'
        ids={surfaceIds}
        stroke='rgba(56, 189, 248, 0.12)'
        testIdPrefix='english-parts-of-speech-cards'
        x={12}
        y={12}
        width={396}
        height={132}
        rx={24}
      />
      <g className='english-parts-of-speech-noun'>
        <rect className='english-parts-of-speech-card' fill={`url(#${nounGradientId})`} x='20' y='32' width='120' height='88' rx='20' />
        <rect fill='rgba(255,255,255,0.56)' x='34' y='42' width='82' height='14' rx='7' />
        <text className='english-parts-of-speech-label' x='38' y='56'>NOUN</text>
        <text className='english-parts-of-speech-word' x='38' y='78'>function</text>
        <text className='english-parts-of-speech-word' x='38' y='98'>triangle</text>
        <text className='english-parts-of-speech-sub' x='38' y='112'>things and ideas</text>
      </g>
      <g className='english-parts-of-speech-verb'>
        <rect className='english-parts-of-speech-card' fill={`url(#${verbGradientId})`} x='150' y='32' width='120' height='88' rx='20' />
        <rect fill='rgba(255,255,255,0.56)' x='164' y='42' width='82' height='14' rx='7' />
        <text className='english-parts-of-speech-label' x='168' y='56'>VERB</text>
        <text className='english-parts-of-speech-word' x='168' y='78'>solve</text>
        <text className='english-parts-of-speech-word' x='168' y='98'>rotate</text>
        <text className='english-parts-of-speech-sub' x='168' y='112'>actions and moves</text>
      </g>
      <g className='english-parts-of-speech-adverb'>
        <rect className='english-parts-of-speech-card' fill={`url(#${adverbGradientId})`} x='280' y='32' width='120' height='88' rx='20' />
        <rect fill='rgba(255,255,255,0.56)' x='294' y='42' width='82' height='14' rx='7' />
        <text className='english-parts-of-speech-label' x='298' y='56'>ADVERB</text>
        <text className='english-parts-of-speech-word' x='298' y='78'>quickly</text>
        <text className='english-parts-of-speech-word' x='298' y='98'>precisely</text>
        <text className='english-parts-of-speech-sub' x='298' y='112'>how it happens</text>
      </g>
    </svg>
  );
}

export function PartsOfSpeechGraphAnimation(): React.JSX.Element {
  const surfaceIds = usePartsOfSpeechSurfaceIds('english-parts-of-speech-graph');

  return (
    <svg
      aria-label='Animacja: wykres rośnie, aby pokazać czasowniki i przysłówki w opisie matematycznym.'
      className='h-auto w-full'
      data-testid='english-parts-of-speech-graph-animation'
      role='img'
      viewBox='0 0 320 170'
    >
      <style>{`
        .english-parts-of-speech-graph-axis { stroke: #94a3b8; stroke-width: 2.5; }
        .english-parts-of-speech-graph-line {
          stroke: #38bdf8;
          stroke-width: 4;
          fill: none;
          stroke-dasharray: 180;
          stroke-dashoffset: 180;
          animation: partsOfSpeechLineDraw 4.5s ease-in-out infinite;
        }
        .english-parts-of-speech-graph-dot {
          fill: #0ea5e9;
          animation: partsOfSpeechDotPulse 2.25s ease-in-out infinite;
          transform-box: fill-box;
          transform-origin: center;
        }
        .english-parts-of-speech-graph-label { font: 700 11px/1.1 system-ui, sans-serif; fill: #0f172a; }
        .english-parts-of-speech-graph-chip { fill: rgba(255,255,255,0.86); stroke: rgba(14,165,233,0.16); stroke-width: 1.5; }
        @keyframes partsOfSpeechLineDraw {
          0% { stroke-dashoffset: 180; opacity: 0.5; }
          45% { stroke-dashoffset: 0; opacity: 1; }
          100% { stroke-dashoffset: 180; opacity: 0.5; }
        }
        @keyframes partsOfSpeechDotPulse {
          0%, 100% { transform: scale(0.7); opacity: 0.5; }
          50% { transform: scale(1); opacity: 1; }
        }
        @media (prefers-reduced-motion: reduce) {
          .english-parts-of-speech-graph-line { animation: none; stroke-dashoffset: 0; opacity: 1; }
          .english-parts-of-speech-graph-dot { animation: none; opacity: 1; }
        }
      `}</style>
      <PartsOfSpeechSurface
        accentEnd='#e0f2fe'
        accentStart='#38bdf8'
        atmosphereA='rgba(56, 189, 248, 0.08)'
        atmosphereB='rgba(14, 165, 233, 0.08)'
        ids={surfaceIds}
        stroke='rgba(56, 189, 248, 0.12)'
        testIdPrefix='english-parts-of-speech-graph'
        x={12}
        y={12}
        width={296}
        height={146}
        rx={24}
      />
      <rect className='english-parts-of-speech-graph-chip' x='48' y='24' width='112' height='20' rx='10' />
      <text className='english-parts-of-speech-graph-label' x='60' y='38'>rises steadily</text>
      <line className='english-parts-of-speech-graph-axis' x1='44' y1='122' x2='280' y2='122' />
      <line className='english-parts-of-speech-graph-axis' x1='44' y1='122' x2='44' y2='32' />
      <path className='english-parts-of-speech-graph-line' d='M44 112 L112 92 L188 64 L258 44' />
      <circle className='english-parts-of-speech-graph-dot' cx='258' cy='44' r='6.5' />
      <circle fill='rgba(56,189,248,0.2)' cx='258' cy='44' r='14' />
    </svg>
  );
}

export function PartsOfSpeechPrepositionAnimation(): React.JSX.Element {
  const surfaceIds = usePartsOfSpeechSurfaceIds('english-parts-of-speech-preposition');

  return (
    <svg
      aria-label='Animacja: punkt leży pomiędzy A i B, aby pokazać przyimki.'
      className='h-auto w-full'
      data-testid='english-parts-of-speech-preposition-animation'
      role='img'
      viewBox='0 0 360 140'
    >
      <style>{`
        .english-parts-of-speech-preposition-line {
          stroke: #94a3b8;
          stroke-width: 2.5;
          stroke-dasharray: 6 6;
          animation: partsOfSpeechLineGlow 3.8s ease-in-out infinite;
        }
        .english-parts-of-speech-preposition-point { fill: #0f172a; }
        .english-parts-of-speech-preposition-middle {
          fill: #38bdf8;
          animation: partsOfSpeechMiddlePulse 2.6s ease-in-out infinite;
          transform-box: fill-box;
          transform-origin: center;
        }
        .english-parts-of-speech-preposition-label { font: 700 12px/1.1 system-ui, sans-serif; fill: #0f172a; }
        .english-parts-of-speech-preposition-tag {
          font: 700 10px/1.1 system-ui, sans-serif;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          fill: #0ea5e9;
        }
        @keyframes partsOfSpeechLineGlow {
          0%, 100% { stroke: #94a3b8; opacity: 0.5; }
          50% { stroke: #38bdf8; opacity: 1; }
        }
        @keyframes partsOfSpeechMiddlePulse {
          0%, 100% { transform: scale(0.7); opacity: 0.5; }
          50% { transform: scale(1); opacity: 1; }
        }
        @media (prefers-reduced-motion: reduce) {
          .english-parts-of-speech-preposition-line { animation: none; opacity: 1; }
          .english-parts-of-speech-preposition-middle { animation: none; opacity: 1; }
        }
      `}</style>
      <PartsOfSpeechSurface
        accentEnd='#ecfeff'
        accentStart='#06b6d4'
        atmosphereA='rgba(6, 182, 212, 0.08)'
        atmosphereB='rgba(56, 189, 248, 0.08)'
        ids={surfaceIds}
        stroke='rgba(6, 182, 212, 0.12)'
        testIdPrefix='english-parts-of-speech-preposition'
        x={12}
        y={12}
        width={336}
        height={116}
        rx={24}
      />
      <rect fill='rgba(255,255,255,0.82)' x='116' y='22' width='128' height='20' rx='10' />
      <text className='english-parts-of-speech-preposition-tag' x='126' y='36'>PREPOSITION</text>
      <line className='english-parts-of-speech-preposition-line' x1='42' y1='76' x2='318' y2='76' />
      <circle className='english-parts-of-speech-preposition-point' cx='62' cy='76' r='6' />
      <circle className='english-parts-of-speech-preposition-middle' cx='180' cy='76' r='7.5' />
      <circle fill='rgba(56,189,248,0.18)' cx='180' cy='76' r='15' />
      <circle className='english-parts-of-speech-preposition-point' cx='298' cy='76' r='6' />
      <text className='english-parts-of-speech-preposition-label' x='52' y='102'>A</text>
      <text className='english-parts-of-speech-preposition-label' x='174' y='102'>P</text>
      <text className='english-parts-of-speech-preposition-label' x='290' y='102'>B</text>
      <text className='english-parts-of-speech-preposition-label' x='124' y='52'>between</text>
    </svg>
  );
}
