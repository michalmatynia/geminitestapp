'use client';

import React, { useId } from 'react';
import { useTranslations } from 'next-intl';

const translateLogicalAnalogiesAnimation = (
  translate: (key: string) => string,
  key: string,
  fallback: string
): string => {
  const translated = translate(key);
  return translated === key || translated.endsWith(`.${key}`) ? fallback : translated;
};

type LogicalAnalogiesSurfaceIds = {
  clipId: string;
  frameGradientId: string;
  panelGradientId: string;
};

type LogicalAnalogiesSurfaceProps = {
  accentEnd: string;
  accentStart: string;
  atmosphereA: string;
  atmosphereB: string;
  ids: LogicalAnalogiesSurfaceIds;
  stroke: string;
  testIdPrefix: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rx: number;
};

type LogicalAnalogiesAnimationProps = {
  ariaLabel?: string;
};

function useLogicalAnalogiesSurfaceIds(prefix: string): LogicalAnalogiesSurfaceIds {
  const baseId = useId().replace(/:/g, '');

  return {
    clipId: `${prefix}-${baseId}-clip`,
    frameGradientId: `${prefix}-${baseId}-frame`,
    panelGradientId: `${prefix}-${baseId}-panel`,
  };
}

function LogicalAnalogiesSurface({
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
}: LogicalAnalogiesSurfaceProps): React.JSX.Element {
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
          <stop offset='0%' stopColor='#fff1f2' />
          <stop offset='48%' stopColor='#fdf2f8' />
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
          <stop offset='100%' stopColor='#ffffff' stopOpacity='0.9' />
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
        <ellipse cx={x + width * 0.22} cy={y + height * 0.2} fill={atmosphereA} rx={width * 0.2} ry={height * 0.16} />
        <ellipse cx={x + width * 0.8} cy={y + height * 0.88} fill={atmosphereB} rx={width * 0.32} ry={height * 0.18} />
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

export function AnalogyBridgeAnimation({
  ariaLabel,
}: LogicalAnalogiesAnimationProps = {}): React.JSX.Element {
  const translations = useTranslations('KangurStaticLessons.logicalAnalogies.animations');
  const surfaceIds = useLogicalAnalogiesSurfaceIds('logical-analogies-bridge');

  return (
    <svg
      aria-label={
        ariaLabel ??
        translateLogicalAnalogiesAnimation(
          translations,
          'analogyBridge',
          'Animacja: relacja A:B = C:D.',
        )
      }
      className='h-auto w-full'
      data-testid='logical-analogies-bridge-animation'
      role='img'
      viewBox='0 0 320 126'
    >
      <style>{`
        .node { fill: rgba(251, 207, 232, 0.95); stroke: rgba(251, 113, 133, 0.42); stroke-width: 2; }
        .label { fill: #9f1239; font-size: 14px; font-weight: 700; }
        .track { stroke: rgba(251, 113, 133, 0.18); stroke-width: 8; stroke-linecap: round; }
        .link {
          fill: none;
          stroke: #fb7185;
          stroke-width: 4;
          stroke-dasharray: 6 6;
          animation: dash 3s linear infinite;
        }
        .eq { fill: #9f1239; font-size: 16px; font-weight: 700; }
        @keyframes dash {
          to { stroke-dashoffset: -12; }
        }
        @media (prefers-reduced-motion: reduce) {
          .link { animation: none; }
        }
      `}</style>
      <LogicalAnalogiesSurface
        accentEnd='#fdf2f8'
        accentStart='#fb7185'
        atmosphereA='rgba(251, 113, 133, 0.08)'
        atmosphereB='rgba(168, 85, 247, 0.06)'
        ids={surfaceIds}
        stroke='rgba(251, 113, 133, 0.12)'
        testIdPrefix='logical-analogies-bridge'
        x={12}
        y={12}
        width={296}
        height={102}
        rx={22}
      />
      <rect className='node' x='26' y='36' width='46' height='46' rx='12' />
      <rect className='node' x='96' y='36' width='46' height='46' rx='12' />
      <rect className='node' x='186' y='36' width='46' height='46' rx='12' />
      <rect className='node' x='256' y='36' width='46' height='46' rx='12' />
      <line className='track' x1='72' y1='59' x2='96' y2='59' />
      <line className='track' x1='232' y1='59' x2='256' y2='59' />
      <text className='label' x='44' y='65'>A</text>
      <text className='label' x='114' y='65'>B</text>
      <text className='label' x='204' y='65'>C</text>
      <text className='label' x='274' y='65'>D</text>
      <path className='link' d='M72 59 L96 59' />
      <path className='link' d='M232 59 L256 59' />
      <text className='eq' x='154' y='66'>=</text>
    </svg>
  );
}

export function NumberOperationAnimation({
  ariaLabel,
}: LogicalAnalogiesAnimationProps = {}): React.JSX.Element {
  const translations = useTranslations('KangurStaticLessons.logicalAnalogies.animations');
  const surfaceIds = useLogicalAnalogiesSurfaceIds('logical-analogies-number-operation');

  return (
    <svg
      aria-label={
        ariaLabel ??
        translateLogicalAnalogiesAnimation(
          translations,
          'numberOperation',
          'Animacja: relacja liczbowa z tą samą operacją.',
        )
      }
      className='h-auto w-full'
      data-testid='logical-analogies-number-operation-animation'
      role='img'
      viewBox='0 0 320 146'
    >
      <style>{`
        .num { fill: #9f1239; font-size: 16px; font-weight: 700; }
        .row { fill: rgba(255, 241, 242, 0.88); stroke: rgba(251, 113, 133, 0.22); stroke-width: 1.5; }
        .arrow-track { stroke: rgba(251, 113, 133, 0.18); stroke-width: 8; stroke-linecap: round; }
        .arrow { stroke: #fb7185; stroke-width: 4; stroke-linecap: round; }
        .pulse { animation: pulse 2.8s ease-in-out infinite; }
        .label { fill: #be123c; font-size: 12px; font-weight: 700; }
        @keyframes pulse {
          0%, 100% { opacity: 0.5; }
          50% { opacity: 1; }
        }
        @media (prefers-reduced-motion: reduce) {
          .pulse { animation: none; opacity: 1; }
        }
      `}</style>
      <LogicalAnalogiesSurface
        accentEnd='#fff1f2'
        accentStart='#fb7185'
        atmosphereA='rgba(251, 113, 133, 0.08)'
        atmosphereB='rgba(245, 158, 11, 0.06)'
        ids={surfaceIds}
        stroke='rgba(251, 113, 133, 0.12)'
        testIdPrefix='logical-analogies-number-operation'
        x={12}
        y={12}
        width={296}
        height={122}
        rx={22}
      />
      <rect className='row' x='34' y='26' width='252' height='40' rx='16' />
      <rect className='row' x='34' y='78' width='252' height='40' rx='16' />
      <text className='num' x='60' y='52'>2</text>
      <line className='arrow-track' x1='80' y1='46' x2='130' y2='46' />
      <line className='arrow pulse' x1='80' y1='46' x2='130' y2='46' />
      <polygon points='130,46 122,41 122,51' fill='#fb7185' />
      <text className='num' x='150' y='52'>4</text>
      <text className='label' x='92' y='34'>×2</text>
      <text className='num' x='60' y='104'>5</text>
      <line className='arrow-track' x1='80' y1='98' x2='130' y2='98' />
      <line className='arrow pulse' x1='80' y1='98' x2='130' y2='98' />
      <polygon points='130,98 122,93 122,103' fill='#fb7185' />
      <text className='num' x='150' y='104'>10</text>
      <text className='label' x='92' y='86'>×2</text>
    </svg>
  );
}

export function ShapeTransformAnimation({
  ariaLabel,
}: LogicalAnalogiesAnimationProps = {}): React.JSX.Element {
  const translations = useTranslations('KangurStaticLessons.logicalAnalogies.animations');
  const surfaceIds = useLogicalAnalogiesSurfaceIds('logical-analogies-shape-transform');

  return (
    <svg
      aria-label={
        ariaLabel ??
        translateLogicalAnalogiesAnimation(
          translations,
          'shapeTransform',
          'Animacja: kształt obraca się według tej samej reguły.',
        )
      }
      className='h-auto w-full'
      data-testid='logical-analogies-shape-transform-animation'
      role='img'
      viewBox='0 0 320 146'
    >
      <style>{`
        .shape {
          fill: rgba(251, 207, 232, 0.95);
          stroke: rgba(251, 113, 133, 0.42);
          stroke-width: 3;
        }
        .track { stroke: rgba(251, 113, 133, 0.18); stroke-width: 8; stroke-linecap: round; }
        .rot {
          transform-origin: 220px 70px;
          animation: spin 3.6s ease-in-out infinite;
        }
        .arrow { stroke: #fb7185; stroke-width: 4; stroke-linecap: round; }
        @keyframes spin {
          0%, 100% { transform: rotate(0deg); }
          50% { transform: rotate(90deg); }
        }
        @media (prefers-reduced-motion: reduce) {
          .rot { animation: none; transform: rotate(45deg); }
        }
      `}</style>
      <LogicalAnalogiesSurface
        accentEnd='#fdf2f8'
        accentStart='#fb7185'
        atmosphereA='rgba(251, 113, 133, 0.08)'
        atmosphereB='rgba(96, 165, 250, 0.06)'
        ids={surfaceIds}
        stroke='rgba(251, 113, 133, 0.12)'
        testIdPrefix='logical-analogies-shape-transform'
        x={12}
        y={12}
        width={296}
        height={122}
        rx={22}
      />
      <rect className='shape' x='60' y='40' width='50' height='50' rx='10' />
      <line className='track' x1='135' y1='65' x2='185' y2='65' />
      <line className='arrow' x1='135' y1='65' x2='185' y2='65' />
      <polygon points='185,65 177,60 177,70' fill='#fb7185' />
      <rect className='shape rot' x='195' y='45' width='50' height='50' rx='10' />
    </svg>
  );
}

export function PartWholeAnimation({
  ariaLabel,
}: LogicalAnalogiesAnimationProps = {}): React.JSX.Element {
  const translations = useTranslations('KangurStaticLessons.logicalAnalogies.animations');
  const surfaceIds = useLogicalAnalogiesSurfaceIds('logical-analogies-part-whole');

  return (
    <svg
      aria-label={
        ariaLabel ??
        translateLogicalAnalogiesAnimation(
          translations,
          'partWhole',
          'Animacja: części łączą się w całość.',
        )
      }
      className='h-auto w-full'
      data-testid='logical-analogies-part-whole-animation'
      role='img'
      viewBox='0 0 320 146'
    >
      <style>{`
        .part {
          fill: #fda4af;
          animation: merge 4s ease-in-out infinite;
        }
        .p2 { animation-delay: 0.4s; }
        .p3 { animation-delay: 0.8s; }
        .whole {
          fill: #fb7185;
          opacity: 0;
          animation: appear 4s ease-in-out infinite;
        }
        @keyframes merge {
          0%, 30% { transform: translateX(0); opacity: 1; }
          60%, 100% { transform: translateX(60px); opacity: 0.2; }
        }
        @keyframes appear {
          0%, 45% { opacity: 0; transform: scale(0.8); }
          70%, 100% { opacity: 1; transform: scale(1); }
        }
        @media (prefers-reduced-motion: reduce) {
          .part, .whole { animation: none; opacity: 1; transform: none; }
        }
      `}</style>
      <LogicalAnalogiesSurface
        accentEnd='#fff1f2'
        accentStart='#fb7185'
        atmosphereA='rgba(251, 113, 133, 0.08)'
        atmosphereB='rgba(168, 85, 247, 0.06)'
        ids={surfaceIds}
        stroke='rgba(251, 113, 133, 0.12)'
        testIdPrefix='logical-analogies-part-whole'
        x={12}
        y={12}
        width={296}
        height={122}
        rx={22}
      />
      <circle className='part' cx='70' cy='70' r='16' />
      <circle className='part p2' cx='110' cy='50' r='14' />
      <circle className='part p3' cx='110' cy='90' r='14' />
      <circle className='whole' cx='210' cy='70' r='28' />
    </svg>
  );
}

export function CauseEffectAnimation({
  ariaLabel,
}: LogicalAnalogiesAnimationProps = {}): React.JSX.Element {
  const translations = useTranslations('KangurStaticLessons.logicalAnalogies.animations');
  const surfaceIds = useLogicalAnalogiesSurfaceIds('logical-analogies-cause-effect');

  return (
    <svg
      aria-label={
        ariaLabel ??
        translateLogicalAnalogiesAnimation(
          translations,
          'causeEffect',
          'Animacja: przyczyna prowadzi do skutku.',
        )
      }
      className='h-auto w-full'
      data-testid='logical-analogies-cause-effect-animation'
      role='img'
      viewBox='0 0 320 146'
    >
      <style>{`
        .cloud { fill: #bae6fd; }
        .drop {
          stroke: #38bdf8;
          stroke-width: 4;
          stroke-linecap: round;
          animation: rain 2.6s ease-in-out infinite;
        }
        .flower { fill: #fb7185; }
        .stem { stroke: #34d399; stroke-width: 4; stroke-linecap: round; }
        @keyframes rain {
          0%, 100% { transform: translateY(0); opacity: 0.3; }
          50% { transform: translateY(10px); opacity: 1; }
        }
        @media (prefers-reduced-motion: reduce) {
          .drop { animation: none; opacity: 1; transform: none; }
        }
      `}</style>
      <LogicalAnalogiesSurface
        accentEnd='#eff6ff'
        accentStart='#38bdf8'
        atmosphereA='rgba(56, 189, 248, 0.08)'
        atmosphereB='rgba(52, 211, 153, 0.06)'
        ids={surfaceIds}
        stroke='rgba(56, 189, 248, 0.12)'
        testIdPrefix='logical-analogies-cause-effect'
        x={12}
        y={12}
        width={296}
        height={122}
        rx={22}
      />
      <g>
        <circle className='cloud' cx='70' cy='50' r='18' />
        <circle className='cloud' cx='90' cy='46' r='16' />
        <circle className='cloud' cx='110' cy='52' r='14' />
      </g>
      <line className='drop' x1='78' y1='70' x2='78' y2='88' />
      <line className='drop' x1='94' y1='72' x2='94' y2='90' />
      <line className='drop' x1='108' y1='70' x2='108' y2='88' />
      <line className='stem' x1='230' y1='96' x2='230' y2='118' />
      <circle className='flower' cx='230' cy='88' r='10' />
    </svg>
  );
}
